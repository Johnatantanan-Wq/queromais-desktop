// pedido-acoes.js — o que acontece quando alguém clica no botão do cartão do quadro.
//
// Regra pura, sem Electron e sem rede: recebe o pedido e a etapa em que ele está,
// devolve para onde ir e o que mandar. O painel continua sendo quem faz o trabalho —
// POST /api/admin/pedidos/<id>/status já baixa estoque, lança no caixa, emite nota,
// pontua fidelidade e dispara o WhatsApp. O app não repete nada disso: só pede.

/** A etapa do quadro → o status que o painel entende. */
const PROXIMO = {
  analise: 'em_producao',
  producao: 'pronto',
  pronto: 'em_entrega',
  transito: 'entregue',
  entregue: null,
}

/** Consumo local não "sai para entrega": é servido na mesa. */
function ehLocal(p) {
  const canal = ('' + ((p && p.canal) || '')).toLowerCase()
  return (p && p.tipo === 'consumo_local') || canal.indexOf('mesa') >= 0 || canal.indexOf('local') >= 0
}

/**
 * O que o app deve fazer para avançar este pedido. Devolve sempre o mesmo formato:
 *  { ok: true, caminho, corpo, status }  → pode mandar
 *  { ok: false, motivo }                 → não dá, e o porquê vai para a tela
 */
function avanco(pedido, etapa) {
  const p = pedido || {}
  if (!p.id) {
    return { ok: false, motivo: 'Este pedido veio sem identificação — recarregue a tela.' }
  }
  const status = PROXIMO[etapa]
  if (!status) return { ok: false, motivo: 'O pedido já está na última etapa.' }

  // Mesa: "servir" tem rota própria no painel; despachar entrega não se aplica.
  if (status === 'em_entrega' && ehLocal(p)) {
    return { ok: true, caminho: '/api/admin/pedidos/' + p.id + '/servir', corpo: {}, status: 'servido' }
  }

  // Entrega sem entregador o painel recusa com 422. Avisar antes vale mais do que
  // mandar, tomar o erro e traduzir de volta.
  if (status === 'em_entrega' && p.tipo === 'entrega' && !p.motoboyId) {
    return { ok: false, motivo: 'Escolha o entregador antes de despachar — é pelo Despacho, no painel.' }
  }

  return { ok: true, caminho: '/api/admin/pedidos/' + p.id + '/status', corpo: { status }, status }
}

/** A etapa em que o pedido fica DEPOIS do avanço — o quadro se redesenha com ela. */
const ETAPA_DEPOIS = {
  analise: 'producao', producao: 'pronto', pronto: 'transito', transito: 'entregue',
}

module.exports = { avanco, PROXIMO, ETAPA_DEPOIS, ehLocal }
