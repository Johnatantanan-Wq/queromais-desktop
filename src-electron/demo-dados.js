// Dados de DEMONSTRAÇÃO — ligados só com --demo (ver main.js).
//
// ⚠️ Nada aqui é real, e a tela DIZ isso: em modo demonstração o app mostra um selo
// permanente na topbar. É a regra que o Elo aprendeu na marra — dado falso que se
// passa por verdadeiro é pior do que tela vazia (capa/renderer/elo-ui.js:60).
//
// O menu abaixo é uma CÓPIA para demonstração. A fonte de verdade continua sendo
// GET /api/admin/menu (cardapiopro/lib/admin/menu.ts): fora do modo demo, o app
// nunca lê este arquivo.

const SECOES = [
  {
    "titulo": "Principal",
    "itens": [
      {
        "id": "dashboard",
        "href": "/admin",
        "label": "Visão geral",
        "icone": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"/>"
      },
      {
        "id": "caixa",
        "href": "/admin/caixa",
        "label": "Caixa",
        "icone": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/><path d=\"M6 10v4M18 10v4\"/>"
      },
      {
        "id": "pedidos",
        "href": "/admin/pedidos",
        "label": "Gestão de pedido",
        "badge": "pedidos",
        "icone": "<path d=\"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2\"/>"
      },
      {
        "id": "despacho",
        "href": "/admin/despacho",
        "label": "Despacho",
        "icone": "<circle cx=\"5.5\" cy=\"17.5\" r=\"2.5\"/><circle cx=\"17\" cy=\"17.5\" r=\"2.5\"/><path d=\"M7.5 17.5h7M14 17.5V5h3l3 5v7.5M3 5h11v8\"/>"
      },
      {
        "id": "carrinhos",
        "href": "/admin/carrinhos",
        "label": "Carrinhos",
        "badge": "carrinhos",
        "icone": "<path d=\"M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z\"/>"
      },
      {
        "id": "clientes",
        "href": "/admin/clientes",
        "label": "Clientes",
        "icone": "<path d=\"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75\"/>"
      }
    ]
  },
  {
    "titulo": "Operação",
    "itens": [
      {
        "id": "cardapio",
        "href": "/admin/cardapio",
        "label": "Cardápio",
        "icone": "<rect x=\"2\" y=\"3\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M8 21h8m-4-4v4\"/>"
      },
      {
        "id": "cozinha",
        "href": "/admin/cozinha",
        "label": "Cozinha (KDS)",
        "icone": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 8v4l3 3\"/>"
      },
      {
        "id": "bar",
        "href": "/admin/bar",
        "label": "Bar",
        "icone": "<path d=\"M5 4h14l-7 8zM12 12v6M8 20h8\"/>"
      },
      {
        "id": "atendimento",
        "href": "/admin/atendimento",
        "label": "Atendimento",
        "icone": "<path d=\"M3 18h18M5 18a7 7 0 0114 0M12 11V8.5\"/><circle cx=\"12\" cy=\"8\" r=\"0.5\"/>"
      },
      {
        "id": "estoque",
        "href": "/admin/estoque",
        "label": "Gestão",
        "icone": "<path d=\"M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z\"/>"
      },
      {
        "id": "compras",
        "href": "/admin/compras",
        "label": "Compras",
        "icone": "<path d=\"M9 2h6l1 4H8zM4 6h16l-1.5 12a2 2 0 01-2 1.7H7.5a2 2 0 01-2-1.7zM9 11h6\"/>"
      },
      {
        "id": "financeiro",
        "href": "/admin/financeiro",
        "label": "Financeiro",
        "icone": "<line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"23\"/><path d=\"M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6\"/>"
      },
      {
        "id": "motoboys",
        "href": "/admin/motoboys",
        "label": "Entregadores",
        "icone": "<circle cx=\"5\" cy=\"18\" r=\"3\"/><circle cx=\"19\" cy=\"18\" r=\"3\"/><path d=\"M8 18h8l-3-7h-3M13 11l2-4h3\"/>"
      },
      {
        "id": "relatorios",
        "href": "/admin/relatorios",
        "label": "Relatórios",
        "icone": "<path d=\"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z\"/><polyline points=\"14 2 14 8 20 8\"/><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"/><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"/><polyline points=\"10 9 9 9 8 9\"/>"
      }
    ]
  },
  {
    "titulo": "Marketing",
    "itens": [
      {
        "id": "insights",
        "href": "/admin/insights",
        "label": "Insights",
        "icone": "<polyline points=\"22 12 18 12 15 21 9 3 6 12 2 12\"/>"
      },
      {
        "id": "campanhas",
        "href": "/admin/food-marketing/campanhas",
        "label": "Campanhas",
        "icone": "<path d=\"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z\"/>"
      },
      {
        "id": "push",
        "href": "/admin/food-marketing/push",
        "label": "Push",
        "icone": "<path d=\"M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.73 21a2 2 0 01-3.46 0\"/>"
      },
      {
        "id": "cupons",
        "href": "/admin/cupons",
        "label": "Cupons",
        "icone": "<path d=\"M16 8l-8 8M21 12a3 3 0 010-6V4a2 2 0 00-2-2H5a2 2 0 00-2 2v2a3 3 0 010 6 3 3 0 010 6v2a2 2 0 002 2h14a2 2 0 002-2v-2a3 3 0 010-6z\"/>"
      },
      {
        "id": "vendedores",
        "href": "/admin/vendedores",
        "label": "Parceiros",
        "icone": "<path d=\"M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75\"/>"
      },
      {
        "id": "fidelidade",
        "href": "/admin/fidelidade",
        "label": "Fidelidade",
        "icone": "<circle cx=\"12\" cy=\"9\" r=\"6\"/><path d=\"M8.5 14.2L7 22l5-2.8L17 22l-1.5-7.8\"/>"
      }
    ]
  },
  {
    "titulo": "Sistema",
    "itens": [
      {
        "id": "config",
        "href": "/admin/configuracoes",
        "label": "Configurações",
        "icone": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14\"/>"
      }
    ]
  }
]

function clonar(x) { return JSON.parse(JSON.stringify(x)) }

/** Menu completo, como o servidor devolveria para um dono. */
function menu() {
  return {
    secoes: clonar(SECOES),
    loja: { id: 'demo', nome: 'Pizzaria Demonstração', documento: '00.000.000/0001-00', logo: null },
    usuario: { email: 'demonstracao@exemplo.com', papel: 'dono' },
    marca: { slug: 'pediu', nome: 'Pediu!', cor: '#14CE6B' },
    badges: { pedidos: 5, carrinhos: 2 },
  }
}

/** Um turno de caixa com venda, sangria, suprimento e uma estornada. */
function caixa() {
  const hoje = new Date()
  const hora = (h, m) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), h, m).toISOString()
  return {
    aberto: { id: 'demo-caixa', abertoEm: hora(8, 0), abertoPor: 'Ana Paula (demonstração)', fundoInicial: 150 },
    resumo: {
      vendaDinheiro: 842.50, vendaPix: 1310.00, vendaCartao: 2145.90,
      vendaAReceber: 180.00, suprimentos: 50, sangrias: 300, ajustes: 0,
    },
    esperadoDinheiro: 742.50,
    movimentacoes: [
      { id: 'd1', tipo: 'venda', forma: 'pix', valor: 89.90, descricao: 'Pedido #1042 — Maria S.', criadoEm: hora(20, 12), estornada: false },
      { id: 'd2', tipo: 'venda', forma: 'dinheiro', valor: 54.00, descricao: 'Pedido #1041 — balcão', criadoEm: hora(20, 5), estornada: false },
      { id: 'd3', tipo: 'sangria', forma: null, valor: 300.00, descricao: 'Retirada para o cofre', criadoEm: hora(19, 40), estornada: false },
      { id: 'd4', tipo: 'venda', forma: 'credito', valor: 128.50, descricao: 'Pedido #1039 — mesa 7', criadoEm: hora(19, 22), estornada: true },
      { id: 'd5', tipo: 'suprimento', forma: 'dinheiro', valor: 50.00, descricao: 'Troco do turno', criadoEm: hora(18, 0), estornada: false },
      { id: 'd6', tipo: 'venda', forma: 'dinheiro', valor: 788.50, descricao: 'Vendas do almoço (consolidado)', criadoEm: hora(14, 30), estornada: false },
    ],
  }
}

/** Um período de 7 dias com faturamento, pedidos e ticket, e as quebras do painel. */
function visaoGeral() {
  const dias = ['01/09', '02/09', '03/09', '04/09', '05/09', '06/09', '07/09']
  const fat = [2110.40, 2680.00, 3010.90, 2450.30, 3980.70, 4210.00, 1978.20]
  const ped = [38, 45, 52, 41, 66, 71, 33]
  const fatAnt = [1900.00, 2400.50, 2210.00, 2600.80, 3110.40, 3720.10, 1810.60]
  const pedAnt = [35, 42, 39, 44, 55, 62, 31]
  const soma = (a) => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100
  const totFat = soma(fat), totPed = soma(ped), totFatAnt = soma(fatAnt), totPedAnt = soma(pedAnt)
  return {
    periodo: { de: '2026-09-01', ate: '2026-09-07', rotulo: 'Últimos 7 dias · comparado com os 7 anteriores' },
    kpis: {
      faturamento: { atual: totFat, anterior: totFatAnt },
      pedidos: { atual: totPed, anterior: totPedAnt },
      ticket: { atual: Math.round((totFat / totPed) * 100) / 100, anterior: Math.round((totFatAnt / totPedAnt) * 100) / 100 },
    },
    series: {
      labels: dias,
      faturamento: { atual: fat, anterior: fatAnt },
      pedidos: { atual: ped, anterior: pedAnt },
      ticket: {
        atual: fat.map((v, i) => Math.round((v / ped[i]) * 100) / 100),
        anterior: fatAnt.map((v, i) => Math.round((v / pedAnt[i]) * 100) / 100),
      },
    },
    canais: [
      { label: 'Delivery', value: 214 },
      { label: 'Balcão', value: 78 },
      { label: 'Mesa', value: 42 },
      { label: 'Retirada', value: 12 },
    ],
    formas: [
      { label: 'Pix', value: 8210.40 },
      { label: 'Cartão', value: 7180.90 },
      { label: 'Dinheiro', value: 3120.20 },
      { label: 'A receber', value: 1908.00 },
    ],
    bairros: [
      { label: 'Centro', value: 88 },
      { label: 'Jardim América', value: 54 },
      { label: 'Vila Nova', value: 37 },
      { label: 'Boa Vista', value: 21 },
      { label: 'Industrial', value: 14 },
    ],
  }
}

module.exports = { menu, caixa, visaoGeral }
