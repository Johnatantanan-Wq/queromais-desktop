const { test } = require('node:test')
const assert = require('node:assert')
const { tonsDoAcento } = require('../renderer/elo/shell')

test('deriva os quatro tons de uma cor de marca', () => {
  const t = tonsDoAcento('#14CE6B')
  assert.strictEqual(t.base, '#14CE6B')
  for (const k of ['escuro', 'suave', 'texto', 'linha']) assert.match(t[k], /^#[0-9a-f]{6}$/i)
})

test('o tom suave é bem claro e o texto bem escuro (contraste no item ativo)', () => {
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
  }
  const t = tonsDoAcento('#14CE6B')
  assert.ok(lum(t.suave) > 0.85, 'suave deve ser quase branco, veio ' + t.suave)
  assert.ok(lum(t.texto) < 0.45, 'texto deve ser escuro, veio ' + t.texto)
})

test('marca laranja (Quero Mais) gera tons laranja, não verde', () => {
  const t = tonsDoAcento('#F97316')
  const r = parseInt(t.texto.slice(1, 3), 16), g = parseInt(t.texto.slice(3, 5), 16)
  assert.ok(r > g, 'o vermelho deve dominar num laranja escurecido: ' + t.texto)
})

test('valores explícitos no brand.json vencem o cálculo', () => {
  const t = tonsDoAcento('#14CE6B', { texto: '#0A7A3E', suave: '#E7FAF0' })
  assert.strictEqual(t.texto, '#0A7A3E')
  assert.strictEqual(t.suave, '#E7FAF0')
  assert.strictEqual(t.base, '#14CE6B')
})

test('cor inválida não quebra: cai no verde padrão', () => {
  assert.strictEqual(tonsDoAcento('').base, '#14CE6B')
  assert.strictEqual(tonsDoAcento(null).base, '#14CE6B')
})
