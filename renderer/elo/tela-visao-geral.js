// renderer/elo/tela-visao-geral.js — "Visão geral" nativa.
//
// Espelha as demandas do painel do Pediu (app/admin/analise-vendas/PainelAnalise.tsx):
// Faturamento, Pedidos e Ticket médio com métrica selecionável, comparação com o
// período anterior e quebra por canal, forma de pagamento e bairro.
//
// Como no Caixa, a tela NÃO calcula: recebe os números prontos e desenha. Os gráficos
// são SVG local (renderer/elo/graficos.js) — nada de biblioteca externa, para a tela
// continuar desenhando com dado de cache, sem internet.

const G = require('./graficos')
const L = require('./tela-lista')

const esc = G.esc

function fmtBRL(v) {
  const x = Number(v)
  return (isFinite(x) ? x : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtInt(v) {
  const x = Number(v)
  return isFinite(x) ? Math.round(x).toLocaleString('pt-BR') : '—'
}
function fmtCompacto(v) {
  const x = Number(v) || 0
  if (Math.abs(x) >= 1000) return (x / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  return fmtInt(x)
}

const METRICAS = {
  faturamento: { titulo: 'Faturamento', fmt: (v) => 'R$ ' + fmtBRL(v), eixo: fmtCompacto },
  pedidos:     { titulo: 'Pedidos',     fmt: fmtInt,                   eixo: fmtInt },
  ticket:      { titulo: 'Ticket médio', fmt: (v) => 'R$ ' + fmtBRL(v), eixo: fmtCompacto },
}

/** Variação contra o período anterior. Sem base anterior, não há variação — e não se inventa. */
function variacao(atual, anterior) {
  const a = Number(atual) || 0, b = Number(anterior) || 0
  if (!b) return { texto: '', subiu: null }
  const pct = ((a - b) / Math.abs(b)) * 100
  const sinal = pct > 0 ? '+' : ''
  return { texto: sinal + pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%', subiu: pct >= 0 }
}

// Cancelamento não é detalhe: nas lojas abertas em 07/09 era 7,7% numa e 21% na outra,
// e não aparecia em lugar nenhum do app. Fica ao lado dos outros números, e a cor sobe
// para vermelho quando passa de 10% dos pedidos.
function cartaoCancelados(dados) {
  const c = dados.cancelados
  if (!c) return ''
  const pct = c.pedidos && dados.kpis && dados.kpis.pedidos
    ? (c.pedidos / (Number(dados.kpis.pedidos.atual) + c.pedidos)) * 100 : 0
  const alto = pct >= 10
  return '<div class="ecard" style="padding:13px 20px;min-width:0;border-color:' + (alto ? '#f3c0bb' : 'var(--linha)') + '">'
    + '<div style="font-size:11.5px;font-weight:700;color:#6b7280;margin-bottom:6px">Cancelados</div>'
    + '<div style="font-size:22px;font-weight:800;color:' + (alto ? '#b42318' : '#111') + ';letter-spacing:-.02em;line-height:1">'
    + fmtInt(c.pedidos) + ' <span style="font-size:14px;font-weight:700">(' + pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%)</span></div>'
    + '<div style="font-size:11.5px;font-weight:600;color:#9ca3af;margin-top:5px">R$ ' + fmtBRL(c.valor) + ' que deixaram de entrar</div></div>'
}

function cartaoKpi(chave, dados, metricaAtiva) {
  const m = METRICAS[chave]
  const k = (dados.kpis || {})[chave] || {}
  const v = variacao(k.atual, k.anterior)
  const ativo = chave === metricaAtiva
  const corVar = v.subiu === null ? '#9ca3af' : (v.subiu ? '#0A7A3E' : '#b42318')
  const seta = v.subiu === null ? '' : (v.subiu ? '↑ ' : '↓ ')
  return '<button type="button" data-metrica="' + chave + '" class="ecard kpi-sel' + (ativo ? ' is-on' : '') + '"'
    + ' style="padding:13px 20px;min-width:0;text-align:left;cursor:pointer;font-family:inherit;border:1px solid '
    + (ativo ? 'var(--acento)' : 'var(--linha)') + ';background:' + (ativo ? 'var(--acento-suave)' : '#fff') + '">'
    + '<div style="font-size:11.5px;font-weight:700;color:#6b7280;margin-bottom:6px">' + esc(m.titulo) + '</div>'
    + '<div style="font-size:22px;font-weight:800;color:#111111;letter-spacing:-.02em;line-height:1">' + esc(m.fmt(k.atual)) + '</div>'
    + '<div style="font-size:11.5px;font-weight:700;color:' + corVar + ';margin-top:5px">'
    + (v.texto ? seta + esc(v.texto) + ' <span style="color:#9ca3af;font-weight:600">vs. anterior</span>' : '<span style="color:#9ca3af;font-weight:600">sem período anterior</span>')
    + '</div></button>'
}

const PERIODOS = [
  { chave: 'hoje', rotulo: 'Hoje' },
  { chave: 'semana', rotulo: 'Esta semana' },
  { chave: 'mes', rotulo: 'Este mês' },
  { chave: 'mes_anterior', rotulo: 'Mês anterior' },
]

function botoesPeriodo(atual) {
  return '<div style="display:flex;gap:6px;flex-wrap:wrap">' + PERIODOS.map((p) =>
    '<button type="button" data-periodo="' + p.chave + '" class="eaba' + (p.chave === atual ? ' is-on' : '') + '">' + esc(p.rotulo) + '</button>').join('') + '</div>'
}

function bloco(titulo, subtitulo, conteudo, atraso, acao) {
  return '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease ' + (atraso || 0) + 's both">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111111;margin-bottom:4px">' + esc(titulo) + '</div>'
    + (subtitulo ? '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(subtitulo) + '</div>' : '')
    + '</div>' + (acao || '') + '</div>' + conteudo + '</div>'
}

/**
 * Faixa "HOJE" — os dois números do dia, sempre, independentes do período escolhido.
 * É a primeira coisa que o dono olha ao abrir o sistema: como está HOJE, agora.
 */
function faixaHoje(dados) {
  const h = dados.hoje || {}
  const item = (rotulo, valor) => '<div class="ecard" style="padding:14px 20px;min-width:0">'
    + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em">'
    + esc(rotulo) + '</div>'
    + '<div style="font-size:24px;font-weight:800;color:#111;letter-spacing:-.03em;margin-top:6px">'
    + esc(valor) + '</div></div>'
  return '<div><div style="font-size:10.5px;font-weight:800;color:#a9aeb8;text-transform:uppercase;'
    + 'letter-spacing:.12em;margin-bottom:8px">Hoje</div>'
    + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px">'
    + item('Faturamento bruto', 'R$ ' + fmtBRL(h.faturamento))
    + item('Pedidos', fmtInt(h.pedidos)) + '</div></div>'
}

/**
 * Detalhes do faturamento — a tela mostra DE ONDE vem o número, linha a linha, e deixa
 * tirar cada parte da conta. É a resposta para "por que o faturamento não bate com o
 * que eu esperava": entrega e gorjeta entram ou não, conforme quem pergunta.
 */
function detalhesDoFaturamento(dados, fora) {
  const c = dados.composicao || {}
  const PARTES = [
    { chave: 'produtos', rotulo: 'Total dos produtos', valor: Number(c.produtos) || 0 },
    { chave: 'taxaEntrega', rotulo: 'Taxas de entrega', valor: Number(c.taxaEntrega) || 0 },
    { chave: 'taxaServico', rotulo: 'Taxas de serviço (gorjeta)', valor: Number(c.taxaServico) || 0 },
    { chave: 'descontos', rotulo: 'Total de descontos', valor: -(Number(c.descontos) || 0), negativa: true },
  ]
  const desligadas = fora || []
  const total = PARTES.filter((p) => desligadas.indexOf(p.chave) < 0).reduce((s2, p) => s2 + p.valor, 0)

  const linhas = PARTES.map((p) => {
    const ligada = desligadas.indexOf(p.chave) < 0
    return '<div data-comp-fat="' + esc(p.chave) + '" style="display:flex;align-items:center;gap:10px;'
      + 'padding:9px 0;border-bottom:1px solid #eef0f3;cursor:pointer' + (ligada ? '' : ';opacity:.45') + '">'
      + '<span style="width:16px;height:16px;border-radius:4px;flex-shrink:0;border:1.5px solid '
      + (ligada ? 'var(--acento);background:var(--acento)' : '#d0d4db;background:#fff')
      + ';color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">'
      + (ligada ? '✓' : '') + '</span>'
      + '<span style="flex:1;min-width:0;font-size:13px;font-weight:600;color:#111">' + esc(p.rotulo) + '</span>'
      + '<span style="font-size:13.5px;font-weight:700;color:' + (p.negativa ? '#b42318' : '#111') + '">'
      + (p.negativa ? '− ' : '') + 'R$ ' + esc(fmtBRL(Math.abs(p.valor))) + '</span></div>'
  }).join('')

  return '<div>' + linhas
    + '<div style="display:flex;justify-content:space-between;gap:12px;border-top:2px solid #111;'
    + 'margin-top:8px;padding-top:11px;font-size:16px;font-weight:800;color:#111">'
    + '<span>Faturamento</span><span style="color:var(--acento-texto)">R$ ' + esc(fmtBRL(total)) + '</span></div></div>'
}

const SEGMENTOS = [
  { chave: 'forma', rotulo: 'Forma de pagamento' },
  { chave: 'canal', rotulo: 'Canal de venda' },
  { chave: 'tipo', rotulo: 'Tipo de pedido' },
]

/** Análise dos pedidos por forma, canal ou tipo — rosca + tabela com ticket médio. */
function analisePor(dados, escolhido) {
  const chave = SEGMENTOS.some((x) => x.chave === escolhido) ? escolhido : 'forma'
  const linhas = ((dados.segmentos || {})[chave]) || []
  const seletor = '<select data-seg-visao style="height:32px;max-width:220px;border:1px solid #e5e7eb;'
    + 'border-radius:9px;background:#fff;font-family:inherit;font-size:12.5px;color:#111;padding:0 9px;cursor:pointer">'
    + SEGMENTOS.map((x) => '<option value="' + x.chave + '"' + (x.chave === chave ? ' selected' : '') + '>'
      + esc(x.rotulo) + '</option>').join('') + '</select>'

  if (!linhas.length) {
    return { seletor, corpo: '<div class="evazio">Nada encontrado para o período.</div>' }
  }
  const cores = G.PALETA
  const corpo = '<div style="display:grid;grid-template-columns:220px 1fr;gap:18px;align-items:center">'
    + '<div style="justify-self:center">'
    + G.donut(linhas.map((l, i) => ({ value: Number(l.faturamento) || 0, color: cores[i % cores.length] }))) + '</div>'
    + L.apenasGrade({
      colunas: ['Item', 'Faturamento', 'Pedidos', 'Ticket médio'],
      grade: '1fr 160px 110px 140px', direita: [1, 2, 3],
    }, linhas.map((l) => ({
      chave: l.rotulo,
      celulas: [
        { texto: l.rotulo, forte: true, cor: '#111' },
        { texto: 'R$ ' + fmtBRL(l.faturamento), forte: true, cor: '#111' },
        fmtInt(l.pedidos),
        'R$ ' + fmtBRL(l.pedidos ? (Number(l.faturamento) || 0) / l.pedidos : 0),
      ],
    }))) + '</div>'
  return { seletor, corpo }
}

function htmlVisaoGeral(dados, estado) {
  estado = estado || {}
  if (!dados) {
    return '<div class="ecard"><div class="evazio">Sem dados do período ainda.<br>'
      + 'Quando o app falar com o painel, os números aparecem aqui — e ficam guardados para as próximas aberturas.</div></div>'
  }

  const metrica = METRICAS[estado.metrica] ? estado.metrica : 'faturamento'
  const m = METRICAS[metrica]
  // As séries vêm por métrica (o painel troca o gráfico sem nova consulta); aceita
  // também o formato simples {serie:{labels,atual,anterior}} de quem só tem uma.
  const porMetrica = dados.series && dados.series[metrica]
  const s = porMetrica
    ? { labels: dados.series.labels || [], atual: porMetrica.atual || [], anterior: porMetrica.anterior || [] }
    : (dados.serie || { labels: [], atual: [], anterior: [] })

  const kpis = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;animation:eloFadeUp .5s ease both">'
    + ['faturamento', 'pedidos', 'ticket'].map((c) => cartaoKpi(c, dados, metrica)).join('')
    + cartaoCancelados(dados) + '</div>'

  const qtdPontos = (s.labels || []).length
  const grafico = G.linha(
    [
      { values: s.atual || [], color: 'var(--acento, #14CE6B)', labelColor: '#0A7A3E' },
      { values: s.anterior || [], color: '#c4c8cf', labelColor: '#9ca3af', tracejada: true },
    ],
    s.labels || [],
    {
      area: 'gradVisaoGeral', areaColor: '#14CE6B', fmt: m.eixo, w: 900, h: 210, yBottom: 150,
      // um mês (30 dias) ou um dia hora a hora não cabem com rótulo em cada ponto
      rotulosACada: qtdPontos > 16 ? Math.ceil(qtdPontos / 8) : 1,
    },
  )

  const legenda = '<div style="display:flex;gap:16px;align-items:center;font-size:12px;font-weight:600;color:#6b7280;margin-top:6px">'
    + '<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:14px;height:3px;background:var(--acento);border-radius:2px;display:inline-block"></i>período atual</span>'
    + '<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:14px;height:3px;background:#c4c8cf;border-radius:2px;display:inline-block"></i>período anterior</span></div>'

  const paleta = G.PALETA
  const comCor = (lista) => (lista || []).map((r, i) => ({ ...r, color: paleta[i % paleta.length] }))

  const canais = bloco('Pedidos por canal', 'de onde vem a venda', G.barras(comCor(dados.canais), { fmt: fmtInt }), 0.07)

  // Por que cancelou: nas lojas abertas, 3 de cada 4 cancelamentos não têm motivo
  // registrado — e é isso que a tela precisa dizer, para o dono cobrar o registro.
  const mot = (dados.cancelados && dados.cancelados.motivos) || []
  const semMotivo = mot.find((m) => /sem motivo/i.test(m.label))
  const totalMot = mot.reduce((s2, m) => s2 + (Number(m.value) || 0), 0) || 1
  const motivos = mot.length ? bloco('Por que cancelou', 'motivos registrados no período',
    G.barras(mot.map((m, i) => ({ ...m, color: /sem motivo/i.test(m.label) ? '#b42318' : G.PALETA[i % G.PALETA.length] })), { fmt: fmtInt })
    + (semMotivo
      ? '<div style="margin-top:14px;background:#fdeaea;border:1px solid #f3c0bb;border-radius:10px;padding:12px 14px">'
        + '<div style="font-size:12.5px;font-weight:800;color:#b42318">'
        + Math.round((semMotivo.value / totalMot) * 100) + '% dos cancelamentos não têm motivo registrado</div>'
        + '<div style="font-size:12px;color:#b42318;font-weight:600;margin-top:2px">'
        + 'sem o motivo não dá para saber se é falta de produto, desistência ou erro de pedido</div></div>'
      : ''), 0.1) : ''
  const formas = bloco('Formas de pagamento', 'faturamento por forma',
    '<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">'
    + '<div style="flex:none">' + G.donut(comCor(dados.formas)) + '</div>'
    + '<div style="flex:1;min-width:260px">' + G.barras(comCor(dados.formas), { fmt: (v) => 'R$ ' + fmtBRL(v), colRotulo: '110px' }) + '</div></div>', 0.1)
  const bairros = (dados.bairros && dados.bairros.length)
    ? bloco('Pedidos por bairro', 'entregas no período', G.barras(comCor(dados.bairros), { fmt: fmtInt }), 0.13)
    : ''

  const analise = analisePor(dados, estado.segmento)

  return '<div style="display:flex;flex-direction:column;gap:18px">'
    + faixaHoje(dados)
    + kpis
    + bloco(m.titulo, (dados.periodo && dados.periodo.rotulo) || '', grafico + legenda, 0.04, botoesPeriodo(estado.periodo || (dados.periodo && dados.periodo.chave) || 'semana'))
    + bloco('Detalhes do faturamento', 'Clique no valor para adicioná-lo ou removê-lo do cálculo do faturamento.',
      detalhesDoFaturamento(dados, estado.foraDoFaturamento), 0.06)
    + bloco('Análise dos pedidos por', '', analise.corpo, 0.08, analise.seletor)
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:18px">' + canais + formas + '</div>'
    + (motivos ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:18px">' + motivos + bairros + '</div>' : bairros)
    + '</div>'
}

module.exports = { htmlVisaoGeral, variacao, fmtBRL, fmtInt, METRICAS, PERIODOS, SEGMENTOS, detalhesDoFaturamento }
