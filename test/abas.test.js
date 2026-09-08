const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../renderer/elo/abas')

const abas = [{ chave: 'salao', rotulo: 'Salão' }, { chave: 'gorjetas', rotulo: 'Gorjetas' }]

/** O pedaço do HTML que pertence a UMA aba — até o fim do botão dela. Cortar por
 *  número de caracteres quebrava quando o HTML encurtou: a janela passava a
 *  alcançar a aba seguinte e via o is-on dela. */
function trechoDaAba(html, chave) {
  const depois = html.split('data-aba="' + chave + '"')[1] || ''
  return depois.split('</button>')[0]
}

test('desenha uma aba por item, com a ativa marcada', () => {
  const h = A.barraDeAbas(abas, 'gorjetas')
  assert.ok(h.includes('data-aba="salao"') && h.includes('data-aba="gorjetas"'))
  assert.ok(/is-on/.test(trechoDaAba(h, 'gorjetas')), 'a escolhida vem marcada')
  assert.ok(!/is-on/.test(trechoDaAba(h, 'salao')), 'e só ela')
})

test('sem aba escolhida, a primeira vem marcada', () => {
  const h = A.barraDeAbas(abas, null)
  assert.ok(/is-on/.test(trechoDaAba(h, 'salao')))
})

test('lista vazia não desenha barra', () => {
  assert.strictEqual(A.barraDeAbas([], 'x'), '')
})

test('abaAtual devolve a escolhida, ou a primeira', () => {
  assert.strictEqual(A.abaAtual(abas, 'gorjetas'), 'gorjetas')
  assert.strictEqual(A.abaAtual(abas, null), 'salao')
  assert.strictEqual(A.abaAtual(abas, 'inexistente'), 'salao')
})

test('escapa rótulo', () => {
  assert.ok(A.barraDeAbas([{ chave: 'x', rotulo: '<b>' }], 'x').includes('&lt;b&gt;'))
})
