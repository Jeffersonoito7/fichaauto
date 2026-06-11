import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getAuthEmail } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { consultarVeiculo } from '@/lib/providers'

const TENANT = {
  nome:  'Ficha Auto',
  cor:   '#00703C',
  site:  'fichaauto.com.br',
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
function v(x: any, fallback = 'Não Informado'): string {
  if (x === null || x === undefined || x === '') return fallback
  return String(x)
}
function moeda(x: any): string {
  if (x === null || x === undefined || x === '') return '0,00'
  if (typeof x === 'string' && x.includes('R$')) return x.replace('R$','').trim()
  const n = Number(x)
  return isNaN(n) ? String(x) : n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}
function anoStr(p: any): string {
  if (p.anoFabricacao && p.anoModelo) return `${p.anoFabricacao}/${p.anoModelo}`
  return v(p.anoFabricacao ?? p.ano, 'N/I')
}
function isOk(s: string): boolean {
  const u = (s ?? '').toUpperCase()
  return u === '' || u === 'NADA CONSTA' || u === 'SEM RESTRICAO' || u === 'NORMAL' || u === '0,00' || u === '0'
}
function cor(s: string): string {
  const u = (s ?? '').toUpperCase()
  if (u === 'NADA CONSTA' || u === 'SEM RESTRICAO' || u === 'NORMAL') return '#16a34a'
  if (u.includes('RENAJUD') || u.includes('ROUBO') || u.includes('CONSTA RESTRIÇÃO') || u === 'CONSTA') return '#dc2626'
  if (u.includes('ALIEN') || u.includes('FIDUCIARIA')) return '#d97706'
  return '#1a1a1a'
}
function protocolo(): string { return String(Date.now()).slice(-9) }

type Status = 'ok' | 'warn' | 'error'

/* ── ícone de status: verde=ok, amarelo=alerta, vermelho=crítico ──────────── */
function iconeInner(status: Status, label: string): string {
  const bg     = status === 'ok' ? '#16a34a' : status === 'warn' ? '#d97706' : '#dc2626'
  const symbol = status === 'ok' ? '&#10003;' : '!'
  return `
    <div style="width:50px;height:50px;border-radius:50%;background:${bg};
                display:flex;align-items:center;justify-content:center;margin:0 auto">
      <span style="font-size:22px;font-weight:900;color:white;line-height:1">
        ${symbol}
      </span>
    </div>
    <div style="font-size:7px;font-weight:700;margin-top:3px;text-align:center;
                line-height:1.3;color:#222">
      ${label}
    </div>`
}

/* ── cabeçalho de página ─────────────────────────────────────────────────── */
function header(agora: string, proto: string, pag: string, qrDataUrl: string): string {
  return `
  <table width="100%" cellpadding="4" cellspacing="0"
         style="border-bottom:2px solid #333;margin-bottom:0">
    <tr>
      <td width="130" valign="middle">
        <img src="https://fichaauto.com.br/logo-horizontal.png"
             style="height:34px;object-fit:contain;display:block" alt="Ficha Auto" />
      </td>
      <td align="center" valign="middle">
        <div style="font-size:15px;font-weight:700;color:#111">Consulta Veicular</div>
        <div style="font-size:8.5px;color:#555">Informações Exclusivas</div>
        <div style="font-size:8.5px;color:#555">
          Data Hora da Consulta:&nbsp;<strong>${agora}</strong>
          &nbsp;(${proto})&nbsp;Pág.&nbsp;${pag}
        </div>
      </td>
      <td width="60" align="right" valign="middle">
        <img src="${qrDataUrl}" width="52" height="52" style="display:block" />
      </td>
    </tr>
  </table>`
}

/* ── banner verde com nome/placa ─────────────────────────────────────────── */
function banner(marcaModelo: string, placa: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0">
    <tr>
      <td align="center" valign="middle"
          style="background:${TENANT.cor};padding:14px 8px">
        <div style="font-size:24px;font-weight:900;color:white;
                    letter-spacing:0.5px;text-transform:uppercase;line-height:1.2">
          ${marcaModelo.toUpperCase()}
        </div>
        <div style="font-size:22px;font-weight:900;color:white;
                    font-family:monospace;letter-spacing:4px;margin-top:2px">
          ${placa}
        </div>
      </td>
    </tr>
  </table>`
}

/* ── rodapé ──────────────────────────────────────────────────────────────── */
function footer(): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0"
         style="border-top:1px solid #ccc;margin-top:8px">
    <tr>
      <td width="42" valign="top" style="padding-top:5px">
        <div style="width:36px;height:36px;background:${TENANT.cor};border-radius:4px;
          text-align:center;line-height:36px">
          <span style="color:white;font-weight:900;font-size:14px">F</span>
        </div>
      </td>
      <td valign="top" style="font-size:7.5px;color:#555;line-height:1.45;padding-top:5px">
        A ${TENANT.nome} não é responsável pelas informações inseridas na sua base de dados já que são oriundas de consulta às Bases Públicas e
        Privadas sobre as quais não detém a propriedade das informações, limitando-se assim, a reproduzi-las fielmente, na forma como
        originariamente apresentadas. Da mesma forma não se responsabiliza por informações incorretas, faltantes, ou divergentes de bases
        públicas. Em diversas situações, podem surgir multas retroativas para o veículo, mesmo com alteração de proprietário conforme o
        Código de Trânsito Brasileiro. Desta forma, a ${TENANT.nome} não se responsabiliza pelos débitos lançados pelos órgãos competentes.
      </td>
    </tr>
  </table>`
}

/* ── título de seção ─────────────────────────────────────────────────────── */
function secTitle(txt: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 4px">
    <tr>
      <td style="font-size:10px;font-weight:700;text-transform:uppercase;
                 border-bottom:1.5px solid #444;padding-bottom:3px;color:#111">
        ${txt}
      </td>
    </tr>
  </table>`
}

/* ── tabela 2 colunas de campos (label | valor | label | valor) ──────────── */
function tabela2col(linhas: [string, string, string, string][]): string {
  return `
  <table width="100%" cellpadding="4" cellspacing="0"
         style="border-collapse:collapse;font-size:9.5px;margin-bottom:6px">
    ${linhas.map(([l1, v1, l2, v2], i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f7f7f7'}">
      <td width="15%" style="font-weight:700;border:1px solid #ddd;padding:4px 6px">${l1}</td>
      <td width="35%" style="border:1px solid #ddd;padding:4px 6px">${v1}</td>
      <td width="15%" style="font-weight:700;border:1px solid #ddd;padding:4px 6px">${l2}</td>
      <td width="35%" style="border:1px solid #ddd;padding:4px 6px">${v2}</td>
    </tr>`).join('')}
  </table>`
}

/* ── tabela genérica com cabeçalho ───────────────────────────────────────── */
function tabelaGen(cols: string[], linhas: string[][]): string {
  return `
  <table width="100%" cellpadding="4" cellspacing="0"
         style="border-collapse:collapse;font-size:9.5px;margin-bottom:6px">
    <tr>
      ${cols.map(c =>
        `<th style="font-weight:700;background:#f0f0f0;border:1px solid #ddd;
                    padding:4px 6px;text-align:left">${c}</th>`
      ).join('')}
    </tr>
    ${linhas.length === 0
      ? `<tr>${cols.map(() => `<td style="border:1px solid #ddd;padding:4px 6px;color:#999">---</td>`).join('')}</tr>`
      : linhas.map((row, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f7f7f7'}">
          ${row.map(c => `<td style="border:1px solid #ddd;padding:4px 6px">${c}</td>`).join('')}
        </tr>`).join('')
    }
  </table>`
}

/* ════════════════════════════════════════════════════════════════════════════
   PÁGINA 1 — identificação, características, débitos
════════════════════════════════════════════════════════════════════════════ */
function pag1(placa: string, data: any, agora: string, proto: string, qr: string): string {
  const p    = normalizaPlacaV3(data.placa)
  const deb  = debitosBinEst(data)
  const restOutrasUFs = restricoesBinEst(data)
  const binFed = normalizaBinFederalV3(data.binFederal)
  const leilao = normalizaLeilaoV3(data.leilao)
  const sinistro = normalizaSinistroV3(data.sinistro)

  const temRenajud        = binFed.restricoes.some(r => r.toUpperCase().includes('RENAJUD')) || binFed.renajud.length > 0
  const temAlienacao      = binFed.restricoes.some(r => r.toUpperCase().includes('ALIEN'))
  const temAlienacaoFiduc = binFed.restricoes.some(r => r.toUpperCase().includes('FIDUCI'))
  const temRoubo          = binFed.rouboFurto.length > 0
  const temSinistro       = sinistro.temSinistro
  const temLeilao         = leilao.todos.length > 0
  const temAlteracoes     = false

  // três estados por ícone
  const stDetran:    Status = temRenajud   ? 'error' : 'ok'
  const stRestricoes:Status = temRenajud   ? 'error' : temAlienacao ? 'warn' : 'ok'
  const stAlienacao: Status = !temAlienacao ? 'ok'   : temAlienacaoFiduc ? 'warn' : 'error'
  const stSinistro:  Status = temSinistro ? 'error' : sinistro.recuperado ? 'warn' : 'ok'
  const stRoubo:     Status = temRoubo     ? 'error' : 'ok'
  const stLeilao:    Status = temLeilao    ? 'error' : 'ok'
  const stAlteracoes:Status = temAlteracoes ? 'warn' : 'ok'

  const mm = v(p.marcaModelo ?? p.marca, 'VEÍCULO')
  // Usa restricoes do BIN Estadual (outrasUFs); fallback para consulta-base
  const rest1 = restOutrasUFs[0] ?? v(p.restricaoEstadual01, 'NADA CONSTA')
  const rest2 = restOutrasUFs[1] ?? v(p.restricaoEstadual02, 'NADA CONSTA')
  const rest3 = restOutrasUFs[2] ?? v(p.restricaoEstadual03, 'NADA CONSTA')
  const rest4 = restOutrasUFs[3] ?? v(p.restricaoEstadual04, 'NADA CONSTA')

  return `
<div class="pg">
  ${header(agora, proto, '1', qr)}
  ${banner(mm, placa)}

  <!-- 7 ícones: linha 1 com 4, linha 2 com 3 centralizados -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
    <tr>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stDetran,    'DETRAN')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stRestricoes,'RESTRIÇÕES')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stAlienacao, 'ALIENAÇÃO')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stSinistro,  'INDÍCIO SINISTRO')}</td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
    <tr>
      <td width="12.5%" style="border:none;padding:0"></td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stRoubo,     'HISTÓRICO ROUBO/FURTO')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stLeilao,    'HISTÓRICO LEILÃO')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stAlteracoes,'ALTERAÇÕES CARACTERÍSTICAS')}</td>
      <td width="12.5%" style="border:none;padding:0"></td>
    </tr>
  </table>

  ${secTitle('Identificação')}
  ${tabela2col([
    ['Placa',        `<span style="font-family:monospace">${placa}</span>`, 'Marca Modelo', mm],
    ['Ano',          anoStr(p),       'Cor',          v(p.cor)],
    ['Renavam',      `<span style="font-family:monospace">${v(p.renavam)}</span>`, 'Chassi', `<span style="font-family:monospace">${v(p.chassi)}</span>`],
    ['Cambio',       v(p.cambio ?? p.transmissao), 'Motor', `<span style="font-family:monospace">${v(p.motor ?? p.numeroMotor)}</span>`],
    ['Municipio/UF', `${v(p.municipio, '-')}/${v(p.uf, '-')}`, 'Num. Carroceria', v(p.numCarroceria)],
  ])}

  ${secTitle('Características')}
  ${tabela2col([
    ['Combustível',    v(p.combustivel),                         'Passageiros',      v(p.passageiros ?? p.lotacao)],
    ['Tipo Automóvel', v(p.tipoAutomovel ?? p.tipo),             'Procedência',      v(p.procedencia)],
    ['Espécie',        v(p.especie),                             'Cilindradas',      v(p.cilindradas)],
    ['Categoria',      v(p.categoria),                           'Capac. Carga',     v(p.capacCarga ?? p.cargaUtil, '0')],
    ['Potência',       v(p.potencia),                            'Carroceria',       v(p.carroceria)],
    ['Eixo Traseiro',  v(p.eixoTraseiro, ''),                    'Eixo Auxiliar',    v(p.eixoAuxiliar, '')],
    ['Eixos',          v(p.eixos, '0'),                          'Últ. Atualização', v(p.ultimaAtualizacao ?? p.dataAtualizacao)],
    ['CMT',            v(p.cmt, '0'),                            'PBT',              v(p.pbt, '0')],
  ])}

  ${secTitle('Débitos e Restrições')}
  <table width="100%" cellpadding="4" cellspacing="0"
         style="border-collapse:collapse;font-size:9.5px;margin-bottom:6px">
    <tr style="background:#fff">
      <td width="18%" style="font-weight:700;border:1px solid #ddd;padding:4px 6px">Rest. Estadual 01</td>
      <td width="32%" style="border:1px solid #ddd;padding:4px 6px;color:${cor(rest1)};font-weight:700">${rest1}</td>
      <td width="15%" style="font-weight:700;border:1px solid #ddd;padding:4px 6px">$ Licenciamento</td>
      <td style="border:1px solid #ddd;padding:4px 6px">${moeda(deb.licenciamento)}</td>
    </tr>
    <tr style="background:#f7f7f7">
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">Rest. Estadual 02</td>
      <td style="border:1px solid #ddd;padding:4px 6px;color:${cor(rest2)};font-weight:700">${rest2}</td>
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">$ IPVA</td>
      <td style="border:1px solid #ddd;padding:4px 6px">${moeda(deb.ipva)}</td>
    </tr>
    <tr style="background:#fff">
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">Rest. Estadual 03</td>
      <td style="border:1px solid #ddd;padding:4px 6px;color:${cor(rest3)};font-weight:700">${rest3}</td>
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">$ DPVAT</td>
      <td style="border:1px solid #ddd;padding:4px 6px;color:#d97706;font-weight:700">${moeda(deb.dpvat)}</td>
    </tr>
    <tr style="background:#f7f7f7">
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">Rest. Estadual 04</td>
      <td style="border:1px solid #ddd;padding:4px 6px;color:${cor(rest4)};font-weight:700">${rest4}</td>
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">$ MULTAS</td>
      <td style="border:1px solid #ddd;padding:4px 6px">${moeda(deb.multasTotal)}</td>
    </tr>
    <tr style="background:#fff">
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">Situação Veículo</td>
      <td style="border:1px solid #ddd;padding:4px 6px;color:#16a34a;font-weight:700">${v(p.situacaoVeiculo, 'EM CIRCULACAO')}</td>
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">Situação Chassi</td>
      <td style="border:1px solid #ddd;padding:4px 6px;color:#16a34a;font-weight:700">${v(p.situacaoChassi, 'NORMAL')}</td>
    </tr>
  </table>

  <p style="font-size:8px;color:#555;line-height:1.5;margin-bottom:8px">
    ATENÇÃO: Informações de multas, débitos e restrições apresentadas podem conter divergência em razão de critérios regionais dos Órgãos de Trânsito,
    por isso, recomendamos que consulte SEMPRE o site do DETRAN e SECRETARIA DA FAZENDA, pois cada estado possui características distintas
  </p>

  ${footer()}
</div>`
}

/* ════════════════════════════════════════════════════════════════════════════
   PÁGINA 2 — alterações, restrições, roubo, gravame
════════════════════════════════════════════════════════════════════════════ */
function pag2(placa: string, data: any, agora: string, proto: string, qr: string): string {
  const p    = normalizaPlacaV3(data.placa)
  const mm   = v(p.marcaModelo ?? p.marca, 'VEÍCULO')
  const bin  = normalizaBinFederalV3(data.binFederal)
  const restOutrasUFs = restricoesBinEst(data)

  const temRenajud   = bin.restricoes.some(r => r.toUpperCase().includes('RENAJUD')) || bin.renajud.length > 0
  const temAlienacao = bin.restricoes.some(r => r.toUpperCase().includes('ALIEN'))
  const temRoubo     = bin.rouboFurto.length > 0

  // Usa restricoes BIN Estadual; fallback para consulta-base
  const rest1 = restOutrasUFs[0] ?? v(p.restricaoEstadual01, 'NADA CONSTA')
  const rest2 = restOutrasUFs[1] ?? v(p.restricaoEstadual02, 'NADA CONSTA')
  const rest3 = restOutrasUFs[2] ?? v(p.restricaoEstadual03, 'NADA CONSTA')
  const rest4 = restOutrasUFs[3] ?? v(p.restricaoEstadual04, 'NADA CONSTA')

  const gravames: any[]  = normalizaGravameV3(data.gravame)
  const binNaoConsultado = data.binFederal === null || data.binFederal === undefined

  return `
<div class="pg">
  ${header(agora, proto, '2', qr)}
  ${banner(mm, placa)}

  ${secTitle('Alterações de Caracteristicas')}
  <table width="100%" cellpadding="4" cellspacing="0"
         style="border-collapse:collapse;font-size:9.5px;margin-bottom:10px">
    <tr>
      <th style="font-weight:700;background:#f0f0f0;border:1px solid #ddd;padding:4px 6px;text-align:left;width:18%">ITEM</th>
      <th style="font-weight:700;background:#f0f0f0;border:1px solid #ddd;padding:4px 6px;text-align:left;width:30%">Fábrica</th>
      <th style="font-weight:700;background:#f0f0f0;border:1px solid #ddd;padding:4px 6px;text-align:left;width:30%">Atual</th>
      <th style="font-weight:700;background:#f0f0f0;border:1px solid #ddd;padding:4px 6px;text-align:left;width:22%">Resultado</th>
    </tr>
    ${[
      ['Chassi',      v(p.chassi), v(p.chassi)],
      ['Motor',       v(p.motor ?? p.numeroMotor), v(p.motor ?? p.numeroMotor)],
      ['Cor',         v(p.cor), v(p.cor)],
      ['Combustível', v(p.combustivel), v(p.combustivel)],
    ].map(([item, fab, atual], i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f7f7f7'}">
      <td style="border:1px solid #ddd;padding:4px 6px">${item}</td>
      <td style="border:1px solid #ddd;padding:4px 6px;font-family:monospace;font-size:9px">${fab}</td>
      <td style="border:1px solid #ddd;padding:4px 6px;font-family:monospace;font-size:9px">${atual}</td>
      <td style="border:1px solid #ddd;padding:4px 6px;color:#16a34a;font-weight:700">Sem Alterações</td>
    </tr>`).join('')}
  </table>

  <p style="font-size:10px;font-weight:700;border-bottom:1.5px solid #444;padding-bottom:3px;margin:10px 0 6px;text-transform:uppercase">Restrições</p>
  <table width="100%" cellpadding="4" cellspacing="0"
         style="border-collapse:collapse;font-size:9.5px;margin-bottom:10px">
    <tr>
      <td width="18%" style="font-weight:700;border:1px solid #ddd;padding:5px 6px">Restricao 01</td>
      <td width="32%" style="border:1px solid #ddd;padding:5px 6px;color:${cor(rest1)};font-weight:700">${rest1}</td>
      <td width="18%" style="font-weight:700;border:1px solid #ddd;padding:5px 6px">Restricao 03</td>
      <td style="border:1px solid #ddd;padding:5px 6px;color:${cor(rest3)};font-weight:700">${rest3}</td>
    </tr>
    <tr>
      <td style="font-weight:700;border:1px solid #ddd;padding:5px 6px">Restricao 02</td>
      <td style="border:1px solid #ddd;padding:5px 6px;color:${cor(rest2)};font-weight:700">${rest2}</td>
      <td style="font-weight:700;border:1px solid #ddd;padding:5px 6px">Restricao 04</td>
      <td style="border:1px solid #ddd;padding:5px 6px;color:${cor(rest4)};font-weight:700">${rest4}</td>
    </tr>
  </table>

  ${secTitle('BIN Federal — Roubo, Furto e RENAJUD')}
  <p style="font-size:10px;font-weight:700;color:${binNaoConsultado ? '#888' : (temRoubo || temRenajud) ? '#dc2626' : '#16a34a'};margin-bottom:4px">
    ${binNaoConsultado ? 'NÃO CONSULTADO NESTA PESQUISA'
       : (temRoubo && temRenajud) ? 'CONSTA OCORRÊNCIA DE ROUBO/FURTO E RENAJUD'
       : temRoubo ? 'CONSTA OCORRÊNCIA DE ROUBO/FURTO'
       : temRenajud ? 'CONSTA RESTRIÇÃO RENAJUD'
       : 'NADA CONSTA'}
  </p>
  ${bin.renajud.length > 0 ? `
  <p style="font-size:9px;font-weight:700;margin:4px 0 2px;color:#dc2626">Restrições RENAJUD:</p>
  ${tabelaGen(
    ['Tipo', 'Data', 'Órgão', 'Situação'],
    bin.renajud.map((r: any) => [
      v(r.tipo ?? r.tipoRestricao ?? r.descricao, '---'),
      v(r.data ?? r.dataInclusao, '---'),
      v(r.orgao ?? r.nomeTribunal ?? r.tribunal, '---'),
      v(r.situacao ?? r.status, '---'),
    ])
  )}` : ''}
  ${bin.rouboFurto.length > 0 ? `
  <p style="font-size:9px;font-weight:700;margin:4px 0 2px;color:#dc2626">Ocorrências de Roubo/Furto:</p>
  ${tabelaGen(
    ['Data', 'Órgão', 'Boletim', 'Município', 'Tipo'],
    bin.rouboFurto.map((r: any) => [
      v(r.data ?? r.dataOcorrencia, '---'),
      v(r.orgao ?? r.delegacia, '---'),
      v(r.boletim ?? r.numeroBo, '---'),
      v(r.municipio ?? r.cidade, '---'),
      v(r.tipo ?? r.tipoOcorrencia ?? r.ocorrencia, '---'),
    ])
  )}` : (!binNaoConsultado && !temRoubo) ? `
  ${tabelaGen(['Data Ocorrência', 'Órgão', 'Boletim', 'Município', 'Ocorrência'], [])}
  ` : ''}

  ${secTitle('Histórico de Gravame')}
  ${tabelaGen(
    ['Restrição', 'Agente Financeiro', 'Devedor', 'Status'],
    gravames.length > 0
      ? gravames.map((g: any) => [
          v(g.restricaoFinanceira ?? g.restricao ?? g.situacao ?? g.tipoGravame, '---'),
          v(g.agenteFinanceiro ?? g.nome ?? g.agente ?? g.nomeFinanciador, '---'),
          v(g.nomeFinanciado ?? g.nomeDevedor ?? g.devedor, '---'),
          v(g.status ?? g.situacao ?? '', '---'),
        ])
      : []
  )}

  ${footer()}
</div>`
}

/* ════════════════════════════════════════════════════════════════════════════
   PÁGINA 3 — sinistro, leilão (3 bases), chassi
════════════════════════════════════════════════════════════════════════════ */
function pag3(placa: string, data: any, agora: string, proto: string, qr: string): string {
  const p   = normalizaPlacaV3(data.placa)
  const cd  = data.chassi ?? {}
  const mm  = v(p.marcaModelo ?? p.marca, 'VEÍCULO')

  const leilaoNaoConsultado   = data.leilao   === null || data.leilao   === undefined
  const sinistroNaoConsultado = data.sinistro === null || data.sinistro === undefined

  const leil    = normalizaLeilaoV3(data.leilao)
  const sinistro = normalizaSinistroV3(data.sinistro)

  // API v3: historicoLeilao[] tem {data, numero, comitente, leiloeiro, uf, _base}
  const leilHdr = ['Base', 'Data', 'Comitente / Órgão', 'Leiloeiro', 'UF']
  function leilLinhas(arr: any[]): string[][] {
    return arr.map((r: any) => [
      v(r._base ?? r.tipo ?? r.base, '---'),
      v(r.data ?? r.dataLeilao ?? r.dataCadastro, '---'),
      v(r.comitente ?? r.orgao ?? r.comarca ?? r.vara ?? r.descricao, '---'),
      v(r.leiloeiro ?? r.leilaoeiro, '---'),
      v(r.uf, '---'),
    ])
  }
  function leilRes(arr: any[], naoConsultado: boolean): string {
    if (naoConsultado) return `<span style="color:#888;font-weight:700">NÃO CONSULTADO</span>`
    return arr.length > 0
      ? `<span style="color:#dc2626;font-weight:700">CONSTA (${arr.length} registro${arr.length > 1 ? 's' : ''})</span>`
      : `<span style="color:#16a34a;font-weight:700">NADA CONSTA</span>`
  }

  return `
<div class="pg">
  ${header(agora, proto, '3', qr)}
  ${banner(mm, placa)}

  ${secTitle('Indício de Sinistro')}
  <p style="font-size:10px;font-weight:700;color:${sinistroNaoConsultado ? '#888' : sinistro.temSinistro ? '#dc2626' : sinistro.recuperado ? '#d97706' : '#16a34a'};margin-bottom:4px">
    ${sinistroNaoConsultado ? 'NÃO CONSULTADO NESTA PESQUISA' : sinistro.descricao}
  </p>
  <p style="font-size:8.5px;color:#555;margin-bottom:8px;line-height:1.5">
    ATENÇÃO: ESTA INFORMAÇÃO REPRESENTA INDÍCIOS BASEADOS EM FONTES DE DADOS.<br>
    REALIZE UMA VISTORIA FÍSICA NO VEÍCULO PARA GARANTIR QUALQUER EVIDÊNCIA DE ACIDENTES E RESPECTIVOS IMPACTOS.
  </p>

  <p style="font-size:10px;font-weight:700;text-transform:uppercase;
            border-bottom:1.5px solid #444;padding-bottom:3px;margin:8px 0 4px">
    HISTÓRICO DE LEILÃO:&nbsp;${leilRes(leil.todos, leilaoNaoConsultado)}
  </p>
  ${tabelaGen(leilHdr, leilaoNaoConsultado ? [] : leilLinhas(leil.todos))}

  ${secTitle('Decodificador de Chassi')}
  <table width="100%" cellpadding="4" cellspacing="0"
         style="border-collapse:collapse;font-size:9.5px;margin-bottom:6px">
    <tr style="background:#fff">
      <td width="20%" style="font-weight:700;border:1px solid #ddd;padding:4px 6px">Ident. Completa</td>
      <td colspan="3" style="border:1px solid #ddd;padding:4px 6px">${v(cd.identificacaoCompleta ?? cd.ident)}</td>
    </tr>
    ${[
      ['Chave Chassi', v(cd.chaveChasse ?? cd.chaveChassi ?? v(p.chassi).slice(0,10)), 'Fabricante', v(cd.fabricante)],
      ['Modelo',       v(cd.modelo),          'Veículo',        v(cd.veiculo)],
      ['Portas',       v(cd.portas),           'Motor',          v(cd.motorDesc ?? cd.motor)],
      ['Transmissão',  v(cd.transmissao),      'Tipo Motor',     v(cd.tipoMotor, '')],
      ['Ano',          v(cd.ano),              'Combustível',    v(cd.combustivel)],
      ['Região',       v(cd.regiao),           'Carroceria',     v(cd.carroceria)],
      ['País/Local',   v(cd.pais ?? cd.local), 'Verif. Serial',  v(cd.verificacaoSerial, 'OK')],
      ['Cód. Fipe',    v(cd.codigoFipe),       'Qtde Eixos',     v(cd.eixos ?? cd.qtdEixos, '')],
    ].map(([l1,v1,l2,v2], i) => `
    <tr style="background:${i % 2 === 0 ? '#f7f7f7' : '#fff'}">
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">${l1}</td>
      <td style="border:1px solid #ddd;padding:4px 6px">${v1}</td>
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">${l2}</td>
      <td style="border:1px solid #ddd;padding:4px 6px">${v2}</td>
    </tr>`).join('')}
  </table>

  ${footer()}
</div>`
}

/* ════════════════════════════════════════════════════════════════════════════
   PÁGINA 4 — informações adicionais
════════════════════════════════════════════════════════════════════════════ */
function pag4(placa: string, data: any, agora: string, proto: string, qr: string): string {
  const p   = normalizaPlacaV3(data.placa)
  const mm  = v(p.marcaModelo ?? p.marca, 'VEÍCULO')
  const deb = debitosBinEst(data)
  const bin = normalizaBinFederalV3(data.binFederal)
  const temRenajud = bin.restricoes.some(r => r.toUpperCase().includes('RENAJUD')) || bin.renajud.length > 0
  const temRoubo   = bin.rouboFurto.length > 0

  const infos: [string, string, string][] = [
    ['MULTAS DETRAN',        `R$ ${moeda(deb.multasTotal)}`,          '#16a34a'],
    ['IPVA / Licenciamento', `IPVA: ${moeda(deb.ipva)} | Lic: ${moeda(deb.licenciamento)}`, '#16a34a'],
    ['OBS GERAIS',           v(p.obsGerais, 'NADA CONSTA'),            '#16a34a'],
    ['debitos',              v(p.debitos, 'Sem débitos'),               '#16a34a'],
    ['Ocorrência',
     temRoubo ? 'VEICULO INDICA OCORRENCIA DE ROUBO/FURTO' : 'VEICULO NAO INDICA OCORRENCIA DE ROUBO/FURTO',
     temRoubo ? '#dc2626' : '#16a34a'],
    ['REST. JUDICIAL',
     temRenajud ? 'CONSTA RESTRIÇÃO RENAJUD' : 'NADA CONSTA',
     temRenajud ? '#dc2626' : '#16a34a'],
    ['DATA EMISSAO CRV',     v(p.dataEmissaoCrv ?? p.dataEmissao),    '#1a1a1a'],
    ['AVISO MULTA/RENAINF',  'Sempre Verifique os sites do DETRAN e outros órgãos para confirmar a lista de multas/autuações', '#555'],
  ]

  return `
<div class="pg">
  ${header(agora, proto, '4', qr)}
  ${banner(mm, placa)}

  ${secTitle('Informações Adicionais')}
  <table width="100%" cellpadding="4" cellspacing="0"
         style="border-collapse:collapse;font-size:9.5px;margin-bottom:6px">
    <tr>
      <th style="font-weight:700;background:#f0f0f0;border:1px solid #ddd;padding:4px 6px;
                 text-align:left;width:25%">Informação</th>
      <th style="font-weight:700;background:#f0f0f0;border:1px solid #ddd;padding:4px 6px;
                 text-align:left">Valor</th>
    </tr>
    ${infos.map(([info, val, c], i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f7f7f7'}">
      <td style="font-weight:700;border:1px solid #ddd;padding:4px 6px">${info}</td>
      <td style="border:1px solid #ddd;padding:4px 6px;color:${c};font-weight:700">${val}</td>
    </tr>`).join('')}
  </table>

  ${footer()}
</div>`
}

/* ════════════════════════════════════════════════════════════════════════════
   PÁGINA EXTRA — tabela FIPE
════════════════════════════════════════════════════════════════════════════ */
function pagFipe(placa: string, data: any, agora: string, proto: string, qr: string): string {
  const p    = normalizaPlacaV3(data.placa)
  const fipe = data.fipe  ?? {}
  const cd   = data.chassi ?? {}
  const mm   = v(p.marcaModelo ?? p.marca, 'VEÍCULO')

  const fipeAtual     = fipe.preco ?? fipe.valorFipe ?? null
  const historico24: any[] = Array.isArray(fipe.historico) ? fipe.historico : []
  const historicoAnual: any[] = Array.isArray(fipe.historicoAnual) ? fipe.historicoAnual : []
  const codigoFipe    = v(cd.codigoFipe ?? fipe.codigoFipe ?? fipe.codigo, '')
  const descricao     = v(fipe.descricao ?? fipe.modelo ?? mm)

  if (!fipeAtual && historico24.length === 0 && historicoAnual.length === 0) return ''

  const metade = Math.ceil(historico24.length / 2)
  const col1   = historico24.slice(0, metade)
  const col2   = historico24.slice(metade)

  return `
<div class="pg">
  ${header(agora, proto, 'Extra', qr)}
  ${banner(mm, placa)}

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
    <tr>
      <td valign="top">
        <p style="font-size:9.5px;color:#333;margin-bottom:6px">${descricao}${codigoFipe ? ` (${codigoFipe})` : ''}</p>
        ${fipeAtual ? `
        <table cellpadding="2" cellspacing="0" style="font-size:9.5px;margin-bottom:8px">
          <tr>
            <td style="font-weight:700;padding-right:8px">Atual</td>
            <td style="color:#d97706;font-weight:700;font-size:11px">R$ ${moeda(fipeAtual)}</td>
          </tr>
        </table>` : ''}
        ${historicoAnual.map((h: any) => `
        <table cellpadding="2" cellspacing="0" style="font-size:9px;margin-bottom:1px">
          <tr>
            <td style="font-weight:700;padding-right:8px;width:40px">${v(h.ano)}</td>
            <td>R$ ${moeda(h.valor ?? h.preco)} - ${v(h.variacao ?? h.variPercent, '')}</td>
          </tr>
        </table>`).join('')}
      </td>
      <td width="100" align="right" valign="top">
        <span style="font-size:11px;font-weight:700;background:#f0f0f0;border:1px solid #ccc;
          padding:3px 10px">TABELA FIPE</span>
      </td>
    </tr>
  </table>

  ${historico24.length > 0 ? `
  <p style="font-size:10px;font-weight:700;margin:10px 0 6px">Histórico Últimos 24 meses:</p>
  <table width="100%" cellpadding="3" cellspacing="0"
         style="border-collapse:collapse;font-size:9px">
    <tr>
      <th style="background:#f0f0f0;border:1px solid #ddd;padding:3px 5px;width:11%">Mês</th>
      <th style="background:#f0f0f0;border:1px solid #ddd;padding:3px 5px;width:15%">Valor</th>
      <th style="background:#f0f0f0;border:1px solid #ddd;padding:3px 5px;width:11%">% Mês Ant.</th>
      <th style="background:#f0f0f0;border:1px solid #ddd;padding:3px 5px;width:11%">% Acum.</th>
      <td style="border:none;width:2%"></td>
      <th style="background:#f0f0f0;border:1px solid #ddd;padding:3px 5px;width:11%">Mês</th>
      <th style="background:#f0f0f0;border:1px solid #ddd;padding:3px 5px;width:15%">Valor</th>
      <th style="background:#f0f0f0;border:1px solid #ddd;padding:3px 5px;width:11%">% Mês Ant.</th>
      <th style="background:#f0f0f0;border:1px solid #ddd;padding:3px 5px;width:11%">% Acum.</th>
    </tr>
    ${col1.map((h: any, i: number) => {
      const h2 = col2[i]
      return `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f7f7f7'}">
      <td style="border:1px solid #ddd;padding:3px 5px">${v(h.mes ?? h.mesReferencia, '---')}</td>
      <td style="border:1px solid #ddd;padding:3px 5px">R$ ${moeda(h.valor ?? h.preco)}</td>
      <td style="border:1px solid #ddd;padding:3px 5px">${v(h.varMes ?? h.variacao, '---')}</td>
      <td style="border:1px solid #ddd;padding:3px 5px">${v(h.varAcumulada ?? h.acumulada, '---')}</td>
      <td style="border:none"></td>
      ${h2 ? `
      <td style="border:1px solid #ddd;padding:3px 5px">${v(h2.mes ?? h2.mesReferencia, '---')}</td>
      <td style="border:1px solid #ddd;padding:3px 5px">R$ ${moeda(h2.valor ?? h2.preco)}</td>
      <td style="border:1px solid #ddd;padding:3px 5px">${v(h2.varMes ?? h2.variacao, '---')}</td>
      <td style="border:1px solid #ddd;padding:3px 5px">${v(h2.varAcumulada ?? h2.acumulada, '---')}</td>
      ` : '<td></td><td></td><td></td><td></td>'}
    </tr>`}).join('')}
  </table>` : ''}

  ${footer()}
</div>`
}

/* ════════════════════════════════════════════════════════════════════════════
   PÁGINA FICHA — ficha técnica
════════════════════════════════════════════════════════════════════════════ */
function pagFicha(placa: string, data: any, agora: string, proto: string, qr: string): string {
  const p  = normalizaPlacaV3(data.placa)
  const cd = data.chassi ?? {}
  const mm = v(p.marcaModelo ?? p.marca, 'VEÍCULO')

  const specs = [
    ['Modelo',                   v(cd.identificacaoCompleta ?? mm)],
    ['Pneus dianteiros',         v(cd.pneusDianteiros)],
    ['Pneus traseiros',          v(cd.pneusTranseiros ?? cd.pneusDianteiros)],
    ['Fabricante',               v(cd.fabricante)],
    ['Velocidade maxima',        v(cd.velocidadeMaxima)],
    ['Aceleracao 0-100 km/h',    v(cd.aceleracao)],
    ['Potencia',                 v(cd.potencia ?? p.potencia)],
    ['Torque',                   v(cd.torque)],
    ['Consumo urbano',           v(cd.consumoUrbano)],
    ['Consumo rodoviario',       v(cd.consumoRodoviario)],
    ['Tanque de combustivel',    v(cd.tanque)],
    ['Comprimento',              v(cd.comprimento)],
    ['Largura',                  v(cd.largura)],
    ['Altura',                   v(cd.altura)],
    ['Distancia entre-eixos',    v(cd.entreEixos)],
    ['Porta-malas',              v(cd.portaMalas)],
    ['Peso',                     v(cd.peso)],
    ['Cilindros',                v(cd.cilindros)],
    ['Cilindrada',               v(cd.cilindrada ?? p.cilindradas)],
    ['Cambio',                   v(cd.cambio ?? p.cambio ?? p.transmissao)],
    ['Tracao',                   v(cd.tracao)],
    ['Suspensao dianteira',      v(cd.suspensaoDianteira)],
    ['Suspensao traseira',       v(cd.suspensaoTraseira)],
    ['Freios dianteiros',        v(cd.freiosDianteiros)],
    ['Freios traseiros',         v(cd.freiosTraseiros)],
    ['Direcao',                  v(cd.direcao)],
    ['Lugares',                  v(cd.lugares ?? p.passageiros ?? p.lotacao)],
  ].filter(([, val]) => val !== 'Não Informado' && val !== '')

  if (specs.length < 4) return ''

  return `
<div class="pg">
  ${header(agora, proto, 'FICHA', qr)}
  ${banner(mm, placa)}

  <p style="text-align:center;font-size:11px;font-weight:700;margin:10px 0 6px">
    FICHA TÉCNICA MODELO APROXIMADO
  </p>

  <table width="100%" cellpadding="4" cellspacing="0"
         style="border-collapse:collapse;font-size:9.5px">
    ${specs.map(([label, val], i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f7f7f7'}">
      <td width="40%" style="font-weight:700;text-align:right;border:1px solid #ddd;
                              padding:4px 8px;color:#444">${label}</td>
      <td style="border:1px solid #ddd;padding:4px 8px">${val}</td>
    </tr>`).join('')}
  </table>

  ${footer()}
</div>`
}

/* ════════════════════════════════════════════════════════════════════════════
   PÁGINA 5 — considerações importantes
════════════════════════════════════════════════════════════════════════════ */
function pag5(placa: string, data: any, agora: string, proto: string, qr: string): string {
  const p  = normalizaPlacaV3(data.placa)
  const mm = v(p.marcaModelo ?? p.marca, 'VEÍCULO')
  const n  = TENANT.nome

  return `
<div class="pg">
  ${header(agora, proto, '5', qr)}
  ${banner(mm, placa)}

  <p style="text-align:center;font-size:12px;font-weight:700;margin:12px 0 10px">
    CONSIDERAÇÕES IMPORTANTES
  </p>

  <div style="font-size:9px;line-height:1.7;color:#222">
    <p style="margin-bottom:8px">Esta CONSULTA VEICULAR não tem caráter pericial e, portanto, não substitui a perícia oficial. As informações constantes nesta CONSULTA VEICULAR têm validade apenas para o exato momento de sua realização, limitando-se a verificar as INFORMAÇÕES PÚBLICAS e histórico veicular, com a indicação de algumas não conformidades.</p>
    <p style="margin-bottom:8px">A ${n} não se responsabiliza por informações publicadas posteriormente à emissão desta CONSULTA VEICULAR.</p>
    <p style="margin-bottom:8px">A responsabilidade da ${n} limita-se a prestar informações sobre veículos automotores registradas nas bases públicas e privadas detentoras das informações.</p>
    <p style="margin-bottom:8px">A ${n} não é responsável pelas informações inseridas na sua base de dados já que são oriundas de consulta às bases públicas e privadas sobre as quais não detém a propriedade das informações, limitando-se assim, a reproduzi-las fielmente. Da mesma forma, não se responsabiliza por informações incorretas, faltantes, ou divergentes de bases públicas e outras que não detenha as informações.</p>
    <p style="margin-bottom:8px">A decisão por parte do CONTRATANTE sobre a concretização do negócio é tomada com riscos exclusivamente pelo CONTRATANTE com base em sua expertise, diretrizes e procedimentos particulares, dos quais a ${n} não participa.</p>
    <p style="margin-bottom:8px">A ${n} não detém acesso e meios para a obtenção de informações advinda do SNG e RENAJUD, logo qualquer informação exclusiva destes órgãos não caracterizam erro na prestação de serviços. Existem situações como a intenção de gravame que não aparece para consulta pública.</p>
    <p style="margin-bottom:8px">Para as informações de Histórico de Leilão, o CONTRATANTE deve utilizar as informações de oferta em leilão com caráter informativo no seu processo de negociação. A informação de leilão não é uma afirmação que o veículo tenha sido efetivamente arrematado em leilão, podendo ser apenas designação sem contudo se efetivar em face da possibilidade de remição do devedor.</p>
    <p style="margin-bottom:8px">A CONSULTA VEICULAR não verifica itens de mecânica, elétrica, transmissão, suspensão e freios, nem nenhum outro item que não tenha sido discriminado como verificado na consulta.</p>
    <p>Existem diversas situações em que os órgãos municipais, estaduais e federais realizam lançamento de multas e débitos retroativamente sem nenhum aviso. Em muitos casos uma multa pode surgir anos depois da data da infração inclusive para proprietário diferente. Desta forma a ${n} não se responsabiliza por multas e demais débitos retroativos lançados pelo próprio órgão competente.</p>
  </div>

  ${footer()}
</div>`
}

/* ════════════════════════════════════════════════════════════════════════════
   NORMALIZAÇÃO — achata resposta aninhada v3 da Assertiva
════════════════════════════════════════════════════════════════════════════ */
function normalizaPlacaV3(raw: any): any {
  if (!raw) return {}
  const desc  = raw.resposta?.descricao     ?? {}
  const ident = raw.resposta?.identificadores ?? {}
  const mov   = raw.resposta?.movimentacao   ?? {}
  const restr = raw.resposta?.restricoes     ?? {}
  const ficha = raw.resposta?.fichaTecnica   ?? {}
  return {
    ...raw,
    // identificação
    marcaModelo:         desc.marcaModelo     ?? raw.marcaModelo,
    marca:               desc.marcaModelo     ?? raw.marca,
    anoFabricacao:       desc.anoFabricacao   ?? raw.anoFabricacao,
    anoModelo:           desc.anoModelo       ?? raw.anoModelo,
    cor:                 desc.cor             ?? raw.cor,
    combustivel:         desc.combustivel     ?? raw.combustivel,
    especie:             desc.especie         ?? raw.especie,
    procedencia:         desc.procedencia     ?? raw.procedencia,
    // identificadores
    chassi:              ident.chassi         ?? raw.chassi,
    renavam:             ident.renavam        ?? raw.renavam,
    motor:               ident.numeroMotor    ?? raw.motor ?? raw.numeroMotor,
    numeroMotor:         ident.numeroMotor    ?? raw.numeroMotor,
    numCarroceria:       ident.numeroCarroceria ?? raw.numCarroceria,
    // movimentação
    municipio:           mov.municipio        ?? raw.municipio,
    uf:                  mov.uf               ?? raw.uf,
    situacaoVeiculo:     mov.situacao         ?? raw.situacaoVeiculo,
    ultimaAtualizacao:   mov.ultimaAtualizacao ?? raw.ultimaAtualizacao,
    // restrições estaduais
    restricaoEstadual01: restr.restricaoEstadual01 ?? raw.restricaoEstadual01,
    restricaoEstadual02: restr.restricaoEstadual02 ?? raw.restricaoEstadual02,
    restricaoEstadual03: restr.restricaoEstadual03 ?? raw.restricaoEstadual03,
    restricaoEstadual04: restr.restricaoEstadual04 ?? raw.restricaoEstadual04,
    situacaoChassi:      restr.situacaoChassi ?? raw.situacaoChassi,
    // ficha técnica
    tipo:                ficha.tipo           ?? desc.tipoVeiculo ?? raw.tipo,
    potencia:            ficha.potencia       ?? raw.potencia,
    cilindradas:         ficha.cilindradas    ?? raw.cilindradas,
    passageiros:         ficha.passageiros    ?? ficha.lotacao    ?? raw.passageiros,
    categoria:           ficha.categoria      ?? raw.categoria,
    carroceria:          ficha.carroceria     ?? raw.carroceria,
    eixos:               ficha.eixos          ?? raw.eixos,
    pbt:                 ficha.pbt            ?? raw.pbt,
    cmt:                 ficha.cmt            ?? raw.cmt,
    capacCarga:          ficha.capacidadeCarga ?? raw.capacCarga,
  }
}

function normalizaGravameV3(raw: any): any[] {
  if (!raw) return []
  const resp = raw.resposta ?? raw
  // API v3 retorna resp.gravame como objeto único, não array
  if (Array.isArray(resp.gravames ?? resp.listaGravames ?? resp.historicoGravames)) {
    return resp.gravames ?? resp.listaGravames ?? resp.historicoGravames
  }
  const obj = resp.gravame
  if (obj && typeof obj === 'object' && Object.keys(obj).length > 0) return [obj]
  return []
}

function normalizaLeilaoV3(raw: any): { todos: any[] } {
  if (!raw) return { todos: [] }
  const resp = raw.resposta ?? raw
  const brutos: any[] = Array.isArray(resp?.historicoLeilao) && resp.historicoLeilao.length > 0
    ? resp.historicoLeilao
    : [
        ...(Array.isArray(resp?.baseA)       ? resp.baseA.map((l: any) => ({ ...l, _base: 'BASE A — JUDICIAL' }))      : []),
        ...(Array.isArray(resp?.baseB)       ? resp.baseB.map((l: any) => ({ ...l, _base: 'BASE B — FINANCEIRO' }))    : []),
        ...(Array.isArray(resp?.remarketing) ? resp.remarketing.map((l: any) => ({ ...l, _base: 'REMARKETING' }))      : []),
        ...(Array.isArray(resp?.lotes)       ? resp.lotes.map((l: any) => ({ ...l, _base: 'JUDICIAL — LOTES' }))      : []),
        ...(Array.isArray(resp?.leiloes)     ? resp.leiloes     : []),
      ]
  // Filtra registros "NADA CONSTA" (mesma lógica do relatório web)
  const todos = brutos.filter((l: any) => {
    const sit = (l.resultado ?? l.situacao ?? l.status ?? '').toString().toUpperCase()
    if (sit.includes('NADA CONSTA') || sit.includes('SEM REGISTRO') || sit.includes('NAO CONSTA')) return false
    return !!(l.data ?? l.dataLeilao ?? l.dataCadastro ?? l.comitente ?? l.leiloeiro ?? l.leilaoeiro ?? l.orgao ?? l.comarca ?? l.descricao)
  })
  return { todos }
}

function normalizaBinFederalV3(raw: any): { renajud: any[]; rouboFurto: any[]; restricoes: string[]; situacao: string } {
  if (!raw) return { renajud: [], rouboFurto: [], restricoes: [], situacao: 'NAO_CONSULTADO' }
  const resp = raw.resposta ?? raw

  // API v3: resp.restricoes é array de strings ["ALIENACAO FIDUCIARIA","RENAINF","RENAJUD"]
  const restricoesArr: string[] = Array.isArray(resp?.restricoes) ? resp.restricoes : []

  // Tenta sub-estruturas detalhadas; fallback para strings do array
  const renajudDetalhado = resp?.renajud?.restricoes ?? resp?.restricoesRenajud
                        ?? (Array.isArray(resp?.renajud) ? resp.renajud : null)
  const rouboDetalhado   = resp?.rouboFurto?.ocorrencias ?? resp?.ocorrenciasRouboFurto
                        ?? (Array.isArray(resp?.rouboFurto) ? resp.rouboFurto : null)

  const renajud   = renajudDetalhado   ?? restricoesArr.filter(r => r.toUpperCase().includes('RENAJUD')).map(r => ({ descricao: r }))
  const rouboFurto = rouboDetalhado    ?? restricoesArr.filter(r => r.toUpperCase().includes('ROUBO') || r.toUpperCase().includes('FURTO')).map(r => ({ descricao: r }))

  const situacao = raw?.cabecalho?.resultado ?? resp?.situacao ?? resp?.resultado ?? 'SEM INFORMACAO'
  return {
    renajud:    Array.isArray(renajud)    ? renajud    : [],
    rouboFurto: Array.isArray(rouboFurto) ? rouboFurto : [],
    restricoes: restricoesArr,
    situacao:   String(situacao).toUpperCase(),
  }
}

function normalizaSinistroV3(raw: any): { temSinistro: boolean; recuperado: boolean; descricao: string } {
  if (!raw) return { temSinistro: false, recuperado: false, descricao: 'NAO_CONSULTADO' }
  const resp = raw.resposta ?? raw
  const sinistroRaw = (
    raw?.cabecalho?.resultado ?? resp?.situacao ?? resp?.resultado ?? resp?.indicioSinistro ?? ''
  ).toString().toUpperCase()
  const recuperado   = sinistroRaw.includes('RECUPER')
  const temSinistro  = !recuperado && (
    resp?.indicioSinistro === true ||
    (sinistroRaw.includes('CONSTA') && !sinistroRaw.includes('NADA CONSTA') && !sinistroRaw.includes('NAO EXISTEM') && !sinistroRaw.includes('NÃO EXISTEM') && !sinistroRaw.includes('SEM INDICIO') && !sinistroRaw.includes('FALSE'))
  )
  const descricao = recuperado
    ? 'SINISTRO RECUPERADO — VEÍCULO COM HISTÓRICO DE SINISTRO REPARADO'
    : temSinistro
      ? 'CONSTA INDÍCIO DE SINISTRO'
      : 'NÃO EXISTEM INDÍCIOS DE SINISTRO'
  return { temSinistro, recuperado, descricao }
}

// Lê débitos do binEstadual.debitosPendentes (fonte correta na v3)
function debitosBinEst(data: any) {
  const d = data.binEstadual?.resposta?.debitosPendentes ?? {}
  return {
    ipva:          d.ipva          ?? '0,00',
    licenciamento: d.licenciamento ?? '0,00',
    multasTotal:   d.multas?.total ?? (typeof d.multas === 'string' ? d.multas : '0,00'),
    dpvat:         d.dpvat         ?? 'NAODISPONIVEL',
  }
}

// Restrições outrasUFs do binEstadual
function restricoesBinEst(data: any): string[] {
  const r = data.binEstadual?.resposta?.restricoes?.outrasUFs
  return Array.isArray(r) ? r : []
}

/* ════════════════════════════════════════════════════════════════════════════
   BUILD HTML COMPLETO
════════════════════════════════════════════════════════════════════════════ */
async function buildHtml(placa: string, data: any): Promise<string> {
  const agora = new Date().toLocaleString('pt-BR')
  const proto = protocolo()
  const qrUrl = `https://fichaauto.com.br/dashboard/relatorio/${placa}`
  const qr    = await QRCode.toDataURL(qrUrl, { width: 52, margin: 0 }).catch(() => '')

  const pg1    = pag1(placa, data, agora, proto, qr)
  const pg2    = pag2(placa, data, agora, proto, qr)
  const pg3    = pag3(placa, data, agora, proto, qr)
  const pg4    = pag4(placa, data, agora, proto, qr)
  const pgFipe = pagFipe(placa, data, agora, proto, qr)
  const pgFich = pagFicha(placa, data, agora, proto, qr)
  const pg5    = pag5(placa, data, agora, proto, qr)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#1a1a1a; background:#fff; }
.pg { width:210mm; min-height:297mm; padding:10mm 12mm 8mm; page-break-after:always; overflow:hidden; }
.pg:last-child { page-break-after:auto; }
table { page-break-inside:avoid; }
tr { page-break-inside:avoid; }
p { margin:0; }
</style>
</head>
<body>
${pg1}
${pg2}
${pg3}
${pg4}
${pgFipe}
${pgFich}
${pg5}
</body>
</html>`
}

/* ════════════════════════════════════════════════════════════════════════════
   ROUTE HANDLER
════════════════════════════════════════════════════════════════════════════ */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ placa: string }> }
) {
  const { placa: placaParam } = await context.params
  const placa = placaParam.toUpperCase().replace(/[^A-Z0-9]/g, '')

  if (!placa || placa.length < 7) {
    return NextResponse.json({ error: 'Placa inválida' }, { status: 400 })
  }

  try {
    // Tenta ler do banco (consulta já paga) — evita nova chamada à Assertiva
    let data: any = null
    try {
      const email = await getAuthEmail()
      if (email) {
        const svc = createServiceRoleClient() as any
        const { data: row } = await svc
          .from('consultas')
          .select('resultado')
          .eq('email', email)
          .eq('tipo', 'veiculo')
          .eq('documento', placa)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (row?.resultado) {
          data = typeof row.resultado === 'string' ? JSON.parse(row.resultado) : row.resultado
        }
      }
    } catch { /* segue para fallback */ }

    // Fallback: refaz consulta apenas se não houver dado salvo
    if (!data) data = await consultarVeiculo(placa)

    const html = await buildHtml(placa, data)

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
    } catch { /* fallback para HTML */ }

    if (pdfBuffer) {
      return new NextResponse(pdfBuffer as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ficha-${placa}.pdf"`,
        },
      })
    }
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
