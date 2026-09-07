const { test } = require('node:test')
const assert = require('node:assert')
const D = require('../renderer/elo/tela-despacho')

const dados = {
  prontos: [
    { pedido: '7', cliente: 'Ilzadora', bairro: 'Areal', esperaMin: 36, forma: 'pix', pago: true, valor: 28.99 },
    { pedido: '10', cliente: 'Franciele Silva', bairro: 'Centro', esperaMin: 29, forma: 'cartao', pago: false, valor: 66.97 },
    { pedido: '132', cliente: 'Ana Souza', bairro: 'São Félix', esperaMin: 12, forma: 'pix', pago: true, valor: 139.80 },
    { pedido: '133', cliente: 'Bruno Lima', bairro: 'São Félix', esperaMin: 9, forma: 'dinheiro', pago: true, valor: 74.90 },
  ],
  emTransito: [
    { entregador: 'Tiago Moura', entregas: 2, dinheiroAReceber: 197.30, esperadoDeVolta: 247.30, rotaId: 'r1' },
  ],
  entregadores: ['Tiago Moura', 'Wesley Barros'],
}

test('agrupa por bairro, com total e botão de despachar o bairro inteiro', () => {
  const h = D.htmlDespacho(dados, { visao: 'bairro' })
  assert.ok(h.includes('São Félix') && h.includes('2 pedidos'))
  assert.ok(h.includes('data-acao="despachar-bairro:São Félix"'))
  assert.ok(h.includes('Areal') && h.includes('1 pedido'))
})

test('cada pedido tem caixa de seleção e select de entregador', () => {
  const h = D.htmlDespacho(dados, { visao: 'bairro' })
  assert.ok(h.includes('data-sel="7"'))
  assert.ok(h.includes('data-entregador-de="7"'))
  assert.ok(h.includes('Tiago Moura') && h.includes('Wesley Barros'))
})

test('pedido pago mostra PAGO; a receber mostra o valor a cobrar', () => {
  const h = D.htmlDespacho(dados, { visao: 'bairro' })
  const linhaPago = h.split('data-pedido-linha="7"')[1].split('data-pedido-linha=')[0]
  const linhaReceber = h.split('data-pedido-linha="10"')[1].split('data-pedido-linha=')[0]
  assert.ok(/PAGO/.test(linhaPago))
  assert.ok(/A RECEBER/.test(linhaReceber) && /66,97/.test(linhaReceber))
})

test('a visão Lista não agrupa por bairro', () => {
  const h = D.htmlDespacho(dados, { visao: 'lista' })
  assert.ok(!h.includes('data-acao="despachar-bairro:Areal"'))
  assert.ok(h.includes('#132'))
})

test('Em trânsito mostra por entregador o dinheiro a receber e o esperado de volta', () => {
  const h = D.htmlDespacho(dados, { visao: 'bairro' })
  assert.ok(/Em tr[âa]nsito/.test(h))
  assert.ok(h.includes('Tiago Moura') && h.includes('197,30') && h.includes('247,30'))
  assert.ok(h.includes('data-acao="rota:fechar:r1"'))
})

test('sem ninguém na rua, a seção diz isso', () => {
  const h = D.htmlDespacho({ ...dados, emTransito: [] }, { visao: 'bairro' })
  assert.ok(/nada aqui|ningu[ée]m na rua/i.test(h))
})

test('a espera longa fica em vermelho', () => {
  const h = D.htmlDespacho({ ...dados, prontos: [{ ...dados.prontos[0], esperaMin: 55 }] }, { visao: 'bairro' })
  assert.ok(/b42318/.test(h))
})

test('nada pronto para entrega avisa em vez de tabela vazia', () => {
  const h = D.htmlDespacho({ ...dados, prontos: [] }, { visao: 'bairro' })
  assert.ok(/nenhum pedido pronto/i.test(h))
})
