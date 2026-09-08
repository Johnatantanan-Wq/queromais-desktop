// kds-acoes.js — o que a cozinha e o bar fazem na fila.
//
// Regra pura: recebe o item (ou o pedido) e diz o que mandar. Quem move o item é o
// painel — PATCH /api/admin/fila/item/<id> —, e ele já cuida do relógio (quando o
// preparo começou) e de avisar o pedido quando o último item fica pronto.
//
// A fila tem três estados e eles andam numa direção só:
//   pendente → preparando → pronto
// Voltar não existe aqui: item que voltou é conversa de gente, no painel.

const PROXIMO = { pendente: 'preparando', preparando: 'pronto', pronto: null }
const ROTULO = { pendente: 'Na fila', preparando: 'Preparando', pronto: 'Pronto' }

/** Avança UM item da fila. */
function avancarItem(item) {
  const i = item || {}
  if (!i.id) return { ok: false, motivo: 'Este item veio sem identificação — recarregue a tela.' }
  const destino = PROXIMO[i.estado || 'pendente']
  if (!destino) return { ok: false, motivo: 'Este item já está pronto.' }
  return {
    ok: true,
    caminho: '/api/admin/fila/item/' + i.id,
    corpo: { status: destino },
    status: destino,
    resumo: destino === 'preparando' ? 'Preparo iniciado.' : 'Item pronto.',
  }
}

/**
 * Marca o PEDIDO inteiro como pronto: todo item que ainda não está. É uma chamada
 * por item, porque a rota é por item — e o botão do cartão promete isso.
 */
function pedidoPronto(pedido) {
  const p = pedido || {}
  const faltam = (p.itens || []).filter((i) => i.estado !== 'pronto')
  if (!faltam.length) return { ok: false, motivo: 'Todos os itens já estão prontos.' }
  const semId = faltam.filter((i) => !i.id)
  if (semId.length) return { ok: false, motivo: 'Item sem identificação — recarregue a tela.' }
  return {
    ok: true,
    chamadas: faltam.map((i) => ({ caminho: '/api/admin/fila/item/' + i.id, corpo: { status: 'pronto' } })),
    resumo: faltam.length === 1
      ? 'Item marcado como pronto.'
      : faltam.length + ' itens marcados como prontos.',
  }
}

module.exports = { avancarItem, pedidoPronto, PROXIMO, ROTULO }
