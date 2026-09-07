// Cache de leitura cifrado em disco, por chave (portado de OVD-VENDAS/capa/cache-store.js).
// É o que permite a tela abrir sem internet: a resposta boa fica guardada com carimbo
// de tempo, e a tela mostra a idade do dado em vez de uma tela vazia.
// A cifra vem de um adapter injetado (safeStorage no app) — mantém o módulo testável
// em node puro. Escrita atômica: arquivo temporário + rename, para nunca ler pela metade.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function keyToFile(dir, key) {
  return path.join(dir, crypto.createHash('sha1').update('' + key).digest('hex') + '.bin')
}

// storage = { available():bool, encrypt(str):Buffer, decrypt(buf):str }
function makeStore(dir, storage) {
  try { fs.mkdirSync(dir, { recursive: true }) } catch (e) {}

  function writeAtomic(file, buf) {
    const tmp = file + '.tmp-' + process.pid + '-' + Date.now()
    fs.writeFileSync(tmp, buf)
    fs.renameSync(tmp, file)
  }

  function set(key, value) {
    try {
      const json = JSON.stringify({ body: value && value.body, status: value && value.status, ts: Date.now() })
      const buf = (storage && storage.available())
        ? Buffer.from(storage.encrypt(json))
        : Buffer.from('PLAIN:' + json, 'utf8')
      writeAtomic(keyToFile(dir, key), buf)
      return { ok: true }
    } catch (e) { return { ok: false, erro: String(e) } }
  }

  function get(key) {
    try {
      const f = keyToFile(dir, key)
      if (!fs.existsSync(f)) return null
      const buf = fs.readFileSync(f)
      let json
      if (buf.slice(0, 6).toString('utf8') === 'PLAIN:') json = buf.slice(6).toString('utf8')
      else if (storage && storage.available()) json = storage.decrypt(buf)
      else return null
      return JSON.parse(json)
    } catch (e) { return null }
  }

  function meta(key) { const v = get(key); return v ? { ts: v.ts } : null }

  return { set, get, meta }
}

module.exports = { makeStore, keyToFile }
