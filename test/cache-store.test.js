const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { makeStore } = require('../src-electron/cache-store')

const dirTemp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pediu-cache-'))
// adapter de teste: "cifra" invertendo os bytes — prova que a leitura decifra
const storageFake = {
  available: () => true,
  encrypt: (s) => Buffer.from(s, 'utf8').map(b => 255 - b),
  decrypt: (b) => Buffer.from(Buffer.from(b).map(x => 255 - x)).toString('utf8'),
}

test('grava e lê pela chave', () => {
  const store = makeStore(dirTemp(), storageFake)
  store.set('menu|loja-1', { status: 200, body: { secoes: [1, 2] } })
  const lido = store.get('menu|loja-1')
  assert.deepStrictEqual(lido.body, { secoes: [1, 2] })
  assert.strictEqual(lido.status, 200)
  assert.ok(lido.ts > 0)
})

test('chave inexistente devolve null', () => {
  assert.strictEqual(makeStore(dirTemp(), storageFake).get('nao-existe'), null)
})

test('o arquivo em disco não guarda o conteúdo em texto claro', () => {
  const dir = dirTemp()
  makeStore(dir, storageFake).set('k', { status: 200, body: { segredo: 'pizza' } })
  const arquivo = path.join(dir, fs.readdirSync(dir)[0])
  assert.ok(!fs.readFileSync(arquivo, 'utf8').includes('pizza'))
})

test('sem cifra disponível grava com marca PLAIN: e ainda lê', () => {
  const dir = dirTemp()
  const semCifra = { available: () => false }
  const store = makeStore(dir, semCifra)
  store.set('k', { status: 200, body: { a: 1 } })
  const arquivo = path.join(dir, fs.readdirSync(dir)[0])
  assert.ok(fs.readFileSync(arquivo, 'utf8').startsWith('PLAIN:'))
  assert.deepStrictEqual(store.get('k').body, { a: 1 })
})

test('meta devolve só o carimbo de tempo', () => {
  const store = makeStore(dirTemp(), storageFake)
  store.set('k', { status: 200, body: {} })
  const m = store.meta('k')
  assert.ok(m.ts > 0)
  assert.strictEqual(m.body, undefined)
})
