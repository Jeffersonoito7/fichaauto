import Link from 'next/link'
import {
  ShieldCheck, Zap, Search, Car, TrendingUp, Lock,
  ChevronRight, CheckCircle2, Star, ArrowRight, Phone
} from 'lucide-react'

const features = [
  { icon: Car,         title: 'Dados do Veículo',        desc: 'Identificação completa via placa ou chassi — marca, modelo, ano, cor, renavam.' },
  { icon: ShieldCheck, title: 'Restrições & RENAJUD',     desc: 'Restrições estaduais, federais e bloqueios judiciais em tempo real.' },
  { icon: Lock,        title: 'Roubo & Furto',            desc: 'Histórico completo de ocorrências de roubo e furto em bases nacionais.' },
  { icon: TrendingUp,  title: 'Gravame & Alienação',      desc: 'Histórico de financiamentos, gravames e alienação fiduciária.' },
  { icon: Zap,         title: 'Leilão (3 bases)',         desc: 'Verificação em 3 bases distintas — judicial, financeiro e mecânico.' },
  { icon: Search,      title: 'Indício de Sinistro',      desc: 'Detecção de sinistros com histórico de acidentes e perda total.' },
]

const stats = [
  { value: '850+',    label: 'Fontes de dados' },
  { value: '< 5s',    label: 'Tempo de resposta' },
  { value: '99.9%',   label: 'Disponibilidade' },
  { value: '3 bases', label: 'Histórico de leilão' },
]

const plans = [
  {
    name: 'Avulso',
    price: 'R$ 39,90',
    period: 'por consulta',
    description: 'Ideal para consultas esporádicas',
    highlight: false,
    cta: 'Consultar agora',
    features: [
      'Relatório completo em PDF',
      'Score de risco do veículo',
      'Link compartilhável 48h',
      'Sem mensalidade',
    ],
  },
  {
    name: 'Plano Mensal',
    price: 'R$ 297',
    period: '/mês',
    description: '10 consultas completas incluídas',
    highlight: true,
    cta: 'Assinar agora',
    badge: 'Mais popular',
    features: [
      'Tudo do Avulso',
      '10 consultas/mês incluídas',
      'Recarga via Pix automática',
      'Histórico ilimitado',
      'Monitoramento de placas',
      'Suporte prioritário',
    ],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-off-white">

      {/* Navbar */}
      <nav className="bg-white border-b border-brand-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-brand-dark">
              Ficha Auto
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-brand-gray">
            <a href="#funcionalidades" className="hover:text-brand-blue transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-brand-blue transition-colors">Planos</a>
            <a href="#como-funciona" className="hover:text-brand-blue transition-colors">Como funciona</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark transition-colors">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn-green text-sm px-4 py-2">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-brand text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-brand-green" />
            <span>Resposta em menos de 5 segundos</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Consulta Veicular<br />
            <span className="text-brand-green">Completa e Confiável</span>
          </h1>
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            Placa, RENAJUD, Gravame, Leilão, Sinistro, FIPE e Score de Risco —
            tudo em um único relatório profissional.
          </p>
          <div className="bg-white rounded-2xl p-2 flex gap-2 max-w-lg mx-auto shadow-xl mb-4">
            <input
              type="text"
              placeholder="Digite a placa  ex: ABC1D23"
              className="flex-1 px-4 py-3 text-brand-dark text-sm rounded-xl outline-none uppercase placeholder:normal-case placeholder:text-brand-gray"
              maxLength={8}
            />
            <Link href="/cadastro" className="btn-green rounded-xl px-5 py-3 text-sm">
              <Search className="w-4 h-4" />
              Consultar
            </Link>
          </div>
          <p className="text-white/50 text-xs">Sem cartão de crédito para começar</p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-brand-border py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-extrabold text-brand-blue">{s.value}</div>
              <div className="text-sm text-brand-gray mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-brand-dark mb-3">
              Tudo que você precisa saber sobre um veículo
            </h2>
            <p className="text-brand-gray max-w-xl mx-auto">
              Um único relatório com todas as informações essenciais para comprar ou vender com segurança.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card card-hover p-6">
                <div className="w-10 h-10 bg-brand-blue-light rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-brand-blue" />
                </div>
                <h3 className="font-semibold text-brand-dark mb-2">{f.title}</h3>
                <p className="text-sm text-brand-gray leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 gradient-brand rounded-2xl p-8 text-white">
            <h3 className="font-bold text-lg mb-6 text-center">Funcionalidades exclusivas</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                '📊 Score de risco 0–100 calculado automaticamente',
                '📄 Relatório em PDF profissional para download',
                '🔗 Link compartilhável com validade de 48h',
                '📱 App mobile iOS e Android',
                '🔔 Monitoramento com alerta de novas restrições',
                '📈 Histórico FIPE com gráfico de valorização',
                '🔍 Detecção de clonagem (chassi vs placa)',
                '📦 Consulta em lote via CSV',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
                  <span className="text-white/90">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="bg-white py-20 px-4 border-y border-brand-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-brand-dark mb-3">Como funciona</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Digite a placa', desc: 'Informe a placa ou o número do chassi do veículo que deseja consultar.' },
              { step: '02', title: 'Processamos tudo', desc: 'Consultamos todas as bases em tempo real e calculamos o score de risco automaticamente.' },
              { step: '03', title: 'Relatório completo', desc: 'Receba o relatório em PDF com todas as informações e compartilhe com quem quiser.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="font-semibold text-brand-dark mb-2">{item.title}</h3>
                <p className="text-sm text-brand-gray leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-brand-dark mb-3">Planos simples e transparentes</h2>
            <p className="text-brand-gray">Sem surpresas. Pague só o que usar.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <div key={plan.name} className={`card p-8 relative ${plan.highlight ? 'border-2 border-brand-blue shadow-blue' : ''}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-blue text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-brand-dark">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-extrabold text-brand-blue">{plan.price}</span>
                    <span className="text-brand-gray text-sm">{plan.period}</span>
                  </div>
                  <p className="text-sm text-brand-gray mt-1">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-brand-dark">
                      <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/cadastro"
                  className={`${plan.highlight ? 'btn-primary' : 'btn-outline'} w-full justify-center`}
                >
                  {plan.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-brand-gray mt-6">
            Plano Mensal: quando acabarem as consultas, recarregue via Pix a qualquer momento.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-green py-16 px-4 text-white text-center">
        <h2 className="text-3xl font-bold mb-3">Pronto para consultar com segurança?</h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">
          Crie sua conta gratuitamente e faça sua primeira consulta agora.
        </p>
        <Link href="/cadastro" className="inline-flex items-center gap-2 bg-white text-brand-green font-bold px-8 py-4 rounded-xl hover:bg-brand-green-light transition-colors text-sm">
          Criar conta grátis <ChevronRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-brand-dark text-white py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-hero flex items-center justify-center">
              <Car className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">Ficha Auto</span>
          </div>
          <p className="text-white/40 text-xs text-center">
            © 2026 Ficha Auto · OITO7DIGITAL SERVIÇOS LTDA · CNPJ 62.302.560/0001-58
          </p>
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <Phone className="w-3 h-3" />
            <span>87 99241-490</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
