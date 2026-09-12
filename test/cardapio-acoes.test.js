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

// ── O preço precisa chegar nas OPÇÕES (painel, 08/09/2026) ──────────────────
// ⛔ O preço mora em DOIS campos: `produtos.preco` e, quando o mesmo item é vendido
// como opção dentro de outro produto (meia pizza, sabor de combo), `preco_adicional`
// da opção — e é esse que o cliente paga ali. Mexer só no primeiro deixa o cliente
// pagando o valor velho, sem ninguém perceber.
const Ficha = require('../renderer/elo/ficha')

test('leva junto só as opções que cobram o preço ANTIGO', () => {
  const r = A.opcoesParaAtualizar({
    opcoes: [{ id: 's1', preco_adicional: 12 }, { id: 's2', preco_adicional: 12 }, { id: 's3', preco_adicional: 0 }],
  }, 12)
  assert.strictEqual(r.lugares, 3)
  assert.strictEqual(r.comPrecoAntigo, 2)
  assert.deepStrictEqual(r.sabores, ['s1', 's2'])
})

test('⛔ a opção incluída a R$ 0 (bebida do combo) fica intacta', () => {
  const r = A.opcoesParaAtualizar({ opcoes: [{ id: 's3', preco_adicional: 0 }] }, 12)
  assert.strictEqual(r.comPrecoAntigo, 0)
  assert.deepStrictEqual(r.sabores, [], 'subir a bebida inclusa para o preço da pizza cobraria do cliente duas vezes')
})

test('quando o painel já diz quais acompanham, é a palavra dele que vale', () => {
  const r = A.opcoesParaAtualizar({
    opcoes: [{ id: 's1', preco_adicional: 99 }, { id: 's2', preco_adicional: 99 }],
    acompanhamPorPadrao: ['s1'],
  }, 12)
  assert.deepStrictEqual(r.sabores, ['s1'])
})

test('produto que não é opção em lugar nenhum não gera segunda chamada', () => {
  assert.deepStrictEqual(A.opcoesParaAtualizar({ opcoes: [] }, 12), { lugares: 0, comPrecoAntigo: 0, sabores: [] })
  assert.strictEqual(A.propagarPreco('p1', 17, []), null)
})

test('a propagação não regrava o preço do produto', () => {
  const p = A.propagarPreco('p1', 17, ['s1'])
  assert.strictEqual(p.caminho, '/api/admin/estoque/preco-venda/p1')
  assert.strictEqual(p.corpo.apenasOpcoes, true, 'sem isso o painel gravaria o preço do produto duas vezes')
  assert.deepStrictEqual(p.corpo.sabores, ['s1'])
})

test('a caixa do preço pergunta antes de salvar, e diz quem fica de fora', () => {
  const h = Ficha.fichaPreco({ nome: 'Pizza Calabresa G', preco: 12 },
    { lugares: 3, comPrecoAntigo: 2, sabores: ['s1', 's2'] })
  assert.match(h, /opção em 3 lugares/)
  assert.match(h, /2 deles pelo preço de agora/)
  assert.match(h, /1 opção fica de fora/)
  assert.match(h, /data-campo="opcoes"[^>]*checked/)
})

test('item que não é opção não ganha pergunta nenhuma', () => {
  const h = Ficha.fichaPreco({ nome: 'X', preco: 9 }, null)
  assert.ok(!/data-campo="opcoes"/.test(h))
})
