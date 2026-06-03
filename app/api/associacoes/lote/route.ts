import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import {
  consultarCpfBasico, consultarScoreCpf, consultarProcessosCpf,
  consultarProtestosCpf, consultarPepCpf, consultarSocietarioCpf,
  consultarHistoricoVeiculosPorCpf,
} from '@/lib/providers/assertiva'

// Limite de CPFs por planilha
const MAX_CPFS = 500
// Lote paralelo — quantos CPFs processamos ao mesmo tempo
const BATCH_SIZE = 5

function limpaCpf(v: string) { return v.replace(/\D/g, '') }

function v(x: any, fb = '') { return x === null || x === undefined || x === '' ? fb : String(x) }

function detectaObito(basico: any): boolean {
  const sit = v(basico?.situacaoCpf ?? basico?.situacao, '').toUpperCase()
  return sit.includes('ÓBITO') || sit.includes('OBITO') || sit.includes('FALECIDO') || sit.includes('CANCELADO')
}

function statusGeral(obito: boolean, processos: number, protestos: number, pep: boolean, score: number): string {
  if (obito) return 'CRITICO'
  if (processos > 0 || pep) return 'CRITICO'
  if (protestos > 0 || score < 400) return 'ATENCAO'
  return 'OK'
}

async function processarCpf(cpf: string): Promise<Record<string, any>> {
  const safe = async (fn: () => Promise<any>) => {
    try { return await fn() } catch { return null }
  }

  const [basico, score, processos, protestos, pep, societario, veiculos] = await Promise.all([
    safe(() => consultarCpfBasico(cpf)),
    safe(() => consultarScoreCpf(cpf)),
    safe(() => consultarProcessosCpf(cpf)),
    safe(() => consultarProtestosCpf(cpf)),
    safe(() => consultarPepCpf(cpf)),
    safe(() => consultarSocietarioCpf(cpf)),
    safe(() => consultarHistoricoVeiculosPorCpf(cpf)),
  ])

  const scoreVal    = Number(score?.score ?? score?.pontuacao ?? 0)
  const totalProc   = Number(processos?.total ?? processos?.quantidade ?? 0)
  const totalProt   = Number(protestos?.total ?? protestos?.quantidade ?? 0)
  const isPep       = !!(pep?.pep ?? pep?.isPep)
  const obito       = detectaObito(basico)
  const sit         = v(basico?.situacaoCpf ?? basico?.situacao, 'NÃO CONSULTADO')
  const empresas    = Array.isArray(societario?.empresas ?? societario?.lista) ? (societario?.empresas ?? societario?.lista).length : 0
  const qtdVeiculos = Array.isArray(veiculos?.veiculos ?? veiculos?.lista) ? (veiculos?.veiculos ?? veiculos?.lista).length : 0
  const status      = statusGeral(obito, totalProc, totalProt, isPep, scoreVal)

  return {
    cpf:           cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    nome:          v(basico?.nome ?? basico?.nomeCompleto, 'Não encontrado'),
    situacaoCpf:   sit,
    obito:         obito ? 'SIM' : 'NÃO',
    score:         scoreVal || 'N/D',
    risco:         scoreVal >= 700 ? 'Baixo' : scoreVal >= 400 ? 'Moderado' : scoreVal > 0 ? 'Alto' : 'N/D',
    processos:     totalProc,
    protestos:     totalProt,
    pep:           isPep ? 'SIM' : 'NÃO',
    empresas,
    veiculos:      qtdVeiculos,
    statusGeral:   status,
    dataNascimento:v(basico?.dataNascimento),
    telefone:      v(basico?.telefone ?? (Array.isArray(basico?.telefones) ? basico?.telefones[0]?.numero : '')),
    email:         v(basico?.email ?? (Array.isArray(basico?.emails) ? basico?.emails[0]?.email : '')),
  }
}

// Cores para cada coluna no XLSX
const COR = {
  CRITICO: { fgColor: { rgb: 'FFDC2626' } },  // vermelho
  ATENCAO: { fgColor: { rgb: 'FFD97706' } },  // amarelo
  OK:      { fgColor: { rgb: 'FF16A34A' } },  // verde
  HEADER:  { fgColor: { rgb: 'FF00703C' } },  // verde escuro
}

function montarPlanilha(resultados: Record<string, any>[]) {
  const wb   = XLSX.utils.book_new()
  const cols  = [
    'CPF', 'Nome', 'Situação CPF', 'Óbito', 'Score', 'Risco',
    'Processos', 'Protestos', 'PEP', 'Empresas', 'Veículos',
    'Data Nascimento', 'Telefone', 'E-mail', 'STATUS GERAL',
  ]
  const keys = [
    'cpf','nome','situacaoCpf','obito','score','risco',
    'processos','protestos','pep','empresas','veiculos',
    'dataNascimento','telefone','email','statusGeral',
  ]

  const rows = [cols, ...resultados.map(r => keys.map(k => r[k] ?? ''))]
  const ws   = XLSX.utils.aoa_to_sheet(rows)

  // Larguras das colunas
  ws['!cols'] = [
    {wch:16},{wch:30},{wch:20},{wch:8},{wch:8},{wch:12},
    {wch:10},{wch:10},{wch:6},{wch:10},{wch:10},
    {wch:14},{wch:16},{wch:28},{wch:14},
  ]

  // Cores por linha (STATUS GERAL é a última coluna = índice 14)
  resultados.forEach((r, i) => {
    const row   = i + 2 // linha 1 = header
    const cell  = XLSX.utils.encode_cell({ r: row - 1, c: 14 })
    const cor   = COR[r.statusGeral as keyof typeof COR] ?? COR.OK
    if (ws[cell]) {
      ws[cell].s = { fill: { patternType: 'solid', ...cor }, font: { bold: true, color: { rgb: 'FFFFFFFF' } } }
    }
    // Coluna Óbito
    const cObito = XLSX.utils.encode_cell({ r: row - 1, c: 3 })
    if (ws[cObito] && r.obito === 'SIM') {
      ws[cObito].s = { fill: { patternType: 'solid', ...COR.CRITICO }, font: { bold: true, color: { rgb: 'FFFFFFFF' } } }
    }
    // Coluna PEP
    const cPep = XLSX.utils.encode_cell({ r: row - 1, c: 8 })
    if (ws[cPep] && r.pep === 'SIM') {
      ws[cPep].s = { fill: { patternType: 'solid', ...COR.CRITICO }, font: { bold: true, color: { rgb: 'FFFFFFFF' } } }
    }
  })

  XLSX.utils.book_append_sheet(wb, ws, 'Resultado')

  // Aba resumo
  const criticos = resultados.filter(r => r.statusGeral === 'CRITICO').length
  const atencao  = resultados.filter(r => r.statusGeral === 'ATENCAO').length
  const ok       = resultados.filter(r => r.statusGeral === 'OK').length
  const resumoData = [
    ['RESUMO DA CONSULTA EM LOTE'],
    [''],
    ['Total consultado', resultados.length],
    ['CRITICO (vermelho)', criticos],
    ['ATENÇÃO (amarelo)', atencao],
    ['OK (verde)', ok],
    [''],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    ['Fonte', 'Ficha Auto — fichaauto.com.br'],
  ]
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
  wsResumo['!cols'] = [{wch:25},{wch:15}]
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file     = formData.get('arquivo') as File | null

    if (!file) {
      return NextResponse.json({ erro: 'Arquivo não enviado' }, { status: 400 })
    }

    const buffer  = Buffer.from(await file.arrayBuffer())
    const wb      = XLSX.read(buffer, { type: 'buffer' })
    const ws      = wb.Sheets[wb.SheetNames[0]]
    const rows    = XLSX.utils.sheet_to_json<any>(ws, { header: 1 })

    // Detecta coluna com CPF (procura no cabeçalho)
    const header  = (rows[0] as string[]).map((c: string) => String(c).toLowerCase())
    const cpfCol  = header.findIndex(h => h.includes('cpf'))
    if (cpfCol === -1) {
      return NextResponse.json({ erro: 'Coluna "CPF" não encontrada na planilha. A primeira linha deve ter um cabeçalho com a palavra CPF.' }, { status: 400 })
    }

    // Extrai CPFs válidos (11 dígitos)
    const cpfs: string[] = rows
      .slice(1)
      .map((r: any) => limpaCpf(String(r[cpfCol] ?? '')))
      .filter(c => c.length === 11)
      .slice(0, MAX_CPFS)

    if (cpfs.length === 0) {
      return NextResponse.json({ erro: 'Nenhum CPF válido encontrado na planilha.' }, { status: 400 })
    }

    // Processa em lotes de BATCH_SIZE
    const resultados: Record<string, any>[] = []
    for (let i = 0; i < cpfs.length; i += BATCH_SIZE) {
      const lote   = cpfs.slice(i, i + BATCH_SIZE)
      const loteRes = await Promise.all(lote.map(cpf => processarCpf(cpf)))
      resultados.push(...loteRes)
    }

    // Gera planilha resultado
    const xlsxBuf = montarPlanilha(resultados)

    return new NextResponse(xlsxBuf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="ficha-associacoes-${Date.now()}.xlsx"`,
        'X-Total': String(resultados.length),
        'X-Criticos': String(resultados.filter(r => r.statusGeral === 'CRITICO').length),
        'X-Atencao':  String(resultados.filter(r => r.statusGeral === 'ATENCAO').length),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message ?? 'Erro interno' }, { status: 500 })
  }
}
