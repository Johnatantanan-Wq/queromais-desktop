// renderer/elo/graficos.js — os gráficos do Elo (OVD-VENDAS/capa/renderer/elo-ui.js:96-180),
// portados: SVG escrito à mão, sem biblioteca, sem requisição externa. Funciona offline por
// construção — é o que permite a tela desenhar com dado de cache, sem internet.
//
// Só montagem pura: recebe números, devolve string. Testado em node.

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function n(v) {
  const x = Number(v)
  return isFinite(x) ? Math.round(x).toLocaleString('pt-BR') : '—'
}

const FONTE = 'Plus Jakarta Sans, sans-serif'

/** Gráfico de linha, uma ou N séries no mesmo eixo. opts: {w,h,area,areaColor,fmt} */
function linha(series, labels, opts) {
  opts = opts || {}
  const w = opts.w || 560, h = opts.h || 190
  const mx = opts.mx == null ? 40 : opts.mx
  const yTop = opts.yTop == null ? 25 : opts.yTop
  const yBottom = opts.yBottom == null ? 130 : opts.yBottom
  const fmt = opts.fmt || n
  const qtd = labels.length
  if (!qtd || !series.length) return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;display:block"></svg>'

  const todos = [].concat(...series.map((s) => s.values))
  const max = Math.max(...todos, 0), min = Math.min(...todos, 0)
  const span = (max - min) || 1
  const xOf = (i) => (qtd === 1 ? w / 2 : mx + (i * (w - 2 * mx)) / (qtd - 1))
  const yOf = (v) => yBottom - ((v - min) / span) * (yBottom - yTop)

  const grade = [yTop, (yTop + yBottom) / 2, yBottom].map((y) =>
    '<line x1="' + (mx / 2).toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (w - mx / 2).toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#f0f0ee" stroke-width="1"></line>'
  ).join('')

  const corpo = series.map((s, si) => {
    const pts = s.values.map((v, i) => ({ x: xOf(i), y: yOf(v) }))
    const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ')
    let area = ''
    if (opts.area && si === 0 && pts.length) {
      area = '<path d="' + d + ' L' + pts[pts.length - 1].x.toFixed(1) + ' ' + yBottom + ' L' + pts[0].x.toFixed(1) + ' ' + yBottom + ' Z" fill="url(#' + opts.area + ')"></path>'
    }
    const tracejado = s.tracejada ? ' stroke-dasharray="5 4"' : ''
    const bolinhas = pts.map((p) =>
      '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.8" fill="#ffffff" stroke="' + s.color + '" stroke-width="2.5"></circle>').join('')
    return area + '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"' + tracejado + '></path>' + bolinhas
  }).join('')

  // Rótulos com anti-colisão: em cada ponto do eixo, o mais alto leva o texto acima e os
  // demais abaixo, empilhados. Sem isso, valores próximos se sobrepõem e viram borrão —
  // defeito que o Elo levou um print do usuário para descobrir.
  let textos = ''
  if (opts.rotulos !== false) {
    for (let i = 0; i < qtd; i++) {
      const anchor = i === 0 ? 'start' : (i === qtd - 1 ? 'end' : 'middle')
      const tx = i === 0 ? xOf(i) + 2 : (i === qtd - 1 ? xOf(i) - 2 : xOf(i))
      const aqui = series.map((s) => ({ y: yOf(s.values[i]), v: s.values[i], color: s.labelColor || s.color })).sort((a, b) => a.y - b.y)
      let topo = -1
      aqui.forEach((c, k) => {
        let ly
        if (k === 0) { ly = Math.max(12, c.y - 11); topo = ly }
        else if (c.y + 16 <= yBottom + 4) { ly = c.y + 16 }
        else { ly = Math.max(12, topo - 14); topo = ly }
        textos += '<text x="' + tx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anchor + '" font-size="11.5" font-weight="800" fill="' + c.color
          + '" paint-order="stroke" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round" font-family="' + FONTE + '">' + esc(fmt(c.v)) + '</text>'
      })
    }
  }

  const baseY = yBottom + 13
  const rodape = '<line x1="' + (mx / 2).toFixed(1) + '" y1="' + baseY.toFixed(1) + '" x2="' + (w - mx / 2).toFixed(1) + '" y2="' + baseY.toFixed(1) + '" stroke="#eceae4" stroke-width="1.5"></line>'
    + labels.map((lb, i) => {
      const x = xOf(i), anchor = i === 0 ? 'start' : (i === qtd - 1 ? 'end' : 'middle')
      return '<circle cx="' + x.toFixed(1) + '" cy="' + baseY.toFixed(1) + '" r="2.5" fill="#c9c6bd"></circle>'
        + '<text x="' + x.toFixed(1) + '" y="' + (baseY + 17).toFixed(1) + '" text-anchor="' + anchor + '" font-size="11.5" font-weight="700" fill="#6b7280" font-family="' + FONTE + '">' + esc(lb) + '</text>'
    }).join('')

  const defs = opts.area
    ? '<defs><linearGradient id="' + opts.area + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="' + (opts.areaColor || '#14CE6B') + '" stop-opacity="0.18"></stop>'
      + '<stop offset="100%" stop-color="' + (opts.areaColor || '#14CE6B') + '" stop-opacity="0"></stop></linearGradient></defs>'
    : ''

  return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;display:block">' + defs + grade + corpo + textos + rodape + '</svg>'
}

/** Barras horizontais rotuladas — para rankings (bairro, forma de pagamento, produto). */
function barras(linhas, opts) {
  opts = opts || {}
  const fmt = opts.fmt || n
  const max = Math.max(...linhas.map((r) => Number(r.value) || 0), 1)
  return linhas.map((r) => {
    const v = Number(r.value) || 0
    const largura = max > 0 && v > 0 ? Math.max(2, (v / max) * 100) : 0
    return '<div style="display:grid;grid-template-columns:' + (opts.colRotulo || '150px') + ' minmax(0,1fr) 90px;gap:14px;align-items:center;padding:3px 0">'
      + '<span style="font-size:13px;font-weight:600;color:#4b5563;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.label) + '</span>'
      + '<div style="height:10px;border-radius:5px;background:#f0f0ee;overflow:hidden">'
      + '<div style="height:100%;width:' + largura.toFixed(1) + '%;background:' + (r.color || '#14CE6B') + ';border-radius:5px"></div></div>'
      + '<span style="font-size:13.5px;font-weight:800;color:#111111;text-align:right">' + esc(fmt(v)) + '</span></div>'
  }).join('')
}

/** Rosca de N fatias (um arco por fatia, offset acumulado). */
function donut(fatias, tamanho, traco) {
  tamanho = tamanho || 150
  traco = traco || 20
  const r = tamanho / 2 - traco / 2, c = tamanho / 2, circ = 2 * Math.PI * r
  const total = fatias.reduce((s, x) => s + (Number(x.value) || 0), 0)
  if (!total) {
    return '<svg width="' + tamanho + '" height="' + tamanho + '" viewBox="0 0 ' + tamanho + ' ' + tamanho + '">'
      + '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="#f0f0ee" stroke-width="' + traco + '"></circle></svg>'
  }
  let offset = 0, arcos = ''
  fatias.forEach((s) => {
    const v = Number(s.value) || 0
    if (!v) return
    const len = (v / total) * circ
    arcos += '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + s.color + '" stroke-width="' + traco
      + '" stroke-dasharray="' + len.toFixed(1) + ' ' + (circ - len).toFixed(1) + '" stroke-dashoffset="' + (-offset).toFixed(1)
      + '" transform="rotate(-90 ' + c + ' ' + c + ')"></circle>'
    offset += len
  })
  return '<svg width="' + tamanho + '" height="' + tamanho + '" viewBox="0 0 ' + tamanho + ' ' + tamanho + '">' + arcos + '</svg>'
}

/** Paleta do shell: acento da marca primeiro, depois neutros que não competem com ele. */
const PALETA = ['#14CE6B', '#111827', '#0AA758', '#6b7280', '#A8E9C6', '#9ca3af']

module.exports = { linha, barras, donut, n, esc, PALETA }
