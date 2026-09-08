const { test } = require('node:test')
const assert = require('node:assert')
const { modoDemonstracao } = require('../src-electron/modo')

test('o beta abre em demonstração — é o app em construção', () => {
  // Sem isto, abrir pelo Dock subia conectado: tela vazia e a página de login do
  // painel por trás, com todo o trabalho montado fora de vista (07/09).
  assert.strictEqual(modoDemonstracao({ shellElo: true, argv: ['/app'], env: {} }), true)
})

test('quem quer o painel de verdade pede: --conectado ou PEDIU_DEMO=0', () => {
  assert.strictEqual(modoDemonstracao({ shellElo: true, argv: ['/app', '--conectado'], env: {} }), false)
  assert.strictEqual(modoDemonstracao({ shellElo: true, argv: ['/app'], env: { PEDIU_DEMO: '0' } }), false)
})

test('o app atual (sem shell elo) NUNCA entra em demonstração', () => {
  assert.strictEqual(modoDemonstracao({ shellElo: false, argv: ['/app'], env: {} }), false)
  assert.strictEqual(modoDemonstracao({ shellElo: false, argv: ['/app', '--demo'], env: {} }), false)
  assert.strictEqual(modoDemonstracao({ shellElo: false, argv: ['/app'], env: { PEDIU_DEMO: '1' } }), false)
})

test('sem argv nem env não quebra', () => {
  assert.strictEqual(modoDemonstracao({ shellElo: true }), true)
})
