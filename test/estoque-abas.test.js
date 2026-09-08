const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../src-electron/adaptadores')

const hoje = new Date().toISOString().slice(0, 10)
const base = {
  ingredientesResp: [{ id: 'i1', nome: 'Queijo', tipo: 'insumo' }],
  gestaoResp: {
    movimentacoes: [
      { id: 'm1', quando: '09:00', dia: '2026-09-08', item: 'Queijo', tipo: 'saida', qtd: 2, unidade: 'kg', saldoDepois: 8, motivo: 'venda', quem: 'Ana' },
      { id: 'm2', quando: '08:00', dia: '2026-09-08', item: 'Molho', tipo: 'entrada', qtd: 5, unidade: 'l', saldoDepois: 12, quem: 'Zé' },
      { id: 'm3', quando: '07:00', dia: '2026-09-07', item: 'Queijo', tipo: 'perda', qtd: 1, unidade: 'kg', saldoDepois: 7, quem: 'Ana' },
    ],
    fichas: [{ produto: 'Pizza Calabresa', categoria: 'Pizzas', preco: 59.9, custo: 11,
      itens: [{ ingrediente: 'Queijo', qtd: 0.25, unidade: 'kg', custo: 10 }] }],
    semFicha: ['Pizza Chocolate'],
    notasSaida: [
      { numero: '787', serie: '1', status: 'autorizada', valor: 89.9, quando: '12:30', dia: hoje },
      { numero: '788', serie: '1', status: 'pendente', valor: 50, quando: '12:40', dia: hoje },
      { numero: '789', serie: '1', status: 'rejeitada', valor: 30, quando: '12:50', dia: hoje },
    ],
  },
}

test('as três abas passam a ter fonte — antes só desenhavam', () => {
  const d = A.estoque(base)
  assert.ok(d.movimentacoes && d.movimentacoes.itens.length === 3)
  assert.ok(d.fichas && d.fichas.itens.length === 1)
  assert.ok(d.nfSaida && d.nfSaida.itens.length === 3)
  assert.ok(d.categorias.length, 'e as que já existiam continuam')
})

test('a movimentação mostra o saldo que ficou — é o que se confere', () => {
  const m = A.estoque(base).movimentacoes.itens[0]
  assert.strictEqual(m.saldoApos, 8)
  assert.strictEqual(m.qtd, '2 kg', 'quantidade com unidade')
  assert.strictEqual(m.movimento, 'Saída', 'o tipo é dito em português')
  assert.strictEqual(m.data, '08/09/2026', 'e a data no formato daqui')
})

test('saldo desconhecido é null, não zero — dizem coisas diferentes', () => {
  const d = A.estoque({ ...base, gestaoResp: { ...base.gestaoResp,
    movimentacoes: [{ id: 'x', item: 'Q', tipo: 'saida', qtd: 1, saldoDepois: null }] } })
  assert.strictEqual(d.movimentacoes.itens[0].saldoApos, null)
})

test('os totais separam entrada, saída e perda', () => {
  const m = A.estoque(base).movimentacoes
  assert.strictEqual(m.entradasValor, 5)
  assert.strictEqual(m.saidasValor, 2)
  assert.strictEqual(m.perdasValor, 1)
  assert.strictEqual(m.lancamentos, 3)
  assert.strictEqual(m.produtosMovimentados, 2, 'Queijo e Molho')
  assert.strictEqual(m.diasNoPeriodo, 2)
})

test('a ficha traz o custo ao lado do preço — sozinho o custo não diz nada', () => {
  const f = A.estoque(base).fichas.itens[0]
  assert.strictEqual(f.custo, 11)
  assert.strictEqual(f.preco, 59.9)
  assert.strictEqual(f.categoria, 'Pizzas')
  assert.deepStrictEqual(f.insumos, [{ nome: 'Queijo', qtd: '0.25 kg' }])
})

test('produto sem ficha é denunciado — some do estoque sem baixar nada', () => {
  assert.deepStrictEqual(A.estoque(base).fichas.semFicha, ['Pizza Chocolate'])
})

test('a NF de saída separa autorizada, pendente e com falha', () => {
  const n = A.estoque(base).nfSaida
  assert.strictEqual(n.emitidasHoje, 1, 'só a autorizada conta como emitida')
  assert.strictEqual(n.emitidasHojeValor, 89.9)
  assert.strictEqual(n.pendentes, 1)
  assert.strictEqual(n.comFalha, 1, 'rejeitada é falha, não pendente')
})

test('sem a rota nova, as abas antigas continuam de pé', () => {
  const d = A.estoque({ ingredientesResp: base.ingredientesResp })
  assert.ok(d.categorias.length, 'Produtos continua')
  assert.strictEqual(d.movimentacoes, undefined, 'e as novas simplesmente não vêm')
})
