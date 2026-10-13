// ─── Validação de CPF e CNPJ pelo dígito verificador ─────────────────────────
//
// Existe porque em 12/10/2026 a AutoVale digitou o CPF 062.226.979-68, que tem
// 11 dígitos mas é inválido. O sistema conferia apenas o TAMANHO, chamou a
// Assertiva, levou erro 400 nas duas pontas e mesmo assim debitou R$ 14,90.
//
// O dígito verificador é a defesa mais barata que existe: detecta erro de
// digitação em microssegundos, sem rede e sem custo. Toda entrada de documento
// que vai virar consulta paga passa por aqui ANTES de qualquer chamada externa.
//
// O que isto NÃO faz: dizer se o CPF existe na Receita, se está regular ou de
// quem é. Dígito válido só garante que a sequência é bem formada.

/** Só os dígitos, como o documento viaja no resto do sistema. */
export function soDigitos(valor: string): string {
  return (valor ?? '').replace(/\D/g, '')
}

/**
 * CPF bem formado?
 *
 * Recusa os 11 dígitos repetidos (00000000000, 11111111111 …): eles passam na
 * conta do dígito verificador por coincidência matemática e são o erro de
 * digitação mais comum depois do dedo trocado.
 */
export function cpfValido(valor: string): boolean {
  const cpf = soDigitos(valor)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  for (const ate of [9, 10]) {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(cpf[i]) * (ate + 1 - i)
    let digito = (soma * 10) % 11
    if (digito === 10) digito = 0
    if (digito !== Number(cpf[ate])) return false
  }
  return true
}

/**
 * CNPJ bem formado?
 *
 * Usa os pesos 5..2 e 6..2 do algoritmo oficial. Aceita apenas o formato
 * numérico atual; o CNPJ alfanumérico entra em vigor em 2026 e, quando for a
 * hora, a mudança é aqui e em mais lugar nenhum.
 */
export function cnpjValido(valor: string): boolean {
  const cnpj = soDigitos(valor)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const calcular = (ate: number): number => {
    let peso = ate - 7
    let soma = 0
    for (let i = 0; i < ate; i++) {
      soma += Number(cnpj[i]) * peso
      peso = peso === 2 ? 9 : peso - 1
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  return calcular(12) === Number(cnpj[12]) && calcular(13) === Number(cnpj[13])
}

/** Máscara para mostrar o documento de volta na mensagem de erro. */
export function formatarCpf(valor: string): string {
  const c = soDigitos(valor)
  if (c.length !== 11) return valor
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`
}
