const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../src-electron/compras-acoes')
const { criarRegistro } = require('../src-electron/compras-local')

const ING = { id: 'ing-1', nome: 'Farinha de trigo', unidade: 'kg', saldo: 18, minimo: 40, custo: 4.2 }

test('anotar: nome obrigatório, quantidade maior que zero, unidade com padrão', () => {
  assert.ok(/Diga o que é/.test(A.anotar({ nome: '  ' }).motivo))
  assert.ok(/maior que zero/.test(A.anotar({ nome: 'Lixo', qtd: '0' }).motivo))
  const r = A.anotar({ nome: ' Saco de lixo ', qtd: '2', unidade: '' })
  assert.deepStrictEqual(r.corpo, { nome: 'Saco de lixo', quantidade: 2, unidade: 'un' })
  assert.strictEqual(r.metodo, 'POST')
})

test('comprado, voltar e excluir vão por id — sem id não sai URL com "undefined"', () => {
  assert.strictEqual(A.comprado({ id: 'c1', nome: 'X' }).corpo.status, 'comprado')
  assert.strictEqual(A.voltar({ id: 'c1' }).corpo.status, 'pendente')
  assert.strictEqual(A.excluir({ id: 'c1' }).metodo, 'DELETE')
  for (const fn of ['comprado', 'voltar', 'excluir']) {
    const r = A[fn]({ nome: 'sem id' })
    assert.strictEqual(r.ok, false, fn)
    assert.ok(!/undefined/.test(r.motivo), fn)
  }
})

test('recebi: a quantidade sugerida repõe até 2× o mínimo', () => {
  assert.strictEqual(A.sugestaoDe(ING), 62)
  const r = A.recebi(ING, {})
  assert.deepStrictEqual(r.corpo, { ingrediente_id: 'ing-1', qtd: 62 })
  assert.ok(/Entrou 62 kg de Farinha/.test(r.resumo))
})

test('recebi: quantidade digitada como se fala, e custo só vai se informado', () => {
  const r = A.recebi(ING, { qtd: '12,5', custo: '4,35' })
  assert.deepStrictEqual(r.corpo, { ingrediente_id: 'ing-1', qtd: 12.5, custo_unitario: 4.35 })
  assert.ok(!('custo_unitario' in A.recebi(ING, { qtd: '5', custo: '' }).corpo), 'custo em branco mantém o médio')
})

test('recebi: recusa zero, negativo e custo inválido — cada um com a frase certa', () => {
  assert.ok(/maior que zero/.test(A.recebi(ING, { qtd: '0' }).motivo))
  assert.ok(/maior que zero/.test(A.recebi(ING, { qtd: '-3' }).motivo))
  assert.ok(/Custo unitário inválido/.test(A.recebi(ING, { qtd: '5', custo: 'abc' }).motivo))
  assert.ok(/sem identificação/.test(A.recebi({ nome: 'X' }, { qtd: '5' }).motivo))
})

test('em demonstração: anotar, comprar, voltar e excluir acompanham a lista', () => {
  const reg = criarRegistro()
  const base = { repor: [], avulsos: [{ id: 'av-1', nome: 'Lixo', qtd: 4, unidade: 'pct' }], comprados: [] }
  reg.anotar({ nome: 'Detergente', quantidade: 1, unidade: 'un' })
  reg.marcar('av-1', 'comprado')
  let d = reg.aplicar(base)
  assert.deepStrictEqual(d.avulsos.map((i) => i.nome), ['Detergente'])
  assert.deepStrictEqual(d.comprados.map((i) => i.nome), ['Lixo'])
  reg.marcar('av-1', 'pendente')
  d = reg.aplicar(base)
  assert.deepStrictEqual(d.avulsos.map((i) => i.nome).sort(), ['Detergente', 'Lixo'])
  reg.marcar('av-1', 'excluido')
  d = reg.aplicar(base)
  assert.deepStrictEqual(d.avulsos.map((i) => i.nome), ['Detergente'])
  assert.deepStrictEqual(d.comprados, [])
})

test('em demonstração: receber soma no saldo e, chegando ao mínimo, sai da lista', () => {
  const reg = criarRegistro()
  const base = { repor: [{ ...ING }, { id: 'ing-2', nome: 'Queijo', saldo: 1, minimo: 5 }], avulsos: [], comprados: [] }
  reg.receber('ing-1', 10)        // 18 + 10 = 28 < 40: continua
  reg.receber('ing-2', 10)        // 1 + 10 = 11 ≥ 5: sai
  const d = reg.aplicar(base)
  assert.deepStrictEqual(d.repor.map((i) => i.nome + ':' + i.saldo), ['Farinha de trigo:28'])
  assert.strictEqual(base.repor[0].saldo, 18, 'o dado de origem não é tocado')
})
