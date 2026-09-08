// renderer/elo/avisos.js — o sino do topo.
//
// O que ele conta é o que o menu já sabe: os contadores que vêm do painel (pedidos
// esperando, carrinhos abandonados). Nada é inventado aqui — se o painel não mandou
// contador, o sino fica quieto, sem bolinha.
//
// Cada aviso leva à tela onde se resolve. Um sino que só informa faz o lojista
// procurar sozinho o lugar do problema.

const AVISOS = [
  { chave: 'pedidos', rota: '/admin/pedidos', icone: '🧾',
    um: 'pedido esperando resposta', varios: 'pedidos esperando resposta',
    porque: 'Enquanto ninguém aceita, o cliente fica sem previsão.' },
  { chave: 'carrinhos', rota: '/admin/carrinhos', icone: '🛒',
    um: 'carrinho abandonado', varios: 'carrinhos abandonados',
    porque: 'Cliente montou o pedido e não fechou — dá para chamar.' },
  { chave: 'chamados', rota: '/admin/atendimento', icone: '🔔',
    um: 'mesa chamando', varios: 'mesas chamando',
    porque: 'Alguém no salão pediu atendimento ou a conta.' },
]

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

/** Os avisos com contador maior que zero, na ordem em que importam. */
function pendencias(menu) {
  const badges = (menu && menu.badges) || {}
  return AVISOS.map((a) => ({ ...a, quantos: Number(badges[a.chave]) || 0 }))
    .filter((a) => a.quantos > 0)
}

function total(menu) {
  return pendencias(menu).reduce((s, a) => s + a.quantos, 0)
}

function corpo(menu) {
  const lista = pendencias(menu)
  if (!lista.length) {
    return '<div style="padding:34px 24px;text-align:center">'
      + '<div style="font-size:30px;line-height:1;margin-bottom:10px">✨</div>'
      + '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">Nada esperando por você</div>'
      + '<div style="font-size:13px;color:#9ca3af;font-weight:500">'
      + 'Nenhum pedido parado, nenhum carrinho abandonado.</div></div>'
  }
  return lista.map((a) => '<div data-aviso="' + esc(a.rota) + '" style="display:flex;align-items:flex-start;gap:13px;'
    + 'padding:14px 6px;border-bottom:1px solid #f4f5f7;cursor:pointer">'
    + '<span style="font-size:20px;line-height:1.2">' + a.icone + '</span>'
    + '<span style="flex:1;min-width:0">'
    + '<span style="display:block;font-size:14px;font-weight:800;color:#111;margin-bottom:2px">'
    + a.quantos + ' ' + esc(a.quantos === 1 ? a.um : a.varios) + '</span>'
    + '<span style="display:block;font-size:12.5px;color:#6b7280;font-weight:500;line-height:1.5">'
    + esc(a.porque) + '</span></span>'
    + '<span style="font-size:12px;font-weight:800;color:var(--acento-texto);white-space:nowrap;'
    + 'align-self:center">abrir →</span></div>').join('')
}

module.exports = { corpo, pendencias, total, AVISOS }
