// renderer/elo/tela-despacho.js — Despacho de entregas.
//
// Desenhada olhando a tela real do painel (Du Pellegrini, 07/09): o despacho não é uma
// lista de entregas — é uma fila AGRUPADA POR BAIRRO, porque quem despacha junta os
// pedidos do mesmo lado da cidade num entregador só. Daí o botão "despachar N deste
// bairro" e a seleção por caixa.
//
// A informação que não pode faltar em cada linha é se o pedido está PAGO ou se o
// entregador vai receber na entrega — é o que define quanto dinheiro ele leva e quanto
// tem que voltar.

const L = require('./tela-lista')
const esc = L.esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', cartao: 'Cartão', cartao_entrega: 'Cartão', credito: 'Crédito', debito: 'Débito' }
const LIMITE_ESPERA = 40   // acima disso o pedido está esperando demais para sair

function kpi(rotulo, valor, sub, cor) {
  return '<div class="ecard" style="padding:13px 20px;min-width:0">'
    + '<div style="font-size:11.5px;font-weight:700;color:#6b7280;margin-bottom:6px">' + esc(rotulo) + '</div>'
    + '<div style="font-size:22px;font-weight:800;color:' + (cor || '#111') + ';letter-spacing:-.02em;line-height:1">' + esc(valor) + '</div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:5px">' + esc(sub) + '</div></div>'
}
function chip(attr, chave, rotulo, ligado) {
  return '<button type="button" ' + attr + '="' + esc(chave) + '" class="echip' + (ligado ? ' is-on' : '') + '"'
    + ' style="cursor:pointer;height:32px;' + (ligado
      ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800'
      : 'background:#f0f0ee;color:#4b5563') + '">' + esc(rotulo) + '</button>'
}
function botao(acao, rotulo, primaria, pequeno) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:' + (pequeno ? 30 : 36) + 'px;padding:0 '
    + (pequeno ? 12 : 16) + 'px;border-radius:' + (pequeno ? 9 : 10) + 'px;font-size:12.5px;font-weight:800;font-family:inherit;'
    + 'cursor:pointer;white-space:nowrap;' + (primaria
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}

/** Etiqueta de pagamento: quem despacha precisa saber se o entregador vai cobrar. */
function selo(p) {
  const forma = FORMAS[p.forma] || '—'
  if (p.pago) {
    return '<div style="min-width:0"><div style="font-size:12px;color:#6b7280;font-weight:600">' + esc(forma) + '</div>'
      + '<span style="font-size:10.5px;font-weight:800;color:#0A7A3E;background:#E7FAF0;padding:2px 7px;border-radius:6px">PAGO</span></div>'
  }
  return '<div style="min-width:0"><div style="font-size:12px;color:#6b7280;font-weight:600">' + esc(forma) + '</div>'
    + '<span style="font-size:10.5px;font-weight:800;color:#8a6508;background:#fff3cc;padding:2px 7px;border-radius:6px">A RECEBER '
    + esc(brl(p.valor)) + '</span></div>'
}

function linhaPedido(p, entregadores) {
  const atrasado = p.esperaMin > LIMITE_ESPERA
  const opcoes = ['<option value="">— entregador —</option>']
    .concat((entregadores || []).map((e) => '<option value="' + esc(e) + '">' + esc(e) + '</option>')).join('')
  return '<div data-pedido-linha="' + esc(p.pedido) + '" style="display:grid;'
    + 'grid-template-columns:34px 16px 70px 1fr 90px 190px 120px 190px 120px;align-items:center;gap:10px;'
    + 'padding:10px 14px;border-bottom:1px solid #f0f0ee;background:#fff">'
    + '<input type="checkbox" data-sel="' + esc(p.pedido) + '" style="width:16px;height:16px;accent-color:var(--acento);cursor:pointer">'
    + '<span style="width:9px;height:9px;border-radius:50%;background:' + (atrasado ? '#b42318' : '#c9c6bd') + ';display:inline-block"></span>'
    + '<span style="font-size:13px;font-weight:800;color:#111">#' + esc(p.pedido) + '</span>'
    + '<span style="font-size:13px;font-weight:600;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.cliente) + '</span>'
    + '<span style="font-size:12.5px;font-weight:800;color:' + (atrasado ? '#b42318' : '#6b7280') + '">' + esc(p.esperaMin) + ' min</span>'
    + selo(p)
    + '<span style="font-size:13.5px;font-weight:800;color:#111;text-align:right">' + esc(brl(p.valor)) + '</span>'
    + '<select data-entregador-de="' + esc(p.pedido) + '" style="height:34px;border:1px solid #e5e7eb;border-radius:9px;'
    + 'background:#fff;font-family:inherit;font-size:12.5px;color:#111;padding:0 8px;cursor:pointer">' + opcoes + '</select>'
    + botao('despachar:' + p.pedido, 'Despachar', true, true)
    + '</div>'
}

function htmlDespacho(dados, estado) {
  estado = estado || {}
  if (!dados) {
    return '<div class="ecard"><div class="evazio">Sem dados do despacho ainda.<br>'
      + 'Quando o app falar com o painel, a fila de entregas aparece aqui.</div></div>'
  }
  const visao = estado.visao === 'lista' ? 'lista' : 'bairro'
  const prontos = dados.prontos || []
  const transito = dados.emTransito || []
  const entregadores = dados.entregadores || []
  const totalPronto = prontos.reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const aReceberNaRua = transito.reduce((s, t) => s + (Number(t.dinheiroAReceber) || 0), 0)

  const kpis = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-bottom:18px;animation:eloFadeUp .5s ease both">'
    + kpi('Pronto para entrega', String(prontos.length), brl(totalPronto) + ' na fila')
    + kpi('Na rua', String(transito.reduce((s, t) => s + (Number(t.entregas) || 0), 0)), transito.length + ' entregador(es)', '#1d4ed8')
    + kpi('Dinheiro a receber', brl(aReceberNaRua), 'com os entregadores', aReceberNaRua > 0 ? '#8a6508' : '#111')
    + kpi('Esperando demais', String(prontos.filter((p) => p.esperaMin > LIMITE_ESPERA).length), 'acima de ' + LIMITE_ESPERA + ' min', '#b42318')
    + '</div>'

  // ── fila: por bairro (padrão) ou lista corrida ──
  let fila
  if (!prontos.length) {
    fila = '<div class="evazio">Nenhum pedido pronto para entrega agora.</div>'
  } else if (visao === 'bairro') {
    const porBairro = {}
    prontos.forEach((p) => { (porBairro[p.bairro || 'Sem bairro'] = porBairro[p.bairro || 'Sem bairro'] || []).push(p) })
    fila = Object.keys(porBairro).sort().map((bairro) => {
      const lista = porBairro[bairro]
      const total = lista.reduce((s, p) => s + (Number(p.valor) || 0), 0)
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f6f6f4;border-bottom:1px solid #ebebe8">'
        + '<input type="checkbox" data-sel-bairro="' + esc(bairro) + '" style="width:16px;height:16px;accent-color:var(--acento);cursor:pointer">'
        + '<span style="font-size:13px;font-weight:800;color:#111">' + esc(bairro) + '</span>'
        + '<span style="font-size:12px;color:#6b7280;font-weight:600">' + lista.length
        + (lista.length === 1 ? ' pedido' : ' pedidos') + ' · ' + esc(brl(total)) + '</span>'
        + (lista.length > 1
          ? '<span style="margin-left:auto">' + botao('despachar-bairro:' + bairro, 'Despachar ' + lista.length + ' deste bairro', true, true) + '</span>'
          : '')
        + '</div>'
        + lista.map((p) => linhaPedido(p, entregadores)).join('')
    }).join('')
  } else {
    fila = prontos.map((p) => linhaPedido(p, entregadores)).join('')
  }

  // ── em trânsito: um cartão por entregador, com o acerto ──
  const cartoesRua = transito.length
    ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">'
      + transito.map((t) => '<div style="border:1px solid #ebebe8;border-radius:14px;padding:16px;background:#fff">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">'
        + '<span style="font-size:14px;font-weight:800;color:#111">🛵 ' + esc(t.entregador) + '</span>'
        + '<span style="font-size:11.5px;color:#9ca3af;font-weight:700">' + esc(t.entregas) + ' entrega(s)</span></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;color:#6b7280;padding:3px 0">'
        + '<span>Dinheiro a receber</span><span style="color:#111;font-weight:800">' + esc(brl(t.dinheiroAReceber)) + '</span></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;color:#6b7280;padding:3px 0">'
        + '<span>Esperado de volta</span><span style="color:var(--acento-texto);font-weight:800">' + esc(brl(t.esperadoDeVolta)) + '</span></div>'
        + '<div style="margin-top:12px">' + botao('rota:fechar:' + (t.rotaId || t.entregador), '🧾 Fechar rota / acerto', false) + '</div>'
        + '</div>').join('') + '</div>'
    : '<div class="evazio">Nada aqui no momento — ninguém na rua.</div>'

  return '<div style="display:flex;flex-direction:column;gap:18px">'
    + kpis
    + '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .05s both">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">Pronto para entrega ('
    + prontos.length + ')</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">pedidos na loja, por bairro — atualiza sozinho</div></div>'
    + '<div style="display:flex;gap:6px;align-items:center;margin-left:auto">'
    + chip('data-visao', 'bairro', 'Por bairro', visao === 'bairro')
    + chip('data-visao', 'lista', 'Lista', visao === 'lista')
    + botao('despachar-rota', '🛵 Despachar em rota', true)
    + '</div></div>'
    + '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">' + fila + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
    + 'despachar e confirmar entrega ainda são pelo painel</div></div>'
    + '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .09s both">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">Em trânsito ('
    + transito.reduce((s, t) => s + (Number(t.entregas) || 0), 0) + ')</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">na rua com o entregador</div></div>'
    + '<span style="margin-left:auto">' + botao('acerto-entregador', '🧾 Acerto entregador', false) + '</span></div>'
    + cartoesRua + '</div>'
    + '</div>'
}

module.exports = { htmlDespacho, brl, LIMITE_ESPERA }
