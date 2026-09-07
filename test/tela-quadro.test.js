const { test } = require('node:test')
const assert = require('node:assert')
const Q = require('../renderer/elo/tela-quadro')

const dados = {
  itens: [
    { numero: '1042', cliente: 'Maria Silva', canal: 'Delivery', etapa: 'aguardando', valor: 89.90, entrouHaMin: 3, itens: ['1x Pizza Calabresa G', '1x Refrigerante 2L'], pagamento: 'Pix' },
    { numero: '1039', cliente: 'Mesa 7', canal: 'Mesa', etapa: 'producao', valor: 128.50, entrouHaMin: 26, itens: ['2x Pizza Portuguesa G'], pagamento: 'Na entrega' },
    { numero: '1041', cliente: 'João Pereira', canal: 'Balcão', etapa: 'pronto', valor: 54.00, entrouHaMin: 12, itens: ['1x Pizza Chocolate M'], pagamento: 'Cartão' },
    { numero: '1040', cliente: 'Carla Nunes', canal: 'Delivery', etapa: 'transito', valor: 132.40, entrouHaMin: 41, itens: ['3x itens'], pagamento: 'Dinheiro' },
  ],
}

test('desenha as três colunas padrão, com contador', () => {
  const h = Q.htmlQuadro(dados, { extras: false })
  assert.ok(h.includes('Em análise') && h.includes('Em produção') && h.includes('Prontos'))
  assert.ok(!h.includes('Em trânsito'), 'as extras ficam ocultas por padrão')
})

test('as colunas extras entram quando ligadas', () => {
  const h = Q.htmlQuadro(dados, { extras: true })
  assert.ok(h.includes('Em trânsito') && h.includes('Entregue'))
})

test('o cartão traz número, cliente, valor, itens e a próxima ação da etapa', () => {
  const h = Q.htmlQuadro(dados, { extras: false })
  assert.ok(h.includes('#1042') && h.includes('Maria Silva') && h.includes('89,90'))
  assert.ok(h.includes('Pizza Calabresa'))
  assert.ok(h.includes('Iniciar produção'), 'quem está em análise vai para produção')
  assert.ok(h.includes('Marcar pronto'), 'quem está em produção vai para pronto')
})

test('o tempo aparece e destaca quem está esperando demais', () => {
  const h = Q.htmlQuadro(dados, { extras: false })
  assert.ok(h.includes('3 min') && h.includes('26 min'))
  const cartao26 = h.split('data-pedido="1039"')[1].slice(0, 700)
  assert.ok(/b42318/.test(cartao26), 'pedido parado há 26 min precisa gritar')
  assert.ok(!/box-shadow/.test(cartao26), 'sem anel em volta: o destaque é faixa, não moldura')
})

test('coluna vazia diz que está vazia, sem cartão fantasma', () => {
  const h = Q.htmlQuadro({ itens: [] }, { extras: false })
  assert.ok(/nenhum pedido/i.test(h))
})

test('consumo local troca os rótulos das colunas', () => {
  const h = Q.htmlQuadro(dados, { extras: true, consumoLocal: true })
  assert.ok(h.includes('Novos pedidos') && h.includes('Em preparo') && h.includes('Prontos para servir'))
  assert.ok(!h.includes('Prontos para entrega'))
})

test('cada cartão carrega o número, para o clique saber qual pedido é', () => {
  const h = Q.htmlQuadro(dados, { extras: false })
  assert.ok(h.includes('data-pedido="1042"'))
})

test('sem dado nenhum não quebra', () => {
  assert.ok(/sem dados/i.test(Q.htmlQuadro(null, {})))
})

test('tempo em horas quando passa de 60 min', () => {
  assert.strictEqual(Q.tempoDeEspera(5), '5 min')
  assert.strictEqual(Q.tempoDeEspera(75), '1 h 15')
  assert.strictEqual(Q.tempoDeEspera(120), '2 h')
})
