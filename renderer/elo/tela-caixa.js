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

// Os nomes que o banco usa de verdade (conferido nas lojas abertas 07/09): dinheiro,
// pix e cartao_entrega. Não há crédito/débito separado — é cartão na maquininha.
const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', cartao_entrega: 'Cartão na entrega',
  cartao: 'Cartão', credito: 'Crédito', debito: 'Débito', a_receber: 'A receber' }
function rotuloForma(f) { return f ? (FORMAS[f] || f) : '—' }

function kpi(rotulo, valor, sub, cor) {
  return '<div class="ecard" style="padding:13px 20px;min-width:0">'
    + '<div style="font-size:11.5px;font-weight:700;color:#6b7280;margin-bottom:6px">' + esc(rotulo) + '</div>'
    + '<div style="font-size:22px;font-weight:800;color:' + (cor || '#111111') + ';letter-spacing:-.02em;line-height:1">R$ ' + valor + '</div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:5px">' + esc(sub || '') + '</div></div>'
}

const ABAS = [{ chave: 'atual', rotulo: 'Caixa atual' }, { chave: 'historico', rotulo: 'Histórico' }]

function barra(itens, atual, attr) {
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">' + itens.map((i) =>
    '<button type="button" ' + attr + '="' + esc(i.chave) + '" class="echip' + (i.chave === atual ? ' is-on' : '') + '"'
    + ' style="cursor:pointer;height:32px;' + (i.chave === atual
      ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800'
      : 'background:#f0f0ee;color:#4b5563') + '">' + esc(i.rotulo)
    + (i.contador != null ? ' <b>' + esc(i.contador) + '</b>' : '') + '</button>').join('') + '</div>'
}

function cartaoBloco(titulo, sub, conteudo) {
  return '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .05s both">'
    + '<div style="margin-bottom:18px"><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">' + esc(titulo) + '</div>'
    + (sub ? '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(sub) + '</div>' : '') + '</div>' + conteudo + '</div>'
}

function grade(colunas, linhas, gradeCss, direita) {
  const L = require('./tela-lista')
  return L.apenasGrade({ colunas, grade: gradeCss, direita: direita || [] }, linhas)
}

/** Contas de mesa abertas — o que falta fechar antes de o caixa fechar. */
function subabaMesas(dados) {
  const mesas = dados.mesas || []
  const total = mesas.reduce((s, m) => s + (Number(m.consumo) || 0), 0)
  return cartaoBloco('Contas de mesa em aberto', mesas.length + ' conta(s) · ' + fmtBRL(total) + ' a receber',
    grade(['Mesa', 'Garçom', 'Pedidos', 'Aberta há', 'Consumo'],
      mesas.map((m) => ({ chave: m.mesa, celulas: [
        { texto: 'Mesa ' + m.mesa, forte: true, cor: '#111' }, m.garcom || '—', String(m.pedidos || 0),
        { texto: tempoLongo(m.abertaHa), cor: m.abertaHa > 90 ? '#b42318' : '#4b5563' },
        { texto: 'R$ ' + fmtBRL(m.consumo), forte: true, cor: '#111' },
      ] })), '120px 1fr 110px 140px 150px', [2, 3, 4])
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">fechar conta de mesa ainda é pelo painel</div>')
}

/** Entregas já entregues cujo dinheiro ninguém confirmou — se o caixa fechar assim,
 *  a venda fica fora do caixa (a mesma checagem que o painel faz ao fechar). */
function subabaDelivery(dados) {
  const entregas = dados.entregas || []
  const total = entregas.reduce((s, e) => s + (Number(e.valor) || 0), 0)
  return cartaoBloco('Entregas a confirmar', entregas.length + ' entrega(s) · ' + fmtBRL(total) + ' na rua',
    grade(['Pedido', 'Cliente', 'Entregador', 'Forma', 'Saiu há', 'Valor'],
      entregas.map((e) => ({ chave: e.pedido, celulas: [
        { texto: '#' + e.pedido, forte: true, cor: '#111' }, e.cliente, e.entregador || '—',
        rotuloForma(e.forma), { texto: tempoLongo(e.saiuHa), cor: e.saiuHa > 40 ? '#b42318' : '#4b5563' },
        { texto: 'R$ ' + fmtBRL(e.valor), forte: true, cor: '#111' },
      ] })), '100px 1fr 150px 160px 120px 140px', [4, 5])
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
    + 'confirmar o recebimento ainda é pelo painel — enquanto não confirma, o dinheiro não entra no caixa</div>')
}

function tempoLongo(min) {
  const m = Math.max(0, Math.round(Number(min) || 0))
  if (m < 60) return m + ' min'
  const h = Math.floor(m / 60), r = m % 60
  return r ? h + ' h ' + String(r).padStart(2, '0') : h + ' h'
}

function abaHistorico(dados) {
  const hist = dados.historico || []
  return cartaoBloco('Turnos fechados', 'conferência de cada fechamento',
    grade(['Aberto', 'Fechado', 'Operador', 'Vendas', 'Diferença'],
      hist.map((t) => ({ chave: t.id, celulas: [t.aberto, t.fechado, t.operador,
        { texto: 'R$ ' + fmtBRL(t.vendas), forte: true, cor: '#111' },
        { texto: (t.diferenca > 0 ? '+ ' : t.diferenca < 0 ? '- ' : '') + 'R$ ' + fmtBRL(Math.abs(t.diferenca)),
          forte: true, cor: t.diferenca < 0 ? '#b42318' : (t.diferenca > 0 ? '#8a6508' : '#0A7A3E') },
      ] })), '150px 150px 1fr 150px 150px', [3, 4]))
}

function htmlDoCaixa(dados, estado) {
  estado = estado || {}
  if (!dados) {
    return '<div class="ecard"><div class="evazio">Sem dados do caixa ainda.<br>'
      + 'Assim que o app conseguir falar com o painel, o caixa aparece aqui — e fica guardado para as próximas aberturas.</div></div>'
  }

  const aba = estado.aba === 'historico' ? 'historico' : 'atual'
  const barraAbas = barra(ABAS, aba, 'data-aba')

  if (aba === 'historico') return '<div>' + barraAbas + abaHistorico(dados) + '</div>'

  const selo = estado.online
    ? '<span class="echip">atualizado ' + esc(idadeDoDado(estado.ts, Date.now())) + '</span>'
    : '<span class="echip offline">sem internet · dado de ' + esc(idadeDoDado(estado.ts, Date.now())) + '</span>'

  if (!dados.aberto) {
    return '<div>' + barraAbas
      + '<div style="display:flex;justify-content:flex-end;margin-bottom:14px">' + selo + '</div>'
      + '<div class="ecard"><div class="evazio"><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:6px">Caixa fechado</div>'
      + 'Nenhum caixa aberto agora. Abra o caixa para fechar contas de mesa e confirmar recebimentos de entrega.<br>'
      + 'Abrir e fechar o caixa ainda é pelo painel.</div></div></div>'
  }

  // Subabas: Mesas só existe em loja que tem mesa (o painel faz o mesmo).
  const subabas = []
  if (dados.temMesas !== false) subabas.push({ chave: 'mesas', rotulo: 'Mesas', contador: (dados.mesas || []).length })
  subabas.push({ chave: 'delivery', rotulo: 'Delivery', contador: (dados.entregas || []).length })
  subabas.push({ chave: 'movimentacoes', rotulo: 'Movimentações', contador: (dados.movimentacoes || []).length })
  const subaba = subabas.some((x) => x.chave === estado.subaba) ? estado.subaba : subabas[0].chave

  const r = dados.resumo || {}
  const naRua = (dados.entregas || []).reduce((s, e) => s + (Number(e.valor) || 0), 0)
  const kpis = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;animation:eloFadeUp .5s ease both;margin-bottom:18px">'
    + kpi('Esperado em dinheiro', fmtBRL(dados.esperadoDinheiro), 'fundo de R$ ' + fmtBRL(dados.aberto.fundoInicial))
    + kpi('Vendas em dinheiro', fmtBRL(r.vendaDinheiro), 'na gaveta')
    + kpi('Pix', fmtBRL(r.vendaPix), 'no turno')
    + kpi('Cartão', fmtBRL(r.vendaCartao), 'no turno')
    + '</div>'

  // "Na rua" é alerta, não indicador: o dinheiro que o entregador tem na mão ainda não
  // é do caixa, e fechar sem confirmar deixa a venda fora do caixa e do financeiro.
  const alertaRua = naRua > 0
    ? '<div style="display:flex;align-items:center;gap:10px;background:#fff9e8;border:1px solid #eed571;border-radius:12px;'
      + 'padding:12px 16px;margin-bottom:18px">'
      + '<span style="font-size:16px">⚠</span>'
      + '<div><div style="font-size:13px;font-weight:800;color:#8a6508">R$ ' + fmtBRL(naRua) + ' na rua, a confirmar</div>'
      + '<div style="font-size:12px;color:#8a6508;font-weight:600">' + (dados.entregas || []).length
      + ' entrega(s) já entregue(s) sem o recebimento confirmado — fechar o caixa assim deixa essa venda de fora</div></div></div>'
    : ''

  let corpo
  if (subaba === 'mesas') corpo = subabaMesas(dados)
  else if (subaba === 'delivery') corpo = subabaDelivery(dados)
  else corpo = movimentacoesHtml(dados, selo)

  return '<div>' + barraAbas + kpis + alertaRua + barra(subabas, subaba, 'data-subaba') + corpo + '</div>'
}

/** A lista de movimentações do turno (a aba que já existia). */
function movimentacoesHtml(dados, selo) {
  const linhas = (dados.movimentacoes || []).map((m) => {
    const cor = m.estornada ? '#9ca3af' : (m.tipo === 'sangria' ? '#b42318' : '#111111')
    const risco = m.estornada ? 'text-decoration:line-through;' : ''
    return '<div style="display:grid;grid-template-columns:70px 120px 150px 1fr 130px;background:#fff;border-bottom:1px solid #ececec">'
      + '<div style="padding:7px 10px;font-size:13px;color:#4b5563;border-right:1px solid #ececec">' + esc(fmtHora(m.criadoEm)) + '</div>'
      + '<div style="padding:7px 10px;font-size:13px;font-weight:600;color:' + cor + ';border-right:1px solid #ececec">' + esc(rotuloTipo(m.tipo)) + '</div>'
      + '<div style="padding:7px 10px;font-size:13px;color:#4b5563;border-right:1px solid #ececec">' + esc(rotuloForma(m.forma)) + '</div>'
      + '<div style="padding:7px 10px;font-size:13px;color:#4b5563;border-right:1px solid #ececec;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
      + esc(m.descricao || '') + (m.estornada ? ' <span style="font-size:11px;font-weight:700;color:#b42318">estornada</span>' : '') + '</div>'
      + '<div style="padding:7px 10px;font-size:13px;font-weight:700;color:' + cor + ';text-align:right;' + risco + '">R$ ' + fmtBRL(m.valor) + '</div>'
      + '</div>'
  }).join('')

  const cabecalho = '<div style="display:grid;grid-template-columns:70px 120px 150px 1fr 130px;font-size:10.5px;font-weight:700;color:#6b7280;'
    + 'text-transform:uppercase;letter-spacing:.05em;background:#f6f6f4;border-bottom:1px solid #e5e7eb">'
    + ['Hora', 'Tipo', 'Forma', 'Descrição', 'Valor'].map((c, i, a) =>
        '<span style="padding:8px 10px' + (i < a.length - 1 ? ';border-right:1px solid #e5e7eb' : '') + (i === a.length - 1 ? ';text-align:right' : '') + '">' + c + '</span>').join('')
    + '</div>'

  return '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .07s both">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111111;margin-bottom:4px">Movimentações do caixa</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">aberto por ' + esc(dados.aberto.abertoPor || '—')
    + ' às ' + esc(fmtHora(dados.aberto.abertoEm)) + '</div></div>'
    + '<div style="display:flex;gap:8px;align-items:center;margin-left:auto">' + selo + '</div></div>'
    + '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">' + cabecalho
    + (linhas || '<div class="evazio">Nenhuma movimentação neste caixa ainda.</div>') + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">'
    + (dados.movimentacoes || []).length + ' movimentações · sangria e fechamento ainda são pelo painel</div></div>'
}

module.exports = { htmlDoCaixa, fmtBRL, fmtHora, idadeDoDado, rotuloTipo, rotuloForma, tempoLongo, esc }
