// renderer/elo/tela-caixa.js — primeira tela NATIVA do app beta.
//
// Desenha o caixa no visual elo (KPIs + grade), com o dado vindo da ponte:
// servidor quando há rede, cache quando não há. A tela NUNCA calcula o caixa —
// o resumo vem pronto do servidor (mesma conta do painel, lib/financeiro/caixa.ts).
// Se a conta fosse refeita aqui, o caixa do app divergiria do caixa do painel.
//
// Montagem pura (testada em node); só o rodapé do arquivo toca a tela.

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function fmtBRL(v) {
  const n = Number(v)
  return (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtHora(iso) {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    const p = (x) => ('0' + x).slice(-2)
    return p(d.getHours()) + ':' + p(d.getMinutes())
  } catch (e) { return '—' }
}

// "há 2 h" em vez de um carimbo cru: o lojista precisa saber se o número é de agora.
function idadeDoDado(ts, agora) {
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

const TIPOS = { venda: 'Venda', sangria: 'Sangria', suprimento: 'Suprimento', ajuste: 'Ajuste', estorno: 'Estorno' }
function rotuloTipo(t) { return TIPOS[t] || (t ? ('' + t).charAt(0).toUpperCase() + ('' + t).slice(1) : '—') }

const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', cartao: 'Cartão', credito: 'Crédito', debito: 'Débito', a_receber: 'A receber' }
function rotuloForma(f) { return f ? (FORMAS[f] || f) : '—' }

function kpi(rotulo, valor, sub, cor) {
  return '<div class="ecard" style="padding:13px 20px;min-width:0">'
    + '<div style="font-size:11.5px;font-weight:700;color:#6b7280;margin-bottom:6px">' + esc(rotulo) + '</div>'
    + '<div style="font-size:22px;font-weight:800;color:' + (cor || '#111111') + ';letter-spacing:-.02em;line-height:1">R$ ' + valor + '</div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:5px">' + esc(sub || '') + '</div></div>'
}

function htmlDoCaixa(dados, estado) {
  estado = estado || {}
  const selo = estado.online
    ? '<span class="echip">atualizado ' + esc(idadeDoDado(estado.ts, Date.now())) + '</span>'
    : '<span class="echip offline">sem internet · dado de ' + esc(idadeDoDado(estado.ts, Date.now())) + '</span>'

  if (!dados) {
    return '<div class="ecard"><div class="evazio">Sem dados do caixa ainda.<br>'
      + 'Assim que o app conseguir falar com o painel, o caixa aparece aqui — e fica guardado para as próximas aberturas.</div></div>'
  }

  if (!dados.aberto) {
    return '<div style="display:flex;flex-direction:column;gap:18px">'
      + '<div style="display:flex;justify-content:flex-end">' + selo + '</div>'
      + '<div class="ecard"><div class="evazio"><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:6px">Caixa fechado</div>'
      + 'Nenhum caixa aberto agora. Abrir e fechar o caixa ainda é pelo painel.</div></div></div>'
  }

  const r = dados.resumo || {}
  const kpis = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;animation:eloFadeUp .5s ease both">'
    + kpi('Esperado em dinheiro', fmtBRL(dados.esperadoDinheiro), 'fundo de R$ ' + fmtBRL(dados.aberto.fundoInicial))
    + kpi('Vendas em dinheiro', fmtBRL(r.vendaDinheiro), 'na gaveta')
    + kpi('Pix', fmtBRL(r.vendaPix), 'no turno')
    + kpi('Cartão', fmtBRL(r.vendaCartao), 'crédito + débito')
    + '</div>'

  const linhas = (dados.movimentacoes || []).map((m) => {
    const cor = m.estornada ? '#9ca3af' : (m.tipo === 'sangria' ? '#b42318' : '#111111')
    const risco = m.estornada ? 'text-decoration:line-through;' : ''
    return '<div style="display:grid;grid-template-columns:70px 120px 130px 1fr 130px;background:#fff;border-bottom:1px solid #ececec">'
      + '<div style="padding:7px 10px;font-size:13px;color:#4b5563;border-right:1px solid #ececec">' + esc(fmtHora(m.criadoEm)) + '</div>'
      + '<div style="padding:7px 10px;font-size:13px;font-weight:600;color:' + cor + ';border-right:1px solid #ececec">' + esc(rotuloTipo(m.tipo)) + '</div>'
      + '<div style="padding:7px 10px;font-size:13px;color:#4b5563;border-right:1px solid #ececec">' + esc(rotuloForma(m.forma)) + '</div>'
      + '<div style="padding:7px 10px;font-size:13px;color:#4b5563;border-right:1px solid #ececec;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
      + esc(m.descricao || '') + (m.estornada ? ' <span style="font-size:11px;font-weight:700;color:#b42318">estornada</span>' : '') + '</div>'
      + '<div style="padding:7px 10px;font-size:13px;font-weight:700;color:' + cor + ';text-align:right;' + risco + '">R$ ' + fmtBRL(m.valor) + '</div>'
      + '</div>'
  }).join('')

  const cabecalho = '<div style="display:grid;grid-template-columns:70px 120px 130px 1fr 130px;font-size:10.5px;font-weight:700;color:#6b7280;'
    + 'text-transform:uppercase;letter-spacing:.05em;background:#f6f6f4;border-bottom:1px solid #e5e7eb">'
    + ['Hora', 'Tipo', 'Forma', 'Descrição', 'Valor'].map((c, i, a) =>
        '<span style="padding:8px 10px' + (i < a.length - 1 ? ';border-right:1px solid #e5e7eb' : '') + (i === a.length - 1 ? ';text-align:right' : '') + '">' + c + '</span>').join('')
    + '</div>'

  const corpo = linhas || '<div class="evazio">Nenhuma movimentação neste caixa ainda.</div>'

  return '<div style="display:flex;flex-direction:column;gap:18px">'
    + kpis
    + '<div class="ecard" style="animation:eloFadeUp .5s ease .07s both">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111111;margin-bottom:4px">Movimentações do caixa</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">aberto por ' + esc(dados.aberto.abertoPor || '—')
    + ' às ' + esc(fmtHora(dados.aberto.abertoEm)) + '</div></div>'
    + '<div style="display:flex;gap:8px;align-items:center;margin-left:auto">' + selo + '</div></div>'
    + '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">' + cabecalho + corpo + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">'
    + (dados.movimentacoes || []).length + ' movimentações · sangria e fechamento ainda são pelo painel</div>'
    + '</div></div>'
}

module.exports = { htmlDoCaixa, fmtBRL, fmtHora, idadeDoDado, rotuloTipo, rotuloForma, esc }
