const { test } = require('node:test')
const assert = require('node:assert')
const { criarMonitor } = require('../src-electron/rede')

test('começa offline e vira online quando o ping responde', async () => {
  const mudancas = []
  const m = criarMonitor({ pingar: async () => true, aoMudar: (v) => mudancas.push(v) })
  assert.strictEqual(m.online(), false)
  await m.checarAgora()
  assert.strictEqual(m.online(), true)
  assert.deepStrictEqual(mudancas, [true])
})

test('não avisa duas vezes o mesmo estado', async () => {
  const mudancas = []
  const m = criarMonitor({ pingar: async () => true, aoMudar: (v) => mudancas.push(v) })
  await m.checarAgora()
  await m.checarAgora()
  assert.deepStrictEqual(mudancas, [true])
})

test('ping que estoura vira offline, sem derrubar o app', async () => {
  const mudancas = []
  const m = criarMonitor({ pingar: async () => { throw new Error('sem rota') }, aoMudar: (v) => mudancas.push(v) })
  await m.checarAgora()
  assert.strictEqual(m.online(), false)
  assert.deepStrictEqual(mudancas, [])
})

test('cai de online para offline quando o ping para de responder', async () => {
  let responde = true
  const mudancas = []
  const m = criarMonitor({ pingar: async () => responde, aoMudar: (v) => mudancas.push(v) })
  await m.checarAgora()
  responde = false
  await m.checarAgora()
  assert.strictEqual(m.online(), false)
  assert.deepStrictEqual(mudancas, [true, false])
})
