const { test } = require('node:test')
const assert = require('node:assert')
const O = require('../renderer/elo/tela-operacao')

const kds = { acessoTv: { definido: true, dispositivos: 2 }, pedidos: [
  { numero: 1042, tipo: 'entrega', mesa: null, cliente: 'Rafael Souza', esperaMin: 4, obs: 'portaria', itens: [
    { id: 'k1', qtd: 1, nome: 'Pizza Calabresa G', sabores: [{ nome: 'Calabresa' }], obs: 'sem cebola', estado: 'pendente' },
  ] },
  { numero: 1039, tipo: 'consumo_local', mesa: '7', cliente: 'Mesa 7', esperaMin: 82, obs: null, itens: [
    { id: 'k2', qtd: 2, nome: 'Pizza Portuguesa G', sabores: [], obs: null, estado: 'preparando' },
  ] },
  { numero: 1041, tipo: 'retirada', mesa: null, cliente: 'Johnatan', esperaMin: 9, obs: null, itens: [
    { id: 'k3', qtd: 1, nome: 'Pizza Chocolate M', sabores: [], obs: null, estado: 'pronto' },
  ] },
] }

const mesas = { mesas: [
  { numero: '1', lugares: 4, situacao: 'Livre', desdeMin: 0, consumo: 0, garcom: null },
  { numero: '7', lugares: 6, situacao: 'Ocupada', desdeMin: 48, consumo: 128.5, garcom: 'Ana' },
  { numero: '9', lugares: 2, situacao: 'Conta pedida', desdeMin: 95, consumo: 214.9, garcom: 'Bruno' },
] }

test('KDS: um cartão por PEDIDO, com o número no formato do painel', () => {
  const h = O.htmlKds(kds, { departamento: 'cozinha' })
  assert.ok(h.includes('#1042'), 'o número do pedido é o que a cozinha canta em voz alta')
  assert.ok(h.includes('data-pedido-kds="1039"'))
  assert.ok(h.includes('Pizza Calabresa G'))
})

test('KDS: a etiqueta do canal diz de onde veio o pedido', () => {
  const h = O.htmlKds(kds, { departamento: 'cozinha' })
  assert.ok(h.includes('DELIVERY') && h.includes('MESA 7') && h.includes('RETIRADA'))
})

test('KDS: cada item tem o botão do seu estado, e o pedido tem o "Pedido pronto"', () => {
  const h = O.htmlKds(kds, { departamento: 'cozinha' })
  assert.ok(h.includes('data-acao="kds:iniciar:k1"'), 'item pendente começa com Iniciar')
  assert.ok(h.includes('data-acao="kds:pronto:k2"'), 'item em preparo vira Pronto')
  assert.ok(/PRONTO<\/span>/.test(h), 'item já pronto não oferece botão')
  assert.ok(h.includes('data-acao="kds:pedido-pronto:1042"'))
})

test('KDS: pedido todo pronto avisa e sai da frente', () => {
  const h = O.htmlKds(kds, { departamento: 'cozinha' })
  const cartao = h.split('data-pedido-kds="1041"')[1]
  assert.ok(/Tudo pronto neste departamento/.test(cartao))
  assert.ok(/opacity:\.6/.test(cartao.slice(0, 300)), 'cartão pronto fica apagado')
})

test('KDS: cozinha e bar são a mesma tela em cores diferentes', () => {
  assert.ok(O.htmlKds(kds, { departamento: 'cozinha' }).includes('Fila de Produção — COZINHA'))
  const bar = O.htmlKds(kds, { departamento: 'bar' })
  assert.ok(bar.includes('Fila de Produção — BAR') && bar.includes('#7C3AED'))
})

test('KDS: contagem de pedidos e o acesso pela TV ficam no topo', () => {
  const h = O.htmlKds(kds, { departamento: 'cozinha' })
  assert.ok(h.includes('3 pedidos · atualiza a cada 5s'))
  assert.ok(h.includes('data-acao="kds:tv"'))
})

test('KDS: observação do cliente aparece (é o que erra o pedido)', () => {
  const h = O.htmlKds(kds, { departamento: 'cozinha' })
  assert.ok(h.includes('sem cebola'), 'observação do item')
  assert.ok(h.includes('Obs. do pedido: portaria'), 'observação do pedido')
})

test('KDS: o tempo é o do painel — agora / 38min / 1h', () => {
  assert.strictEqual(O.tempoCurto(0), 'agora')
  assert.strictEqual(O.tempoCurto(38), '38min')
  assert.strictEqual(O.tempoCurto(82), '1h')
})

test('KDS vazio avisa que a cozinha está em dia', () => {
  assert.ok(/em dia/i.test(O.htmlKds({ pedidos: [] }, { departamento: 'cozinha' })))
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
