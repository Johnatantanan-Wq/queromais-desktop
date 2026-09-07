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

/** Visão geral por período. `dia`/`ontem` vêm hora a hora; `semana`/`mes`, dia a dia.
 *  Cada período traz também o anterior, para a comparação dos KPIs e do gráfico. */
function visaoGeral(periodo) {
  const p = ['dia', 'ontem', 'semana', 'mes'].indexOf(periodo) >= 0 ? periodo : 'semana'
  const soma = (a) => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100

  // curva de um dia de restaurante: almoço e jantar
  const horas = ['10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h', '22h', '23h']
  const fatDia = [95.4, 288.0, 742.6, 611.2, 240.8, 118.0, 96.5, 152.3, 388.7, 704.1, 921.4, 806.9, 512.6, 201.3]
  const pedDia = [2, 5, 13, 11, 4, 2, 2, 3, 7, 12, 16, 14, 9, 4]
  const fatOntem = [88.2, 244.9, 690.1, 588.4, 260.2, 90.0, 110.4, 130.9, 402.5, 668.8, 870.2, 742.4, 480.1, 188.6]
  const pedOntem = [2, 4, 12, 10, 5, 2, 2, 3, 7, 11, 15, 13, 8, 4]
  const fatAnteontem = [80.0, 230.0, 640.0, 520.0, 210.0, 85.0, 99.0, 120.0, 360.0, 610.0, 800.0, 690.0, 430.0, 170.0]
  const pedAnteontem = [2, 4, 11, 9, 4, 2, 2, 3, 6, 10, 14, 12, 7, 3]

  const dias7 = ['01/09', '02/09', '03/09', '04/09', '05/09', '06/09', '07/09']
  const fat7 = [2110.40, 2680.00, 3010.90, 2450.30, 3980.70, 4210.00, 1978.20]
  const ped7 = [38, 45, 52, 41, 66, 71, 33]
  const fat7Ant = [1900.00, 2400.50, 2210.00, 2600.80, 3110.40, 3720.10, 1810.60]
  const ped7Ant = [35, 42, 39, 44, 55, 62, 31]

  // mês: 30 dias com fim de semana mais forte
  const diasMes = [], fatMes = [], pedMes = [], fatMesAnt = [], pedMesAnt = []
  for (let d = 1; d <= 30; d++) {
    const fds = d % 7 === 5 || d % 7 === 6
    const base = fds ? 3900 : 2400
    diasMes.push(String(d).padStart(2, '0') + '/08')
    fatMes.push(Math.round((base + (d % 5) * 130) * 100) / 100)
    pedMes.push(Math.round((base + (d % 5) * 130) / 62))
    fatMesAnt.push(Math.round((base * 0.88 + (d % 4) * 110) * 100) / 100)
    pedMesAnt.push(Math.round((base * 0.88 + (d % 4) * 110) / 63))
  }

  const conjunto = {
    dia:    { labels: horas,   fat: fatDia, ped: pedDia, fatAnt: fatOntem,     pedAnt: pedOntem,     rotulo: 'Hoje · comparado com ontem' },
    ontem:  { labels: horas,   fat: fatOntem, ped: pedOntem, fatAnt: fatAnteontem, pedAnt: pedAnteontem, rotulo: 'Ontem · comparado com anteontem' },
    semana: { labels: dias7,   fat: fat7,   ped: ped7,   fatAnt: fat7Ant,      pedAnt: ped7Ant,      rotulo: 'Últimos 7 dias · comparado com os 7 anteriores' },
    mes:    { labels: diasMes, fat: fatMes, ped: pedMes, fatAnt: fatMesAnt,    pedAnt: pedMesAnt,    rotulo: 'Este mês · comparado com o mês anterior' },
  }[p]

  const totFat = soma(conjunto.fat), totPed = soma(conjunto.ped)
  const totFatAnt = soma(conjunto.fatAnt), totPedAnt = soma(conjunto.pedAnt)
  const proporcao = totFat / (soma(fat7) || 1)   // as quebras acompanham o tamanho do período

  return {
    periodo: { chave: p, rotulo: conjunto.rotulo },
    kpis: {
      faturamento: { atual: totFat, anterior: totFatAnt },
      pedidos: { atual: totPed, anterior: totPedAnt },
      ticket: { atual: Math.round((totFat / (totPed || 1)) * 100) / 100, anterior: Math.round((totFatAnt / (totPedAnt || 1)) * 100) / 100 },
    },
    series: {
      labels: conjunto.labels,
      faturamento: { atual: conjunto.fat, anterior: conjunto.fatAnt },
      pedidos: { atual: conjunto.ped, anterior: conjunto.pedAnt },
      ticket: {
        atual: conjunto.fat.map((v, i) => Math.round((v / (conjunto.ped[i] || 1)) * 100) / 100),
        anterior: conjunto.fatAnt.map((v, i) => Math.round((v / (conjunto.pedAnt[i] || 1)) * 100) / 100),
      },
    },
    canais: [
      { label: 'Delivery', value: Math.max(1, Math.round(214 * proporcao)) },
      { label: 'Balcão', value: Math.max(1, Math.round(78 * proporcao)) },
      { label: 'Mesa', value: Math.max(1, Math.round(42 * proporcao)) },
      { label: 'Retirada', value: Math.max(1, Math.round(12 * proporcao)) },
    ],
    formas: [
      { label: 'Pix', value: Math.round(8210.40 * proporcao * 100) / 100 },
      { label: 'Cartão', value: Math.round(7180.90 * proporcao * 100) / 100 },
      { label: 'Dinheiro', value: Math.round(3120.20 * proporcao * 100) / 100 },
      { label: 'A receber', value: Math.round(1908.00 * proporcao * 100) / 100 },
    ],
    bairros: [
      { label: 'Centro', value: Math.max(1, Math.round(88 * proporcao)) },
      { label: 'Jardim América', value: Math.max(1, Math.round(54 * proporcao)) },
      { label: 'Vila Nova', value: Math.max(1, Math.round(37 * proporcao)) },
      { label: 'Boa Vista', value: Math.max(1, Math.round(21 * proporcao)) },
      { label: 'Industrial', value: Math.max(1, Math.round(14 * proporcao)) },
    ],
  }
}

/** Listas de demonstração das telas de módulo (pedidos, carrinhos, clientes, …). */
function listas() {
  const pedidos = [
    { numero: '1043', hora: '20:18', cliente: 'Sandra Reis', canal: 'Delivery', status: 'Novo', valor: 112.80, filtro: 'novo', etapa: 'aguardando', entrouHaMin: 2, pagamento: 'Pix', itens: ['1x Pizza Portuguesa G', '1x Borda recheada', '1x Refrigerante 2L'] },
    { numero: '1042', hora: '20:12', cliente: 'Maria Silva', canal: 'Delivery', status: 'Em produção', valor: 89.90, filtro: 'producao', etapa: 'producao', entrouHaMin: 8, pagamento: 'Pix', itens: ['1x Pizza Calabresa G', '1x Refrigerante 2L'] },
    { numero: '1041', hora: '20:05', cliente: 'João Pereira', canal: 'Balcão', status: 'Pronto', valor: 54.00, filtro: 'pronto', etapa: 'pronto', entrouHaMin: 15, pagamento: 'Cartão', itens: ['1x Pizza Chocolate M'] },
    { numero: '1040', hora: '19:58', cliente: 'Carla Nunes', canal: 'Delivery', status: 'Em entrega', valor: 132.40, filtro: 'entrega', etapa: 'transito', entrouHaMin: 22, pagamento: 'Dinheiro', itens: ['2x Pizza Calabresa G', '1x Cerveja long neck', '1x Borda recheada', '1x Água'] },
    { numero: '1039', hora: '19:22', cliente: 'Mesa 7', canal: 'Mesa', status: 'Em produção', valor: 128.50, filtro: 'producao', etapa: 'producao', entrouHaMin: 31, pagamento: 'Na entrega', itens: ['2x Pizza Portuguesa G'] },
    { numero: '1038', hora: '19:10', cliente: 'Rafael Souza', canal: 'Delivery', status: 'Novo', valor: 76.30, filtro: 'novo', etapa: 'aguardando', entrouHaMin: 12, pagamento: 'Cartão', itens: ['1x Pizza Calabresa M', '1x Refrigerante lata'] },
    { numero: '1037', hora: '18:47', cliente: 'Ana Paula Dias', canal: 'Retirada', status: 'Pronto', valor: 45.00, filtro: 'pronto', etapa: 'pronto', entrouHaMin: 19, pagamento: 'Pix', itens: ['1x Pizza Chocolate M'] },
    { numero: '1036', hora: '18:30', cliente: 'Pedro Henrique', canal: 'Delivery', status: 'Entregue', valor: 98.70, filtro: 'entregue', etapa: 'entregue', entrouHaMin: 62, pagamento: 'Pix', itens: ['1x Pizza Portuguesa G', '1x Refrigerante 2L'] },
    { numero: '1035', hora: '18:05', cliente: 'Luiza Martins', canal: 'Delivery', status: 'Cancelado', valor: 62.00, filtro: 'cancelado', etapa: null, entrouHaMin: 88, pagamento: 'Pix', itens: ['1x Pizza Calabresa M'] },
  ]
  const conta = (f) => pedidos.filter((p) => p.filtro === f).length
  return {
    pedidos: {
      itens: pedidos,
      contadores: { novo: conta('novo'), producao: conta('producao'), pronto: conta('pronto'), entrega: conta('entrega') },
      faturamento: Math.round(pedidos.filter((p) => p.status !== 'Cancelado').reduce((s, p) => s + p.valor, 0) * 100) / 100,
    },
    carrinhos: {
      itens: [
        { cliente: 'Fernanda Lima', telefone: '(75) 98811-2233', itens: 3, paradoHa: '18 min', valor: 92.40 },
        { cliente: 'Marcos Vinícius', telefone: '(75) 99123-4455', itens: 1, paradoHa: '1 h 20', valor: 38.00 },
        { cliente: 'Beatriz Alves', telefone: '(75) 98444-9090', itens: 5, paradoHa: '3 h', valor: 187.60 },
      ],
      total: 318.00, maisAntigo: '3 h',
    },
    clientes: {
      total: 1284, ativosMes: 342, ticket: 59.02,
      itens: [
        { nome: 'Maria Silva', telefone: '(75) 98811-0001', bairro: 'Centro', pedidos: 42, ultimo: 'hoje', total: 2480.30 },
        { nome: 'João Pereira', telefone: '(75) 98811-0002', bairro: 'Jardim América', pedidos: 27, ultimo: 'ontem', total: 1610.00 },
        { nome: 'Carla Nunes', telefone: '(75) 98811-0003', bairro: 'Vila Nova', pedidos: 19, ultimo: 'há 3 dias', total: 1122.80 },
        { nome: 'Rafael Souza', telefone: '(75) 98811-0004', bairro: 'Boa Vista', pedidos: 11, ultimo: 'há 8 dias', total: 690.50 },
        { nome: 'Luiza Martins', telefone: '(75) 98811-0005', bairro: 'Centro', pedidos: 6, ultimo: 'há 12 dias', total: 372.10 },
      ],
    },
    cardapio: {
      total: 86, disponiveis: 79, esgotados: 7, precoMedio: 42.60,
      itens: [
        { nome: 'Pizza Calabresa G', categoria: 'Pizzas salgadas', preco: 59.90, vendas7d: 128, situacao: 'Disponível' },
        { nome: 'Pizza Portuguesa G', categoria: 'Pizzas salgadas', preco: 62.90, vendas7d: 96, situacao: 'Disponível' },
        { nome: 'Pizza Chocolate M', categoria: 'Pizzas doces', preco: 48.00, vendas7d: 41, situacao: 'Disponível' },
        { nome: 'Refrigerante 2L', categoria: 'Bebidas', preco: 12.00, vendas7d: 210, situacao: 'Disponível' },
        { nome: 'Cerveja long neck', categoria: 'Bebidas', preco: 9.00, vendas7d: 88, situacao: 'Esgotado' },
        { nome: 'Borda recheada', categoria: 'Adicionais', preco: 8.00, vendas7d: 132, situacao: 'Disponível' },
      ],
    },
    despacho: {
      contadores: { aguardando: 2, rota: 3, entregue: 24 },
      itens: [
        { pedido: '1040', cliente: 'Carla Nunes', bairro: 'Vila Nova', entregador: 'Tiago', situacao: 'Em rota', saiu: '20:02' },
        { pedido: '1034', cliente: 'Sandra Reis', bairro: 'Centro', entregador: 'Wesley', situacao: 'Em rota', saiu: '19:51' },
        { pedido: '1033', cliente: 'Otávio Brito', bairro: 'Boa Vista', entregador: 'Tiago', situacao: 'Em rota', saiu: '19:40' },
        { pedido: '1041', cliente: 'João Pereira', bairro: 'Jardim América', entregador: null, situacao: 'Aguardando', saiu: null },
        { pedido: '1038', cliente: 'Rafael Souza', bairro: 'Industrial', entregador: null, situacao: 'Aguardando', saiu: null },
      ],
    },
    financeiro: {
      aReceber: 24800.00, aPagar: 17320.50, vencidas: 2,
      itens: [
        { descricao: 'Fornecedor de queijo — NF 8821', categoria: 'Insumos', vencimento: '10/09', situacao: 'A vencer', valor: 4200.00, tipo: 'pagar' },
        { descricao: 'Aluguel do ponto', categoria: 'Fixas', vencimento: '05/09', situacao: 'Vencido', valor: 6800.00, tipo: 'pagar' },
        { descricao: 'Energia elétrica', categoria: 'Fixas', vencimento: '15/09', situacao: 'A vencer', valor: 1920.50, tipo: 'pagar' },
        { descricao: 'Repasse iFood — semana 36', categoria: 'Canais', vencimento: '12/09', situacao: 'A vencer', valor: 8300.00, tipo: 'receber' },
        { descricao: 'Cartão — antecipação', categoria: 'Cartões', vencimento: '09/09', situacao: 'A vencer', valor: 16500.00, tipo: 'receber' },
        { descricao: 'Manutenção do forno', categoria: 'Manutenção', vencimento: '02/09', situacao: 'Vencido', valor: 4400.00, tipo: 'pagar' },
      ],
    },
    entregadores: {
      contadores: { rota: 3, livre: 2 }, entregasHoje: 24,
      itens: [
        { nome: 'Tiago Moura', telefone: '(75) 99000-1111', situacao: 'Em rota', entregas: 11, aReceber: 88.00 },
        { nome: 'Wesley Barros', telefone: '(75) 99000-2222', situacao: 'Em rota', entregas: 8, aReceber: 64.00 },
        { nome: 'Diego Rocha', telefone: '(75) 99000-3333', situacao: 'Em rota', entregas: 5, aReceber: 40.00 },
        { nome: 'Paulo Vieira', telefone: '(75) 99000-4444', situacao: 'Livre', entregas: 0, aReceber: 0 },
        { nome: 'Igor Santana', telefone: '(75) 99000-5555', situacao: 'Livre', entregas: 0, aReceber: 0 },
      ],
    },
  }
}

/** Telas de operação: produção (cozinha/bar) e salão. */
function operacao() {
  return {
    cozinha: { itens: [
      { pedido: '1043', item: '1x Pizza Portuguesa G', obs: 'sem azeitona', estado: 'fazer', esperaMin: 2, canal: 'Delivery' },
      { pedido: '1038', item: '1x Pizza Calabresa M', obs: '', estado: 'fazer', esperaMin: 12, canal: 'Delivery' },
      { pedido: '1042', item: '1x Pizza Calabresa G', obs: 'bem passada', estado: 'fazendo', esperaMin: 8, canal: 'Delivery' },
      { pedido: '1039', item: '2x Pizza Portuguesa G', obs: 'uma sem cebola', estado: 'fazendo', esperaMin: 22, canal: 'Mesa 7' },
      { pedido: '1041', item: '1x Pizza Chocolate M', obs: '', estado: 'pronto', esperaMin: 4, canal: 'Balcão' },
    ] },
    bar: { itens: [
      { pedido: '1043', item: '1x Refrigerante 2L', obs: 'gelado', estado: 'fazer', esperaMin: 2, canal: 'Delivery' },
      { pedido: '1040', item: '1x Cerveja long neck', obs: '', estado: 'fazendo', esperaMin: 5, canal: 'Delivery' },
      { pedido: '1039', item: '2x Suco de laranja', obs: 'sem açúcar', estado: 'pronto', esperaMin: 3, canal: 'Mesa 7' },
    ] },
    salao: { mesas: [
      { numero: '1', lugares: 4, situacao: 'Livre', desdeMin: 0, consumo: 0, garcom: null },
      { numero: '2', lugares: 4, situacao: 'Ocupada', desdeMin: 22, consumo: 96.40, garcom: 'Ana' },
      { numero: '3', lugares: 2, situacao: 'Livre', desdeMin: 0, consumo: 0, garcom: null },
      { numero: '4', lugares: 6, situacao: 'Ocupada', desdeMin: 61, consumo: 312.80, garcom: 'Bruno' },
      { numero: '5', lugares: 4, situacao: 'Reservada', desdeMin: 0, consumo: 0, garcom: null },
      { numero: '6', lugares: 2, situacao: 'Livre', desdeMin: 0, consumo: 0, garcom: null },
      { numero: '7', lugares: 6, situacao: 'Ocupada', desdeMin: 48, consumo: 128.50, garcom: 'Ana' },
      { numero: '8', lugares: 4, situacao: 'Livre', desdeMin: 0, consumo: 0, garcom: null },
      { numero: '9', lugares: 2, situacao: 'Conta pedida', desdeMin: 95, consumo: 214.90, garcom: 'Bruno' },
      { numero: '10', lugares: 8, situacao: 'Ocupada', desdeMin: 15, consumo: 78.00, garcom: 'Carla' },
    ] },
  }
}

/** Listas dos módulos de apoio (compras, estoque, cupons, fidelidade, parceiros, campanhas). */
function listasApoio() {
  return {
    compras: {
      totalMes: 21840.60, fornecedores: 12,
      itens: [
        { fornecedor: 'Laticínios Vale Verde', nota: '8821', entrada: '05/09', itens: 6, situacao: 'Pago', valor: 4200.00 },
        { fornecedor: 'Distribuidora Bebidas SA', nota: '4410', entrada: '04/09', itens: 14, situacao: 'Pendente', valor: 3180.90 },
        { fornecedor: 'Hortifruti do Porto', nota: '992', entrada: '03/09', itens: 22, situacao: 'Pago', valor: 1290.40 },
        { fornecedor: 'Embalagens Norte', nota: '1571', entrada: '02/09', itens: 4, situacao: 'Pendente', valor: 880.00 },
      ],
    },
    estoque: {
      abaixoMinimo: 3, valorTotal: 18420.00,
      itens: [
        { nome: 'Muçarela', unidade: 'kg', saldo: 42, minimo: 30, custo: 38.90 },
        { nome: 'Farinha de trigo', unidade: 'kg', saldo: 18, minimo: 40, custo: 4.20 },
        { nome: 'Molho de tomate', unidade: 'lata', saldo: 61, minimo: 24, custo: 12.50 },
        { nome: 'Calabresa', unidade: 'kg', saldo: 9, minimo: 15, custo: 29.80 },
        { nome: 'Refrigerante 2L', unidade: 'un', saldo: 8, minimo: 24, custo: 6.90 },
        { nome: 'Caixa de pizza G', unidade: 'un', saldo: 340, minimo: 200, custo: 1.80 },
      ],
    },
    cupons: {
      ativos: 3, usosMes: 128, descontoMes: 1840.50,
      itens: [
        { codigo: 'VOLTA10', desconto: '10%', validade: '30/09', usos: 64, situacao: 'Ativo' },
        { codigo: 'PRIMEIRA15', desconto: '15%', validade: '31/12', usos: 41, situacao: 'Ativo' },
        { codigo: 'FRETEGRATIS', desconto: 'Entrega grátis', validade: '15/09', usos: 23, situacao: 'Ativo' },
        { codigo: 'AGOSTO20', desconto: '20%', validade: '31/08', usos: 156, situacao: 'Inativo' },
      ],
    },
    fidelidade: {
      participantes: 412, resgates: 18, pontosAbertos: 9840,
      itens: [
        { nome: 'Maria Silva', telefone: '(75) 98811-0001', pontos: 92, pedidos: 42, proximo: 'faltam 8 pontos' },
        { nome: 'João Pereira', telefone: '(75) 98811-0002', pontos: 74, pedidos: 27, proximo: 'faltam 26 pontos' },
        { nome: 'Carla Nunes', telefone: '(75) 98811-0003', pontos: 51, pedidos: 19, proximo: 'faltam 49 pontos' },
        { nome: 'Rafael Souza', telefone: '(75) 98811-0004', pontos: 30, pedidos: 11, proximo: 'faltam 70 pontos' },
      ],
    },
    parceiros: {
      vendasMes: 14200.00, comissaoMes: 1420.00,
      itens: [
        { nome: 'Hotel Praia Bela', codigo: 'HPB', pedidos: 62, vendas: 7800.00, comissao: 780.00 },
        { nome: 'Pousada do Porto', codigo: 'PDP', pedidos: 41, vendas: 4200.00, comissao: 420.00 },
        { nome: 'Academia Corpo Livre', codigo: 'ACL', pedidos: 22, vendas: 2200.00, comissao: 220.00 },
      ],
    },
    campanhas: {
      alcance: 1840, pedidos: 96,
      itens: [
        { nome: 'Terça em dobro', canal: 'WhatsApp', enviada: '02/09', alcance: 820, pedidos: 44, situacao: 'Ativo' },
        { nome: 'Volta pra gente', canal: 'Push', enviada: '04/09', alcance: 610, pedidos: 31, situacao: 'Ativo' },
        { nome: 'Combo da família', canal: 'WhatsApp', enviada: '31/08', alcance: 410, pedidos: 21, situacao: 'Inativo' },
      ],
    },
  }
}

/** Insights, relatórios e configurações — leitura. */
function apoioFinal() {
  return {
    insights: {
      horarios: { labels: ['10h','11h','12h','13h','14h','15h','16h','17h','18h','19h','20h','21h','22h','23h'],
                  valores: [2, 5, 13, 11, 4, 2, 2, 3, 7, 12, 16, 14, 9, 4] },
      abc: [
        { label: 'Refrigerante 2L', value: 210 },
        { label: 'Borda recheada', value: 132 },
        { label: 'Pizza Calabresa G', value: 128 },
        { label: 'Pizza Portuguesa G', value: 96 },
        { label: 'Cerveja long neck', value: 88 },
      ],
      recorrencia: { novos: 120, voltaram: 222 },
      ticketPorCanal: [
        { label: 'Mesa', value: 98.20 }, { label: 'Delivery', value: 62.40 },
        { label: 'Balcão', value: 48.10 }, { label: 'Retirada', value: 41.90 },
      ],
    },
    relatorios: { itens: [
      { chave: 'vendas', nome: 'Vendas por período', desc: 'faturamento, pedidos e ticket médio', formatos: ['PDF', 'Excel'] },
      { chave: 'produtos', nome: 'Produtos vendidos', desc: 'quantidade e valor por item', formatos: ['PDF', 'Excel'] },
      { chave: 'caixa', nome: 'Fechamento de caixa', desc: 'conferência por turno e operador', formatos: ['PDF'] },
      { chave: 'clientes', nome: 'Clientes', desc: 'cadastro, frequência e gasto', formatos: ['Excel'] },
      { chave: 'entregas', nome: 'Entregas', desc: 'tempo médio por bairro e entregador', formatos: ['PDF', 'Excel'] },
      { chave: 'fiscal', nome: 'Documentos fiscais', desc: 'notas emitidas no período', formatos: ['ZIP'] },
    ] },
    configuracoes: { secoes: [
      { titulo: 'Loja', campos: [
        { rotulo: 'Nome', valor: 'Pizzaria Demonstração' },
        { rotulo: 'Telefone', valor: '(75) 3333-0000' },
        { rotulo: 'Endereço', valor: 'Praia de Guaibim, s/n — Valença/BA' },
        { rotulo: 'Modo de negócio', valor: 'Delivery + salão' },
      ] },
      { titulo: 'Atendimento', campos: [
        { rotulo: 'Horário hoje', valor: '10:00 às 23:30' },
        { rotulo: 'Tempo de preparo', valor: '35 a 50 min' },
        { rotulo: 'Pedido mínimo', valor: 'R$ 25,00' },
      ] },
      { titulo: 'Entrega', campos: [
        { rotulo: 'Taxa por bairro', valor: '5 bairros configurados' },
        { rotulo: 'Raio de entrega', valor: '6 km' },
        { rotulo: 'Entrega grátis a partir de', valor: 'R$ 120,00' },
      ] },
      { titulo: 'Pagamento', campos: [
        { rotulo: 'Formas aceitas', valor: 'Pix, dinheiro, crédito, débito' },
        { rotulo: 'Pix na entrega', valor: 'ativo' },
        { rotulo: 'Taxa de cartão', valor: '2,99% crédito · 1,49% débito' },
      ] },
      { titulo: 'Impressão', campos: [
        { rotulo: 'Impressora', valor: 'POS-80 (USB)' },
        { rotulo: 'Impressão automática', valor: 'ao aceitar o pedido' },
        { rotulo: 'Vias da comanda', valor: '2' },
      ] },
    ] },
    push: {
      alcance: 610, pedidos: 31,
      itens: [
        { nome: 'Volta pra gente', canal: 'Push', enviada: '04/09', alcance: 610, pedidos: 31, situacao: 'Ativo' },
        { nome: 'Chegou pizza nova', canal: 'Push', enviada: '01/09', alcance: 588, pedidos: 22, situacao: 'Inativo' },
      ],
    },
  }
}

module.exports = { menu, caixa, visaoGeral, listas, operacao, listasApoio, apoioFinal }
