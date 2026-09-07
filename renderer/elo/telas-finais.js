// renderer/elo/telas-finais.js — Insights, Relatórios e Configurações.
//
// São telas de leitura, e cada uma diz onde a ação acontece: gerar relatório e editar
// configuração continuam no painel. Melhor um recado honesto do que um botão que finge.

const G = require('./graficos')
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

function htmlInsights(dados, estado) {
  if (!dados) return semDados('de análise')
  const cor = (i) => G.PALETA[i % G.PALETA.length]

  const horarios = bloco('Horário de pico', 'pedidos por hora, média do período',
    G.linha([{ values: dados.horarios.valores, color: 'var(--acento, #14CE6B)', labelColor: '#0A7A3E' }],
      dados.horarios.labels, { area: 'gradPico', areaColor: '#14CE6B', w: 900, h: 200, yBottom: 145 }), 0)

  const abc = bloco('Produtos que mais saem', 'no período, por quantidade',
    G.barras((dados.abc || []).map((r, i) => ({ ...r, color: cor(i) }))), 0.05)

  const rec = dados.recorrencia || { novos: 0, voltaram: 0 }
  const totalRec = (rec.novos + rec.voltaram) || 1
  const recorrencia = bloco('Clientes novos × que voltaram', 'no período',
    '<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">'
    + '<div style="flex:none">' + G.donut([
      { value: rec.voltaram, color: '#14CE6B' }, { value: rec.novos, color: '#111827' },
    ]) + '</div>'
    + '<div style="flex:1;min-width:220px">'
    + G.barras([
      { label: 'Voltaram', value: rec.voltaram, color: '#14CE6B' },
      { label: 'Novos', value: rec.novos, color: '#111827' },
    ], { colRotulo: '110px' })
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:600;margin-top:10px">'
    + Math.round((rec.voltaram / totalRec) * 100) + '% dos clientes do período já tinham comprado antes</div>'
    + '</div></div>', 0.09)

  const ticket = bloco('Ticket médio por canal', 'quanto rende cada porta de entrada',
    G.barras((dados.ticketPorCanal || []).map((r, i) => ({ ...r, color: cor(i) })), { fmt: brl }), 0.12)

  return '<div style="display:flex;flex-direction:column;gap:18px">' + horarios
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:18px">' + abc + recorrencia + '</div>'
    + ticket + '</div>'
}

function htmlRelatorios(dados, estado) {
  if (!dados) return semDados('de relatórios')
  const cartoes = (dados.itens || []).map((r) =>
    '<div class="ecard" style="padding:20px;display:flex;flex-direction:column;gap:10px;min-width:0">'
    + '<div><div style="font-size:14.5px;font-weight:800;color:#111;margin-bottom:4px">' + esc(r.nome) + '</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(r.desc) + '</div></div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap">' + (r.formatos || []).map((f) =>
      '<span class="echip" style="background:#f0f0ee;color:#4b5563">' + esc(f) + '</span>').join('') + '</div>'
    + '<button type="button" data-acao="relatorio:' + esc(r.chave) + '" style="height:34px;border:1px solid #e5e7eb;border-radius:10px;'
    + 'background:#fff;color:#111;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">Gerar</button>'
    + '</div>').join('')
  return '<div style="display:flex;flex-direction:column;gap:18px">'
    + bloco('Relatórios', 'escolha o relatório e o formato',
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">' + cartoes + '</div>'
      + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">a geração do arquivo ainda é feita pelo painel</div>')
    + '</div>'
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

module.exports = { htmlInsights, htmlRelatorios, htmlConfiguracoes }
