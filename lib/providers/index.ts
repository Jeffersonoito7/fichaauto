import { consultarCompleto } from './assertiva'
import { getFipePorPlaca }   from './brasilapi'

export async function consultarVeiculo(placa: string, chassi?: string) {
  const resultado = await consultarCompleto(placa, chassi)

  // Enriquecer com FIPE gratuita se não vier da Assertiva
  let fipe = null
  try { fipe = await getFipePorPlaca(placa) } catch { /* opcional */ }

  return { provider: 'assertiva', ...resultado, fipe }
}
