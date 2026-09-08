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

test('sem servidor e sem cache, o menu do APP entra no lugar do vazio', async () => {
  // Antes esta chamada devolvia null e a barra lateral subia vazia: nenhuma tela
  // alcançável, nem as que o app desenha sozinho. O menu das telas do app não pode
  // depender do painel responder.
  const r = await buscarMenu({ cache: cacheFalso(), pedirAoPainel: async () => null, lojaId: 'l1' })
  assert.strictEqual(r.offline, true)
  assert.strictEqual(r.base, true, 'a resposta diz que o menu é o do app, não o do painel')
  assert.ok(r.dados && Array.isArray(r.dados.secoes) && r.dados.secoes.length >= 4, 'as seções vêm no menu base')
  const hrefs = r.dados.secoes.flatMap((s) => s.itens.map((i) => i.href))
  for (const t of ['/admin', '/admin/caixa', '/admin/pedidos', '/admin/financeiro']) {
    assert.ok(hrefs.includes(t), 'falta ' + t + ' no menu do app')
  }
})

test('menu do painel MANDA sobre o do app quando o servidor responde', async () => {
  const doPainel = { secoes: [{ titulo: 'Principal', itens: [{ href: '/admin', label: 'Visão geral' }] }], loja: { id: 'l1' } }
  const r = await buscarMenu({ cache: cacheFalso(), pedirAoPainel: async () => doPainel, lojaId: 'l1' })
  assert.strictEqual(r.offline, false)
  assert.ok(!r.base, 'veio do painel, não é o menu base')
  assert.strictEqual(r.dados.secoes.length, 1)
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

test('o menu guardado volta mesmo quando o config ainda não sabe a loja', async () => {
  // O bug de 07/09: gravava em 'menu|<id>' (id vindo do servidor) e lia em
  // 'menu|sem-loja' (config vazio até descobrirLoja rodar). O cache existia em disco
  // e nunca voltava — a barra sumia assim que o painel parava de responder.
  const cache = cacheFalso()
  const doPainel = { secoes: [{ titulo: 'Principal', itens: [{ href: '/admin' }] }], loja: { id: 'loja-77' } }
  await buscarMenu({ cache, pedirAoPainel: async () => doPainel, lojaId: null })

  const depois = await buscarMenu({ cache, pedirAoPainel: async () => null, lojaId: null })
  assert.strictEqual(depois.offline, true)
  assert.ok(!depois.base, 'tinha cache: não é para cair no menu base')
  assert.strictEqual(depois.dados.loja.id, 'loja-77', 'o menu guardado tem de voltar')
})

test('o config manda: trocando de loja, o cache da outra não vaza', async () => {
  const cache = cacheFalso()
  await buscarMenu({
    cache, lojaId: null,
    pedirAoPainel: async () => ({ secoes: [{ titulo: 'A', itens: [] }], loja: { id: 'loja-77' } }),
  })
  // agora o lojista está em outra loja e o painel não responde
  const r = await buscarMenu({ cache, pedirAoPainel: async () => null, lojaId: 'loja-99' })
  assert.strictEqual(r.base, true, 'sem cache da loja-99, entra o menu do app — nunca o da loja-77')
})
