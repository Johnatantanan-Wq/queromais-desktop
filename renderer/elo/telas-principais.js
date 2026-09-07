// renderer/elo/telas-principais.js — Clientes, Carrinhos, Financeiro (visão geral) e
// Salão, refeitos conforme o painel ao vivo (Du Pellegrini, 07/09).
//
// O que cada tela ensinou:
//  - Clientes é análise RFM: segmento, frequência por mês, dia favorito, pontos.
//  - Carrinhos é recuperação de venda: o que importa é há quanto tempo parou e se dá
//    para falar com o cliente (por isso "identificados" é um filtro).
//  - Financeiro separa o que o cliente pagou do que CAI NA CONTA: taxas de pix e cartão
//    saem no meio do caminho, e a receita líquida é o que sobra para a loja.
//  - Salão mede ocupação por LUGARES, não só por mesas.

const L = require('./tela-lista')
const esc = L.esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function num(v, casas) {
  const n = Number(v)
  return isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }) : '—'
}
function tempo(min) {
  const m = Math.max(0, Math.round(Number(min) || 0))
  if (m < 60) return m + ' min'
  const h = Math.floor(m / 60)
  if (h < 24) return h + ' h ' + String(m % 60).padStart(2, '0')
  const d = Math.floor(h / 24)
  return d + (d === 1 ? ' dia' : ' dias')
}
const semDados = (o) => '<div class="ecard"><div class="evazio">Sem dados ' + o + ' ainda.<br>'
  + 'Quando o app falar com o painel, esta tela aparece aqui.</div></div>'

function kpi(rotulo, valor, sub, cor, variacao) {
  const v = variacao != null && isFinite(variacao) && variacao !== 0
    ? '<span style="font-size:11.5px;font-weight:800;color:' + (variacao > 0 ? '#0A7A3E' : '#b42318') + '">'
      + (variacao > 0 ? '▲ ' : '▼ ') + num(Math.abs(variacao), 1) + '%</span> ' : ''
  return '<div class="ecard" style="padding:13px 18px;min-width:0">'
    + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">' + esc(rotulo) + '</div>'
    + '<div style="font-size:21px;font-weight:800;color:' + (cor || '#111') + ';letter-spacing:-.02em;line-height:1.05">' + esc(valor) + '</div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:5px">' + v + esc(sub || '') + '</div></div>'
}
function faixa(cartoes, colunas) {
  return '<div style="display:grid;grid-template-columns:repeat(' + (colunas || cartoes.length) + ',minmax(0,1fr));gap:14px;margin-bottom:14px">'
    + cartoes.join('') + '</div>'
}
function abas(lista, atual, attr) {
  return '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:16px">'
    + lista.map((a) => '<button type="button" ' + attr + '="' + esc(a.chave) + '" class="echip'
      + (a.chave === atual ? ' is-on' : '') + '" style="cursor:pointer;height:34px;'
      + (a.chave === atual ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800' : 'background:#f0f0ee;color:#4b5563')
      + '">' + esc(a.rotulo) + (a.contador != null ? ' (' + esc(a.contador) + ')' : '') + '</button>').join('') + '</div>'
}
function cabecalho(titulo, sub, acoes) {
  return '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px;flex-wrap:wrap">'
    + '<div><div style="font-size:17px;font-weight:800;color:#111">' + esc(titulo) + '</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(sub) + '</div></div>'
    + (acoes || '') + '</div>'
}
function botao(acao, rotulo, primaria) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:34px;padding:0 14px;border-radius:10px;'
    + 'font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer;white-space:nowrap;'
    + (primaria ? 'border:none;background:var(--acento);color:#fff' : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">'
    + esc(rotulo) + '</button>'
}

/** Há quantos dias o cliente não compra — o painel manda o número; sem ele, lê o
 *  rótulo ("hoje", "ontem", "há 3 dias"). Quem nunca comprou vai para o fim. */
function diasSemComprar(c) {
  if (c.diasSemComprar != null) return Number(c.diasSemComprar)
  const t = ('' + (c.ultimo || '')).toLowerCase()
  if (t === 'hoje') return 0
  if (t === 'ontem') return 1
  const m = /há\s+(\d+)\s+dia/.exec(t)
  if (m) return Number(m[1])
  return 99999
}

// ── Clientes ────────────────────────────────────────────────────────────────
const COR_SEGMENTO = { 'Novo': 'verde', 'VIP': 'amarelo', 'Em risco': 'vermelho', 'Fiel': 'azul', 'Importado': 'cinza' }

function htmlClientes(dados, estado) {
  if (!dados) return semDados('de clientes')
  estado = estado || {}
  const k = dados.kpis || {}
  // "Maior gasto" × "Comprou recente": o botão do painel ordena de verdade — antes
  // ele só desenhava a seta e a lista não mudava.
  // A busca do painel filtra a lista enquanto se digita — o campo estava desenhado,
  // guardava o que era digitado, e não filtrava nada.
  const termo = (estado.termo || '').trim().toLowerCase()
  const filtrados = termo
    ? (dados.itens || []).filter((c) => (c.nome || '').toLowerCase().indexOf(termo) >= 0
      || (c.telefone || '').replace(/\D/g, '').indexOf(termo.replace(/\D/g, '')) >= 0 && /\d/.test(termo)
      || (c.bairro || '').toLowerCase().indexOf(termo) >= 0)
    : (dados.itens || [])
  const porRecencia = estado.ordem === 'recencia'
  const ordenados = filtrados.slice().sort((a2, b2) => porRecencia
    ? (diasSemComprar(a2) - diasSemComprar(b2))
    : (Number(b2.totalGasto || 0) - Number(a2.totalGasto || 0)))
  const linhas = ordenados.map((c) => ({
    chave: c.telefone || c.nome,
    celulas: [
      { texto: c.nome, sub: c.telefone || '', forte: true, cor: '#111' },
      c.bairro || '—',
      { texto: c.segmento || '—', etiqueta: COR_SEGMENTO[c.segmento] || 'cinza' },
      String(c.pedidos || 0),
      { texto: brl(c.totalGasto), forte: true, cor: '#0A7A3E' },
      brl(c.ticket),
      num(c.freqMes, 1),
      c.ultimo || '—',
      c.diaFavorito || '—',
      String(c.pontos || 0),
    ],
  }))
  return '<div>'
    + abas([{ chave: 'clientes', rotulo: 'Clientes' }, { chave: 'segmentacao', rotulo: 'Segmentação' }],
        estado.abaCliente || 'clientes', 'data-aba-cliente')
    + cabecalho('Clientes', (k.unicos || 0) + ' cadastrados · análise por segmento RFM', botao('novo-cliente', '+ Novo cliente', true))
    + faixa([
      kpi('Clientes únicos', String(k.unicos || 0), 'na base'),
      kpi('VIPs', String(k.vips || 0), 'compram sempre', '#8a6508'),
      kpi('Em risco', String(k.emRisco || 0), 'sumiram faz tempo', k.emRisco > 0 ? '#b42318' : '#111'),
      kpi('Ticket médio geral', brl(k.ticketGeral), 'por pedido'),
    ], 4)
    + '<div class="ecard" style="padding:24px">'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px">'
    + '<div style="display:flex;align-items:center;gap:8px;height:38px;padding:0 14px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;min-width:280px">'
    + '<span style="color:#9ca3af">🔎</span><input id="listaBusca" placeholder="Buscar por nome ou telefone…" value="' + esc(estado.termo || '') + '"'
    + ' style="border:none;outline:none;background:none;font-family:inherit;font-size:13px;color:#111;flex:1"></div>'
    + '<button type="button" data-acao="segmentos" class="echip" style="height:38px;background:#fff;border:1px solid #e5e7eb;color:#111;cursor:pointer">'
    + 'Todos os segmentos (' + (k.unicos || 0) + ') ▾</button>'
    + '<button type="button" data-acao="ordenar-clientes" class="echip" style="height:38px;background:#fff;border:1px solid #e5e7eb;color:#111;cursor:pointer">'
    + (porRecencia ? 'Comprou recente ▾' : 'Maior gasto ▾') + '</button></div>'
    + L.apenasGrade({
      colunas: ['Cliente', 'Bairro', 'Segmento', 'Pedidos', 'Total gasto', 'Ticket médio', 'Freq./mês', 'Último', 'Dia favorito', 'Pontos'],
      grade: '1.4fr 110px 120px 90px 130px 130px 100px 120px 120px 90px', direita: [3, 4, 5, 6, 9],
    }, linhas) + '</div></div>'
}

// ── Carrinhos ───────────────────────────────────────────────────────────────
function htmlCarrinhos(dados, estado) {
  if (!dados) return semDados('de carrinhos')
  const k = dados.kpis || {}
  const filtro = estado.filtroCarrinho || 'todos'
  let itens = dados.itens || []
  if (filtro === 'identificados') itens = itens.filter((c) => c.telefone)
  if (filtro === 'abandonados') itens = itens.filter((c) => c.paradoMin >= 5)

  const linhas = itens.map((c) => ({
    chave: c.telefone || c.cliente || String(c.paradoMin),
    celulas: [
      c.cliente ? { texto: c.cliente, forte: true, cor: '#111' } : { texto: 'Visitante anônimo', forte: true, cor: '#6b7280' },
      c.telefone ? c.telefone : { texto: 'Sem telefone', cor: '#9ca3af' },
      String(c.itens || 0),
      { texto: tempo(c.paradoMin), forte: true, cor: c.paradoMin >= 60 ? '#b42318' : '#8a6508' },
      { texto: brl(c.total), forte: true, cor: '#0A7A3E' },
      c.telefone ? { texto: '💬 lembrar', cor: 'var(--acento-texto)', forte: true } : { texto: '—', cor: '#9ca3af' },
    ],
  }))

  return '<div>'
    + abas([{ chave: 'carrinhos', rotulo: '🛒 Carrinhos' }, { chave: 'mensagens', rotulo: '✏️ Mensagens' }],
        estado.abaCarrinho || 'carrinhos', 'data-aba-carrinho')
    + cabecalho('Carrinhos abertos', 'Recuperação de vendas — clientes que adicionaram itens mas ainda não fecharam o pedido')
    + faixa([
      kpi('Carrinhos abertos', String(k.abertos || 0), 'agora'),
      kpi('Clientes identificados', String(k.identificados || 0), 'dá para chamar no WhatsApp', k.identificados > 0 ? '#0A7A3E' : '#111'),
      kpi('Abandonados (5+ min)', String(k.abandonados || 0), 'parados', k.abandonados > 0 ? '#8a6508' : '#111'),
      kpi('Total em aberto', brl(k.totalEmAberto), 'se todos fecharem', '#0A7A3E'),
    ], 4)
    + '<div class="ecard" style="padding:24px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap">'
    + '<div style="font-size:15px;font-weight:800;color:#111">Carrinhos (' + itens.length + ')</div>'
    + '<div style="display:flex;gap:6px;margin-left:auto">'
    + [['todos', 'Todos', (dados.itens || []).length], ['identificados', 'Identificados', k.identificados || 0],
       ['abandonados', '+5 min', k.abandonados || 0]].map((f) =>
      '<button type="button" data-filtro-carrinho="' + f[0] + '" class="echip' + (filtro === f[0] ? ' is-on' : '') + '"'
      + ' style="cursor:pointer;' + (filtro === f[0] ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800' : 'background:#f0f0ee;color:#4b5563')
      + '">' + f[1] + ' (' + f[2] + ')</button>').join('') + '</div></div>'
    + L.apenasGrade({ colunas: ['Cliente', 'Telefone', 'Itens', 'Parado', 'Total', 'Ações'],
        grade: '1fr 170px 90px 130px 140px 130px', direita: [2, 3, 4] }, linhas)
    + '</div>'
    + '<div class="ecard" style="padding:18px 20px;margin-top:14px;background:#eef4ff;border-color:#bfdbfe">'
    + '<div style="font-size:13.5px;font-weight:800;color:#1d4ed8;margin-bottom:4px">💡 Auto-envio</div>'
    + '<div style="font-size:12.5px;color:#1e40af;font-weight:500;line-height:1.55">'
    + 'Configure e ligue o auto-envio na aba <b>Mensagens</b>. O sistema dispara a mensagem padrão automaticamente '
    + 'após o tempo definido, só para clientes identificados, uma vez por carrinho. Aqui também dá para enviar manualmente.'
    + '</div></div></div>'
}

// ── Financeiro (visão geral) ────────────────────────────────────────────────
const PERIODOS_FIN = [
  { chave: 'hoje', rotulo: 'Hoje' }, { chave: 'ontem', rotulo: 'Ontem' }, { chave: '7dias', rotulo: '7 dias' },
  { chave: 'mes', rotulo: 'Este mês' }, { chave: 'mes-anterior', rotulo: 'Mês anterior' },
  { chave: 'ano', rotulo: 'Este ano' }, { chave: 'personalizado', rotulo: 'Personalizado' },
]

function htmlFinanceiroVisao(d, estado) {
  if (!d) return semDados('do financeiro')
  estado = estado || {}
  const periodo = estado.periodoFin || d.periodo || 'hoje'
  const fat = d.faturamento || {}
  const rec = d.recebido || {}
  const cr = d.contasAReceber || {}
  const cp = d.contasAPagar || {}
  const pix = d.pixLiquido || {}
  const cartao = d.cartaoLiquido || {}
  const rl = d.receitaLiquida || {}
  const tm = d.ticketMedio || {}

  const filtros = '<div class="ecard" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:12px 14px;margin-bottom:14px">'
    + PERIODOS_FIN.map((p) => '<button type="button" data-periodo-fin="' + p.chave + '" class="echip'
      + (p.chave === periodo ? ' is-on' : '') + '" style="cursor:pointer;'
      + (p.chave === periodo ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800' : 'background:#f0f0ee;color:#4b5563')
      + '">' + esc(p.rotulo) + '</button>').join('')
    + '<span style="display:flex;gap:6px;margin-left:auto">'
    + ['Todos os canais', 'Todas as formas', 'Todos os funcionários'].map((s) =>
      '<button type="button" class="echip" style="background:#fff;border:1px solid #e5e7eb;color:#111;cursor:pointer">' + s + ' ▾</button>').join('')
    + '</span></div>'

  const linha1 = faixa([
    kpi('Faturamento', brl(fat.valor), (fat.vendas || 0) + ' vendas', '#0A7A3E', fat.variacao),
    kpi('Recebido', brl(rec.valor), num(rec.pctDoFaturado, 1) + '% do faturado', '#0A7A3E'),
    kpi('A receber da venda', brl(d.aReceberDaVenda), 'ainda não entrou'),
    kpi('Contas a receber', brl(cr.valor), (cr.emAberto || 0) + ' em aberto'),
    kpi('Contas a pagar', brl(cp.valor), (cp.emAberto || 0) + ' em aberto'),
  ], 5)

  const linha2 = faixa([
    kpi('Venda bruta', brl(d.vendaBruta), 'o que o cliente pagou'),
    kpi('Taxas PIX e cartão', '− ' + brl(d.taxasPixCartao), num(d.pctTaxas, 1) + '% efetivo sobre o bruto', '#b42318'),
    kpi('Venda líquida', brl(d.vendaLiquida), 'o que cai na conta', '#0A7A3E'),
    kpi('Pix líquido', brl(pix.liquido), 'bruto ' + brl(pix.bruto) + ' · taxa ' + brl(pix.taxa)),
    kpi('Cartão líquido', brl(cartao.liquido), 'bruto ' + brl(cartao.bruto) + ' · taxa ' + brl(cartao.taxa)),
  ], 5)

  const linha3 = faixa([
    kpi('Produtos', brl(d.produtos), 'itens, já com desconto'),
    kpi('Taxa de serviço', brl(d.taxaServico), 'atendimento (garçom)'),
    kpi('Taxa de entrega', brl(d.taxaEntrega), 'repasse ao entregador'),
    kpi('Descontos', brl(d.descontos), 'concedidos'),
    kpi('Receita líquida', brl(rl.valor), 'o que fica com a loja · já sem ' + brl(d.taxasPixCartao) + ' de taxas', '#0A7A3E', rl.variacao),
    kpi('Ticket médio', brl(tm.valor), 'por venda', '#111', tm.variacao),
  ], 6)

  const canc = d.cancelamentos || {}
  const faixaCanc = canc.qtd
    ? '<div class="ecard" style="display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:14px">'
      + '<span style="font-size:11px;font-weight:800;color:#b42318;background:#fdeaea;padding:4px 10px;border-radius:6px">Cancelamentos</span>'
      + '<span style="font-size:12.5px;color:#4b5563;font-weight:600">' + canc.qtd
      + (canc.qtd === 1 ? ' venda cancelada' : ' vendas canceladas') + ' no valor de <b style="color:#111">' + brl(canc.valor)
      + '</b> — fora do faturamento acima.</span></div>'
    : ''

  return '<div>'
    + cabecalho('Financeiro', 'Vendas, recebimentos, contas e resultado da loja',
        '<div style="display:flex;gap:8px">' + botao('novo-lancamento', '+ Novo lançamento', true)
        + botao('exportar', 'Exportar ▾') + botao('portal-contabil', '📄 Portal Contábil') + '</div>')
    + filtros + linha1 + linha2 + linha3 + faixaCanc + '</div>'
}

// ── Salão ───────────────────────────────────────────────────────────────────
const COR_MESA = {
  'Livre': { c: '#0A7A3E', bg: '#E7FAF0', borda: '#A8E9C6' },
  'Ocupada': { c: '#8a6508', bg: '#fff9e8', borda: '#eed571' },
  'Conta pedida': { c: '#b42318', bg: '#fdeaea', borda: '#f3c0bb' },
  'Reservada': { c: '#1d4ed8', bg: '#eff6ff', borda: '#bfdbfe' },
}

function htmlSalao(dados, estado) {
  if (!dados) return semDados('do salão')
  estado = estado || {}
  const k = dados.kpis || {}
  const mesas = dados.mesas || []

  const aviso = '<div class="ecard" style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;margin-bottom:14px">'
    + '<input type="checkbox" data-acao="qr-abre-mesa"' + (dados.qrAbreMesa ? ' checked' : '')
    + ' style="width:16px;height:16px;accent-color:var(--acento);margin-top:1px">'
    + '<div style="font-size:12.5px;color:#111;font-weight:700">Ao ler o QR sem mesa aberta, o cliente vai direto pro cardápio '
    + '<span style="font-weight:500;color:#6b7280">(o 1º pedido abre a mesa sozinho)</span>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:500;margin-top:2px">'
    + (dados.qrAbreMesa ? 'ligado: o cliente começa sozinho, sem esperar o garçom' : 'desligado: precisa chamar o garçom pra abrir')
    + '</div></div></div>'

  const kpis = faixa([
    kpi('Mesas', (k.mesas || 0) + ' / ' + (k.mesasTotal || 0), 'ocupadas agora'),
    kpi('Ocupação (lugares)', num(k.ocupacaoPct, 0) + '%', (k.lugaresOcupados || 0) + '/' + (k.lugaresTotal || 0) + ' lugares'),
    kpi('Consumo aberto', brl(k.consumoAberto), 'nas mesas', '#0A7A3E'),
    kpi('Ticket atual', brl(k.ticketAtual), 'por mesa ocupada'),
    kpi('Contas solicitadas', String(k.contasSolicitadas || 0), 'esperando fechamento', k.contasSolicitadas > 0 ? '#b42318' : '#111'),
    kpi('Pedidos prontos', String(k.pedidosProntos || 0), 'para servir', k.pedidosProntos > 0 ? '#8a6508' : '#111'),
  ], 6)

  const grade = mesas.map((m) => {
    const cor = COR_MESA[m.situacao] || COR_MESA['Livre']
    const semConta = m.situacao === 'Livre' || (!Number(m.consumo) && !Number(m.desdeMin))
    return '<div data-mesa="' + esc(m.numero) + '" style="border:1.5px solid ' + cor.borda + ';background:' + cor.bg
      + ';border-radius:14px;padding:14px;cursor:pointer;min-width:0">'
      + '<div style="font-size:16px;font-weight:800;color:#111;margin-bottom:6px">Mesa ' + esc(m.numero) + '</div>'
      + '<span style="font-size:11px;font-weight:800;color:' + cor.c + ';background:#fff;padding:3px 9px;border-radius:999px">' + esc(m.situacao) + '</span>'
      + '<div style="font-size:11.5px;color:#6b7280;font-weight:600;margin-top:8px">' + esc(m.lugares) + ' lugares'
      + (m.garcom ? ' · ' + esc(m.garcom) : '') + '</div>'
      + (semConta ? '' : '<div style="margin-top:8px;display:flex;align-items:baseline;justify-content:space-between;gap:8px">'
        + '<span style="font-size:15px;font-weight:800;color:#111">' + brl(m.consumo) + '</span>'
        + '<span style="font-size:11.5px;font-weight:700;color:' + cor.c + '">' + esc(tempo(m.desdeMin)) + '</span></div>')
      + '</div>'
  }).join('')

  return '<div>' + aviso + kpis
    + '<div class="ecard" style="padding:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">'
    + '<button type="button" class="echip is-on" style="background:var(--acento-suave);color:var(--acento-texto);font-weight:800;cursor:pointer">Todos os setores</button>'
    + '<span style="display:flex;gap:8px;margin-left:auto;align-items:center">'
    + '<div style="display:flex;align-items:center;gap:8px;height:36px;padding:0 14px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;min-width:240px">'
    + '<span style="color:#9ca3af">🔎</span><input placeholder="Buscar mesa, cliente, garçom…"'
    + ' style="border:none;outline:none;background:none;font-family:inherit;font-size:13px;color:#111;flex:1"></div>'
    + botao('expandir-salao', '⤢ Expandir') + '</span></div>'
    + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Mesas</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">' + grade + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">'
    + 'abrir, transferir e fechar conta ainda são pelo painel</div></div></div>'
}

module.exports = { htmlClientes, htmlCarrinhos, htmlFinanceiroVisao, htmlSalao, brl, tempo, PERIODOS_FIN }
