const { test } = require('node:test')
const assert = require('node:assert')
const { ehNativa, TELAS_NATIVAS } = require('../renderer/elo/shell')

test('a rota do caixa é nativa', () => {
  assert.strictEqual(ehNativa('/admin/caixa'), true)
})

test('rota que o app não desenha não é nativa', () => {
  // todo o menu já é nativo; o que sobra são rotas do painel fora do menu
  assert.strictEqual(ehNativa('/admin/login'), false)
  assert.strictEqual(ehNativa('/admin/escolher-loja'), false)
  assert.strictEqual(ehNativa('/admin/modulo-que-ainda-nao-existe'), false)
})

test('a Visão geral (/admin) é nativa, mas seu prefixo não arrasta as outras', () => {
  // '/admin' é prefixo de TODAS as rotas do painel: se casasse por prefixo, cada
  // módulo web viraria "nativo" e abriria uma tela vazia.
  assert.strictEqual(ehNativa('/admin'), true)
  assert.strictEqual(ehNativa('/admin/login'), false)
  assert.strictEqual(ehNativa('/admin/qualquer-outra'), false)
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
    { id: 'novo', href: '/admin/modulo-novo', label: 'Módulo novo', icone: '<path d="M1 1"/>' },
  ] }], badges: {} }
  const h = htmlDoMenu(menu, '/admin/caixa', false)
  const caixa = h.split('<div class="erailitem').find(p => p.includes('/admin/caixa'))
  const cardapio = h.split('<div class="erailitem').find(p => p.includes('/admin/modulo-novo'))
  assert.ok(!caixa.includes(' off'), 'Caixa é nativo: continua clicável sem internet')
  assert.ok(cardapio.includes(' off'), 'módulo sem tela nativa fica esmaecido sem internet')
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
