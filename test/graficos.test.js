const { test } = require('node:test')
const assert = require('node:assert')
const g = require('../renderer/elo/graficos')

test('linha: desenha um ponto por rótulo', () => {
  const svg = g.linha([{ values: [10, 20, 15], color: '#14CE6B' }], ['01/09', '02/09', '03/09'])
  assert.strictEqual((svg.match(/<circle/g) || []).length, 3 + 3) // pontos + marcadores do rodapé
  assert.ok(svg.includes('01/09') && svg.includes('03/09'))
})

test('linha: duas séries desenham dois traços', () => {
  const svg = g.linha([
    { values: [10, 20], color: '#14CE6B' },
    { values: [5, 8], color: '#9ca3af' },
  ], ['seg', 'ter'])
  assert.strictEqual((svg.match(/<path d="M/g) || []).length, 2)
})

test('linha: sem dados devolve svg vazio, não quebra', () => {
  assert.ok(g.linha([], []).startsWith('<svg'))
})

test('linha: valores iguais não geram divisão por zero', () => {
  const svg = g.linha([{ values: [5, 5, 5], color: '#14CE6B' }], ['a', 'b', 'c'])
  assert.ok(!svg.includes('NaN'))
})

test('barras: a maior ocupa 100% e as outras são proporcionais', () => {
  const h = g.barras([{ label: 'Pix', value: 100, color: '#14CE6B' }, { label: 'Dinheiro', value: 50, color: '#9ca3af' }])
  assert.ok(h.includes('width:100.0%'))
  assert.ok(h.includes('width:50.0%'))
  assert.ok(h.includes('Pix') && h.includes('Dinheiro'))
})

test('barras: tudo zero não quebra nem pinta barra cheia', () => {
  const h = g.barras([{ label: 'a', value: 0, color: '#14CE6B' }])
  assert.ok(!h.includes('width:100.0%'))
})

test('donut: um arco por fatia com valor', () => {
  const svg = g.donut([{ value: 30, color: '#14CE6B' }, { value: 70, color: '#0AA758' }])
  assert.strictEqual((svg.match(/<circle/g) || []).length, 2)
})

test('donut: total zero desenha o anel vazio', () => {
  const svg = g.donut([{ value: 0, color: '#14CE6B' }])
  assert.ok(svg.includes('#f0f0ee'))
})

test('formata número em pt-BR', () => {
  assert.strictEqual(g.n(1234.6), '1.235')
  assert.strictEqual(g.n('x'), '—')
})

test('escapa rótulo vindo de dado', () => {
  assert.ok(g.barras([{ label: '<script>', value: 1, color: '#000' }]).includes('&lt;script&gt;'))
})
