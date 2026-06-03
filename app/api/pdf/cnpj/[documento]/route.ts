import { NextRequest, NextResponse } from 'next/server'
import {
  consultarCnpjBasico, consultarQsaCnpj, consultarScoreCnpj,
  consultarProcessosCnpj, consultarProtestosCnpj, consultarRelacionadasCnpj,
} from '@/lib/providers/assertiva'

const TENANT = { nome: 'Ficha Auto', cor: '#00703C', site: 'fichaauto.com.br' }

function v(x: any, fb = 'Não Informado'): string {
  if (x === null || x === undefined || x === '') return fb
  return String(x)
}
function protocolo() { return String(Date.now()).slice(-9) }
function limpaCnpj(c: string) { return c.replace(/\D/g, '') }
function maskCnpj(c: string) {
  const d = c.replace(/\D/g, '')
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`
}

type Status = 'ok' | 'warn' | 'error'

function iconeInner(status: Status, label: string): string {
  const bg     = status === 'ok' ? '#16a34a' : status === 'warn' ? '#d97706' : '#dc2626'
  const symbol = status === 'ok' ? '&#10003;' : '!'
  return `
    <div style="width:50px;height:50px;border-radius:50%;background:${bg};
                display:flex;align-items:center;justify-content:center;margin:0 auto">
      <span style="font-size:22px;font-weight:900;color:white;line-height:1">${symbol}</span>
    </div>
    <div style="font-size:7px;font-weight:700;margin-top:3px;text-align:center;line-height:1.3;color:#222">
      ${label}
    </div>`
}

function header(agora: string, proto: string, pag: string): string {
  return `
  <table width="100%" cellpadding="4" cellspacing="0" style="border-bottom:2px solid #333;margin-bottom:0">
    <tr>
      <td width="110" valign="middle">
        <table cellpadding="0" cellspacing="0"><tr>
          <td valign="middle">
            <div style="width:34px;height:34px;background:${TENANT.cor};border-radius:5px;
              display:inline-block;text-align:center;vertical-align:middle;line-height:34px">
              <span style="color:white;font-weight:900;font-size:16px">F</span>
            </div>
          </td>
          <td valign="middle" style="padding-left:5px">
            <div style="font-size:13px;font-weight:900;color:${TENANT.cor};line-height:1.1">${TENANT.nome.toUpperCase()}</div>
            <div style="font-size:7.5px;color:#666">Tecnologia</div>
          </td>
        </tr></table>
      </td>
      <td align="center" valign="middle">
        <div style="font-size:15px;font-weight:700;color:#111">Consulta CNPJ</div>
        <div style="font-size:8.5px;color:#555">Informações Exclusivas</div>
        <div style="font-size:8.5px;color:#555">
          Data Hora da Consulta:&nbsp;<strong>${agora}</strong>&nbsp;(${proto})&nbsp;Pág.&nbsp;${pag}
        </div>
      </td>
      <td width="60" align="right" valign="middle">
        <table cellpadding="0" cellspacing="0"><tr>
          <td align="center" valign="middle"
              style="width:52px;height:52px;border:1px solid #ccc;background:#f5f5f5;font-size:7px;color:#999">QR</td>
        </tr></table>
      </td>
    </tr>
  </table>`
}

function banner(razaoSocial: string, cnpj: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0">
    <tr>
      <td align="center" valign="middle" style="background:${TENANT.cor};padding:14px 8px">
        <div style="font-size:20px;font-weight:900;color:white;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2">
          ${razaoSocial.toUpperCase()}
        </div>
        <div style="font-size:16px;font-weight:900;color:white;font-family:monospace;letter-spacing:2px;margin-top:2px">
          CNPJ: ${maskCnpj(cnpj)}
        </div>
      </td>
    </tr>
  </table>`
}

function footer(): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ccc;margin-top:8px">
    <tr>
      <td width="42" valign="top" style="padding-top:5px">
        <div style="width:36px;height:36px;background:${TENANT.cor};border-radius:4px;text-align:center;line-height:36px">
          <span style="color:white;font-weight:900;font-size:14px">F</span>
        </div>
      </td>
      <td valign="top" style="font-size:7.5px;color:#555;line-height:1.45;padding-top:5px">
        A ${TENANT.nome} não é responsável pelas informações inseridas na sua base de dados já que são oriundas de consulta às Bases Públicas e
        Privadas. As informações têm validade apenas para o momento da consulta. Consulte sempre os órgãos competentes para confirmação.
      </td>
    </tr>
  </table>`
}

function secTitle(txt: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 4px">
    <tr>
      <td style="font-size:10px;font-weight:700;text-transform:uppercase;
                 border-bottom:1.5px solid #444;padding-bottom:3px;color:#111">${txt}</td>
    </tr>
  </table>`
}

function tabela2col(linhas: [string, string, string, string][]): string {
  return `
  <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:9.5px;margin-bottom:6px">
    ${linhas.map(([l1, v1, l2, v2], i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f7f7f7'}">
      <td width="15%" style="font-weight:700;border:1px solid #ddd;padding:4px 6px">${l1}</td>
      <td width="35%" style="border:1px solid #ddd;padding:4px 6px">${v1}</td>
      <td width="15%" style="font-weight:700;border:1px solid #ddd;padding:4px 6px">${l2}</td>
      <td width="35%" style="border:1px solid #ddd;padding:4px 6px">${v2}</td>
    </tr>`).join('')}
  </table>`
}

function tabelaGen(cols: string[], linhas: string[][]): string {
  return `
  <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:9.5px;margin-bottom:6px">
    <tr>${cols.map(c => `<th style="font-weight:700;background:#f0f0f0;border:1px solid #ddd;padding:4px 6px;text-align:left">${c}</th>`).join('')}</tr>
    ${linhas.length === 0
      ? `<tr>${cols.map(() => `<td style="border:1px solid #ddd;padding:4px 6px;color:#999">---</td>`).join('')}</tr>`
      : linhas.map((row, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f7f7f7'}">
          ${row.map(c => `<td style="border:1px solid #ddd;padding:4px 6px">${c}</td>`).join('')}
        </tr>`).join('')
    }
  </table>`
}

function scoreBar(score: number): string {
  const cor = score >= 700 ? '#16a34a' : score >= 400 ? '#d97706' : '#dc2626'
  const pct  = Math.min(100, Math.round(score / 10))
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
    <tr>
      <td style="font-size:28px;font-weight:900;color:${cor};padding-right:10px;width:70px" valign="middle">${score}</td>
      <td valign="middle">
        <div style="font-size:8px;color:#555;margin-bottom:3px">Score Empresarial</div>
        <div style="background:#e5e7eb;border-radius:4px;height:10px;width:100%">
          <div style="background:${cor};height:10px;border-radius:4px;width:${pct}%"></div>
        </div>
        <div style="font-size:7.5px;color:#555;margin-top:2px">
          ${score >= 700 ? 'BAIXO RISCO' : score >= 400 ? 'RISCO MODERADO' : 'ALTO RISCO'}
          &nbsp;—&nbsp;Escala 0 a 1000
        </div>
      </td>
    </tr>
  </table>`
}

/* ─── PÁGINA 1 — dados + ícones ─── */
function pag1(cnpj: string, data: any, agora: string, proto: string): string {
  const b   = data.basico ?? {}
  const sc  = data.score  ?? {}
  const pr  = data.processos ?? {}
  const pt  = data.protestos ?? {}
  const rel = data.relacionadas ?? {}

  const razao     = v(b.razaoSocial ?? b.nome, 'EMPRESA NÃO INFORMADA')
  const scoreVal  = Number(sc.score ?? sc.pontuacao ?? 0)
  const temProc   = (pr.total ?? pr.quantidade ?? 0) > 0
  const temProt   = (pt.total ?? pt.quantidade ?? 0) > 0
  const temRel    = Array.isArray(rel.empresas ?? rel.lista) && (rel.empresas ?? rel.lista).length > 0
  const sit       = v(b.situacaoCadastral ?? b.situacao, 'ATIVA').toUpperCase()
  const sitOk     = sit.includes('ATIVA') || sit.includes('ATIVO')

  const stSit:   Status = sitOk     ? 'ok'    : 'error'
  const stScore: Status = scoreVal >= 700 ? 'ok' : scoreVal >= 400 ? 'warn' : 'error'
  const stProc:  Status = temProc   ? 'error' : 'ok'
  const stProt:  Status = temProt   ? 'error' : 'ok'
  const stRel:   Status = temRel    ? 'warn'  : 'ok'

  return `
<div class="pg">
  ${header(agora, proto, '1')}
  ${banner(razao, cnpj)}

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
    <tr>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stSit,   'SITUAÇÃO CADASTRAL')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stScore, 'SCORE EMPRESARIAL')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stProc,  'PROCESSOS JUDICIAIS')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stProt,  'PROTESTOS')}</td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
    <tr>
      <td width="37.5%" style="border:none;padding:0"></td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stRel, 'EMPRESAS RELACIONADAS')}</td>
      <td width="37.5%" style="border:none;padding:0"></td>
    </tr>
  </table>

  ${secTitle('Dados Cadastrais')}
  ${tabela2col([
    ['Razão Social',     razao,                              'CNPJ',           maskCnpj(cnpj)],
    ['Nome Fantasia',    v(b.nomeFantasia),                  'CNAE Principal', v(b.cnae ?? b.cnaePrincipal)],
    ['Situação',         sit,                                'Data Abertura',  v(b.dataAbertura ?? b.dataFundacao)],
    ['Tipo',             v(b.tipo ?? b.naturezaJuridica),    'Porte',          v(b.porte ?? b.porteEmpresa)],
    ['Capital Social',   v(b.capitalSocial, '---'),         'Optante Simples', v(b.optanteSimples ?? b.simplesNacional, '---')],
  ])}

  ${secTitle('Endereço')}
  ${tabela2col([
    ['Logradouro', `${v(b.logradouro, '')} ${v(b.numero, '')}`.trim(), 'Bairro', v(b.bairro)],
    ['Município',  `${v(b.municipio, '-')}/${v(b.uf, '-')}`,           'CEP',    v(b.cep)],
    ['Telefone',   v(b.telefone),                                       'E-mail', v(b.email)],
  ])}

  ${secTitle('Score Empresarial')}
  ${scoreBar(scoreVal)}

  ${footer()}
</div>`
}

/* ─── PÁGINA 2 — QSA + processos + protestos ─── */
function pag2(cnpj: string, data: any, agora: string, proto: string): string {
  const b   = data.basico    ?? {}
  const qsa = data.qsa       ?? {}
  const pr  = data.processos ?? {}
  const pt  = data.protestos ?? {}
  const razao = v(b.razaoSocial ?? b.nome, 'EMPRESA NÃO INFORMADA')

  const socios: any[]    = Array.isArray(qsa.socios ?? qsa.qsa ?? qsa.lista) ? (qsa.socios ?? qsa.qsa ?? qsa.lista) : []
  const processos: any[] = Array.isArray(pr.processos ?? pr.lista) ? (pr.processos ?? pr.lista) : []
  const protestos: any[] = Array.isArray(pt.protestos ?? pt.lista) ? (pt.protestos ?? pt.lista) : []
  const totalProc  = pr.total ?? pr.quantidade ?? processos.length
  const totalProt  = pt.total ?? pt.quantidade ?? protestos.length
  const valorProt  = pt.valorTotal ?? pt.valor ?? 0

  return `
<div class="pg">
  ${header(agora, proto, '2')}
  ${banner(razao, cnpj)}

  ${secTitle('Quadro Societário (QSA)')}
  ${tabelaGen(
    ['Nome', 'CPF/CNPJ', 'Qualificação', 'Data Entrada'],
    socios.map((s: any) => [
      v(s.nome, '---'),
      v(s.cpf ?? s.cnpj ?? s.documento, '---'),
      v(s.qualificacao ?? s.cargo, '---'),
      v(s.dataEntrada ?? s.dataInicio, '---'),
    ])
  )}

  ${secTitle('Processos Judiciais')}
  <p style="font-size:10px;font-weight:700;color:${totalProc > 0 ? '#dc2626' : '#16a34a'};margin-bottom:4px">
    ${totalProc > 0 ? `CONSTA — ${totalProc} processo(s) encontrado(s)` : 'NADA CONSTA'}
  </p>
  ${tabelaGen(
    ['Número', 'Tipo', 'Vara / Tribunal', 'Data', 'Valor', 'Situação'],
    processos.slice(0, 15).map((p: any) => [
      v(p.numero ?? p.numeroProcesso, '---'),
      v(p.tipo ?? p.natureza, '---'),
      v(p.vara ?? p.tribunal, '---'),
      v(p.data ?? p.dataDistribuicao, '---'),
      v(p.valor ? `R$ ${p.valor}` : '', '---'),
      v(p.situacao ?? p.status, '---'),
    ])
  )}

  ${secTitle('Protestos em Cartório')}
  <p style="font-size:10px;font-weight:700;color:${totalProt > 0 ? '#dc2626' : '#16a34a'};margin-bottom:4px">
    ${totalProt > 0 ? `CONSTA — ${totalProt} protesto(s) | Valor total: R$ ${Number(valorProt).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'NADA CONSTA'}
  </p>
  ${tabelaGen(
    ['Data', 'Cartório', 'Cidade/UF', 'Valor', 'Credor'],
    protestos.slice(0, 15).map((p: any) => [
      v(p.data ?? p.dataProtesto, '---'),
      v(p.cartorio ?? p.nomeCartorio, '---'),
      `${v(p.municipio ?? p.cidade, '---')}/${v(p.uf, '---')}`,
      v(p.valor ? `R$ ${p.valor}` : '', '---'),
      v(p.credor ?? p.nomeCredor, '---'),
    ])
  )}

  ${footer()}
</div>`
}

/* ─── PÁGINA 3 — empresas relacionadas + considerações ─── */
function pag3(cnpj: string, data: any, agora: string, proto: string): string {
  const b   = data.basico      ?? {}
  const rel = data.relacionadas ?? {}
  const razao     = v(b.razaoSocial ?? b.nome, 'EMPRESA NÃO INFORMADA')
  const empresas: any[] = Array.isArray(rel.empresas ?? rel.lista) ? (rel.empresas ?? rel.lista) : []
  const n = TENANT.nome

  return `
<div class="pg">
  ${header(agora, proto, '3')}
  ${banner(razao, cnpj)}

  ${secTitle('Empresas Relacionadas')}
  <p style="font-size:10px;font-weight:700;color:${empresas.length > 0 ? '#d97706' : '#16a34a'};margin-bottom:4px">
    ${empresas.length > 0 ? `${empresas.length} empresa(s) relacionada(s) identificada(s)` : 'Nenhuma empresa relacionada identificada'}
  </p>
  ${tabelaGen(
    ['CNPJ', 'Razão Social', 'Tipo de Vínculo', 'Situação'],
    empresas.slice(0, 20).map((e: any) => [
      v(e.cnpj, '---'),
      v(e.razaoSocial ?? e.nome, '---'),
      v(e.vinculo ?? e.tipoRelacionamento, '---'),
      v(e.situacao ?? e.status, '---'),
    ])
  )}
  <p style="font-size:8px;color:#555;margin-bottom:10px">
    * Empresas relacionadas por sócios em comum, mesmo endereço, telefone ou outros vínculos identificados.
  </p>

  <p style="text-align:center;font-size:12px;font-weight:700;margin:12px 0 10px">CONSIDERAÇÕES IMPORTANTES</p>
  <div style="font-size:9px;line-height:1.7;color:#222">
    <p style="margin-bottom:8px">Esta CONSULTA CNPJ não tem caráter pericial e não substitui análise de crédito ou due diligence completa.</p>
    <p style="margin-bottom:8px">A ${n} não se responsabiliza por informações publicadas após a emissão desta consulta.</p>
    <p style="margin-bottom:8px">As informações são oriundas de bases públicas (Receita Federal, cartórios, tribunais) e privadas. A ${n} reproduz fielmente os dados recebidos.</p>
    <p style="margin-bottom:8px">A decisão sobre concessão de crédito ou qualquer negócio é de responsabilidade exclusiva do CONTRATANTE.</p>
    <p>Informações cadastrais da Receita Federal podem ter defasagem em relação a alterações recentes não processadas. Sempre confirme junto à Receita Federal e cartórios locais.</p>
  </div>

  ${footer()}
</div>`
}

function buildHtml(cnpj: string, data: any): string {
  const agora = new Date().toLocaleString('pt-BR')
  const proto = protocolo()

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#1a1a1a; background:#fff; }
.pg { width:210mm; min-height:297mm; padding:10mm 12mm 8mm; page-break-after:always; }
.pg:last-child { page-break-after:auto; }
p { margin:0; }
</style>
</head>
<body>
${pag1(cnpj, data, agora, proto)}
${pag2(cnpj, data, agora, proto)}
${pag3(cnpj, data, agora, proto)}
</body>
</html>`
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ documento: string }> }
) {
  const { documento } = await context.params
  const cnpj = limpaCnpj(documento)

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
  }

  const erros: string[] = []
  const safe = async (fn: () => Promise<any>, nome: string) => {
    try { return await fn() }
    catch (e: any) { erros.push(`${nome}: ${e.message}`); return null }
  }

  const [basico, qsa, score, processos, protestos, relacionadas] =
    await Promise.all([
      safe(() => consultarCnpjBasico(cnpj),      'basico'),
      safe(() => consultarQsaCnpj(cnpj),          'qsa'),
      safe(() => consultarScoreCnpj(cnpj),        'score'),
      safe(() => consultarProcessosCnpj(cnpj),    'processos'),
      safe(() => consultarProtestosCnpj(cnpj),    'protestos'),
      safe(() => consultarRelacionadasCnpj(cnpj), 'relacionadas'),
    ])

  const data = { cnpj, basico, qsa, score, processos, protestos, relacionadas, erros }
  const html = buildHtml(cnpj, data)

  let pdfBuffer: Buffer | null = null
  try {
    const puppeteer = await import('puppeteer-core')
    const browser = await puppeteer.default.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    pdfBuffer = Buffer.from(await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    }))
    await browser.close()
  } catch { /* fallback HTML */ }

  if (pdfBuffer) {
    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cnpj-${cnpj}.pdf"`,
      },
    })
  }
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
