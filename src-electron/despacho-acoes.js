// despacho-acoes.js — o que sai quando alguém manda um pedido para a rua.
//
// Regra pura. O painel cria a rota (POST /api/admin/rotas) e move os pedidos para
// "em entrega" — inclusive a conta do dinheiro que o entregador leva e traz. Aqui só
// se monta o que mandar e se recusa, com o nome do pedido, o que o painel recusaria.
//
// A rota é POR ENTREGADOR: uma chamada leva um entregador e N pedidos. Quando a tela
// pede vários pedidos com entregadores diferentes, saem várias chamadas — uma por
// entregador —, e a resposta diz quantas foram.

/**
 * Monta as chamadas. `pedidos` são as linhas da tela (com id); `entregadorDe` é o
 * que foi escolhido em cada linha; `entregadores` é a lista {id, nome} da tela.
 */
function despachar({ pedidos, entregadorDe, entregadores, fundoTroco }) {
  const lista = pedidos || []
  if (!lista.length) return { ok: false, motivo: 'Nenhum pedido para despachar.' }

  const semId = lista.filter((p) => !p.id).map((p) => '#' + p.pedido)
  if (semId.length) return { ok: false, motivo: 'Pedido sem identificação (' + semId.join(', ') + ') — recarregue a tela.' }

  const idDoEntregador = mapaDeEntregadores(entregadores)
  const semEntregador = []
  const porEntregador = new Map()
  for (const p of lista) {
    const escolhido = (entregadorDe || {})[String(p.pedido)] || ''
    const id = idDoEntregador[escolhido] || (ehUuid(escolhido) ? escolhido : '')
    if (!id) { semEntregador.push('#' + p.pedido); continue }
    if (!porEntregador.has(id)) porEntregador.set(id, { nome: nomeDe(entregadores, id) || escolhido, itens: [] })
    porEntregador.get(id).itens.push({
      pedido_id: p.id,
      troco_para: p.trocoPara == null ? null : Number(p.trocoPara),
    })
  }
  // O painel devolveria 400 sem dizer qual pedido. Melhor dizer aqui.
  if (semEntregador.length) {
    return { ok: false, motivo: 'Escolha o entregador de ' + semEntregador.join(', ') + ' antes de despachar.' }
  }

  const chamadas = [...porEntregador.entries()].map(([motoboyId, g]) => ({
    caminho: '/api/admin/rotas',
    corpo: { motoboy_id: motoboyId, fundo_troco: Number(fundoTroco) || 0, itens: g.itens },
    entregador: g.nome,
    quantos: g.itens.length,
  }))
  const total = lista.length
  return {
    ok: true,
    chamadas,
    resumo: chamadas.length === 1
      ? total + (total === 1 ? ' pedido' : ' pedidos') + ' com ' + chamadas[0].entregador + '.'
      : total + ' pedidos em ' + chamadas.length + ' rotas.',
  }
}

/** nome → id e id → id: a tela pode guardar qualquer um dos dois. */
function mapaDeEntregadores(entregadores) {
  const m = {}
  for (const e of (entregadores || [])) {
    if (e && typeof e === 'object' && e.id) { m[e.id] = e.id; if (e.nome) m[e.nome] = e.id }
  }
  return m
}
function nomeDe(entregadores, id) {
  const e = (entregadores || []).find((x) => x && typeof x === 'object' && x.id === id)
  return e ? e.nome : ''
}
function ehUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test('' + (v || ''))
}

module.exports = { despachar, mapaDeEntregadores }
