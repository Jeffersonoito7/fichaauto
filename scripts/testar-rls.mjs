#!/usr/bin/env node
/**
 * testar-rls.mjs — TESTE NEGATIVO de RLS (prova de que o banco esta fechado).
 *
 * Usa a chave PUBLISHABLE/ANON (a mesma que vai no bundle do navegador e que
 * qualquer visitante consegue extrair) para tentar ler cada tabela sensivel
 * pela API REST do Supabase. O teste PASSA quando nenhuma linha volta.
 *
 * Tambem tenta chamar as RPCs de saldo, que sao SECURITY DEFINER e por isso
 * ignoram RLS: se estiverem com EXECUTE liberado para anon, qualquer pessoa se
 * credita saldo. O teste PASSA quando a chamada e negada por permissao.
 *
 * NUNCA chumbe chave neste arquivo. Ele le de variavel de ambiente:
 *   SUPABASE_URL                  (ou NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_PUBLISHABLE_KEY      (ou NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *
 * Uso:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_PUBLISHABLE_KEY=<chave publishable> \
 *   node scripts/testar-rls.mjs
 *
 * Ou, se as variaveis ja estiverem no .env.local do projeto:
 *   node --env-file=.env.local scripts/testar-rls.mjs
 *
 * Saida: codigo 0 se o banco esta fechado, 1 se algum furo foi encontrado.
 */

const URL_BASE =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const CHAVE =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (!URL_BASE || !CHAVE) {
  console.error(
    'ERRO: defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY (ou as variantes NEXT_PUBLIC_*).\n' +
      'Nunca passe a SERVICE ROLE aqui: ela ignora RLS e o teste daria falso positivo de furo.'
  );
  process.exit(2);
}

if (/service_role/i.test(CHAVE) || /^sb_secret_/.test(CHAVE)) {
  console.error(
    'ERRO: a chave fornecida parece ser a SERVICE ROLE (secreta). Ela ignora RLS por natureza.\n' +
      'Use a chave publishable/anon, que e a que o atacante tem.'
  );
  process.exit(2);
}

const BASE_REST = `${URL_BASE.replace(/\/+$/, '')}/rest/v1`;

/** Tabelas que, se vazarem, expoem dado pessoal, financeiro ou de veiculo. */
const TABELAS = [
  'perfis',
  'consultas',
  'cache_placas',
  'tenants',
  'transacoes_pix',
  'monitoramentos',
  'api_keys',
  'senha_tokens',
  'audit_logs',
  'config_financeiro',
  'alertas_monitoramento',
  'cobrancas',
];

/**
 * RPCs SECURITY DEFINER que ignoram RLS. Argumentos deliberadamente invalidos
 * (UUID zerado, valor 0) para que, caso a permissao esteja aberta, o efeito
 * colateral seja nulo e a falha seja detectada pelo codigo HTTP.
 */
const RPCS = [
  {
    nome: 'creditar_saldo',
    args: { p_user_id: ZERO_UUID(), p_campo: 'saldo_reais', p_valor: 0 },
  },
  { nome: 'creditar_saldo_tenant', args: { p_tenant_id: ZERO_UUID(), p_valor: 0 } },
  { nome: 'debitar_saldo_tenant', args: { p_tenant_id: ZERO_UUID(), p_valor: 0 } },
];

function ZERO_UUID() {
  return '00000000-0000-0000-0000-000000000000';
}

const cabecalhos = {
  apikey: CHAVE,
  Authorization: `Bearer ${CHAVE}`,
  Accept: 'application/json',
};

const falhas = [];
const avisos = [];

async function testarTabela(tabela) {
  let resposta;
  try {
    resposta = await fetch(`${BASE_REST}/${tabela}?select=*&limit=5`, {
      headers: cabecalhos,
    });
  } catch (erro) {
    avisos.push(`${tabela}: erro de rede (${erro.message}) — resultado inconclusivo`);
    console.log(`  ?  ${tabela.padEnd(24)} rede falhou: ${erro.message}`);
    return;
  }

  const corpo = await resposta.text();

  // 401/403 (RLS/grant barrou) e 404 (tabela nao exposta) sao resultados bons.
  if (resposta.status === 401 || resposta.status === 403 || resposta.status === 404) {
    console.log(`  ok ${tabela.padEnd(24)} negado (HTTP ${resposta.status})`);
    return;
  }

  if (!resposta.ok) {
    avisos.push(`${tabela}: HTTP ${resposta.status} inesperado — ${corpo.slice(0, 200)}`);
    console.log(`  ?  ${tabela.padEnd(24)} HTTP ${resposta.status} inesperado`);
    return;
  }

  let linhas;
  try {
    linhas = JSON.parse(corpo);
  } catch {
    avisos.push(`${tabela}: resposta 200 nao-JSON — ${corpo.slice(0, 200)}`);
    console.log(`  ?  ${tabela.padEnd(24)} resposta 200 ilegivel`);
    return;
  }

  if (Array.isArray(linhas) && linhas.length === 0) {
    // 200 com lista vazia: RLS filtrou tudo. E o resultado esperado.
    console.log(`  ok ${tabela.padEnd(24)} 200 com 0 linhas`);
    return;
  }

  const colunas = Array.isArray(linhas) && linhas[0] ? Object.keys(linhas[0]) : [];
  falhas.push(
    `${tabela}: VAZOU ${Array.isArray(linhas) ? linhas.length : '?'} linha(s). ` +
      `Colunas expostas: ${colunas.join(', ') || '(desconhecidas)'}`
  );
  console.log(
    `  XX ${tabela.padEnd(24)} VAZOU ${Array.isArray(linhas) ? linhas.length : '?'} linha(s)`
  );
}

async function testarRpc({ nome, args }) {
  let resposta;
  try {
    resposta = await fetch(`${BASE_REST}/rpc/${nome}`, {
      method: 'POST',
      headers: { ...cabecalhos, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  } catch (erro) {
    avisos.push(`rpc ${nome}: erro de rede (${erro.message}) — inconclusivo`);
    console.log(`  ?  rpc ${nome.padEnd(20)} rede falhou: ${erro.message}`);
    return;
  }

  const corpo = await resposta.text();

  if (resposta.status === 401 || resposta.status === 403 || resposta.status === 404) {
    console.log(`  ok rpc ${nome.padEnd(20)} negado (HTTP ${resposta.status})`);
    return;
  }

  // O PostgREST devolve 400/404 com code 42501 (insufficient_privilege) ou
  // PGRST202 (funcao nao encontrada no schema exposto) quando o EXECUTE foi
  // revogado. Ambos significam fechado.
  if (/42501|insufficient_privilege|PGRST202|PGRST203/.test(corpo)) {
    console.log(`  ok rpc ${nome.padEnd(20)} sem permissao de EXECUTE`);
    return;
  }

  // Qualquer outra resposta significa que anon CONSEGUIU entrar na funcao.
  // Mesmo um erro de regra de negocio prova que a permissao esta aberta.
  falhas.push(
    `rpc ${nome}: ALCANCAVEL pela chave publishable (HTTP ${resposta.status}). ` +
      `Funcao SECURITY DEFINER ignora RLS: revogue EXECUTE de anon/authenticated. ` +
      `Resposta: ${corpo.slice(0, 200)}`
  );
  console.log(`  XX rpc ${nome.padEnd(20)} ALCANCAVEL (HTTP ${resposta.status})`);
}

async function principal() {
  console.log(`\nTeste negativo de RLS em ${URL_BASE}`);
  console.log(`Chave: publishable/anon (...${CHAVE.slice(-6)})\n`);

  console.log('Tabelas sensiveis (esperado: nenhuma linha):');
  for (const tabela of TABELAS) {
    await testarTabela(tabela);
  }

  console.log('\nRPCs SECURITY DEFINER (esperado: sem permissao):');
  for (const rpc of RPCS) {
    await testarRpc(rpc);
  }

  if (avisos.length > 0) {
    console.log('\nAVISOS (verificar a mao, nao reprovam o teste):');
    for (const aviso of avisos) console.log(`  - ${aviso}`);
  }

  if (falhas.length > 0) {
    console.error(`\nREPROVADO: ${falhas.length} furo(s) de seguranca.\n`);
    for (const falha of falhas) console.error(`  - ${falha}`);
    console.error(
      '\nO banco esta acessivel com a chave publica. Aplique ' +
        'supabase/migrations/016_rls_fechar_acesso_publico.sql.\n'
    );
    process.exit(1);
  }

  console.log(
    '\nAPROVADO: nenhuma tabela sensivel devolveu linha e nenhuma RPC de saldo ' +
      'esta alcancavel com a chave publica.\n'
  );
  process.exit(0);
}

principal().catch((erro) => {
  console.error('ERRO inesperado no teste:', erro);
  process.exit(2);
});
