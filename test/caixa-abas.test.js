const { test } = require('node:test')
const assert = require('node:assert')
const C = require('../renderer/elo/tela-caixa')

const base = {
  aberto: { id: 'c1', abertoEm: '2026-09-07T08:00:00Z', abertoPor: 'Ana', fundoInicial: 150 },
  resumo: { vendaDinheiro: 842.5, vendaPix: 1310, vendaCartao: 2145.9, vendaAReceber: 180, suprimentos: 50, sangrias: 300, ajustes: 0 },
  esperadoDinheiro: 742.5,
  movimentacoes: [{ id: 'm1', tipo: 'venda', forma: 'dinheiro', valor: 54, descricao: 'Pedido #1041', criadoEm: '2026-09-07T20:05:00Z', estornada: false }],
  mesas: [
    { mesa: '7', abertaHa: 48, consumo: 128.5, garcom: 'Ana', pedidos: 3 },
    { mesa: '9', abertaHa: 95, consumo: 214.9, garcom: 'Bruno', pedidos: 5 },
  ],
  entregas: [
    { pedido: '1040', cliente: 'Carla N.', entregador: 'Tiago', forma: 'dinheiro', valor: 132.4, saiuHa: 22,
      tipo: 'entrega', estado: 'transito', trocoPara: 150 },
    { pedido: '1034', cliente: 'Sandra R.', entregador: 'Wesley', forma: 'cartao_entrega', valor: 88, saiuHa: 35,
      tipo: 'entrega', estado: 'fechamento', trocoPara: 0 },
    { pedido: '1045', cliente: 'Johnatan', entregador: null, forma: 'dinheiro', valor: 48.5, saiuHa: 0,
      tipo: 'retirada', estado: 'pronto', trocoPara: 60 },
  ],
  historico: [
    { id: 'h1', aberto: '06/09 08:00', fechado: '06/09 23:40', operador: 'Ana', vendas: 4210, diferenca: -12.5 },
    { id: 'h2', aberto: '05/09 08:10', fechado: '05/09 23:20', operador: 'Bruno', vendas: 3980, diferenca: 0 },
  ],
  temMesas: true,
}

test('as duas abas do caixa aparecem: atual e histórico', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now() })
  assert.ok(h.includes('data-aba="atual"') && h.includes('data-aba="historico"'))
})

test('no caixa atual, as três subabas: mesas, delivery e movimentações', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual' })
  assert.ok(h.includes('data-subaba="mesas"'))
  assert.ok(h.includes('data-subaba="delivery"'))
  assert.ok(h.includes('data-subaba="movimentacoes"'))
})

test('loja sem mesa não mostra a subaba de mesas', () => {
  const h = C.htmlDoCaixa({ ...base, temMesas: false }, { online: true, ts: Date.now(), aba: 'atual' })
  assert.ok(!h.includes('data-subaba="mesas"'))
  assert.ok(h.includes('data-subaba="delivery"'))
})

test('a subaba Mesas lista as contas abertas com consumo e tempo', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual', subaba: 'mesas' })
  assert.ok(h.includes('Mesa 9') && h.includes('214,90'))
  assert.ok(/1 h 35/.test(h), 'mesa aberta há 95 min deve mostrar 1 h 35')
})

test('a subaba Delivery vem em CARTÕES, como a de mesas — não em tabela', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual', subaba: 'delivery' })
  assert.ok(h.includes('#1040') && h.includes('Tiago'))
  assert.ok(/dinheiro/i.test(h) && /cart[ãa]o na entrega/i.test(h))
  assert.ok(h.includes('data-pedido="1040"'), 'cada entrega é um cartão')
  assert.ok(h.includes('minmax(230px,1fr)'), 'a grade é a mesma do painel')
})

test('a cor do cartão diz de quem é a vez', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual', subaba: 'delivery' })
  const cartao = (n) => h.split('data-pedido="' + n + '"')[1].split('data-pedido=')[0]
  assert.ok(/Em trânsito/.test(cartao('1040')) && /7B2FF7/.test(cartao('1040')), 'quem saiu é roxo, não verde')
  // "Aguardando prestação de conta" (painel, 08/09/2026): o motoboy já entregou e só
  // falta voltar e prestar contas. "Fechamento pedido" dava a entender pedido em aberto.
  assert.ok(/Aguardando prestação de conta/.test(cartao('1034')) && /C2410C/.test(cartao('1034')),
    'esperando o caixa é laranja')
  assert.ok(/Pronto/.test(cartao('1045')))
})

test('os cards vêm agrupados por status: quem pede ação do caixa primeiro', () => {
  // Antes vinham na ordem de chegada, espalhando as cores pela tela.
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual', subaba: 'delivery' })
  const ordem = [...h.matchAll(/data-pedido="(\d+)"/g)].map((m) => m[1])
  const estadoDe = { }
  for (const e of base.entregas) estadoDe[e.pedido] = e.estado
  const rank = { fechamento: 0, transito: 1, pronto: 2, preparo: 3 }
  const ranks = ordem.map((n) => rank[estadoDe[n]])
  assert.deepStrictEqual(ranks, ranks.slice().sort((a, b) => a - b),
    'ordem saiu fora do agrupamento: ' + ordem.join(', '))
})

test('o guia de dinheiro só aparece em dinheiro, e muda conforme a fase', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual', subaba: 'delivery' })
  const cartao = (n) => h.split('data-pedido="' + n + '"')[1].split('data-pedido=')[0]
  assert.ok(/precisa trazer R\$ 132,40 · saiu com troco pra R\$ 150,00/.test(cartao('1040')))
  assert.ok(/levar troco de R\$ 11,50/.test(cartao('1045')), 'antes de sair, o troco a separar')
  assert.ok(!/trazer|troco/.test(cartao('1034')), 'cartão na entrega não tem troco')
})

test('cada cartão traz a ação da sua fase', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual', subaba: 'delivery' })
  assert.ok(h.includes('data-acao="entrega:concluir:1040"'))
  assert.ok(h.includes('data-acao="entrega:confirmar:1034"'))
  assert.ok(h.includes('data-acao="entrega:entregue:1045"'), 'retirada pronta já pode ser entregue no balcão')
})

test('o cabeçalho da subaba conta o que está fora do caixa', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual', subaba: 'delivery' })
  assert.ok(/1 esperando fechamento · R\$ 88,00 fora do caixa/.test(h))
})

test('sem entrega nenhuma, a subaba Delivery avisa', () => {
  const h = C.htmlDoCaixa({ ...base, entregas: [] }, { online: true, ts: Date.now(), aba: 'atual', subaba: 'delivery' })
  assert.ok(/Nenhuma entrega em andamento/.test(h))
})

test('caixa fechado avisa que mesas e delivery precisam do caixa aberto', () => {
  const h = C.htmlDoCaixa({ ...base, aberto: null }, { online: true, ts: Date.now(), aba: 'atual', subaba: 'mesas' })
  assert.ok(/caixa está fechado|abra o caixa/i.test(h))
})

test('o histórico traz os turnos com diferença, e a sobra/falta em destaque', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'historico' })
  assert.ok(h.includes('06/09') && h.includes('Ana'))
  assert.ok(/b42318/.test(h), 'diferença negativa precisa aparecer em vermelho')
})

test('o dinheiro que está na rua aparece no caixa atual', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual' })
  assert.ok(/na rua|em rota/i.test(h))
})

test('o alerta de dinheiro na rua explica a consequência de fechar assim', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual' })
  assert.ok(/na rua, a confirmar/i.test(h))
  assert.ok(/deixa essa venda de fora/i.test(h), 'precisa dizer o que acontece se fechar assim')
})

test('sem entrega pendente, o alerta não aparece', () => {
  const h = C.htmlDoCaixa({ ...base, entregas: [] }, { online: true, ts: Date.now(), aba: 'atual' })
  assert.ok(!/na rua, a confirmar/i.test(h))
})

test('os quatro KPIs de conferência continuam lá', () => {
  const h = C.htmlDoCaixa(base, { online: true, ts: Date.now(), aba: 'atual' })
  for (const t of ['Esperado em dinheiro', 'Vendas em dinheiro', 'Pix', 'Cartão']) assert.ok(h.includes(t), 'falta o KPI ' + t)
})
