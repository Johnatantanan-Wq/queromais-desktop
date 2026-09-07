const { test } = require('node:test')
const assert = require('node:assert')
const { calcularBounds } = require('../src-electron/layout-views')

const janela = { largura: 1400, altura: 900 }

test('a view nunca invade a sidebar nem o topo', () => {
  const b = calcularBounds({ ...janela, sidebarW: 252, topoH: 118, modo: 'cardapio' })
  assert.strictEqual(b.cardapio.x, 252)
  assert.strictEqual(b.cardapio.y, 118)
  assert.strictEqual(b.cardapio.width, 1400 - 252)
  assert.strictEqual(b.cardapio.height, 900 - 118)
})

test('sidebar recolhida devolve a largura ao conteúdo', () => {
  const b = calcularBounds({ ...janela, sidebarW: 76, topoH: 118, modo: 'cardapio' })
  assert.strictEqual(b.cardapio.x, 76)
  assert.strictEqual(b.cardapio.width, 1400 - 76)
})

test('tela dividida não sobrepõe as duas views', () => {
  const b = calcularBounds({ ...janela, sidebarW: 252, topoH: 118, modo: 'split', splitRatio: 0.7, handleW: 6 })
  assert.ok(b.cardapio.x + b.cardapio.width <= b.whatsapp.x)
  assert.strictEqual(b.whatsapp.x + b.whatsapp.width, 1400)
})

test('janela estreita não gera largura negativa', () => {
  const b = calcularBounds({ largura: 300, altura: 200, sidebarW: 252, topoH: 118, modo: 'split', splitRatio: 0.7, handleW: 6 })
  assert.ok(b.cardapio.width >= 200)
  assert.ok(b.whatsapp.width >= 200)
})
