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
//
// `a_receber` = CRÉDITO FUNC desde 11/09/2026 (painel: app/admin/pedidos/logica.ts
// LABEL_FORMA_CURTA). Só o NOME mudou — a chave no banco continua `a_receber`. Aqui é
// rótulo de FORMA DE PAGAMENTO da venda; onde "A receber" significa o balde de dinheiro
// que ainda não chegou (KPI do caixa, coluna do despacho, conta em aberto) o nome antigo
// fica, porque lá é outra coisa.
const FORMAS = { dinheiro: 'Dinheiro', pix: 'Pix', pix_online: 'Pix online (site)',
  cartao_entrega: 'Cartão na entrega',
  cartao: 'Cartão', credito: 'Crédito', debito: 'Débito', a_receber: 'CRÉDITO FUNC' }
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
    '<button type="button" ' + attr + '="' + esc(i.chave) + '" class="eaba' + (i.chave === atual ? ' is-on' : '') + '">' + esc(i.rotulo)
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

/** Contas de mesa abertas, em CARTÕES — é assim no painel, e faz sentido: o operador
 *  procura a mesa pelo número, não lê uma tabela. Cada cartão traz garçom, situação do
 *  pedido, há quanto tempo está aberta e o consumo, com imprimir e fechar conta. */
function subabaMesas(dados) {
  const mesas = dados.mesas || []
  const total = mesas.reduce((s, m) => s + (Number(m.consumo) || 0), 0)
  if (!mesas.length) {
    return cartaoBloco('Contas de mesa', 'nenhuma conta aberta',
      '<div class="evazio">Nenhuma mesa com conta aberta agora.</div>')
  }
  const cartoes = mesas.map((m) => {
    const demorada = m.abertaHa > 90
    return '<div data-mesa="' + esc(m.mesa) + '" style="border:1.5px solid ' + (demorada ? '#f3c0bb' : '#e8eaee')
      + ';border-radius:14px;padding:14px;background:#fff;min-width:0;cursor:pointer">'
      + (m.garcom ? '<div style="font-size:10px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">'
        + 'Garçom: ' + esc(m.garcom) + '</div>' : '')
      + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">'
      + '<span style="font-size:17px;font-weight:800;color:#111">Mesa ' + esc(m.mesa) + '</span>'
      + '<span style="font-size:11.5px;font-weight:700;color:' + (demorada ? '#b42318' : '#6b7280') + '">' + esc(tempoLongo(m.abertaHa)) + '</span></div>'
      + (m.situacao ? '<div style="font-size:12px;font-weight:700;color:var(--acento-texto);margin-top:2px">' + esc(m.situacao) + '</div>' : '')
      + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600">' + esc(m.cliente || 'Sem identificação')
      + (m.pessoas ? ' · ' + esc(m.pessoas) + 'p' : '') + '</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px">'
      + '<span style="font-size:16px;font-weight:800;color:#111">R$ ' + fmtBRL(m.consumo) + '</span>'
      + '<span style="display:flex;gap:6px">'
      + '<button type="button" data-acao="mesa:imprimir:' + esc(m.mesa) + '" title="Imprimir conta" style="width:32px;height:30px;'
      + 'border:1px solid #e5e7eb;border-radius:9px;background:#fff;cursor:pointer;font-family:inherit">🖨</button>'
      + '<button type="button" data-acao="mesa:fechar:' + esc(m.mesa) + '" style="height:30px;padding:0 12px;border:none;border-radius:9px;'
      + 'background:var(--acento);color:#fff;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer">Fechar conta</button>'
      + '</span></div></div>'
  }).join('')
  return cartaoBloco('Contas de mesa em aberto', mesas.length + ' conta(s) · ' + fmtBRL(total) + ' a receber',
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">' + cartoes + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">dividir o pagamento entre duas formas ainda é pelo painel</div>')
}

// Cores por estado da entrega — as MESMAS do painel (EntregasPendentes.tsx). A cor não
// é enfeite: ela diz de quem é a vez. Laranja é o único que pede ação do caixa agora
// ("Fechamento pedido": o dinheiro voltou e ninguém lançou); roxo é o pedido que saiu
// mas ainda não foi finalizado — por isso não pode parecer verde.
// "Aguardando prestação de conta", não "Fechamento pedido" (painel, 08/09/2026): o
// motoboy já ENTREGOU e só falta voltar e prestar contas do dinheiro/maquininha que
// levou. "Fechamento pedido" dava a entender que o pedido ainda estava em aberto.
const COR_ENTREGA = {
  fechamento: { bg: '#FFF7ED', borda: '#FDBA74', texto: '#C2410C', rotulo: 'Aguardando prestação de conta' },
  preparo: { bg: '#EFF6FF', borda: '#93C5FD', texto: '#1D4ED8', rotulo: 'Em preparo' },
  pronto: { bg: '#F0FDF4', borda: '#86EFAC', texto: '#166534', rotulo: 'Pronto' },
  transito: { bg: '#F5F3FF', borda: '#C4B5FD', texto: '#7B2FF7', rotulo: 'Em trânsito' },
  fechado: { bg: '#f4f5f7', borda: '#d0d4db', texto: '#6b7280', rotulo: 'Fechado' },
}

/**
 * Guia de dinheiro do pedido, fase a fase — só existe para DINHEIRO, porque troco não
 * existe em cartão nem em Pix. Antes de sair: quanto troco separar. Depois de sair:
 * quanto o entregador precisa trazer de volta. É o número que o caixa confere na mão.
 */
function guiaDinheiro(e) {
  if (e.forma !== 'dinheiro') return null
  const troco = Number(e.trocoPara) || 0
  const total = Number(e.valor) || 0
  if (e.estado === 'fechamento') return 'entregador deve trazer R$ ' + fmtBRL(total)
  if (e.estado === 'transito') {
    return troco > total
      ? 'precisa trazer R$ ' + fmtBRL(total) + ' · saiu com troco pra R$ ' + fmtBRL(troco)
      : 'precisa trazer R$ ' + fmtBRL(total)
  }
  if (troco > total) return 'levar troco de R$ ' + fmtBRL(troco - total)
  return null
}

function botaoDaEntrega(e) {
  if (e.estado === 'fechamento') {
    return '<button type="button" data-acao="entrega:confirmar:' + esc(e.pedido) + '" style="height:30px;padding:0 12px;'
      + 'border:none;border-radius:9px;background:var(--acento);color:#fff;font-family:inherit;font-size:12px;'
      + 'font-weight:800;cursor:pointer">Confirmar recebimento</button>'
  }
  if (e.estado === 'transito') {
    return '<button type="button" data-acao="entrega:concluir:' + esc(e.pedido) + '" style="height:30px;padding:0 12px;'
      + 'border:none;border-radius:9px;background:var(--acento);color:#fff;font-family:inherit;font-size:12px;'
      + 'font-weight:800;cursor:pointer">Concluir ✓</button>'
  }
  if (e.estado === 'pronto' && e.tipo === 'retirada') {
    return '<button type="button" data-acao="entrega:entregue:' + esc(e.pedido) + '" style="height:30px;padding:0 12px;'
      + 'border:none;border-radius:9px;background:var(--acento);color:#fff;font-family:inherit;font-size:12px;'
      + 'font-weight:800;cursor:pointer">Entregue ✓</button>'
  }
  return ''
}

/**
 * Aba Delivery do Caixa — CARTÕES, do mesmo tamanho e com o mesmo tratamento dos de
 * mesa. A tabela que havia aqui antes escondia justamente o que o caixa precisa achar
 * de longe: qual pedido está esperando o fechamento dele.
 */

// ── NF pendentes ────────────────────────────────────────────────────────────
//
// Aba do painel desde 09/09/2026: as vendas do dia sem nota fiscal em COLUNAS por forma
// de pagamento — é assim que quem opera o caixa fecha o dia (o dinheiro da gaveta, o
// extrato do PIX, o lote da maquininha), e emitir na mesma ordem torna 40 notas tarefa
// de dois cliques em vez de quarenta.
//
// ⛔ CARTÃO É UMA COLUNA SÓ — crédito e débito juntos: para emitir a NFC-e o que importa
// é o lote da maquininha, que é um só. O tipo não se perde: cada card mostra o dele, e a
// nota sai com crédito/débito certos porque quem decide é a forma gravada no pedido.
//
// A aba só existe em loja que emite NFC-e manual (`ativo`): lista vazia sozinha não
// distingue "tudo em dia" de "esta loja não emite nota".
const LABEL_COLUNA_NF = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', outros: 'Outras formas' }
const ORDEM_COLUNAS_NF = ['dinheiro', 'pix', 'cartao', 'outros']

function daFormaSimples(forma) {
  if (forma === 'dinheiro') return 'dinheiro'
  if (forma === 'pix') return 'pix'
  if (forma === 'credito' || forma === 'debito' || forma === 'cartao') return 'cartao'
  return 'outros'
}

/** A coluna de uma venda pendente. Conta de mesa paga em mais de uma forma não pertence
 *  a coluna nenhuma — vai para "Outras formas", onde o operador decide olhando a conta.
 *  ⚠️ O tipo do cartão só vale quando a forma É cartão na entrega: existe pedido PIX com
 *  `cartaoTipo` sujo de uma correção de forma, e ler o tipo sem olhar a forma jogaria um
 *  PIX na coluna de débito (visto na Pizzas do Jasson, 09/09). */
function chaveFormaNf(v) {
  if (v.tipo === 'sessao') {
    const distintas = [...new Set(v.formasConta || [])]
    return distintas.length === 1 ? daFormaSimples(distintas[0]) : 'outros'
  }
  if (v.forma === 'cartao_entrega') return 'cartao'
  return daFormaSimples(v.forma || '')
}

/** O que o CARD mostra: "Cartão" seco só quando a venda não guardou o tipo — chutar
 *  crédito aqui viraria conferência errada de maquininha. */
function rotuloFormaNf(v) {
  if (v.tipo === 'sessao') {
    const distintas = [...new Set(v.formasConta || [])]
    if (distintas.length > 1) return 'Dividido'
    if (!distintas.length) return 'Sem pagamento registrado'
    return FORMAS[distintas[0]] || distintas[0]
  }
  if (v.forma === 'cartao_entrega') {
    if (v.cartaoTipo === 'credito') return 'Crédito'
    if (v.cartaoTipo === 'debito') return 'Débito'
    return 'Cartão'
  }
  return FORMAS[v.forma || ''] || v.forma || 'Pagamento'
}

/** Colunas na ordem do fechamento — só as que têm venda pendente. */
function colunasNfPendentes(vendas) {
  const porChave = new Map()
  for (const v of (vendas || [])) {
    const chave = chaveFormaNf(v)
    if (porChave.has(chave)) porChave.get(chave).push(v)
    else porChave.set(chave, [v])
  }
  return ORDEM_COLUNAS_NF.filter((c) => (porChave.get(c) || []).length).map((chave) => {
    const lista = porChave.get(chave)
    return { chave, label: LABEL_COLUNA_NF[chave], vendas: lista,
      total: lista.reduce((s, v) => s + (Number(v.total) || 0), 0) }
  })
}

function subabaNf(dados) {
  const nf = dados.nfPendentes || {}
  const vendas = nf.vendas || []
  if (!vendas.length) {
    return cartaoBloco('NF pendentes', 'nada esperando nota',
      '<div class="evazio">Todas as vendas de hoje e de ontem já têm nota fiscal.</div>')
  }
  const colunas = colunasNfPendentes(vendas)
  const totalGeral = vendas.reduce((s, v) => s + (Number(v.total) || 0), 0)

  const corpo = '<div style="display:grid;grid-template-columns:repeat(' + colunas.length
    + ',minmax(0,1fr));gap:14px">'
    + colunas.map((col) => '<div style="background:#f7f8fa;border-radius:12px;padding:12px;min-width:0">'
      + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px">'
      + '<span style="font-size:12.5px;font-weight:800;color:#111">' + esc(col.label) + '</span>'
      + '<span style="font-size:13px;font-weight:800;color:#111">R$ ' + fmtBRL(col.total) + '</span></div>'
      // Hierarquia do painel: "Emitir todas" da coluna fica NEUTRO e o "Emitir" de cada
      // nota é que tem destaque — a emissão em série é a exceção, não o caminho comum.
      + '<button type="button" data-acao="nf:emitir-coluna:' + esc(col.chave) + '" style="width:100%;height:30px;'
      + 'border:1px solid #e5e7eb;border-radius:9px;background:#fff;font-family:inherit;font-size:12px;'
      + 'font-weight:700;color:#111;cursor:pointer;margin-bottom:10px">Emitir todas da coluna ('
      + col.vendas.length + ')</button>'
      + col.vendas.map((v) => '<div style="background:#fff;border:1px solid #ececec;border-radius:10px;'
        + 'padding:9px 11px;margin-bottom:8px">'
        + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px">'
        + '<span style="font-size:13px;font-weight:800;color:#111">' + esc(v.rotulo || '—') + '</span>'
        + '<span style="font-size:12.5px;font-weight:800;color:#111">R$ ' + fmtBRL(v.total) + '</span></div>'
        + '<div style="font-size:11px;color:#9ca3af;font-weight:600;margin:3px 0 8px">'
        + (v.dia === 'ontem' ? 'ontem ' : '') + esc(fmtHora(v.quando)) + ' · ' + esc(rotuloFormaNf(v)) + '</div>'
        + '<button type="button" data-acao="nf:emitir-venda:' + esc(v.id) + '" style="width:100%;height:28px;'
        + 'border:none;border-radius:8px;background:var(--acento);color:#fff;font-family:inherit;font-size:12px;'
        + 'font-weight:800;cursor:pointer">Emitir</button></div>').join('')
      + '</div>').join('')
    + '</div>'

  return cartaoBloco('NF pendentes',
    vendas.length + ' venda(s) · R$ ' + fmtBRL(totalGeral) + ' sem nota', corpo)
}

// Prioridade de cima para baixo: quem precisa de ação do caixa AGORA primeiro, depois
// quem está na rua, quem está pronto e por último o que ainda está em preparo. Antes os
// cards vinham na ordem de chegada, espalhando as cores pela tela.
const RANK_ENTREGA = { fechamento: 0, transito: 1, pronto: 2, preparo: 3, fechado: 4 }

function ordenarEntregas(entregas) {
  return (entregas || []).slice().sort((a, b) => {
    const ra = RANK_ENTREGA[a.estado] != null ? RANK_ENTREGA[a.estado] : 9
    const rb = RANK_ENTREGA[b.estado] != null ? RANK_ENTREGA[b.estado] : 9
    if (ra !== rb) return ra - rb
    // Dentro do mesmo grupo, quem saiu há mais tempo primeiro — é quem está esperando.
    return (Number(b.saiuHa) || 0) - (Number(a.saiuHa) || 0)
  })
}

function subabaDelivery(dados) {
  const entregas = ordenarEntregas(dados.entregas)
  if (!entregas.length) {
    return cartaoBloco('Delivery e retirada', 'nada em andamento',
      '<div class="evazio">Nenhuma entrega em andamento no momento.</div>')
  }
  const aConfirmar = entregas.filter((e) => e.estado === 'fechamento')
  const naRua = entregas.filter((e) => e.estado === 'transito')
  const totalConfirmar = aConfirmar.reduce((s, e) => s + (Number(e.valor) || 0), 0)

  const cartoes = entregas.map((e) => {
    const cor = COR_ENTREGA[e.estado] || COR_ENTREGA.fechado
    const guia = guiaDinheiro(e)
    const acao = botaoDaEntrega(e)
    return '<div data-pedido="' + esc(e.pedido) + '" style="background:' + cor.bg + ';border:2px solid ' + cor.borda
      + ';border-radius:12px;padding:11px 13px;display:flex;flex-direction:column;min-height:128px;min-width:0;cursor:pointer">'
      + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px">'
      + '<span style="font-size:15px;font-weight:800;color:#111">#' + esc(String(e.pedido).padStart(4, '0')) + '</span>'
      + '<span style="font-size:15px;font-weight:800;color:#111">R$ ' + fmtBRL(e.valor) + '</span></div>'
      + '<div style="font-size:11px;font-weight:800;color:' + cor.texto + ';margin-top:3px">' + esc(cor.rotulo)
      + (guia ? ' · ' + esc(guia) : '') + '</div>'
      + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin:3px 0 8px;overflow:hidden;'
      + 'text-overflow:ellipsis;white-space:nowrap">'
      + esc(e.cliente || 'Sem identificação') + ' · ' + esc(rotuloForma(e.forma))
      + (e.entregador ? ' · ' + esc(e.entregador) : '')
      + (e.estado === 'transito' && e.saiuHa ? ' · saiu há ' + esc(tempoLongo(e.saiuHa)) : '') + '</div>'
      + '<div style="margin-top:auto">' + acao + '</div></div>'
  }).join('')

  const sub = aConfirmar.length
    ? aConfirmar.length + ' esperando fechamento · R$ ' + fmtBRL(totalConfirmar) + ' fora do caixa'
    : naRua.length + ' na rua · nada esperando fechamento'

  return cartaoBloco('Delivery e retirada', sub,
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px">' + cartoes + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">'
    + 'enquanto o recebimento não é confirmado, o dinheiro não entra no caixa</div>')
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

// ── A fila e o fechamento provisório (F3.3/F3.4) ─────────────────────────────
// O que foi feito sem internet fica À VISTA: quantas operações esperam, o que travou,
// e o turno fechado provisoriamente — nunca escondido atrás de um "conectado".
function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios) }
function faixa(cor, fundo, borda, conteudo) {
  return '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:' + fundo + ';border:1px solid ' + borda
    + ';border-left:4px solid ' + cor + ';border-radius:12px;padding:12px 16px;margin-bottom:18px;color:' + cor + '">' + conteudo + '</div>'
}
function botaoFaixa(acao, rotulo, cor) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:32px;padding:0 12px;border:1px solid ' + cor + ';border-radius:9px;'
    + 'background:#fff;color:' + cor + ';font-family:inherit;font-size:12px;font-weight:800;cursor:pointer">' + esc(rotulo) + '</button>'
}
function faixaFila(f) {
  if (!f || (!f.pendentes && !f.comErro)) return ''
  if (f.comErro) {
    return faixa('#b42318', '#fdeaea', '#f3c0bb',
      '<div style="flex:1;min-width:220px"><div style="font-size:13px;font-weight:800">' + esc(plural(f.comErro, 'operação não subiu', 'operações não subiram'))
      + (f.pendentes ? ' · ' + esc(plural(f.pendentes, 'outra espera', 'outras esperam')) : '') + '</div>'
      + '<div style="font-size:12px;font-weight:600;margin-top:2px">' + esc(f.ultimoErro || 'O painel recusou.')
      + ' — nada foi apagado: dá para tentar de novo, exportar ou desistir.</div></div>'
      + '<span style="display:flex;gap:8px;flex-wrap:wrap">' + botaoFaixa('fila:tentar', 'Tentar agora', '#b42318')
      + botaoFaixa('fila:ver', 'Ver a fila', '#b42318') + botaoFaixa('fila:exportar', 'Exportar pendentes', '#b42318') + '</span>')
  }
  return faixa('#8a6508', '#fff9e8', '#eed571',
    '<div style="flex:1;min-width:220px"><div style="font-size:13px;font-weight:800">'
    + esc(plural(f.pendentes, 'operação feita sem internet esperando para subir', 'operações feitas sem internet esperando para subir'))
    + (f.total > 0 ? ' · R$ ' + esc(fmtBRL(f.total)) + ' em vendas' : '') + '</div>'
    + '<div style="font-size:12px;font-weight:600;margin-top:2px">Já contam aqui embaixo, marcadas como não sincronizadas. Sobem sozinhas quando a conexão voltar.</div></div>'
    + '<span style="display:flex;gap:8px;flex-wrap:wrap">' + botaoFaixa('fila:tentar', 'Tentar agora', '#8a6508') + botaoFaixa('fila:ver', 'Ver a fila', '#8a6508') + '</span>')
}
function faixaProvisorio(fp) {
  if (!fp) return ''
  const c = fp.contados || {}
  return faixa('#8a6508', '#fff9e8', '#eed571',
    '<div style="flex:1;min-width:220px"><div style="font-size:13px;font-weight:800">FECHAMENTO PROVISÓRIO — feito sem internet'
    + (fp.em ? ' às ' + esc(fmtHora(fp.em)) : '') + ', sujeito a conferência quando a conexão voltar.</div>'
    + '<div style="font-size:12px;font-weight:600;margin-top:2px">Contado: dinheiro R$ ' + esc(fmtBRL(c.dinheiro)) + ' · Pix R$ ' + esc(fmtBRL(c.pix))
    + ' · cartão R$ ' + esc(fmtBRL(c.cartao)) + '. O servidor vai comparar com o que ele tem; se algo ficou de fora, a conferência abre aqui.</div></div>')
}
function faixaConferencia(cf) {
  if (!cf) return ''
  const n = (cf.naoVistas || []).length
  return faixa('#b42318', '#fdeaea', '#f3c0bb',
    '<div style="flex:1;min-width:220px"><div style="font-size:13px;font-weight:800">Fechamento aguardando conferência — '
    + esc(plural(n, 'movimentação que o app não viu', 'movimentações que o app não viu')) + '</div>'
    + '<div style="font-size:12px;font-weight:600;margin-top:2px">O turno não está fechado de vez: confira o que entrou enquanto o app estava sem internet e confirme.</div></div>'
    + '<span style="display:flex;gap:8px">' + botaoFaixa('caixa:conferencia:abrir', 'Abrir a conferência', '#b42318') + '</span>')
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

  const faixasDaFila = faixaConferencia(dados.conferencia) + faixaProvisorio(dados.fechamentoProvisorio) + faixaFila(dados.fila)

  if (!dados.aberto) {
    return '<div>' + barraAbas
      + '<div style="display:flex;justify-content:flex-end;margin-bottom:14px">' + selo + '</div>'
      + faixasDaFila
      + '<div class="ecard"><div class="evazio"><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:6px">Caixa fechado</div>'
      + 'Nenhum caixa aberto agora. Abra o caixa para fechar contas de mesa e confirmar recebimentos de entrega.'
      + '<div style="margin-top:16px"><button type="button" data-acao="caixa:abrir" style="height:38px;padding:0 20px;'
      + 'border:none;border-radius:10px;background:var(--acento);color:#fff;font-family:inherit;font-size:13px;'
      + 'font-weight:800;cursor:pointer">Abrir caixa</button></div></div></div></div>'
  }

  // Subabas: Mesas só existe em loja que tem mesa (o painel faz o mesmo).
  const subabas = []
  if (dados.temMesas !== false) subabas.push({ chave: 'mesas', rotulo: 'Mesas', contador: (dados.mesas || []).length })
  subabas.push({ chave: 'delivery', rotulo: 'Delivery', contador: (dados.entregas || []).length })
  subabas.push({ chave: 'movimentacoes', rotulo: 'Movimentações', contador: (dados.movimentacoes || []).length })
  // Só em loja que emite NFC-e manual — quem não emite nem vê a aba (painel, 09/09/2026).
  if (dados.nfPendentes && dados.nfPendentes.ativo) {
    subabas.push({ chave: 'nf', rotulo: 'NF pendentes', contador: (dados.nfPendentes.vendas || []).length })
  }
  const subaba = subabas.some((x) => x.chave === estado.subaba) ? estado.subaba : subabas[0].chave

  // Faixa de status: quem abriu, há quanto tempo e desde que hora — é a primeira coisa
  // que o operador confere ao chegar no balcão.
  const a = dados.aberto
  const faixa = '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-left:3px solid var(--acento);'
    + 'background:#fff;border:1px solid var(--linha);border-left-width:3px;border-radius:12px;padding:12px 16px;margin-bottom:18px">'
    + '<span style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:800;color:var(--acento-texto)">'
    + '<span style="width:9px;height:9px;border-radius:50%;background:var(--acento);display:inline-block"></span>CAIXA ABERTO</span>'
    + '<span style="color:#e8eaee">|</span>'
    + '<span style="font-size:12.5px;color:#6b7280;font-weight:600">Por <b style="color:#111">' + esc(a.abertoPor || '—') + '</b></span>'
    + (a.abertoHaMin != null ? '<span style="color:#e8eaee">|</span><span style="font-size:12.5px;color:#6b7280;font-weight:600">'
      + esc(tempoLongo(a.abertoHaMin)) + ' aberto</span>' : '')
    + '<span style="margin-left:auto;font-size:12.5px;color:#9ca3af;font-weight:600">Desde ' + esc(fmtHora(a.abertoEm)) + '</span></div>'

  const resumoLinha = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px">'
    + [['Fundo inicial', fmtBRL(a.fundoInicial), ''], ['Sangrias', fmtBRL((dados.resumo || {}).sangrias), '− '],
       ['Suprimentos', fmtBRL((dados.resumo || {}).suprimentos), '+ ']].map((x) =>
      '<span class="echip" style="background:#eef0f3;color:#4b5563">' + esc(x[0]) + ': <b style="color:#111">' + esc(x[2]) + 'R$ ' + esc(x[1]) + '</b></span>').join('')
    + '<span style="display:flex;gap:8px;align-items:center;margin-left:auto">'
    + '<button type="button" data-acao="caixa:suprimento" style="height:34px;padding:0 14px;border:1px solid #e5e7eb;border-radius:10px;'
    + 'background:#fff;color:#111;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">+ Suprimento</button>'
    + '<button type="button" data-acao="caixa:sangria" style="height:34px;padding:0 14px;border:1px solid #f3c0bb;border-radius:10px;'
    + 'background:#fff;color:#b42318;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">− Sangria</button>'
    // Fechado provisoriamente ou aguardando conferência: não há o que fechar de novo.
    + ((dados.fechamentoProvisorio || dados.conferencia) ? ''
      : '<button type="button" data-acao="caixa:fechar" style="height:34px;padding:0 14px;border:none;border-radius:10px;'
        + 'background:#111;color:#fff;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">Fechar caixa</button>')
    + '</span></div>'

  const r = dados.resumo || {}
  const naRua = (dados.entregas || []).reduce((s, e) => s + (Number(e.valor) || 0), 0)
  // Dois PIX que não se conferem igual (painel, 09/09/2026): o do site/app é confirmado
  // pelo gateway e JÁ caiu na conta; o que uma pessoa lançou na porta/balcão é o único
  // que precisa bater no fechamento. Loja sem PIX online segue com um card "Pix" só —
  // é também o que acontece enquanto o servidor não manda os dois campos.
  const pixOnline = Number(r.vendaPixOnline) || 0
  const cartoesPix = pixOnline > 0
    ? kpi('Pix online', fmtBRL(pixOnline), 'site/app — já caiu na conta', '#6366F1')
      + kpi('Pix manual', fmtBRL(r.vendaPixConferir != null ? r.vendaPixConferir : (Number(r.vendaPix) || 0) - pixOnline),
        'confere no fechamento', '#818CF8')
    : kpi('Pix', fmtBRL(r.vendaPix), 'no turno')
  const colunas = pixOnline > 0 ? 5 : 4
  const kpis = '<div style="display:grid;grid-template-columns:repeat(' + colunas + ',minmax(0,1fr));gap:18px;animation:eloFadeUp .5s ease both;margin-bottom:18px">'
    + kpi('Esperado em dinheiro', fmtBRL(dados.esperadoDinheiro), 'fundo de R$ ' + fmtBRL(dados.aberto.fundoInicial))
    + kpi('Vendas em dinheiro', fmtBRL(r.vendaDinheiro), 'na gaveta')
    + cartoesPix
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
  else if (subaba === 'nf') corpo = subabaNf(dados)
  else corpo = movimentacoesHtml(dados, selo)

  return '<div>' + barraAbas + faixasDaFila + faixa + kpis + resumoLinha + alertaRua + barra(subabas, subaba, 'data-subaba') + corpo + '</div>'
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
      + esc(m.descricao || '') + (m.estornada ? ' <span style="font-size:11px;font-weight:700;color:#b42318">estornada</span>' : '')
      + (m.naoSincronizada ? ' <span style="font-size:10.5px;font-weight:800;color:#8a6508;background:#fff9e8;border-radius:6px;padding:1px 6px">não sincronizada</span>' : '') + '</div>'
      + '<div style="padding:7px 10px;font-size:13px;font-weight:700;color:' + cor + ';text-align:right;' + risco + '">R$ ' + fmtBRL(m.valor) + '</div>'
      + '</div>'
  }).join('')

  const cabecalho = '<div style="display:grid;grid-template-columns:70px 120px 150px 1fr 130px;font-size:10.5px;font-weight:700;color:#6b7280;'
    + 'text-transform:uppercase;letter-spacing:.05em;background:#f4f5f7;border-bottom:1px solid #e5e7eb">'
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
    + (dados.movimentacoes || []).length + ' movimentações · estornar movimentação ainda é pelo painel</div></div>'
}

module.exports = { htmlDoCaixa, fmtBRL, fmtHora, idadeDoDado, rotuloTipo, rotuloForma, tempoLongo, esc,
  colunasNfPendentes, chaveFormaNf, rotuloFormaNf, LABEL_COLUNA_NF, ORDEM_COLUNAS_NF }
