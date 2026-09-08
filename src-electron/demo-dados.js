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

/** Um turno de caixa como o das lojas abertas: formas reais (dinheiro, pix,
 *  cartao_entrega), contas de mesa em aberto e entregas a confirmar. */
function caixa() {
  const hoje = new Date()
  const hora = (h, m) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), h, m).toISOString()
  return {
    aberto: { id: 'demo-caixa', abertoEm: hora(9, 56), abertoPor: 'Administrador', fundoInicial: 0, abertoHaMin: 298 },
    resumo: {
      vendaDinheiro: 842.50, vendaPix: 1310.00, vendaCartao: 2145.90,
      vendaAReceber: 180.00, suprimentos: 50, sangrias: 300, ajustes: 0,
    },
    esperadoDinheiro: 592.50,
    temMesas: true,
    movimentacoes: [
      { id: 'd1', tipo: 'venda', forma: 'pix', valor: 89.90, descricao: 'Pedido #1042 — Maria S.', criadoEm: hora(20, 12), estornada: false },
      { id: 'd2', tipo: 'venda', forma: 'dinheiro', valor: 54.00, descricao: 'Pedido #1041 — balcão', criadoEm: hora(20, 5), estornada: false },
      { id: 'd3', tipo: 'sangria', forma: null, valor: 300.00, descricao: 'Retirada para o cofre', criadoEm: hora(19, 40), estornada: false },
      { id: 'd4', tipo: 'venda', forma: 'cartao_entrega', valor: 128.50, descricao: 'Pedido #1039 — mesa 7', criadoEm: hora(19, 22), estornada: true },
      { id: 'd5', tipo: 'suprimento', forma: 'dinheiro', valor: 50.00, descricao: 'Troco do turno', criadoEm: hora(18, 0), estornada: false },
      { id: 'd6', tipo: 'venda', forma: 'dinheiro', valor: 788.50, descricao: 'Vendas do almoço (consolidado)', criadoEm: hora(14, 30), estornada: false },
    ],
    // contas de mesa abertas — o que precisa fechar antes de o caixa fechar
    mesas: [
      { mesa: '14', abertaHa: 114, consumo: 76.90, garcom: 'Valdecir de Jesus', pedidos: 2, situacao: 'Em preparo', cliente: null },
      { mesa: '16', abertaHa: 293, consumo: 184.28, garcom: 'Valdecir de Jesus', pedidos: 4, situacao: 'Pedido pronto', cliente: null },
      { mesa: '19', abertaHa: 188, consumo: 221.58, garcom: 'Ícaro Santos', pedidos: 5, situacao: 'Em preparo', cliente: null },
      { mesa: '27', abertaHa: 33, consumo: 156.80, garcom: null, pedidos: 2, situacao: 'Em preparo', cliente: null, pessoas: 2 },
      { mesa: '34', abertaHa: 98, consumo: 76.65, garcom: 'Ícaro Santos', pedidos: 1, situacao: 'Em preparo', cliente: null },
    ],
    // entregas já entregues cujo dinheiro ninguém confirmou (a checagem que o painel
    // faz ao fechar: sem isso a venda fica fora do caixa)
    entregas: [
      { pedido: '1040', cliente: 'Carla Nunes', entregador: 'Tiago', forma: 'dinheiro', valor: 132.40,
        saiuHa: 22, tipo: 'entrega', estado: 'transito', trocoPara: 150.00 },
      { pedido: '1034', cliente: 'Sandra Reis', entregador: 'Wesley', forma: 'cartao_entrega', valor: 88.00,
        saiuHa: 35, tipo: 'entrega', estado: 'transito', trocoPara: 0 },
      { pedido: '1033', cliente: 'Otávio Brito', entregador: 'Tiago', forma: 'dinheiro', valor: 64.90,
        saiuHa: 48, tipo: 'entrega', estado: 'fechamento', trocoPara: 0 },
      { pedido: '1044', cliente: 'Marina Prado', entregador: null, forma: 'pix', valor: 96.00,
        saiuHa: 0, tipo: 'entrega', estado: 'preparo', trocoPara: 0 },
      { pedido: '1045', cliente: 'Johnatan', entregador: null, forma: 'dinheiro', valor: 48.50,
        saiuHa: 0, tipo: 'retirada', estado: 'pronto', trocoPara: 60.00 },
    ],
    historico: [
      { id: 'h1', aberto: '06/09 08:00', fechado: '06/09 23:40', operador: 'Ana Paula', vendas: 4210.00, diferenca: -12.50 },
      { id: 'h2', aberto: '05/09 08:10', fechado: '05/09 23:20', operador: 'Bruno Alves', vendas: 3980.70, diferenca: 0 },
      { id: 'h3', aberto: '04/09 08:05', fechado: '04/09 22:50', operador: 'Ana Paula', vendas: 2450.30, diferenca: 8.00 },
      { id: 'h4', aberto: '03/09 08:00', fechado: '03/09 23:10', operador: 'Carla Dias', vendas: 3010.90, diferenca: -3.20 },
    ],
  }
}

/** Visão geral por período. `dia`/`ontem` vêm hora a hora; `semana`/`mes`, dia a dia.
 *  Cada período traz também o anterior, para a comparação dos KPIs e do gráfico. */
function visaoGeral(periodo) {
  // Os períodos do painel: Hoje · Esta semana · Este mês · Mês anterior. 'hoje' é o dia
  // hora a hora; 'mes_anterior' repete a curva do mês contra o mês antes dele.
  const APELIDOS = { hoje: 'dia', mes_anterior: 'mes' }
  const p = APELIDOS[periodo] || (['dia', 'ontem', 'semana', 'mes'].indexOf(periodo) >= 0 ? periodo : 'semana')
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

  // Os dois números do dia, sempre — a faixa "HOJE" não muda com o período escolhido.
  const doDia = { faturamento: 3440.79, pedidos: 60 }
  // Como o faturamento é composto: é isso que a tela deixa somar e tirar.
  const composicao = { produtos: 3217.76, taxaEntrega: 0, taxaServico: 223.03, descontos: 0 }
  const segmentos = {
    forma: [
      { rotulo: 'Cartão de crédito', faturamento: 1336.93, pedidos: 20 },
      { rotulo: 'PIX', faturamento: 1012.99, pedidos: 19 },
      { rotulo: 'Cartão de débito', faturamento: 452.56, pedidos: 10 },
      { rotulo: 'Dinheiro', faturamento: 415.28, pedidos: 11 },
    ],
    canal: [
      { rotulo: 'Mesa', faturamento: 2890.40, pedidos: 44 },
      { rotulo: 'Delivery', faturamento: 412.30, pedidos: 11 },
      { rotulo: 'Balcão', faturamento: 138.09, pedidos: 5 },
    ],
    tipo: [
      { rotulo: 'Consumo local', faturamento: 2890.40, pedidos: 44 },
      { rotulo: 'Entrega', faturamento: 412.30, pedidos: 11 },
      { rotulo: 'Retirada', faturamento: 138.09, pedidos: 5 },
    ],
  }
  return {
    hoje: doDia, composicao, segmentos,
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
    // espelha o que as lojas abertas mostram: cancelamento relevante e, na maioria,
    // sem motivo registrado
    cancelados: {
      pedidos: Math.max(1, Math.round(24 * proporcao)),
      valor: Math.round(1296.27 * proporcao * 100) / 100,
      motivos: [
        { label: 'Sem motivo registrado', value: Math.max(1, Math.round(18 * proporcao)) },
        { label: 'Desistiu', value: Math.max(1, Math.round(4 * proporcao)) },
        { label: 'Pedido errado', value: Math.max(1, Math.round(3 * proporcao)) },
        { label: 'Produto em falta', value: Math.max(1, Math.round(2 * proporcao)) },
      ],
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
    { numero: '1043', hora: '20:18', cliente: 'Sandra Reis', canal: 'Delivery', status: 'Novo', valor: 112.80, filtro: 'novo', etapa: 'analise', entrouHaMin: 2, pagamento: 'Pix', telefone: '(75) 98811-7788', endereco: 'Rua das Palmeiras, 45 — Centro', taxa: 8.00, desconto: 0, forma: 'Pix', esperaMin: 2, itens: ['1x Pizza Portuguesa G', '1x Borda recheada', '1x Refrigerante 2L'] },
    { numero: '1042', hora: '20:12', cliente: 'Maria Silva', canal: 'Delivery', status: 'Em produção', valor: 89.90, filtro: 'producao', etapa: 'producao', entrouHaMin: 8, pagamento: 'Pix', telefone: '(75) 98811-0001', endereco: 'Rua das Flores, 120 — Centro', taxa: 8.00, desconto: 5.00, forma: 'Pix', esperaMin: 8, itens: ['1x Pizza Calabresa G', '1x Refrigerante 2L'] },
    { numero: '1041', hora: '20:05', cliente: 'João Pereira', canal: 'Balcão', status: 'Pronto', valor: 54.00, filtro: 'pronto', etapa: 'pronto', entrouHaMin: 15, pagamento: 'Cartão', telefone: '(75) 98811-0002', endereco: null, taxa: 0, desconto: 0, forma: 'Cartão', esperaMin: 15, itens: ['1x Pizza Chocolate M'] },
    { numero: '1040', hora: '19:58', cliente: 'Carla Nunes', canal: 'Delivery', status: 'Em entrega', valor: 132.40, filtro: 'entrega', etapa: 'transito', entrouHaMin: 22, pagamento: 'Dinheiro', forma: 'Dinheiro', esperaMin: 22, itens: ['2x Pizza Calabresa G', '1x Cerveja long neck', '1x Borda recheada', '1x Água'] },
    { numero: '1039', hora: '19:22', cliente: 'Mesa 7', canal: 'Mesa', status: 'Em produção', valor: 128.50, filtro: 'producao', etapa: 'producao', entrouHaMin: 31, pagamento: 'Na entrega', contaAberta: true, forma: null, esperaMin: 31, itens: ['2x Pizza Portuguesa G'] },
    { numero: '1038', hora: '19:10', cliente: 'Rafael Souza', canal: 'Delivery', status: 'Novo', valor: 76.30, filtro: 'novo', etapa: 'analise', entrouHaMin: 12, pagamento: 'Cartão', forma: 'Cartão', esperaMin: 12, itens: ['1x Pizza Calabresa M', '1x Refrigerante lata'] },
    { numero: '1037', hora: '18:47', cliente: 'Ana Paula Dias', canal: 'Retirada', status: 'Pronto', valor: 45.00, filtro: 'pronto', etapa: 'pronto', entrouHaMin: 19, pagamento: 'Pix', forma: 'Pix', esperaMin: 19, itens: ['1x Pizza Chocolate M'] },
    { numero: '1036', hora: '18:30', cliente: 'Pedro Henrique', canal: 'Delivery', status: 'Entregue', valor: 98.70, filtro: 'entregue', etapa: 'entregue', entrouHaMin: 62, pagamento: 'Pix', forma: 'Pix', esperaMin: 62, itens: ['1x Pizza Portuguesa G', '1x Refrigerante 2L'] },
    { numero: '1035', hora: '18:05', cliente: 'Luiza Martins', canal: 'Delivery', status: 'Cancelado', valor: 62.00, filtro: 'cancelado', etapa: null, entrouHaMin: 88, pagamento: 'Pix', forma: 'Pix', esperaMin: 88, itens: ['1x Pizza Calabresa M'] },
  ]
  const conta = (f) => pedidos.filter((p) => p.filtro === f).length
  return {
    pedidos: {
      // a faixa de indicadores do painel: pedidos do dia, cancelados e o tempo médio
      // contra a meta — na loja real o médio estava muito acima, e é isso que precisa
      // saltar aos olhos
      kpis: { online: 3, hoje: 37, cancelados: 5, analise: conta('novo'), producao: conta('producao'),
        prontos: conta('pronto'), entregues: 13, tempoMedio: 38, meta: 15 },
      lojaAberta: true, aceiteAutomatico: true, tempos: { balcao: 30, delivery: 45 },
      itens: pedidos,
      contadores: { novo: conta('novo'), producao: conta('producao'), pronto: conta('pronto'), entrega: conta('entrega') },
      faturamento: Math.round(pedidos.filter((p) => p.status !== 'Cancelado').reduce((s, p) => s + p.valor, 0) * 100) / 100,
    },
    carrinhos: {
      kpis: { abertos: 3, identificados: 2, abandonados: 3, totalEmAberto: 318.00 },
      total: 318.00, maisAntigo: '3 h',
      itens: [
        { cliente: 'Fernanda Lima', telefone: '(75) 98811-2233', itens: 3, paradoMin: 18, total: 92.40 },
        { cliente: 'Marcos Vinícius', telefone: '(75) 99123-4455', itens: 1, paradoMin: 80, total: 38.00 },
        { cliente: null, telefone: null, itens: 5, paradoMin: 187, total: 187.60 },
      ],
    },
    clientes: {
      kpis: { unicos: 1284, vips: 38, emRisco: 96, ticketGeral: 56.20 },
      total: 1284, ativosMes: 342, ticket: 56.20,
      itens: [
        { nome: 'Maria Silva', telefone: '(75) 98811-0001', bairro: 'Centro', segmento: 'VIP', pedidos: 42,
          totalGasto: 2480.30, ticket: 59.05, freqMes: 4.2, ultimo: 'hoje', diaFavorito: 'Sexta', pontos: 92,
          ultimos: [{ numero: '1042', data: 'hoje', valor: 89.90 }, { numero: '0994', data: '02/09', valor: 112.40 }] },
        { nome: 'João Pereira', telefone: '(75) 98811-0002', bairro: 'Jardim América', segmento: 'Fiel', pedidos: 27,
          totalGasto: 1610.00, ticket: 59.63, freqMes: 2.7, ultimo: 'ontem', diaFavorito: 'Quarta', pontos: 74 },
        { nome: 'Carla Nunes', telefone: '(75) 98811-0003', bairro: 'Vila Nova', segmento: 'Novo', pedidos: 3,
          totalGasto: 322.80, ticket: 107.60, freqMes: 1.5, ultimo: 'há 3 dias', diaFavorito: 'Sábado', pontos: 12 },
        { nome: 'Rafael Souza', telefone: '(75) 98811-0004', bairro: 'Boa Vista', segmento: 'Em risco', pedidos: 11,
          totalGasto: 690.50, ticket: 62.77, freqMes: 0.3, ultimo: 'há 62 dias', diaFavorito: 'Domingo', pontos: 30 },
        { nome: 'Fabricios', telefone: '(75) 98280-4132', bairro: null, segmento: 'Importado', pedidos: 0,
          totalGasto: 0, ticket: 0, freqMes: 0, ultimo: 'Sem pedido', diaFavorito: null, pontos: 0 },
      ],
    },
    cardapio: {
      qualidade: { pontuacao: 63, promocionais: 1, comFotos: 71, comDescricoes: 79, promocoesCategorias: 0 },
      categorias: [
        { nome: 'Promoção do dia! 🔥', etiquetas: ['Promocional', 'OCULTA', 'Destaque pop-up'], esgotada: false, itens: [
          { id: 'demo-p1', nome: 'Combo casal — 2 pizzas G', preco: 99.90, esgotado: false, foto: true, descricao: 'Duas pizzas grandes + refrigerante 2L' },
        ] },
        { nome: 'Pizzas salgadas', etiquetas: ['Pizza', 'Itens principais'], esgotada: false, itens: [
          { id: 'demo-p2', nome: 'Calabresa', preco: 44.90, esgotado: false, foto: true, descricao: 'Molho, muçarela, calabresa e cebola' },
          { id: 'demo-p3', nome: 'Portuguesa', preco: 47.90, esgotado: false, foto: true, descricao: 'Presunto, ovo, ervilha, cebola e azeitona' },
          { id: 'demo-p4', nome: 'Frango com catupiry', preco: 49.90, esgotado: false, foto: false },
          { id: 'demo-p5', nome: 'Marguerita', preco: 42.90, esgotado: true, foto: true, descricao: 'Manjericão fresco' },
        ] },
        { nome: 'Pizzas doces', etiquetas: ['Pizza'], esgotada: false, itens: [
          { id: 'demo-p6', nome: 'Chocolate', preco: 39.90, esgotado: false, foto: true },
          { id: 'demo-p7', nome: 'Romeu e Julieta', preco: 41.90, esgotado: false, foto: false },
        ] },
        { nome: 'Bebidas', etiquetas: ['Itens principais'], esgotada: false, itens: [
          { id: 'demo-p8', nome: 'Refrigerante 2L', preco: 12.00, esgotado: false, foto: true },
          { id: 'demo-p9', nome: 'Refrigerante lata', preco: 6.00, esgotado: false, foto: true },
          { id: 'demo-p10', nome: 'Cerveja long neck', preco: 9.00, esgotado: true, foto: false, descricao: 'Preço sob consulta — confirmar com a loja antes de ativar a venda.' },
          { id: 'demo-p11', nome: 'Suco de laranja 500ml', preco: 11.00, esgotado: false, foto: false },
        ] },
        { nome: 'Adicionais', etiquetas: [], esgotada: false, itens: [
          { id: 'demo-p12', nome: 'Borda recheada', preco: 8.00, esgotado: false, foto: false },
          { id: 'demo-p13', nome: 'Bacon extra', preco: 6.00, esgotado: false, foto: false },
        ] },
      ],
      // continua servindo a lista simples (a tela antiga usava isto)
      total: 13, disponiveis: 11, esgotados: 2, precoMedio: 33.60,
      itens: [
        { nome: 'Calabresa', categoria: 'Pizzas salgadas', preco: 44.90, vendas7d: 128, situacao: 'Disponível', custo: 18.40,
          insumos: ['Massa 350g', 'Muçarela 250g', 'Calabresa 120g', 'Molho 80g'] },
        { nome: 'Portuguesa', categoria: 'Pizzas salgadas', preco: 47.90, vendas7d: 96, situacao: 'Disponível' },
        { nome: 'Refrigerante 2L', categoria: 'Bebidas', preco: 12.00, vendas7d: 210, situacao: 'Disponível' },
        { nome: 'Cerveja long neck', categoria: 'Bebidas', preco: 9.00, vendas7d: 88, situacao: 'Esgotado' },
      ],
    },
    despacho: {
      // fila agrupada por bairro, como o painel: quem despacha junta o mesmo lado da cidade
      prontos: [
        { pedido: '7', cliente: 'Ilzadora Matos', bairro: 'Areal', esperaMin: 36, forma: 'pix', pago: true, valor: 28.99 },
        { pedido: '10', cliente: 'Franciele Silva', bairro: 'Centro', esperaMin: 29, forma: 'cartao', pago: false, valor: 66.97 },
        { pedido: '132', cliente: 'Ana Souza', bairro: 'São Félix', esperaMin: 18, forma: 'pix', pago: true, valor: 139.80 },
        { pedido: '133', cliente: 'Bruno Lima', bairro: 'São Félix', esperaMin: 15, forma: 'dinheiro', pago: false, valor: 74.90 },
        { pedido: '134', cliente: 'Carla Santos', bairro: 'São Félix', esperaMin: 12, forma: 'dinheiro', pago: false, valor: 98.90 },
        { pedido: '135', cliente: 'Diego Ferreira', bairro: 'Guaibim', esperaMin: 47, forma: 'pix', pago: true, valor: 142.80 },
        { pedido: '136', cliente: 'Elaine Costa', bairro: 'Guaibim', esperaMin: 9, forma: 'cartao', pago: false, valor: 64.90 },
      ],
      emTransito: [
        { entregador: 'Tiago Moura', entregas: 2, dinheiroAReceber: 197.30, esperadoDeVolta: 247.30, rotaId: 'r1' },
        { entregador: 'Wesley Barros', entregas: 3, dinheiroAReceber: 88.00, esperadoDeVolta: 138.00, rotaId: 'r2' },
      ],
      entregadores: ['Tiago Moura', 'Wesley Barros', 'Diego Rocha', 'Paulo Vieira'],
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
    cozinha: { acessoTv: { definido: true, dispositivos: 1 }, pedidos: [
      { numero: 1043, tipo: 'entrega', mesa: null, cliente: 'Marina Prado', esperaMin: 2, obs: null, itens: [
        { id: 'c1', qtd: 1, nome: 'Pizza Grande - 8 fatias', sabores: [{ nome: 'Portuguesa' }, { nome: 'Calabresa' }], obs: 'sem azeitona', estado: 'pendente' },
        { id: 'c2', qtd: 1, nome: 'Batata Frita (300g)', sabores: [], obs: null, estado: 'pendente' },
      ] },
      { numero: 1042, tipo: 'entrega', mesa: null, cliente: 'Rafael Souza', esperaMin: 8, obs: 'entregar na portaria', itens: [
        { id: 'c3', qtd: 1, nome: 'Pizza Média - 6 fatias', sabores: [{ nome: 'Calabresa' }, { grupo: 'Borda', nome: 'Catupiry' }], obs: 'bem passada', estado: 'preparando' },
      ] },
      { numero: 1039, tipo: 'consumo_local', mesa: '7', cliente: 'Mesa 7', esperaMin: 22, obs: null, itens: [
        { id: 'c4', qtd: 2, nome: 'Pizza Grande - 8 fatias', sabores: [{ nome: 'Portuguesa' }], obs: 'uma sem cebola', estado: 'preparando' },
        { id: 'c5', qtd: 1, nome: 'Moqueca de Peixe', sabores: [], obs: null, estado: 'pronto' },
      ] },
      { numero: 1041, tipo: 'retirada', mesa: null, cliente: 'Johnatan', esperaMin: 4, obs: null, itens: [
        { id: 'c6', qtd: 1, nome: 'Pizza Média - 6 fatias', sabores: [{ nome: 'Chocolate com morango' }], obs: null, estado: 'pronto' },
      ] },
      { numero: 1037, tipo: 'consumo_local', mesa: '14', cliente: 'Mesa 14', esperaMin: 61, obs: null, itens: [
        { id: 'c7', qtd: 1, nome: 'X Egg Bacon', sabores: [{ grupo: 'Carne', nome: '75g' }], obs: null, estado: 'pendente' },
      ] },
    ] },
    bar: { acessoTv: { definido: false, dispositivos: 0 }, pedidos: [
      { numero: 1043, tipo: 'entrega', mesa: null, cliente: 'Marina Prado', esperaMin: 2, obs: null, itens: [
        { id: 'b1', qtd: 1, nome: 'Refrigerante (2 L)', sabores: [{ nome: 'Guaraná' }], obs: 'gelado', estado: 'pendente' },
      ] },
      { numero: 1040, tipo: 'entrega', mesa: null, cliente: 'Camila Dias', esperaMin: 5, obs: null, itens: [
        { id: 'b2', qtd: 1, nome: 'Cerveja (600 ml)', sabores: [{ nome: 'Skol' }], obs: null, estado: 'preparando' },
      ] },
      { numero: 1039, tipo: 'consumo_local', mesa: '7', cliente: 'Mesa 7', esperaMin: 22, obs: null, itens: [
        { id: 'b3', qtd: 2, nome: 'Suco de laranja', sabores: [], obs: 'sem açúcar', estado: 'pronto' },
        { id: 'b4', qtd: 1, nome: 'Água de Coco', sabores: [], obs: null, estado: 'pronto' },
      ] },
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
      repor: [
        { nome: 'Farinha de trigo', saldo: 18, unidade: 'kg', minimo: 40, custo: 4.20 },
        { nome: 'Calabresa', saldo: 9, unidade: 'kg', minimo: 15, custo: 29.80 },
        { nome: 'Refrigerante 2L', saldo: 0, unidade: 'un', minimo: 24, custo: 6.90 },
      ],
      avulsos: [
        { nome: 'Saco de lixo 100L', qtd: 4, unidade: 'pct' },
        { nome: 'Detergente neutro', qtd: 6, unidade: 'un' },
      ],
      comprados: [
        { nome: 'Papel toalha', qtd: 12, unidade: 'rolo' },
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
      itens: [
        { codigo: 'VOLTA10', descricao: '10% off pra quem sumiu', desconto: '10%', validade: '30/09', usos: 64, situacao: 'Ativo', cor: '#14CE6B', primeiraCompra: false, freteGratis: false },
        { codigo: 'PRIMEIRA15', descricao: '15% na primeira compra', desconto: '15%', validade: '31/12', usos: 41, situacao: 'Ativo', cor: '#2f7ff0', primeiraCompra: true, freteGratis: false },
        { codigo: 'FRETEGRATIS', descricao: 'Entrega por nossa conta', desconto: 'Entrega grátis', validade: '15/09', usos: 23, situacao: 'Ativo', cor: '#ea6a20', primeiraCompra: false, freteGratis: true },
        { codigo: 'AGOSTO20', descricao: 'Promoção de agosto', desconto: '20%', validade: '31/08', usos: 156, situacao: 'Inativo', cor: '#9b5de5', primeiraCompra: false, freteGratis: false },
      ],
    },
    fidelidade: {
      ativo: true, intervalo: '09/08/2026 a 07/09/2026',
      pontosDistribuidos: 9840, pontosResgatados: 2160, emDescontos: 216.00, resgates: 18,
      regras: { pontosPorReal: 1, valorDoPonto: 0.10, minimoResgate: 100, validade: '12 meses' },
      porDia: [
        { dia: '01/09', pontos: 320 }, { dia: '02/09', pontos: 410 }, { dia: '03/09', pontos: 280 },
        { dia: '04/09', pontos: 520 }, { dia: '05/09', pontos: 890 }, { dia: '06/09', pontos: 1240 },
        { dia: '07/09', pontos: 640 },
      ],
      topGanhos: [
        { nome: 'Maria Silva', telefone: '(75) 98811-0001', pontos: 920 },
        { nome: 'João Pereira', telefone: '(75) 98811-0002', pontos: 740 },
        { nome: 'Carla Nunes', telefone: '(75) 98811-0003', pontos: 510 },
      ],
      topResgates: [
        { nome: 'João Pereira', telefone: '(75) 98811-0002', pontos: 800 },
        { nome: 'Maria Silva', telefone: '(75) 98811-0001', pontos: 600 },
      ],
      premios: [
        { nome: 'Pizza média grátis', resgates: 9, pontos: 1080 },
        { nome: 'Refrigerante 2L', resgates: 6, pontos: 480 },
        { nome: 'Sobremesa', resgates: 3, pontos: 600 },
      ],
      atividades: [
        { quando: '07/09 20:14', cliente: 'Maria Silva', tipo: 'Ganho', pontos: 62, pedido: '#1043' },
        { quando: '07/09 19:02', cliente: 'João Pereira', tipo: 'Resgate', pontos: 200, pedido: '#1041' },
        { quando: '06/09 21:30', cliente: 'Carla Nunes', tipo: 'Ganho', pontos: 48, pedido: '#1030' },
      ],
      itens: [
        { nome: 'Maria Silva', telefone: '(75) 98811-0001', pontos: 92, pedidos: 42, proximo: 'faltam 8 pontos' },
        { nome: 'João Pereira', telefone: '(75) 98811-0002', pontos: 74, pedidos: 27, proximo: 'faltam 26 pontos' },
        { nome: 'Carla Nunes', telefone: '(75) 98811-0003', pontos: 51, pedidos: 19, proximo: 'faltam 49 pontos' },
        { nome: 'Rafael Souza', telefone: '(75) 98811-0004', pontos: 30, pedidos: 11, proximo: 'faltam 70 pontos' },
      ],
    },
    parceiros: {
      comissaoPaga: 980.00,
      itens: [
        { nome: 'Hotel Praia Bela', tipo: 'Parceiro', codigo: 'HPB', pedidos: 62, vendas: 7800.00, comissao: 780.00, situacao: 'Ativo' },
        { nome: 'Pousada do Porto', tipo: 'Parceiro', codigo: 'PDP', pedidos: 41, vendas: 4200.00, comissao: 420.00, situacao: 'Ativo' },
        { nome: 'Academia Corpo Livre', tipo: 'Vendedor', codigo: 'ACL', pedidos: 22, vendas: 2200.00, comissao: 220.00, situacao: 'Ativo' },
        { nome: 'Bia do Guaibim', tipo: 'Influencer', codigo: 'BIA10', pedidos: 14, vendas: 980.00, comissao: 98.00, situacao: 'Inativo' },
      ],
    },
    campanhas: {
      totalContatos: 412, audiencia: 128,
      perfis: { vip: 18, leal: 46, novo: 128, risco: 61, perdido: 92, regular: 66, importado: 1 },
      contatos: [
        { nome: 'Maria Silva', perfil: 'VIP', gasto: 2140.00 },
        { nome: 'João Pereira', perfil: 'Leal', gasto: 1380.50 },
        { nome: 'Carla Nunes', perfil: 'Novo', gasto: 189.90 },
      ],
      historico: [
        { nome: 'Terça em dobro', perfil: 'Leal', enviada: '02/09', contatos: 820, pedidos: 44 },
        { nome: 'Volta pra gente', perfil: 'Em risco', enviada: '04/09', contatos: 610, pedidos: 31 },
        { nome: 'Combo da família', perfil: 'VIP', enviada: '31/08', contatos: 410, pedidos: 21 },
      ],
      numeroEnvio: '(75) 98811-9000', intervaloSegundos: 8, cota: 3000, cotaUsada: 1840,
    },
  }
}

/** Insights, relatórios e configurações — leitura. */
function apoioFinal() {
  return {
    insights: {
      geral: { faturamento: 17107.25, entrega: 0, recebido: 17107.25, pedidos: 315, ticket: 54.31, clientes: 128, cancelamentoPct: 7.4 },
      financeiro: { receitas: 17571.89, despesas: 0, taxaEntrega: 0, saldo: 17571.89 },
      formas: [
        { nome: 'Crédito', valor: 4716.24 }, { nome: 'Dinheiro', valor: 4685.51 },
        { nome: 'Pix', valor: 4108.98 }, { nome: 'Débito', valor: 4035.87 }, { nome: 'Cartão', valor: 25.29 },
      ],
      origens: [{ nome: 'Vendas', receita: 17571.89, despesa: 0 }],
      canais: [
        { nome: 'Mesa', pedidos: 315, faturamento: 17107.25 },
        { nome: 'Sem fonte', pedidos: 0, faturamento: 0 },
      ],
      pareto: { produtos: 31, total: 77 },
      mix: { cozinha: 6869.32, bar: 599.80, produtosCozinha: 10, produtosBar: 10 },
      destaques: { diaForte: 'Domingo', diaFortePedidos: 165, diaFraco: 'Quinta', diaFracoPedidos: 6,
        horarioPico: '23h – 24h', horarioPicoPedidos: 42, modalidadeTop: 'Mesa', modalidadeTopPct: 100 },
      porDia: [
        { dia: 'Dom', pedidos: 165 }, { dia: 'Seg', pedidos: 50 }, { dia: 'Ter', pedidos: 0 },
        { dia: 'Qua', pedidos: 7 }, { dia: 'Qui', pedidos: 6 }, { dia: 'Sex', pedidos: 13 }, { dia: 'Sáb', pedidos: 74 },
      ],
      porHora: [
        { hora: '11h', pedidos: 4 }, { hora: '12h', pedidos: 18 }, { hora: '13h', pedidos: 16 },
        { hora: '14h', pedidos: 9 }, { hora: '15h', pedidos: 6 }, { hora: '18h', pedidos: 14 },
        { hora: '19h', pedidos: 26 }, { hora: '20h', pedidos: 31 }, { hora: '21h', pedidos: 24 },
        { hora: '22h', pedidos: 19 }, { hora: '23h', pedidos: 42 },
      ],
      produtos: {
        cozinha: [
          { nome: 'Filé de Frango', qtd: 39, detalhe: 'R$ 974,61' },
          { nome: 'X Bacon', qtd: 39, detalhe: 'R$ 1291,00' },
          { nome: 'Bife Acebolado', qtd: 24, detalhe: 'R$ 741,60' },
          { nome: 'X Burger', qtd: 24, detalhe: 'R$ 690,00' },
          { nome: 'Moqueca de Peixe', qtd: 8, detalhe: 'R$ 1159,00' },
        ],
        bar: [
          { nome: 'Cerveja', qtd: 97, detalhe: 'R$ 1332,50' },
          { nome: 'Refrigerante (1 L)', qtd: 44, detalhe: 'R$ 567,60' },
          { nome: 'Água de Coco', qtd: 39, detalhe: 'R$ 311,61' },
          { nome: 'Refrigerante (350 ml)', qtd: 33, detalhe: 'R$ 293,70' },
          { nome: 'Cokitel de Morango', qtd: 6, detalhe: 'R$ 173,40' },
        ],
        categorias: [
          { nome: 'Burgers Gourmet', receita: 4223.31, detalhe: '132 uni' },
          { nome: 'Pratos Executivos', receita: 2388.04, detalhe: '81 uni' },
          { nome: 'Premium Burgers', receita: 1913.99, detalhe: '33 uni' },
          { nome: 'Bebidas', receita: 1734.81, detalhe: '180 uni' },
          { nome: 'Cervejas', receita: 1332.50, detalhe: '97 uni' },
        ],
      },
      baixaVenda: [
        { nome: 'Cerveja sem Álcool (350 ml)', vendas: 1, receita: 10.90 },
        { nome: 'Espaguete ao Molho Branco', vendas: 1, receita: 99.90 },
        { nome: 'Tábua de Frios Pequena', vendas: 1, receita: 69.90 },
      ],
    },
    relatorios: {
      intervalo: '08/08/2026 a 07/09/2026', de: '08/08/2026', ate: '07/09/2026',
      vendas: {
        faturamento: 17107.25, entrega: 0, recebido: 17107.25, pedidos: 315, ticket: 54.31, cancelados: 25,
        serie: [
          { dia: '26/08', valor: 420 }, { dia: '27/08', valor: 380 }, { dia: '28/08', valor: 510 },
          { dia: '29/08', valor: 980 }, { dia: '30/08', valor: 1120 }, { dia: '04/09', valor: 860 },
          { dia: '05/09', valor: 3120 }, { dia: '06/09', valor: 6980 }, { dia: '07/09', valor: 2740 },
        ],
        modalidades: [
          { nome: 'Mesa', pedidos: 315, valor: 17107.25 },
        ],
        formas: [
          { nome: 'Cartão', valor: 7995.62 }, { nome: 'PIX', valor: 4795.94 }, { nome: 'Dinheiro', valor: 4315.69 },
        ],
      },
      secoes: {
        pedidos: { titulo: 'Pedidos', sub: 'por situação no período',
          colunas: ['Situação', 'Pedidos', 'Valor'], grade: '1fr 140px 180px', direita: [1, 2],
          linhas: [['Entregues', '290', 'R$ 15.820,40'], ['Cancelados', '25', 'R$ 1.286,85']] },
        cardapio: { titulo: 'Cardápio', sub: 'saída por produto',
          colunas: ['Produto', 'Quantidade', 'Receita'], grade: '1fr 140px 180px', direita: [1, 2],
          linhas: [['Cerveja', '97', 'R$ 1.332,50'], ['X Bacon', '39', 'R$ 1.291,00'], ['Filé de Frango', '39', 'R$ 974,61']] },
        entregadores: { titulo: 'Entregadores', sub: 'entregas e valor levado',
          colunas: ['Entregador', 'Entregas', 'Valor'], grade: '1fr 140px 180px', direita: [1, 2],
          linhas: [] },
        reposicao: { titulo: 'Reposição', sub: 'o que precisa comprar',
          colunas: ['Produto', 'Saldo', 'Comprar'], grade: '1fr 140px 180px', direita: [1, 2],
          linhas: [['Farinha de trigo', '18 kg', '62 kg'], ['Calabresa', '9 kg', '21 kg']] },
        parceiros: { titulo: 'Parceiros', sub: 'vendas e comissão',
          colunas: ['Parceiro', 'Pedidos', 'Comissão'], grade: '1fr 140px 180px', direita: [1, 2],
          linhas: [['Hotel Praia Bela', '62', 'R$ 780,00'], ['Pousada do Porto', '41', 'R$ 420,00']] },
        clientes: { titulo: 'Clientes', sub: 'quem mais comprou',
          colunas: ['Cliente', 'Pedidos', 'Gasto'], grade: '1fr 140px 180px', direita: [1, 2],
          linhas: [['Maria Silva', '42', 'R$ 2.140,00'], ['João Pereira', '27', 'R$ 1.380,50']] },
      },
    },
    configuracoes: {
      abas: {
        config: [
          { titulo: '', colunas: 3, campos: [
            { rotulo: 'Nome fantasia / nome da loja', valor: 'Pizzaria Demonstração' },
            { rotulo: 'Razão social', valor: '' },
            { rotulo: 'Responsável', valor: 'Johnatan Tanan' },
          ] },
          { titulo: 'Documentos e contato', colunas: 3, campos: [
            { rotulo: 'CNPJ', valor: '' },
            { rotulo: 'Inscrição estadual', valor: '' },
            { rotulo: 'Telefone / WhatsApp', valor: '(75) 3333-0000' },
            { rotulo: 'E-mail', valor: 'contato@pizzariademo.com.br' },
            { rotulo: 'Site', valor: '' },
            { rotulo: 'Descrição', valor: '' },
          ] },
          { titulo: 'Endereço', colunas: 3, campos: [
            { rotulo: 'Rua / avenida', valor: 'Avenida Beira Mar' },
            { rotulo: 'Número', valor: '1200' },
            { rotulo: 'CEP', valor: '45400-000' },
            { rotulo: 'Bairro', valor: 'Praia de Guaibim' },
            { rotulo: 'Cidade', valor: 'Valença' },
            { rotulo: 'UF', valor: 'BA' },
            { rotulo: 'Complemento', valor: '' },
            { rotulo: 'Link Google Maps', valor: '' },
          ] },
          { titulo: 'Como o cliente pode receber o pedido', colunas: 1, campos: [
            { rotulo: 'Modalidades', valor: 'Entrega · Retirada na loja · Consumir no local' },
          ] },
          { titulo: 'Pix e tempos de atendimento', colunas: 3, campos: [
            { rotulo: 'Chave Pix', valor: '' },
            { rotulo: 'Nome do titular Pix', valor: '' },
            { rotulo: 'Tempo retirada (min)', valor: '30' },
            { rotulo: 'Tempo delivery (min)', valor: '45' },
            { rotulo: 'Tempo consumo local (min)', valor: '20' },
          ] },
          { titulo: 'Numeração dos pedidos', colunas: 1, campos: [
            { rotulo: 'Regra', valor: 'Reinicia todo dia (#1, #2, #3…)' },
          ] },
        ],
        horarios: [
          { titulo: 'Funcionamento', colunas: 2, campos: [
            { rotulo: 'Segunda a sexta', valor: '10:00 às 23:30' },
            { rotulo: 'Sábado e domingo', valor: '10:00 às 00:30' },
            { rotulo: 'Fecha hoje às', valor: '23:00' },
            { rotulo: 'Pedido mínimo', valor: 'R$ 25,00' },
          ] },
        ],
        rotas: [
          { titulo: 'Entrega por bairro', colunas: 3, campos: [
            { rotulo: 'Praia de Guaibim', valor: 'R$ 5,00' },
            { rotulo: 'Centro', valor: 'R$ 7,00' },
            { rotulo: 'Bela Vista', valor: 'R$ 9,00' },
            { rotulo: 'Raio máximo', valor: '8 km' },
            { rotulo: 'Entrega grátis acima de', valor: 'R$ 120,00' },
          ] },
        ],
        usuario: [
          { titulo: 'Quem está usando o app', colunas: 2, campos: [
            { rotulo: 'Nome', valor: 'Admin' },
            { rotulo: 'E-mail', valor: 'johnatan.tanan@gmail.com' },
            { rotulo: 'Perfil', valor: 'Dono da loja' },
            { rotulo: 'Último acesso', valor: '07/09/2026 16:01' },
          ] },
        ],
        gestor: [
          { titulo: 'App Gestor', colunas: 2, campos: [
            { rotulo: 'Aparelhos pareados', valor: '2' },
            { rotulo: 'Notificações de pedido', valor: 'ligadas' },
          ] },
        ],
        plano: [
          { titulo: 'Plano da loja', colunas: 2, campos: [
            { rotulo: 'Plano', valor: 'Completo' },
            { rotulo: 'Renova em', valor: '30/09/2026' },
            { rotulo: 'Mensalidade', valor: 'R$ 199,00' },
            { rotulo: 'Situação', valor: 'em dia' },
          ] },
        ],
        cardapio: [
          { titulo: 'Vitrine', colunas: 2, campos: [
            { rotulo: 'Endereço do cardápio', valor: 'app-pediu.com.br/pizzariademo' },
            { rotulo: 'Layout', valor: 'Vitrine com fotos' },
            { rotulo: 'Cor principal', valor: '#14CE6B' },
            { rotulo: 'Mostrar produtos esgotados', valor: 'sim, marcados' },
          ] },
        ],
        mesas: [
          { titulo: 'Salão', colunas: 2, campos: [
            { rotulo: 'Mesas cadastradas', valor: '10' },
            { rotulo: 'Taxa de serviço', valor: '10% (opcional para o cliente)' },
            { rotulo: 'QR por mesa', valor: 'ativo' },
            { rotulo: 'Garçom pode fechar conta', valor: 'não' },
          ] },
        ],
        pagamento: [
          { titulo: 'Aceitas no cardápio', colunas: 3, campos: [
            { rotulo: 'Dinheiro', valor: 'aceito' },
            { rotulo: 'Pix', valor: 'aceito' },
            { rotulo: 'Cartão na entrega', valor: 'aceito' },
            { rotulo: 'Pix online (Mercado Pago)', valor: 'desligado' },
            { rotulo: 'Troco máximo', valor: 'R$ 100,00' },
          ] },
        ],
        fiscal: [
          { titulo: 'Emissão', colunas: 2, campos: [
            { rotulo: 'Ambiente', valor: 'Homologação' },
            { rotulo: 'Provedor fiscal', valor: '' },
            { rotulo: 'Regime tributário', valor: 'Simples Nacional' },
            { rotulo: 'Emissão automática na venda', valor: 'desligada' },
          ] },
        ],
        impressora: [
          { titulo: 'Impressão', colunas: 2, campos: [
            { rotulo: 'Impressão automática', valor: 'na cozinha e no bar' },
            { rotulo: 'Vias da comanda', valor: '1' },
            { rotulo: 'Largura do papel', valor: '80 mm' },
          ] },
        ],
        integracoes: [
          { titulo: 'Conectadas', colunas: 2, campos: [
            { rotulo: 'iFood', valor: 'não conectado' },
            { rotulo: 'Mercado Pago', valor: 'não conectado' },
            { rotulo: 'Google Meu Negócio', valor: 'não conectado' },
          ] },
        ],
        whatsapp: [
          { titulo: 'Conexão', colunas: 2, campos: [
            { rotulo: 'Número conectado', valor: '(75) 98811-9000' },
            { rotulo: 'Situação', valor: 'conectado' },
            { rotulo: 'Avisa o cliente em', valor: 'aceite, saiu para entrega e entregue' },
          ] },
        ],
        backup: [
          { titulo: 'Cópia dos dados', colunas: 2, campos: [
            { rotulo: 'Último backup', valor: '07/09/2026 03:00' },
            { rotulo: 'Frequência', valor: 'diária' },
            { rotulo: 'Guardado por', valor: '30 dias' },
          ] },
        ],
      },
    },
    push: {
      loja: 'Pizzaria Demonstração', dominio: 'app-pediu.com.br', inscritos: 248,
      enviados: 6, cliques: 214, vendas: 38, faturamento: 2140.60,
      itens: [
        { titulo: 'Volta pra gente 💚', enviada: '04/09', alcance: 610, cliques: 96, vendas: 31 },
        { titulo: 'Chegou pizza nova', enviada: '01/09', alcance: 588, cliques: 74, vendas: 22 },
        { titulo: 'Promoção de quinta 🔥', enviada: '28/08', alcance: 540, cliques: 44, vendas: 11 },
      ],
    },
  }
}

/** Dados das telas com abas: Financeiro (7), Atendimento (7) e Gestão (6). */
function telasComAbas() {
  const op = operacao()

  // ── Financeiro: os dados no formato do painel ──
  // O extrato é a lista CRONOLÓGICA de tudo que entrou e saiu, com saldo corrido e a
  // origem de cada linha. O Livro Caixa é um recorte dele: só o que passa pela gaveta.
  const HOJE = '2026-09-07'
  const movimentos = [
    { id: 'm1', data: '2026-09-07', hora: '20:14', descricao: 'Pedido #1043 — Marina Prado', categoria: 'venda', origem: 'Pedido #1043', origemTipo: 'pedido', forma: 'pix', usuario: 'Ana Paula', direcao: 'entrada', valor: 132.40 },
    { id: 'm2', data: '2026-09-07', hora: '19:58', descricao: 'Pedido #1042 — Rafael Souza', categoria: 'venda', origem: 'Pedido #1042', origemTipo: 'pedido', forma: 'dinheiro', usuario: 'Ana Paula', direcao: 'entrada', valor: 89.90 },
    { id: 'm3', data: '2026-09-07', hora: '19:31', descricao: 'Pedido #1041 — João Pereira', categoria: 'venda', origem: 'Pedido #1041', origemTipo: 'pedido', forma: 'credito', usuario: 'Ana Paula', direcao: 'entrada', valor: 54.00 },
    { id: 'm4', data: '2026-09-07', hora: '18:40', descricao: 'Taxa de serviço — mesas', categoria: 'taxa_servico', origem: 'Atendimento', origemTipo: 'pedido', forma: 'dinheiro', usuario: 'Ana Paula', direcao: 'entrada', valor: 54.20 },
    { id: 'm5', data: '2026-09-07', hora: '17:02', descricao: 'Sangria para depósito', categoria: 'sangria', origem: 'Caixa · turno da tarde', origemTipo: 'caixa', forma: 'dinheiro', usuario: 'Ana Paula', direcao: 'saida', valor: 300.00 },
    { id: 'm6', data: '2026-09-07', hora: '12:10', descricao: 'Suprimento — troco', categoria: 'suprimento', origem: 'Caixa · abertura', origemTipo: 'caixa', forma: 'dinheiro', usuario: 'Ana Paula', direcao: 'entrada', valor: 50.00 },
    { id: 'm7', data: '2026-09-06', hora: '21:44', descricao: 'Pedido #1036 — Pedro Henrique', categoria: 'venda', origem: 'Pedido #1036', origemTipo: 'pedido', forma: 'pix', usuario: 'Bruno Alves', direcao: 'entrada', valor: 98.70 },
    { id: 'm8', data: '2026-09-06', hora: '20:12', descricao: 'Pedido #1030 — Carla Nunes', categoria: 'venda', origem: 'Pedido #1030', origemTipo: 'pedido', forma: 'debito', usuario: 'Bruno Alves', direcao: 'entrada', valor: 76.50 },
    { id: 'm9', data: '2026-09-06', hora: '19:05', descricao: 'Pedido #1029 — cancelado', categoria: 'venda', origem: 'Pedido #1029', origemTipo: 'pedido', forma: 'dinheiro', usuario: 'Bruno Alves', direcao: 'entrada', valor: 62.00, estornado: true },
    { id: 'm10', data: '2026-09-06', hora: '15:30', descricao: 'Aluguel do ponto', categoria: 'pagamento', origem: 'Conta · Fixas', origemTipo: 'conta', forma: 'transferencia', usuario: 'Johnatan', direcao: 'saida', valor: 6800.00 },
    { id: 'm11', data: '2026-09-06', hora: '11:20', descricao: 'Repasse do cartão — semana 35', categoria: 'recebimento', origem: 'Repasse · Cartão', origemTipo: 'repasse', forma: 'transferencia', usuario: 'Sistema', direcao: 'entrada', valor: 4210.00 },
    { id: 'm12', data: '2026-09-05', hora: '22:01', descricao: 'Pedido #1018 — Sandra Reis', categoria: 'venda', origem: 'Pedido #1018', origemTipo: 'pedido', forma: 'cartao_entrega', usuario: 'Bruno Alves', direcao: 'entrada', valor: 88.00 },
    { id: 'm13', data: '2026-09-05', hora: '18:22', descricao: 'Gelo e descartáveis', categoria: 'pagamento', origem: 'Lançamento manual', origemTipo: 'manual', forma: 'dinheiro', usuario: 'Ana Paula', direcao: 'saida', valor: 180.40 },
    { id: 'm14', data: '2026-09-05', hora: '14:05', descricao: 'Taxa de entrega repassada', categoria: 'taxa_entrega', origem: 'Despacho', origemTipo: 'pedido', forma: 'dinheiro', usuario: 'Sistema', direcao: 'saida', valor: 96.00 },
    { id: 'm15', data: '2026-09-04', hora: '20:40', descricao: 'Pedido #0994 — Maria Silva', categoria: 'venda', origem: 'Pedido #0994', origemTipo: 'pedido', forma: 'pix', usuario: 'Carla Dias', direcao: 'entrada', valor: 112.40 },
    { id: 'm16', data: '2026-09-04', hora: '16:12', descricao: 'Energia elétrica', categoria: 'pagamento', origem: 'Conta · Fixas', origemTipo: 'conta', forma: 'boleto', usuario: 'Johnatan', direcao: 'saida', valor: 1920.50 },
  ]
  // Saldo corrido: do mais antigo para o mais novo, e a lista sai do mais novo primeiro.
  const cronologico = movimentos.slice().sort((a, b) =>
    (a.data + a.hora).localeCompare(b.data + b.hora))
  let saldoCorrido = 3200
  cronologico.forEach((m) => {
    if (!m.estornado) saldoCorrido += m.direcao === 'entrada' ? m.valor : -m.valor
    m.saldo = Math.round(saldoCorrido * 100) / 100
  })
  const extrato = cronologico.slice().reverse()
  // Livro Caixa = só a gaveta: dinheiro. Cartão e Pix não passam por ela.
  const livroCaixa = extrato.filter((m) => m.forma === 'dinheiro')

  const contas = [
    { id: 'c1', direcao: 'pagar', tipo: 'parcelada', vencimento: '2026-09-10', descricao: 'Laticínios Vale Verde — NF 8821 — parcela 1/3', contraparte: 'Laticínios Vale Verde', categoria: 'Insumos', valor: 1400.00, valorPago: 0, forma: 'boleto', temNota: true, parcela: { n: 1, de: 3 } },
    { id: 'c2', direcao: 'pagar', tipo: 'parcelada', vencimento: '2026-10-10', descricao: 'Laticínios Vale Verde — NF 8821 — parcela 2/3', contraparte: 'Laticínios Vale Verde', categoria: 'Insumos', valor: 1400.00, valorPago: 0, forma: 'boleto', temNota: true, parcela: { n: 2, de: 3 } },
    { id: 'c3', direcao: 'pagar', tipo: 'fixa', vencimento: '2026-09-05', descricao: 'Aluguel do ponto', contraparte: 'Imobiliária Costa', categoria: 'Fixas', valor: 6800.00, valorPago: 6800.00, situacao: 'paga', forma: 'transferencia', liquidadoEm: '2026-09-06', serie: true },
    { id: 'c4', direcao: 'pagar', tipo: 'fixa', vencimento: '2026-09-15', descricao: 'Energia elétrica', contraparte: 'Coelba', categoria: 'Fixas', valor: 1920.50, valorPago: 0, forma: 'boleto', serie: true },
    { id: 'c5', direcao: 'pagar', tipo: 'avulsa', vencimento: '2026-09-02', descricao: 'Manutenção do forno', contraparte: 'Tec Fornos', categoria: 'Manutenção', valor: 4400.00, valorPago: 1400.00, observacao: 'entrada paga, saldo em 30 dias' },
    { id: 'c6', direcao: 'pagar', tipo: 'imposto', vencimento: '2026-09-20', descricao: 'Simples Nacional — competência 08/2026', contraparte: 'Receita Federal', categoria: 'Impostos', valor: 2180.90, valorPago: 0 },
    { id: 'c7', direcao: 'pagar', tipo: 'fixa', vencimento: '2026-09-20', descricao: 'Folha — quinzena', contraparte: 'Equipe', categoria: 'Pessoal', valor: 8400.00, valorPago: 0, serie: true },
    { id: 'c13', direcao: 'pagar', tipo: 'parcelada', vencimento: '2026-08-28', descricao: 'Distribuidora Bebidas SA — NF 4410', contraparte: 'Distribuidora Bebidas SA', categoria: 'Insumos', valor: 3180.90, valorPago: 0, forma: 'boleto', temNota: true },
    { id: 'c8', direcao: 'receber', tipo: 'repasse', vencimento: '2026-09-12', descricao: 'Repasse iFood — semana 36', contraparte: 'iFood', categoria: 'Canais', valor: 8300.00, valorLiquido: 7470.00, valorPago: 0 },
    { id: 'c9', direcao: 'receber', tipo: 'repasse', vencimento: '2026-09-09', descricao: 'Cartão — vendas de 02/09', contraparte: 'Cielo', categoria: 'Cartões', valor: 16500.00, valorLiquido: 16005.00, valorPago: 0 },
    { id: 'c10', direcao: 'receber', tipo: 'parcelada', vencimento: '2026-09-18', descricao: 'Convênio Hotel Praia Bela — parcela 2/6', contraparte: 'Hotel Praia Bela', categoria: 'Parceiros', valor: 3200.00, valorLiquido: 3200.00, valorPago: 0, parcela: { n: 2, de: 6 } },
    { id: 'c11', direcao: 'receber', tipo: 'avulsa', vencimento: '2026-09-01', descricao: 'Fiado — Seu Antônio', contraparte: 'Antônio Ramos', categoria: 'Fiado', valor: 240.00, valorLiquido: 240.00, valorPago: 0 },
    { id: 'c12', direcao: 'receber', tipo: 'fixa', vencimento: '2026-09-05', descricao: 'Locação do quiosque da praia', contraparte: 'Quiosque da Praia', categoria: 'Locação', valor: 900.00, valorLiquido: 900.00, valorPago: 900.00, situacao: 'recebida', forma: 'pix', liquidadoEm: '2026-09-05', serie: true },
  ]
  const repasses = [
    { dataPrevista: '2026-09-09', origem: 'Cartão (Cielo)', vendas: 16995.00, valor: 16500.00 },
    { dataPrevista: '2026-09-12', origem: 'iFood', vendas: 9222.00, valor: 8300.00 },
  ]
  const vendas = [
    { numero: 1043, data: '2026-09-07', hora: '20:14', cliente: 'Marina Prado', canal: 'Delivery', produtos: 123.40, servico: 0, entrega: 9.00, desconto: 0, pagamento: 'pix', financeiro: 'Pago', pedido: 'entregue', total: 132.40 },
    { numero: 1042, data: '2026-09-07', hora: '19:58', cliente: 'Rafael Souza', canal: 'Delivery', produtos: 80.90, servico: 0, entrega: 9.00, desconto: 0, pagamento: 'dinheiro', financeiro: 'Pago', pedido: 'entregue', total: 89.90 },
    { numero: 1041, data: '2026-09-07', hora: '19:31', cliente: 'João Pereira', canal: 'Balcão', produtos: 54.00, servico: 0, entrega: 0, desconto: 0, pagamento: 'credito', financeiro: 'Pago', pedido: 'pronto', total: 54.00 },
    { numero: 1039, data: '2026-09-07', hora: '18:40', cliente: 'Mesa 7', canal: 'Mesa', produtos: 116.80, servico: 11.68, entrega: 0, desconto: 0, pagamento: 'a_receber', financeiro: 'Pendente', pedido: 'conta aberta', total: 128.48 },
    { numero: 1036, data: '2026-09-06', hora: '21:44', cliente: 'Pedro Henrique', canal: 'Delivery', produtos: 89.70, servico: 0, entrega: 9.00, desconto: 0, pagamento: 'pix', financeiro: 'Pago', pedido: 'entregue', total: 98.70 },
    { numero: 1030, data: '2026-09-06', hora: '20:12', cliente: 'Carla Nunes', canal: 'Retirada', produtos: 84.50, servico: 0, entrega: 0, desconto: 8.00, pagamento: 'debito', financeiro: 'Pago', pedido: 'entregue', total: 76.50 },
    { numero: 1018, data: '2026-09-05', hora: '22:01', cliente: 'Sandra Reis', canal: 'Delivery', produtos: 79.00, servico: 0, entrega: 9.00, desconto: 0, pagamento: 'cartao_entrega', financeiro: 'Pendente', pedido: 'em entrega', total: 88.00 },
    { numero: 994, data: '2026-09-04', hora: '20:40', cliente: 'Maria Silva', canal: 'Delivery', produtos: 103.40, servico: 0, entrega: 9.00, desconto: 0, pagamento: 'pix', financeiro: 'Pago', pedido: 'entregue', total: 112.40 },
  ]
  const dre = {
    receitaBruta: 20418.00, receitaLiquida: 18785.00, lucroBruto: 11843.00, margemBruta: 63,
    resultadoOperacional: 7147.00, resultadoPeriodo: 6902.00, margemLiquida: 37,
    linhas: [
      { chave: 'receita', label: 'Receita bruta', valor: 20418, pct: 100, nivel: 'total', filhas: [
        { label: 'Vendas de produtos', valor: 19193, pct: 94 },
        { label: 'Taxas de entrega', valor: 1225, pct: 6 },
      ] },
      { chave: 'deducoes', label: 'Deduções', valor: -1633, pct: -8, nivel: 'grupo', filhas: [
        { label: 'Taxas de cartão e Pix', valor: -1020, pct: -5 },
        { label: 'Cupons e descontos', valor: -613, pct: -3 },
      ] },
      { chave: 'liquida', label: 'Receita líquida', valor: 18785, pct: 92, nivel: 'total' },
      { chave: 'cmv', label: 'Custo dos produtos vendidos', valor: -6942, pct: -34, nivel: 'grupo', filhas: [
        { label: 'Insumos', valor: -5120, pct: -25 },
        { label: 'Embalagens', valor: -1822, pct: -9 },
      ] },
      { chave: 'bruto', label: 'Lucro bruto', valor: 11843, pct: 58, nivel: 'total' },
      { chave: 'despesas', label: 'Despesas operacionais', valor: -4696, pct: -23, nivel: 'grupo', filhas: [
        { label: 'Pessoal', valor: -2400, pct: -12 },
        { label: 'Aluguel e condomínio', valor: -1360, pct: -7 },
        { label: 'Energia, água e gás', valor: -936, pct: -4 },
      ] },
      { chave: 'operacional', label: 'Resultado operacional', valor: 7147, pct: 35, nivel: 'total' },
      { chave: 'financeiras', label: 'Despesas financeiras', valor: -245, pct: -1, nivel: 'grupo' },
      { chave: 'periodo', label: 'Resultado do período', valor: 6902, pct: 34, nivel: 'total' },
    ],
    porCentroCusto: [
      { centro: 'cozinha', label: 'Cozinha', categorias: ['Insumos', 'Gás', 'Manutenção'], participacao: 52, valor: 5100.00 },
      { centro: 'salao', label: 'Salão', categorias: ['Pessoal', 'Descartáveis'], participacao: 28, valor: 2740.00 },
      { centro: 'entrega', label: 'Entrega', categorias: ['Combustível', 'Embalagens'], participacao: 12, valor: 1180.00 },
      { centro: 'administrativo', label: 'Administrativo', categorias: ['Contador', 'Sistemas'], participacao: 8, valor: 790.00 },
    ],
  }
  const dias = ['01/09', '02/09', '03/09', '04/09', '05/09', '06/09', '07/09']
  const entradasDia = [2110, 2680, 3010, 2450, 3980, 4210, 1978]
  const saidasDia = [1800, 900, 2400, 1100, 3100, 1500, 820]

  return {
    financeiro: {
      // a visão geral do painel: separa o que o cliente pagou do que CAI NA CONTA
      visao: {
        periodo: 'hoje',
        faturamento: { valor: 883.61, variacao: -88.2, vendas: 7 },
        recebido: { valor: 883.61, pctDoFaturado: 100 },
        aReceberDaVenda: 0,
        contasAReceber: { valor: 8300.00, emAberto: 3 },
        contasAPagar: { valor: 4200.00, emAberto: 2 },
        vendaBruta: 883.61, taxasPixCartao: 17.15, pctTaxas: 1.9, vendaLiquida: 866.46,
        pixLiquido: { liquido: 320.05, bruto: 323.28, taxa: 3.23 },
        cartaoLiquido: { liquido: 426.93, bruto: 440.85, taxa: 13.92 },
        produtos: 829.41, taxaServico: 54.20, taxaEntrega: 0, descontos: 0,
        receitaLiquida: { valor: 812.26, variacao: -88.1 },
        ticketMedio: { valor: 126.23, variacao: 16.4 },
        cancelamentos: { qtd: 1, valor: 62.00 },
      },
      hoje: HOJE, rotuloPeriodo: '01/09/2026 a 07/09/2026',
      entradas: 20418, saidas: 11620, aReceber: 28000, aPagar: 25720.50,
      serie: { labels: dias, entradas: entradasDia, saidas: saidasDia },
      extrato, livroCaixa, contas, repasses, vendas, dre,
    },
    atendimento: {
      salao: op.salao,
      // o salão como o painel mostra: ocupação por LUGARES, não só por mesa
      salaoDetalhado: {
        kpis: { mesas: 6, mesasTotal: 40, ocupacaoPct: 15, lugaresOcupados: 24, lugaresTotal: 162,
          consumoAberto: 766.10, ticketAtual: 127.68, contasSolicitadas: 1, pedidosProntos: 2 },
        qrAbreMesa: false,
        mesas: op.salao.mesas.map((m) => ({ ...m, desdeMin: m.desdeMin })),
      },
      solicitacoes: [
        { mesa: '4', tipo: 'Chamou o garçom', hora: '20:14', situacao: 'Aberta' },
        { mesa: '9', tipo: 'Pediu a conta', hora: '20:09', situacao: 'Aberta' },
        { mesa: '2', tipo: 'Pediu mais uma bebida', hora: '19:58', situacao: 'Atendida' },
        { mesa: '7', tipo: 'Chamou o garçom', hora: '19:41', situacao: 'Atendida' },
      ],
      gorjetas: [
        { nome: 'Ana', mesas: 4, vendas: 892.40, valor: 89.24 },
        { nome: 'Bruno', mesas: 3, vendas: 641.70, valor: 64.17 },
        { nome: 'Carla', mesas: 2, vendas: 318.00, valor: 31.80 },
      ],
      relatorios: [
        { nome: 'Vendas por garçom', desc: 'faturamento e mesas atendidas' },
        { nome: 'Tempo de mesa', desc: 'quanto tempo cada mesa ficou ocupada' },
        { nome: 'Gorjetas do período', desc: 'total e divisão por garçom' },
        { nome: 'Consumo por mesa', desc: 'itens e valores de cada comanda' },
      ],
      controle: [
        { rotulo: 'Mesas cadastradas', valor: '10 mesas · 42 lugares' },
        { rotulo: 'Abertura automática', valor: 'ao primeiro pedido' },
        { rotulo: 'Fechamento exige conferência', valor: 'sim' },
        { rotulo: 'Transferir mesa', valor: 'permitido para gerente' },
        { rotulo: 'Dividir conta', valor: 'por pessoa e por item' },
      ],
      taxas: [
        { nome: 'Taxa de serviço', valor: '10%', aplicacao: 'sobre o consumo', situacao: 'Ativa' },
        { nome: 'Couvert artístico', valor: 'R$ 12,00', aplicacao: 'por pessoa, sexta e sábado', situacao: 'Ativa' },
        { nome: 'Taxa de reserva', valor: 'R$ 30,00', aplicacao: 'mesas de 8 lugares', situacao: 'Inativa' },
      ],
      app: [
        { rotulo: 'Garçons com acesso', valor: '3 (Ana, Bruno, Carla)' },
        { rotulo: 'Pedido pelo celular', valor: 'ativo' },
        { rotulo: 'Fechar conta pelo app', valor: 'só gerente' },
        { rotulo: 'Impressão automática', valor: 'na cozinha e no bar' },
      ],
    },
    estoque: {
      valorTotal: 18420.00,
      categorias: [
        { id: 'producao', nome: 'Produção Própria', mostraMassas: true, massas: [], subcategorias: [
          { nome: 'Produção Própria', itens: [
            { codigo: 'P0010', nome: 'Combo Família', cardapio: true, fiscalPendente: true, saldo: 0, unidade: 'un', minimo: 0, custo: 0, ativo: true },
            { codigo: 'P0003', nome: 'Pizza Calabresa G', cardapio: true, fiscalPendente: false, saldo: 12, unidade: 'un', minimo: 4, custo: 18.40, ativo: true },
            { codigo: 'P0004', nome: 'Pizza Portuguesa G', cardapio: true, fiscalPendente: true, saldo: 3, unidade: 'un', minimo: 4, custo: 21.10, ativo: true },
            { codigo: 'P0005', nome: 'Pizza Chocolate M', cardapio: true, fiscalPendente: false, saldo: 0, unidade: 'un', minimo: 2, custo: 14.20, ativo: true },
            { codigo: 'P0007', nome: 'Moqueca de Peixe', cardapio: true, fiscalPendente: false, saldo: 6, unidade: 'un', minimo: 2, custo: 32.00, ativo: true },
            { codigo: 'P0009', nome: 'Borda recheada', cardapio: false, fiscalPendente: false, saldo: 40, unidade: 'un', minimo: 10, custo: 2.10, ativo: true },
            { codigo: 'P0013', nome: 'Pizza Doce Antiga', cardapio: false, fiscalPendente: false, saldo: 0, unidade: 'un', minimo: 0, custo: 0, ativo: false },
          ] },
        ] },
        { id: 'revenda', nome: 'Revenda', subcategorias: [
          { nome: 'Revenda', itens: [
            { codigo: 'P0001', nome: 'Refrigerante 2L', cardapio: true, fiscalPendente: true, saldo: 8, unidade: 'un', minimo: 24, custo: 6.90, ativo: true },
            { codigo: 'P0002', nome: 'Cerveja long neck', cardapio: true, fiscalPendente: false, saldo: 96, unidade: 'un', minimo: 48, custo: 4.20, ativo: true },
            { codigo: 'P0014', nome: 'Água mineral 500ml', cardapio: true, fiscalPendente: false, saldo: 0, unidade: 'un', minimo: 24, custo: 1.60, ativo: true },
          ] },
        ] },
        { id: 'insumos', nome: 'Insumos', subcategorias: [
          { nome: 'Insumos', itens: [
            { codigo: 'I0001', nome: 'Muçarela', saldo: 42, unidade: 'kg', minimo: 30, custo: 38.90, ativo: true },
            { codigo: 'I0002', nome: 'Farinha de trigo', saldo: 18, unidade: 'kg', minimo: 40, custo: 4.20, ativo: true },
            { codigo: 'I0003', nome: 'Molho de tomate', saldo: 61, unidade: 'lata', minimo: 24, custo: 12.50, ativo: true },
            { codigo: 'I0004', nome: 'Calabresa', saldo: 9, unidade: 'kg', minimo: 15, custo: 29.80, ativo: true },
            { codigo: 'I0005', nome: 'Caixa de pizza G', saldo: 340, unidade: 'un', minimo: 200, custo: 1.80, ativo: true },
          ] },
        ] },
      ],
      nfEntrada: {
        notas: [
          { numero: '8821', fornecedor: 'Laticínios Vale Verde', cnpj: '12.345.678/0001-90', emissao: '05/09',
            tipoDocumento: 'nfe', situacao: 'processada', valor: 4200.00, fornecedorCadastrado: true, itens: [
              { nome: 'Muçarela peça 5kg', qtd: 12, unidade: 'cx', precoUnitario: 210.00, destino: 'Muçarela' },
              { nome: 'Requeijão balde 3kg', qtd: 8, unidade: 'un', precoUnitario: 84.00, destino: 'Requeijão' },
              { nome: 'Creme de leite 1L', qtd: 24, unidade: 'un', precoUnitario: 12.30, destino: 'Creme de leite' },
            ] },
          { numero: '4410', fornecedor: 'Distribuidora Bebidas SA', cnpj: '98.765.432/0001-10', emissao: '04/09',
            tipoDocumento: 'nfe', situacao: 'pendente', valor: 3180.90, fornecedorCadastrado: true, itens: [
              { nome: 'Refrigerante 2L — cx 6', qtd: 30, unidade: 'cx', precoUnitario: 41.40, destino: 'Refrigerante 2L' },
              { nome: 'Cerveja long neck — cx 24', qtd: 15, unidade: 'cx', precoUnitario: 100.80, destino: 'Cerveja long neck' },
              { nome: 'Energético 269ml', qtd: 48, unidade: 'un', precoUnitario: 6.90, destino: null },
              { nome: 'Água com gás 500ml', qtd: 60, unidade: 'un', precoUnitario: 1.60, destino: null },
            ] },
          { numero: '992', fornecedor: 'Hortifruti do Porto', cnpj: '45.111.222/0001-33', emissao: '03/09',
            tipoDocumento: 'nfe', situacao: 'processada', valor: 1290.40, fornecedorCadastrado: true, itens: [
              { nome: 'Tomate caixa 20kg', qtd: 6, unidade: 'cx', precoUnitario: 98.00, destino: 'Tomate' },
              { nome: 'Cebola saco 20kg', qtd: 4, unidade: 'sc', precoUnitario: 72.00, destino: 'Cebola' },
            ] },
          { numero: '1571', fornecedor: 'Embalagens Norte', cnpj: '77.888.999/0001-55', emissao: '02/09',
            tipoDocumento: 'manual', situacao: 'pendente', valor: 880.00, fornecedorCadastrado: false, itens: [
              { nome: 'Caixa de pizza G', qtd: 400, unidade: 'un', precoUnitario: 1.80, destino: 'Caixa de pizza G' },
              { nome: 'Sacola kraft', qtd: 500, unidade: 'un', precoUnitario: 0.32, destino: null },
            ] },
        ],
        pendencias: [
          { problema: 'Falta', produto: 'Energético 269ml', qtd: 6, valor: 41.40, nota: 'NF 4410',
            fornecedor: 'Distribuidora Bebidas SA', registrada: '04/09', resolvida: false },
          { problema: 'Avaria', produto: 'Tomate caixa 20kg', qtd: 1, valor: 98.00, nota: 'NF 992',
            fornecedor: 'Hortifruti do Porto', registrada: '03/09', resolvida: false },
          { problema: 'Vencimento', produto: 'Creme de leite 1L', qtd: 4, valor: 49.20, nota: 'NF 8821',
            fornecedor: 'Laticínios Vale Verde', registrada: '05/09', resolvida: true },
        ],
      },
      nfSaida: {
        emitidasHoje: 4, emitidasHojeValor: 612.40,
        pendentes: 12, pendentesValor: 1840.20,
        comFalha: 0,
        periodo: 16, periodoValor: 2452.60,
        fiscal: { ambiente: 'Homologação', provedor: 'Nenhum', situacao: 'Sem provedor', fila: 'Vazia', verificadoEm: '07/09/2026 16:01' },
        itens: [
          { data: '07/09/2026', pedido: '0037', cliente: 'Mesa 7', valor: 39.90, situacao: 'Sem nota', nota: null },
          { data: '07/09/2026', pedido: '0036', cliente: 'Marina Prado', valor: 89.80, situacao: 'Emitida', nota: '000.412' },
          { data: '07/09/2026', pedido: '0035', cliente: 'Mesa 34', valor: 7.99, situacao: 'Sem nota', nota: null },
          { data: '06/09/2026', pedido: '0034', cliente: 'Rafael Souza', valor: 114.90, situacao: 'Emitida', nota: '000.411' },
        ],
      },
      movimentacoes: {
        entradasValor: 8670.40, saidasValor: 3120.80, perdasValor: 148.00,
        lancamentos: 5, produtosMovimentados: 4, diasNoPeriodo: 30,
        itens: [
          { data: '07/09/2026', hora: '11:40', produto: 'Muçarela', movimento: 'Saída', qtd: '3,2 kg', conversao: '—', saldoApos: 42, custo: 124.48, operador: 'Sistema', observacao: 'Produção do turno' },
          { data: '07/09/2026', hora: '10:12', produto: 'Refrigerante 2L', movimento: 'Saída', qtd: '12 un', conversao: '—', saldoApos: 8, custo: 82.80, operador: 'Sistema', observacao: 'Venda' },
          { data: '06/09/2026', hora: '16:30', produto: 'Muçarela', movimento: 'Entrada', qtd: '20 kg', conversao: 'cx → kg', saldoApos: 45, custo: 778.00, operador: 'Ana', observacao: 'NF 8821' },
          { data: '06/09/2026', hora: '09:05', produto: 'Calabresa', movimento: 'Perda', qtd: '1,8 kg', conversao: '—', saldoApos: 9, custo: 53.64, operador: 'Bruno', observacao: 'Fora da validade' },
          { data: '05/09/2026', hora: '14:22', produto: 'Caixa de pizza G', movimento: 'Entrada', qtd: '200 un', conversao: '—', saldoApos: 340, custo: 360.00, operador: 'Ana', observacao: 'NF 1571' },
        ],
        giro: [
          { produto: 'Muçarela', saidas: 96, saldo: 42, giro: 2.3 },
          { produto: 'Refrigerante 2L', saidas: 240, saldo: 8, giro: 30 },
          { produto: 'Calabresa', saidas: 38, saldo: 9, giro: 4.2 },
        ],
      },
      fichas: {
        itens: [
          { produto: 'Pizza Calabresa G', categoria: 'Pizzas', preco: 59.90, custo: 18.40, insumos: [
            { nome: 'Muçarela', qtd: '250 g' }, { nome: 'Calabresa', qtd: '180 g' },
            { nome: 'Molho de tomate', qtd: '90 ml' }, { nome: 'Caixa de pizza G', qtd: '1 un' },
          ] },
          { produto: 'Pizza Portuguesa G', categoria: 'Pizzas', preco: 62.90, custo: 21.10, insumos: [
            { nome: 'Muçarela', qtd: '250 g' }, { nome: 'Molho de tomate', qtd: '90 ml' },
            { nome: 'Caixa de pizza G', qtd: '1 un' },
          ] },
          { produto: 'Moqueca de Peixe', categoria: 'Pratos', preco: 89.00, custo: 32.00, insumos: [] },
          { produto: 'Refrigerante 2L', categoria: 'Bebidas', preco: 14.90, custo: 6.90, insumos: [] },
          { produto: 'Água de Coco', categoria: 'Bebidas', preco: 7.99, custo: 3.20, insumos: [] },
        ],
      },
      fornecedores: [
        { nome: 'Laticínios Vale Verde', cnpj: '12.345.678/0001-90', telefone: '(75) 3222-1010', ultima: '05/09', mes: 8400.00 },
        { nome: 'Distribuidora Bebidas SA', cnpj: '98.765.432/0001-10', telefone: '(75) 3222-2020', ultima: '04/09', mes: 6320.90 },
        { nome: 'Hortifruti do Porto', cnpj: '45.111.222/0001-33', telefone: '(75) 3222-3030', ultima: '03/09', mes: 2580.80 },
        { nome: 'Embalagens Norte', cnpj: '77.888.999/0001-55', telefone: '(75) 3222-4040', ultima: '02/09', mes: 1760.00 },
      ],
    },
  }
}

module.exports = { menu, caixa, visaoGeral, listas, operacao, listasApoio, apoioFinal, telasComAbas }
