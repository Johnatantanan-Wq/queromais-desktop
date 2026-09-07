const { test } = require('node:test')
const assert = require('node:assert')
const { ehNativa, TELAS_NATIVAS } = require('../renderer/elo/shell')

test('a rota do caixa é nativa', () => {
  assert.strictEqual(ehNativa('/admin/caixa'), true)
})

test('rota de módulo ainda não portado não é nativa', () => {
  assert.strictEqual(ehNativa('/admin/cardapio'), false)
  assert.strictEqual(ehNativa('/admin'), false)
})

test('subrota do caixa também é nativa', () => {
  assert.strictEqual(ehNativa('/admin/caixa/historico'), true)
})

test('a lista de telas nativas é explícita (nada de adivinhação)', () => {
  assert.ok(Array.isArray(TELAS_NATIVAS))
  assert.ok(TELAS_NATIVAS.includes('/admin/caixa'))
})

test('offline: só as telas nativas ficam clicáveis', () => {
  const { htmlDoMenu } = require('../renderer/elo/shell')
  const menu = { secoes: [{ titulo: 'Principal', itens: [
    { id: 'caixa', href: '/admin/caixa', label: 'Caixa', icone: '<path d="M1 1"/>' },
    { id: 'cardapio', href: '/admin/cardapio', label: 'Cardápio', icone: '<path d="M1 1"/>' },
  ] }], badges: {} }
  const h = htmlDoMenu(menu, '/admin/caixa', false)
  const caixa = h.split('<div class="erailitem').find(p => p.includes('/admin/caixa'))
  const cardapio = h.split('<div class="erailitem').find(p => p.includes('/admin/cardapio'))
  assert.ok(!caixa.includes(' off'), 'Caixa é nativo: continua clicável sem internet')
  assert.ok(cardapio.includes(' off'), 'Cardápio depende da web: esmaecido sem internet')
})
