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
  { chave: 'dia', rotulo: 'Hoje' },
  { chave: 'ontem', rotulo: 'Ontem' },
  { chave: 'semana', rotulo: 'Semana' },
  { chave: 'mes', rotulo: 'Mês' },
]

function botoesPeriodo(atual) {
  return '<div style="display:flex;gap:6px;flex-wrap:wrap">' + PERIODOS.map((p) =>
    '<button type="button" data-periodo="' + p.chave + '" class="echip' + (p.chave === atual ? ' is-on' : '') + '"'
    + ' style="cursor:pointer;' + (p.chave === atual
      ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800'
      : 'background:#f0f0ee;color:#4b5563') + '">' + esc(p.rotulo) + '</button>').join('') + '</div>'
}

function bloco(titulo, subtitulo, conteudo, atraso, acao) {
  return '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease ' + (atraso || 0) + 's both">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111111;margin-bottom:4px">' + esc(titulo) + '</div>'
    + (subtitulo ? '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(subtitulo) + '</div>' : '')
    + '</div>' + (acao || '') + '</div>' + conteudo + '</div>'
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
      { values: s.anterior || [], color: '#c9c6bd', labelColor: '#9ca3af', tracejada: true },
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
    + '<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:14px;height:3px;background:#c9c6bd;border-radius:2px;display:inline-block"></i>período anterior</span></div>'

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

  return '<div style="display:flex;flex-direction:column;gap:18px">'
    + kpis
    + bloco(m.titulo, (dados.periodo && dados.periodo.rotulo) || '', grafico + legenda, 0.04, botoesPeriodo(estado.periodo || (dados.periodo && dados.periodo.chave) || 'semana'))
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:18px">' + canais + formas + '</div>'
    + (motivos ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:18px">' + motivos + bairros + '</div>' : bairros)
    + '</div>'
}

module.exports = { htmlVisaoGeral, variacao, fmtBRL, fmtInt, METRICAS, PERIODOS }
