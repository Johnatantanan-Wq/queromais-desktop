const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../src-electron/contas-acoes')
const { criarRegistro } = require('../src-electron/contas-local')

const HOJE = '2026-09-08'
const CONTA = { id: 'c1', direcao: 'pagar', descricao: 'Laticínios — NF 8821', valor: 1400, valorPago: 0, situacao: 'pendente' }

test('baixa sem valor paga o saldo inteiro, na data de hoje', () => {
  const r = A.baixa(CONTA, {}, HOJE)
  assert.deepStrictEqual(r.corpo, { valor: 1400, data: HOJE })
  assert.strictEqual(r.quita, true)
  assert.ok(/Paga por inteiro/.test(r.resumo))
})

test('baixa parcial diz quanto resta, e aceita data dd/mm/aaaa e forma', () => {
  const r = A.baixa(CONTA, { valor: '400,00', data: '05/09/2026', forma: 'pix' }, HOJE)
  assert.deepStrictEqual(r.corpo, { valor: 400, data: '2026-09-05', forma_pagamento: 'pix' })
  assert.strictEqual(r.quita, false)
  assert.ok(/restam R\$ 1\.000,00 em Pix/.test(r.resumo), r.resumo)
})

test('a baixa é recusada AQUI com a MESMA frase do painel', () => {
  assert.ok(/acima do saldo devedor \(1400,00\)/.test(A.baixa(CONTA, { valor: '1500' }, HOJE).motivo))
  assert.ok(/não pode ser futura/.test(A.baixa(CONTA, { data: '10/09/2026' }, HOJE).motivo))
  assert.ok(/maior que zero/.test(A.baixa(CONTA, { valor: '0' }, HOJE).motivo))
  assert.ok(/já está quitada/.test(A.baixa({ ...CONTA, situacao: 'paga' }, {}, HOJE).motivo))
  assert.ok(/cancelada/.test(A.baixa({ ...CONTA, situacao: 'cancelada' }, {}, HOJE).motivo))
  assert.ok(/desconhecida/.test(A.baixa(CONTA, { forma: 'vale' }, HOJE).motivo))
  assert.ok(/dd\/mm\/aaaa/.test(A.baixa(CONTA, { data: 'ontem' }, HOJE).motivo))
})

test('o saldo considera o que já foi pago — segunda parcela não repete a primeira', () => {
  const meio = { ...CONTA, valorPago: 1000 }
  assert.strictEqual(A.saldoDe(meio), 400)
  const r = A.baixa(meio, {}, HOJE)
  assert.strictEqual(r.corpo.valor, 400)
  assert.strictEqual(r.quita, true)
})

test('conta a receber fala em "recebida", não em "paga"', () => {
  const r = A.baixa({ ...CONTA, direcao: 'receber' }, {}, HOJE)
  assert.ok(/Recebida por inteiro/.test(r.resumo))
})

test('conta sem id não vira URL com "undefined"', () => {
  const r = A.baixa({ direcao: 'pagar', valor: 10 }, {}, HOJE)
  assert.strictEqual(r.ok, false)
  assert.ok(!/undefined/.test(r.motivo))
})

test('conta nova: só o essencial é obrigatório, e a data entra como o painel quer', () => {
  const r = A.nova({ direcao: 'pagar', descricao: ' Aluguel ', valor: '2.500,00', vencimento: '10/10/2026', forma: 'boleto', contraparte: 'Imobiliária' })
  assert.deepStrictEqual(r.corpo, { direcao: 'pagar', descricao: 'Aluguel', valor: 2500, vencimento: '2026-10-10', forma_pagamento: 'boleto', contraparte: 'Imobiliária' })
  assert.ok(/para 10\/10\/2026/.test(r.resumo))
})

test('conta nova: recusa direção, descrição, valor e vencimento errados', () => {
  assert.ok(/pagar ou a receber/.test(A.nova({ direcao: 'x' }).motivo))
  assert.ok(/do que é/.test(A.nova({ direcao: 'pagar', descricao: '' }).motivo))
  assert.ok(/maior que zero/.test(A.nova({ direcao: 'pagar', descricao: 'A', valor: '0' }).motivo))
  assert.ok(/dd\/mm\/aaaa/.test(A.nova({ direcao: 'pagar', descricao: 'A', valor: '1', vencimento: 'amanhã' }).motivo))
})

test('em demonstração: baixa parcial vira "parcial", inteira vira paga/recebida; conta nova entra', () => {
  const reg = criarRegistro()
  const base = { contas: [{ ...CONTA }, { id: 'c2', direcao: 'receber', valor: 100, valorPago: 0, situacao: 'pendente' }] }
  reg.baixar('c1', 400, 'pix', HOJE)
  reg.baixar('c2', 100, null, HOJE)
  reg.criar({ direcao: 'pagar', descricao: 'Luz', valor: 300, vencimento: '2026-09-20' })
  const d = reg.aplicar(base)
  assert.strictEqual(d.contas[0].situacao, 'parcial')
  assert.strictEqual(d.contas[0].valorPago, 400)
  assert.strictEqual(d.contas[1].situacao, 'recebida')
  assert.strictEqual(d.contas[1].liquidadoEm, HOJE)
  assert.strictEqual(d.contas[2].descricao, 'Luz')
  assert.strictEqual(base.contas[0].valorPago, 0, 'o dado de origem não é tocado')
})
