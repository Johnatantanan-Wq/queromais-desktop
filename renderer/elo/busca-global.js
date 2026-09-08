// renderer/elo/busca-global.js — a busca do topo (⌘K).
//
// No formato do print do dono (08/09): popup no meio da tela, campo grande em cima,
// resultados em lista embaixo, com o teclado guiando. Quem opera o balcão não larga o
// teclado para caçar um menu com o mouse.
//
// O que ela acha: qualquer tela do menu e as ações que o app faz. Não é busca de
// pedido nem de cliente — para isso cada tela tem a sua, com o dado dela na mão.

/** Ações que valem um atalho: as que o app FAZ, não as que só abrem tela. */
const ATALHOS = [
  { rotulo: 'Nova venda manual', onde: 'Gestão de pedido', acao: 'venda-manual', termos: 'venda manual balcao pdv' },
  { rotulo: 'Lançar sangria', onde: 'Caixa', acao: 'caixa:sangria', rota: '/admin/caixa', termos: 'sangria retirada dinheiro' },
  { rotulo: 'Lançar suprimento', onde: 'Caixa', acao: 'caixa:suprimento', rota: '/admin/caixa', termos: 'suprimento reforco troco' },
  { rotulo: 'Fechar o caixa', onde: 'Caixa', acao: 'caixa:fechar', rota: '/admin/caixa', termos: 'fechar caixa conferencia' },
  { rotulo: 'Conectar o WhatsApp', onde: 'WhatsApp', acao: null, rota: '/admin/whatsapp', termos: 'whatsapp conectar qr evolution' },
  { rotulo: 'Impressão e comandas', onde: 'Sistema', acao: null, rota: '/app/impressao', termos: 'impressora comanda imprimir papel' },
]

/** Tira acento e caixa: quem digita "producao" tem de achar "Produção". */
function chave(s) {
  return ('' + (s == null ? '' : s)).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

/** Junta telas do menu e atalhos num só saco de resultados. */
function catalogo(menu) {
  const itens = []
  for (const s of ((menu && menu.secoes) || [])) {
    for (const i of (s.itens || [])) {
      itens.push({ tipo: 'tela', rotulo: i.label, onde: s.titulo, rota: i.href, termos: chave(i.label + ' ' + s.titulo) })
    }
  }
  for (const a of ATALHOS) {
    itens.push({ tipo: 'acao', rotulo: a.rotulo, onde: a.onde, rota: a.rota, acao: a.acao,
      termos: chave(a.rotulo + ' ' + a.onde + ' ' + a.termos) })
  }
  return itens
}

/**
 * Filtra e ordena. Quem começa com o que foi digitado vem antes de quem só contém —
 * digitar "ca" tem de trazer "Caixa" antes de "Buscar cardápio".
 */
function achar(menu, termo) {
  const t = chave(termo).trim()
  const todos = catalogo(menu)
  if (!t) return todos.slice(0, 8)
  const palavras = t.split(/\s+/)
  const casa = todos.filter((i) => palavras.every((p) => i.termos.indexOf(p) >= 0))
  return casa.sort((a, b) => {
    const ca = chave(a.rotulo).indexOf(t) === 0 ? 0 : 1
    const cb = chave(b.rotulo).indexOf(t) === 0 ? 0 : 1
    if (ca !== cb) return ca - cb
    // tela antes de ação: navegar é o caso comum
    if (a.tipo !== b.tipo) return a.tipo === 'tela' ? -1 : 1
    return a.rotulo.localeCompare(b.rotulo, 'pt-BR')
  }).slice(0, 12)
}

function linha(item, ativo, indice) {
  return '<div data-busca-idx="' + indice + '" style="display:flex;align-items:center;gap:12px;padding:11px 22px;'
    + 'cursor:pointer;border-left:3px solid ' + (ativo ? 'var(--acento)' : 'transparent') + ';'
    + 'background:' + (ativo ? 'var(--acento-suave)' : 'transparent') + '">'
    + '<span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;'
    + 'color:' + (item.tipo === 'acao' ? 'var(--acento-texto)' : '#9ca3af') + ';min-width:44px">'
    + (item.tipo === 'acao' ? 'ação' : 'tela') + '</span>'
    + '<span style="flex:1;min-width:0;font-size:14px;font-weight:700;color:#111;overflow:hidden;'
    + 'text-overflow:ellipsis;white-space:nowrap">' + esc(item.rotulo) + '</span>'
    + '<span style="font-size:12px;color:#9ca3af;font-weight:600;white-space:nowrap">' + esc(item.onde || '') + '</span>'
    + '</div>'
}

/** O corpo do popup. `ativo` é a linha selecionada pelo teclado. */
function corpo(menu, termo, ativo) {
  const achados = achar(menu, termo)
  const lista = achados.length
    ? achados.map((i, n) => linha(i, n === ativo, n)).join('')
    : '<div style="padding:28px 22px;text-align:center;color:#9ca3af;font-size:13.5px;font-weight:500">'
      + 'Nada com esse nome. Tente pelo que a tela faz — "sangria", "comanda", "entregador".</div>'

  return '<div style="display:flex;align-items:center;gap:12px;padding:18px 22px;border-bottom:1px solid #eef0f3">'
    + '<span style="color:#9ca3af;display:flex">'
    + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg></span>'
    + '<input id="buscaGlobal" autocomplete="off" placeholder="Buscar tela ou ação…" value="' + esc(termo || '') + '"'
    + ' style="flex:1;border:none;outline:none;background:none;font-family:inherit;font-size:18px;font-weight:600;color:#111">'
    + '</div>'
    + '<div id="buscaLista">' + lista + '</div>'
    + '<div style="padding:10px 22px;border-top:1px solid #eef0f3;font-size:11.5px;color:#9ca3af;font-weight:600">'
    + achados.length + (achados.length === 1 ? ' resultado' : ' resultados')
    + ' · ↑↓ navega · Enter abre · Esc fecha</div>'
}

module.exports = { corpo, achar, catalogo, chave, ATALHOS }
