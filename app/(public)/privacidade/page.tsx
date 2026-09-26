import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade | Ficha Auto',
  description: 'Como o Ficha Auto coleta, usa e protege seus dados pessoais.',
}

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">

        <div className="mb-8">
          <Link href="/" className="text-sm text-green-600 hover:underline">
            &larr; Voltar
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-10">Última atualização: setembro de 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">1. Quem somos</h2>
            <p>
              O Ficha Auto é operado pela <strong>Oito7 Digital LTDA</strong>, CNPJ 62.302.560/0001-58,
              com sede no Brasil. Para dúvidas sobre privacidade, entre em contato pelo e-mail{' '}
              <a href="mailto:privacidade@fichaauto.com.br" className="text-green-600 hover:underline">
                privacidade@fichaauto.com.br
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">2. Dados que coletamos e por quê</h2>
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
                  ['Dados do veículo (Assertiva)', 'Composição do relatório', 'Execução de contrato (art. 7, V)'],
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
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">3. Compartilhamento de dados</h2>
            <p>
              Não vendemos dados pessoais. Compartilhamos apenas com fornecedores necessários para
              operar o serviço:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Assertiva Soluções</strong> (CNPJ 15.724.796/0001-00): consulta de dados veiculares e de crédito.</li>
              <li><strong>Supabase Inc.</strong>: armazenamento de banco de dados (servidores nos EUA, com cláusulas contratuais padrão).</li>
              <li><strong>Efí Bank</strong>: processamento de pagamentos PIX.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">4. Retenção de dados</h2>
            <p>
              Dados de conta são mantidos enquanto a conta estiver ativa. Histórico de consultas é
              retido por 5 anos para fins de auditoria e conformidade fiscal. Logs de acesso são
              retidos por 6 meses.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">5. Seus direitos (LGPD)</h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmar a existência de tratamento de seus dados</li>
              <li>Acessar os dados que mantemos sobre você</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a exclusão dos dados desnecessários ou tratados em desconformidade</li>
              <li>Revogar o consentimento, quando aplicável</li>
            </ul>
            <p className="mt-3">
              Para exercer esses direitos ou solicitar a exclusão da sua conta e dados, acesse{' '}
              <Link href="/dashboard/conta/excluir" className="text-green-600 hover:underline">
                a página de exclusão de conta
              </Link>{' '}
              ou envie um e-mail para{' '}
              <a href="mailto:privacidade@fichaauto.com.br" className="text-green-600 hover:underline">
                privacidade@fichaauto.com.br
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">6. Segurança</h2>
            <p>
              Senhas são armazenadas como hash bcrypt. Comunicações usam HTTPS/TLS. Credenciais de
              API são mantidas exclusivamente em variáveis de ambiente no servidor, nunca no código-fonte.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">7. Contato</h2>
            <p>
              Dúvidas, solicitações ou reclamações:{' '}
              <a href="mailto:privacidade@fichaauto.com.br" className="text-green-600 hover:underline">
                privacidade@fichaauto.com.br
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
