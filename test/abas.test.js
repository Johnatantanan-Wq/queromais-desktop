const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../renderer/elo/abas')

const abas = [{ chave: 'salao', rotulo: 'Salão' }, { chave: 'gorjetas', rotulo: 'Gorjetas' }]

test('desenha uma aba por item, com a ativa marcada', () => {
  const h = A.barraDeAbas(abas, 'gorjetas')
  assert.ok(h.includes('data-aba="salao"') && h.includes('data-aba="gorjetas"'))
  assert.ok(/is-on/.test(h.split('data-aba="gorjetas"')[1].slice(0, 90)))
  assert.ok(!/is-on/.test(h.split('data-aba="salao"')[1].slice(0, 90)))
})

test('sem aba escolhida, a primeira vem marcada', () => {
  const h = A.barraDeAbas(abas, null)
  assert.ok(/is-on/.test(h.split('data-aba="salao"')[1].slice(0, 90)))
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
