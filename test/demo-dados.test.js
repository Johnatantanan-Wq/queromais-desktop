const { test } = require('node:test')
const assert = require('node:assert')
const demo = require('../src-electron/demo-dados')

test('o menu de demonstração tem as mesmas seções do painel', () => {
  const m = demo.menu()
  assert.ok(m.secoes.length >= 4)
  const ids = m.secoes.flatMap(s => s.itens.map(i => i.id))
  assert.ok(ids.includes('dashboard') && ids.includes('caixa') && ids.includes('financeiro'))
  assert.strictEqual(ids.length, 22)
})

test('todo item do menu demo tem ícone e rota', () => {
  for (const s of demo.menu().secoes) {
    for (const i of s.itens) {
      assert.ok(i.icone.startsWith('<'), i.id + ' sem ícone')
      assert.ok(i.href.startsWith('/admin'), i.id + ' sem rota')
    }
  }
})

test('a loja de demonstração se identifica como fictícia', () => {
  const m = demo.menu()
  assert.match(m.loja.nome, /demonstra/i)
})

test('o caixa de demonstração bate: esperado = fundo + dinheiro + suprimento - sangria', () => {
  const c = demo.caixa()
  const soma = c.aberto.fundoInicial + c.resumo.vendaDinheiro + c.resumo.suprimentos - c.resumo.sangrias
  assert.strictEqual(c.esperadoDinheiro, Math.round(soma * 100) / 100)
})

test('o caixa demo tem movimentação estornada, para exercitar esse caso', () => {
  assert.ok(demo.caixa().movimentacoes.some(m => m.estornada))
})

test('os dados demo são recriados a cada chamada (ninguém muta o original)', () => {
  const a = demo.caixa()
  a.movimentacoes.length = 0
  assert.ok(demo.caixa().movimentacoes.length > 0)
})
