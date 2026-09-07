const { test } = require('node:test')
const assert = require('node:assert')
const C = require('../renderer/elo/tela-compras')

const dados = {
  repor: [
    { nome: 'Farinha de trigo', saldo: 18, unidade: 'kg', minimo: 40, custo: 4.20 },
    { nome: 'Refrigerante 2L', saldo: 0, unidade: 'un', minimo: 24, custo: 6.90 },
  ],
  avulsos: [{ nome: 'Saco de lixo 100L', qtd: 4, unidade: 'pct' }],
  comprados: [{ nome: 'Papel toalha', qtd: 12, unidade: 'rolo' }],
}

test('Compras: repõe até 2× o mínimo', () => {
  assert.strictEqual(C.sugestaoDe({ saldo: 18, minimo: 40 }), 62)
  assert.strictEqual(C.sugestaoDe({ saldo: 0, minimo: 24 }), 48)
  assert.strictEqual(C.sugestaoDe({ saldo: 100, minimo: 24 }), 0, 'quem tem de sobra não entra na conta')
  assert.strictEqual(C.sugestaoDe({ saldo: 5, minimo: 10, sugestao: 3 }), 3, 'o painel mandando manda')
})

test('Compras: a linha diz o saldo, o mínimo, quanto comprar e quanto custa', () => {
  const h = C.htmlCompras(dados, {})
  const linha = h.split('data-linha="Farinha de trigo"')[1].split('data-linha=')[0]
  assert.ok(linha.includes('18 kg') && linha.includes('mín 40'))
  assert.ok(linha.includes('62 kg'), 'quanto comprar')
  assert.ok(linha.includes('R$ 260,40'), '62 kg a R$ 4,20')
})

test('Compras: produto zerado grita SEM ESTOQUE', () => {
  const linha = C.htmlCompras(dados, {}).split('data-linha="Refrigerante 2L"')[1].split('data-linha=')[0]
  assert.ok(linha.includes('SEM ESTOQUE') && linha.includes('b42318'))
})

test('Compras: custo previsto soma a lista inteira', () => {
  const h = C.htmlCompras(dados, {})
  assert.ok(h.includes('R$ 591,60'), 'R$ 260,40 + R$ 331,20')
})

test('Compras: itens avulsos e comprados recentes ficam separados da reposição', () => {
  const h = C.htmlCompras(dados, {})
  assert.ok(h.includes('Itens avulsos (1)') && h.includes('Saco de lixo 100L'))
  assert.ok(h.includes('Comprados recentes') && h.includes('Papel toalha'))
  assert.ok(h.includes('Ex.: Saco de lixo 100L'), 'o formulário de anotar à mão fica na tela')
})

test('Compras sem nada no mínimo comemora, não desenha tabela vazia', () => {
  const h = C.htmlCompras({ repor: [], avulsos: [], comprados: [] }, {})
  assert.ok(/Nenhum produto no mínimo/.test(h))
  assert.ok(!h.includes('Custo previsto:'))
})

test('Compras sem dado avisa', () => {
  assert.ok(/sem dados/i.test(C.htmlCompras(null, {})))
})
