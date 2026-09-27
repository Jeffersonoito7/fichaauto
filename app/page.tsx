'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MODULES = [
  {
    title: 'Valor FIPE',
    desc: 'Preço de referência atualizado pela tabela FIPE oficial, com mês de referência e código da versão.',
    free: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: 'Restrições e Bloqueios',
    desc: 'BIN Federal, restrições administrativas, multas e bloqueios DETRAN em âmbito nacional.',
    free: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: 'Gravame / Financiamento',
    desc: 'Banco financiador, número de contrato e data de quitação prevista. Evite herdar dívidas.',
    free: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    title: 'Roubo e Furto',
    desc: 'Verificação nos sistemas SINARM e INFOSEG, com data e local de ocorrência quando disponível.',
    free: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    title: 'Histórico de Leilão',
    desc: 'Passagem por leilão, sinistros registrados, perdas totais e reparos estruturais documentados.',
    free: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    title: 'Processos Judiciais',
    desc: 'RENAJUD — restrições judiciais e penhoras determinadas pelos tribunais federais e estaduais.',
    free: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
]

const CHECK_YES = (
  <svg viewBox="0 0 12 12" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[9px] h-[9px]">
    <polyline points="2 6 5 9 10 3" />
  </svg>
)
const CHECK_NO = (
  <svg viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[9px] h-[9px]">
    <line x1="2" y1="10" x2="10" y2="2" /><line x1="2" y1="2" x2="10" y2="10" />
  </svg>
)

function PlateInput({ onSearch }: { onSearch: (p: string) => void }) {
  const [val, setVal] = useState('')

  const chars = val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7)
  const isMerc = chars.length >= 5 && /[A-Za-z]/.test(chars[4])

  const slots: JSX.Element[] = []
  for (let i = 0; i < 7; i++) {
    if (i === 3) {
      slots.push(
        <span key="sep" className="font-mono text-2xl text-blue-400 mx-0.5">{isMerc ? '' : '-'}</span>
      )
    }
    const c = chars[i]
    slots.push(
      <span key={i} className={`font-mono text-3xl w-7 text-center ${c ? 'text-white' : 'text-white/20'}`}>
        {c ? c.toUpperCase() : '_'}
      </span>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Digite a placa</p>
      <label className="block">
        <div
          className="bg-[#0f172a] border-2 border-[#1e3a5f] rounded-lg overflow-hidden cursor-text mb-3"
        >
          <div className="bg-blue-700 px-3 py-1.5 flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="block w-3.5 h-0.5 bg-green-500" />
              <span className="block w-3.5 h-0.5 bg-yellow-400" />
              <span className="block w-3.5 h-0.5 bg-green-500" />
            </div>
            <span className="font-mono text-[10px] text-white/90 tracking-widest">BRASIL</span>
            <span className="ml-auto font-mono text-[9px] text-white/40 tracking-widest">MERCOSUL</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-center min-h-[58px] gap-0.5">
            {slots}
          </div>
        </div>
        <input
          type="text"
          value={val}
          onChange={e => setVal(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7))}
          onKeyDown={e => e.key === 'Enter' && chars.length === 7 && onSearch(chars)}
          className="sr-only"
          maxLength={7}
          autoComplete="off"
          aria-label="Número da placa"
        />
      </label>
      <button
        onClick={() => chars.length === 7 && onSearch(chars)}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg py-3.5 flex items-center justify-center gap-2 transition-colors text-[15px]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Consultar placa
      </button>
      <p className="text-center mt-2.5 text-xs text-gray-400">
        <strong className="text-green-600">Consulta básica grátis.</strong> Relatório completo por R$ 34,00.
      </p>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#fff', color: '#111827' }}>

      {/* NAV */}
      <nav style={{ background: '#111827', borderBottom: '1px solid rgba(255,255,255,.07)' }} className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-green-600 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <span className="text-white font-bold text-[17px] tracking-tight">Ficha Auto</span>
          </div>
          <div className="hidden md:flex items-center gap-7">
            <a href="#modulos" className="text-sm font-medium text-white/55 hover:text-white transition-colors">Serviços</a>
            <a href="#como-funciona" className="text-sm font-medium text-white/55 hover:text-white transition-colors">Como funciona</a>
            <a href="#precos" className="text-sm font-medium text-white/55 hover:text-white transition-colors">Preços</a>
            <a href="#empresas" className="text-sm font-medium text-white/55 hover:text-white transition-colors">Empresas</a>
            <Link href="/fipe" className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors">
              Consultar placa
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: '#111827' }} className="relative overflow-hidden py-20 md:py-24">
        {/* watermark placa */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-10 pointer-events-none select-none hidden lg:flex flex-col opacity-[0.055]" style={{ width: 500, height: 130 }}>
          <div className="h-7 bg-white rounded-t-lg" />
          <div className="flex-1 flex items-center justify-center font-mono text-[52px] text-white tracking-[6px]">ABC·1D23</div>
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-[1fr_400px] gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest uppercase mb-6"
                style={{ background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)', color: '#4ade80' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Consulta veicular online
              </div>
              <h1 className="text-white font-extrabold leading-[1.15] tracking-tight text-4xl md:text-[3.1rem] mb-5"
                style={{ textWrap: 'balance' } as React.CSSProperties}>
                Antes de comprar,<br />
                saiba tudo sobre<br />
                <span className="text-green-400">qualquer veículo.</span>
              </h1>
              <p className="text-[17px] leading-relaxed mb-9" style={{ color: 'rgba(255,255,255,.5)', maxWidth: 460 }}>
                Valor FIPE, restrições, gravame, histórico de leilão, roubo e RENAJUD.
                A consulta básica é gratuita.
              </p>
              <div className="flex flex-wrap gap-6">
                {['Dados oficiais DETRAN', 'Tabela FIPE atualizada', 'Resultado em segundos'].map(t => (
                  <span key={t} className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'rgba(255,255,255,.4)' }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,.15)' }}>
                      <svg viewBox="0 0 12 12" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                    </span>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-7 shadow-[0_20px_60px_rgba(0,0,0,.35),0_0_0_1px_rgba(255,255,255,.06)]">
              <PlateInput onSearch={p => router.push(`/fipe/${p}`)} />
            </div>
          </div>
        </div>
      </section>

      {/* STRIP */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }} className="py-7">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap justify-around gap-4">
            {[
              { n: '120k+', l: 'veículos consultados' },
              { n: 'R$ 34', l: 'relatório, sem cadastro' },
              { n: '6', l: 'módulos de informação' },
              { n: '< 5s', l: 'tempo médio de resultado' },
            ].map(({ n, l }) => (
              <div key={l} className="text-center flex-1 min-w-[110px]">
                <div className="text-[1.875rem] font-extrabold tracking-tight leading-none text-green-600 tabular-nums">{n}</div>
                <div className="text-[.8rem] font-medium mt-1" style={{ color: '#6b7280' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MÓDULOS */}
      <section id="modulos" className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[.75rem] font-semibold tracking-[.07em] uppercase text-green-600 mb-3">O que o relatório cobre</p>
          <h2 className="text-[2rem] md:text-[2.375rem] font-extrabold tracking-tight leading-[1.2] mb-4">
            Informação que protege<br />a sua compra
          </h2>
          <p className="text-base leading-relaxed mb-12" style={{ color: '#6b7280', maxWidth: 520 }}>
            Cada módulo vem de uma fonte oficial diferente. Reunimos tudo em um único relatório para que você tome a decisão certa.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 border border-gray-200 rounded-xl overflow-hidden"
            style={{ gap: '1px', background: '#e5e7eb' }}>
            {MODULES.map(m => (
              <div key={m.title} className="p-6 bg-white">
                <div className="w-9 h-9 rounded-md flex items-center justify-center mb-3" style={{ background: '#f0fdf4' }}>
                  {m.icon}
                </div>
                <div className="font-semibold text-[15px] mb-1.5">{m.title}</div>
                <p className="text-[13px] leading-[1.55]" style={{ color: '#6b7280' }}>{m.desc}</p>
                <span className={`inline-block mt-2.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-[.04em] uppercase ${
                  m.free
                    ? 'text-green-700 bg-green-50'
                    : 'text-gray-300 bg-gray-900'
                }`}>
                  {m.free ? 'Gratuito' : 'Relatório completo'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" style={{ background: '#111827' }} className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[.75rem] font-semibold tracking-[.07em] uppercase mb-3" style={{ color: '#86efac' }}>Processo</p>
          <h2 className="text-[2rem] md:text-[2.375rem] font-extrabold tracking-tight leading-[1.2] text-white mb-4">Como funciona</h2>
          <p className="text-base leading-relaxed mb-14" style={{ color: 'rgba(255,255,255,.45)', maxWidth: 520 }}>
            Nenhum cadastro obrigatório. Nenhuma mensalidade. Resultado em segundos.
          </p>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { n: '01', t: 'Digite a placa', d: 'Qualquer placa brasileira, formato antigo ou Mercosul. A consulta básica retorna o valor FIPE sem custo algum.' },
              { n: '02', t: 'Veja o resultado gratuito', d: 'Marca, modelo, ano, cor, combustível, município e valor FIPE aparecem imediatamente, sem conta.' },
              { n: '03', t: 'Relatório completo por PIX', d: 'Para os 6 módulos completos, pague R$ 34,00 via PIX. QR Code gerado na hora, resultado em segundos.' },
            ].map(({ n, t, d }) => (
              <div key={n}>
                <div className="text-[3rem] font-extrabold tracking-tight leading-none mb-2.5" style={{ color: 'rgba(255,255,255,.1)' }}>{n}</div>
                <div className="font-semibold text-[15px] text-white mb-1.5">{t}</div>
                <div className="text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,.45)' }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREÇOS */}
      <section id="precos" className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[.75rem] font-semibold tracking-[.07em] uppercase text-green-600 mb-3">Preços</p>
          <h2 className="text-[2rem] md:text-[2.375rem] font-extrabold tracking-tight leading-[1.2] mb-4">Transparente, sem assinatura</h2>
          <p className="text-base leading-relaxed mb-12" style={{ color: '#6b7280', maxWidth: 520 }}>
            Pague apenas quando precisar de um relatório completo. Sem plano mensal, sem surpresa.
          </p>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Gratuito */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-7 py-6 border-b border-gray-200">
                <p className="text-[.7rem] font-semibold tracking-widest uppercase text-gray-400 mb-2.5">Consulta gratuita</p>
                <div className="text-[2.25rem] font-extrabold tracking-tight">R$ 0</div>
                <p className="text-[13px] mt-1.5" style={{ color: '#6b7280' }}>Por placa, sempre</p>
              </div>
              <div className="px-7 py-5 bg-white">
                <ul className="space-y-2.5">
                  {[
                    { ok: true, t: 'Valor FIPE atualizado' },
                    { ok: true, t: 'Marca, modelo e ano' },
                    { ok: true, t: 'Cor, combustível e município' },
                    { ok: false, t: 'Restrições e bloqueios' },
                    { ok: false, t: 'Gravame / financiamento' },
                    { ok: false, t: 'Histórico de leilão e roubo' },
                  ].map(({ ok, t }) => (
                    <li key={t} className="flex items-center gap-2.5 text-[14px]" style={{ color: '#374151' }}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-green-50' : 'bg-gray-100'}`}>
                        {ok ? CHECK_YES : CHECK_NO}
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/fipe" className="block mx-7 mb-6 mt-4 text-center border border-gray-200 rounded-lg py-3 font-semibold text-[15px] hover:bg-gray-50 transition-colors">
                Consultar grátis
              </Link>
            </div>

            {/* Completo */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-7 py-6 border-b" style={{ background: '#111827', borderColor: 'rgba(255,255,255,.08)' }}>
                <p className="text-[.7rem] font-semibold tracking-widest uppercase mb-2.5" style={{ color: '#86efac' }}>Relatório completo</p>
                <div className="text-[2.25rem] font-extrabold tracking-tight text-white">R$ 34</div>
                <p className="text-[13px] mt-1.5" style={{ color: 'rgba(255,255,255,.4)' }}>Por relatório, via PIX, sem cadastro</p>
              </div>
              <div className="px-7 py-5 bg-gray-50">
                <ul className="space-y-2.5">
                  {[
                    'Tudo da consulta gratuita',
                    'Restrições e bloqueios DETRAN',
                    'Gravame e financiamento',
                    'Roubo e furto (SINARM/INFOSEG)',
                    'Histórico de leilão e sinistro',
                    'Processos judiciais RENAJUD',
                  ].map(t => (
                    <li key={t} className="flex items-center gap-2.5 text-[14px]" style={{ color: '#374151' }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-green-50">
                        {CHECK_YES}
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/fipe" className="block mx-7 mb-6 mt-4 text-center bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 font-semibold text-[15px] transition-colors">
                Obter relatório completo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* B2B */}
      <section id="empresas" style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }} className="py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[.75rem] font-semibold tracking-[.07em] uppercase text-green-600 mb-3">Para empresas</p>
              <h2 className="text-[2rem] md:text-[2.375rem] font-extrabold tracking-tight leading-[1.2] mb-4">
                Acesso em volume para<br />quem consulta todo dia
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: '#6b7280', maxWidth: 440 }}>
                Despachantes, lojistas, seguradoras e associações de proteção veicular têm planos B2B com painel dedicado e relatórios ilimitados.
              </p>
              <div className="space-y-5">
                {[
                  { t: 'Painel multi-usuário', d: 'Acesso para toda a equipe com histórico centralizado e controle por usuário.' },
                  { t: 'Consultas ilimitadas', d: 'Plano mensal fixo. Consulte o quanto precisar sem custo por unidade.' },
                  { t: 'Relatório com sua marca', d: 'PDF com logo e identidade da sua empresa para enviar ao cliente final.' },
                ].map(({ t, d }) => (
                  <div key={t} className="flex gap-3.5">
                    <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-[15px] mb-0.5">{t}</div>
                      <div className="text-[13px] leading-relaxed" style={{ color: '#6b7280' }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-9 text-white" style={{ background: '#111827' }}>
              <h3 className="text-2xl font-extrabold tracking-tight leading-snug mb-3">
                Plano empresarial a partir de R$ 1.500/mês
              </h3>
              <p className="text-[14.5px] leading-relaxed mb-7" style={{ color: 'rgba(255,255,255,.45)' }}>
                Inclui painel administrativo, usuários ilimitados, relatórios completos e suporte dedicado. Ideal para mais de 50 consultas por mês.
              </p>
              <a href="https://wa.me/5587992414905" className="block text-center bg-green-600 hover:bg-green-700 text-white rounded-lg py-3.5 font-semibold text-[15px] transition-colors">
                Falar com um consultor
              </a>
              <p className="text-center mt-2.5 text-[12px]" style={{ color: 'rgba(255,255,255,.3)' }}>Retorno em até 24 horas úteis</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0c111d' }} className="py-9">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-[13px]" style={{ color: 'rgba(255,255,255,.3)' }}>
          <span className="font-bold text-base" style={{ color: 'rgba(255,255,255,.65)' }}>Ficha Auto</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-white/65 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white/65 transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-white/65 transition-colors">Contato</a>
          </div>
          <span>© 2026 Ficha Auto. Dados de fontes oficiais.</span>
        </div>
      </footer>
    </div>
  )
}
