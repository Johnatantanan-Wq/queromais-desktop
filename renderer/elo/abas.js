// renderer/elo/abas.js — barra de abas das telas que têm seções por dentro
// (Financeiro, Atendimento, Gestão). Mesmo desenho do resto do shell: pílulas,
// a ativa com o acento da marca.

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

/** A aba escolhida, ou a primeira — nunca uma aba que não existe. */
function abaAtual(abas, escolhida) {
  if (!abas || !abas.length) return null
  return abas.some((a) => a.chave === escolhida) ? escolhida : abas[0].chave
}

function barraDeAbas(abas, escolhida) {
  if (!abas || !abas.length) return ''
  const atual = abaAtual(abas, escolhida)
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">' + abas.map((a) =>
    '<button type="button" data-aba="' + esc(a.chave) + '" class="echip' + (a.chave === atual ? ' is-on' : '') + '"'
    + ' style="cursor:pointer;height:32px;' + (a.chave === atual
      ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800'
      : 'background:#f0f0ee;color:#4b5563') + '">' + esc(a.rotulo) + '</button>').join('') + '</div>'
}

module.exports = { barraDeAbas, abaAtual, esc }
