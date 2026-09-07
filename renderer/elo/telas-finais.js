// renderer/elo/telas-finais.js — Insights, Relatórios e Configurações.
//
// São telas de leitura, e cada uma diz onde a ação acontece: gerar relatório e editar
// configuração continuam no painel. Melhor um recado honesto do que um botão que finge.

const G = require('./graficos')
const L = require('./tela-lista')
const esc = G.esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const semDados = (o) => '<div class="ecard"><div class="evazio">Sem dados ' + o + ' ainda.<br>'
  + 'Quando o app falar com o painel, esta tela aparece aqui.</div></div>'

function bloco(titulo, sub, conteudo, atraso) {
  return '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease ' + (atraso || 0) + 's both">'
    + '<div style="margin-bottom:18px"><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">' + esc(titulo) + '</div>'
    + (sub ? '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(sub) + '</div>' : '') + '</div>'
    + conteudo + '</div>'
}

const PERIODOS_REL = [
  { chave: 'hoje', rotulo: 'Hoje' }, { chave: '7dias', rotulo: '7 dias' }, { chave: '30dias', rotulo: '30 dias' },
  { chave: '90dias', rotulo: '90 dias' }, { chave: 'ano', rotulo: 'Este ano' }, { chave: 'tudo', rotulo: 'Tudo' },
]
const ABAS_REL = [
  { chave: 'vendas', rotulo: 'Vendas' }, { chave: 'pedidos', rotulo: 'Pedidos' }, { chave: 'cardapio', rotulo: 'Cardápio' },
  { chave: 'entregadores', rotulo: 'Entregadores' }, { chave: 'reposicao', rotulo: 'Reposição' },
  { chave: 'parceiros', rotulo: 'Parceiros' }, { chave: 'clientes', rotulo: 'Clientes' },
]

function botaoFinal(acao, rotulo, primaria) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:34px;padding:0 14px;border-radius:10px;'
    + 'font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;white-space:nowrap;' + (primaria
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}
function chipFinal(attr, chave, rotulo, ligado) {
  return '<button type="button" ' + attr + '="' + esc(chave) + '" class="echip' + (ligado ? ' is-on' : '') + '"'
    + ' style="cursor:pointer;height:30px;' + (ligado
      ? 'background:var(--acento);color:#fff;font-weight:800'
      : 'background:#f0f0ee;color:#4b5563') + '">' + esc(rotulo) + '</button>'
}
/** Cartão de número do painel: rótulo miúdo em caixa alta, número grande. */
function kpiFinal(rotulo, valor, sub, cor, faixa) {
  return '<div class="ecard" style="padding:14px 18px;min-width:0'
    + (faixa ? ';border-left:3px solid ' + faixa : '') + '">'
    + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px">'
    + esc(rotulo) + '</div>'
    + '<div style="font-size:24px;font-weight:800;color:' + (cor || '#111') + ';letter-spacing:-.03em;line-height:1">'
    + esc(valor) + '</div>'
    + (sub ? '<div style="font-size:11px;color:#9ca3af;font-weight:600;margin-top:6px;line-height:1.4">' + esc(sub) + '</div>' : '')
    + '</div>'
}
function faixaKpisFinal(lista, colunas) {
  return '<div style="display:grid;grid-template-columns:repeat(' + (colunas || lista.length)
    + ',minmax(0,1fr));gap:14px;margin-bottom:18px">'
    + lista.map((k) => kpiFinal(k.r, k.v, k.s, k.c, k.faixa)).join('') + '</div>'
}
/** Rótulo de seção (RECEITAS, DESTAQUES…) — o painel separa os blocos assim. */
function rotuloSecao(t) {
  return '<div style="font-size:10.5px;font-weight:800;color:#b3b2ac;text-transform:uppercase;letter-spacing:.12em;'
    + 'margin:4px 0 10px">' + esc(t) + '</div>'
}
function campoData(rotulo, valor) {
  return '<div><div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;'
    + 'margin-bottom:5px">' + esc(rotulo) + '</div>'
    + '<div style="height:32px;border:1px solid #e5e7eb;border-radius:9px;background:#fff;display:flex;align-items:center;'
    + 'padding:0 11px;font-size:12.5px;color:#9ca3af;font-weight:500;min-width:130px">' + esc(valor) + '</div></div>'
}

// ── Relatórios ──────────────────────────────────────────────────────────────
function htmlRelatorios(dados, estado) {
  estado = estado || {}
  if (!dados) return semDados('de relatórios')
  const periodo = PERIODOS_REL.some((p) => p.chave === estado.periodoRel) ? estado.periodoRel : '30dias'
  const aba = ABAS_REL.some((a) => a.chave === estado.abaRel) ? estado.abaRel : 'vendas'
  const v = dados.vendas || {}

  const topo = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;'
    + 'flex-wrap:wrap;margin-bottom:16px">'
    + '<div><div style="font-size:19px;font-weight:800;color:#111;letter-spacing:-.02em">Relatórios</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:4px">' + esc(dados.intervalo || '—') + '</div></div>'
    + botaoFinal('relatorio:pdf', 'Imprimir / Salvar PDF', true) + '</div>'

  const filtros = '<div class="ecard" style="padding:16px 20px;margin-bottom:14px">'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'
    + PERIODOS_REL.map((p) => chipFinal('data-periodo-rel', p.chave, p.rotulo, p.chave === periodo)).join('') + '</div>'
    + '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">'
    + campoData('De', (dados.de || 'dd/mm/aaaa')) + campoData('Até', (dados.ate || 'dd/mm/aaaa'))
    + botaoFinal('relatorio:aplicar', 'Aplicar', false)
    + campoData('Modalidade', 'Todas as modalidades') + campoData('Forma', 'Todas as formas')
    + '</div></div>'

  const abas = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">'
    + ABAS_REL.map((a) => '<button type="button" data-aba-rel="' + esc(a.chave) + '" class="echip'
      + (a.chave === aba ? ' is-on' : '') + '" style="cursor:pointer;height:32px;' + (a.chave === aba
        ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800'
        : 'background:#f0f0ee;color:#4b5563') + '">' + esc(a.rotulo) + '</button>').join('') + '</div>'

  if (aba !== 'vendas') {
    const secao = (dados.secoes || {})[aba]
    const corpo = secao && secao.linhas && secao.linhas.length
      ? L.apenasGrade({ colunas: secao.colunas, grade: secao.grade, direita: secao.direita || [] },
        secao.linhas.map((l) => ({ chave: l[0], celulas: l })))
      : '<div class="evazio">Sem movimento nesta aba no período escolhido.</div>'
    return topo + filtros + abas + bloco(secao ? secao.titulo : 'Relatório', secao ? secao.sub : '', corpo)
  }

  const kpis = faixaKpisFinal([
    { r: 'Faturamento (produtos)', v: brl(v.faturamento), c: 'var(--acento-texto)',
      s: '+ ' + brl(v.entrega) + ' de entrega · recebido: ' + brl(v.recebido) },
    { r: 'Pedidos', v: String(v.pedidos || 0), s: 'no período' },
    { r: 'Ticket médio', v: brl(v.ticket), s: 'por pedido' },
    { r: 'Cancelados', v: String(v.cancelados || 0), s: (v.pedidos ? Math.round(((v.cancelados || 0) / v.pedidos) * 100) : 0) + '% dos pedidos',
      c: v.cancelados ? '#b42318' : '#111' },
  ], 4)

  const evolucao = bloco('Evolução diária', '', G.colunas((v.serie || []).map((p) => ({ label: p.dia, value: p.valor })),
    { fmt: (x) => 'R$ ' + Math.round(x).toLocaleString('pt-BR') }))

  const totalMod = (v.modalidades || []).reduce((s, m) => s + (Number(m.valor) || 0), 0) || 1
  const modalidades = bloco('Por modalidade', '',
    (v.modalidades || []).length
      ? (v.modalidades || []).map((m) => '<div style="padding:6px 0">'
        + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:5px">'
        + '<span style="font-size:13px;font-weight:700;color:#111">● ' + esc(m.nome)
        + '<span style="font-size:11.5px;color:#9ca3af;font-weight:600"> · ' + esc(m.pedidos) + ' ped.</span></span>'
        + '<span style="font-size:13px;font-weight:800;color:#111">' + esc(brl(m.valor))
        + '<span style="font-size:11.5px;color:#9ca3af;font-weight:600"> ' + ((m.valor / totalMod) * 100).toFixed(1) + '%</span></span></div>'
        + '<div style="height:8px;border-radius:4px;background:#f0f0ee;overflow:hidden">'
        + '<div style="height:100%;width:' + ((m.valor / totalMod) * 100).toFixed(1) + '%;background:var(--acento);border-radius:4px"></div>'
        + '</div></div>').join('')
      : '<div class="evazio">Sem vendas no período.</div>')

  const formas = bloco('Formas de pagamento', '',
    (v.formas || []).length
      ? '<div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">'
        + '<div style="flex:none">' + G.donut((v.formas || []).map((f, i) => ({ value: f.valor, color: G.PALETA[i % G.PALETA.length] }))) + '</div>'
        + '<div style="flex:1;min-width:220px">' + G.barras((v.formas || []).map((f, i) => ({
          label: f.nome, value: f.valor, color: G.PALETA[i % G.PALETA.length],
        })), { fmt: brl, colRotulo: '110px' }) + '</div></div>'
      : '<div class="evazio">Sem recebimentos no período.</div>')

  return topo + filtros + abas + kpis + evolucao
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px;margin-top:18px">'
    + modalidades + formas + '</div>'
}

// ── Insights ────────────────────────────────────────────────────────────────
function htmlInsights(dados, estado) {
  estado = estado || {}
  if (!dados) return semDados('de análise')
  const periodo = PERIODOS_REL.some((p) => p.chave === estado.periodoRel) ? estado.periodoRel : '30dias'
  const rotuloPeriodo = (PERIODOS_REL.find((p) => p.chave === periodo) || {}).rotulo || '30 dias'
  const g = dados.geral || {}
  const fin = dados.financeiro || {}

  const topo = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;'
    + 'flex-wrap:wrap;margin-bottom:16px">'
    + '<div><div style="font-size:19px;font-weight:800;color:#111;letter-spacing:-.02em">Insights</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:4px">Período: '
    + esc(rotuloPeriodo) + '</div></div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
    + PERIODOS_REL.map((p) => chipFinal('data-periodo-rel', p.chave, p.rotulo, p.chave === periodo)).join('')
    + '</div></div>'

  const kpis = faixaKpisFinal([
    { r: 'Faturamento (produtos)', v: brl(g.faturamento), c: 'var(--acento-texto)',
      s: '+ ' + brl(g.entrega) + ' de entrega · recebido: ' + brl(g.recebido) },
    { r: 'Pedidos válidos', v: String(g.pedidos || 0), s: 'sem os cancelados' },
    { r: 'Ticket médio', v: brl(g.ticket), c: 'var(--acento-texto)', s: 'por pedido' },
    { r: 'Clientes únicos', v: String(g.clientes || 0), s: 'compraram no período' },
    { r: 'Cancelamentos', v: (g.cancelamentoPct != null ? g.cancelamentoPct : 0) + '%',
      c: (g.cancelamentoPct || 0) > 10 ? '#b42318' : 'var(--acento-texto)', s: 'dos pedidos do período' },
  ], 5)

  const financeiro = rotuloSecao('Financeiro') + faixaKpisFinal([
    { r: 'Receitas', v: brl(fin.receitas), c: 'var(--acento-texto)', s: 'entrou no período' },
    { r: 'Despesas', v: brl(fin.despesas), c: fin.despesas ? '#b42318' : '#111', s: 'saiu no período' },
    { r: 'Taxa de entrega', v: brl(fin.taxaEntrega), c: '#1d4ed8', s: 'cobrada dos clientes' },
    { r: 'Saldo líquido', v: brl(fin.saldo), c: (fin.saldo || 0) >= 0 ? 'var(--acento-texto)' : '#b42318', s: 'receitas menos despesas' },
  ], 4)

  const totalFormas = (dados.formas || []).reduce((s, f) => s + (Number(f.valor) || 0), 0) || 1
  const porForma = bloco('Por forma de pagamento', '',
    (dados.formas || []).length
      ? (dados.formas || []).map((f) => '<div style="padding:5px 0">'
        + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:4px">'
        + '<span style="font-size:13px;font-weight:700;color:#111">' + esc(f.nome) + '</span>'
        + '<span style="font-size:13px;font-weight:800;color:var(--acento-texto)">' + esc(brl(f.valor)) + '</span></div>'
        + '<div style="height:7px;border-radius:4px;background:#f0f0ee;overflow:hidden">'
        + '<div style="height:100%;width:' + ((f.valor / totalFormas) * 100).toFixed(1) + '%;background:var(--acento);border-radius:4px"></div></div>'
        + '<div style="font-size:11px;color:#9ca3af;font-weight:600;margin-top:3px">'
        + ((f.valor / totalFormas) * 100).toFixed(1) + '%</div></div>').join('')
      : '<div class="evazio">Sem recebimentos no período.</div>')

  const porOrigem = bloco('Por origem', '',
    L.apenasGrade({ colunas: ['Origem', 'Receita', 'Despesa'], grade: '1fr 160px 160px', direita: [1, 2] },
      (dados.origens || []).map((o) => ({ chave: o.nome, celulas: [
        { texto: o.nome, forte: true, cor: '#111' },
        { texto: brl(o.receita), forte: true, cor: 'var(--acento-texto)' },
        o.despesa ? brl(o.despesa) : '—'] }))))

  const canais = rotuloSecao('Canais de aquisição')
    + '<div class="ecard" style="padding:24px;margin-bottom:18px">'
    + L.apenasGrade({ colunas: ['Canal', 'Pedidos', 'Faturamento'], grade: '1fr 160px 200px', direita: [1, 2] },
      (dados.canais || []).map((c) => ({ chave: c.nome, celulas: [
        { texto: c.nome, forte: true, cor: '#111' }, String(c.pedidos),
        { texto: brl(c.faturamento), forte: true, cor: 'var(--acento-texto)' }] })))
    + '</div>'

  const p = dados.pareto || {}
  const pareto = p.produtos
    ? rotuloSecao('Regra 80/20')
      + '<div class="ecard" style="padding:22px 24px;margin-bottom:18px;border-left:3px solid var(--acento)">'
      + '<div style="font-size:19px;font-weight:800;color:#111;letter-spacing:-.02em">'
      + '<span style="color:var(--acento-texto)">' + esc(p.produtos) + ' produtos</span>'
      + '<span style="font-size:13px;color:#9ca3af;font-weight:600"> de ' + esc(p.total) + '</span>'
      + ' geram <span style="color:var(--acento-texto)">80%</span> do faturamento</div>'
      + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:6px">'
      + (p.total ? ((p.produtos / p.total) * 100).toFixed(1) : '0') + '% do catálogo concentra 80% da receita</div></div>'
    : ''

  const mix = dados.mix || {}
  const totalMix = (Number(mix.cozinha) || 0) + (Number(mix.bar) || 0)
  const pctCoz = totalMix ? Math.round((mix.cozinha / totalMix) * 100) : 0
  const mixHtml = rotuloSecao('Mix de vendas')
    + '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px">'
    + kpiFinal('Cozinha', brl(mix.cozinha), (mix.produtosCozinha || 0) + ' produtos', '#111', '#1E40AF')
    + kpiFinal('Bar', brl(mix.bar), (mix.produtosBar || 0) + ' bebidas', '#111', '#7C3AED')
    + '<div class="ecard" style="padding:14px 18px;min-width:0">'
    + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin-bottom:9px">Proporção</div>'
    + '<div style="font-size:13px;font-weight:800;color:#111;margin-bottom:8px">'
    + '<span style="color:var(--acento-texto)">Coz. ' + pctCoz + '%</span>'
    + '<span style="color:#9ca3af"> &nbsp; Bar ' + (100 - pctCoz) + '%</span></div>'
    + '<div style="height:8px;border-radius:4px;background:#f0f0ee;overflow:hidden">'
    + '<div style="height:100%;width:' + pctCoz + '%;background:var(--acento);border-radius:4px"></div></div></div>'
    + '</div>'

  const d = dados.destaques || {}
  const destaques = rotuloSecao('Destaques')
    + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px">'
    + kpiFinal('Dia mais forte', d.diaForte || '—', (d.diaFortePedidos || 0) + ' pedidos', '#111', 'var(--acento)')
    + kpiFinal('Dia mais fraco', d.diaFraco || '—', (d.diaFracoPedidos || 0) + ' pedidos', '#111', '#b42318')
    + kpiFinal('Horário pico', d.horarioPico || '—', (d.horarioPicoPedidos || 0) + ' pedidos', '#111', 'var(--acento)')
    + kpiFinal('Modalidade top', d.modalidadeTop || '—', (d.modalidadeTopPct || 0) + '% dos pedidos', '#111', 'var(--acento)')
    + '</div>'

  const distribuicao = rotuloSecao('Distribuição')
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px;margin-bottom:18px">'
    + bloco('Por dia da semana', '', G.colunas((dados.porDia || []).map((x) => ({ label: x.dia, value: x.pedidos }))))
    + bloco('Por hora do dia', '', G.colunas((dados.porHora || []).map((x) => ({ label: x.hora, value: x.pedidos })),
      { mostrarValor: false, altura: 130 }))
    + '</div>'

  const ranking = (titulo, sub, itens, campo, fmt) => '<div class="ecard" style="padding:0;overflow:hidden;min-width:0">'
    + '<div style="padding:16px 18px;border-bottom:1px solid #f0f0ee">'
    + '<div style="font-size:14px;font-weight:800;color:#111">' + esc(titulo) + '</div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:500;margin-top:2px">' + esc(sub) + '</div></div>'
    + (itens && itens.length ? itens.map((x, i) => {
      const max = Math.max(...itens.map((y) => Number(y[campo]) || 0), 1)
      return '<div style="display:grid;grid-template-columns:26px 1fr 90px;gap:10px;align-items:center;'
        + 'padding:9px 18px;border-bottom:1px solid #f6f6f4">'
        + '<span style="font-size:12px;font-weight:800;color:' + (i < 3 ? 'var(--acento-texto)' : '#9ca3af') + '">' + (i + 1) + '</span>'
        + '<div style="min-width:0"><div style="font-size:13px;font-weight:700;color:#111;overflow:hidden;'
        + 'text-overflow:ellipsis;white-space:nowrap">' + esc(x.nome) + '</div>'
        + '<div style="height:5px;border-radius:3px;background:#f0f0ee;overflow:hidden;margin-top:5px">'
        + '<div style="height:100%;width:' + (((Number(x[campo]) || 0) / max) * 100).toFixed(1)
        + '%;background:var(--acento);border-radius:3px"></div></div></div>'
        + '<div style="text-align:right"><div style="font-size:13px;font-weight:800;color:#111">' + esc(fmt(x)) + '</div>'
        + '<div style="font-size:11px;color:#9ca3af;font-weight:600">' + esc(x.detalhe || '') + '</div></div></div>'
    }).join('') : '<div class="evazio">Sem movimento no período.</div>')
    + '</div>'

  const prod = dados.produtos || {}
  const produtos = rotuloSecao('Produtos')
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:18px">'
    + ranking('Cozinha', (prod.cozinha || []).length + ' produtos', prod.cozinha, 'qtd', (x) => String(x.qtd))
    + ranking('Bar', (prod.bar || []).length + ' bebidas', prod.bar, 'qtd', (x) => String(x.qtd))
    + ranking('Categorias', (prod.categorias || []).length + ' categorias por receita', prod.categorias, 'receita', (x) => brl(x.receita))
    + '</div>'

  const baixa = (dados.baixaVenda || []).length
    ? rotuloSecao('Baixa venda')
      + '<div class="ecard" style="padding:0;overflow:hidden;border-left:3px solid #b42318">'
      + '<div style="padding:16px 20px;border-bottom:1px solid #f0f0ee">'
      + '<div style="font-size:14px;font-weight:800;color:#111">Produtos com menor saída</div>'
      + '<div style="font-size:11.5px;color:#9ca3af;font-weight:500;margin-top:2px">'
      + 'Considere promoção, melhoria de foto ou remoção do cardápio</div></div>'
      + (dados.baixaVenda || []).map((x, i) => '<div style="display:grid;grid-template-columns:26px 1fr 110px 120px;'
        + 'gap:10px;align-items:center;padding:9px 20px;border-bottom:1px solid #f6f6f4">'
        + '<span style="font-size:12px;font-weight:800;color:#9ca3af">' + (i + 1) + '</span>'
        + '<span style="font-size:13px;font-weight:700;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
        + esc(x.nome) + '</span>'
        + '<span style="font-size:13px;font-weight:700;color:#4b5563;text-align:right">' + esc(x.vendas) + ' venda(s)</span>'
        + '<span style="font-size:13px;font-weight:800;color:#b42318;text-align:right">' + esc(brl(x.receita)) + '</span></div>').join('')
      + '</div>'
    : ''

  return topo + kpis + financeiro
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px;margin-bottom:18px">'
    + porForma + porOrigem + '</div>'
    + canais + pareto + mixHtml + destaques + distribuicao + produtos + baixa
}

function htmlConfiguracoes(dados, estado) {
  if (!dados) return semDados('de configuração')
  const secoes = (dados.secoes || []).map((s, i) =>
    bloco(s.titulo, '', (s.campos || []).map((c) =>
      '<div style="display:grid;grid-template-columns:220px 1fr;gap:14px;padding:9px 0;border-bottom:1px solid #f0f0ee">'
      + '<span style="font-size:12.5px;font-weight:700;color:#6b7280">' + esc(c.rotulo) + '</span>'
      + '<span style="font-size:13px;font-weight:600;color:#111">' + esc(c.valor) + '</span></div>').join(''), i * 0.04)
  ).join('')
  return '<div style="display:flex;flex-direction:column;gap:18px">' + secoes
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600">alterar qualquer configuração ainda é pelo painel</div></div>'
}

module.exports = { htmlInsights, htmlRelatorios, htmlConfiguracoes, PERIODOS_REL, ABAS_REL }
