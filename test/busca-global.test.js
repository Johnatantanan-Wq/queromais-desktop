const { test } = require('node:test')
const assert = require('node:assert')
const B = require('../renderer/elo/busca-global')
const menu = require('../src-electron/menu-base').menuBase()

test('acha tela pelo nome, com ou sem acento', () => {
  // Quem digita rápido não põe acento — e teria de achar do mesmo jeito.
  assert.strictEqual(B.achar(menu, 'cardapio')[0].rotulo, 'Cardápio')
  assert.strictEqual(B.achar(menu, 'Cardápio')[0].rotulo, 'Cardápio')
  assert.strictEqual(B.achar(menu, 'GESTAO')[0].rotulo, 'Gestão')
})

test('quem COMEÇA com o termo vem antes de quem só contém', () => {
  // "ca" tem de trazer Caixa antes de Carrinhos e de qualquer coisa com "ca" no meio.
  assert.strictEqual(B.achar(menu, 'ca')[0].rotulo, 'Caixa')
})

test('acha ação, não só tela — é o que o app FAZ', () => {
  const r = B.achar(menu, 'sangria')
  assert.strictEqual(r[0].rotulo, 'Lançar sangria')
  assert.strictEqual(r[0].tipo, 'acao')
  assert.strictEqual(r[0].rota, '/admin/caixa', 'a ação sabe em que tela mora')
  assert.strictEqual(r[0].acao, 'caixa:sangria')
})

test('busca por várias palavras exige todas', () => {
  assert.ok(B.achar(menu, 'gestao pedido').some((i) => i.rotulo === 'Gestão de pedido'))
  assert.deepStrictEqual(B.achar(menu, 'gestao xyz'), [])
})

test('acha pelo que a tela FAZ, não só pelo nome dela', () => {
  // "qr" não está em nenhum rótulo; está no que a ação faz.
  assert.ok(B.achar(menu, 'qr').some((i) => /WhatsApp/.test(i.rotulo)))
  assert.ok(B.achar(menu, 'imprimir').some((i) => /Impress/.test(i.rotulo)))
  assert.ok(B.achar(menu, 'troco').some((i) => /suprimento/i.test(i.rotulo)))
})

test('campo vazio mostra os primeiros, não a lista inteira', () => {
  const r = B.achar(menu, '')
  assert.ok(r.length > 0 && r.length <= 8, 'veio ' + r.length)
  assert.strictEqual(r[0].rotulo, 'Visão geral', 'começa pela primeira tela do menu')
})

test('nada encontrado devolve lista vazia, e a tela explica', () => {
  assert.deepStrictEqual(B.achar(menu, 'zzzzz'), [])
  const h = B.corpo(menu, 'zzzzz', 0)
  assert.ok(/Nada com esse nome/.test(h))
  assert.ok(/sangria|comanda|entregador/.test(h), 'sugere buscar pelo que a tela faz')
})

test('a linha ativa é a que o teclado marcou', () => {
  const h = B.corpo(menu, 'ca', 1)
  const linhas = h.split('data-busca-idx=')
  assert.ok(/var\(--acento-suave\)/.test(linhas[2]), 'a segunda linha está marcada')
  assert.ok(!/var\(--acento-suave\)/.test(linhas[1]), 'e a primeira não')
})

test('sem menu nenhum não quebra — as ações do app continuam achaveis', () => {
  assert.ok(B.achar(null, 'sangria').length > 0)
  assert.ok(B.corpo(null, '', 0).includes('buscaGlobal'))
})

test('o rodapé conta os resultados e ensina as teclas', () => {
  const h = B.corpo(menu, 'ca', 0)
  assert.ok(/\d+ resultados/.test(h))
  assert.ok(/↑↓ navega · Enter abre · Esc fecha/.test(h))
})
