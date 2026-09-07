// renderer/elo/tela-lista.js — o formato de lista do Elo (KPIs + filtros + busca +
// grade + rodapé), aberto para qualquer módulo.
//
// Existe pelo mesmo motivo do window.eloGrade no Elo: sem um formato único, cada tela
// nova reinventa a própria tabela e o app vira um mosaico de listas diferentes. Aqui a
// tela declara colunas, filtros e ações; o desenho é sempre o mesmo.

const ETIQUETAS = {
  verde:    { bg: '#E7FAF0', c: '#0A7A3E' },
  amarelo:  { bg: '#fff3cc', c: '#8a6508' },
  vermelho: { bg: '#fdeaea', c: '#b42318' },
  cinza:    { bg: '#f0f0ee', c: '#4b5563' },
  azul:     { bg: '#eef4ff', c: '#1d4ed8' },
}

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function idade(ts, agora) {
  if (!ts) return 'nunca atualizado'
  const s = Math.max(0, Math.floor(((agora || Date.now()) - ts) / 1000))
  if (s < 90) return 'agora mesmo'
  const min = Math.floor(s / 60)
  if (min < 60) return 'há ' + min + ' min'
  const h = Math.floor(min / 60)
  if (h < 24) return 'há ' + h + ' h'
  const d = Math.floor(h / 24)
  return 'há ' + d + (d === 1 ? ' dia' : ' dias')
}

function selo(estado) {
  return estado.online
    ? '<span class="echip">atualizado ' + esc(idade(estado.ts)) + '</span>'
    : '<span class="echip offline">sem internet · dado de ' + esc(idade(estado.ts)) + '</span>'
}

function celula(c, alinhaDireita) {
  if (c && typeof c === 'object') {
    const e = ETIQUETAS[c.etiqueta] || ETIQUETAS.cinza
    if (c.etiqueta) {
      return '<span style="font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:999px;background:' + e.bg + ';color:' + e.c + ';white-space:nowrap">' + esc(c.texto) + '</span>'
    }
    return '<span style="font-size:13px;font-weight:' + (c.forte ? 700 : 600) + ';color:' + (c.cor || '#4b5563') + (alinhaDireita ? ';text-align:right;display:block' : '') + '">' + esc(c.texto) + '</span>'
  }
  return '<span style="font-size:13px;font-weight:600;color:#4b5563;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' + (alinhaDireita ? ';text-align:right;display:block' : '') + '">' + esc(c) + '</span>'
}

/** Só a grade (cabeçalho + linhas), sem cartão em volta — para quem já está dentro
 *  de um cartão, como as abas. Sem isto, sai cartão dentro de cartão e a tela ganha
 *  duas bordas concêntricas. */
function apenasGrade(def, linhas) {
  const nCols = def.colunas.length
  const grade = def.grade || def.colunas.map(() => '1fr').join(' ')
  const direita = def.direita || []
  const cabecalho = '<div style="display:grid;grid-template-columns:' + grade + ';font-size:10.5px;font-weight:700;color:#6b7280;'
    + 'text-transform:uppercase;letter-spacing:.05em;background:#f6f6f4;border-bottom:1px solid #e5e7eb">'
    + def.colunas.map((c, i) => '<span style="padding:8px 10px' + (i < nCols - 1 ? ';border-right:1px solid #e5e7eb' : '')
      + (direita.indexOf(i) >= 0 ? ';text-align:right' : '') + '">' + esc(c) + '</span>').join('') + '</div>'
  const corpo = (linhas && linhas.length)
    ? linhas.map((l, i) => '<div data-linha="' + esc(l.chave) + '" data-rownav-idx="' + i + '"'
        + ' style="display:grid;grid-template-columns:' + grade + ';background:' + (i % 2 ? '#fafafa' : '#fff')
        + ';border-bottom:1px solid #ececec">'
        + l.celulas.map((c, ci) => '<div style="min-width:0;padding:7px 10px;display:flex;align-items:center'
          + (direita.indexOf(ci) >= 0 ? ';justify-content:flex-end' : '')
          + (ci < l.celulas.length - 1 ? ';border-right:1px solid #ececec' : '') + '">'
          + celula(c, direita.indexOf(ci) >= 0) + '</div>').join('') + '</div>').join('')
    : '<div class="evazio">Nenhum registro.</div>'
  return '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">' + cabecalho + corpo + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
    + ((linhas && linhas.length) || 0) + (((linhas && linhas.length) || 0) === 1 ? ' registro' : ' registros') + '</div>'
}

function htmlLista(def, linhas, estado) {
  estado = estado || {}
  if (!linhas) {
    return '<div class="ecard"><div class="evazio">Sem dados ainda.<br>'
      + 'Quando o app falar com o painel, esta lista aparece aqui — e fica guardada para as próximas aberturas.</div></div>'
  }

  const kpis = (def.kpis && def.kpis.length)
    ? '<div style="display:grid;grid-template-columns:repeat(' + Math.min(def.kpis.length, 4) + ',minmax(0,1fr));gap:18px;animation:eloFadeUp .5s ease both">'
      + def.kpis.map((k) => '<div class="ecard" style="padding:13px 20px;min-width:0">'
        + '<div style="font-size:11.5px;font-weight:700;color:#6b7280;margin-bottom:6px">' + esc(k.rotulo) + '</div>'
        + '<div style="font-size:22px;font-weight:800;color:' + (k.cor || '#111111') + ';letter-spacing:-.02em;line-height:1">' + esc(k.valor) + '</div>'
        + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:5px">' + esc(k.sub || '') + '</div></div>').join('')
      + '</div>'
    : ''

  const filtros = (def.filtros && def.filtros.length)
    ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">' + def.filtros.map((f) =>
        '<button type="button" data-filtro="' + esc(f.chave) + '" class="echip' + (f.chave === estado.filtro ? ' is-on' : '') + '"'
        + ' style="cursor:pointer;' + (f.chave === estado.filtro
          ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800'
          : 'background:#f0f0ee;color:#4b5563') + '">' + esc(f.rotulo)
        + (f.contador != null ? ' <b style="font-weight:800">' + esc(f.contador) + '</b>' : '') + '</button>').join('')
      + '</div>'
    : ''

  const busca = def.busca
    ? '<div style="display:flex;align-items:center;gap:8px;height:38px;padding:0 14px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;margin-bottom:14px;max-width:420px">'
      + '<span style="color:#9ca3af">🔎</span>'
      + '<input id="listaBusca" placeholder="' + esc(def.busca) + '" value="' + esc(estado.termo || '') + '" autocomplete="off"'
      + ' style="border:none;outline:none;background:none;font-family:inherit;font-size:13px;color:#111;flex:1"></div>'
    : ''

  const acoes = (def.acoes && def.acoes.length)
    ? '<div style="display:flex;gap:8px;align-items:center;margin-left:auto">' + def.acoes.map((a) =>
        '<button type="button" data-acao="' + esc(a.chave) + '" style="height:36px;padding:0 16px;border-radius:10px;font-size:12.5px;font-weight:800;'
        + 'font-family:inherit;cursor:pointer;white-space:nowrap;' + (a.primaria
          ? 'border:none;background:var(--acento);color:#fff'
          : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(a.rotulo) + '</button>').join('') + '</div>'
    : ''

  const nCols = def.colunas.length
  const grade = def.grade || def.colunas.map(() => '1fr').join(' ')
  const cabecalho = '<div style="display:grid;grid-template-columns:' + grade + ';font-size:10.5px;font-weight:700;color:#6b7280;'
    + 'text-transform:uppercase;letter-spacing:.05em;background:#f6f6f4;border-bottom:1px solid #e5e7eb">'
    + def.colunas.map((c, i) => '<span style="padding:8px 10px' + (i < nCols - 1 ? ';border-right:1px solid #e5e7eb' : '')
      + ((def.direita || []).indexOf(i) >= 0 ? ';text-align:right' : '') + '">' + esc(c) + '</span>').join('')
    + '</div>'

  const corpo = linhas.length
    ? linhas.map((l, i) => '<div data-linha="' + esc(l.chave) + '" data-rownav-idx="' + i + '"'
        + ' style="display:grid;grid-template-columns:' + grade + ';background:' + (i % 2 ? '#fafafa' : '#fff')
        + ';border-bottom:1px solid #ececec;cursor:pointer">'
        + l.celulas.map((c, ci) => '<div style="min-width:0;padding:7px 10px;display:flex;align-items:center'
          + ((def.direita || []).indexOf(ci) >= 0 ? ';justify-content:flex-end' : '')
          + (ci < l.celulas.length - 1 ? ';border-right:1px solid #ececec' : '') + '">'
          + celula(c, (def.direita || []).indexOf(ci) >= 0) + '</div>').join('')
        + '</div>').join('')
    : '<div class="evazio">Nenhum registro para este filtro.</div>'

  return '<div style="display:flex;flex-direction:column;gap:18px">'
    + kpis
    + '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .07s both">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111111;margin-bottom:4px">' + esc(def.titulo) + '</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(def.subtitulo || '') + '</div></div>'
    + '<div style="display:flex;gap:8px;align-items:center;margin-left:auto">' + selo(estado) + '</div>'
    + acoes + '</div>'
    + busca + filtros
    + '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">' + cabecalho + corpo + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">'
    + linhas.length + (linhas.length === 1 ? ' registro' : ' registros')
    + (def.rodape ? ' · ' + esc(def.rodape) : '') + '</div>'
    + '</div></div>'
}

module.exports = { htmlLista, apenasGrade, idade, esc, ETIQUETAS }
