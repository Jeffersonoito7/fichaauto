'use client'
import Link from 'next/link'
import {
  Car, Shield, FileText, CheckCircle, AlertTriangle, Zap,
  Search, ChevronRight, Star, Lock, BarChart3,
} from 'lucide-react'

const MODULOS = [
  { icon: Car,           title: 'Identificação Completa',       desc: 'Marca, modelo, ano, cor, chassi, motor, proprietário' },
  { icon: AlertTriangle, title: 'Roubo e Furto',                desc: 'Consulta no BIN Federal + RENAJUD com restrições judiciais' },
  { icon: Shield,        title: 'Indício de Sinistro',           desc: 'Histórico de batidas, colisões e precificação de mercado' },
  { icon: Lock,          title: 'Gravame',                       desc: 'Histórico completo de financiamentos e alienações fiduciárias' },
  { icon: BarChart3,     title: 'Histórico de Leilão',           desc: 'Verificação nas bases A, B e Remarketing de seguradoras' },
  { icon: Search,        title: 'Decodificador de Chassi',       desc: 'VIN completo, alterações de características e adulterações' },
  { icon: FileText,      title: 'Restrições Estaduais',          desc: 'IPVA, multas, licenciamento e débitos por estado' },
  { icon: Zap,           title: 'PDF Completo',                  desc: 'Relatório profissional em 7 páginas para enviar ao cliente' },
]

const DEPOIMENTOS = [
  { nome: 'Carlos M.', cargo: 'Dono de revenda — Recife/PE',   texto: 'Salvou minha revenda de comprar um carro com gravame. Virou rotina antes de qualquer negócio.' },
  { nome: 'Ana L.',    cargo: 'Consultora automotiva — SP',    texto: 'Meu cliente viu o PDF completo e fechou na hora. Transmite confiança total.' },
  { nome: 'Roberto F.',cargo: 'Lojista — Fortaleza/CE',        texto: 'Já identifiquei 3 carros com sinistro em 30 dias. Valeu cada centavo.' },
]

export default function FichaLojista() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-brand-dark">Ficha <span className="text-brand-green">Lojista</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-brand-gray hover:text-brand-dark transition-colors">Entrar</Link>
            <Link href="/cadastro?plano=lojista" className="btn-primary text-sm">Começar agora</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-green to-[#005A30] text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" /> Consulta completa em segundos
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
            Tudo sobre um veículo<br />antes de fechar negócio
          </h1>
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            8 módulos de dados, PDF profissional em 7 páginas e resposta em segundos.
            O relatório mais completo do mercado por apenas <strong className="text-white">R$ 35,90</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/cadastro?plano=lojista"
              className="bg-white text-brand-green font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-base"
            >
              Consultar agora <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="#modulos"
              className="border border-white/40 text-white font-medium px-8 py-4 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-base"
            >
              Ver o que está incluído
            </Link>
          </div>
          <p className="text-white/60 text-sm mt-6">Sem mensalidade · Pague só o que consultar · Cancele quando quiser</p>
        </div>
      </section>

      {/* Preço destaque */}
      <section className="py-10 bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm border border-gray-100">
            <div>
              <p className="text-brand-gray text-sm font-medium mb-1">Consulta Completa — Ficha Lojista</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-brand-green">R$ 35,90</span>
                <span className="text-brand-gray">/ consulta</span>
              </div>
              <p className="text-sm text-brand-gray mt-2">Todos os 8 módulos incluídos · PDF gerado automaticamente</p>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <Link href="/cadastro?plano=lojista" className="btn-primary text-center px-10 py-4 text-base">
                Criar conta grátis
              </Link>
              <p className="text-xs text-center text-brand-gray">Cadastro gratuito · Compre créditos quando quiser</p>
            </div>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section id="modulos" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-brand-dark mb-4">O que está incluído</h2>
            <p className="text-brand-gray max-w-xl mx-auto">Uma única consulta cruza 8 bases de dados simultaneamente e gera o relatório completo em segundos.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULOS.map((m, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-brand-green-light flex items-center justify-center mb-4">
                  <m.icon className="w-5 h-5 text-brand-green" />
                </div>
                <h3 className="font-bold text-brand-dark text-sm mb-2">{m.title}</h3>
                <p className="text-xs text-brand-gray leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PDF preview callout */}
      <section className="py-16 px-6 bg-brand-green-light">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-brand-dark mb-4">PDF profissional incluso</h2>
            <p className="text-brand-gray mb-6">Relatório com 7 páginas formatadas para você enviar ao cliente, ao financiador ou arquivar na venda. Com ícones de status coloridos (verde/amarelo/vermelho) para leitura imediata.</p>
            <ul className="space-y-2">
              {['Identificação + 7 ícones de status', 'Gravame e alienações detalhadas', 'Sinistro e histórico de leilão', 'Tabela FIPE + ficha técnica completa', 'Considerações e alertas automáticos'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-brand-dark">
                  <CheckCircle className="w-4 h-4 text-brand-green shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full md:w-64 bg-white rounded-2xl shadow-lg p-6 text-center border border-gray-100">
            <FileText className="w-12 h-12 text-brand-green mx-auto mb-4" />
            <p className="font-bold text-brand-dark mb-1">Relatório PDF</p>
            <p className="text-xs text-brand-gray mb-4">7 páginas · Gerado em segundos</p>
            <div className="bg-brand-green-light rounded-xl p-3 text-xs text-brand-green font-medium">
              Incluído em toda consulta
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-brand-dark text-center mb-12">Quem já usa</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {DEPOIMENTOS.map((d, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-brand-dark text-sm mb-4 leading-relaxed">"{d.texto}"</p>
                <div>
                  <p className="font-bold text-brand-dark text-sm">{d.nome}</p>
                  <p className="text-xs text-brand-gray">{d.cargo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-6 bg-gradient-to-br from-brand-green to-[#005A30] text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black mb-4">Comece agora sem mensalidade</h2>
          <p className="text-white/80 mb-8">Crie sua conta grátis e compre créditos quando precisar. R$ 35,90 por consulta completa.</p>
          <Link href="/cadastro?plano=lojista" className="bg-white text-brand-green font-bold px-10 py-4 rounded-xl hover:bg-gray-50 transition-colors inline-flex items-center gap-2 text-base">
            Criar conta gratuita <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 bg-white border-t border-gray-100 text-center">
        <p className="text-xs text-brand-gray">© 2026 Ficha Auto · fichaauto.com.br · Dados de bases públicas e privadas</p>
      </footer>
    </div>
  )
}
