import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase-server'

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

function Row({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${destaque ? 'text-red-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
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

  const lotalLeilao = Array.isArray(leil.historicoLeilao) ? leil.historicoLeilao.length
    : (leil.baseA?.length ?? 0) + (leil.baseB?.length ?? 0) + (leil.remarketing?.length ?? 0) + (leil.lotes?.length ?? 0)

  const restricoes: string[] = []
  if (bin.restricaoRENAJUD && !String(bin.restricaoRENAJUD).toUpperCase().includes('NADA')) restricoes.push('RENAJUD')
  if (String(sin.indicioSinistro ?? '').toUpperCase().includes('CONSTA') && !String(sin.indicioSinistro).toUpperCase().includes('NADA')) restricoes.push('Sinistro')
  if (lotalLeilao > 0) restricoes.push(`Leilão (${lotalLeilao}x)`)

  const gravameDesc = v(grav.restricaoFinanceira ?? grav.alienacao ?? grav.descricao, '')
  if (gravameDesc && !gravameDesc.toUpperCase().includes('NADA') && !gravameDesc.toUpperCase().includes('SEM')) restricoes.push('Gravame')

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
        {restricoes.length === 0
          ? <Row label="Situação" value="Nada consta" />
          : restricoes.map(r => <Row key={r} label="Alerta" value={r} destaque />)
        }
        <Row label="Roubo/Furto"  value={v(bin.restricaoRouboFurto ?? bin.roubofurto)} />
        <Row label="RENAJUD"      value={v(bin.restricaoRENAJUD)} />
        <Row label="Sinistro"     value={v(sin.indicioSinistro)} />
        <Row label="Gravame"      value={gravameDesc || 'Nada consta'} />
        <Row label="Leilão"       value={lotalLeilao > 0 ? `${lotalLeilao} ocorrência(s)` : 'Nada consta'} destaque={lotalLeilao > 0} />
      </Section>

      {r.fipe && (
        <Section title="Valor FIPE">
          <Row label="Valor FIPE" value={moeda(r.fipe?.resposta?.valorFipe ?? r.fipe?.resposta?.fipe?.valor)} />
          <Row label="Referência" value={v(r.fipe?.resposta?.mesReferencia ?? r.fipe?.resposta?.fipe?.mesReferencia, '')} />
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

      {r.sancoes && (
        <Section title="Sanções e Restrições">
          <Row label="CEIS"   value={r.sancoes.ceis?.length  > 0 ? `${r.sancoes.ceis.length} sanção(ões)` : 'Nada consta'} destaque={r.sancoes.ceis?.length > 0} />
          <Row label="CNEP"   value={r.sancoes.cnep?.length  > 0 ? `${r.sancoes.cnep.length} penalidade(s)` : 'Nada consta'} destaque={r.sancoes.cnep?.length > 0} />
        </Section>
      )}
    </>
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

      {r.sancoes && (
        <Section title="Sanções e Restrições">
          <Row label="CEIS" value={r.sancoes.ceis?.length > 0 ? `${r.sancoes.ceis.length} sanção(ões)` : 'Nada consta'} destaque={r.sancoes.ceis?.length > 0} />
          <Row label="CNEP" value={r.sancoes.cnep?.length > 0 ? `${r.sancoes.cnep.length} penalidade(s)` : 'Nada consta'} destaque={r.sancoes.cnep?.length > 0} />
        </Section>
      )}
    </>
  )
}

export default async function PaginaPublica({ params }: Props) {
  const { token } = await params

  const svc = createServiceRoleClient() as any
  const { data } = await svc
    .from('consultas')
    .select('tipo, documento, descricao, resultado, expires_at, created_at')
    .eq('token', token)
    .maybeSingle()
    .catch(() => ({ data: null }))

  if (!data) notFound()

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
            Consulta realizada em {fmtData(data.created_at)}. Link válido até {fmtExpira(data.expires_at)}.
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
