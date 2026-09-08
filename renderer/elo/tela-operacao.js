// renderer/elo/tela-operacao.js — as telas que não cabem em lista: KDS (cozinha e bar)
// e Atendimento (mesas do salão).
//
// KDS desenhado conforme a tela real do painel (Sabor do Pirão, 07/09): a fila é
// AGRUPADA POR PEDIDO, um cartão por pedido, e cada item do pedido tem o seu botão
// (Iniciar → Pronto). Quem cozinha monta o pedido inteiro, não itens soltos — por isso
// o cartão traz também o botão "Pedido pronto", que tira o pedido da fila de uma vez.
// A observação do cliente ("sem cebola") aparece sempre: é ela que erra o prato quando some.

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

/** Tempo do jeito que o painel mostra: agora / 38min / 1h. */
function tempoCurto(min) {
  const m = Math.max(0, Math.floor(Number(min) || 0))
  if (m < 1) return 'agora'
  if (m < 60) return m + 'min'
  return Math.floor(m / 60) + 'h'
}

// Cozinha e bar são a MESMA tela com cor diferente — é assim no painel, e a cor é o que
// diz de longe, na TV da cozinha, qual fila está na frente.
const DEPTOS = {
  cozinha: { nome: 'COZINHA', cor: '#1E40AF', bg: '#DBEAFE' },
  bar: { nome: 'BAR', cor: '#7C3AED', bg: '#F5F3FF' },
}

/** DELIVERY / RETIRADA / CONSUMO LOCAL / MESA 27 — a etiqueta cinza acima do número. */
function rotuloCanal(p) {
  if (p.mesa) return 'MESA ' + p.mesa
  if (p.tipo === 'entrega') return 'DELIVERY'
  if (p.tipo === 'consumo_local') return 'CONSUMO LOCAL'
  return 'RETIRADA'
}

const AMBAR = 'color:#8a6508;background:#fff9e8'

function itemKds(item, dep) {
  const pronto = item.estado === 'pronto'
  const sabores = (item.sabores || []).map((s) =>
    '<div style="display:flex;gap:5px"><span style="color:' + dep.cor + ';font-weight:800">›</span>'
    + '<span>' + esc((s.grupo ? s.grupo + ': ' : '') + s.nome) + '</span></div>').join('')
  let botao
  if (item.estado === 'pendente') {
    botao = '<button type="button" data-acao="kds:iniciar:' + esc(item.id) + '" style="flex-shrink:0;height:30px;'
      + 'padding:0 12px;border-radius:9px;border:1px solid #e5e7eb;background:#fff;color:#111;font-size:12.5px;'
      + 'font-weight:800;font-family:inherit;cursor:pointer">Iniciar</button>'
  } else if (item.estado === 'preparando') {
    botao = '<button type="button" data-acao="kds:pronto:' + esc(item.id) + '" style="flex-shrink:0;height:30px;'
      + 'padding:0 12px;border-radius:9px;border:none;background:var(--acento);color:#fff;font-size:12.5px;'
      + 'font-weight:800;font-family:inherit;cursor:pointer">✓ Pronto</button>'
  } else {
    botao = '<span style="flex-shrink:0;font-size:11px;font-weight:800;color:var(--acento-texto)">✓ PRONTO</span>'
  }
  return '<div data-item-kds="' + esc(item.id) + '" style="display:flex;align-items:flex-start;gap:10px;'
    + 'padding:10px 0;border-bottom:1px solid #f4f5f7' + (pronto ? ';opacity:.5' : '') + '">'
    + '<div style="width:30px;height:30px;border-radius:8px;flex:0 0 30px;background:' + dep.bg + ';color:' + dep.cor
    + ';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">' + esc(item.qtd) + '×</div>'
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-size:14px;font-weight:700;color:#111;line-height:1.3'
    + (pronto ? ';text-decoration:line-through' : '') + '">' + esc(item.nome) + '</div>'
    + (sabores ? '<div style="margin-top:3px;font-size:12.5px;color:#4b5563;line-height:1.45">' + sabores + '</div>' : '')
    + (item.obs ? '<div style="margin-top:4px;font-size:12px;font-weight:700;' + AMBAR
      + ';border-radius:6px;padding:4px 8px;display:inline-block">✎ ' + esc(item.obs) + '</div>' : '')
    + '</div>' + botao + '</div>'
}

function cartaoKds(p, dep) {
  const itens = p.itens || []
  const todosProntos = itens.length > 0 && itens.every((i) => i.estado === 'pronto')
  const numero = '#' + String(p.numero).padStart(4, '0')
  return '<div data-pedido-kds="' + esc(p.numero) + '" class="ecard" style="padding:0;overflow:hidden;'
    + 'border-top:4px solid ' + (todosProntos ? 'var(--acento)' : dep.cor) + (todosProntos ? ';opacity:.6' : '') + '">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;'
    + 'padding:12px 16px;border-bottom:1px solid #eef0f3">'
    + '<div style="min-width:0">'
    + '<div style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.04em">' + esc(rotuloCanal(p)) + '</div>'
    + '<div style="font-size:22px;font-weight:800;color:' + dep.cor + ';letter-spacing:-.02em">' + esc(numero) + '</div>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:0">'
    + '<div style="font-size:13px;font-weight:700;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px">'
    + esc(p.cliente) + '</div>'
    + '<div style="font-size:11px;color:#9ca3af;font-weight:600">' + esc(tempoCurto(p.esperaMin)) + '</div>'
    + '<button type="button" data-acao="kds:pedido-pronto:' + esc(p.numero) + '" style="font-size:11px;font-weight:800;'
    + 'padding:4px 10px;border:none;border-radius:6px;cursor:pointer;background:var(--acento);color:#fff;'
    + 'font-family:inherit">✓ Pedido pronto</button>'
    + '</div></div>'
    + '<div style="padding:14px 16px">'
    + itens.map((i) => itemKds(i, dep)).join('')
    + (p.obs ? '<div style="margin-top:10px;font-size:12.5px;font-weight:700;' + AMBAR
      + ';border-radius:8px;padding:8px 10px">✎ Obs. do pedido: ' + esc(p.obs) + '</div>' : '')
    + (todosProntos ? '<div style="margin-top:12px;padding:10px;background:var(--acento-suave);border-radius:8px;'
      + 'text-align:center;font-size:12px;font-weight:800;color:var(--acento-texto)">✓ Tudo pronto neste departamento</div>' : '')
    + '</div></div>'
}

function htmlKds(dados, estado) {
  estado = estado || {}
  const dep = DEPTOS[estado.departamento] || DEPTOS.cozinha
  if (!dados) return semDados('da produção')
  const pedidos = dados.pedidos || []

  const cabecalho = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;'
    + 'flex-wrap:wrap;margin-bottom:18px">'
    + '<div><div style="font-size:17px;font-weight:800;color:' + dep.cor + ';letter-spacing:-.01em">'
    + 'Fila de Produção — ' + esc(dep.nome) + '</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:4px">' + pedidos.length
    + (pedidos.length === 1 ? ' pedido' : ' pedidos') + ' · atualiza a cada 5s</div></div>'
    + '<button type="button" data-acao="kds:tv" style="height:32px;padding:0 12px;border-radius:9px;'
    + 'border:1px solid #e5e7eb;background:#fff;color:#111;font-size:12.5px;font-weight:800;font-family:inherit;'
    + 'cursor:pointer;white-space:nowrap">📺 Acesso pela TV</button></div>'

  if (!pedidos.length) {
    return cabecalho + '<div class="ecard" style="padding:60px 20px;text-align:center">'
      + '<div style="font-size:34px;line-height:1;margin-bottom:12px">✨</div>'
      + '<div style="font-size:18px;font-weight:800;color:#111;margin-bottom:4px">Tudo em dia!</div>'
      + '<div style="font-size:14px;color:#9ca3af;font-weight:500">Nenhum item pra preparar no momento.</div></div>'
  }

  return cabecalho
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;'
    + 'align-items:start;animation:eloFadeUp .5s ease both">'
    + pedidos.map((p) => cartaoKds(p, dep)).join('') + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">'
    + 'marcar item como pronto ainda é pelo painel</div>'
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

module.exports = { htmlKds, htmlMesas, tempo, tempoCurto, rotuloCanal, DEPTOS, COR_MESA }
