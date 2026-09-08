const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../renderer/elo/avisos')

test('o sino conta o que o painel mandou, e nada além', () => {
  assert.strictEqual(A.total({ badges: { pedidos: 5, carrinhos: 2 } }), 7)
  assert.strictEqual(A.total({ badges: {} }), 0)
  assert.strictEqual(A.total(null), 0, 'sem menu, sem bolinha')
})

test('contador zerado não vira aviso — sino com zero é ruído', () => {
  const p = A.pendencias({ badges: { pedidos: 0, carrinhos: 3 } })
  assert.deepStrictEqual(p.map((x) => x.chave), ['carrinhos'])
})

test('cada aviso diz POR QUE importa e leva à tela onde se resolve', () => {
  const h = A.corpo({ badges: { pedidos: 5 } })
  assert.ok(/5 pedidos esperando resposta/.test(h))
  assert.ok(/cliente fica sem previsão/.test(h), 'o motivo tem de estar ali')
  assert.ok(h.includes('data-aviso="/admin/pedidos"'), 'e o caminho para resolver')
})

test('singular e plural, porque "1 pedidos" é desleixo', () => {
  assert.ok(/1 pedido esperando resposta/.test(A.corpo({ badges: { pedidos: 1 } })))
  assert.ok(/2 pedidos esperando/.test(A.corpo({ badges: { pedidos: 2 } })))
  assert.ok(/1 carrinho abandonado</.test(A.corpo({ badges: { carrinhos: 1 } })))
})

test('sem pendência a tela diz isso, em vez de ficar em branco', () => {
  const h = A.corpo({ badges: {} })
  assert.ok(/Nada esperando por você/.test(h))
  assert.ok(!h.includes('data-aviso='), 'e não oferece nada para abrir')
})

test('contador que não é número não vira NaN na tela', () => {
  assert.strictEqual(A.total({ badges: { pedidos: 'muitos' } }), 0)
  assert.ok(!/NaN/.test(A.corpo({ badges: { pedidos: null, carrinhos: undefined } })))
})

test('o shell só mostra a bolinha quando há o que fazer', () => {
  const fs = require('fs')
  const path = require('path')
  const shell = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'shell.js'), 'utf8')
  assert.ok(/bolinha\.style\.display = pendentes > 0 \? 'block' : 'none'/.test(shell))
  assert.ok(/pendentes > 99 \? '99\+'/.test(shell), 'contador grande não estoura o botão')
})
