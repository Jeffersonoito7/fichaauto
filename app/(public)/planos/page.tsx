import Link from 'next/link'
import {
  Car, User, BarChart3, CheckCircle2, ChevronRight,
  Zap, Shield, FileText, Phone, Building2,
} from 'lucide-react'

const PRODUTOS = [
  {
    id: 'veiculo',
    icon: Car,
    cor: 'green',
    label: 'Consulta Veicular',
    descricao: 'Laudo completo por placa ou chassi. Usado por revendas, APVs e despachantes.',
    preco: 36.90,
    pacotes: [
      { qtd: 10,  total: 319,  economia: 50 },
      { qtd: 50,  total: 1390, economia: 455 },
      { qtd: 100, total: 2490, economia: 1200 },
    ],
    itens: [
      'Identificacao completa (marca, modelo, ano, cor)',
      'Restricoes DETRAN / DENATRAN',
      'Roubo e furto (BIN Federal)',
      'RENAJUD — restricoes judiciais',
      'Gravame e alienacao fiduciaria',
      'Historico de leilao (3 bases)',
      'Indicio de sinistro',
      'Tabela FIPE + valor de mercado',
      'Processos judiciais via DataJud',
      'PDF completo em segundos',
    ],
    destaque: true,
    badge: 'Mais vendido',
  },
  {
    id: 'cpf',
    icon: User,
    cor: 'blue',
    label: 'Consulta CPF',
    descricao: 'Perfil completo de pessoa fisica. Usado para analise de credito e compliance.',
    preco: 14.90,
    pacotes: [
      { qtd: 10,  total: 129,  economia: 20  },
      { qtd: 50,  total: 549,  economia: 196 },
      { qtd: 100, total: 990,  economia: 500 },
    ],
    itens: [
      'Dados basicos e situacao CPF',
      'Telefones e e-mails',
      'Historico de enderecos',
      'Processos judiciais',
      'Protestos em cartorio',
      'Renda presumida',
      'PEP (Pessoa Politicamente Exposta)',
      'Participacao societaria',
      'Veiculos vinculados ao CPF',
      'PDF do relatorio',
    ],
    destaque: false,
    badge: null,
  },
  {
    id: 'credito',
    icon: BarChart3,
    cor: 'purple',
    label: 'Analise de Credito',
    descricao: 'Score SPC/Serasa com negativacoes e protestos. Para concessao de credito.',
    preco: 30.00,
    pacotes: [
      { qtd: 10,  total: 249,  economia: 51  },
      { qtd: 50,  total: 1090, economia: 410 },
      { qtd: 100, total: 1990, economia: 1010 },
    ],
    itens: [
      'Score de credito 0 a 1000',
      'Negativacoes SPC e Serasa',
      'Valor total de debitos',
      'Protestos em cartorio',
      'Acoes judiciais',
      'Renda presumida',
      'Consulta por CPF ou CNPJ',
      'PDF do relatorio',
    ],
    destaque: false,
    badge: 'Produto novo',
  },
]

const COR: Record<string, { bg: string; text: string; border: string; light: string; btn: string }> = {
  green:  { bg: 'bg-brand-green',  text: 'text-brand-green',  border: 'border-brand-green',  light: 'bg-green-50',  btn: 'bg-brand-green hover:bg-green-700 text-white'   },
  blue:   { bg: 'bg-blue-600',     text: 'text-blue-600',     border: 'border-blue-500',     light: 'bg-blue-50',   btn: 'bg-blue-600 hover:bg-blue-700 text-white'        },
  purple: { bg: 'bg-purple-600',   text: 'text-purple-600',   border: 'border-purple-500',   light: 'bg-purple-50', btn: 'bg-purple-600 hover:bg-purple-700 text-white'    },
}

const PUBLICOS = [
  { icon: Car,       label: 'Revendas e concessionarias',       desc: 'Verificar procedencia antes de comprar ou vender' },
  { icon: Shield,    label: 'Associacoes de protecao veicular', desc: 'Aceite de veiculos e instrucao de sinistros'       },
  { icon: User,      label: 'Despachantes e cartórios',         desc: 'Transferencia, ATPVE e comunicado de venda'        },
  { icon: Building2, label: 'Fintechs e financeiras',           desc: 'Analise de credito e compliance CPF/CNPJ'          },
  { icon: BarChart3, label: 'RHs e empresas de logistica',      desc: 'Verificacao de condutores e historico de veiculo'  },
  { icon: FileText,  label: 'Seguradoras e corretoras',         desc: 'Precificacao de risco e instrucao de sinistro'      },
]

const FAQ = [
  {
    p: 'Como funciona o pagamento?',
    r: 'Voce compra creditos via Pix. Cada consulta debita o valor correspondente do saldo. Sem mensalidade, sem contrato, sem fidelidade.',
  },
  {
    p: 'Os creditos expiram?',
    r: 'Nao. Os creditos ficam no saldo indefinidamente ate serem utilizados.',
  },
  {
    p: 'Posso usar os 3 produtos com o mesmo saldo?',
    r: 'Cada produto tem saldo separado. Voce recarrega o saldo de cada produto conforme a necessidade.',
  },
  {
    p: 'Como integro na minha plataforma?',
    r: 'Temos API com autenticacao JWT. Entre em contato para receber as credenciais e a documentacao.',
  },
  {
    p: 'Ha desconto para volume maior?',
    r: 'Sim. Para volumes acima de 500 consultas/mes, entre em contato para um plano personalizado.',
  },
]

export default function PlanosPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-brand-dark">Ficha <span className="text-brand-green">Auto</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-brand-gray hover:text-brand-dark transition-colors">Entrar</Link>
            <Link href="/cadastro" className="bg-brand-green text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              Criar conta gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            3 produtos. Sem mensalidade. Pague so o que usar.
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
            Dados que sua empresa<br />precisa em segundos
          </h1>
          <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
            Consulta Veicular, CPF e Analise de Credito em uma unica plataforma.
            Creditos pre-pagos via Pix. Sem contrato, sem fidelidade.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro"
              className="bg-brand-green text-white font-bold px-8 py-4 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
              Criar conta gratis <ChevronRight className="w-4 h-4" />
            </Link>
            <a href="https://wa.me/5581999999999?text=Ola%2C%20quero%20saber%20mais%20sobre%20o%20Ficha%20Auto"
              target="_blank"
              className="border border-white/30 text-white font-medium px-8 py-4 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> Falar com vendas
            </a>
          </div>
        </div>
      </section>

      {/* Cards dos 3 produtos */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-brand-dark mb-3">Escolha o produto certo para sua empresa</h2>
            <p className="text-brand-gray max-w-xl mx-auto">Compre creditos separados por produto. Sem assinatura mensal.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PRODUTOS.map(p => {
              const c = COR[p.cor]
              return (
                <div key={p.id}
                  className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col ${p.destaque ? c.border + ' shadow-xl' : 'border-gray-100 shadow-sm'}`}>

                  {/* Barra topo */}
                  <div className={`h-1.5 ${c.bg} w-full`} />

                  <div className="p-6 flex-1 flex flex-col">
                    {/* Icone + badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-11 h-11 rounded-xl ${c.light} flex items-center justify-center`}>
                        <p.icon className={`w-5 h-5 ${c.text}`} />
                      </div>
                      {p.badge && (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c.light} ${c.text}`}>
                          {p.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-brand-dark mb-1">{p.label}</h3>
                    <p className="text-sm text-brand-gray mb-5 leading-relaxed">{p.descricao}</p>

                    {/* Preco */}
                    <div className={`${c.light} rounded-xl p-4 mb-5`}>
                      <p className="text-xs text-brand-gray font-medium mb-1">Valor por consulta</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black ${c.text}`}>
                          {p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>

                    {/* Pacotes */}
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-brand-gray mb-2 uppercase tracking-wide">Pacotes com desconto</p>
                      <div className="space-y-2">
                        {p.pacotes.map(pk => (
                          <div key={pk.qtd} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                            <span className="text-brand-gray">{pk.qtd} consultas</span>
                            <div className="text-right">
                              <span className="font-bold text-brand-dark">
                                {pk.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span className="text-xs text-green-600 font-semibold ml-1.5">
                                -{pk.economia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Itens */}
                    <div className="space-y-1.5 mb-6 flex-1">
                      {p.itens.map(item => (
                        <div key={item} className="flex items-start gap-2 text-xs text-brand-gray">
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${c.text}`} />
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <Link href="/cadastro"
                      className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${c.btn}`}>
                      Comecar agora
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Quem usa */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-brand-dark mb-3">Para quem e o Ficha Auto</h2>
            <p className="text-brand-gray">Qualquer empresa que precisa verificar veiculos, pessoas ou credito antes de tomar uma decisao.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PUBLICOS.map((pub, i) => (
              <div key={i} className="flex items-start gap-4 bg-gray-50 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                  <pub.icon className="w-5 h-5 text-brand-green" />
                </div>
                <div>
                  <p className="font-semibold text-brand-dark text-sm">{pub.label}</p>
                  <p className="text-xs text-brand-gray mt-0.5 leading-relaxed">{pub.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-20 px-6 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Por que escolher o Ficha Auto</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { titulo: 'Sem mensalidade',        desc: 'Compre so o que precisar. Sem contrato, sem fidelidade, sem cobranca recorrente.'          },
              { titulo: 'Resposta em segundos',   desc: 'Dados cruzados em tempo real. Resultado disponivel antes de voce fechar o navegador.'      },
              { titulo: 'PDF profissional',       desc: 'Relatorio formatado para enviar ao cliente, ao banco ou arquivar no processo.'              },
              { titulo: 'White-label disponivel', desc: 'Sua logo e dominio proprio. Venda o servico com a sua marca para seus clientes.'           },
              { titulo: '3 produtos em 1',        desc: 'Veicular, CPF e Credito na mesma conta. Nao precisa contratar 3 fornecedores diferentes.'  },
              { titulo: 'API para integracao',    desc: 'Integre no seu sistema em horas. Documentacao completa e suporte tecnico incluso.'          },
            ].map((d, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{d.titulo}</p>
                  <p className="text-white/60 text-xs mt-1 leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-brand-dark text-center mb-12">Perguntas frequentes</h2>
          <div className="space-y-4">
            {FAQ.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
                <p className="font-bold text-brand-dark text-sm mb-2">{f.p}</p>
                <p className="text-brand-gray text-sm leading-relaxed">{f.r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-6 bg-gradient-to-br from-brand-green to-green-800 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black mb-4">Pronto para comecar?</h2>
          <p className="text-white/80 mb-8">
            Crie sua conta gratis agora. Sem cartao de credito.<br />
            Compre creditos quando quiser, comece a consultar em minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro"
              className="bg-white text-brand-green font-bold px-10 py-4 rounded-xl hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
              Criar conta gratis <ChevronRight className="w-4 h-4" />
            </Link>
            <a href="https://wa.me/5581999999999?text=Ola%2C%20quero%20saber%20mais%20sobre%20o%20Ficha%20Auto"
              target="_blank"
              className="border border-white/30 text-white font-medium px-10 py-4 rounded-xl hover:bg-white/10 transition-colors inline-flex items-center gap-2">
              <Phone className="w-4 h-4" /> Falar com vendas
            </a>
          </div>
          <p className="text-white/50 text-xs mt-6">fichaauto.com.br · Dados de bases publicas e privadas · LGPD compliant</p>
        </div>
      </section>

      <footer className="py-8 px-6 bg-white border-t border-gray-100 text-center">
        <p className="text-xs text-brand-gray">© 2026 Ficha Auto · Oito7Digital Servicos Ltda · CNPJ 62.302.560/0001-58</p>
      </footer>
    </div>
  )
}
