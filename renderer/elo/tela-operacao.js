// renderer/elo/tela-operacao.js — as telas que não cabem em lista: KDS (cozinha e bar)
// e Atendimento (mesas do salão).
//
// KDS é por ITEM, não por pedido: a cozinha faz pizza, não faz "pedido #1042". E o que
// manda é o tempo de espera do item — por isso ele fica em destaque e vira vermelho
// quando passa do limite. A observação do cliente ("sem cebola") aparece sempre: é ela
// que erra o prato quando some.

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function tempo(min) {
  const m = Math.max(0, Math.round(Number(min) || 0))
  if (m < 60) return m + ' min'
  const h = Math.floor(m / 60), r = m % 60
  return r ? h + ' h ' + String(r).padStart(2, '0') : h + ' h'
}
const semDados = (o) => '<div class="ecard"><div class="evazio">Sem dados ' + o + ' ainda.<br>'
  + 'Quando o app falar com o painel, esta tela aparece aqui.</div></div>'

const COLUNAS_KDS = [
  { id: 'fazer', titulo: 'A fazer', sub: 'na fila', cor: '#8a6508', bg: '#fff9e8', limite: 8 },
  { id: 'fazendo', titulo: 'Fazendo', sub: 'no forno / bancada', cor: '#1d4ed8', bg: '#eff6ff', limite: 18 },
  { id: 'pronto', titulo: 'Pronto', sub: 'aguardando retirada', cor: '#0A7A3E', bg: '#E7FAF0', limite: 10 },
]

function htmlKds(dados, estado) {
  estado = estado || {}
  if (!dados) return semDados('da produção')
  const itens = dados.itens || []
  if (!itens.length) {
    return '<div class="ecard"><div class="evazio"><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:6px">Tudo em dia</div>'
      + 'Nenhum item na produção agora.</div></div>'
  }
  const colunas = COLUNAS_KDS.map((c) => {
    const doColuna = itens.filter((i) => i.estado === c.id)
    const cards = doColuna.length ? doColuna.map((i) => {
      const atrasado = c.limite != null && i.esperaMin > c.limite
      return '<div data-item="' + esc(i.pedido) + '" class="ecard" style="padding:12px 14px 12px 11px;border-radius:12px;'
        + (atrasado ? 'border-left:3px solid #b42318' : 'border-left:3px solid transparent') + '">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">'
        + '<span style="font-size:11.5px;font-weight:800;color:#6b7280">#' + esc(i.pedido) + ' · ' + esc(i.canal) + '</span>'
        + '<span style="font-size:12px;font-weight:800;color:' + (atrasado ? '#b42318' : '#6b7280') + '">'
        + (atrasado ? '⏱ ' : '') + esc(tempo(i.esperaMin)) + '</span></div>'
        + '<div style="font-size:15px;font-weight:800;color:#111;line-height:1.25">' + esc(i.item) + '</div>'
        + (i.obs ? '<div style="margin-top:6px;font-size:12.5px;font-weight:700;color:#8a6508;background:#fff9e8;'
          + 'padding:5px 9px;border-radius:8px;display:inline-block">⚠ ' + esc(i.obs) + '</div>' : '')
        + '</div>'
    }).join('') : '<div style="padding:22px 12px;text-align:center;color:#9ca3af;font-size:12.5px">Nada aqui</div>'
    return '<div style="display:flex;flex-direction:column;gap:10px;min-width:0">'
      + '<div style="border-radius:12px;background:' + c.bg + ';padding:10px 14px;display:flex;align-items:center;justify-content:space-between">'
      + '<div><div style="font-size:13px;font-weight:800;color:' + c.cor + '">' + esc(c.titulo) + '</div>'
      + '<div style="font-size:11px;color:' + c.cor + ';opacity:.75;font-weight:600">' + esc(c.sub) + '</div></div>'
      + '<span style="font-size:13px;font-weight:800;color:' + c.cor + '">' + doColuna.length + '</span></div>'
      + '<div style="display:flex;flex-direction:column;gap:10px">' + cards + '</div></div>'
  }).join('')
  return '<div style="display:grid;grid-template-columns:repeat(3,minmax(240px,1fr));gap:16px;align-items:start;animation:eloFadeUp .5s ease both">'
    + colunas + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">marcar item como pronto ainda é pelo painel</div>'
}

const COR_MESA = {
  'Livre': { c: '#0A7A3E', bg: '#E7FAF0', borda: '#A8E9C6' },
  'Ocupada': { c: '#8a6508', bg: '#fff9e8', borda: '#eed571' },
  'Conta pedida': { c: '#b42318', bg: '#fdeaea', borda: '#f3c0bb' },
  'Reservada': { c: '#1d4ed8', bg: '#eff6ff', borda: '#bfdbfe' },
}

function htmlMesas(dados, estado) {
  estado = estado || {}
  if (!dados) return semDados('do salão')
  const mesas = dados.mesas || []
  const ocupadas = mesas.filter((m) => m.situacao !== 'Livre').length
  const consumo = mesas.reduce((s, m) => s + (Number(m.consumo) || 0), 0)

  const kpis = '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;animation:eloFadeUp .5s ease both">'
    + [
      { r: 'Mesas ocupadas', v: ocupadas + ' de ' + mesas.length, s: 'no salão agora' },
      { r: 'Consumo em aberto', v: brl(consumo), s: 'nas mesas' },
      { r: 'Contas pedidas', v: String(mesas.filter((m) => m.situacao === 'Conta pedida').length), s: 'esperando fechamento', c: '#b42318' },
    ].map((k) => '<div class="ecard" style="padding:13px 20px;min-width:0">'
      + '<div style="font-size:11.5px;font-weight:700;color:#6b7280;margin-bottom:6px">' + esc(k.r) + '</div>'
      + '<div style="font-size:22px;font-weight:800;color:' + (k.c || '#111') + ';letter-spacing:-.02em;line-height:1">' + esc(k.v) + '</div>'
      + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:5px">' + esc(k.s) + '</div></div>').join('')
    + '</div>'

  const grade = mesas.map((m) => {
    const cor = COR_MESA[m.situacao] || COR_MESA['Livre']
    // sem conta aberta (livre ou reservada): não mostra valor nem tempo — R$ 0,00 numa
    // mesa reservada faz o dono procurar um consumo que não existe
    const semConta = m.situacao === 'Livre' || (!Number(m.consumo) && !Number(m.desdeMin))
    return '<div data-mesa="' + esc(m.numero) + '" style="border:1.5px solid ' + cor.borda + ';background:' + cor.bg
      + ';border-radius:14px;padding:16px;cursor:pointer;min-width:0">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">'
      + '<span style="font-size:19px;font-weight:800;color:#111">Mesa ' + esc(m.numero) + '</span>'
      + '<span style="font-size:11px;font-weight:800;color:' + cor.c + ';background:#fff;padding:3px 9px;border-radius:999px">' + esc(m.situacao) + '</span></div>'
      + '<div style="font-size:11.5px;color:#6b7280;font-weight:600">' + esc(m.lugares) + ' lugares'
      + (m.garcom ? ' · ' + esc(m.garcom) : '') + '</div>'
      + (semConta ? '' : '<div style="margin-top:10px;display:flex;align-items:baseline;justify-content:space-between;gap:8px">'
        + '<span style="font-size:16px;font-weight:800;color:#111">' + brl(m.consumo) + '</span>'
        + '<span style="font-size:11.5px;font-weight:700;color:' + cor.c + '">' + esc(tempo(m.desdeMin)) + '</span></div>')
      + '</div>'
  }).join('')

  return '<div style="display:flex;flex-direction:column;gap:18px">' + kpis
    + '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .07s both">'
    + '<div style="margin-bottom:18px"><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">Salão</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">toque numa mesa para ver a comanda</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px">' + grade + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">abrir, transferir e fechar conta ainda são pelo painel</div>'
    + '</div></div>'
}

module.exports = { htmlKds, htmlMesas, tempo, COLUNAS_KDS, COR_MESA }
