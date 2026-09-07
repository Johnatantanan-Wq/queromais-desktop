const { test } = require('node:test')
const assert = require('node:assert')
const O = require('../renderer/elo/tela-operacao')

const kds = { itens: [
  { pedido: '1042', item: '1x Pizza Calabresa G', obs: 'sem cebola', estado: 'fazer', esperaMin: 4, canal: 'Delivery' },
  { pedido: '1039', item: '2x Pizza Portuguesa G', obs: '', estado: 'fazendo', esperaMin: 22, canal: 'Mesa 7' },
  { pedido: '1041', item: '1x Pizza Chocolate M', obs: '', estado: 'pronto', esperaMin: 9, canal: 'Balcão' },
] }

const mesas = { mesas: [
  { numero: '1', lugares: 4, situacao: 'Livre', desdeMin: 0, consumo: 0, garcom: null },
  { numero: '7', lugares: 6, situacao: 'Ocupada', desdeMin: 48, consumo: 128.5, garcom: 'Ana' },
  { numero: '9', lugares: 2, situacao: 'Conta pedida', desdeMin: 95, consumo: 214.9, garcom: 'Bruno' },
] }

test('KDS: três colunas de produção com contagem', () => {
  const h = O.htmlKds(kds, { titulo: 'Cozinha' })
  assert.ok(h.includes('A fazer') && h.includes('Fazendo') && h.includes('Pronto'))
  assert.ok(h.includes('Pizza Calabresa'))
})

test('KDS: item esperando demais fica em destaque', () => {
  const h = O.htmlKds(kds, { titulo: 'Cozinha' })
  const card = h.split('data-item="1039"')[1].slice(0, 500)
  assert.ok(/b42318/.test(card), 'item parado há 22 min precisa gritar')
})

test('KDS: observação do cliente aparece (é o que erra o pedido)', () => {
  assert.ok(O.htmlKds(kds, { titulo: 'Cozinha' }).includes('sem cebola'))
})

test('KDS vazio avisa que a cozinha está em dia', () => {
  assert.ok(/em dia|nada/i.test(O.htmlKds({ itens: [] }, { titulo: 'Cozinha' })))
})

test('Mesas: mostra situação, tempo e consumo', () => {
  const h = O.htmlMesas(mesas, {})
  assert.ok(h.includes('Mesa 7') || h.includes('7'))
  assert.ok(h.includes('128,50'))
  assert.ok(h.includes('Conta pedida'))
})

test('Mesas: no cartão da mesa livre não aparece consumo nem tempo', () => {
  const h = O.htmlMesas({ mesas: [mesas.mesas[0]] }, {})
  const cartao = h.split('data-mesa="1"')[1].split('</div></div>')[0]
  assert.ok(cartao.includes('Livre'))
  assert.ok(!cartao.includes('R$'), 'cartão de mesa livre não exibe valor: ' + cartao)
})

test('Mesas: KPIs de ocupação', () => {
  const h = O.htmlMesas(mesas, {})
  assert.ok(/ocupa/i.test(h))
})

test('sem dados, as duas telas avisam em vez de desenhar vazio', () => {
  assert.ok(/sem dados/i.test(O.htmlKds(null, {})))
  assert.ok(/sem dados/i.test(O.htmlMesas(null, {})))
})

test('mesa reservada também não mostra valor (não há conta aberta)', () => {
  const h = O.htmlMesas({ mesas: [{ numero: '5', lugares: 4, situacao: 'Reservada', desdeMin: 0, consumo: 0, garcom: null }] }, {})
  const cartao = h.split('data-mesa="5"')[1].split('</div></div>')[0]
  assert.ok(cartao.includes('Reservada'))
  assert.ok(!cartao.includes('R$'), 'reservada sem consumo não exibe valor')
})
