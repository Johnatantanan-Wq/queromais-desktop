const { test } = require('node:test')
const assert = require('node:assert')
const F = require('../renderer/elo/ficha')

const pedido = { numero: '1042', cliente: 'Maria Silva', canal: 'Delivery', hora: '20:12', valor: 89.9,
  pagamento: 'Pix', etapa: 'producao', entrouHaMin: 8, itens: ['1x Pizza Calabresa G', '1x Refrigerante 2L'],
  endereco: 'Rua das Flores, 120 — Centro', telefone: '(75) 98811-0001', taxa: 8, desconto: 5 }

test('a ficha do pedido traz cabeçalho, itens e a conta fechando', () => {
  const h = F.fichaPedido(pedido)
  assert.ok(h.includes('#1042') && h.includes('Maria Silva'))
  assert.ok(h.includes('Pizza Calabresa'))
  assert.ok(h.includes('Entrega') && h.includes('8,00'))
  assert.ok(h.includes('Desconto') && h.includes('5,00'))
  assert.ok(h.includes('89,90'))
})

test('a ficha do pedido tem os botões de ação, incluindo imprimir a comanda', () => {
  const h = F.fichaPedido(pedido)
  assert.ok(h.includes('data-acao="ficha:imprimir:1042"'))
  assert.ok(/imprimir comanda/i.test(h))
})

test('pedido de delivery mostra endereço; de balcão, não', () => {
  assert.ok(F.fichaPedido(pedido).includes('Rua das Flores'))
  const balcao = F.fichaPedido({ ...pedido, canal: 'Balcão', endereco: null })
  assert.ok(!balcao.includes('Rua das Flores'))
})

test('a ficha do cliente traz contato, resumo e últimos pedidos', () => {
  const h = F.fichaCliente({ nome: 'Maria Silva', telefone: '(75) 98811-0001', bairro: 'Centro',
    pedidos: 42, total: 2480.3, ultimo: 'hoje', ultimos: [{ numero: '1042', data: 'hoje', valor: 89.9 }] })
  assert.ok(h.includes('Maria Silva') && h.includes('(75) 98811-0001'))
  assert.ok(h.includes('42') && h.includes('2.480,30'))
  assert.ok(h.includes('#1042'))
})

test('a ficha do produto traz preço, vendas e ficha técnica', () => {
  const h = F.fichaProduto({ nome: 'Pizza Calabresa G', categoria: 'Pizzas salgadas', preco: 59.9,
    vendas7d: 128, situacao: 'Disponível', custo: 18.4, insumos: ['Muçarela 250g', 'Calabresa 120g'] })
  assert.ok(h.includes('Pizza Calabresa G') && h.includes('59,90'))
  assert.ok(h.includes('128'))
  assert.ok(h.includes('Muçarela'))
  assert.ok(/margem/i.test(h))
})

test('o painel embrulha a ficha com título e botão de fechar', () => {
  const h = F.painel('Pedido #1042', '<p>x</p>')
  assert.ok(h.includes('Pedido #1042'))
  assert.ok(h.includes('data-fechar-ficha'))
  assert.ok(h.includes('<p>x</p>'))
})

test('ficha de item que não existe não quebra', () => {
  assert.ok(/não encontrad/i.test(F.fichaPedido(null)))
  assert.ok(/não encontrad/i.test(F.fichaCliente(null)))
})
