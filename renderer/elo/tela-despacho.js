// renderer/elo/tela-despacho.js — Despacho: entregas e ROTAS.
//
// A rota, no Pediu, é um mini-caixa do entregador (tabela `rotas`: fundo_troco,
// dinheiro_esperado, dinheiro_contado, diferenca): ele sai com troco, entrega, e no
// fim há um acerto. Uma lista de entregas sozinha não dá conta disso — por isso a
// tela tem duas visões.

const L = require('./tela-lista')
const esc = L.esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', cartao_entrega: 'Cartão na entrega', a_receber: 'A receber' }
const ETIQ = { 'Aguardando': 'cinza', 'Em rota': 'azul', 'Entregue': 'verde', 'aberta': 'amarelo', 'fechada': 'verde' }
const et = (t) => ({ texto: t, etiqueta: ETIQ[t] || 'cinza' })

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
function cartao(titulo, sub, conteudo, acao) {
  return '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .05s both">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">' + esc(titulo) + '</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(sub) + '</div></div>'
    + (acao || '') + '</div>' + conteudo + '</div>'
}

function htmlDespacho(dados, estado) {
  estado = estado || {}
  if (!dados) {
    return '<div class="ecard"><div class="evazio">Sem dados do despacho ainda.<br>'
      + 'Quando o app falar com o painel, as entregas e as rotas aparecem aqui.</div></div>'
  }
  const visao = estado.visao === 'rotas' ? 'rotas' : 'entregas'
  const c = dados.contadores || {}
  const rotas = dados.rotas || []
  const naRua = rotas.filter((r) => r.status === 'aberta').reduce((s, r) => s + (Number(r.dinheiroEsperado) || 0), 0)

  const kpis = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-bottom:18px;animation:eloFadeUp .5s ease both">'
    + kpi('Aguardando', String(c.aguardando || 0), 'para despachar')
    + kpi('Em rota', String(c.rota || 0), 'na rua', '#1d4ed8')
    + kpi('Entregues hoje', String(c.entregue || 0), 'concluídas', '#0A7A3E')
    + kpi('Dinheiro em rota', brl(naRua), 'com os entregadores', naRua > 0 ? '#8a6508' : '#111')
    + '</div>'

  const barra = '<div style="display:flex;gap:6px;margin-bottom:18px">'
    + chip('data-visao', 'entregas', 'Entregas', visao === 'entregas')
    + chip('data-visao', 'rotas', 'Rotas', visao === 'rotas') + '</div>'

  if (visao === 'rotas') {
    const corpo = rotas.length
      ? L.apenasGrade({
          colunas: ['Entregador', 'Saiu às', 'Entregas', 'Troco', 'Dinheiro esperado', 'Contado', 'Situação'],
          grade: '1fr 110px 110px 120px 160px 150px 130px', direita: [2, 3, 4, 5],
        }, rotas.map((r) => ({
          chave: r.id,
          celulas: [
            { texto: r.entregador, forte: true, cor: '#111' }, r.saiu || '—', String(r.entregas || 0),
            brl(r.fundoTroco), { texto: brl(r.dinheiroEsperado), forte: true, cor: '#111' },
            r.status === 'fechada'
              ? { texto: brl(r.dinheiroContado) + (r.diferenca ? '  (' + (r.diferenca > 0 ? '+' : '') + brl(r.diferenca).replace('R$ ', '') + ')' : ''),
                  forte: true, cor: r.diferenca < 0 ? '#b42318' : (r.diferenca > 0 ? '#8a6508' : '#0A7A3E') }
              : { texto: '—', cor: '#9ca3af' },
            et(r.status === 'fechada' ? 'fechada' : 'aberta'),
          ],
        })))
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:14px">'
        + rotas.filter((r) => r.status !== 'fechada').map((r) =>
            '<button type="button" data-acao="rota:fechar:' + esc(r.id) + '" style="height:34px;padding:0 14px;border:1px solid #e5e7eb;'
            + 'border-radius:10px;background:#fff;color:#111;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">'
            + '🧾 Fechar rota de ' + esc(r.entregador) + '</button>').join('')
        + '</div>'
        + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
        + 'o acerto (conferir o dinheiro do entregador) ainda é pelo painel</div>'
      : '<div class="evazio">Nenhuma rota aberta hoje.<br>'
        + 'A rota agrupa entregas de um mesmo entregador e controla o dinheiro que ele leva e traz.</div>'
    return '<div>' + kpis + barra + cartao('Rotas do dia', rotas.length + ' rota(s)', corpo) + '</div>'
  }

  const itens = dados.itens || []
  const corpoEntregas = L.apenasGrade({
    colunas: ['Pedido', 'Cliente', 'Bairro', 'Entregador', 'Forma', 'Situação', 'Saiu às'],
    grade: '100px 1fr 150px 140px 150px 130px 100px',
  }, itens.map((e) => ({
    chave: e.pedido,
    celulas: [{ texto: '#' + e.pedido, forte: true, cor: '#111' }, e.cliente, e.bairro, e.entregador || '—',
      FORMAS[e.forma] || '—', et(e.situacao), e.saiu || '—'],
  })))

  const acao = '<div style="display:flex;gap:8px;align-items:center;margin-left:auto">'
    + '<button type="button" data-acao="despachar-lote" style="height:36px;padding:0 16px;border:none;border-radius:10px;'
    + 'background:var(--acento);color:#fff;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer">'
    + '🛵 Despachar em rota (' + (c.aguardando || 0) + ' aguardando)</button></div>'

  return '<div>' + kpis + barra
    + cartao('Entregas do turno', 'quem está na rua e o que falta sair', corpoEntregas
      + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
      + 'despachar e confirmar entrega ainda são pelo painel</div>', acao)
    + '</div>'
}

module.exports = { htmlDespacho, brl }
