const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../src-electron/cardapio-acoes')
const { criarRegistro } = require('../src-electron/cardapio-local')

test('esgotar e voltar a vender vão por PATCH no produto', () => {
  assert.deepStrictEqual(A.esgotarItem({ id: 'p1', nome: 'Calabresa' }, true).corpo, { esgotado: true })
  assert.deepStrictEqual(A.esgotarItem({ id: 'p1', nome: 'Calabresa' }, false).corpo, { esgotado: false })
  assert.strictEqual(A.esgotarItem({ id: 'p1' }, true).caminho, '/api/admin/cardapio/produtos/p1')
})

test('produto sem id não vira URL com "undefined"', () => {
  const r = A.esgotarItem({ nome: 'X' }, true)
  assert.strictEqual(r.ok, false)
  assert.ok(!/undefined/.test(r.motivo))
})

test('esgotar a categoria é um PATCH por produto, só nos que ainda não estão', () => {
  // Como o painel faz: a categoria em si não muda, cada produto fica esgotado e ativo.
  const r = A.esgotarCategoria({ nome: 'Pizzas', itens: [
    { id: 'a', esgotado: false }, { id: 'b', esgotado: true }, { id: 'c', esgotado: false },
  ] }, true)
  assert.strictEqual(r.chamadas.length, 2)
  assert.deepStrictEqual(r.chamadas[0].corpo, { esgotado: true, ativo: true })
  assert.ok(/2 produtos de Pizzas esgotados/.test(r.resumo))
})

test('categoria já toda esgotada avisa em vez de mandar chamada vazia', () => {
  const r = A.esgotarCategoria({ nome: 'Pizzas', itens: [{ id: 'a', esgotado: true }] }, true)
  assert.strictEqual(r.ok, false)
  assert.ok(/já está esgotado/.test(r.motivo))
})

test('o preço é digitado como se fala', () => {
  assert.strictEqual(A.precoDigitado('59,90'), 59.9)
  assert.strictEqual(A.precoDigitado('1.259,90'), 1259.9)
  assert.strictEqual(A.precoDigitado('R$ 12,00'), 12)
  assert.ok(isNaN(A.precoDigitado('abc')))
})

test('editar preço: recusa igual, negativo, zero e lixo — cada um com a frase certa', () => {
  const item = { id: 'p1', nome: 'Calabresa', preco: 59.9 }
  assert.ok(/não mudou/.test(A.editarPreco(item, '59,90').motivo))
  assert.ok(/válido/.test(A.editarPreco(item, '-5').motivo))
  assert.ok(/válido/.test(A.editarPreco(item, 'abc').motivo))
  // zero é "a partir de" no painel — não pode entrar por engano
  assert.ok(/a partir de/.test(A.editarPreco(item, '0').motivo))
})

test('editar preço manda o novo valor arredondado em centavos e resume de → para', () => {
  const r = A.editarPreco({ id: 'p1', nome: 'Calabresa', preco: 59.9 }, '64,999')
  assert.strictEqual(r.corpo.preco, 65)
  assert.ok(/R\$ 59,90 → R\$ 65,00/.test(r.resumo))
})

test('em demonstração as mudanças ficam e os contadores acompanham', () => {
  const reg = criarRegistro()
  const dados = { categorias: [{ nome: 'Pizzas', itens: [
    { id: 'a', nome: 'A', preco: 10, esgotado: false }, { id: 'b', nome: 'B', preco: 20, esgotado: false },
  ] }], esgotados: 0, disponiveis: 2 }
  reg.mudar('a', { esgotado: true })
  reg.mudar('b', { preco: 25 })
  const d = reg.aplicar(dados)
  assert.strictEqual(d.categorias[0].itens[0].esgotado, true)
  assert.strictEqual(d.categorias[0].itens[1].preco, 25)
  assert.strictEqual(d.esgotados, 1)
  assert.strictEqual(d.disponiveis, 1)
  assert.strictEqual(dados.categorias[0].itens[0].esgotado, false, 'o dado de origem não é tocado')
})
