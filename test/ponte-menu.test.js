const { test } = require('node:test')
const assert = require('node:assert')
const { buscarMenu } = require('../src-electron/ponte')

const cacheFalso = () => {
  const dados = new Map()
  return {
    set: (k, v) => { dados.set(k, { ...v, ts: 1 }); return { ok: true } },
    get: (k) => dados.get(k) ?? null,
    meta: (k) => (dados.has(k) ? { ts: 1 } : null),
  }
}

test('resposta boa do servidor é devolvida e guardada no cache', async () => {
  const cache = cacheFalso()
  const r = await buscarMenu({ cache, pedirAoPainel: async () => ({ secoes: [{ titulo: 'Principal', itens: [] }], loja: { id: 'l1' } }) })
  assert.strictEqual(r.offline, false)
  assert.strictEqual(r.dados.secoes.length, 1)
  assert.ok(cache.get('menu|l1'))
})

test('servidor mudo devolve o cache marcado como offline', async () => {
  const cache = cacheFalso()
  cache.set('menu|l1', { status: 200, body: { secoes: [{ titulo: 'Principal', itens: [] }], loja: { id: 'l1' } } })
  const r = await buscarMenu({ cache, pedirAoPainel: async () => null, lojaId: 'l1' })
  assert.strictEqual(r.offline, true)
  assert.strictEqual(r.dados.secoes.length, 1)
  assert.strictEqual(r.ts, 1)
})

test('sem servidor e sem cache devolve vazio, não quebra', async () => {
  const r = await buscarMenu({ cache: cacheFalso(), pedirAoPainel: async () => null, lojaId: 'l1' })
  assert.strictEqual(r.offline, true)
  assert.strictEqual(r.dados, null)
})

test('erro na chamada ao painel cai no cache, sem lançar', async () => {
  const cache = cacheFalso()
  cache.set('menu|l1', { status: 200, body: { secoes: [], loja: { id: 'l1' } } })
  const r = await buscarMenu({ cache, pedirAoPainel: async () => { throw new Error('view destruída') }, lojaId: 'l1' })
  assert.strictEqual(r.offline, true)
  assert.ok(r.dados)
})

test('resposta malformada do servidor não sobrescreve o cache bom', async () => {
  const cache = cacheFalso()
  cache.set('menu|l1', { status: 200, body: { secoes: [{ titulo: 'Principal', itens: [] }], loja: { id: 'l1' } } })
  const r = await buscarMenu({ cache, pedirAoPainel: async () => ({ error: 'sem sessão' }), lojaId: 'l1' })
  assert.strictEqual(r.offline, true)
  assert.strictEqual(r.dados.secoes.length, 1)
})
