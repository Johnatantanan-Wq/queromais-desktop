const { test } = require('node:test')
const assert = require('node:assert')
const { ehNativa, TELAS_NATIVAS } = require('../renderer/elo/shell')

test('a rota do caixa é nativa', () => {
  assert.strictEqual(ehNativa('/admin/caixa'), true)
})

test('rota de módulo ainda não portado não é nativa', () => {
  assert.strictEqual(ehNativa('/admin/configuracoes'), false)
  assert.strictEqual(ehNativa('/admin/insights'), false)
  assert.strictEqual(ehNativa('/admin/relatorios'), false)
})

test('a Visão geral (/admin) é nativa, mas seu prefixo não arrasta as outras', () => {
  // '/admin' é prefixo de TODAS as rotas do painel: se casasse por prefixo, cada
  // módulo web viraria "nativo" e abriria uma tela vazia.
  assert.strictEqual(ehNativa('/admin'), true)
  assert.strictEqual(ehNativa('/admin/food-marketing/push'), false)
  assert.strictEqual(ehNativa('/admin/relatorios'), false)
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
    { id: 'config', href: '/admin/configuracoes', label: 'Configurações', icone: '<path d="M1 1"/>' },
  ] }], badges: {} }
  const h = htmlDoMenu(menu, '/admin/caixa', false)
  const caixa = h.split('<div class="erailitem').find(p => p.includes('/admin/caixa'))
  const cardapio = h.split('<div class="erailitem').find(p => p.includes('/admin/configuracoes'))
  assert.ok(!caixa.includes(' off'), 'Caixa é nativo: continua clicável sem internet')
  assert.ok(cardapio.includes(' off'), 'Configurações ainda depende da web: esmaecida sem internet')
})

test('o título da topbar segue o item do menu, inclusive na Visão geral', () => {
  const { tituloDaRota } = require('../renderer/elo/shell')
  const menu = { secoes: [{ titulo: 'Principal', itens: [
    { id: 'dashboard', href: '/admin', label: 'Visão geral', icone: '<path d="M1 1"/>' },
    { id: 'caixa', href: '/admin/caixa', label: 'Caixa', icone: '<path d="M1 1"/>' },
  ] }] }
  assert.strictEqual(tituloDaRota(menu, '/admin'), 'Visão geral')
  assert.strictEqual(tituloDaRota(menu, '/admin/caixa'), 'Caixa')
  // rota do painel que o app não conhece não vira título estranho
  assert.strictEqual(tituloDaRota(menu, '/admin/login'), 'Painel')
})
