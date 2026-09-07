const { test } = require('node:test')
const assert = require('node:assert')
const F = require('../renderer/elo/telas-finais')

const insights = {
  geral: { faturamento: 17107.25, entrega: 0, recebido: 17107.25, pedidos: 315, ticket: 54.31, clientes: 128, cancelamentoPct: 7.4 },
  financeiro: { receitas: 17571.89, despesas: 0, taxaEntrega: 0, saldo: 17571.89 },
  formas: [{ nome: 'Crédito', valor: 4716.24 }, { nome: 'Pix', valor: 4108.98 }],
  origens: [{ nome: 'Vendas', receita: 17571.89, despesa: 0 }],
  canais: [{ nome: 'Mesa', pedidos: 315, faturamento: 17107.25 }],
  pareto: { produtos: 31, total: 77 },
  mix: { cozinha: 6869.32, bar: 599.80, produtosCozinha: 10, produtosBar: 10 },
  destaques: { diaForte: 'Domingo', diaFortePedidos: 165, diaFraco: 'Quinta', diaFracoPedidos: 6,
    horarioPico: '23h – 24h', horarioPicoPedidos: 42, modalidadeTop: 'Mesa', modalidadeTopPct: 100 },
  porDia: [{ dia: 'Dom', pedidos: 165 }, { dia: 'Seg', pedidos: 50 }],
  porHora: [{ hora: '20h', pedidos: 31 }, { hora: '23h', pedidos: 42 }],
  produtos: {
    cozinha: [{ nome: 'X Bacon', qtd: 39, detalhe: 'R$ 1291,00' }],
    bar: [{ nome: 'Cerveja', qtd: 97, detalhe: 'R$ 1332,50' }],
    categorias: [{ nome: 'Burgers Gourmet', receita: 4223.31, detalhe: '132 uni' }],
  },
  baixaVenda: [{ nome: 'Cerveja sem Álcool (350 ml)', vendas: 1, receita: 10.90 }],
}
const relatorios = {
  intervalo: '08/08/2026 a 07/09/2026', de: '08/08/2026', ate: '07/09/2026',
  vendas: {
    faturamento: 17107.25, entrega: 0, recebido: 17107.25, pedidos: 315, ticket: 54.31, cancelados: 25,
    serie: [{ dia: '06/09', valor: 6980 }, { dia: '07/09', valor: 2740 }],
    modalidades: [{ nome: 'Mesa', pedidos: 315, valor: 17107.25 }],
    formas: [{ nome: 'Cartão', valor: 7995.62 }, { nome: 'PIX', valor: 4795.94 }],
  },
  secoes: {
    clientes: { titulo: 'Clientes', sub: 'quem mais comprou',
      colunas: ['Cliente', 'Pedidos', 'Gasto'], grade: '1fr 140px 180px', direita: [1, 2],
      linhas: [['Maria Silva', '42', 'R$ 2.140,00']] },
    entregadores: { titulo: 'Entregadores', sub: 'entregas e valor levado',
      colunas: ['Entregador', 'Entregas', 'Valor'], grade: '1fr 140px 180px', direita: [1, 2], linhas: [] },
  },
}
const config = { secoes: [
  { titulo: 'Loja', campos: [{ rotulo: 'Nome', valor: 'Pizzaria Demonstração' }, { rotulo: 'Telefone', valor: '(75) 3333-0000' }] },
  { titulo: 'Entrega', campos: [{ rotulo: 'Taxa por bairro', valor: '5 bairros configurados' }] },
] }

test('Insights: os números do topo e o bloco financeiro', () => {
  const h = F.htmlInsights(insights, {})
  assert.ok(h.includes('Faturamento (produtos)') && h.includes('R$ 17.107,25'))
  assert.ok(h.includes('Clientes únicos') && h.includes('Cancelamentos') && h.includes('7.4%'))
  assert.ok(h.includes('Saldo líquido') && h.includes('R$ 17.571,89'))
})

test('Insights: 80/20, mix e destaques respondem "o que fazer amanhã"', () => {
  const h = F.htmlInsights(insights, {})
  assert.ok(h.includes('31 produtos') && h.includes('40.3% do catálogo'))
  assert.ok(/Coz\. 92%/.test(h) && /Bar 8%/.test(h))
  assert.ok(h.includes('Domingo') && h.includes('23h – 24h') && h.includes('165 pedidos'))
})

test('Insights: distribuição e rankings viram gráfico, não parágrafo', () => {
  const h = F.htmlInsights(insights, {})
  assert.ok(h.includes('Por dia da semana') && h.includes('Por hora do dia'))
  assert.ok(h.includes('X Bacon') && h.includes('Cerveja') && h.includes('Burgers Gourmet'))
  assert.ok(h.split('Por dia da semana')[1].includes('165'), 'o pico do domingo fica escrito na coluna')
})

test('Insights: baixa venda diz o que fazer com o produto parado', () => {
  const h = F.htmlInsights(insights, {})
  assert.ok(h.includes('Cerveja sem Álcool (350 ml)'))
  assert.ok(/promoção, melhoria de foto ou remoção/.test(h))
})

test('Insights: o período escolhido aparece escrito', () => {
  assert.ok(F.htmlInsights(insights, { periodoRel: '7dias' }).includes('Período: 7 dias'))
})

test('Relatórios: aba Vendas traz os números, a evolução e as formas', () => {
  const h = F.htmlRelatorios(relatorios, {})
  assert.ok(h.includes('08/08/2026 a 07/09/2026'))
  assert.ok(h.includes('Faturamento (produtos)') && h.includes('Ticket médio') && h.includes('Cancelados'))
  assert.ok(h.includes('Evolução diária') && h.includes('Por modalidade') && h.includes('Formas de pagamento'))
  assert.ok(h.includes('Imprimir / Salvar PDF'))
})

test('Relatórios: as abas trocam o conteúdo', () => {
  const cli = F.htmlRelatorios(relatorios, { abaRel: 'clientes' })
  assert.ok(cli.includes('Maria Silva'))
  assert.ok(!cli.includes('Evolução diária'), 'a aba Clientes não repete o gráfico de Vendas')
  const ent = F.htmlRelatorios(relatorios, { abaRel: 'entregadores' })
  assert.ok(/Sem movimento nesta aba/.test(ent), 'aba sem linha avisa em vez de desenhar tabela vazia')
})

test('Relatórios: o período escolhido fica marcado', () => {
  const h = F.htmlRelatorios(relatorios, { periodoRel: '90dias' })
  assert.ok(/is-on/.test(h.split('data-periodo-rel="90dias"')[1].slice(0, 60)))
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
