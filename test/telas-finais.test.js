const { test } = require('node:test')
const assert = require('node:assert')
const F = require('../renderer/elo/telas-finais')

const insights = {
  horarios: { labels: ['10h', '12h', '20h'], valores: [4, 22, 31] },
  abc: [{ label: 'Pizza Calabresa G', value: 128 }, { label: 'Refrigerante 2L', value: 210 }],
  recorrencia: { novos: 120, voltaram: 222 },
  ticketPorCanal: [{ label: 'Delivery', value: 62.4 }, { label: 'Mesa', value: 98.2 }],
}
const relatorios = { itens: [
  { chave: 'vendas', nome: 'Vendas por período', desc: 'faturamento, pedidos e ticket', formatos: ['PDF', 'Excel'] },
  { chave: 'fiscal', nome: 'Documentos fiscais', desc: 'notas emitidas no período', formatos: ['ZIP'] },
] }
const config = { secoes: [
  { titulo: 'Loja', campos: [{ rotulo: 'Nome', valor: 'Pizzaria Demonstração' }, { rotulo: 'Telefone', valor: '(75) 3333-0000' }] },
  { titulo: 'Entrega', campos: [{ rotulo: 'Taxa por bairro', valor: '5 bairros configurados' }] },
] }

test('Insights: mostra os quatro blocos de análise', () => {
  const h = F.htmlInsights(insights, {})
  assert.ok(/hor[áa]rio/i.test(h) && /produto/i.test(h) && /voltaram/i.test(h) && /ticket/i.test(h))
  assert.ok(h.includes('Pizza Calabresa'))
})

test('Insights: horário de pico vira gráfico', () => {
  assert.ok(F.htmlInsights(insights, {}).includes('<svg'))
})

test('Relatórios: cada relatório traz nome, descrição e formatos', () => {
  const h = F.htmlRelatorios(relatorios, {})
  assert.ok(h.includes('Vendas por período') && h.includes('faturamento, pedidos e ticket'))
  assert.ok(h.includes('PDF') && h.includes('Excel') && h.includes('ZIP'))
})

test('Relatórios: o botão diz que a geração é pelo painel', () => {
  assert.ok(/painel/i.test(F.htmlRelatorios(relatorios, {})))
})

test('Configurações: seções com rótulo e valor, em leitura', () => {
  const h = F.htmlConfiguracoes(config, {})
  assert.ok(h.includes('Loja') && h.includes('Pizzaria Demonstração'))
  assert.ok(h.includes('Entrega') && h.includes('5 bairros'))
  assert.ok(/pelo painel/i.test(h), 'precisa dizer que editar é no painel')
})

test('as três telas avisam quando não há dado', () => {
  assert.ok(/sem dados/i.test(F.htmlInsights(null, {})))
  assert.ok(/sem dados/i.test(F.htmlRelatorios(null, {})))
  assert.ok(/sem dados/i.test(F.htmlConfiguracoes(null, {})))
})

test('escapa o que vem de dado', () => {
  const h = F.htmlConfiguracoes({ secoes: [{ titulo: '<b>x', campos: [{ rotulo: 'a', valor: '<script>' }] }] }, {})
  assert.ok(h.includes('&lt;script&gt;'))
})
