import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail } from '@/lib/consulta-helper'

const TENANT = { nome: 'Ficha Auto', cor: '#7C3AED', site: 'fichaauto.com.br' }

function v(x: any, fb = 'Nao Informado'): string {
  if (x === null || x === undefined || x === '') return fb
  return String(x)
}
function protocolo() { return String(Date.now()).slice(-9) }
function moeda(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function agora() {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}
function maskCpf(c: string) {
  const d = c.replace(/\D/g, '')
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
}

function scoreColor(pontos: number | null): string {
  if (pontos === null) return '#6b7280'
  if (pontos >= 700) return '#16a34a'
  if (pontos >= 400) return '#d97706'
  return '#dc2626'
}
function scoreFaixa(pontos: number | null): string {
  if (pontos === null) return 'Nao informado'
  if (pontos >= 700) return 'BOM'
  if (pontos >= 400) return 'REGULAR'
  return 'RUIM'
}
function scoreDescricao(pontos: number | null): string {
  if (pontos === null) return 'Score nao disponivel'
  if (pontos >= 700) return 'Baixo risco de inadimplencia'
  if (pontos >= 400) return 'Risco moderado de inadimplencia'
  return 'Alto risco de inadimplencia'
}

function gaugeHtml(pontos: number | null): string {
  const pct = pontos !== null ? Math.min(Math.max(pontos / 1000, 0), 1) : 0
  const cor = scoreColor(pontos)
  const deg = Math.round(pct * 180) - 90
  return `
  <div style="text-align:center;padding:20px 0 10px">
    <div style="position:relative;display:inline-block;width:160px;height:90px;overflow:hidden">
      <div style="width:160px;height:160px;border-radius:50%;background:conic-gradient(
        #dc2626 0deg 60deg,
        #d97706 60deg 108deg,
        #16a34a 108deg 180deg,
        #e5e7eb 180deg 360deg
      );transform:rotate(180deg)"></div>
      <div style="position:absolute;top:10px;left:10px;width:140px;height:140px;border-radius:50%;background:white"></div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%) rotate(${deg}deg);transform-origin:bottom center;width:3px;height:72px;background:#111;border-radius:3px;margin-bottom:4px"></div>
    </div>
    <div style="font-size:36px;font-weight:900;color:${cor};margin-top:4px;line-height:1">${pontos ?? '?'}</div>
    <div style="font-size:11px;font-weight:700;color:${cor};text-transform:uppercase;letter-spacing:1px">${scoreFaixa(pontos)}</div>
    <div style="font-size:9px;color:#555;margin-top:2px">${scoreDescricao(pontos)}</div>
  </div>`
}

function section(titulo: string, cor = '#7C3AED'): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 6px">
    <tr>
      <td style="background:${cor};padding:5px 10px;border-radius:4px 4px 0 0">
        <span style="font-size:9px;font-weight:700;color:white;text-transform:uppercase;letter-spacing:1px">${titulo}</span>
      </td>
    </tr>
    <tr><td style="border:1px solid ${cor};border-top:none;padding:0">`
}
const sectionEnd = `</td></tr></table>`

function row(label: string, valor: string, destaque = false): string {
  return `
  <table width="100%" cellpadding="4" cellspacing="0" style="border-bottom:1px solid #f0f0f0">
    <tr>
      <td width="40%" style="font-size:8px;color:#555;padding-left:8px">${label}</td>
      <td style="font-size:${destaque ? '10' : '8'}px;font-weight:${destaque ? '700' : '400'};color:${destaque ? '#111' : '#333'}">${valor}</td>
    </tr>
  </table>`
}

function html(cpf: string, dados: any): string {
  const proto = protocolo()
  const dt    = agora()

  const sc  = dados?.score     ?? {}
  const pt  = dados?.protestos ?? {}
  const pr  = dados?.processos ?? {}

  const pontos: number | null = sc.pontos ?? sc.score ?? null
  const negativacoes: any[]   = Array.isArray(sc.negativacoes) ? sc.negativacoes : []
  const totalDebitos: number  = Number(sc.totalDebitos ?? negativacoes.length ?? 0)
  const valorTotal: number    = Number(sc.valorTotalDebitos ?? 0)
  const renda: string         = v(sc.rendaPresumida ?? sc.faixaRenda, 'Nao informada')
  const totalProtestos        = Number(pt.total ?? 0)
  const valorProtestos        = Number(pt.valorTotal ?? 0)
  const totalProcessos        = Number(pr.total ?? 0)
  const listaProtestos: any[] = Array.isArray(pt.lista) ? pt.lista : []
  const listaProcessos: any[] = Array.isArray(pr.lista) ? pr.lista : []

  const corSemDebitos  = totalDebitos  === 0 ? '#16a34a' : '#dc2626'
  const corSemProtesto = totalProtestos === 0 ? '#16a34a' : '#dc2626'
  const corSemProcess  = totalProcessos === 0 ? '#16a34a' : '#dc2626'

  return `<!DOCTYPE html><html><head>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 8.5px; color: #222; background:#fff; padding:14px; }
    @page { size: A4; margin: 14px; }
  </style>
  </head><body>

  <!-- HEADER -->
  <table width="100%" cellpadding="4" cellspacing="0" style="border-bottom:3px solid ${TENANT.cor};margin-bottom:10px;padding-bottom:8px">
    <tr>
      <td width="120" valign="middle">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:34px;height:34px;background:${TENANT.cor};border-radius:6px;display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-weight:900;font-size:16px">F</span>
          </div>
          <div>
            <div style="font-size:13px;font-weight:900;color:${TENANT.cor}">${TENANT.nome.toUpperCase()}</div>
            <div style="font-size:7.5px;color:#666">Analise de Credito</div>
          </div>
        </div>
      </td>
      <td align="center" valign="middle">
        <div style="font-size:16px;font-weight:700;color:#111">ANALISE DE CREDITO</div>
        <div style="font-size:8.5px;color:#555">Consulta CPF - Score SPC / Serasa / Banco Central</div>
        <div style="font-size:8px;color:#888">${dt} (Protocolo: ${proto})</div>
      </td>
      <td width="100" align="right" valign="middle">
        <div style="font-size:8px;color:#555;text-align:right">
          <strong>CPF:</strong><br>${maskCpf(cpf)}<br>
          <span style="color:#7C3AED;font-weight:700">CONFIDENCIAL</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- SCORE GAUGE + RESUMO -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">
    <tr>
      <td width="48%" valign="top" style="padding-right:8px">
        <div style="border:2px solid ${TENANT.cor};border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:700;color:${TENANT.cor};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Score de Credito</div>
          ${gaugeHtml(pontos)}
          <div style="font-size:8px;color:#555;margin-top:6px">
            Escala: 0 (alto risco) ate 1000 (baixo risco)
          </div>
        </div>
      </td>
      <td width="52%" valign="top">
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <div style="background:#f9f9f9;padding:6px 8px;border-bottom:1px solid #e5e7eb">
            <span style="font-size:9px;font-weight:700;color:#333">RESUMO FINANCEIRO</span>
          </div>

          <table width="100%" cellpadding="5" cellspacing="0">
            <tr style="background:${corSemDebitos}15;border-bottom:1px solid #f0f0f0">
              <td style="font-size:8px;color:#555;padding-left:8px">Negativacoes (SPC/Serasa)</td>
              <td align="right" style="font-size:10px;font-weight:700;color:${corSemDebitos};padding-right:8px">${totalDebitos}</td>
            </tr>
            <tr style="border-bottom:1px solid #f0f0f0">
              <td style="font-size:8px;color:#555;padding-left:8px">Valor total em debitos</td>
              <td align="right" style="font-size:10px;font-weight:700;color:#dc2626;padding-right:8px">${valorTotal > 0 ? moeda(valorTotal) : '—'}</td>
            </tr>
            <tr style="background:${corSemProtesto}15;border-bottom:1px solid #f0f0f0">
              <td style="font-size:8px;color:#555;padding-left:8px">Protestos em cartorio</td>
              <td align="right" style="font-size:10px;font-weight:700;color:${corSemProtesto};padding-right:8px">${totalProtestos}</td>
            </tr>
            <tr style="border-bottom:1px solid #f0f0f0">
              <td style="font-size:8px;color:#555;padding-left:8px">Valor total em protestos</td>
              <td align="right" style="font-size:10px;font-weight:700;color:${valorProtestos > 0 ? '#dc2626' : '#555'};padding-right:8px">${valorProtestos > 0 ? moeda(valorProtestos) : '—'}</td>
            </tr>
            <tr style="background:${corSemProcess}15;border-bottom:1px solid #f0f0f0">
              <td style="font-size:8px;color:#555;padding-left:8px">Acoes judiciais</td>
              <td align="right" style="font-size:10px;font-weight:700;color:${corSemProcess};padding-right:8px">${totalProcessos}</td>
            </tr>
            <tr>
              <td style="font-size:8px;color:#555;padding-left:8px">Renda presumida</td>
              <td align="right" style="font-size:9px;font-weight:600;color:#333;padding-right:8px">${renda}</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
  </table>

  <!-- NEGATIVACOES -->
  ${section('Negativacoes / Debitos', TENANT.cor)}
  ${negativacoes.length === 0
    ? `<div style="padding:10px 8px;font-size:8px;color:#16a34a;font-weight:600">Nenhuma negativacao encontrada</div>`
    : negativacoes.slice(0, 15).map((n: any) => `
    <table width="100%" cellpadding="3" cellspacing="0" style="border-bottom:1px solid #f5f5f5">
      <tr>
        <td width="30%" style="font-size:7.5px;color:#555;padding-left:8px">${v(n.credor ?? n.empresa ?? n.origem)}</td>
        <td width="25%" style="font-size:7.5px;color:#555">${v(n.tipo ?? n.natureza ?? n.descricao)}</td>
        <td width="20%" style="font-size:7.5px;color:#555">${v(n.dataOcorrencia ?? n.data)}</td>
        <td width="25%" align="right" style="font-size:8px;font-weight:700;color:#dc2626;padding-right:8px">${n.valor ? moeda(Number(n.valor)) : '—'}</td>
      </tr>
    </table>`).join('')
  }
  ${sectionEnd}

  <!-- PROTESTOS -->
  ${section('Protestos em Cartorio', '#b45309')}
  ${listaProtestos.length === 0
    ? `<div style="padding:10px 8px;font-size:8px;color:#16a34a;font-weight:600">Nenhum protesto encontrado</div>`
    : listaProtestos.slice(0, 10).map((p: any) => `
    <table width="100%" cellpadding="3" cellspacing="0" style="border-bottom:1px solid #f5f5f5">
      <tr>
        <td width="30%" style="font-size:7.5px;color:#555;padding-left:8px">${v(p.cartorio ?? p.devedor ?? p.credor)}</td>
        <td width="25%" style="font-size:7.5px;color:#555">${v(p.cidade ?? p.uf ?? p.municipio)}</td>
        <td width="20%" style="font-size:7.5px;color:#555">${v(p.data ?? p.dataProtesto)}</td>
        <td width="25%" align="right" style="font-size:8px;font-weight:700;color:#b45309;padding-right:8px">${p.valor ? moeda(Number(p.valor)) : '—'}</td>
      </tr>
    </table>`).join('')
  }
  ${sectionEnd}

  <!-- ACOES JUDICIAIS -->
  ${section('Acoes Judiciais', '#1d4ed8')}
  ${listaProcessos.length === 0
    ? `<div style="padding:10px 8px;font-size:8px;color:${totalProcessos > 0 ? '#d97706' : '#16a34a'};font-weight:600">${totalProcessos > 0 ? `${totalProcessos} processo(s) encontrado(s). Consulte o DataJud para detalhes.` : 'Nenhuma acao judicial encontrada'}</div>`
    : listaProcessos.slice(0, 10).map((p: any) => `
    <table width="100%" cellpadding="3" cellspacing="0" style="border-bottom:1px solid #f5f5f5">
      <tr>
        <td width="40%" style="font-size:7.5px;color:#555;padding-left:8px">${v(p.numero ?? p.processo)}</td>
        <td width="30%" style="font-size:7.5px;color:#555">${v(p.assunto ?? p.tipo ?? p.classe)}</td>
        <td width="30%" style="font-size:7.5px;color:#555">${v(p.tribunal ?? p.vara ?? p.orgao)}</td>
      </tr>
    </table>`).join('')
  }
  ${sectionEnd}

  <!-- RODAPE -->
  <div style="margin-top:14px;padding:8px;background:#f9f9f9;border-radius:6px;border:1px solid #e5e7eb">
    <p style="font-size:7px;color:#888;line-height:1.5">
      Este documento e de uso exclusivo do solicitante. As informacoes sao oriundas de bases de dados de credito (SPC, Serasa, Banco Central e demais orgaos de protecao ao credito) e refletem a situacao do CPF na data/hora da consulta. A ${TENANT.nome} nao se responsabiliza por divergencias ou atualizacoes posteriores. Uso indevido deste documento e vedado pela LGPD (Lei 13.709/2018).
    </p>
    <div style="display:flex;justify-content:space-between;margin-top:4px">
      <span style="font-size:7px;color:#aaa">Protocolo: ${proto}</span>
      <span style="font-size:7px;color:#aaa">${TENANT.site}</span>
      <span style="font-size:7px;color:#aaa">${dt}</span>
    </div>
  </div>

  </body></html>`
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ documento: string }> }
) {
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const { documento } = await context.params
  const cpf = documento.replace(/\D/g, '')
  const dados = await req.json().catch(() => ({}))

  try {
    const puppeteer = await import('puppeteer-core')
    const browser   = await puppeteer.default.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    })
    const page = await browser.newPage()
    await page.setContent(html(cpf, dados), { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } })
    await browser.close()

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="credito-${cpf}.pdf"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
