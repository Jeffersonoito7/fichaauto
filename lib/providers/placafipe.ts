// Provider PlacaFIPE — https://api.placafipe.com.br
// Token configurado via PLACAFIPE_TOKEN no .env
// Fallback automático para Assertiva se limite diário atingido

const PLACAFIPE_BASE = 'https://api.placafipe.com.br'

export interface PlacaFipeResultado {
  placa:        string
  marca:        string
  modelo:       string
  anoFabricacao: string
  anoModelo:    string
  cor:          string
  municipio:    string
  uf:           string
  combustivel:  string
  chassi:       string
  motor:        string
  fipeValor:    string
  fipeCodigo:   string
  fipeMes:      string
  fonte:        'placafipe' | 'assertiva'
}

export async function consultarPlacaFipe(placa: string): Promise<PlacaFipeResultado | null> {
  const token = process.env.PLACAFIPE_TOKEN
  if (!token) return null

  try {
    const res = await fetch(`${PLACAFIPE_BASE}/getplacafipe/${placa}/${token}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json' },
    })

    if (!res.ok) return null
    const d = await res.json()

    // Limite diário atingido ou token inválido
    if (d?.codigo === 4862 || d?.codigo === 4001 || d?.codigo === 4000) return null

    return {
      placa:         (d.placa         ?? placa).toUpperCase(),
      marca:         d.marca          ?? d.fabricante ?? '',
      modelo:        d.modelo         ?? d.versao     ?? '',
      anoFabricacao: String(d.anoFabricacao ?? d.ano ?? ''),
      anoModelo:     String(d.anoModelo     ?? d.ano ?? ''),
      cor:           d.cor            ?? '',
      municipio:     d.municipio      ?? d.cidade     ?? '',
      uf:            d.uf             ?? d.estado     ?? '',
      combustivel:   d.combustivel    ?? '',
      chassi:        d.chassi         ?? '',
      motor:         d.motor          ?? '',
      fipeValor:     d.fipe?.valor    ?? d.fipeValor  ?? d.valor ?? '',
      fipeCodigo:    d.fipe?.codigo   ?? d.fipeCodigo ?? '',
      fipeMes:       d.fipe?.mesReferencia ?? d.fipeMes ?? '',
      fonte:         'placafipe',
    }
  } catch {
    return null
  }
}
