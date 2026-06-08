// ─── Catálogo de produtos e planos do Ficha Auto ─────────────────────────────
// Fonte dos dados: Assertiva (já contratado), FutureData (a contratar), DataJud (gratuito)

// ─── PRODUTO 1: Consulta Veicular ────────────────────────────────────────────
// ─── PRODUTO 2: Consulta CPF ─────────────────────────────────────────────────
export const PRECO = {
  placa: 36.90,
  cpf:   29.90,
  cnpj:  29.90,
} as const

export type TipoConsulta = keyof typeof PRECO

// Pack de 10 com 10% de desconto (Produtos 1 e 2)
export const PACK_QUANTIDADE = 10
export const PACK_DESCONTO   = 0.10

export function calcularPack(tipo: TipoConsulta) {
  const unitario    = PRECO[tipo]
  const total       = unitario * PACK_QUANTIDADE
  const desconto    = total * PACK_DESCONTO
  const comDesconto = parseFloat((total - desconto).toFixed(2))
  return { unitario, total, desconto, comDesconto, quantidade: PACK_QUANTIDADE }
}

// ─── PRODUTO 3: Análise de Crédito (Score SPC/Serasa/Bancário) ────────────────
// Pack pré-pago: R$ 300 = 10 consultas (R$ 30/cada)
// Avulso CPF: R$ 34,90 | Avulso CNPJ: R$ 38,65
export const CREDITO = {
  packValor:    300.00,
  packQtd:      10,
  avulsoCpf:    34.90,
  avulsoCnpj:   38.65,
  custoPorUso:  30.00,   // debitado do saldo a cada consulta
} as const

export type TipoCreditoCompra = 'credito_pack' | 'credito_cpf' | 'credito_cnpj'

export type FonteDado = 'assertiva' | 'futuredata' | 'datajud' | 'brasilapi'

export type ModuloId =
  // ── PLACA / VEICULAR ──────────────────────────────────────────────────────
  // Assertiva (contratado)
  | 'placa_identificacao'          // dados básicos, restrições DETRAN, situação
  | 'placa_bin_federal'            // RENAJUD, roubo/furto
  | 'placa_bin_estadual'           // DENATRAN, multas, comunicação venda, alterações
  | 'placa_sinistro'               // indício de sinistro Assertiva
  | 'placa_gravame'                // gravame / alienação fiduciária
  | 'placa_leilao'                 // histórico de leilão (3 bases)
  | 'placa_fipe'                   // FIPE + precificador Assertiva
  // DataJud (gratuito)
  | 'placa_processos_cnj'          // processos judiciais do proprietário (10 tribunais)
  // FutureData (a contratar)
  | 'placa_recall'                 // recall por placa/chassi — lista com campanha e descrição
  | 'placa_historico_proprietarios'// histórico completo de proprietários anteriores
  | 'placa_sinistro_plus'          // indício de sinistro ampliado (mais fontes)
  | 'placa_frota_locadora'         // histórico em frota de locadora
  | 'placa_frota_policial'         // histórico como viatura policial/pública
  | 'placa_frota_taxi'             // histórico como táxi / utilização excessiva
  | 'placa_veiculo_crime'          // veículo utilizado para cometer crime
  | 'placa_transferencia_seguradora' // transferência de titularidade para CNPJ de seguradora
  | 'placa_chassi_decoder'         // decodificador VIN/chassi (dados de fabricação)
  | 'placa_crlve'                  // CRLVe digital por estado (20+ estados)
  | 'placa_atpve'                  // ATPVE — autorização transferência de propriedade
  | 'placa_comunicado_venda'       // comunicado de venda via DETRAN

  // ── CPF / PESSOA FÍSICA ───────────────────────────────────────────────────
  // Assertiva (contratado)
  | 'cpf_basico'                   // nome, nascimento, situação CPF
  | 'cpf_contatos'                 // telefones + e-mails
  | 'cpf_enderecos'                // histórico de endereços
  | 'cpf_score'                    // score de crédito (0-1000)
  | 'cpf_processos'                // processos judiciais
  | 'cpf_protestos'                // protestos em cartório
  | 'cpf_renda'                    // renda presumida
  | 'cpf_pep'                      // Pessoa Politicamente Exposta
  | 'cpf_societario'               // participação societária em empresas
  | 'cpf_relacionamentos'          // pessoas de referência / relacionamentos
  | 'cpf_veiculos'                 // veículos vinculados ao CPF
  // FutureData (a contratar)
  | 'cpf_kyc'                      // KYC completo (Know Your Customer)
  | 'cpf_antecedentes'             // antecedentes criminais
  | 'cpf_mandados'                 // mandados de prisão ativos
  | 'cpf_cnh'                      // CNH completa (bloqueios, exames, toxicológico, infrações)

  // ── CNPJ / PESSOA JURÍDICA ────────────────────────────────────────────────
  // Assertiva (contratado)
  | 'cnpj_basico'                  // dados cadastrais (receita federal)
  | 'cnpj_qsa'                     // quadro societário (sócios)
  | 'cnpj_score'                   // score empresarial (0-1000)
  | 'cnpj_processos'               // processos judiciais
  | 'cnpj_protestos'               // protestos em cartório
  | 'cnpj_relacionadas'            // empresas relacionadas
  // FutureData (a contratar)
  | 'cnpj_kyc'                     // KYC empresarial completo
  | 'cnpj_divida_ativa'            // débitos na dívida ativa da União
  | 'cnpj_grupo_empresarial'       // grupo empresarial vinculado
  | 'cnpj_sintegra'                // SINTEGRA (situação tributária estadual)

  // ── GERAL ─────────────────────────────────────────────────────────────────
  | 'lote'                         // consultas em lote (upload CSV)

// ─── Definição de cada módulo ─────────────────────────────────────────────────
export interface Modulo {
  id: ModuloId
  nome: string
  descricao: string
  fonte: FonteDado
  disponivel: boolean // false = aguardando contrato FutureData
}

export const MODULOS: Record<ModuloId, Modulo> = {
  // Assertiva — placa
  placa_identificacao:           { id: 'placa_identificacao',           nome: 'Identificação Veicular',      descricao: 'Placa, chassi, renavam, motor, carroceria, restrições DETRAN, município', fonte: 'assertiva',   disponivel: true },
  placa_bin_federal:             { id: 'placa_bin_federal',             nome: 'BIN Federal',                 descricao: 'RENAJUD (bloqueios judiciais) e histórico de roubo/furto',               fonte: 'assertiva',   disponivel: true },
  placa_bin_estadual:            { id: 'placa_bin_estadual',            nome: 'BIN Estadual / DENATRAN',     descricao: 'Restrições DENATRAN, multas detalhadas, comunicação de venda, alterações', fonte: 'assertiva',   disponivel: true },
  placa_sinistro:                { id: 'placa_sinistro',                nome: 'Indício de Sinistro',         descricao: 'Verificação de sinistro veicular na base Assertiva',                     fonte: 'assertiva',   disponivel: true },
  placa_gravame:                 { id: 'placa_gravame',                 nome: 'Gravame / Alienação',         descricao: 'Restrições financeiras, alienação fiduciária e agente financeiro',        fonte: 'assertiva',   disponivel: true },
  placa_leilao:                  { id: 'placa_leilao',                  nome: 'Histórico de Leilão',         descricao: 'Passagem por leilão em 3 bases (Base A, Base B, Remarketing)',            fonte: 'assertiva',   disponivel: true },
  placa_fipe:                    { id: 'placa_fipe',                    nome: 'FIPE / Precificador',         descricao: 'Valor FIPE, valor de mercado, desvalorização',                           fonte: 'assertiva',   disponivel: true },
  // DataJud — placa
  placa_processos_cnj:           { id: 'placa_processos_cnj',           nome: 'Processos Judiciais (CNJ)',   descricao: 'Processos do proprietário em 10 tribunais via DataJud',                  fonte: 'datajud',     disponivel: true },
  // FutureData — placa
  placa_recall:                  { id: 'placa_recall',                  nome: 'Recall por Placa/Chassi',    descricao: 'Lista de recalls pendentes com campanha, descrição do defeito e prazo',   fonte: 'futuredata',  disponivel: false },
  placa_historico_proprietarios: { id: 'placa_historico_proprietarios', nome: 'Histórico de Proprietários', descricao: 'Todos os proprietários anteriores com CPF/CNPJ e data de transferência',  fonte: 'futuredata',  disponivel: false },
  placa_sinistro_plus:           { id: 'placa_sinistro_plus',           nome: 'Sinistro Plus',              descricao: 'Sinistro ampliado: histórico de danos, avarias e acidente de trânsito',  fonte: 'futuredata',  disponivel: false },
  placa_frota_locadora:          { id: 'placa_frota_locadora',          nome: 'Histórico Frota Locadora',   descricao: 'Identificação de veículo com histórico em frota de locadora',             fonte: 'futuredata',  disponivel: false },
  placa_frota_policial:          { id: 'placa_frota_policial',          nome: 'Histórico Frota Policial',   descricao: 'Histórico como viatura policial, pública ou de segurança privada',        fonte: 'futuredata',  disponivel: false },
  placa_frota_taxi:              { id: 'placa_frota_taxi',              nome: 'Histórico Táxi',             descricao: 'Histórico como táxi ou utilização excessiva de frota',                   fonte: 'futuredata',  disponivel: false },
  placa_veiculo_crime:           { id: 'placa_veiculo_crime',           nome: 'Veículo em Crime',           descricao: 'Flag se o veículo foi utilizado para cometer crime',                     fonte: 'futuredata',  disponivel: false },
  placa_transferencia_seguradora:{ id: 'placa_transferencia_seguradora',nome: 'Transferência p/ Seguradora',descricao: 'Histórico de transferência de titularidade para CNPJ de seguradora',     fonte: 'futuredata',  disponivel: false },
  placa_chassi_decoder:          { id: 'placa_chassi_decoder',          nome: 'Decodificador de Chassi',    descricao: 'Decodificação VIN: país, fabricante, modelo, ano e dados de produção',   fonte: 'futuredata',  disponivel: false },
  placa_crlve:                   { id: 'placa_crlve',                   nome: 'CRLVe Digital',              descricao: 'Certificado de Registro e Licenciamento digital por estado (20 UFs)',     fonte: 'futuredata',  disponivel: false },
  placa_atpve:                   { id: 'placa_atpve',                   nome: 'ATPVE',                      descricao: 'Autorização para Transferência de Propriedade de Veículo via DETRAN',    fonte: 'futuredata',  disponivel: false },
  placa_comunicado_venda:        { id: 'placa_comunicado_venda',        nome: 'Comunicado de Venda',        descricao: 'Comunicado de venda de veículo digital com protocolo DETRAN',            fonte: 'futuredata',  disponivel: false },
  // Assertiva — CPF
  cpf_basico:                    { id: 'cpf_basico',                    nome: 'Dados Básicos CPF',           descricao: 'Nome, nascimento, situação CPF, nome da mãe, sexo',                     fonte: 'assertiva',   disponivel: true },
  cpf_contatos:                  { id: 'cpf_contatos',                  nome: 'Telefones e E-mails',         descricao: 'Telefones celulares e fixos, endereços de e-mail',                      fonte: 'assertiva',   disponivel: true },
  cpf_enderecos:                 { id: 'cpf_enderecos',                 nome: 'Histórico de Endereços',      descricao: 'Todos os endereços com data de referência',                             fonte: 'assertiva',   disponivel: true },
  cpf_score:                     { id: 'cpf_score',                     nome: 'Score de Crédito',            descricao: 'Score de crédito 0-1000 com faixa de risco',                            fonte: 'assertiva',   disponivel: true },
  cpf_processos:                 { id: 'cpf_processos',                 nome: 'Processos Judiciais',         descricao: 'Quantidade de processos judiciais vinculados ao CPF',                   fonte: 'assertiva',   disponivel: true },
  cpf_protestos:                 { id: 'cpf_protestos',                 nome: 'Protestos em Cartório',       descricao: 'Quantidade de protestos em cartório',                                   fonte: 'assertiva',   disponivel: true },
  cpf_renda:                     { id: 'cpf_renda',                     nome: 'Renda Presumida',             descricao: 'Estimativa de renda mensal',                                            fonte: 'assertiva',   disponivel: true },
  cpf_pep:                       { id: 'cpf_pep',                       nome: 'PEP',                         descricao: 'Pessoa Politicamente Exposta (compliance)',                              fonte: 'assertiva',   disponivel: true },
  cpf_societario:                { id: 'cpf_societario',                nome: 'Participação Societária',     descricao: 'Empresas onde o CPF é sócio ou administrador',                         fonte: 'assertiva',   disponivel: true },
  cpf_relacionamentos:           { id: 'cpf_relacionamentos',           nome: 'Relacionamentos',             descricao: 'Pessoas de referência e relacionamentos familiares',                    fonte: 'assertiva',   disponivel: true },
  cpf_veiculos:                  { id: 'cpf_veiculos',                  nome: 'Veículos Vinculados',         descricao: 'Histórico de veículos vinculados ao CPF',                               fonte: 'assertiva',   disponivel: true },
  // FutureData — CPF
  cpf_kyc:                       { id: 'cpf_kyc',                       nome: 'KYC Completo',               descricao: 'Know Your Customer: validação cadastral completa para compliance',       fonte: 'futuredata',  disponivel: false },
  cpf_antecedentes:              { id: 'cpf_antecedentes',              nome: 'Antecedentes Criminais',     descricao: 'Pesquisa de antecedentes criminais em bases policiais',                  fonte: 'futuredata',  disponivel: false },
  cpf_mandados:                  { id: 'cpf_mandados',                  nome: 'Mandados de Prisão',         descricao: 'Mandados de prisão ativos em nome do CPF',                              fonte: 'futuredata',  disponivel: false },
  cpf_cnh:                       { id: 'cpf_cnh',                       nome: 'CNH Completa',               descricao: 'CNH: validade, bloqueios, exames, toxicológico, infrações, biometria',  fonte: 'futuredata',  disponivel: false },
  // Assertiva — CNPJ
  cnpj_basico:                   { id: 'cnpj_basico',                   nome: 'Dados Cadastrais CNPJ',       descricao: 'Razão social, fantasia, CNAE, natureza jurídica, endereço, situação',   fonte: 'assertiva',   disponivel: true },
  cnpj_qsa:                      { id: 'cnpj_qsa',                      nome: 'Quadro Societário (QSA)',     descricao: 'Sócios, administradores, qualificação e participação',                  fonte: 'assertiva',   disponivel: true },
  cnpj_score:                    { id: 'cnpj_score',                    nome: 'Score Empresarial',           descricao: 'Score de crédito empresarial 0-1000',                                  fonte: 'assertiva',   disponivel: true },
  cnpj_processos:                { id: 'cnpj_processos',                nome: 'Processos Judiciais',         descricao: 'Processos judiciais vinculados ao CNPJ',                               fonte: 'assertiva',   disponivel: true },
  cnpj_protestos:                { id: 'cnpj_protestos',                nome: 'Protestos em Cartório',       descricao: 'Protestos em cartório vinculados ao CNPJ',                             fonte: 'assertiva',   disponivel: true },
  cnpj_relacionadas:             { id: 'cnpj_relacionadas',             nome: 'Empresas Relacionadas',       descricao: 'Empresas com relação societária ou cadastral',                         fonte: 'assertiva',   disponivel: true },
  // FutureData — CNPJ
  cnpj_kyc:                      { id: 'cnpj_kyc',                      nome: 'KYC Empresarial',            descricao: 'KYC completo: compliance, sanções, PEP sócios, listas negras',          fonte: 'futuredata',  disponivel: false },
  cnpj_divida_ativa:             { id: 'cnpj_divida_ativa',             nome: 'Dívida Ativa da União',      descricao: 'Débitos inscritos na dívida ativa federal',                             fonte: 'futuredata',  disponivel: false },
  cnpj_grupo_empresarial:        { id: 'cnpj_grupo_empresarial',        nome: 'Grupo Empresarial',          descricao: 'Mapeamento de todo o grupo empresarial vinculado ao CNPJ',             fonte: 'futuredata',  disponivel: false },
  cnpj_sintegra:                 { id: 'cnpj_sintegra',                 nome: 'SINTEGRA',                   descricao: 'Situação tributária estadual e inscrição estadual',                    fonte: 'futuredata',  disponivel: false },
  // Geral
  lote:                          { id: 'lote',                          nome: 'Consulta em Lote',            descricao: 'Upload de CSV para consulta em massa de placas, CPFs ou CNPJs',        fonte: 'assertiva',   disponivel: true },
}

// ─── Planos ────────────────────────────────────────────────────────────────────
export type PlanoId = 'essencial' | 'profissional' | 'seguradora' | 'despachante'

export interface Plano {
  id: PlanoId
  nome: string
  descricao: string
  cor: string          // hex
  corTexto: string     // hex
  preco: number        // R$/mês sugerido
  creditos: number     // consultas incluídas/mês
  publico: string[]    // quem se beneficia
  modulos: ModuloId[]
  destaque: boolean
}

export const PLANOS: Record<PlanoId, Plano> = {
  essencial: {
    id: 'essencial',
    nome: 'Essencial',
    descricao: 'Consulta veicular completa com todas as fontes Assertiva e DataJud',
    cor: '#00703C',
    corTexto: '#FFFFFF',
    preco: 149,
    creditos: 50,
    publico: ['Pessoa física', 'Revendas', 'Concessionárias'],
    destaque: false,
    modulos: [
      'placa_identificacao', 'placa_bin_federal', 'placa_bin_estadual',
      'placa_sinistro', 'placa_gravame', 'placa_leilao', 'placa_fipe',
      'placa_processos_cnj',
      'cpf_basico', 'cpf_contatos', 'cpf_enderecos', 'cpf_score',
      'cpf_processos', 'cpf_protestos', 'cpf_renda', 'cpf_pep',
      'cpf_societario', 'cpf_relacionamentos', 'cpf_veiculos',
      'cnpj_basico', 'cnpj_qsa', 'cnpj_score', 'cnpj_processos',
      'cnpj_protestos', 'cnpj_relacionadas',
    ],
  },

  profissional: {
    id: 'profissional',
    nome: 'Profissional',
    descricao: 'Essencial + recall, histórico de proprietários e decodificador de chassi',
    cor: '#1D4ED8',
    corTexto: '#FFFFFF',
    preco: 299,
    creditos: 150,
    publico: ['Revendas', 'Concessionárias', 'Proteção Veicular', 'Seguros'],
    destaque: true,
    modulos: [
      'placa_identificacao', 'placa_bin_federal', 'placa_bin_estadual',
      'placa_sinistro', 'placa_gravame', 'placa_leilao', 'placa_fipe',
      'placa_processos_cnj',
      'placa_recall', 'placa_historico_proprietarios', 'placa_chassi_decoder',
      'cpf_basico', 'cpf_contatos', 'cpf_enderecos', 'cpf_score',
      'cpf_processos', 'cpf_protestos', 'cpf_renda', 'cpf_pep',
      'cpf_societario', 'cpf_relacionamentos', 'cpf_veiculos',
      'cnpj_basico', 'cnpj_qsa', 'cnpj_score', 'cnpj_processos',
      'cnpj_protestos', 'cnpj_relacionadas',
      'lote',
    ],
  },

  seguradora: {
    id: 'seguradora',
    nome: 'Seguradora',
    descricao: 'Máximo anti-fraude: frota, crime, KYC, CNH e transferência para seguradora',
    cor: '#7C3AED',
    corTexto: '#FFFFFF',
    preco: 599,
    creditos: 500,
    publico: ['Seguradoras', 'Proteção Veicular', 'Associações', 'Fintechs'],
    destaque: false,
    modulos: [
      // Tudo do Profissional
      'placa_identificacao', 'placa_bin_federal', 'placa_bin_estadual',
      'placa_sinistro', 'placa_gravame', 'placa_leilao', 'placa_fipe',
      'placa_processos_cnj',
      'placa_recall', 'placa_historico_proprietarios', 'placa_chassi_decoder',
      // Anti-fraude avançado (FutureData)
      'placa_sinistro_plus', 'placa_frota_locadora', 'placa_frota_policial',
      'placa_frota_taxi', 'placa_veiculo_crime', 'placa_transferencia_seguradora',
      // CPF avançado
      'cpf_basico', 'cpf_contatos', 'cpf_enderecos', 'cpf_score',
      'cpf_processos', 'cpf_protestos', 'cpf_renda', 'cpf_pep',
      'cpf_societario', 'cpf_relacionamentos', 'cpf_veiculos',
      'cpf_kyc', 'cpf_antecedentes', 'cpf_mandados', 'cpf_cnh',
      // CNPJ avançado
      'cnpj_basico', 'cnpj_qsa', 'cnpj_score', 'cnpj_processos',
      'cnpj_protestos', 'cnpj_relacionadas',
      'cnpj_kyc', 'cnpj_divida_ativa', 'cnpj_grupo_empresarial', 'cnpj_sintegra',
      'lote',
    ],
  },

  despachante: {
    id: 'despachante',
    nome: 'Despachante',
    descricao: 'Foco em transferência: recall, CRLVe digital, ATPVE e comunicado de venda',
    cor: '#D97706',
    corTexto: '#FFFFFF',
    preco: 199,
    creditos: 100,
    publico: ['Despachantes', 'Cartórios', 'Revendas c/ pós-venda', 'Concessionárias'],
    destaque: false,
    modulos: [
      'placa_identificacao', 'placa_bin_federal', 'placa_bin_estadual',
      'placa_sinistro', 'placa_gravame', 'placa_leilao', 'placa_fipe',
      'placa_processos_cnj',
      'placa_recall', 'placa_historico_proprietarios',
      'placa_crlve', 'placa_atpve', 'placa_comunicado_venda',
      'cpf_basico', 'cpf_contatos', 'cpf_enderecos', 'cpf_score',
      'cpf_processos', 'cpf_protestos', 'cpf_renda', 'cpf_pep',
      'cpf_societario', 'cpf_relacionamentos', 'cpf_veiculos',
      'cnpj_basico', 'cnpj_qsa', 'cnpj_score', 'cnpj_processos',
      'cnpj_protestos', 'cnpj_relacionadas',
      'lote',
    ],
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function temModulo(planoId: PlanoId | null | undefined, moduloId: ModuloId): boolean {
  if (!planoId) return false
  return PLANOS[planoId]?.modulos.includes(moduloId) ?? false
}

export function planoQueTemModulo(moduloId: ModuloId): PlanoId | null {
  const ordem: PlanoId[] = ['essencial', 'profissional', 'despachante', 'seguradora']
  return ordem.find(p => PLANOS[p].modulos.includes(moduloId)) ?? null
}

export function todosOsPlanos(): Plano[] {
  return Object.values(PLANOS)
}
