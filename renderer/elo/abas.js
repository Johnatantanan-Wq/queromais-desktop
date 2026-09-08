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
  // O visual mora no CSS (.eaba): caixa branca com leve movimento, igual em toda
  // tela. Antes cada barra repetia o estilo inline e elas iam divergindo.
  return '<div class="eabas">' + abas.map((a) =>
    '<button type="button" data-aba="' + esc(a.chave) + '" class="eaba'
    + (a.chave === atual ? ' is-on' : '') + '">' + esc(a.rotulo) + '</button>').join('') + '</div>'
}

module.exports = { barraDeAbas, abaAtual, esc }
