const { test } = require('node:test')
const assert = require('node:assert')
const P = require('../renderer/elo/telas-principais')

const clientes = {
  kpis: { unicos: 4, vips: 0, emRisco: 0, ticketGeral: 56.20 },
  itens: [
    { nome: 'Mesa 10 · Alexandre (Guaibim)', telefone: '31999401407', bairro: null, segmento: 'Novo', pedidos: 2,
      totalGasto: 124.90, ticket: 62.45, freqMes: 2.0, ultimo: 'há 11 dias', diaFavorito: 'Quarta', pontos: 0 },
    { nome: 'Fabricios', telefone: '75982804132', bairro: null, segmento: 'Importado', pedidos: 0,
      totalGasto: 0, ticket: 0, freqMes: 0, ultimo: 'Sem pedido', diaFavorito: null, pontos: 0 },
  ],
}
const carrinhos = {
  kpis: { abertos: 2, identificados: 0, abandonados: 0, totalEmAberto: 270.20 },
  itens: [
    { cliente: null, telefone: null, itens: 1, paradoMin: 3967, total: 37.50 },
    { cliente: 'Marcos V.', telefone: '(75) 99123-4455', itens: 4, paradoMin: 12, total: 232.70 },
  ],
}
const financeiro = {
  periodo: 'hoje',
  faturamento: { valor: 883.61, variacao: -88.2, vendas: 7 },
  recebido: { valor: 883.61, pctDoFaturado: 100 },
  aReceberDaVenda: 0, contasAReceber: { valor: 0, emAberto: 0 }, contasAPagar: { valor: 0, emAberto: 0 },
  vendaBruta: 883.61, taxasPixCartao: 17.15, pctTaxas: 1.9, vendaLiquida: 866.46,
  pixLiquido: { liquido: 320.05, bruto: 323.28, taxa: 3.23 },
  cartaoLiquido: { liquido: 426.93, bruto: 440.85, taxa: 13.92 },
  produtos: 829.41, taxaServico: 54.20, taxaEntrega: 0, descontos: 0,
  receitaLiquida: { valor: 812.26, variacao: -88.1 }, ticketMedio: { valor: 126.23, variacao: 16.4 },
  cancelamentos: { qtd: 1, valor: 0 },
}
const salao = {
  kpis: { mesas: 6, mesasTotal: 40, ocupacaoPct: 2, lugaresOcupados: 4, lugaresTotal: 162,
    consumoAberto: 766.10, ticketAtual: 127.68, contasSolicitadas: 0, pedidosProntos: 0 },
  qrAbreMesa: false,
  mesas: [
    { numero: '1', situacao: 'Livre', lugares: 4 },
    { numero: '7', situacao: 'Ocupada', lugares: 6, consumo: 128.50, garcom: 'Ana', desdeMin: 48 },
  ],
}

test('Clientes: abas, KPIs e as colunas do painel', () => {
  const h = P.htmlClientes(clientes, {})
  assert.ok(h.includes('Segmentação') && /an[áa]lise por segmento RFM/i.test(h))
  assert.ok(/Clientes [úu]nicos/i.test(h) && /VIPs/i.test(h) && /Em risco/i.test(h) && /Ticket m[ée]dio geral/i.test(h))
  for (const c of ['Bairro', 'Segmento', 'Pedidos', 'Total gasto', 'Ticket médio', 'Freq./mês', 'Último', 'Dia favorito', 'Pontos']) {
    assert.ok(h.includes(c), 'falta a coluna ' + c)
  }
})

test('Clientes: segmento vira etiqueta e cliente sem pedido mostra "Sem pedido"', () => {
  const h = P.htmlClientes(clientes, {})
  assert.ok(h.includes('Novo') && h.includes('Importado'))
  assert.ok(h.includes('Sem pedido'))
})

test('Carrinhos: KPIs, filtros com contador e a dica do auto-envio', () => {
  const h = P.htmlCarrinhos(carrinhos, {})
  assert.ok(/Carrinhos abertos/i.test(h) && /Recupera[çc][ãa]o de vendas/i.test(h))
  assert.ok(h.includes('data-filtro-carrinho="identificados"') && h.includes('(0)'))
  assert.ok(/Auto-envio/i.test(h))
})

test('Carrinhos: sem telefone aparece como visitante anônimo, e o tempo parado grita', () => {
  const h = P.htmlCarrinhos(carrinhos, {})
  assert.ok(/Visitante an[ôo]nimo/i.test(h) && /Sem telefone/i.test(h))
  assert.ok(/8a6508|b42318/.test(h), 'parado há muito tempo precisa de cor')
})

test('Financeiro: os três blocos de indicadores do painel', () => {
  const h = P.htmlFinanceiroVisao(financeiro, {})
  assert.ok(/Faturamento/i.test(h) && h.includes('883,61'))
  assert.ok(/Taxas PIX e cart[ãa]o/i.test(h) && h.includes('17,15'))
  assert.ok(/Venda l[íi]quida/i.test(h) && h.includes('866,46'))
  assert.ok(/Pix l[íi]quido/i.test(h) && h.includes('320,05') && h.includes('3,23'))
  assert.ok(/Receita l[íi]quida/i.test(h) && h.includes('812,26'))
  assert.ok(/Ticket m[ée]dio/i.test(h) && h.includes('126,23'))
})

test('Financeiro: taxa aparece como desconto (negativa) e a variação com seta', () => {
  const h = P.htmlFinanceiroVisao(financeiro, {})
  assert.ok(h.includes('− R$ 17,15') || h.includes('- R$ 17,15'))
  assert.ok(/▼/.test(h) && /▲/.test(h))
})

test('Financeiro: cancelamento fica fora do faturamento e a tela diz isso', () => {
  const h = P.htmlFinanceiroVisao(financeiro, {})
  assert.ok(/fora do faturamento/i.test(h))
})

test('Financeiro: os períodos do painel', () => {
  const h = P.htmlFinanceiroVisao(financeiro, {})
  for (const p of ['hoje', 'ontem', '7dias', 'mes', 'mes-anterior', 'ano', 'personalizado']) {
    assert.ok(h.includes('data-periodo-fin="' + p + '"'), 'falta o período ' + p)
  }
})

test('Salão: seis indicadores, inclusive ocupação por lugares', () => {
  const h = P.htmlSalao(salao, {})
  assert.ok(h.includes('6') && h.includes('40'))
  assert.ok(/4\/162/.test(h) || (h.includes('162') && h.includes('2%')))
  assert.ok(/Consumo aberto/i.test(h) && h.includes('766,10'))
  assert.ok(/Contas solicitadas/i.test(h) && /Pedidos prontos/i.test(h))
})

test('Salão: a chave do QR explica o que acontece nos dois estados', () => {
  const h = P.htmlSalao(salao, {})
  assert.ok(/QR/.test(h))
  assert.ok(/chamar o gar[çc]om/i.test(h), 'com a opção desligada, precisa dizer o que muda')
})

test('todas avisam quando não há dado', () => {
  for (const f of ['htmlClientes', 'htmlCarrinhos', 'htmlFinanceiroVisao', 'htmlSalao']) {
    assert.ok(/sem dados/i.test(P[f](null, {})), f + ' precisa avisar')
  }
})
