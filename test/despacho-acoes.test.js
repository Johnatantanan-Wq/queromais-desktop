const { test } = require('node:test')
const assert = require('node:assert')
const { despachar } = require('../src-electron/despacho-acoes')
const { criarRegistro } = require('../src-electron/despacho-local')

const ENT = [
  { id: '11111111-1111-4111-8111-111111111111', nome: 'Tiago' },
  { id: '22222222-2222-4222-8222-222222222222', nome: 'Wesley' },
]
const PED = [
  { id: 'p1', pedido: '7', trocoPara: 50, pago: false, valor: 28.99 },
  { id: 'p2', pedido: '10', pago: true, valor: 66.97 },
  { id: 'p3', pedido: '132', pago: false, valor: 139.8 },
]

test('despacha por uuid do entregador, com o troco de cada pedido', () => {
  const r = despachar({ pedidos: PED.slice(0, 1), entregadorDe: { 7: 'Tiago' }, entregadores: ENT })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.chamadas.length, 1)
  assert.deepStrictEqual(r.chamadas[0].corpo, {
    motoboy_id: ENT[0].id, fundo_troco: 0, itens: [{ pedido_id: 'p1', troco_para: 50 }],
  })
  assert.ok(/1 pedido com Tiago/.test(r.resumo))
})

test('vários pedidos, entregadores diferentes → uma chamada por entregador', () => {
  const r = despachar({ pedidos: PED, entregadorDe: { 7: 'Tiago', 10: 'Tiago', 132: 'Wesley' }, entregadores: ENT })
  assert.strictEqual(r.chamadas.length, 2)
  assert.strictEqual(r.chamadas[0].corpo.itens.length, 2)
  assert.strictEqual(r.chamadas[1].corpo.itens.length, 1)
  assert.ok(/3 pedidos em 2 rotas/.test(r.resumo))
})

test('pedido sem entregador escolhido é recusado AQUI, dizendo qual', () => {
  const r = despachar({ pedidos: PED, entregadorDe: { 7: 'Tiago' }, entregadores: ENT })
  assert.strictEqual(r.ok, false)
  assert.ok(/#10, #132/.test(r.motivo), r.motivo)
})

test('pedido sem id não vira chamada com "undefined"', () => {
  const r = despachar({ pedidos: [{ pedido: '9' }], entregadorDe: { 9: 'Tiago' }, entregadores: ENT })
  assert.strictEqual(r.ok, false)
  assert.ok(/#9/.test(r.motivo) && !/undefined/.test(r.motivo))
})

test('troco não combinado vai como null — não como zero', () => {
  const r = despachar({ pedidos: PED.slice(1, 2), entregadorDe: { 10: 'Wesley' }, entregadores: ENT })
  assert.strictEqual(r.chamadas[0].corpo.itens[0].troco_para, null)
})

test('lista vazia não sai', () => {
  assert.strictEqual(despachar({ pedidos: [], entregadorDe: {}, entregadores: ENT }).ok, false)
})

test('a tela pode guardar o id direto em vez do nome', () => {
  const r = despachar({ pedidos: PED.slice(0, 1), entregadorDe: { 7: ENT[1].id }, entregadores: ENT })
  assert.strictEqual(r.chamadas[0].corpo.motoboy_id, ENT[1].id)
})

// ── demonstração ──
test('em demonstração o pedido sai de "prontos" e o entregador ganha a linha', () => {
  const reg = criarRegistro()
  const r = despachar({ pedidos: PED.slice(0, 2), entregadorDe: { 7: 'Tiago', 10: 'Tiago' }, entregadores: ENT })
  reg.despachar(r.chamadas, PED)
  const d = reg.aplicar({ prontos: PED, emTransito: [] })
  assert.deepStrictEqual(d.prontos.map((p) => p.pedido), ['132'])
  assert.strictEqual(d.emTransito.length, 1)
  assert.strictEqual(d.emTransito[0].entregas, 2)
  // só o NÃO pago é dinheiro que o entregador recebe na porta
  assert.strictEqual(d.emTransito[0].dinheiroAReceber, 28.99)
})

test('entregador que já está na rua soma em vez de duplicar a linha', () => {
  const reg = criarRegistro()
  const r = despachar({ pedidos: PED.slice(0, 1), entregadorDe: { 7: 'Tiago' }, entregadores: ENT })
  reg.despachar(r.chamadas, PED)
  const d = reg.aplicar({ prontos: PED, emTransito: [{ entregador: 'Tiago', entregas: 2, dinheiroAReceber: 100, esperadoDeVolta: 100 }] })
  assert.strictEqual(d.emTransito.length, 1)
  assert.strictEqual(d.emTransito[0].entregas, 3)
})

test('sem despacho nenhum, os dados voltam iguais', () => {
  const reg = criarRegistro()
  const dados = { prontos: PED, emTransito: [] }
  assert.strictEqual(reg.aplicar(dados), dados)
})
