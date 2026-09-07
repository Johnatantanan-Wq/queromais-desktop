// renderer/elo/tela-quadro.js — Gestão de pedido como QUADRO (kanban).
//
// Espelha o quadro do painel (app/admin/pedidos/logica.ts): três colunas padrão e
// duas extras que o lojista liga quando quer acompanhar a entrega até o fim. Em
// consumo local os rótulos mudam — "prontos para entrega" e "em trânsito" não fazem
// sentido para quem come na mesa.
//
// O que manda na tela é o TEMPO: no balcão, o pedido parado é o problema. Por isso o
// cartão mostra a espera e destaca quem passou do limite da etapa, em vez de deixar
// o número perdido no meio dos outros.

const COLUNAS = [
  { id: 'aguardando', titulo: 'Em análise', sub: 'aguardando aceite', cor: '#8a6508', bg: '#fff9e8', limite: 10 },
  { id: 'producao', titulo: 'Em produção', sub: 'cozinha / preparo', cor: '#1d4ed8', bg: '#eff6ff', limite: 25 },
  { id: 'pronto', titulo: 'Prontos para entrega', sub: 'saindo ou no balcão', cor: '#0A7A3E', bg: '#E7FAF0', limite: 15 },
]
const COLUNAS_EXTRAS = [
  { id: 'transito', titulo: 'Em trânsito', sub: 'a caminho do cliente', cor: '#6d28d9', bg: '#f5f3ff', limite: 45 },
  { id: 'entregue', titulo: 'Entregue', sub: 'concluídos', cor: '#0f766e', bg: '#f0fdfa', limite: null },
]
// Consumo local: mesmas etapas, outro vocabulário (o pedido não sai do salão).
const TITULOS_LOCAL = {
  aguardando: 'Novos pedidos', producao: 'Em preparo',
  pronto: 'Prontos para servir', transito: 'Servidos', entregue: 'Fechados',
}
// A ação que leva o pedido para a etapa seguinte — os mesmos rótulos do painel.
const PROXIMA_ACAO = {
  aguardando: 'Iniciar produção', producao: 'Marcar pronto',
  pronto: 'Entregar', transito: 'Confirmar entrega', entregue: null,
}

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function tempoDeEspera(min) {
  const m = Math.max(0, Math.round(Number(min) || 0))
  if (m < 60) return m + ' min'
  const h = Math.floor(m / 60), resto = m % 60
  return resto ? h + ' h ' + String(resto).padStart(2, '0') : h + ' h'
}

function cartao(p, coluna) {
  const atrasado = coluna.limite != null && p.entrouHaMin > coluna.limite
  const corTempo = atrasado ? '#b42318' : '#6b7280'
  const acao = PROXIMA_ACAO[coluna.id]
  const itens = (p.itens || []).slice(0, 3).map((i) => '<div style="font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(i) + '</div>').join('')
  const mais = (p.itens || []).length > 3 ? '<div style="font-size:11.5px;color:#9ca3af;font-weight:600">+ ' + ((p.itens || []).length - 3) + ' item(ns)</div>' : ''
  return '<div data-pedido="' + esc(p.numero) + '" class="ecard" style="padding:12px 14px;cursor:pointer;border-radius:12px;'
    + (atrasado ? 'border-color:#f3c0bb;box-shadow:0 0 0 1px #fdeaea' : '') + '">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">'
    + '<span style="font-size:13.5px;font-weight:800;color:#111">#' + esc(p.numero) + '</span>'
    + '<span style="font-size:11.5px;font-weight:' + (atrasado ? '800' : '700') + ';color:' + corTempo + '">'
    + (atrasado ? '⏱ ' : '') + esc(tempoDeEspera(p.entrouHaMin)) + (atrasado ? ' · atrasado' : '') + '</span></div>'
    + '<div style="font-size:13px;font-weight:700;color:#111;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.cliente) + '</div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-bottom:8px">' + esc(p.canal) + ' · ' + esc(p.pagamento || '—') + '</div>'
    + itens + mais
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px">'
    + '<span style="font-size:14px;font-weight:800;color:#111">' + brl(p.valor) + '</span>'
    + (acao ? '<button type="button" data-acao="avancar:' + esc(p.numero) + '" style="height:30px;padding:0 12px;border:none;border-radius:9px;'
      + 'background:var(--acento);color:#fff;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap">' + esc(acao) + '</button>' : '')
    + '</div></div>'
}

function htmlQuadro(dados, estado) {
  estado = estado || {}
  if (!dados) {
    return '<div class="ecard"><div class="evazio">Sem dados dos pedidos ainda.<br>'
      + 'Quando o app falar com o painel, o quadro aparece aqui.</div></div>'
  }
  const colunas = estado.extras ? COLUNAS.concat(COLUNAS_EXTRAS) : COLUNAS
  const itens = dados.itens || []

  const corpo = colunas.map((c) => {
    const doColuna = itens.filter((p) => p.etapa === c.id)
    const titulo = estado.consumoLocal ? (TITULOS_LOCAL[c.id] || c.titulo) : c.titulo
    const cartoes = doColuna.length
      ? doColuna.map((p) => cartao(p, c)).join('')
      : '<div style="padding:22px 12px;text-align:center;color:#9ca3af;font-size:12.5px">Nenhum pedido aqui</div>'
    return '<div style="display:flex;flex-direction:column;gap:10px;min-width:0">'
      + '<div style="border-radius:12px;background:' + c.bg + ';padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px">'
      + '<div><div style="font-size:13px;font-weight:800;color:' + c.cor + '">' + esc(titulo) + '</div>'
      + '<div style="font-size:11px;color:' + c.cor + ';opacity:.75;font-weight:600">' + esc(c.sub) + '</div></div>'
      + '<span style="font-size:13px;font-weight:800;color:' + c.cor + '">' + doColuna.length + '</span></div>'
      + '<div style="display:flex;flex-direction:column;gap:10px">' + cartoes + '</div></div>'
  }).join('')

  return '<div style="display:grid;grid-template-columns:repeat(' + colunas.length + ',minmax(240px,1fr));gap:16px;align-items:start;animation:eloFadeUp .5s ease both">'
    + corpo + '</div>'
}

module.exports = { htmlQuadro, tempoDeEspera, COLUNAS, COLUNAS_EXTRAS, TITULOS_LOCAL, PROXIMA_ACAO }
