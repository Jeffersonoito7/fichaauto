import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade e Termos de Uso | Ficha Auto',
  description:
    'Documento único com a Política de Privacidade e os Termos de Uso do Ficha Auto, operado pela Oito7 Digital LTDA.',
}

const ATUALIZACAO = '30 de setembro de 2026'

/** Título de seção, para o espaçamento não variar de um bloco para o outro. */
function Secao({ id, titulo, children }: { id?: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{titulo}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export default function PoliticaETermos() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">

        <div className="mb-8">
          <Link href="/" className="text-sm text-green-600 hover:underline">
            &larr; Voltar
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Política de Privacidade e Termos de Uso
        </h1>
        <p className="text-sm text-gray-500 mb-6">Última atualização: {ATUALIZACAO}</p>

        <p className="text-sm text-gray-600 leading-relaxed mb-10">
          Este documento reúne, em um único endereço, a Política de Privacidade e os Termos de Uso
          do Ficha Auto, plataforma operada pela <strong>Oito7 Digital LTDA</strong>,
          CNPJ 62.302.560/0001-58.
        </p>

        <nav className="mb-12 border border-gray-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-gray-800 mb-2">Conteúdo</p>
          <ul className="space-y-1">
            <li>
              <a href="#privacidade" className="text-green-600 hover:underline">
                Parte I. Política de Privacidade
              </a>
            </li>
            <li>
              <a href="#termos" className="text-green-600 hover:underline">
                Parte II. Termos de Uso
              </a>
            </li>
          </ul>
        </nav>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed">

          {/* ───────────────────────── Parte I ───────────────────────── */}
          <h2 id="privacidade" className="text-2xl font-bold text-gray-900 pt-4 scroll-mt-24">
            Parte I. Política de Privacidade
          </h2>

          <Secao titulo="1. Quem somos">
            <p>
              O Ficha Auto é operado pela <strong>Oito7 Digital LTDA</strong>,
              CNPJ 62.302.560/0001-58, com sede no Brasil. Para dúvidas sobre privacidade, escreva
              para{' '}
              <a href="mailto:privacidade@fichaauto.com.br" className="text-green-600 hover:underline">
                privacidade@fichaauto.com.br
              </a>.
            </p>
          </Secao>

          <Secao titulo="2. Dados que coletamos e por quê">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left">Dado</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">Finalidade</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">Base legal (LGPD)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Nome e e-mail', 'Autenticação e comunicação', 'Execução de contrato (art. 7, V)'],
                  ['Senha (hash bcrypt)', 'Autenticação segura', 'Execução de contrato (art. 7, V)'],
                  ['Placas consultadas', 'Entrega do serviço e histórico', 'Execução de contrato (art. 7, V)'],
                  ['CPF consultado', 'Entrega do serviço de crédito', 'Legítimo interesse / Execução de contrato'],
                  ['Dados do veículo', 'Composição do relatório', 'Execução de contrato (art. 7, V)'],
                  ['Dados obtidos das bases do SENATRAN', 'Composição do relatório veicular', 'Consentimento do titular (art. 7, I)'],
                  ['Registro do consentimento', 'Prova da autorização do titular', 'Cumprimento de obrigação legal (art. 7, II)'],
                  ['Transações PIX', 'Cobrança e conciliação financeira', 'Execução de contrato (art. 7, V)'],
                  ['Logs de acesso', 'Segurança e auditoria', 'Legítimo interesse (art. 7, IX)'],
                ].map(([dado, fin, base]) => (
                  <tr key={dado}>
                    <td className="border border-gray-200 px-3 py-2">{dado}</td>
                    <td className="border border-gray-200 px-3 py-2">{fin}</td>
                    <td className="border border-gray-200 px-3 py-2">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Secao>

          <Secao id="consentimento" titulo="3. Consulta a dados oficiais e consentimento do titular">
            <p>
              Parte das informações do relatório veicular vem de bases oficiais. Quando a consulta
              depende de autorização do titular do dado, ela só é executada após o
              <strong> consentimento livre, informado e específico</strong> desse titular, coletado
              e registrado por plataforma de Gestão de Consentimento e Ciência credenciada, nos
              termos da regulamentação do SENATRAN e da Lei 13.709/2018 (LGPD).
            </p>
            <p>
              Antes de autorizar, o titular é informado de quem está consultando, de quais dados
              serão acessados e de qual é a finalidade da consulta. O consentimento é vinculado a
              uma consulta determinada, não autoriza acesso continuado e{' '}
              <strong>pode ser revogado a qualquer momento</strong> pelo titular, sem custo, pelos
              canais desta Política ou pela própria plataforma de consentimento.
            </p>
            <p>
              Guardamos o registro de cada autorização, com data, hora e finalidade, como prova da
              legitimidade do acesso e para permitir auditoria. Os dados obtidos são usados
              exclusivamente na finalidade declarada ao titular e não são comercializados,
              cedidos ou reaproveitados para outro fim.
            </p>
          </Secao>

          <Secao titulo="4. Compartilhamento de dados">
            <p>
              Não vendemos dados pessoais. Compartilhamos apenas com fornecedores necessários para
              operar o serviço:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Assertiva Soluções</strong> (CNPJ 15.724.796/0001-00): consulta de dados veiculares e de crédito.</li>
              <li><strong>Infocar</strong>: consulta de histórico de leilão e de bases veiculares.</li>
              <li><strong>Supabase Inc.</strong>: armazenamento de banco de dados (servidores nos EUA, com cláusulas contratuais padrão).</li>
              <li><strong>Efí Bank</strong>: processamento de pagamentos PIX.</li>
              <li><strong>Gestora de Consentimento e Ciência credenciada pelo SENATRAN</strong>: coleta e guarda do consentimento do titular.</li>
            </ul>
          </Secao>

          <Secao titulo="5. Retenção de dados">
            <p>
              Dados de conta são mantidos enquanto a conta estiver ativa. O histórico de consultas
              e os registros de consentimento são retidos por 5 anos, para fins de auditoria e
              conformidade fiscal e regulatória. Logs de acesso são retidos por 6 meses.
            </p>
          </Secao>

          <Secao titulo="6. Seus direitos (LGPD)">
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmar a existência de tratamento de seus dados</li>
              <li>Acessar os dados que mantemos sobre você</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a exclusão dos dados desnecessários ou tratados em desconformidade</li>
              <li>Revogar o consentimento, quando aplicável</li>
              <li>Saber com quais entidades seus dados foram compartilhados</li>
            </ul>
            <p>
              Para exercer esses direitos ou solicitar a exclusão da sua conta e dados, acesse{' '}
              <Link href="/dashboard/conta/excluir" className="text-green-600 hover:underline">
                a página de exclusão de conta
              </Link>{' '}
              ou escreva para{' '}
              <a href="mailto:privacidade@fichaauto.com.br" className="text-green-600 hover:underline">
                privacidade@fichaauto.com.br
              </a>. Respondemos em até 15 dias.
            </p>
          </Secao>

          <Secao titulo="7. Segurança">
            <p>
              Senhas são armazenadas como hash bcrypt. Comunicações usam HTTPS/TLS. Credenciais de
              API são mantidas exclusivamente em variáveis de ambiente no servidor, nunca no
              código-fonte. O acesso aos dados de cada empresa cliente é isolado por controle de
              acesso no banco de dados.
            </p>
          </Secao>

          {/* ───────────────────────── Parte II ───────────────────────── */}
          <h2 id="termos" className="text-2xl font-bold text-gray-900 pt-10 scroll-mt-24">
            Parte II. Termos de Uso
          </h2>

          <Secao titulo="1. Aceitação">
            <p>
              Ao criar uma conta ou usar o Ficha Auto, você declara que leu e concorda com estes
              Termos e com a Política de Privacidade acima. Se não concordar, não utilize a
              plataforma.
            </p>
          </Secao>

          <Secao titulo="2. O que o serviço faz">
            <p>
              O Ficha Auto reúne, em um relatório único, informações sobre veículos e sobre
              pessoas físicas e jurídicas, obtidas de bases oficiais e de fornecedores de dados,
              para apoiar decisões de compra, venda, vistoria e análise de risco.
            </p>
            <p>
              A plataforma é oferecida também no modelo white-label: empresas clientes acessam por
              endereço próprio e apresentam os relatórios com a marca delas. Nesse caso a empresa
              cliente é a responsável perante seus próprios usuários finais.
            </p>
          </Secao>

          <Secao titulo="3. Quem pode usar e uso permitido">
            <p>
              O uso é destinado a pessoas maiores de 18 anos e a empresas regularmente constituídas.
              Você se compromete a consultar dados apenas para finalidade legítima, declarada e
              compatível com a autorização obtida do titular.
            </p>
            <p>É expressamente vedado:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Consultar dados sem autorização do titular, quando ela for exigida</li>
              <li>Revender, redistribuir ou publicar os dados obtidos</li>
              <li>Usar os dados para constranger, perseguir ou discriminar qualquer pessoa</li>
              <li>Realizar consultas em massa, varredura de bases ou raspagem automatizada</li>
              <li>Compartilhar credenciais de acesso com terceiros</li>
              <li>Tentar burlar limites técnicos, controles de acesso ou mecanismos de segurança</li>
            </ul>
            <p>
              O descumprimento autoriza a suspensão imediata do acesso, sem reembolso dos créditos
              consumidos, e a comunicação às autoridades quando cabível.
            </p>
          </Secao>

          <Secao titulo="4. Créditos, cobrança e reembolso">
            <p>
              O serviço funciona por créditos pré-pagos: a empresa cliente faz uma recarga e cada
              consulta desconta do saldo, conforme a tabela vigente. Cada consulta bem-sucedida é
              um serviço prestado e consumido no ato, por isso não há reembolso de consulta já
              entregue.
            </p>
            <p>
              Se a consulta falhar por erro nosso, o valor não é debitado ou é devolvido ao saldo.
              Créditos não utilizados não expiram enquanto a conta estiver ativa.
            </p>
          </Secao>

          <Secao titulo="5. Origem e limites da informação">
            <p>
              Os dados apresentados são reproduzidos das bases de origem e refletem o que elas
              continham no momento da consulta. O Ficha Auto não produz, altera nem corrige esses
              dados, e não responde por informação incorreta, desatualizada ou ausente na base de
              origem.
            </p>
            <p>
              O relatório é um <strong>subsídio à decisão</strong>, não um laudo pericial, parecer
              jurídico ou garantia sobre o veículo ou a pessoa consultada. A decisão de negócio é
              sempre de quem consulta. Divergências devem ser tratadas junto ao órgão de origem do
              dado.
            </p>
          </Secao>

          <Secao titulo="6. Disponibilidade">
            <p>
              Trabalhamos para manter a plataforma disponível de forma contínua, mas o serviço
              depende de bases e fornecedores externos. Pode haver indisponibilidade por
              manutenção, falha de terceiros ou caso fortuito, sem que isso configure
              descumprimento.
            </p>
          </Secao>

          <Secao titulo="7. Propriedade intelectual">
            <p>
              A marca, o software, o layout dos relatórios e a estrutura da plataforma pertencem à
              Oito7 Digital LTDA. O contrato de uso não transfere nenhum desses direitos. Os dados
              consultados pertencem às respectivas bases de origem.
            </p>
          </Secao>

          <Secao titulo="8. Responsabilidade">
            <p>
              Respondemos por danos diretos comprovadamente causados por falha nossa, limitados ao
              valor pago pelo cliente nos 12 meses anteriores ao evento. Não respondemos por lucros
              cessantes nem por decisões de negócio tomadas com base no relatório. Estes limites
              não se aplicam a dolo ou culpa grave.
            </p>
          </Secao>

          <Secao titulo="9. Encerramento">
            <p>
              Você pode encerrar sua conta a qualquer momento pela plataforma ou por e-mail.
              Podemos encerrar contas que violem estes Termos, com aviso prévio, salvo em caso de
              uso ilícito ou risco à segurança, quando a suspensão é imediata.
            </p>
          </Secao>

          <Secao titulo="10. Alterações destes documentos">
            <p>
              Podemos atualizar esta Política e estes Termos. Mudanças relevantes são comunicadas
              por e-mail ou na própria plataforma com pelo menos 30 dias de antecedência. A data da
              última atualização consta no topo desta página.
            </p>
          </Secao>

          <Secao titulo="11. Lei aplicável e foro">
            <p>
              Aplica-se a lei brasileira. Fica eleito o foro da comarca de Petrolina, Pernambuco,
              com renúncia a qualquer outro, ressalvada a competência do foro do domicílio do
              consumidor nas relações regidas pelo Código de Defesa do Consumidor.
            </p>
          </Secao>

          <Secao titulo="12. Contato">
            <p>
              Dúvidas, solicitações ou reclamações:{' '}
              <a href="mailto:privacidade@fichaauto.com.br" className="text-green-600 hover:underline">
                privacidade@fichaauto.com.br
              </a>
            </p>
          </Secao>

        </div>
      </div>
    </div>
  )
}
