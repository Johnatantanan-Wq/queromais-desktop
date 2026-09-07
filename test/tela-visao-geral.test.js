const { test } = require('node:test')
const assert = require('node:assert')
const t = require('../renderer/elo/tela-visao-geral')

const dados = {
  periodo: { de: '2026-09-01', ate: '2026-09-07', rotulo: 'Últimos 7 dias' },
  kpis: {
    faturamento: { atual: 18420.5, anterior: 15900 },
    pedidos: { atual: 312, anterior: 340 },
    ticket: { atual: 59.04, anterior: 46.76 },
  },
  serie: {
    labels: ['01/09', '02/09', '03/09'],
    atual: [2100, 2600, 3010],
    anterior: [1900, 2400, 2200],
  },
  canais: [{ label: 'Delivery', value: 210 }, { label: 'Balcão', value: 72 }, { label: 'Mesa', value: 30 }],
  formas: [{ label: 'Pix', value: 8200 }, { label: 'Cartão', value: 7100 }, { label: 'Dinheiro', value: 3120 }],
  bairros: [{ label: 'Centro', value: 88 }, { label: 'Jardins', value: 54 }],
}

test('os três KPIs aparecem com a variação contra o período anterior', () => {
  const h = t.htmlVisaoGeral(dados, { metrica: 'faturamento', online: true, ts: Date.now() })
  assert.ok(h.includes('18.420,50'))
  assert.ok(h.includes('312'))
  assert.ok(/\+15,8%|\+15,9%/.test(h), 'faturamento subiu ~15,9%: ' + (h.match(/[+-][\d,]+%/g) || []).join(' '))
  assert.ok(h.includes('-8,2%'), 'pedidos caíram 8,2%')
})

test('a métrica escolhida fica marcada e manda o gráfico', () => {
  const h = t.htmlVisaoGeral(dados, { metrica: 'pedidos', online: true, ts: Date.now() })
  const botao = h.split('data-metrica="pedidos"')[1] || ''
  assert.ok(h.includes('data-metrica="pedidos"'))
  assert.ok(/is-on/.test(h.split('data-metrica="pedidos"')[0].slice(-120) + botao.slice(0, 60)))
})

test('o gráfico traz período atual e anterior', () => {
  const h = t.htmlVisaoGeral(dados, { metrica: 'faturamento', online: true, ts: Date.now() })
  assert.strictEqual((h.match(/<path d="M/g) || []).length, 3) // 2 séries + a área da primeira
  assert.ok(h.includes('período anterior'))
})

test('quebra por canal, forma e bairro', () => {
  const h = t.htmlVisaoGeral(dados, { metrica: 'faturamento', online: true, ts: Date.now() })
  assert.ok(h.includes('Delivery') && h.includes('Pix') && h.includes('Centro'))
})

test('sem dado nenhum não inventa número', () => {
  const h = t.htmlVisaoGeral(null, { metrica: 'faturamento', online: false, ts: 0 })
  assert.ok(/sem dados/i.test(h))
  assert.ok(!h.includes('R$ 0,00'))
})

test('variação some quando não há período anterior', () => {
  const semAnterior = { ...dados, kpis: { faturamento: { atual: 100, anterior: 0 }, pedidos: { atual: 1, anterior: 0 }, ticket: { atual: 100, anterior: 0 } } }
  const h = t.htmlVisaoGeral(semAnterior, { metrica: 'faturamento', online: true, ts: Date.now() })
  assert.ok(!h.includes('Infinity') && !h.includes('NaN'))
})

test('variação: cálculo e sinal', () => {
  assert.strictEqual(t.variacao(110, 100).texto, '+10,0%')
  assert.strictEqual(t.variacao(90, 100).texto, '-10,0%')
  assert.strictEqual(t.variacao(100, 100).texto, '0,0%')
  assert.strictEqual(t.variacao(50, 0).texto, '')
  assert.strictEqual(t.variacao(110, 100).subiu, true)
})
