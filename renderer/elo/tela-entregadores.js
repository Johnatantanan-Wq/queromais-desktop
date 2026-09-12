// renderer/elo/tela-entregadores.js — as TRÊS abas de Entregadores, como no painel
// (app/admin/motoboys/EntregadoresTabs.tsx): Entregas, Fechamentos e Equipe.
//
// Até aqui o app tinha só uma lista de quem está na rua — o equivalente à aba Equipe.
// O que o dono usa todo dia é a primeira: o relatório de entregas virou a PRESTAÇÃO DE
// CONTAS do entregador (painel, 08 e 09/09/2026), e é por ela que se fecha o período.
//
// Duas regras mandam nesta tela, e nenhuma é nova:
//
//   1) A modalidade é a REAL, não a combinada no checkout. Quem conclui a entrega diz
//      como o cliente pagou de fato, e divergem toda hora ("ia pagar no crédito, pagou
//      no PIX"). É a mesma fonte do Financeiro e do Portal do Contador.
//
//   2) O TROCO sai do caixa e volta na mão do entregador: pedido de R$ 50 com troco
//      para R$ 100 — ele leva R$ 50, devolve ao cliente e VOLTA COM A NOTA DE R$ 100.
//      Por isso o que ele tem a prestar numa entrega em dinheiro é a nota inteira
//      (total + troco), não o valor do pedido.
//
// Tudo é leitura: fechar período e ajustar entrega continuam no painel — são atos que
// mexem em repasse, e fechamento sobreposto paga duas vezes.

const L = require('./tela-lista')
const esc = L.esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
/** Zero aparece como traço: coluna cheia de "R$ 0,00" esconde o que tem valor. */
function brl0(v) { return Number(v) ? brl(v) : '—' }
const arred = (v) => Math.round((Number(v) || 0) * 100) / 100
const aviso = (t) => '<div class="ecard"><div class="evazio">' + esc(t) + '</div></div>'
const dataBr = (d) => (d ? ('' + d).slice(0, 10).split('-').reverse().join('/') : '—')

const ABAS = [
  { chave: 'entregas', rotulo: 'Entregas' },
  { chave: 'fechamentos', rotulo: 'Fechamentos' },
  { chave: 'equipe', rotulo: 'Equipe' },
]

const PERIODOS = [
  { chave: 'hoje', rotulo: 'Hoje' }, { chave: 'ontem', rotulo: 'Ontem' },
  { chave: '7dias', rotulo: '7 dias' }, { chave: 'mes', rotulo: 'Este mês' },
]

// ── a regra da prestação de contas ──────────────────────────────────────────
const ZERO = {
  entregas: 0, vendas: 0, produtos: 0, taxas: 0, taxasEmRota: 0,
  dinheiro: 0, pix: 0, credito: 0, debito: 0, cartao: 0,
  jaPago: 0, emRota: 0, emRotaValor: 0, troco: 0, especie: 0, aPrestar: 0,
}

/**
 * O resumo de um conjunto de entregas — porte de `resumoPrestacao`
 * (lib/financeiro/entregadores.ts). Três coisas que parecem detalhe e não são:
 *
 *  - **entrega em rota não vira repasse**: a taxa dela fica em `taxasEmRota`, porque é
 *    isso que o fechamento paga. Somar o que ainda está na rua faria a tela prometer um
 *    valor que o fechamento não pagaria.
 *  - **o que já estava pago antes de sair** (PIX online, balcão, marketplace) não entra
 *    na prestação: o entregador não tem esse dinheiro na mão.
 *  - **a contagem é POR ENTREGA**: uma entrega paga metade no cartão e metade em
 *    dinheiro conta 1 em cada, nunca 2 na mesma.
 */
function resumoPrestacao(linhas) {
  const r = Object.assign({}, ZERO)
  for (const e of (linhas || [])) {
    r.entregas += 1
    r.vendas += Number(e.total) || 0
    r.produtos += Number(e.produtos) || 0
    r.troco += Number(e.troco) || 0
    if (e.emRota) {
      r.emRota += 1
      r.emRotaValor += Number(e.aPrestar) || 0
      r.taxasEmRota += Number(e.taxaEntrega) || 0
    } else {
      r.taxas += Number(e.taxaEntrega) || 0
    }
    if (e.pagoAntes) { r.jaPago += Number(e.total) || 0; continue }
    for (const p of (e.pagamentos || [])) {
      const v = Number(p.valor) || 0
      if (p.forma === 'dinheiro') r.dinheiro += v
      else if (p.forma === 'pix') r.pix += v
      else if (p.forma === 'credito') r.credito += v
      else if (p.forma === 'debito') r.debito += v
      else r.cartao += v
    }
  }
  for (const k of Object.keys(r)) r[k] = arred(r[k])
  // Espécie = o que ele recebeu em dinheiro MAIS o troco que levou do caixa.
  r.especie = arred(r.dinheiro + r.troco)
  r.aPrestar = arred(r.especie + r.credito + r.debito + r.cartao + r.pix)
  return r
}

/** O mesmo resumo, quebrado por entregador — cada um presta a conta dele. */
function agruparPorEntregador(linhas) {
  const porId = new Map()
  for (const e of (linhas || [])) {
    const id = e.entregadorId || e.entregador || 'sem-entregador'
    if (!porId.has(id)) porId.set(id, { id, nome: e.entregador || 'Sem entregador', linhas: [] })
    porId.get(id).linhas.push(e)
  }
  return [...porId.values()]
    .map((x) => Object.assign({ id: x.id, nome: x.nome }, resumoPrestacao(x.linhas)))
    .sort((a, b) => b.aPrestar - a.aPrestar || b.vendas - a.vendas)
}

// ── peças ───────────────────────────────────────────────────────────────────
function cartao(titulo, acoes, corpo, atraso) {
  return '<div class="ecard" style="padding:0;overflow:hidden;animation:eloFadeUp .5s ease ' + (atraso || 0) + 's both">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;'
    + 'padding:14px 18px;border-bottom:1px solid #eef0f3">'
    + '<div style="font-size:14.5px;font-weight:800;color:#111">' + esc(titulo) + '</div>'
    + (acoes ? '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + acoes + '</div>' : '')
    + '</div>' + corpo + '</div>'
}
function segmentado(attr, opcoes, atual) {
  return '<div style="display:inline-flex;background:#eef0f3;border-radius:9px;padding:2px">'
    + opcoes.map((o) => '<button type="button" ' + attr + '="' + esc(o.chave) + '"'
      + ' style="height:26px;padding:0 11px;border:none;border-radius:7px;font-family:inherit;font-size:12px;'
      + 'cursor:pointer;' + (o.chave === atual
        ? 'background:#fff;color:#111;font-weight:800;box-shadow:0 1px 2px rgba(17,17,17,.08)'
        : 'background:none;color:#6b7280;font-weight:600') + '">' + esc(o.rotulo) + '</button>').join('')
    + '</div>'
}
function linhaTotal(rotulo, valor, forte, destaque) {
  return '<div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0">'
    + '<span style="font-size:12.5px;color:#6b7280;font-weight:' + (forte ? '700' : '600') + '">' + esc(rotulo) + '</span>'
    + '<span style="font-size:' + (destaque ? '14px' : '12.5px') + ';font-weight:' + (forte ? '800' : '700')
    + ';color:' + (destaque ? 'var(--acento-texto)' : '#111') + '">' + esc(brl(valor)) + '</span></div>'
}
function tituloBloco(t) {
  return '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;'
    + 'letter-spacing:.07em;margin-bottom:8px">' + esc(t) + '</div>'
}

// ── aba Entregas: a prestação de contas ─────────────────────────────────────
function abaEntregas(d, estado) {
  const todas = d.entregas || []
  const quem = estado.quemEntregador || 'todos'
  const linhas = quem === 'todos' ? todas : todas.filter((e) => (e.entregadorId || e.entregador) === quem)
  const porEntregador = agruparPorEntregador(todas)
  const total = resumoPrestacao(linhas)
  const fechados = d.fechamentos || []

  const filtros = segmentado('data-periodo-entregador', PERIODOS, estado.periodoEntregador || 'hoje')
    + '<select data-quem-entregador style="height:30px;max-width:200px;border:1px solid #e5e7eb;border-radius:9px;'
    + 'background:#fff;font-family:inherit;font-size:12.5px;color:#111;padding:0 8px;cursor:pointer">'
    + '<option value="todos">Todos os entregadores</option>'
    + porEntregador.map((r) => '<option value="' + esc(r.id) + '"' + (r.id === quem ? ' selected' : '') + '>'
      + esc(r.nome) + '</option>').join('')
    + '</select>'
    + '<span style="font-size:12.5px;color:#9ca3af;font-weight:600">'
    + (d.periodo ? dataBr(d.periodo.de) + (d.periodo.de !== d.periodo.ate ? ' a ' + dataBr(d.periodo.ate) : '') + ' · ' : '')
    + total.entregas + ' entrega' + (total.entregas === 1 ? '' : 's') + '</span>'

  // Já fechado no período: a linha DIZ isso e não oferece fechar de novo — fechamento
  // sobreposto paga o repasse duas vezes.
  const jaFechado = (id) => fechados.some((f) => f.entregadorId === id
    && d.periodo && f.periodoInicio <= d.periodo.de && f.periodoFim >= d.periodo.ate)

  const tabela = porEntregador.length
    ? L.apenasGrade(
      { colunas: ['Entregador', 'Entregas', 'Dinheiro', 'Troco', 'Cartão', 'PIX na entrega',
        'Já pago', 'A prestar contas', 'Taxa a receber', ''],
        grade: '1fr 120px 120px 110px 120px 130px 110px 140px 130px 130px',
        direita: [1, 2, 3, 4, 5, 6, 7, 8] },
      porEntregador.map((r) => ({ chave: r.id, celulas: [
        { texto: r.nome, forte: true, cor: '#111' },
        { texto: String(r.entregas) + (r.emRota ? ' (' + r.emRota + ' em rota)' : '') },
        brl0(r.dinheiro), brl0(r.troco), brl0(r.credito + r.debito + r.cartao), brl0(r.pix),
        { texto: brl0(r.jaPago), cor: '#9ca3af' },
        { texto: brl(r.aPrestar), forte: true, cor: '#111' },
        brl0(r.taxas),
        jaFechado(r.id)
          ? { texto: '✓ Fechado', etiqueta: 'verde' }
          : { html: '<button type="button" data-acao="entregador:fechar-periodo:' + esc(r.id) + '"'
            + ' style="height:26px;padding:0 10px;border:none;border-radius:8px;background:var(--acento);'
            + 'color:#fff;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer">Fechar período</button>' },
      ] })),
    )
    : '<div class="evazio">Nenhuma entrega no período.</div>'

  // O fechamento do relatório: por onde entrou cada real, e o que ele deve.
  const rodape = linhas.length
    ? '<div style="border-top:1px solid #eef0f3;padding:14px 18px;display:grid;gap:18px;'
      + 'grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">'
      + '<div>' + tituloBloco('Recebido na entrega')
      + linhaTotal('Dinheiro', total.dinheiro)
      + linhaTotal('Troco levado (volta com ele)', total.troco)
      + linhaTotal('Crédito', total.credito)
      + linhaTotal('Débito', total.debito)
      + (total.cartao > 0 ? linhaTotal('Cartão (sem tipo)', total.cartao) : '')
      + linhaTotal('PIX na entrega', total.pix) + '</div>'
      + '<div>' + tituloBloco('Prestação de contas')
      + linhaTotal('Espécie a devolver', total.especie, true)
      + linhaTotal('Comprovantes de cartão', total.credito + total.debito + total.cartao)
      + linhaTotal('Comprovantes de PIX', total.pix)
      + linhaTotal('Total a prestar contas', total.aPrestar, true, true)
      + (total.emRota > 0
        ? '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:8px;line-height:1.45">'
          + total.emRota + ' entrega' + (total.emRota === 1 ? '' : 's') + ' ainda em rota ('
          + esc(brl(total.emRotaValor)) + '): o valor é o combinado no pedido e pode mudar quando '
          + 'o entregador concluir.</div>'
        : '')
      + '</div></div>'
    : ''

  return cartao('Prestação de contas por entregador', filtros,
    '<div style="padding:18px">' + tabela + '</div>' + rodape, 0.05)
    + (linhas.length ? detalheDasEntregas(linhas, quem === 'todos') : '')
}

/** Entrega a entrega. A TAXA vem por último de propósito (pedido do dono, 08/09/2026):
 *  as colunas antes dela são o que o entregador DEVE; a taxa é o que a loja paga a ele.
 *  Fechar por ela deixa a leitura na ordem da conversa do acerto. */
function detalheDasEntregas(linhas, comEntregador) {
  const colunas = ['Data', 'Pedido', 'Cliente'].concat(comEntregador ? ['Entregador'] : [])
    .concat(['Valor do produto', 'Modalidade', 'Troco', 'Total', 'A prestar', 'Taxa de entrega'])
  const grade = (comEntregador ? '110px 100px 1fr 150px' : '110px 100px 1fr')
    + ' 140px 130px 110px 120px 120px 130px'
  const primeira = comEntregador ? 4 : 3
  const direita = [primeira, primeira + 2, primeira + 3, primeira + 4, primeira + 5]
  const total = resumoPrestacao(linhas)
  return '<div style="height:16px"></div>' + cartao('Entrega a entrega', '',
    '<div style="padding:18px">' + L.apenasGrade({ colunas, grade, direita },
      linhas.map((e) => ({ chave: e.id, celulas: [
        dataBr(e.data), { texto: '#' + String(e.numero).padStart(4, '0'), forte: true, cor: '#111' },
        e.cliente || '—',
      ].concat(comEntregador ? [e.entregador || '—'] : [])
        .concat([
          brl(e.produtos),
          e.emRota ? { texto: rotuloModalidade(e), etiqueta: 'azul' } : rotuloModalidade(e),
          brl0(e.troco), brl(e.total), brl(e.aPrestar), brl0(e.taxaEntrega),
        ]) })))
    + '<div style="border-top:1px solid #eef0f3;padding:12px 18px;display:flex;justify-content:space-between;'
    + 'gap:12px;font-size:13px;font-weight:800;color:#111">'
    + '<span>Totais do período</span>'
    + '<span>produtos ' + esc(brl(total.produtos)) + ' · troco ' + esc(brl0(total.troco))
    + ' · vendas ' + esc(brl(total.vendas)) + ' · a prestar ' + esc(brl(total.aPrestar))
    + ' · taxa ' + esc(brl0(total.taxas)) + '</span></div>', 0.1)
}

const MODALIDADE = { dinheiro: 'Dinheiro', pix: 'PIX', credito: 'Crédito', debito: 'Débito',
  cartao: 'Cartão', cartao_entrega: 'Cartão', a_receber: 'CRÉDITO FUNC' }
function rotuloModalidade(e) {
  if (e.pagoAntes) return 'Já pago'
  if (e.emRota) return 'Em rota'
  return MODALIDADE[e.forma] || e.forma || '—'
}

// ── aba Fechamentos ─────────────────────────────────────────────────────────
const SITUACAO_FECHAMENTO = {
  pago: { rotulo: 'Pago', etiqueta: 'verde' },
  liquidado: { rotulo: 'Pago', etiqueta: 'verde' },
  pendente: { rotulo: 'A pagar', etiqueta: 'amarelo' },
  vencido: { rotulo: 'Vencido', etiqueta: 'vermelho' },
  cancelado: { rotulo: 'Cancelado', etiqueta: 'cinza' },
}

function abaFechamentos(d) {
  const lista = d.fechamentos || []
  if (!lista.length) {
    return cartao('Fechamentos de entrega', '',
      '<div class="evazio">Nenhum fechamento ainda. Um período fechado na aba Entregas aparece aqui.</div>', 0.05)
  }
  return cartao('Fechamentos de entrega', '',
    '<div style="padding:18px">' + L.apenasGrade(
      { colunas: ['Entregador', 'Período', 'Valor', 'Vencimento', 'Situação'],
        grade: '1fr 220px 150px 150px 170px', direita: [2] },
      lista.map((f) => {
        const s = f.situacao ? (SITUACAO_FECHAMENTO[f.situacao] || { rotulo: f.situacao, etiqueta: 'cinza' }) : null
        return { chave: f.id, celulas: [
          // ⚠️ Cobertura de folga: quem cobriu recebe, mas a NOTA sai no nome do
          // TITULAR — é ele que responde pelo CNPJ. Esconder isso aqui faria o
          // repasse parecer do entregador errado no acerto.
          { texto: f.entregador || '—', forte: true, cor: '#111',
            sub: f.titular ? 'nota em nome de ' + f.titular : '' },
          dataBr(f.periodoInicio) + ' a ' + dataBr(f.periodoFim),
          { texto: brl(f.valor), forte: true, cor: '#111' },
          dataBr(f.vencimento),
          s ? { texto: s.rotulo, etiqueta: s.etiqueta } : { texto: 'Não lançado', etiqueta: 'cinza' },
        ] }
      }),
    ) + '</div>', 0.05)
}

// ── aba Equipe ──────────────────────────────────────────────────────────────
const SITUACAO_EQUIPE = { 'Em rota': 'azul', Livre: 'verde', Inativo: 'cinza' }

function abaEquipe(d) {
  const itens = d.itens || []
  const c = d.contadores || { rota: 0, livre: 0 }
  const kpis = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px">'
    + [{ r: 'Na rua', v: String(c.rota || 0), s: 'entregando', cor: '#1d4ed8' },
      { r: 'Livres', v: String(c.livre || 0), s: 'disponíveis', cor: 'var(--acento-texto)' },
      { r: 'Entregas hoje', v: String(d.entregasHoje || 0), s: 'concluídas', cor: '#111' }]
      .map((k) => '<div class="ecard" style="padding:13px 18px;min-width:0">'
        + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;'
        + 'letter-spacing:.07em;margin-bottom:7px">' + esc(k.r) + '</div>'
        + '<div style="font-size:22px;font-weight:800;color:' + k.cor + ';letter-spacing:-.03em;line-height:1">'
        + esc(k.v) + '</div>'
        + '<div style="font-size:11px;color:#9ca3af;font-weight:600;margin-top:6px">' + esc(k.s) + '</div></div>').join('')
    + '</div>'

  const corpo = itens.length
    ? '<div style="padding:18px">' + L.apenasGrade(
      { colunas: ['Entregador', 'Telefone', 'Situação', 'Entregas hoje', 'A receber'],
        grade: '1fr 180px 150px 150px 150px', direita: [3, 4] },
      itens.map((m) => ({ chave: m.nome, celulas: [
        { texto: m.nome, forte: true, cor: '#111' },
        m.telefone || '—',
        { texto: m.situacao, etiqueta: SITUACAO_EQUIPE[m.situacao] || 'cinza' },
        String(m.entregas || 0),
        { texto: brl(m.aReceber), forte: true, cor: '#111' },
      ] })),
    ) + '</div>'
    : '<div class="evazio">Nenhum entregador cadastrado.</div>'

  return kpis + cartao('Equipe de entrega',
    '<button type="button" data-acao="novo-entregador" style="height:32px;padding:0 13px;border:none;'
    + 'border-radius:9px;background:var(--acento);color:#fff;font-family:inherit;font-size:12.5px;'
    + 'font-weight:800;cursor:pointer">+ Novo entregador</button>', corpo, 0.05)
}

function htmlEntregadores(dados, estado) {
  estado = estado || {}
  if (!dados) return aviso('Sem dados ainda. Quando o app falar com o painel, esta tela aparece aqui.')
  const Abas = require('./abas')
  const aba = Abas.abaAtual(ABAS, estado.aba)
  const corpo = aba === 'fechamentos' ? abaFechamentos(dados)
    : aba === 'equipe' ? abaEquipe(dados)
    : abaEntregas(dados, estado)
  return '<div>' + Abas.barraDeAbas(ABAS, aba) + corpo + '</div>'
}

module.exports = {
  htmlEntregadores, ABAS, PERIODOS,
  resumoPrestacao, agruparPorEntregador, rotuloModalidade,
}
