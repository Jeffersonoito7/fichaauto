import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase-server'
import {
  contarLeilao,
  contarRegistrosReais,
  naoConsultado,
  registrosGravame,
  rotuloTexto,
  statusTexto,
  CAMPOS_ID_SANCAO,
  type StatusIndicador,
} from '@/lib/indicadores-veiculo'

interface Props { params: Promise<{ token: string }> }

function v(x: any, fb = 'Não informado') {
  if (x === null || x === undefined || x === '') return fb
  if (typeof x === 'object') return x.titulo ?? x.descricao ?? x.nome ?? x.label ?? fb
  return String(x)
}
function moeda(x: any) {
  const n = parseFloat(String(x ?? '0').replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
  return n > 0 ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não consta'
}
function fmtData(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtExpira(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * `tom`:
 *  - 'alerta'  → vermelho (há registro)
 *  - 'ausente' → cinza claro + itálico. Usado SÓ para "Não consultado".
 *                Nunca pode parecer "tudo certo": dado ausente não é dado
 *                limpo (já erramos nisso com o PEP, em que `null` virava
 *                um check verde de "Não identificado").
 */
function Row({ label, value, destaque, tom }: {
  label: string; value: string; destaque?: boolean; tom?: 'normal' | 'alerta' | 'ausente'
}) {
  const t = tom ?? (destaque ? 'alerta' : 'normal')
  const cor = t === 'alerta' ? 'text-red-600' : t === 'ausente' ? 'text-gray-400 italic' : 'text-gray-800'
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${cor}`}>{value}</span>
    </div>
  )
}

/** Converte um status de indicador no `tom` visual da linha. */
function tomDe(status: StatusIndicador): 'normal' | 'alerta' | 'ausente' {
  return status === 'consta' ? 'alerta' : status === 'nao-consultado' ? 'ausente' : 'normal'
}

/** Linha de indicador de risco, sempre com texto legível (nunca booleano cru). */
function RowIndicador({ label, status, texto }: { label: string; status: StatusIndicador; texto: string }) {
  return <Row label={label} value={texto} tom={tomDe(status)} />
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}

function RelatórioVeiculo({ r }: { r: any }) {
  const p = r.placa?.resposta?.descricao ?? r.placa?.resposta ?? {}
  const bin = r.binFederal?.resposta ?? {}
  const sin = r.sinistro?.resposta ?? {}
  const grav = r.gravame?.resposta ?? {}
  const leil = r.leilao?.resposta ?? {}

  // ── Indicadores de risco ───────────────────────────────────────────────────
  // TODA contagem/avaliação vem de lib/indicadores-veiculo.ts, a mesma função
  // que o relatório completo usa. Antes esta página contava `.length` cru e a
  // Assertiva devolve `historicoLeilao: [{}]` para veículo SEM leilão, o que
  // fazia a mesma placa aparecer com LEILÃO aqui e SEM LEILÃO no relatório.
  const binConsultado  = !naoConsultado(r.binFederal)
  const sinConsultado  = !naoConsultado(r.sinistro)
  const gravConsultado = !naoConsultado(r.gravame)
  const leilConsultado = !naoConsultado(r.leilao)

  // O BIN Federal devolve `restricoes` como array de strings. Quando esse array
  // veio, a AUSÊNCIA do termo é prova de "nada consta". Quando nem o array nem
  // o campo vieram, é "não consultado" — não dá para afirmar que está limpo.
  const binRestArr: string[] = Array.isArray(bin.restricoes) ? bin.restricoes : []
  function statusBin(termos: RegExp, campoDireto: unknown): StatusIndicador {
    if (!binConsultado) return 'nao-consultado'
    if (binRestArr.some(x => termos.test(String(x ?? '').toUpperCase()))) return 'consta'
    const direto = statusTexto(campoDireto)
    if (direto !== 'nao-consultado') return direto
    return binRestArr.length > 0 ? 'nada-consta' : 'nao-consultado'
  }

  const renajud = statusBin(/RENAJUD/, bin.restricaoRENAJUD)
  const roubo   = statusBin(/ROUBO|FURTO/, bin.restricaoRouboFurto ?? bin.roubofurto)

  // Sinistro: a resposta pode vir como booleano (`indicioSinistro: false`) e
  // era renderizada crua, saindo "Sinistro false" no PDF da página pública.
  const sinistroBruto = sin.indicioSinistro ?? sin.situacao ?? sin.resultado ?? r.sinistro?.cabecalho?.resultado
  const sinistro = sinConsultado ? rotuloTexto(sinistroBruto) : { status: 'nao-consultado' as StatusIndicador, texto: 'Não consultado' }

  // Gravame: objeto único na v3; `{}` e "NADA CONSTA" contam zero.
  const qtdGravame = gravConsultado ? registrosGravame(grav).length : 0
  const gravameStatus: StatusIndicador = !gravConsultado ? 'nao-consultado' : qtdGravame > 0 ? 'consta' : 'nada-consta'
  const gravameDesc = v(grav.restricaoFinanceira ?? grav.alienacao ?? grav.descricao, '')
  const gravameTexto = gravameStatus === 'nao-consultado'
    ? 'Não consultado'
    : gravameStatus === 'consta'
      ? (gravameDesc || `${qtdGravame} gravame(s)`)
      : 'Nada consta'

  const totalLeilao = leilConsultado ? contarLeilao(leil) : 0
  const leilaoStatus: StatusIndicador = !leilConsultado ? 'nao-consultado' : totalLeilao > 0 ? 'consta' : 'nada-consta'

  // Resumo de alertas: só entra o que CONSTA de verdade.
  const restricoes: string[] = []
  if (renajud === 'consta') restricoes.push('RENAJUD')
  if (roubo === 'consta') restricoes.push('Roubo/Furto')
  if (sinistro.status === 'consta') restricoes.push('Sinistro')
  if (leilaoStatus === 'consta') restricoes.push(`Leilão (${totalLeilao}x)`)
  if (gravameStatus === 'consta') restricoes.push('Gravame')

  // Indicadores que o plano não cobriu ou que falharam: precisam aparecer.
  const naoConsultados: string[] = []
  if (renajud === 'nao-consultado') naoConsultados.push('RENAJUD')
  if (roubo === 'nao-consultado') naoConsultados.push('Roubo/Furto')
  if (sinistro.status === 'nao-consultado') naoConsultados.push('Sinistro')
  if (leilaoStatus === 'nao-consultado') naoConsultados.push('Leilão')
  if (gravameStatus === 'nao-consultado') naoConsultados.push('Gravame')

  return (
    <>
      <Section title="Identificação">
        <Row label="Placa"         value={v(p.placa ?? r.placa?.resposta?.placa)} />
        <Row label="Marca/Modelo"  value={v(p.marcaModelo ?? p.marca)} />
        <Row label="Ano Fab./Mod." value={`${v(p.anoFabricacao, '')} / ${v(p.anoModelo, '')}`} />
        <Row label="Cor"           value={v(p.cor ?? p.corPredominante)} />
        <Row label="Combustível"   value={v(p.combustivel ?? p.tipoCombustivel)} />
        <Row label="Situação"      value={v(p.situacao ?? p.situacaoVeiculo)} />
        <Row label="Município/UF"  value={`${v(p.municipio, '')} ${v(p.uf, '')}`} />
      </Section>

      <Section title="Restrições">
        {restricoes.length > 0
          ? restricoes.map(x => <Row key={x} label="Alerta" value={x} destaque />)
          // "Nada consta" só pode ser afirmado quando TODOS os indicadores
          // foram efetivamente consultados. Com algum indicador ausente a
          // página diz o que ficou de fora, em vez de passar um "tudo certo"
          // que não foi verificado.
          : naoConsultados.length === 0
            ? <Row label="Situação" value="Nada consta nos itens consultados" />
            : <Row label="Situação" value={`Nada consta nos itens consultados. Não consultado: ${naoConsultados.join(', ')}`} tom="ausente" />
        }
        <RowIndicador label="Roubo/Furto" status={roubo}  texto={roubo === 'nao-consultado' ? 'Não consultado' : roubo === 'consta' ? 'Consta ocorrência' : 'Nada consta'} />
        <RowIndicador label="RENAJUD"     status={renajud} texto={renajud === 'nao-consultado' ? 'Não consultado' : renajud === 'consta' ? 'Consta restrição RENAJUD' : 'Nada consta'} />
        <RowIndicador label="Sinistro"    status={sinistro.status} texto={sinistro.texto} />
        <RowIndicador label="Gravame"     status={gravameStatus} texto={gravameTexto} />
        <RowIndicador label="Leilão"      status={leilaoStatus}
          texto={leilaoStatus === 'nao-consultado' ? 'Não consultado' : totalLeilao > 0 ? `${totalLeilao} ocorrência(s)` : 'Nada consta'} />
      </Section>

      {r.fipe && (
        <Section title="Valor FIPE">
          <Row label="Valor FIPE" value={moeda(
            r.fipe?.valor ?? r.fipe?.price ?? r.fipe?.preco ??
            r.fipe?.resposta?.valorFipe ?? r.fipe?.resposta?.fipe?.valor
          )} />
          <Row label="Referência" value={v(
            r.fipe?.referenceMonth ?? r.fipe?.mesReferencia ??
            r.fipe?.resposta?.mesReferencia ?? r.fipe?.resposta?.fipe?.mesReferencia, ''
          )} />
          {r.fipe?.vehicleType != null && (
            <Row label="Código FIPE" value={v(r.fipe?.codeFipe ?? r.fipe?.codigoFipe, '')} />
          )}
        </Section>
      )}
    </>
  )
}

function RelatórioCpf({ r }: { r: any }) {
  const b = r.basico ?? {}
  const tels: any[] = r.telefones?.lista ?? r.telefones?.telefones ?? []
  const ends: any[] = r.enderecos?.lista ?? r.enderecos?.enderecos ?? []
  const end0 = ends[0] ?? {}

  return (
    <>
      <Section title="Dados Pessoais">
        <Row label="Nome"          value={v(b.nome ?? b.nomeCompleto)} />
        <Row label="Data Nascimento" value={v(b.dataNascimento)} />
        <Row label="Sexo"          value={v(b.sexo)} />
        <Row label="Situação CPF"  value={v(b.situacaoCpf ?? b.situacao)} />
        <Row label="Nome da Mãe"   value={v(b.nomeMae)} />
        {b.falecido && <Row label="Óbito"     value="Indício de óbito" destaque />}
      </Section>

      <Section title="Contato">
        <Row label="Telefone" value={v(tels[0]?.numero ?? b.telefone)} />
        <Row label="E-mail"   value={v(b.email)} />
      </Section>

      <Section title="Endereço">
        <Row label="Logradouro" value={`${v(end0.logradouro ?? b.logradouro, '')} ${v(end0.numero ?? b.numero, '')}`} />
        <Row label="Bairro"     value={v(end0.bairro ?? b.bairro)} />
        <Row label="Cidade/UF"  value={`${v(end0.municipio ?? end0.cidade ?? b.municipio, '')} / ${v(end0.uf ?? b.uf, '')}`} />
        <Row label="CEP"        value={v(end0.cep ?? b.cep)} />
      </Section>

      <SecaoSancoes sancoes={r.sancoes} />
    </>
  )
}

/**
 * CEIS/CNEP contados pela função única: lista com item vazio de padding conta
 * ZERO, e módulo ausente diz "Não consultado" em vez de "Nada consta".
 */
function SecaoSancoes({ sancoes }: { sancoes: any }) {
  const consultado = !naoConsultado(sancoes)
  const ceis = consultado ? contarRegistrosReais(sancoes?.ceis, CAMPOS_ID_SANCAO) : 0
  const cnep = consultado ? contarRegistrosReais(sancoes?.cnep, CAMPOS_ID_SANCAO) : 0
  return (
    <Section title="Sanções e Restrições">
      <Row label="CEIS" tom={!consultado ? 'ausente' : ceis > 0 ? 'alerta' : 'normal'}
        value={!consultado ? 'Não consultado' : ceis > 0 ? `${ceis} sanção(ões)` : 'Nada consta'} />
      <Row label="CNEP" tom={!consultado ? 'ausente' : cnep > 0 ? 'alerta' : 'normal'}
        value={!consultado ? 'Não consultado' : cnep > 0 ? `${cnep} penalidade(s)` : 'Nada consta'} />
    </Section>
  )
}

function RelatórioCnpj({ r }: { r: any }) {
  const b = r.basico ?? {}
  const socios: any[] = r.qsa?.socios ?? r.qsa?.lista ?? []

  return (
    <>
      <Section title="Dados Cadastrais">
        <Row label="Razão Social"   value={v(b.razaoSocial ?? b.nome)} />
        <Row label="Nome Fantasia"  value={v(b.nomeFantasia)} />
        <Row label="Situação"       value={v(b.situacaoCadastral ?? b.situacao)} />
        <Row label="Abertura"       value={v(b.dataAbertura)} />
        <Row label="CNAE"           value={v(b.cnae ?? b.cnaePrincipal)} />
        <Row label="Natureza Jur."  value={v(b.naturezaJuridica)} />
        <Row label="Porte"          value={v(b.porte)} />
        <Row label="Capital Social" value={moeda(b.capitalSocial)} />
      </Section>

      <Section title="Endereço">
        <Row label="Logradouro" value={`${v(b.logradouro, '')} ${v(b.numero, '')}`} />
        <Row label="Bairro"     value={v(b.bairro)} />
        <Row label="Cidade/UF"  value={`${v(b.municipio, '')} / ${v(b.uf, '')}`} />
        <Row label="CEP"        value={v(b.cep)} />
      </Section>

      {socios.length > 0 && (
        <Section title="Quadro Societário">
          {socios.slice(0, 5).map((s: any, i: number) => (
            <Row key={i} label={v(s.qualificacao ?? s.cargo, 'Sócio')} value={v(s.nome ?? s.nomeOuRazaoSocial)} />
          ))}
        </Section>
      )}

      <SecaoSancoes sancoes={r.sancoes} />
    </>
  )
}

export default async function PaginaPublica({ params }: Props) {
  const { token } = await params

  // O builder do Supabase é "thenable", mas não é uma Promise nativa: ele não
  // tem .catch encadeável. Com `.maybeSingle().catch(...)` a página inteira
  // quebrava com 500 e o cliente que PAGOU não via o relatório. Por isso o
  // try/catch fica em volta do await, que é onde a promessa realmente resolve.
  const svc = createServiceRoleClient() as any
  let data: any = null
  try {
    const r = await svc
      .from('consultas')
      .select('tipo, documento, descricao, resultado, expires_at, created_at, origem_id, reaproveitada')
      .eq('token', token)
      .maybeSingle()
    data = r?.data ?? null
  } catch (e: any) {
    console.error('[relatorio publico]', e?.message ?? e)
  }

  if (!data) notFound()

  // Consulta reaproveitada grava uma linha NOVA apontando para a original, e o
  // created_at dessa linha e de hoje. Mostrar essa data faria um dado de meses
  // atras aparecer como "consulta realizada hoje", que e pior do que nao
  // avisar nada. Aqui buscamos a data REAL do dado.
  let dataDoDado: string = data.created_at
  let diasDoDado = 0
  if (data.origem_id) {
    try {
      const r = await svc
        .from('consultas')
        .select('created_at')
        .eq('id', data.origem_id)
        .maybeSingle()
      if (r?.data?.created_at) dataDoDado = r.data.created_at
    } catch (e: any) {
      console.error('[relatorio publico] origem', e?.message ?? e)
    }
  }
  diasDoDado = Math.floor((Date.now() - new Date(dataDoDado).getTime()) / 86_400_000)
  const dadoVelho = diasDoDado >= 30

  const expirado = data.expires_at && new Date(data.expires_at) < new Date()
  if (expirado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Link expirado</h1>
          <p className="text-sm text-gray-500 mb-6">Este link de compartilhamento era válido por 48 horas e já expirou.</p>
          <Link href="/" className="text-sm text-green-600 font-medium hover:underline">
            Fazer nova consulta
          </Link>
        </div>
      </div>
    )
  }

  let resultado = data.resultado
  if (typeof resultado === 'string') {
    try { resultado = JSON.parse(resultado) } catch { resultado = null }
  }

  const tipoLabel = data.tipo === 'veiculo' ? 'Veículo' : data.tipo === 'cpf' ? 'CPF' : 'CNPJ'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Ficha Auto</span>
            <p className="text-sm font-bold text-gray-900 font-mono">{data.documento}</p>
          </div>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
            {tipoLabel}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Aviso de validade */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-700">
            Dados consultados em {fmtData(dataDoDado)}
            {diasDoDado > 0 && ` (há ${diasDoDado} ${diasDoDado === 1 ? 'dia' : 'dias'})`}.
            {' '}Link válido até {fmtExpira(data.expires_at)}.
            {dadoVelho && (
              <strong className="block mt-1 font-semibold">
                Atenção: gravame, restrições e leilão podem ter mudado desde essa data.
              </strong>
            )}
          </p>
        </div>

        {/* Relatório */}
        {resultado ? (
          <>
            {data.tipo === 'veiculo' && <RelatórioVeiculo r={resultado} />}
            {data.tipo === 'cpf'     && <RelatórioCpf    r={resultado} />}
            {data.tipo === 'cnpj'    && <RelatórioCnpj   r={resultado} />}
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">Dados não disponíveis para este link.</p>
          </div>
        )}

        {/* Rodapé */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Relatório gerado por{' '}
          <Link href="/" className="text-green-600 font-medium hover:underline">fichaauto.com.br</Link>
          {' '}. Dados para fins informativos.
        </p>
      </div>
    </div>
  )
}
