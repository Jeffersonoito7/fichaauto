// A Efí acrescenta `/pix` ao final da URL cadastrada quando entrega o aviso de
// pagamento: cadastrando .../api/pix/webhook, ela chama .../api/pix/webhook/pix.
// Antes esse caminho dava 404 e o aviso era perdido (incidente 02/10/2026).
//
// Esta rota existe so para atender essa variante, reaproveitando exatamente o
// mesmo handler do caminho sem sufixo. Nada e duplicado: so o caminho muda.
export { POST } from '../route'

// GET responde 200 porque a Efí faz uma checagem de alcance da URL antes de
// aceitar o cadastro do webhook. Nao processa nada e nao expõe dado algum.
export async function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
