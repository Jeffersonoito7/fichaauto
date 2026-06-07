import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import {
  consultarCpfBasico, consultarScoreCpf, consultarProcessosCpf,
  consultarProtestosCpf, consultarEnderecosCpf, consultarTelefonesCpf,
  consultarRendaCpf, consultarPepCpf, consultarSocietarioCpf,
  consultarRelacionamentosCpf, consultarHistoricoVeiculosPorCpf,
} from '@/lib/providers/assertiva'

const TENANT = { nome: 'Ficha Auto', cor: '#00703C', site: 'fichaauto.com.br' }

function v(x: any, fb = 'Não Informado'): string {
  if (x === null || x === undefined || x === '') return fb
  return String(x)
}
function protocolo() { return String(Date.now()).slice(-9) }

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

function header(agora: string, proto: string, pag: string, qrDataUrl: string): string {
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
        <div style="font-size:15px;font-weight:700;color:#111">Consulta CPF</div>
        <div style="font-size:8.5px;color:#555">Informações Exclusivas</div>
        <div style="font-size:8.5px;color:#555">
          Data Hora da Consulta:&nbsp;<strong>${agora}</strong>&nbsp;(${proto})&nbsp;Pág.&nbsp;${pag}
        </div>
      </td>
      <td width="60" align="right" valign="middle">
        <img src="${qrDataUrl}" width="52" height="52" style="display:block" />
      </td>
    </tr>
  </table>`
}

function banner(nome: string, cpf: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0">
    <tr>
      <td align="center" valign="middle" style="background:${TENANT.cor};padding:14px 8px">
        <div style="font-size:22px;font-weight:900;color:white;letter-spacing:0.5px;text-transform:uppercase;line-height:1.2">
          ${nome.toUpperCase()}
        </div>
        <div style="font-size:18px;font-weight:900;color:white;font-family:monospace;letter-spacing:3px;margin-top:2px">
          CPF: ${cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
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
        Privadas sobre as quais não detém a propriedade das informações, limitando-se assim, a reproduzi-las fielmente.
        As informações têm validade apenas para o momento da consulta. Consulte sempre os órgãos competentes para confirmação.
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
        <div style="font-size:8px;color:#555;margin-bottom:3px">Score de Crédito</div>
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

/* ─── PÁGINA 1 — identificação + ícones de status ─── */
function pag1(cpf: string, data: any, agora: string, proto: string, qr: string): string {
  const b  = data.basico    ?? {}
  const sc = data.score     ?? {}
  const pr = data.processos ?? {}
  const pt = data.protestos ?? {}
  const pp = data.pep       ?? {}

  const nome       = v(b.nome ?? b.nomeCompleto, 'NOME NÃO INFORMADO')
  const scoreVal   = Number(sc.score ?? sc.pontuacao ?? 0)
  const temProc    = (pr.total ?? pr.quantidade ?? 0) > 0
  const temProt    = (pt.total ?? pt.quantidade ?? 0) > 0
  const isPep      = !!(pp.pep ?? pp.isPep ?? pp.politicamenteExposta)
  const sitCpf     = v(b.situacaoCpf ?? b.situacao, 'REGULAR').toUpperCase()
  const cpfOk      = sitCpf.includes('REGULAR') || sitCpf.includes('ATIVO')

  const stScore:  Status = scoreVal >= 700 ? 'ok' : scoreVal >= 400 ? 'warn' : 'error'
  const stProc:   Status = temProc  ? 'error' : 'ok'
  const stProt:   Status = temProt  ? 'error' : 'ok'
  const stPep:    Status = isPep    ? 'error' : 'ok'
  const stCpf:    Status = cpfOk    ? 'ok'    : 'error'
  const stRenda:  Status = 'ok'

  return `
<div class="pg">
  ${header(agora, proto, '1', qr)}
  ${banner(nome, cpf)}

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
    <tr>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stCpf,   'SITUAÇÃO CPF')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stScore, 'SCORE CRÉDITO')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stProc,  'PROCESSOS JUDICIAIS')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stProt,  'PROTESTOS')}</td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
    <tr>
      <td width="37.5%" style="border:none;padding:0"></td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stPep,   'PEP')}</td>
      <td width="25%" align="center" valign="top" style="padding:6px 2px;border:none">${iconeInner(stRenda, 'RENDA PRESUMIDA')}</td>
      <td width="12.5%" style="border:none;padding:0"></td>
    </tr>
  </table>

  ${secTitle('Identificação')}
  ${tabela2col([
    ['Nome',          nome,                              'CPF',           cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')],
    ['Data Nasc.',    v(b.dataNascimento),               'Idade',         v(b.idade, '')],
    ['Situação CPF',  sitCpf,                            'Sexo',          v(b.sexo)],
    ['Mãe',          v(b.nomeMae ?? b.mae),              'Pai',           v(b.nomePai ?? b.pai, '')],
    ['Município',    `${v(b.municipio, '-')}/${v(b.uf, '-')}`, 'Nacionalidade', v(b.nacionalidade, 'Brasileiro(a)')],
  ])}

  ${secTitle('Score de Crédito')}
  ${scoreBar(scoreVal)}

  ${secTitle('Contato')}
  ${tabela2col([
    ['E-mail',    v(b.email ?? (Array.isArray(b.emails) ? b.emails[0]?.email : '')),
     'Telefone',  v(b.telefone ?? (Array.isArray(b.telefones) ? b.telefones[0]?.numero : ''))],
    ['Endereço',  v(b.logradouro ?? b.enderecoCompleto ?? '', ''),
     'CEP',       v(b.cep, '')],
    ['Cidade',    `${v(b.municipio, '-')}/${v(b.uf, '-')}`,
     'Bairro',    v(b.bairro, '')],
  ])}

  ${footer()}
</div>`
}

/* ─── PÁGINA 2 — negativações + processos + protestos ─── */
function pag2(cpf: string, data: any, agora: string, proto: string, qr: string): string {
  const b   = data.basico    ?? {}
  const sc  = data.score     ?? {}
  const pr  = data.processos ?? {}
  const pt  = data.protestos ?? {}
  const nome = v(b.nome ?? b.nomeCompleto, 'NOME NÃO INFORMADO')

  const negativacoes: any[] = Array.isArray(sc.negativacoes) ? sc.negativacoes : []
  const totalNegat  = Number(sc.totalDebitos ?? negativacoes.length)
  const valorNegat  = Number(sc.valorTotalDebitos ?? 0)
  const processos: any[] = Array.isArray(pr.processos ?? pr.lista) ? (pr.processos ?? pr.lista) : []
  const protestos: any[] = Array.isArray(pt.lista ?? pt.protestos) ? (pt.lista ?? pt.protestos) : []
  const totalProc  = pr.total ?? pr.quantidade ?? processos.length
  const totalProt  = pt.total ?? pt.quantidade ?? protestos.length
  const valorProt  = pt.valorTotal ?? pt.valor ?? 0

  return `
<div class="pg">
  ${header(agora, proto, '2', qr)}
  ${banner(nome, cpf)}

  ${secTitle('Negativações / Restrições de Crédito (SPC/Serasa)')}
  <p style="font-size:10px;font-weight:700;color:${totalNegat > 0 ? '#dc2626' : '#16a34a'};margin-bottom:4px">
    ${totalNegat > 0
      ? `CONSTA — ${totalNegat} registro(s) | Valor total: R$ ${valorNegat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'NADA CONSTA'}
  </p>
  ${tabelaGen(
    ['Credor', 'Tipo', 'Valor', 'Vencimento', 'Inclusão', 'Cidade/UF'],
    negativacoes.slice(0, 20).map((n: any) => [
      v(n.credor ?? n.nomeCredor ?? n.cedente, '---'),
      v(n.tipoDebito ?? n.tipo ?? n.natureza, '---'),
      n.valor ? `R$ ${Number(n.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---',
      v(n.dataVencimento ?? n.data, '---'),
      v(n.dataInclusao ?? n.dataRegistro, '---'),
      `${v(n.cidade ?? n.municipio, '---')}/${v(n.uf ?? n.estado, '---')}`,
    ])
  )}

  ${secTitle('Processos Judiciais')}
  <p style="font-size:10px;font-weight:700;color:${totalProc > 0 ? '#dc2626' : '#16a34a'};margin-bottom:4px">
    ${totalProc > 0 ? `CONSTA — ${totalProc} processo(s) encontrado(s)` : 'NADA CONSTA'}
  </p>
  ${tabelaGen(
    ['Número', 'Tipo', 'Vara / Tribunal', 'Data', 'Valor'],
    processos.slice(0, 15).map((p: any) => [
      v(p.numero ?? p.numeroProcesso, '---'),
      v(p.tipo ?? p.natureza ?? p.classe, '---'),
      v(p.vara ?? p.tribunal ?? p.orgaoJulgador, '---'),
      v(p.data ?? p.dataDistribuicao ?? p.dataAjuizamento, '---'),
      v(p.valor ?? p.valorCausa ? `R$ ${p.valor ?? p.valorCausa}` : '', '---'),
    ])
  )}

  ${secTitle('Protestos em Cartório')}
  <p style="font-size:10px;font-weight:700;color:${totalProt > 0 ? '#dc2626' : '#16a34a'};margin-bottom:4px">
    ${totalProt > 0 ? `CONSTA — ${totalProt} protesto(s)${valorProt > 0 ? ` | Valor total: R$ ${Number(valorProt).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}` : 'NADA CONSTA'}
  </p>
  ${tabelaGen(
    ['Data', 'Cartório', 'Cidade/UF', 'Valor', 'Credor'],
    protestos.slice(0, 10).map((p: any) => [
      v(p.data ?? p.dataProtesto, '---'),
      v(p.cartorio ?? p.nomeCartorio ?? p.orgao, '---'),
      `${v(p.municipio ?? p.cidade, '---')}/${v(p.uf, '---')}`,
      p.valor ? `R$ ${Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---',
      v(p.credor ?? p.nomeCredor ?? p.apresentante, '---'),
    ])
  )}

  ${footer()}
</div>`
}

/* ─── PÁGINA 3 — endereços + telefones + renda ─── */
function pag3(cpf: string, data: any, agora: string, proto: string, qr: string): string {
  const b    = data.basico    ?? {}
  const end  = data.enderecos ?? {}
  const tel  = data.telefones ?? {}
  const ren  = data.renda     ?? {}
  const nome = v(b.nome ?? b.nomeCompleto, 'NOME NÃO INFORMADO')

  const enderecos: any[] = Array.isArray(end.enderecos ?? end.lista) ? (end.enderecos ?? end.lista) : []
  const telefones: any[] = Array.isArray(tel.telefones ?? tel.lista) ? (tel.telefones ?? tel.lista) : []
  const rendaVal = v(ren.rendaPresumida ?? ren.renda ?? ren.faixaRenda, 'Não Informado')

  return `
<div class="pg">
  ${header(agora, proto, '3', qr)}
  ${banner(nome, cpf)}

  ${secTitle('Histórico de Endereços')}
  ${tabelaGen(
    ['Logradouro', 'Número', 'Bairro', 'Cidade/UF', 'CEP', 'Tipo'],
    enderecos.slice(0, 15).map((e: any) => [
      v(e.logradouro, '---'),
      v(e.numero, '---'),
      v(e.bairro, '---'),
      `${v(e.municipio ?? e.cidade, '---')}/${v(e.uf, '---')}`,
      v(e.cep, '---'),
      v(e.tipo ?? e.tipoLogradouro, '---'),
    ])
  )}

  ${secTitle('Telefones Vinculados')}
  ${tabelaGen(
    ['Número', 'Tipo', 'Operadora', 'Situação'],
    telefones.slice(0, 20).map((t: any) => [
      v(t.numero ?? t.telefone, '---'),
      v(t.tipo, '---'),
      v(t.operadora, '---'),
      v(t.situacao ?? t.status, '---'),
    ])
  )}

  ${secTitle('Renda Presumida')}
  <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:9.5px;margin-bottom:6px">
    <tr style="background:#fff">
      <td width="25%" style="font-weight:700;border:1px solid #ddd;padding:5px 6px">Renda Presumida</td>
      <td style="border:1px solid #ddd;padding:5px 6px;color:#d97706;font-weight:700;font-size:12px">${rendaVal}</td>
      <td width="25%" style="font-weight:700;border:1px solid #ddd;padding:5px 6px">Faixa</td>
      <td style="border:1px solid #ddd;padding:5px 6px">${v(ren.faixa ?? ren.classificacao, '---')}</td>
    </tr>
  </table>
  <p style="font-size:8px;color:#555;margin-bottom:8px">
    * Renda presumida calculada com base em dados públicos e comportamentais. Não substitui comprovação de renda oficial.
  </p>

  ${footer()}
</div>`
}

/* ─── PÁGINA 4 — PEP + societário + relacionamentos ─── */
function pag4(cpf: string, data: any, agora: string, proto: string, qr: string): string {
  const b    = data.basico         ?? {}
  const pp   = data.pep            ?? {}
  const soc  = data.societario     ?? {}
  const rel  = data.relacionamentos ?? {}
  const nome = v(b.nome ?? b.nomeCompleto, 'NOME NÃO INFORMADO')

  const isPep       = !!(pp.pep ?? pp.isPep ?? pp.politicamenteExposta)
  const empresas: any[]  = Array.isArray(soc.empresas ?? soc.lista) ? (soc.empresas ?? soc.lista) : []
  const pessoasRaw = rel.resposta?.pessoasDeReferencia ?? rel.resposta?.relacionamentos ?? rel.lista ?? rel.relacionamentos ?? []
  const pessoas: any[] = Array.isArray(pessoasRaw) ? pessoasRaw : []

  return `
<div class="pg">
  ${header(agora, proto, '4', qr)}
  ${banner(nome, cpf)}

  ${secTitle('PEP — Pessoa Politicamente Exposta')}
  <p style="font-size:10px;font-weight:700;color:${isPep ? '#dc2626' : '#16a34a'};margin-bottom:4px">
    ${isPep ? 'CONSTA — Pessoa Politicamente Exposta identificada' : 'NADA CONSTA — Não identificado como PEP'}
  </p>
  ${isPep ? tabela2col([
    ['Nome', v(pp.nome), 'Cargo', v(pp.cargo ?? pp.funcao)],
    ['Órgão', v(pp.orgao ?? pp.entidade), 'Período', v(pp.periodo ?? pp.dataInicio)],
  ]) : ''}
  <p style="font-size:8px;color:#555;margin-bottom:8px">
    PEP: agente público que exerce ou exerceu cargo, emprego ou função pública relevante, incluindo familiares e colaboradores próximos.
  </p>

  ${secTitle('Participação Societária')}
  <p style="font-size:10px;font-weight:700;color:${empresas.length > 0 ? '#d97706' : '#16a34a'};margin-bottom:4px">
    ${empresas.length > 0 ? `${empresas.length} empresa(s) vinculada(s)` : 'Nenhuma empresa vinculada'}
  </p>
  ${tabelaGen(
    ['CNPJ', 'Razão Social', 'Participação', 'Situação', 'Data Entrada'],
    empresas.slice(0, 15).map((e: any) => [
      v(e.cnpj, '---'),
      v(e.razaoSocial ?? e.nome, '---'),
      v(e.participacao ?? e.qualificacao, '---'),
      v(e.situacao ?? e.status, '---'),
      v(e.dataEntrada ?? e.dataInicio, '---'),
    ])
  )}

  ${secTitle('Relacionamentos e Vínculos')}
  ${tabelaGen(
    ['Nome', 'CPF', 'Grau de Parentesco / Vínculo'],
    pessoas.slice(0, 15).map((p: any) => [
      v(p.nome, '---'),
      v(p.cpf, '---'),
      v(p.grau ?? p.vinculo ?? p.relacionamento, '---'),
    ])
  )}

  ${footer()}
</div>`
}

/* ─── PÁGINA 5 — histórico de veículos por CPF ─── */
function pag5Veiculos(cpf: string, data: any, agora: string, proto: string, qr: string): string {
  const b    = data.basico    ?? {}
  const vei  = data.veiculos  ?? {}
  const nome = v(b.nome ?? b.nomeCompleto, 'NOME NÃO INFORMADO')

  const veiculos: any[] = Array.isArray(vei.veiculos ?? vei.lista) ? (vei.veiculos ?? vei.lista) : []
  if (veiculos.length === 0) return ''

  return `
<div class="pg">
  ${header(agora, proto, '5', qr)}
  ${banner(nome, cpf)}

  ${secTitle('Histórico de Veículos Vinculados ao CPF')}
  <p style="font-size:10px;font-weight:700;color:${veiculos.length > 0 ? '#d97706' : '#16a34a'};margin-bottom:4px">
    ${veiculos.length} veículo(s) identificado(s) vinculados a este CPF
  </p>
  ${tabelaGen(
    ['Placa', 'Marca/Modelo', 'Ano', 'Cor', 'Chassi', 'Data Vínculo'],
    veiculos.slice(0, 30).map((ve: any) => [
      v(ve.placa, '---'),
      v(ve.marcaModelo ?? ve.modelo ?? ve.marca, '---'),
      v(ve.anoFabricacao ?? ve.ano, '---'),
      v(ve.cor, '---'),
      v(ve.chassi, '---'),
      v(ve.dataVinculo ?? ve.data ?? ve.dataUltimaTransferencia, '---'),
    ])
  )}
  ${veiculos.length > 30 ? `<p style="font-size:8px;color:#555;margin-top:4px">* Exibindo 30 de ${veiculos.length} veículos</p>` : ''}
  <p style="font-size:8px;color:#555;margin-top:8px">
    * Inclui veículos com propriedade atual e histórica vinculados ao CPF consultado.
    A presença de múltiplos veículos pode indicar atividade de compra e venda.
  </p>

  ${footer()}
</div>`
}

/* ─── PÁGINA 6 — considerações ─── */
function pag5(nome: string, cpf: string, agora: string, proto: string, qr: string): string {
  const n = TENANT.nome
  return `
<div class="pg">
  ${header(agora, proto, '5', qr)}
  ${banner(nome, cpf)}

  <p style="text-align:center;font-size:12px;font-weight:700;margin:12px 0 10px">CONSIDERAÇÕES IMPORTANTES</p>

  <div style="font-size:9px;line-height:1.7;color:#222">
    <p style="margin-bottom:8px">Esta CONSULTA CPF não tem caráter pericial e não substitui análise de crédito ou perícia oficial. As informações têm validade apenas para o exato momento de sua realização.</p>
    <p style="margin-bottom:8px">A ${n} não se responsabiliza por informações publicadas após a emissão desta consulta.</p>
    <p style="margin-bottom:8px">As informações são oriundas de bases públicas e privadas. A ${n} reproduz fielmente os dados recebidos, sem deter propriedade sobre eles.</p>
    <p style="margin-bottom:8px">A decisão sobre concessão de crédito, aprovação de cadastro ou qualquer negócio é de responsabilidade exclusiva do CONTRATANTE, com base em seus próprios critérios e expertise.</p>
    <p style="margin-bottom:8px">Informações de score, renda presumida e relacionamentos são estimativas baseadas em modelos estatísticos e dados comportamentais, podendo divergir da realidade atual do consultado.</p>
    <p style="margin-bottom:8px">A identificação de PEP (Pessoa Politicamente Exposta) não implica ilicitude — representa apenas risco elevado que exige due diligence reforçada conforme regulamentação do BACEN e COAF.</p>
    <p>Processos e protestos podem conter informações retroativas. A ausência de registros não garante a inexistência de pendências não cadastradas nos sistemas consultados.</p>
  </div>

  ${footer()}
</div>`
}

async function buildHtml(cpf: string, data: any): Promise<string> {
  const agora = new Date().toLocaleString('pt-BR')
  const proto = protocolo()
  const b     = data.basico ?? {}
  const nome  = v(b.nome ?? b.nomeCompleto, 'NOME NÃO INFORMADO')
  const qrUrl = `https://fichaauto.com.br/dashboard/relatorio/cpf/${cpf}`
  const qr    = await QRCode.toDataURL(qrUrl, { width: 52, margin: 0 }).catch(() => '')

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
${pag1(cpf, data, agora, proto, qr)}
${pag2(cpf, data, agora, proto, qr)}
${pag3(cpf, data, agora, proto, qr)}
${pag4(cpf, data, agora, proto, qr)}
${pag5Veiculos(cpf, data, agora, proto, qr)}
${pag5(nome, cpf, agora, proto, qr)}
</body>
</html>`
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ documento: string }> }
) {
  const { documento } = await context.params
  const cpf = documento.replace(/\D/g, '')

  if (cpf.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  const erros: string[] = []
  const safe = async (fn: () => Promise<any>, nome: string) => {
    try { return await fn() }
    catch (e: any) { erros.push(`${nome}: ${e.message}`); return null }
  }

  const [basico, score, processos, protestos, enderecos, telefones, renda, pep, societario, relacionamentos, veiculos] =
    await Promise.all([
      safe(() => consultarCpfBasico(cpf),                 'basico'),
      safe(() => consultarScoreCpf(cpf),                  'score'),
      safe(() => consultarProcessosCpf(cpf),              'processos'),
      safe(() => consultarProtestosCpf(cpf),              'protestos'),
      safe(() => consultarEnderecosCpf(cpf),              'enderecos'),
      safe(() => consultarTelefonesCpf(cpf),              'telefones'),
      safe(() => consultarRendaCpf(cpf),                  'renda'),
      safe(() => consultarPepCpf(cpf),                    'pep'),
      safe(() => consultarSocietarioCpf(cpf),             'societario'),
      safe(() => consultarRelacionamentosCpf(cpf),        'relacionamentos'),
      safe(() => consultarHistoricoVeiculosPorCpf(cpf),   'veiculos'),
    ])

  const data = { cpf, basico, score, processos, protestos, enderecos, telefones, renda, pep, societario, relacionamentos, veiculos, erros }
  const html = await buildHtml(cpf, data)

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
        'Content-Disposition': `attachment; filename="cpf-${cpf}.pdf"`,
      },
    })
  }
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
