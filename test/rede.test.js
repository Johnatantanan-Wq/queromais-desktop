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

// ── Três estados, não dois (achado abrindo o app conectado, 11/09/2026) ────
// "Conectado" e "sem internet" não bastam: com a sessão do painel expirada o servidor
// RESPONDE (401), a rede está ótima e TODAS as telas vêm vazias. O app dizia
// "conectado" com "Sem dados ainda" em cada tela, e o lojista não tinha como descobrir
// que o que faltava era ENTRAR.
const Shell = require('../renderer/elo/shell')
const Acoes = require('../renderer/elo/acoes')

test('401 e 403 contam como conectado — o servidor respondeu', async () => {
  // O ping olha o STATUS, não o ok: tratar 401 como queda faria o app dizer "sem
  // internet" com a internet funcionando.
  for (const status of [200, 401, 403, 404]) {
    const m = criarMonitor({ pingar: async () => status > 0 && status < 500 })
    assert.strictEqual(await m.checarAgora(), true, 'status ' + status)
  }
  for (const status of [0, 500, 502]) {
    const m = criarMonitor({ pingar: async () => status > 0 && status < 500 })
    assert.strictEqual(await m.checarAgora(), false, 'status ' + status)
  }
})

test('o botão de entrar de novo não morre calado', () => {
  const d = Acoes.destinoDe('sessao:entrar')
  assert.ok(d, 'sem destino o clique não devolve nada')
  assert.strictEqual(d.app, 'sessao-entrar', 'é o app que leva para o login, não uma rota qualquer')
})
