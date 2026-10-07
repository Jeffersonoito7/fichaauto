'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Car, User, BarChart3, Search, Hash, Loader2, CheckCircle2, Building2, CreditCard,
  History, AlertTriangle, ArrowLeft,
} from 'lucide-react'
import { PRECO, CREDITO } from '@/lib/products'

type Produto = 'veiculo' | 'cpf' | 'credito'

const PRODUTOS: {
  id: Produto
  icon: typeof Car
  nome: string
  preco: number
  titulo: string
  itens: string[]
}[] = [
  {
    id: 'veiculo',
    icon: Car,
    nome: 'Veículo',
    preco: PRECO.placa,
    titulo: 'O que vem na consulta veicular',
    itens: [
      'Identificação e dados do veículo',
      'Restrições DETRAN e DENATRAN',
      'Roubo e furto (BIN Federal)',
      'RENAJUD (restrições judiciais)',
      'Gravame e alienação fiduciária',
      'Histórico de leilão em 3 bases',
      'Indício de sinistro',
      'Tabela FIPE e valor de mercado',
      'Processos judiciais (DataJud)',
    ],
  },
  {
    id: 'cpf',
    icon: User,
    nome: 'Pessoa física',
    preco: PRECO.cpf,
    titulo: 'O que vem na consulta de pessoa física',
    itens: [
      'Dados básicos e situação do CPF',
      'Telefones e e-mails',
      'Histórico de endereços',
      'Processos judiciais',
      'Protestos em cartório',
      'Renda presumida',
      // PEP fora da lista de propósito: consultarPepCpf é um stub que devolve
      // null, o produto não está contratado na Assertiva. Anunciar aqui era
      // vender algo que nunca chega. Voltar quando for contratado.
      'Participação societária',
      'Veículos vinculados ao CPF',
    ],
  },
  {
    id: 'credito',
    icon: BarChart3,
    nome: 'Crédito',
    preco: CREDITO.custoPorUso,
    titulo: 'O que vem na análise de crédito',
    itens: [
      'Score de crédito de 0 a 1000',
      'Negativações no SPC e Serasa',
      'Protestos em cartório',
      'Valor total de débitos',
      'Ações judiciais',
      'Renda presumida',
      'Aceita CPF ou CNPJ',
    ],
  },
]

const soDig = (v: string) => v.replace(/\D/g, '')

function maskCpf(v: string) {
  const d = soDig(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function maskCnpj(v: string) {
  const d = soDig(v).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Placa Mercosul desenhada. O input fica escondido atrás dela. */
function PlacaVisual({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const [focado, setFocado] = useState(false)
  // Padrão Mercosul tem letra na quinta posição; o antigo tem dígito.
  const mercosul = valor.length < 5 || /[A-Z]/.test(valor[4])

  return (
    <div className="flex flex-col items-center">
      <label
        className={`relative w-[254px] h-[66px] bg-white rounded-lg cursor-text overflow-hidden transition-shadow ${
          focado ? 'ring-4 ring-brand-green/15 border-[3px] border-brand-green' : 'border-[3px] border-[#1a1a2e]'
        }`}
      >
        {/* faixa azul do topo */}
        <span className="absolute inset-x-0 top-0 h-[17px] flex items-center justify-between px-[7px]"
              style={{ background: 'linear-gradient(90deg,#003087,#0044cc)' }}>
          <span className="flex items-center gap-1">
            <svg width="11" height="8" viewBox="0 0 22 15" aria-hidden>
              <rect width="22" height="15" fill="#009c3b" />
              <path d="M11 1.6 20.4 7.5 11 13.4 1.6 7.5z" fill="#ffdf00" />
              <circle cx="11" cy="7.5" r="3.1" fill="#002776" />
            </svg>
            <span className="text-[7px] font-extrabold text-white tracking-wide">BRASIL</span>
          </span>
          <span className="text-[7px] font-extrabold text-white tracking-wide">
            {mercosul ? 'MERCOSUL' : 'BR'}
          </span>
        </span>

        {/* parafusos */}
        <span className="absolute top-[25px] left-2 w-[5px] h-[5px] rounded-full bg-[#c9ccd6]" />
        <span className="absolute top-[25px] right-2 w-[5px] h-[5px] rounded-full bg-[#c9ccd6]" />

        {/* caracteres */}
        <span className="absolute inset-x-0 bottom-[5px] text-center text-[29px] font-black leading-none tracking-[5px] text-[#1a1a2e]"
              style={{ fontFamily: '"Arial Black", Arial, sans-serif' }}>
          {valor || <span className="text-[#c4c7d1]">ABC1D23</span>}
        </span>

        <input
          id="placa"
          value={valor}
          onChange={e => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          maxLength={7}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          aria-label="Placa do veículo"
          className="absolute opacity-0 pointer-events-none w-px h-px"
        />
      </label>
      <p className="text-xs text-brand-gray mt-2 text-center">
        Aceita padrão Mercosul (ABC1D23) e antigo (ABC1234).
      </p>
    </div>
  )
}

export default function ConsultarPage() {
  const router = useRouter()

  const [produto, setProduto]     = useState<Produto>('veiculo')
  const [subVeic, setSubVeic]     = useState<'placa' | 'chassi'>('placa')
  const [subCred, setSubCred]     = useState<'cpf' | 'cnpj'>('cpf')
  const [placa, setPlaca]         = useState('')
  const [texto, setTexto]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [saldo, setSaldo]         = useState<number | null>(null)
  const [assinante, setAssinante] = useState(false)
  const [anterior, setAnterior]   = useState<{
    documento: string; idadeTexto: string; diasAtras: number
    envelhecida: boolean; consultadaPor: string | null
  } | null>(null)

  const p = PRODUTOS.find(x => x.id === produto)!
  const usaPlaca = produto === 'veiculo' && subVeic === 'placa'

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        const sv = Number(d?.saldo_veiculo ?? 0)
        if (!Number.isNaN(sv)) setSaldo(sv)
        setAssinante(!!d?.assinatura_ativa)
      })
      .catch(() => {})
  }, [])

  // limpa os campos ao trocar de produto ou de sub-tipo
  useEffect(() => { setPlaca(''); setTexto(''); setAnterior(null) }, [produto, subVeic, subCred])

  function handleTexto(v: string) {
    if (produto === 'veiculo') return setTexto(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))
    if (produto === 'cpf')     return setTexto(maskCpf(v))
    setTexto(subCred === 'cpf' ? maskCpf(v) : maskCnpj(v))
  }

  function valido() {
    if (produto === 'veiculo') return usaPlaca ? placa.length === 7 : texto.length === 17
    if (produto === 'cpf')     return soDig(texto).length === 11
    return soDig(texto).length === (subCred === 'cpf' ? 11 : 14)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valido()) return

    const doc = soDig(texto)
    if (produto === 'credito') {
      setLoading(true)
      router.push(subCred === 'cpf' ? `/dashboard/credito/cpf/${doc}` : `/dashboard/credito/cnpj/${doc}`)
      return
    }
    if (produto === 'cpf') {
      setLoading(true)
      router.push(`/dashboard/relatorio/cpf/${doc}`)
      return
    }

    // Veículo: antes de gastar API, verifica se a empresa já consultou.
    const alvo = usaPlaca ? placa : texto
    setLoading(true)
    try {
      const res = await fetch(`/api/consulta/anterior?documento=${encodeURIComponent(alvo)}&tipo=veiculo`)
      const d = await res.json()
      if (d?.existe) {
        setAnterior({ ...d, documento: alvo })
        setLoading(false)
        return
      }
    } catch {
      // Falha na checagem não pode travar a consulta.
    }
    // ?novo=1: a pessoa acabou de digitar a placa aqui e viu o valor na tela,
    // então o relatório pode consultar direto. Sem esse parâmetro ele só lê.
    router.push(`/dashboard/relatorio/${alvo}?novo=1`)
  }

  const rotuloTexto =
    produto === 'veiculo' ? 'Número do chassi'
    : produto === 'cpf'   ? 'CPF do titular'
    : subCred === 'cpf'   ? 'CPF para análise'
    :                       'CNPJ para análise'

  const placeholderTexto =
    produto === 'veiculo' ? '93HFC2630HZ104454'
    : subCred === 'cnpj' && produto === 'credito' ? '00.000.000/0001-00'
    : '000.000.000-00'

  // ── Aviso de consulta já existente ──
  // Aparece antes de gastar API. A empresa decide: abre o que já tem, de
  // graça, ou paga por dado novo. Dado veicular envelhece, então a idade
  // fica em destaque e acima de 30 dias vira alerta.
  if (anterior) {
    return (
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => setAnterior(null)}
          className="flex items-center gap-2 text-sm text-brand-gray hover:text-brand-dark mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="card p-6">
          <div className="flex gap-3 mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              anterior.envelhecida ? 'bg-amber-100' : 'bg-brand-green-light'
            }`}>
              <History className={`w-5 h-5 ${anterior.envelhecida ? 'text-amber-700' : 'text-brand-green'}`} />
            </div>
            <div>
              <h2 className="font-bold text-brand-dark">Sua empresa já consultou esta placa</h2>
              <p className="text-sm text-brand-gray mt-0.5">
                <span className="font-mono font-bold text-brand-dark">{anterior.documento}</span>
                {' foi '}{anterior.idadeTexto}
                {anterior.consultadaPor ? ` por ${anterior.consultadaPor}` : ''}.
              </p>
            </div>
          </div>

          {anterior.envelhecida && (
            <div className="flex gap-2.5 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-px" />
              <p className="text-xs text-amber-900 leading-snug">
                Faz mais de 30 dias. Gravame, restrições e registro de furto podem ter mudado
                desde então. Se a decisão depende desses dados, vale atualizar.
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            <button
              onClick={() => router.push(`/dashboard/relatorio/${anterior.documento}`)}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-xl border-[1.5px] border-brand-green bg-brand-green-light/40 hover:bg-brand-green-light transition-colors text-left"
            >
              <span>
                <span className="block text-sm font-bold text-brand-dark">Abrir o relatório que já existe</span>
                <span className="block text-xs text-brand-gray mt-0.5">Sem custo, resultado na hora</span>
              </span>
              <span className="text-sm font-extrabold text-brand-green tabular-nums shrink-0">R$ 0,00</span>
            </button>

            <button
              onClick={() => router.push(`/dashboard/relatorio/${anterior.documento}?atualizar=1`)}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-xl border-[1.5px] border-brand-border hover:border-brand-green transition-colors text-left"
            >
              <span>
                <span className="block text-sm font-bold text-brand-dark">Consultar de novo, com dado atual</span>
                <span className="block text-xs text-brand-gray mt-0.5">
                  {assinante ? 'Incluído na sua assinatura' : 'Consome uma consulta do saldo'}
                </span>
              </span>
              <span className="text-sm font-extrabold text-brand-dark tabular-nums shrink-0">
                {assinante ? 'R$ 0,00' : moeda(p.preco)}
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-dark mb-1">Nova consulta</h1>
        <p className="text-sm text-brand-gray">
          Escolha o produto e informe os dados do veículo ou do titular.
        </p>
      </div>

      {/* abas de produto */}
      <div className="grid grid-cols-3 gap-2 mb-5" role="tablist">
        {PRODUTOS.map(item => {
          const ativo = item.id === produto
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={ativo}
              onClick={() => setProduto(item.id)}
              className={`text-left rounded-xl border-[1.5px] p-3.5 transition-colors ${
                ativo
                  ? 'border-brand-green bg-brand-green-light/40'
                  : 'border-brand-border bg-white hover:border-brand-green'
              }`}
            >
              <span className="flex items-center gap-2.5 mb-1.5">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  ativo ? 'bg-brand-green text-white' : 'bg-brand-green-light text-brand-green'
                }`}>
                  <item.icon className="w-[15px] h-[15px]" />
                </span>
                <span className="text-[13px] font-bold text-brand-dark">{item.nome}</span>
              </span>
              <span className={`block text-xs tabular-nums ${ativo ? 'text-brand-green font-semibold' : 'text-brand-gray'}`}>
                {moeda(item.preco)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">

        {/* formulário */}
        <div className="card p-6">
          {/* sub-tipo do veículo */}
          {produto === 'veiculo' && (
            <div className="inline-flex gap-1.5 bg-brand-off-white border border-brand-border rounded-xl p-1 mb-5">
              {([
                { id: 'placa'  as const, label: 'Por placa',  icon: Car  },
                { id: 'chassi' as const, label: 'Por chassi', icon: Hash },
              ]).map(t => (
                <button
                  key={t.id}
                  type="button"
                  aria-selected={subVeic === t.id}
                  onClick={() => setSubVeic(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    subVeic === t.id ? 'bg-white text-brand-green shadow-sm' : 'text-brand-gray hover:text-brand-dark'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>
          )}

          {/* sub-tipo do crédito */}
          {produto === 'credito' && (
            <div className="inline-flex gap-1.5 bg-brand-off-white border border-brand-border rounded-xl p-1 mb-5">
              {([
                { id: 'cpf'  as const, label: 'Pessoa física (CPF)', icon: User      },
                { id: 'cnpj' as const, label: 'Empresa (CNPJ)',      icon: Building2 },
              ]).map(t => (
                <button
                  key={t.id}
                  type="button"
                  aria-selected={subCred === t.id}
                  onClick={() => setSubCred(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    subCred === t.id ? 'bg-white text-brand-green shadow-sm' : 'text-brand-gray hover:text-brand-dark'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit}>
            {usaPlaca ? (
              <>
                <label htmlFor="placa" className="block text-xs font-semibold text-brand-dark mb-3">
                  Placa do veículo
                </label>
                <div className="mb-5">
                  <PlacaVisual valor={placa} onChange={setPlaca} />
                </div>
              </>
            ) : (
              <>
                <label htmlFor="doc" className="block text-xs font-semibold text-brand-dark mb-3">
                  {rotuloTexto}
                </label>
                <input
                  id="doc"
                  value={texto}
                  onChange={e => handleTexto(e.target.value)}
                  placeholder={placeholderTexto}
                  autoComplete="off"
                  spellCheck={false}
                  className="input-base text-lg font-mono tracking-widest text-center h-14 mb-5"
                  required
                />
              </>
            )}

            <div className="flex items-center justify-between bg-brand-off-white rounded-xl px-3.5 py-3 mb-4 text-xs">
              <span className="text-brand-gray">
                {assinante ? 'Incluído na sua assinatura' : 'Será debitado do saldo'}
              </span>
              <strong className="text-sm text-brand-dark tabular-nums">
                {assinante ? 'R$ 0,00' : moeda(p.preco)}
              </strong>
            </div>

            <button
              type="submit"
              disabled={loading || !valido()}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-green hover:bg-brand-green-dark disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {produto === 'credito' ? 'Analisar crédito' : 'Consultar agora'}
            </button>
          </form>
        </div>

        {/* o que está incluído */}
        <div className="card p-6 h-fit">
          <h2 className="text-[13px] font-bold text-brand-dark mb-4">{p.titulo}</h2>
          <div className="space-y-2.5">
            {p.itens.map(item => (
              <div key={item} className="flex gap-2.5 text-xs text-brand-gray leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-green shrink-0 mt-px" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="flex items-baseline justify-between mt-4 pt-4 border-t border-brand-border">
            <span className="text-xs text-brand-gray">
              {assinante ? 'Seu plano' : 'Saldo após a consulta'}
            </span>
            <strong className="text-base font-extrabold text-brand-green tabular-nums">
              {assinante
                ? 'Ilimitado'
                : saldo === null ? '—' : moeda(Math.max(0, saldo - p.preco))}
            </strong>
          </div>

          {!assinante && saldo !== null && saldo < p.preco && (
            <div className="flex gap-2.5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <CreditCard className="w-4 h-4 text-amber-700 shrink-0 mt-px" />
              <p className="text-xs text-amber-900 leading-snug">
                Saldo insuficiente para esta consulta.{' '}
                <a href="/dashboard/carteira" className="font-semibold underline">Recarregue agora</a>.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
