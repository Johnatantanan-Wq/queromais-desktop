const { test } = require('node:test')
const assert = require('node:assert')
const K = require('../src-electron/kds-acoes')

test('a fila anda numa direção só: na fila → preparando → pronto', () => {
  assert.strictEqual(K.avancarItem({ id: 'c1', estado: 'pendente' }).corpo.status, 'preparando')
  assert.strictEqual(K.avancarItem({ id: 'c1', estado: 'preparando' }).corpo.status, 'pronto')
  const pronto = K.avancarItem({ id: 'c1', estado: 'pronto' })
  assert.strictEqual(pronto.ok, false, 'de pronto não se avança — voltar é conversa no painel')
})

test('item sem estado começa na fila', () => {
  assert.strictEqual(K.avancarItem({ id: 'c1' }).corpo.status, 'preparando')
})

test('a rota é por ITEM, e o id vai nela', () => {
  assert.strictEqual(K.avancarItem({ id: 'abc-123', estado: 'pendente' }).caminho,
    '/api/admin/fila/item/abc-123')
})

test('item sem id não vira chamada com "undefined" na URL', () => {
  const r = K.avancarItem({ estado: 'pendente' })
  assert.strictEqual(r.ok, false)
  assert.ok(!/undefined/.test(r.motivo))
})

test('"pedido pronto" marca só o que falta, um por item', () => {
  const r = K.pedidoPronto({ itens: [
    { id: 'a', estado: 'pendente' }, { id: 'b', estado: 'pronto' }, { id: 'c', estado: 'preparando' },
  ] })
  assert.strictEqual(r.chamadas.length, 2, 'o que já estava pronto não é remarcado')
  assert.deepStrictEqual(r.chamadas.map((c) => c.caminho),
    ['/api/admin/fila/item/a', '/api/admin/fila/item/c'])
  assert.ok(/2 itens/.test(r.resumo))
})

test('um item só fala no singular', () => {
  const r = K.pedidoPronto({ itens: [{ id: 'a', estado: 'pendente' }] })
  assert.ok(/^Item marcado/.test(r.resumo), r.resumo)
})

test('pedido já pronto avisa em vez de mandar chamada vazia', () => {
  const r = K.pedidoPronto({ itens: [{ id: 'a', estado: 'pronto' }] })
  assert.strictEqual(r.ok, false)
  assert.ok(/já estão prontos/.test(r.motivo))
})

test('item sem id no meio do pedido barra tudo — melhor não marcar pela metade', () => {
  const r = K.pedidoPronto({ itens: [{ id: 'a', estado: 'pendente' }, { estado: 'pendente' }] })
  assert.strictEqual(r.ok, false)
  assert.ok(/sem identificação/.test(r.motivo))
})
