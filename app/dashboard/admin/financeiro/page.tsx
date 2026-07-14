'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, Plus, X, Save, Loader2, CheckCircle,
  Clock, AlertCircle, XCircle, FileText, Settings,
  Eye, Copy, ExternalLink, Ban
} from 'lucide-react'

interface Tenant { id: string; nome: string; nome_fantasia: string | null; email_contato: string | null }
interface Cobranca {
  id: string; tenant_id: string; descricao: string; valor: number
  vencimento: string; status: string; criado_em: string; pago_em: string | null
  boleto_link: string | null; boleto_linha_dig: string | null; boleto_pdf_url: string | null
  nfse_numero: string | null; nfse_pdf_url: string | null; obs: string | null
  tenants: { nome: string; nome_fantasia: string | null; email_contato: string | null } | null
}
type Aba = 'cobrancas' | 'config'

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(s: string) { return new Date(s).toLocaleDateString('pt-BR') }

const STATUS_INFO: Record<string, { label: string; cor: string; icon: any }> = {
  pendente:  { label: 'Pendente',   cor: 'text-amber-600 bg-amber-50',  icon: Clock       },
  pago:      { label: 'Pago',       cor: 'text-green-600 bg-green-50',  icon: CheckCircle },
  vencido:   { label: 'Vencido',    cor: 'text-red-600 bg-red-50',      icon: AlertCircle },
  cancelado: { label: 'Cancelado',  cor: 'text-gray-500 bg-gray-100',   icon: XCircle     },
}

const CONFIG_CAMPOS = [
  { secao: 'Efí Bank (boleto e PIX)', campos: [
    { chave: 'efi_client_id',     label: 'Client ID',      tipo: 'text',     placeholder: 'Client_Id_...' },
    { chave: 'efi_client_secret', label: 'Client Secret',  tipo: 'password', placeholder: 'Client_Secret_...' },
    { chave: 'efi_pix_chave',     label: 'Chave PIX',      tipo: 'text',     placeholder: 'CNPJ, e-mail ou chave aleatoria' },
    { chave: 'efi_sandbox',       label: 'Modo sandbox',   tipo: 'select',   opcoes: ['false', 'true'] },
  ]},
  { secao: 'NFS-e (nota fiscal)', campos: [
    { chave: 'nfse_cnpj',          label: 'CNPJ',              tipo: 'text', placeholder: '00.000.000/0000-00' },
    { chave: 'nfse_razao_social',  label: 'Razao Social',      tipo: 'text', placeholder: 'OITO7 DIGITAL LTDA' },
    { chave: 'nfse_inscricao_mun', label: 'Inscricao Municipal', tipo: 'text', placeholder: '000000' },
    { chave: 'nfse_login',         label: 'Login prefeitura',   tipo: 'text', placeholder: 'login' },
    { chave: 'nfse_password',      label: 'Senha prefeitura',   tipo: 'password', placeholder: '******' },
    { chave: 'nfse_aliquota',      label: 'Aliquota ISS (%)',   tipo: 'text', placeholder: '5.00' },
    { chave: 'nfse_item_lc116',    label: 'Item LC 116',        tipo: 'text', placeholder: '1.07' },
  ]},
  { secao: 'Boleto', campos: [
    { chave: 'boleto_logo_url',    label: 'URL da logo',        tipo: 'text', placeholder: 'https://...' },
    { chave: 'boleto_instrucoes',  label: 'Instrucoes',         tipo: 'text', placeholder: 'Pagamento referente a...' },
  ]},
]

export default function FinanceiroPage() {
  const [aba,       setAba]       = useState<Aba>('cobrancas')
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [tenants,   setTenants]   = useState<Tenant[]>([])
  const [config,    setConfig]    = useState<Record<string, string>>({})
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState<'nova' | Cobranca | null>(null)
  const [detalhe,   setDetalhe]   = useState<Cobranca | null>(null)
  const [salvando,  setSalvando]  = useState(false)
  const [erro,      setErro]      = useState('')
  const [form,      setForm]      = useState({ tenant_id: '', descricao: '', valor: '', vencimento: '', obs: '' })
  const [configEdit, setConfigEdit] = useState<Record<string, string>>({})

  const carregar = useCallback(async () => {
    setLoading(true)
    const [c, t, cfg] = await Promise.all([
      fetch('/api/admin/financeiro/cobrancas').then(r => r.json()).catch(() => []),
      fetch('/api/admin/tenants').then(r => r.json()).catch(() => []),
      fetch('/api/admin/financeiro/config').then(r => r.json()).catch(() => ({})),
    ])
    setCobrancas(Array.isArray(c) ? c : [])
    setTenants(Array.isArray(t) ? t : [])
    setConfig(cfg)
    setConfigEdit(cfg)
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function criarCobranca() {
    setErro('')
    if (!form.tenant_id || !form.descricao || !form.valor || !form.vencimento) {
      setErro('Preencha todos os campos obrigatorios'); return
    }
    setSalvando(true)
    const res = await fetch('/api/admin/financeiro/cobrancas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (!res.ok) { setErro(d.erro ?? 'Erro ao criar'); setSalvando(false); return }
    setModal(null)
    setForm({ tenant_id: '', descricao: '', valor: '', vencimento: '', obs: '' })
    await carregar()
    setSalvando(false)
  }

  async function atualizarStatus(id: string, campos: Record<string, any>) {
    await fetch(`/api/admin/financeiro/cobrancas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campos),
    })
    await carregar()
    setDetalhe(null)
  }

  async function salvarConfig() {
    setSalvando(true)
    await fetch('/api/admin/financeiro/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configEdit),
    })
    await carregar()
    setSalvando(false)
  }

  const totalPendente = cobrancas.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0)
  const totalPago     = cobrancas.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Financeiro</h1>
          <p className="text-brand-gray text-sm mt-1">Cobrancas e nota fiscal para clientes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAba(aba === 'config' ? 'cobrancas' : 'config')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-border text-brand-gray text-sm hover:bg-brand-gray-light transition-colors"
          >
            <Settings className="w-4 h-4" />
            {aba === 'config' ? 'Ver Cobrancas' : 'Configuracoes'}
          </button>
          {aba === 'cobrancas' && (
            <button
              onClick={() => { setErro(''); setModal('nova') }}
              className="flex items-center gap-2 btn-primary px-4 py-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Nova Cobranca
            </button>
          )}
        </div>
      </div>

      {/* Cards resumo */}
      {aba === 'cobrancas' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'A receber',   valor: totalPendente, cor: 'text-amber-600' },
            { label: 'Recebido',    valor: totalPago,     cor: 'text-green-600' },
            { label: 'Total cobr.', valor: cobrancas.length, isNum: true, cor: 'text-brand-dark' },
            { label: 'Vencidas',    valor: cobrancas.filter(c => c.status === 'vencido').length, isNum: true, cor: 'text-red-500' },
          ].map(({ label, valor, cor, isNum }) => (
            <div key={label} className="card p-4">
              <p className="text-xs text-brand-gray mb-1">{label}</p>
              <p className={`text-xl font-bold ${cor}`}>
                {isNum ? valor : fmt(valor as number)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de cobrancas */}
      {aba === 'cobrancas' && (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
          ) : cobrancas.length === 0 ? (
            <div className="text-center py-16">
              <DollarSign className="w-10 h-10 text-brand-gray/30 mx-auto mb-3" />
              <p className="text-brand-gray">Nenhuma cobranca ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-brand-border">
              {cobrancas.map(c => {
                const st = STATUS_INFO[c.status] ?? STATUS_INFO.pendente
                const StIcon = st.icon
                const nomeCliente = c.tenants?.nome_fantasia ?? c.tenants?.nome ?? '—'
                return (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-brand-off-white transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-brand-dark truncate">{nomeCliente}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${st.cor}`}>
                          <StIcon className="w-3 h-3" /> {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-brand-gray truncate mt-0.5">{c.descricao}</p>
                      <p className="text-[10px] text-brand-gray/60 mt-0.5">Vencimento: {fmtData(c.vencimento)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-brand-dark">{fmt(Number(c.valor))}</p>
                      {c.nfse_numero && <p className="text-[10px] text-brand-gray">NF #{c.nfse_numero}</p>}
                    </div>
                    <button
                      onClick={() => setDetalhe(c)}
                      className="p-2 rounded-lg hover:bg-brand-gray-light transition-colors"
                    >
                      <Eye className="w-4 h-4 text-brand-gray" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Configuracoes */}
      {aba === 'config' && (
        <div className="space-y-6">
          {CONFIG_CAMPOS.map(({ secao, campos }) => (
            <div key={secao} className="card p-5">
              <h3 className="font-semibold text-brand-dark mb-4">{secao}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campos.map(({ chave, label, tipo, placeholder, opcoes }) => (
                  <div key={chave}>
                    <label className="block text-xs font-medium text-brand-gray mb-1.5">{label}</label>
                    {tipo === 'select' ? (
                      <select
                        className="input-base text-sm"
                        value={configEdit[chave] ?? ''}
                        onChange={e => setConfigEdit(p => ({ ...p, [chave]: e.target.value }))}
                      >
                        {(opcoes ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={tipo}
                        className="input-base text-sm font-mono"
                        placeholder={placeholder}
                        value={configEdit[chave] ?? ''}
                        onChange={e => setConfigEdit(p => ({ ...p, [chave]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button onClick={salvarConfig} disabled={salvando} className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Configuracoes
            </button>
          </div>
        </div>
      )}

      {/* Modal nova cobranca */}
      {modal === 'nova' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <h2 className="font-bold text-brand-dark">Nova Cobranca</h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-brand-gray-light"><X className="w-4 h-4 text-brand-gray" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-brand-gray mb-1.5">Cliente (tenant)</label>
                <select className="input-base text-sm" value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.nome_fantasia ?? t.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-gray mb-1.5">Descricao</label>
                <input className="input-base text-sm" placeholder="Pacote mensal Ficha Auto — Julho/2026" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-gray mb-1.5">Valor (R$)</label>
                  <input type="number" step="0.01" className="input-base text-sm" placeholder="3000.00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-gray mb-1.5">Vencimento</label>
                  <input type="date" className="input-base text-sm" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-gray mb-1.5">Observacao (opcional)</label>
                <textarea className="input-base text-sm resize-none h-16" placeholder="Informacoes adicionais..." value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
              </div>
              {erro && <p className="text-xs text-brand-danger bg-red-50 px-3 py-2 rounded-xl">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-brand-border">
              <button onClick={() => setModal(null)} className="flex-1 h-10 rounded-xl border border-brand-border text-brand-gray text-sm hover:bg-brand-gray-light transition-colors">Cancelar</button>
              <button onClick={criarCobranca} disabled={salvando} className="flex-1 btn-primary h-10 flex items-center justify-center gap-2 disabled:opacity-40">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detalhe da cobranca */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <h2 className="font-bold text-brand-dark">Detalhe da Cobranca</h2>
              <button onClick={() => setDetalhe(null)} className="p-1.5 rounded-lg hover:bg-brand-gray-light"><X className="w-4 h-4 text-brand-gray" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-brand-gray">Cliente</p><p className="font-semibold">{detalhe.tenants?.nome_fantasia ?? detalhe.tenants?.nome ?? '—'}</p></div>
                <div><p className="text-xs text-brand-gray">Valor</p><p className="font-bold text-brand-green">{fmt(Number(detalhe.valor))}</p></div>
                <div><p className="text-xs text-brand-gray">Vencimento</p><p className="font-semibold">{fmtData(detalhe.vencimento)}</p></div>
                <div><p className="text-xs text-brand-gray">Status</p><p className={`font-bold ${STATUS_INFO[detalhe.status]?.cor ?? ''} px-2 py-0.5 rounded-full text-xs inline-block`}>{STATUS_INFO[detalhe.status]?.label}</p></div>
              </div>
              <div><p className="text-xs text-brand-gray mb-1">Descricao</p><p className="text-sm">{detalhe.descricao}</p></div>

              {/* Boleto */}
              <div className="border border-brand-border rounded-xl p-4">
                <p className="text-xs font-semibold text-brand-gray mb-3 uppercase tracking-wide">Boleto</p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-brand-gray mb-1">Link do boleto</label>
                    <div className="flex gap-2">
                      <input className="input-base text-xs flex-1" placeholder="https://..." defaultValue={detalhe.boleto_link ?? ''} id="boleto_link" />
                      <button onClick={() => {
                        const v = (document.getElementById('boleto_link') as HTMLInputElement)?.value
                        atualizarStatus(detalhe.id, { boleto_link: v })
                      }} className="px-3 py-1.5 bg-brand-green text-white rounded-lg text-xs">Salvar</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-brand-gray mb-1">Linha digitavel</label>
                    <div className="flex gap-2">
                      <input className="input-base text-xs flex-1 font-mono" placeholder="00000.00000..." defaultValue={detalhe.boleto_linha_dig ?? ''} id="boleto_linha" />
                      <button onClick={() => {
                        const v = (document.getElementById('boleto_linha') as HTMLInputElement)?.value
                        atualizarStatus(detalhe.id, { boleto_linha_dig: v })
                      }} className="px-3 py-1.5 bg-brand-green text-white rounded-lg text-xs">Salvar</button>
                    </div>
                  </div>
                  {detalhe.boleto_link && (
                    <a href={detalhe.boleto_link} target="_blank" className="flex items-center gap-1 text-xs text-brand-blue hover:underline">
                      <ExternalLink className="w-3 h-3" /> Abrir boleto
                    </a>
                  )}
                </div>
              </div>

              {/* NFS-e */}
              <div className="border border-brand-border rounded-xl p-4">
                <p className="text-xs font-semibold text-brand-gray mb-3 uppercase tracking-wide">Nota Fiscal</p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-brand-gray mb-1">Numero da NF</label>
                    <div className="flex gap-2">
                      <input className="input-base text-xs flex-1" placeholder="12345" defaultValue={detalhe.nfse_numero ?? ''} id="nfse_numero" />
                      <button onClick={() => {
                        const v = (document.getElementById('nfse_numero') as HTMLInputElement)?.value
                        atualizarStatus(detalhe.id, { nfse_numero: v })
                      }} className="px-3 py-1.5 bg-brand-green text-white rounded-lg text-xs">Salvar</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-brand-gray mb-1">URL do PDF da NF</label>
                    <div className="flex gap-2">
                      <input className="input-base text-xs flex-1" placeholder="https://..." defaultValue={detalhe.nfse_pdf_url ?? ''} id="nfse_pdf" />
                      <button onClick={() => {
                        const v = (document.getElementById('nfse_pdf') as HTMLInputElement)?.value
                        atualizarStatus(detalhe.id, { nfse_pdf_url: v })
                      }} className="px-3 py-1.5 bg-brand-green text-white rounded-lg text-xs">Salvar</button>
                    </div>
                  </div>
                  {detalhe.nfse_pdf_url && (
                    <a href={detalhe.nfse_pdf_url} target="_blank" className="flex items-center gap-1 text-xs text-brand-blue hover:underline">
                      <FileText className="w-3 h-3" /> Ver nota fiscal
                    </a>
                  )}
                </div>
              </div>

              {/* Acoes */}
              <div className="flex gap-2 flex-wrap">
                {detalhe.status === 'pendente' && (
                  <button
                    onClick={() => atualizarStatus(detalhe.id, { status: 'pago' })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Marcar como pago
                  </button>
                )}
                {detalhe.status !== 'cancelado' && (
                  <button
                    onClick={() => atualizarStatus(detalhe.id, { status: 'cancelado' })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" /> Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
