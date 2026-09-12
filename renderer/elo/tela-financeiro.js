// renderer/elo/tela-financeiro.js — as nove abas do Financeiro.
//
// Desenhadas olhando as telas reais (app/admin/financeiro/abas/*.tsx). O que estava
// aqui antes eram cinco tabelas parecidas entre si; no painel cada aba responde uma
// pergunta diferente e por isso tem filtro, coluna e número próprios:
//
//   Visão geral  → como foi o período (tela própria, em telas-principais.js)
//   Vendas       → venda a venda, com o que a loja recebeu e o que ainda não entrou
//   Extrato      → TUDO que entrou e saiu, com saldo corrido e origem rastreável
//   Livro caixa  → só a GAVETA (dinheiro), que é o que se confere no fim do dia
//   Despesas     → o GASTO com prestador: o que saiu, para quem, e se a nota chegou
//   Contas a pagar / a receber → por MÊS PRÓPRIO (vencida nunca some do mês dela)
//   DRE          → resultado, linha a linha, com o que dá para abrir
//   Contas bancárias → de onde sai cada pagamento, e o que passou por cada conta
//
// Tudo é leitura: liquidar, receber e lançar continuam no painel.

const L = require('./tela-lista')
const G = require('./graficos')
const esc = L.esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const aviso = (t) => '<div class="ecard"><div class="evazio">' + esc(t) + '</div></div>'
const POR_PAGINA = 50

// ── peças ───────────────────────────────────────────────────────────────────
function kpi(rotulo, valor, sub, cor) {
  return '<div class="ecard" style="padding:13px 18px;min-width:0">'
    + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px">'
    + esc(rotulo) + '</div>'
    + '<div style="font-size:22px;font-weight:800;color:' + (cor || '#111') + ';letter-spacing:-.03em;line-height:1">'
    + esc(valor) + '</div>'
    + (sub ? '<div style="font-size:11px;color:#9ca3af;font-weight:600;margin-top:6px">' + esc(sub) + '</div>' : '')
    + '</div>'
}
const faixaKpis = (lista) => '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));'
  + 'gap:12px;margin-bottom:16px">' + lista.map((k) => kpi(k.r, k.v, k.s, k.c)).join('') + '</div>'

function cartao(titulo, acoes, corpo, atraso) {
  return '<div class="ecard" style="padding:0;overflow:hidden;animation:eloFadeUp .5s ease ' + (atraso || 0) + 's both">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;'
    + 'padding:14px 18px;border-bottom:1px solid #eef0f3">'
    + '<div style="font-size:14.5px;font-weight:800;color:#111">' + esc(titulo) + '</div>'
    + (acoes ? '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + acoes + '</div>' : '')
    + '</div>' + corpo + '</div>'
}
/** Pílula segmentada do painel (fin-seg): duas ou três opções coladas. */
function segmentado(attr, opcoes, atual) {
  return '<div style="display:inline-flex;background:#eef0f3;border-radius:9px;padding:2px">'
    + opcoes.map((o) => '<button type="button" ' + attr + '="' + esc(o.chave) + '"'
      + ' style="height:26px;padding:0 11px;border:none;border-radius:7px;font-family:inherit;font-size:12px;'
      + 'cursor:pointer;' + (o.chave === atual
        ? 'background:#fff;color:#111;font-weight:800;box-shadow:0 1px 2px rgba(17,17,17,.08)'
        : 'background:none;color:#6b7280;font-weight:600') + '">' + esc(o.rotulo) + '</button>').join('')
    + '</div>'
}
/** Select de filtro: o app não consulta o servidor, então filtra o que já tem na mão. */
function selecao(attr, opcoes, atual, largura) {
  return '<select ' + attr + ' style="height:30px;max-width:' + (largura || 175) + 'px;border:1px solid #e5e7eb;'
    + 'border-radius:9px;background:#fff;font-family:inherit;font-size:12.5px;color:#111;padding:0 8px;cursor:pointer">'
    + opcoes.map((o) => '<option value="' + esc(o.chave) + '"' + (o.chave === atual ? ' selected' : '') + '>'
      + esc(o.rotulo) + '</option>').join('') + '</select>'
}
function busca(attr, placeholder, valor, largura) {
  return '<input ' + attr + ' placeholder="' + esc(placeholder) + '" value="' + esc(valor || '') + '"'
    + ' autocomplete="off" style="height:30px;width:' + (largura || 200) + 'px;max-width:100%;border:1px solid #e5e7eb;'
    + 'border-radius:9px;padding:0 10px;font-family:inherit;font-size:12.5px;color:#111;background:#fff">'
}
function botao(acao, rotulo, primaria, pequeno) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:' + (pequeno ? 28 : 32) + 'px;'
    + 'padding:0 ' + (pequeno ? 10 : 13) + 'px;border-radius:9px;font-size:12.5px;font-weight:800;font-family:inherit;'
    + 'cursor:pointer;white-space:nowrap;' + (primaria
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}
function paginacao(pagina, total) {
  const paginas = Math.ceil(total / POR_PAGINA)
  if (paginas <= 1) return ''
  const de = pagina * POR_PAGINA + 1
  const ate = Math.min(total, (pagina + 1) * POR_PAGINA)
  return '<div style="display:flex;align-items:center;gap:10px;padding:12px 18px;border-top:1px solid #eef0f3">'
    + '<span style="font-size:12px;color:#9ca3af;font-weight:600">' + de + '–' + ate + ' de ' + total + '</span>'
    + '<span style="margin-left:auto;display:flex;gap:6px">'
    + '<button type="button" data-pag-fin="' + Math.max(0, pagina - 1) + '" style="height:28px;padding:0 11px;'
    + 'border:1px solid #e5e7eb;border-radius:8px;background:#fff;font-family:inherit;font-size:12px;font-weight:700;'
    + (pagina === 0 ? 'color:#c4c8cf' : 'color:#111;cursor:pointer') + '">‹ anterior</button>'
    + '<button type="button" data-pag-fin="' + Math.min(paginas - 1, pagina + 1) + '" style="height:28px;padding:0 11px;'
    + 'border:1px solid #e5e7eb;border-radius:8px;background:#fff;font-family:inherit;font-size:12px;font-weight:700;'
    + (pagina >= paginas - 1 ? 'color:#c4c8cf' : 'color:#111;cursor:pointer') + '">próxima ›</button>'
    + '</span></div>'
}

// ── vocabulário do painel ───────────────────────────────────────────────────
const CATEGORIA_MOV = {
  venda: 'Venda', taxa_servico: 'Taxa de serviço', taxa_entrega: 'Taxa de entrega',
  recebimento: 'Recebimento', pagamento: 'Pagamento', sangria: 'Sangria',
  suprimento: 'Suprimento', estorno: 'Estorno', transferencia: 'Transferência',
}
const TOM_CATEGORIA = {
  venda: 'verde', taxa_servico: 'azul', taxa_entrega: 'azul', recebimento: 'verde',
  pagamento: 'vermelho', sangria: 'amarelo', suprimento: 'verde', estorno: 'vermelho', transferencia: 'cinza',
}
// Espelha o painel (lib/financeiro/indicadores.ts FORMA_LABEL, 09/09/2026): 'pix' é o
// que uma PESSOA lançou na porta/balcão — o único que precisa bater no fechamento — e
// 'pix_online' é o do site/app, já confirmado pelo gateway. `a_receber` como FORMA da
// venda é CRÉDITO FUNC desde 11/09; onde "A receber" é o balde do que ainda não entrou
// (repasse, cartão a prazo) o nome antigo continua, porque lá significa outra coisa.
const FORMA = {
  dinheiro: 'Dinheiro', pix: 'PIX manual', pix_online: 'PIX online (site)',
  cartao: 'Cartão', credito: 'Crédito', debito: 'Débito',
  cartao_entrega: 'Cartão na entrega', a_receber: 'CRÉDITO FUNC', boleto: 'Boleto', transferencia: 'Transferência',
}
const ORIGEM = { pedido: 'Pedido', conta: 'Conta', caixa: 'Caixa', manual: 'Lançamento manual', repasse: 'Repasse' }
const SITUACAO_CONTA = {
  vencida: { rotulo: 'Vencida', etiqueta: 'vermelho' },
  pendente: { rotulo: 'A vencer', etiqueta: 'amarelo' },
  parcial: { rotulo: 'Parcial', etiqueta: 'azul' },
  paga: { rotulo: 'Paga', etiqueta: 'verde' },
  recebida: { rotulo: 'Recebida', etiqueta: 'verde' },
  cancelada: { rotulo: 'Cancelada', etiqueta: 'cinza' },
}
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** '2026-09' → 'setembro de 2026'. */
function mesLabel(mes) {
  const [a, m] = ('' + (mes || '')).split('-')
  const i = Number(m) - 1
  return (MESES[i] || '—') + ' de ' + (a || '—')
}
/** Anda N meses, mantendo o formato '2026-09'. */
function somaMes(mes, n) {
  const [a, m] = ('' + mes).split('-').map(Number)
  const d = new Date(a, (m - 1) + n, 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}
/** '2026-09-10' → '10/09/2026'. */
function dataBr(iso) {
  const p = ('' + (iso || '')).slice(0, 10).split('-')
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : (iso || '—')
}
/** "2 de 6" para qualquer conta; conta avulsa de verdade mostra "—". */
function rotuloParcela(c) {
  if (c.parcela && c.parcela.de) return c.parcela.n + ' de ' + c.parcela.de
  const m = /parcela\s*(\d+)\/(\d+)/i.exec(c.descricao || '')
  if (m) return m[1] + ' de ' + m[2]
  return '—'
}
const semParcela = (d) => ('' + (d || '')).replace(/\s*—\s*parcela\s*\d+\/\d+\s*$/i, '')

/** A situação sai do estado + do vencimento, como no painel. */
function situacaoConta(c, hoje) {
  if (c.situacao) return c.situacao
  if (c.cancelada) return 'cancelada'
  const pago = Number(c.valorPago) || 0
  if (pago >= Number(c.valor)) return c.direcao === 'receber' ? 'recebida' : 'paga'
  if (pago > 0) return 'parcial'
  return (c.vencimento || '') < (hoje || '') ? 'vencida' : 'pendente'
}
const saldoDaConta = (c) => Math.max(0, (Number(c.valor) || 0) - (Number(c.valorPago) || 0))

/** ⛔ Conta ESTORNADA ou CANCELADA sai da régua (painel, 09/09/2026): a venda por trás
 *  deixou de existir. Ficava na lista com "(previsto)" ao lado, prometendo dinheiro que
 *  ninguém vai depositar. Ela continua no banco — é lá que o histórico do estorno
 *  explica a diferença. */
function contaNaRegua(c) {
  const s = c && (c.situacao || (c.cancelada ? 'cancelada' : ''))
  return s !== 'estornada' && s !== 'estornado' && s !== 'cancelada' && s !== 'cancelado'
}

// ── Vendas ──────────────────────────────────────────────────────────────────
function abaVendas(d, estado) {
  const todas = d.vendas || []
  const termo = (estado.buscaFin || '').trim().toLowerCase()
  const situacao = estado.filtroFin || 'todas'
  const vendas = todas.filter((v) => {
    if (situacao === 'pagas' && v.financeiro !== 'Pago') return false
    if (situacao === 'pendentes' && v.financeiro === 'Pago') return false
    if (!termo) return true
    return ('#' + v.numero + ' ' + (v.cliente || '')).toLowerCase().indexOf(termo) >= 0
  })
  const soma = (campo) => vendas.reduce((s, v) => s + (Number(v[campo]) || 0), 0)

  const kpis = faixaKpis([
    { r: 'Vendas', v: String(vendas.length), s: d.rotuloPeriodo || '' },
    { r: 'Produtos', v: brl(soma('produtos')), s: 'itens, já com desconto' },
    { r: 'Taxa de serviço', v: brl(soma('servico')), s: 'atendimento (garçom)' },
    { r: 'Taxa de entrega', v: brl(soma('entrega')), s: 'repasse ao entregador' },
    { r: 'Descontos', v: brl(soma('desconto')), s: 'concedidos', c: soma('desconto') ? '#b42318' : '#111' },
    { r: 'Total', v: brl(soma('total')), s: d.rotuloPeriodo || '', c: 'var(--acento-texto)' },
  ])

  const filtros = segmentado('data-filtro-fin', [
    { chave: 'todas', rotulo: 'Todas as situações' }, { chave: 'pagas', rotulo: 'Pagas' },
    { chave: 'pendentes', rotulo: 'Pendentes' },
  ], situacao) + busca('data-busca-fin', 'Buscar pedido ou cliente…', estado.buscaFin, 210)

  const linhas = vendas.map((v) => ({
    chave: String(v.numero),
    celulas: [
      { texto: dataBr(v.data), sub: v.hora || '' },
      { texto: '#' + String(v.numero).padStart(4, '0'), forte: true, cor: '#111' },
      v.cliente || 'Consumidor',
      v.canal || '—',
      brl(v.produtos), v.servico ? brl(v.servico) : '—', v.entrega ? brl(v.entrega) : '—',
      v.desconto ? '- ' + brl(v.desconto) : '—',
      FORMA[v.pagamento] || v.pagamento || '—',
      { texto: v.financeiro || '—', etiqueta: v.financeiro === 'Pago' ? 'verde' : 'amarelo' },
      v.pedido || '—',
      { texto: brl(v.total), forte: true, cor: '#111' },
    ],
  }))

  const corpo = vendas.length
    ? L.apenasGrade({
      colunas: ['Data', 'Venda', 'Cliente', 'Canal', 'Produtos', 'Serviço', 'Entrega', 'Desconto',
        'Pagamento', 'Financeiro', 'Pedido', 'Total'],
      grade: '110px 90px 1fr 110px 110px 100px 100px 110px 120px 110px 110px 120px',
      direita: [4, 5, 6, 7, 11],
    }, linhas)
      + '<div style="display:flex;justify-content:space-between;gap:12px;padding:12px 0 0;font-size:13px;'
      + 'font-weight:800;color:#111"><span>Total de ' + vendas.length + ' venda(s)</span>'
      + '<span>' + esc(brl(soma('total'))) + '</span></div>'
    : '<div class="evazio">Nenhuma venda no período com esses filtros.</div>'

  return kpis + cartao('Vendas · ' + (d.rotuloPeriodo || ''), filtros,
    '<div style="padding:18px">' + corpo + '</div>', 0.05)
}

// ── Extrato e Livro caixa ───────────────────────────────────────────────────
function filtrarMovimentos(linhas, e) {
  const termo = (e.buscaFin || '').trim().toLowerCase()
  return (linhas || []).filter((l) => {
    if (e.direcaoFin && e.direcaoFin !== 'todas' && l.direcao !== e.direcaoFin) return false
    if (e.categoriaFin && e.categoriaFin !== 'todas' && l.categoria !== e.categoriaFin) return false
    if (e.formaFin && e.formaFin !== 'todas' && l.forma !== e.formaFin) return false
    if (e.origemFin && e.origemFin !== 'todas' && l.origemTipo !== e.origemFin) return false
    if (e.usuarioFin && e.usuarioFin !== 'todos' && l.usuario !== e.usuarioFin) return false
    if (!termo) return true
    return ((l.descricao || '') + ' ' + (l.origem || '')).toLowerCase().indexOf(termo) >= 0
  })
}
function totaisMovimento(linhas) {
  const entradas = linhas.filter((l) => l.direcao === 'entrada' && !l.estornado)
    .reduce((s, l) => s + (Number(l.valor) || 0), 0)
  const saidas = linhas.filter((l) => l.direcao === 'saida' && !l.estornado)
    .reduce((s, l) => s + (Number(l.valor) || 0), 0)
  return { entradas, saidas, saldo: entradas - saidas }
}
/** Agrupa por dia com a VENDA DIÁRIA numa linha só — a leitura que o dono pediu. */
function consolidarPorDia(linhas) {
  const dias = {}
  for (const l of linhas) {
    const dia = ('' + (l.data || '')).slice(0, 10)
    if (!dias[dia]) dias[dia] = { dia, entradas: 0, saidas: 0, vendas: [], outras: [] }
    const d = dias[dia]
    if (!l.estornado) {
      if (l.direcao === 'entrada') d.entradas += Number(l.valor) || 0
      else d.saidas += Number(l.valor) || 0
    }
    if (l.categoria === 'venda') d.vendas.push(l)
    else d.outras.push(l)
  }
  return Object.keys(dias).sort().reverse().map((k) => {
    const d = dias[k]
    return {
      dia: d.dia, entradas: d.entradas, saidas: d.saidas, outras: d.outras,
      vendaDiaria: d.vendas.length
        ? { quantidade: d.vendas.length, linhas: d.vendas,
          valor: d.vendas.filter((l) => !l.estornado).reduce((s, l) => s + (Number(l.valor) || 0), 0) }
        : null,
    }
  })
}

function filtrosDeMovimento(linhas, estado, comOperador) {
  const unicos = (campo) => [...new Set(linhas.map((l) => l[campo]).filter(Boolean))]
  const temFiltro = (estado.direcaoFin && estado.direcaoFin !== 'todas')
    || (estado.categoriaFin && estado.categoriaFin !== 'todas')
    || (estado.formaFin && estado.formaFin !== 'todas')
    || (estado.origemFin && estado.origemFin !== 'todas')
    || (estado.usuarioFin && estado.usuarioFin !== 'todos') || estado.buscaFin
  return segmentado('data-direcao-fin', [
    { chave: 'todas', rotulo: 'Tudo' }, { chave: 'entrada', rotulo: 'Entradas' }, { chave: 'saida', rotulo: 'Saídas' },
  ], estado.direcaoFin || 'todas')
    + selecao('data-categoria-fin', [{ chave: 'todas', rotulo: 'Todas as categorias' }]
      .concat(unicos('categoria').map((c) => ({ chave: c, rotulo: CATEGORIA_MOV[c] || c }))), estado.categoriaFin || 'todas')
    + selecao('data-forma-fin', [{ chave: 'todas', rotulo: 'Todas as formas' }]
      .concat(unicos('forma').map((f) => ({ chave: f, rotulo: FORMA[f] || f }))), estado.formaFin || 'todas')
    + (comOperador
      ? selecao('data-usuario-fin', [{ chave: 'todos', rotulo: 'Todos os operadores' }]
        .concat(unicos('usuario').map((u) => ({ chave: u, rotulo: u }))), estado.usuarioFin || 'todos')
      : selecao('data-origem-fin', [{ chave: 'todas', rotulo: 'Todas as origens' }]
        .concat(unicos('origemTipo').map((o) => ({ chave: o, rotulo: ORIGEM[o] || o }))), estado.origemFin || 'todas'))
    + busca('data-busca-fin', comOperador ? 'Buscar histórico…' : 'Buscar descrição ou origem…', estado.buscaFin, 190)
    + (temFiltro ? botao('fin:limpar-filtros', 'Limpar', false, true) : '')
}

function tabelaMovimentos(linhas, totais, comOperador, pagina) {
  const visiveis = linhas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)
  const colunas = comOperador
    ? ['Data', 'Histórico', 'Documento / origem', 'Forma', 'Operador', 'Entrada', 'Saída', 'Saldo']
    : ['Data', 'Descrição', 'Categoria', 'Origem', 'Forma', 'Usuário', 'Entrada', 'Saída', 'Saldo']
  const gradeCss = comOperador
    ? '120px 1fr 170px 120px 120px 120px 120px 130px'
    : '120px 1fr 140px 150px 110px 110px 120px 120px 130px'
  const direita = comOperador ? [5, 6, 7] : [6, 7, 8]
  const linhasTabela = visiveis.map((l) => {
    const entrada = l.direcao === 'entrada' && !l.estornado
      ? { texto: brl(l.valor), forte: true, cor: 'var(--acento-texto)' } : '—'
    const saida = l.direcao === 'saida' && !l.estornado
      ? { texto: brl(l.valor), forte: true, cor: '#b42318' } : '—'
    const descricao = { texto: (l.estornado ? '✗ ' : '') + (l.descricao || ''), cor: l.estornado ? '#9ca3af' : '#111' }
    const comuns = comOperador
      ? [{ texto: dataBr(l.data), sub: l.hora || '' }, descricao, l.origem || '—',
        FORMA[l.forma] || l.forma || '—', l.usuario || '—']
      : [{ texto: dataBr(l.data), sub: l.hora || '' }, descricao,
        { texto: CATEGORIA_MOV[l.categoria] || l.categoria, etiqueta: TOM_CATEGORIA[l.categoria] || 'cinza' },
        l.origem || '—', FORMA[l.forma] || l.forma || '—', l.usuario || '—']
    return { chave: l.id, celulas: comuns.concat([entrada, saida, { texto: brl(l.saldo), forte: true, cor: '#111' }]) }
  })
  return L.apenasGrade({ colunas, grade: gradeCss, direita }, linhasTabela)
    + '<div style="display:grid;grid-template-columns:' + gradeCss + ';gap:0;padding:10px 0 0;'
    + 'font-size:13px;font-weight:800;color:#111">'
    + '<span style="grid-column:span ' + (comOperador ? 5 : 6) + '">Totais do período</span>'
    + '<span style="text-align:right;color:var(--acento-texto);padding:0 10px">' + esc(brl(totais.entradas)) + '</span>'
    + '<span style="text-align:right;color:#b42318;padding:0 10px">' + esc(brl(totais.saidas)) + '</span>'
    + '<span style="text-align:right;padding:0 10px">' + esc(brl(totais.saldo)) + '</span></div>'
}

function tabelaPorDia(dias, abertos) {
  if (!dias.length) return '<div class="evazio">Nenhuma movimentação no período com esses filtros.</div>'
  const grade = '1fr 150px 140px 140px'
  const cel = (t, dir, cor, forte) => '<span style="padding:8px 10px;font-size:13px;'
    + (dir ? 'text-align:right;' : '') + 'font-weight:' + (forte ? 800 : 600) + ';color:' + (cor || '#4b5563')
    + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + t + '</span>'
  const linha = (conteudo, fundo) => '<div style="display:grid;grid-template-columns:' + grade
    + ';border-bottom:1px solid #eef0f3;background:' + (fundo || '#fff') + '">' + conteudo + '</div>'

  const cabecalho = '<div style="display:grid;grid-template-columns:' + grade + ';background:#f4f5f7;'
    + 'border-bottom:1px solid #e5e7eb;font-size:10.5px;font-weight:800;color:#6b7280;text-transform:uppercase;'
    + 'letter-spacing:.05em">'
    + ['Dia / movimentação', 'Categoria'].map((c) => '<span style="padding:8px 10px">' + c + '</span>').join('')
    + ['Entrada', 'Saída'].map((c) => '<span style="padding:8px 10px;text-align:right">' + c + '</span>').join('')
    + '</div>'

  const corpo = dias.map((d) => {
    const aberto = (abertos || []).indexOf(d.dia) >= 0
    let html = linha(cel('<strong>' + esc(dataBr(d.dia)) + '</strong>', false, '#111', true) + cel('')
      + cel(esc(brl(d.entradas)), true, 'var(--acento-texto)', true)
      + cel(esc(brl(d.saidas)), true, '#b42318', true), '#f4f5f7')
    if (d.vendaDiaria) {
      html += '<div data-dia-extrato="' + esc(d.dia) + '" style="display:grid;grid-template-columns:' + grade
        + ';border-bottom:1px solid #eef0f3;background:#fff;cursor:pointer">'
        + cel('<span style="color:#9ca3af;font-weight:800">' + (aberto ? '▾' : '▸') + '</span> Venda diária'
          + '<span style="color:#9ca3af;font-weight:600"> · ' + d.vendaDiaria.quantidade + ' venda'
          + (d.vendaDiaria.quantidade !== 1 ? 's' : '') + '</span>', false, '#111')
        + cel('<span style="font-size:11px;font-weight:800;color:var(--acento-texto);background:var(--acento-suave);'
          + 'border-radius:6px;padding:2px 8px">Venda</span>')
        + cel(esc(brl(d.vendaDiaria.valor)), true, 'var(--acento-texto)', true) + cel('—', true) + '</div>'
      if (aberto) {
        html += d.vendaDiaria.linhas.map((l) => linha(
          cel('<span style="padding-left:24px;color:#9ca3af">' + esc(l.origem || l.descricao) + '</span>'
            + (l.estornado ? ' <span style="font-size:10.5px;font-weight:800;color:#b42318">estornado</span>' : ''))
          + cel(esc(FORMA[l.forma] || l.forma || '—'), false, '#9ca3af')
          + cel(l.estornado ? '—' : esc(brl(l.valor)), true, 'var(--acento-texto)') + cel('—', true))).join('')
      }
    }
    html += d.outras.map((l) => linha(
      cel(esc(l.descricao) + '<span style="color:#9ca3af"> · ' + esc(l.origem || '') + '</span>', false, '#111')
      + cel('<span style="font-size:11px;font-weight:800;color:#6b7280;background:#eef0f3;border-radius:6px;'
        + 'padding:2px 8px">' + esc(CATEGORIA_MOV[l.categoria] || l.categoria) + '</span>')
      + cel(l.direcao === 'entrada' && !l.estornado ? esc(brl(l.valor)) : '—', true, 'var(--acento-texto)')
      + cel(l.direcao === 'saida' && !l.estornado ? esc(brl(l.valor)) : '—', true, '#b42318'))).join('')
    return html
  }).join('')

  return '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">' + cabecalho + corpo + '</div>'
}

function abaExtrato(d, estado) {
  const todas = d.extrato || []
  const linhas = filtrarMovimentos(todas, estado)
  const totais = totaisMovimento(linhas)
  const modo = estado.modoExtrato === 'detalhado' ? 'detalhado' : 'dia'
  const pagina = Math.min(Number(estado.paginaFin) || 0, Math.max(0, Math.ceil(linhas.length / POR_PAGINA) - 1))

  const kpis = faixaKpis([
    { r: 'Entradas', v: '+ ' + brl(totais.entradas), s: 'no período', c: 'var(--acento-texto)' },
    { r: 'Saídas', v: '− ' + brl(totais.saidas), s: 'no período', c: '#b42318' },
    { r: 'Saldo do período', v: brl(totais.saldo), s: 'entradas menos saídas', c: totais.saldo >= 0 ? 'var(--acento-texto)' : '#b42318' },
    { r: 'Movimentações', v: String(linhas.length), s: d.rotuloPeriodo || '' },
  ])

  const acoes = segmentado('data-modo-extrato', [
    { chave: 'dia', rotulo: 'Por dia' }, { chave: 'detalhado', rotulo: 'Detalhado' },
  ], modo) + filtrosDeMovimento(todas, estado, false)

  const corpo = modo === 'dia'
    ? '<div style="padding:18px">' + tabelaPorDia(consolidarPorDia(linhas), estado.diasAbertos) + '</div>'
    : (linhas.length
      ? '<div style="padding:18px">' + tabelaMovimentos(linhas, totais, false, pagina) + '</div>' + paginacao(pagina, linhas.length)
      : '<div class="evazio">Nenhuma movimentação no período com esses filtros.</div>')

  return kpis + cartao('Extrato financeiro', acoes, corpo, 0.05)
}

function abaLivroCaixa(d, estado) {
  const todas = d.livroCaixa || []
  const linhas = filtrarMovimentos(todas, estado)
  const totais = totaisMovimento(linhas)
  const pagina = Math.min(Number(estado.paginaFin) || 0, Math.max(0, Math.ceil(linhas.length / POR_PAGINA) - 1))
  const porForma = {}
  todas.filter((l) => l.categoria === 'venda' && !l.estornado)
    .forEach((l) => { porForma[l.forma] = (porForma[l.forma] || 0) + (Number(l.valor) || 0) })

  const kpis = faixaKpis([
    { r: 'Vendas em dinheiro', v: brl(porForma.dinheiro || 0), s: 'na gaveta' },
    { r: 'Vendas em PIX', v: brl(porForma.pix || 0), s: 'no período' },
    { r: 'Vendas em cartão', v: brl((porForma.cartao || 0) + (porForma.credito || 0) + (porForma.debito || 0)), s: 'no período' },
  ].concat(porForma.a_receber ? [{ r: 'A receber (repasse)', v: brl(porForma.a_receber), s: 'não está na gaveta', c: '#8a6508' }] : [])
    .concat([
      { r: 'Entradas', v: brl(totais.entradas), s: 'no movimento', c: 'var(--acento-texto)' },
      { r: 'Saídas', v: brl(totais.saidas), s: 'no movimento', c: '#b42318' },
      { r: 'Saldo do movimento', v: brl(totais.saldo), s: 'o que deve estar na gaveta', c: totais.saldo >= 0 ? 'var(--acento-texto)' : '#b42318' },
    ]))

  const corpo = linhas.length
    ? '<div style="padding:18px">' + tabelaMovimentos(linhas, totais, true, pagina) + '</div>' + paginacao(pagina, linhas.length)
    : '<div class="evazio">Nenhuma movimentação de gaveta no período.</div>'

  return kpis + cartao('Livro Caixa · ' + (d.rotuloPeriodo || ''),
    filtrosDeMovimento(todas, estado, true), corpo, 0.05)
}

// ── Contas a pagar e a receber ──────────────────────────────────────────────
const TIPOS_PAGAR = [
  { chave: 'todas', rotulo: 'Todos os tipos' }, { chave: 'fixa', rotulo: 'Fixas (todo mês)' },
  { chave: 'parcelada', rotulo: 'Fornecedores' }, { chave: 'imposto', rotulo: 'Impostos' },
  { chave: 'avulsa', rotulo: 'Avulsas' },
]
const TIPOS_RECEBER = [
  { chave: 'todas', rotulo: 'Todos os tipos' }, { chave: 'repasse', rotulo: 'Repasses (cartão/iFood)' },
  { chave: 'parcelada', rotulo: 'Clientes parcelados' }, { chave: 'fixa', rotulo: 'Fixas (todo mês)' },
  { chave: 'avulsa', rotulo: 'Avulsas / fiado' },
]

function resumoContas(contas, mes, hoje) {
  const doMes = contas.filter((c) => ('' + c.vencimento).slice(0, 7) === mes)
  const soma = (lista) => lista.reduce((s, c) => s + (Number(c.valor) || 0), 0)
  // Vencida NUNCA some: entra no resumo mesmo se o vencimento é de outro mês.
  const vencidas = contas.filter((c) => situacaoConta(c, hoje) === 'vencida')
  const aVencer = doMes.filter((c) => situacaoConta(c, hoje) === 'pendente')
  const quitadas = doMes.filter((c) => ['paga', 'recebida'].indexOf(situacaoConta(c, hoje)) >= 0)
  const emAberto = contas.filter((c) => ['pendente', 'vencida', 'parcial'].indexOf(situacaoConta(c, hoje)) >= 0)
  return {
    vencidas: { qtd: vencidas.length, valor: soma(vencidas) },
    aVencer: { qtd: aVencer.length, valor: soma(aVencer) },
    quitadas: { qtd: quitadas.length, valor: soma(quitadas) },
    totalMes: { qtd: doMes.length, valor: soma(doMes) },
    emAberto: { qtd: emAberto.length, valor: emAberto.reduce((s, c) => s + saldoDaConta(c), 0) },
  }
}

function barraDeMes(mes, tipos, estado, direcao) {
  const situacoes = direcao === 'receber'
    ? [{ chave: 'todas', rotulo: 'Todas' }, { chave: 'abertas', rotulo: 'Em aberto' },
      { chave: 'vencidas', rotulo: 'Atrasadas' }, { chave: 'quitadas', rotulo: 'Recebidas' }]
    : [{ chave: 'todas', rotulo: 'Todas' }, { chave: 'abertas', rotulo: 'Em aberto' },
      { chave: 'vencidas', rotulo: 'Vencidas' }, { chave: 'quitadas', rotulo: 'Pagas' }]
  return '<div class="ecard" style="padding:10px 14px;margin-bottom:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<button type="button" data-mes-fin="' + esc(somaMes(mes, -1)) + '" style="height:30px;width:30px;'
    + 'border:1px solid #e5e7eb;border-radius:9px;background:#fff;cursor:pointer;font-family:inherit">‹</button>'
    + '<span style="font-size:13px;font-weight:800;color:#111;min-width:150px;text-align:center">' + esc(mesLabel(mes)) + '</span>'
    + '<button type="button" data-mes-fin="' + esc(somaMes(mes, 1)) + '" style="height:30px;width:30px;'
    + 'border:1px solid #e5e7eb;border-radius:9px;background:#fff;cursor:pointer;font-family:inherit">›</button>'
    + selecao('data-situacao-conta', situacoes, estado.situacaoConta || 'todas', 150)
    + selecao('data-tipo-conta', tipos, estado.tipoConta || 'todas', 190)
    + busca('data-busca-fin', direcao === 'receber'
      ? 'Buscar descrição, cliente, origem…' : 'Buscar descrição, fornecedor, categoria…', estado.buscaFin, 240)
    + '<span style="margin-left:auto">' + botao('conta:nova:' + direcao, '+ Nova conta', true) + '</span></div>'
}

function filtrarContas(contas, mes, estado, hoje) {
  const termo = (estado.buscaFin || '').trim().toLowerCase()
  const sit = estado.situacaoConta || 'todas'
  const tipo = estado.tipoConta || 'todas'
  return contas.filter((c) => {
    const s = situacaoConta(c, hoje)
    // O mês manda, MENOS para o que está em atraso: conta vencida (ou paga pela metade
    // e já vencida) continua aparecendo até ser quitada — some do mês dela seria a
    // melhor forma de esquecer de pagar.
    const doMes = ('' + c.vencimento).slice(0, 7) === mes
    const atrasada = s === 'vencida' || (s === 'parcial' && ('' + c.vencimento) < ('' + hoje))
    if (!doMes && !atrasada) return false
    if (sit === 'abertas' && ['pendente', 'vencida', 'parcial'].indexOf(s) < 0) return false
    if (sit === 'vencidas' && s !== 'vencida') return false
    if (sit === 'quitadas' && ['paga', 'recebida'].indexOf(s) < 0) return false
    if (tipo !== 'todas' && (c.tipo || 'avulsa') !== tipo) return false
    if (!termo) return true
    return [c.descricao, c.contraparte, c.categoria].join(' ').toLowerCase().indexOf(termo) >= 0
  }).sort((a, b) => ('' + a.vencimento).localeCompare('' + b.vencimento))
}

function abaContas(d, estado, direcao) {
  const hoje = d.hoje || new Date().toISOString().slice(0, 10)
  const mes = estado.mesConta || hoje.slice(0, 7)
  const todas = (d.contas || []).filter((c) => c.direcao === direcao && contaNaRegua(c))
  const resumo = resumoContas(todas, mes, hoje)
  const lista = filtrarContas(todas, mes, estado, hoje)
  const emAbertoNaLista = lista.filter((c) => ['pendente', 'vencida', 'parcial'].indexOf(situacaoConta(c, hoje)) >= 0)
    .reduce((s, c) => s + saldoDaConta(c), 0)

  const kpis = faixaKpis(direcao === 'pagar'
    ? [
      { r: 'Vencidas', v: brl(resumo.vencidas.valor), s: resumo.vencidas.qtd + ' conta(s)', c: resumo.vencidas.qtd ? '#b42318' : 'var(--acento-texto)' },
      { r: 'A vencer em ' + mesLabel(mes), v: brl(resumo.aVencer.valor), s: resumo.aVencer.qtd + ' conta(s)', c: '#8a6508' },
      { r: 'Pagas em ' + mesLabel(mes), v: brl(resumo.quitadas.valor), s: resumo.quitadas.qtd + ' conta(s)', c: 'var(--acento-texto)' },
      { r: 'Total do mês ' + mesLabel(mes), v: brl(resumo.totalMes.valor),
        s: resumo.totalMes.qtd + ' conta(s) · pago + a pagar', c: '#1d4ed8' },
    ]
    : [
      { r: 'Atrasadas', v: brl(resumo.vencidas.valor), s: resumo.vencidas.qtd + ' conta(s)', c: resumo.vencidas.qtd ? '#b42318' : 'var(--acento-texto)' },
      { r: 'A receber em ' + mesLabel(mes), v: brl(resumo.aVencer.valor), s: resumo.aVencer.qtd + ' conta(s)', c: '#8a6508' },
      { r: 'Recebidas em ' + mesLabel(mes), v: brl(resumo.quitadas.valor), s: resumo.quitadas.qtd + ' conta(s)', c: 'var(--acento-texto)' },
      // Era "Total previsto": mostrava previsão num mês em que tudo já tinha sido
      // recebido. É o total do MÊS — o que entrou mais o que falta entrar.
      { r: 'Total do mês ' + mesLabel(mes), v: brl(resumo.totalMes.valor),
        s: resumo.totalMes.qtd + ' conta(s) · recebido + a receber', c: '#1d4ed8' },
      { r: 'Em aberto (todos os meses)', v: brl(resumo.emAberto.valor), s: resumo.emAberto.qtd + ' conta(s) · igual à Visão geral', c: resumo.emAberto.qtd ? '#8a6508' : 'var(--acento-texto)' },
    ])

  // Repasses previstos: cartão e marketplace não caem na conta na hora da venda.
  const repasses = direcao === 'receber' ? (d.repasses || []) : []
  const cartaoRepasses = repasses.length
    ? cartao('Repasses previstos — ' + mesLabel(mes), '',
      '<div style="padding:18px">' + L.apenasGrade({
        colunas: ['Data prevista', 'Origem', 'Vendas', 'Valor do repasse', ''],
        grade: '150px 1fr 150px 170px 190px', direita: [2, 3],
      }, repasses.map((r) => ({
        chave: r.origem + r.dataPrevista,
        celulas: [dataBr(r.dataPrevista), r.origem, brl(r.vendas),
          { texto: brl(r.valor), forte: true, cor: 'var(--acento-texto)' },
          { html: botao('conta:receber-repasse:' + r.origem, 'Recebi este repasse', true, true) }],
      }))) + '</div>', 0.05) + '<div style="height:14px"></div>'
    : ''

  const linhas = lista.map((c) => {
    const s = situacaoConta(c, hoje)
    const info = SITUACAO_CONTA[s] || SITUACAO_CONTA.pendente
    const saldo = saldoDaConta(c)
    const pagamento = ['paga', 'recebida'].indexOf(s) >= 0
      ? (FORMA[c.forma] || c.forma || '—') + ' em ' + dataBr(c.liquidadoEm)
      : (c.forma ? (FORMA[c.forma] || c.forma) + ' (previsto)' : '—')
    const acoes = ['pendente', 'vencida', 'parcial'].indexOf(s) >= 0
      ? botao((direcao === 'pagar' ? 'conta:liquidar:' : 'conta:receber:') + c.id,
        direcao === 'pagar' ? 'Liquidar' : 'Receber', true, true)
      : '<span style="font-size:11.5px;color:#9ca3af;font-weight:700">—</span>'
    const celulas = [
      { texto: dataBr(c.vencimento) + (c.serie ? ' ↻' : ''), forte: s === 'vencida', cor: s === 'vencida' ? '#b42318' : '#4b5563' },
      rotuloParcela(c),
      { texto: semParcela(c.descricao), sub: c.temNota ? 'nota fiscal anexada' : (c.observacao || ''), cor: '#111' },
      c.contraparte || '—',
      c.categoria || '—',
      { texto: brl(c.valor), forte: true, cor: '#111' },
    ]
    if (direcao === 'receber') celulas.push(c.valorLiquido != null ? brl(c.valorLiquido) : '—')
    celulas.push(saldo > 0
      ? { texto: brl(saldo), forte: true, sub: Number(c.valorPago) ? 'pago ' + brl(c.valorPago) : '', cor: '#111' }
      : '—')
    celulas.push({ texto: info.rotulo, etiqueta: info.etiqueta })
    celulas.push(pagamento)
    celulas.push({ html: acoes })
    return { chave: c.id, celulas }
  })

  const colunas = direcao === 'receber'
    ? ['Vencimento', 'Parcela', 'Descrição', 'Cliente / origem', 'Categoria', 'Valor', 'Valor líquido', 'Saldo', 'Situação', 'Recebimento', '']
    : ['Vencimento', 'Sequência', 'Descrição', 'Fornecedor', 'Categoria', 'Valor', 'Saldo', 'Situação', 'Pagamento', '']
  const gradeCss = direcao === 'receber'
    ? '120px 90px 1fr 160px 130px 120px 120px 120px 110px 150px 120px'
    : '120px 100px 1fr 170px 140px 120px 120px 110px 160px 120px'
  const direita = direcao === 'receber' ? [5, 6, 7] : [5, 6]

  const corpo = lista.length
    ? '<div style="padding:18px">' + L.apenasGrade({ colunas, grade: gradeCss, direita }, linhas) + '</div>'
    : '<div class="evazio">Nenhuma conta neste mês com esses filtros.</div>'

  const titulo = (direcao === 'pagar' ? 'Contas a pagar — ' : 'Contas a receber — ') + mesLabel(mes)
  const nota = '<span style="font-size:12.5px;color:#9ca3af;font-weight:600">Em aberto na lista: '
    + '<strong style="color:#111">' + esc(brl(emAbertoNaLista)) + '</strong></span>'

  return kpis + barraDeMes(mes, direcao === 'pagar' ? TIPOS_PAGAR : TIPOS_RECEBER, estado, direcao)
    + cartaoRepasses + cartao(titulo, nota, corpo, 0.09)
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
    + 'anexar nota, estornar baixa e conta fixa mensal ainda são pelo painel</div>'
}

// ── DRE ─────────────────────────────────────────────────────────────────────
function abaDre(d, estado) {
  const dre = d.dre || {}
  const linhas = dre.linhas || []
  if (!linhas.length) {
    return aviso('Sem dados no período. Não há vendas nem despesas lançadas para montar o resultado.')
  }
  const abertas = estado.dreAbertas || []

  const kpis = faixaKpis([
    { r: 'Receita bruta', v: brl(dre.receitaBruta), s: 'o que o cliente pagou' },
    { r: 'Receita líquida', v: brl(dre.receitaLiquida), s: 'base das margens', c: 'var(--acento-texto)' },
    { r: 'Lucro bruto', v: brl(dre.lucroBruto), s: dre.margemBruta != null ? dre.margemBruta + '% da receita líquida' : '',
      c: (dre.lucroBruto || 0) >= 0 ? 'var(--acento-texto)' : '#b42318' },
    { r: 'Resultado operacional', v: brl(dre.resultadoOperacional), s: 'depois das despesas',
      c: (dre.resultadoOperacional || 0) >= 0 ? 'var(--acento-texto)' : '#b42318' },
    { r: 'Resultado do período', v: brl(dre.resultadoPeriodo), s: dre.margemLiquida != null ? dre.margemLiquida + '% de margem' : '',
      c: (dre.resultadoPeriodo || 0) >= 0 ? 'var(--acento-texto)' : '#b42318' },
  ])

  const linhaDre = (l) => {
    const temFilhas = (l.filhas || []).length > 0
    const aberta = abertas.indexOf(l.chave) >= 0
    const negativo = Number(l.valor) < 0
    const total = l.nivel === 'total'
    return '<div' + (temFilhas ? ' data-dre="' + esc(l.chave) + '"' : '')
      + ' style="display:grid;grid-template-columns:1fr 120px 160px;align-items:center;gap:10px;'
      + 'padding:' + (total ? '12px 18px' : '9px 18px') + ';border-bottom:1px solid #eef0f3;'
      + (total ? 'background:#f4f5f7;' : '') + (temFilhas ? 'cursor:pointer;' : '') + '">'
      + '<span style="font-size:' + (total ? 14 : 13) + 'px;font-weight:' + (total ? 800 : 600) + ';color:#111">'
      + (temFilhas ? '<span style="color:#9ca3af;font-weight:800">' + (aberta ? '▾' : '▸') + '</span> ' : '')
      + esc(l.label) + '</span>'
      + '<span style="font-size:12px;font-weight:700;color:#9ca3af;text-align:right">'
      + (l.pct != null ? l.pct + '%' : '') + '</span>'
      + '<span style="font-size:' + (total ? 14 : 13) + 'px;font-weight:800;text-align:right;color:'
      + (negativo ? '#b42318' : '#111') + '">' + (negativo ? '− ' : '') + esc(brl(Math.abs(Number(l.valor) || 0))) + '</span>'
      + '</div>'
      + (aberta ? (l.filhas || []).map((f) => '<div style="display:grid;grid-template-columns:1fr 120px 160px;'
        + 'align-items:center;gap:10px;padding:7px 18px 7px 40px;border-bottom:1px solid #f4f5f7;background:#fbfcfd">'
        + '<span style="font-size:12.5px;font-weight:600;color:#6b7280">' + esc(f.label) + '</span>'
        + '<span style="font-size:11.5px;font-weight:700;color:#9ca3af;text-align:right">'
        + (f.pct != null ? f.pct + '%' : '') + '</span>'
        + '<span style="font-size:12.5px;font-weight:700;text-align:right;color:'
        + (Number(f.valor) < 0 ? '#b42318' : '#4b5563') + '">'
        + (Number(f.valor) < 0 ? '− ' : '') + esc(brl(Math.abs(Number(f.valor) || 0))) + '</span></div>').join('') : '')
  }

  const centros = (dre.porCentroCusto || []).length
    ? cartao('Despesas por centro de custo', '',
      '<div style="padding:18px">' + L.apenasGrade({
        colunas: ['Centro de custo', 'Principais categorias', 'Participação', 'Total'],
        grade: '1fr 1fr 180px 150px', direita: [3],
      }, (dre.porCentroCusto || []).map((c) => ({
        chave: c.centro,
        celulas: [{ texto: c.label, forte: true, cor: '#111' },
          (c.categorias || []).slice(0, 3).join(' · '),
          { html: '<span style="display:flex;align-items:center;gap:8px;width:100%">'
            + '<span style="flex:1;height:7px;border-radius:4px;background:#eef0f3;overflow:hidden">'
            + '<span style="display:block;height:100%;width:' + (Number(c.participacao) || 0) + '%;'
            + 'background:#7C3AED;border-radius:4px"></span></span>'
            + '<span style="font-size:12px;font-weight:700;color:#9ca3af">' + (Number(c.participacao) || 0) + '%</span></span>' },
          { texto: brl(c.valor), forte: true, cor: '#b42318' }],
      }))) + '</div>', 0.09)
    : ''

  return kpis + cartao('Demonstração de resultado · ' + (d.rotuloPeriodo || ''), '',
    linhas.map(linhaDre).join(''), 0.05)
    + (centros ? '<div style="height:18px"></div>' + centros : '')
}

// ── Despesas ────────────────────────────────────────────────────────────────
//
// ⛔ DESPESA NÃO É CONTA A PAGAR (regra do dono no painel, 09/09/2026): conta a pagar é
// a OBRIGAÇÃO — quanto devo, para quando, se já paguei. Despesa é o GASTO — o que saiu,
// para quem, e se o documento fiscal chegou. Por isso aqui NÃO existe coluna de
// pagamento, botão de pagar, nem a palavra "vencimento": isso é a aba vizinha, que lê a
// mesma tabela pelo outro ângulo. A rota só entrega gasto de SERVIÇO, então uma linha
// nunca aparece nas duas.
const FISCAL_DESPESA = {
  documentada: { rotulo: 'NF registrada', etiqueta: 'verde' },
  pendente: { rotulo: 'Pendente de NFS-e', etiqueta: 'amarelo' },
  nao_se_aplica: { rotulo: '—', etiqueta: 'cinza' },
}

function abaDespesas(d, estado) {
  const linhas = d.despesas || []
  const r = d.resumoDespesas || {}
  const total = r.total != null ? r.total : linhas.reduce((s, x) => s + (Number(x.valor) || 0), 0)
  const documentado = r.documentado != null ? r.documentado
    : linhas.filter((x) => x.fiscal === 'documentada').reduce((s, x) => s + (Number(x.valor) || 0), 0)
  const pendente = r.pendente != null ? r.pendente
    : linhas.filter((x) => x.fiscal === 'pendente').reduce((s, x) => s + (Number(x.valor) || 0), 0)
  const qtdPendente = r.qtdPendente != null ? r.qtdPendente : linhas.filter((x) => x.fiscal === 'pendente').length

  const kpis = faixaKpis([
    { r: 'Total', v: brl(total), s: linhas.length + ' despesa(s)' },
    { r: 'Com nota fiscal', v: brl(documentado), s: 'documento chegou', c: 'var(--acento-texto)' },
    { r: 'Pendente de NFS-e' + (qtdPendente ? ' · ' + qtdPendente : ''), v: brl(pendente), s: 'falta o documento', c: '#8a6508' },
  ])

  const corpo = linhas.length
    ? '<div style="padding:18px">' + L.apenasGrade(
      { colunas: ['Data', 'Descrição', 'Prestador', 'Valor', 'Nota fiscal'],
        grade: '120px 1fr 220px 140px 180px', direita: [3] },
      linhas.map((x) => {
        const f = FISCAL_DESPESA[x.fiscal] || FISCAL_DESPESA.nao_se_aplica
        return { chave: x.id, celulas: [
          dataBr(x.data), { texto: x.descricao || '—', cor: '#111' }, x.prestador || '—',
          { texto: brl(x.valor), forte: true, cor: '#111' },
          x.fiscal === 'nao_se_aplica' ? '—' : { texto: f.rotulo, etiqueta: f.etiqueta },
        ] }
      }),
    ) + '</div>'
    : '<div class="evazio">Nenhuma despesa de serviço lançada. Gasto com prestador — entregador, contador, manutenção — aparece aqui.</div>'

  return kpis + cartao('Despesas', '', corpo, 0.05)
}

// ── Contas bancárias ────────────────────────────────────────────────────────
//
// De onde sai cada pagamento. O quadro do período sai do MESMO extrato da aba Extrato
// (regime de caixa): não é saldo de banco, é o que passou por aqui no período escolhido.
// Cartão de crédito tem ciclo — é ele que junta as compras numa fatura só.
const TIPO_CONTA = { banco: 'Banco', caixa: 'Caixa/carteira', cartao_credito: 'Cartão de crédito',
  poupanca: 'Poupança', outro: 'Outra' }

function abaBancos(d, estado) {
  const contas = d.bancos || []
  const linhas = d.movimentoPorConta || []
  const soma = (campo) => linhas.reduce((s, l) => s + (Number(l[campo]) || 0), 0)
  const entradas = soma('entradas'), saidas = soma('saidas')

  const kpis = faixaKpis([
    { r: 'Contas cadastradas', v: String(contas.length), s: 'onde o dinheiro passa' },
    { r: 'Entrou no período', v: brl(entradas), s: d.rotuloPeriodo || '', c: 'var(--acento-texto)' },
    { r: 'Saiu no período', v: brl(saidas), s: d.rotuloPeriodo || '', c: '#b42318' },
    { r: 'Saldo do período', v: brl(entradas - saidas), s: 'entrou menos saiu',
      c: entradas - saidas >= 0 ? 'var(--acento-texto)' : '#b42318' },
  ])

  const cadastro = contas.length
    ? L.apenasGrade(
      { colunas: ['Conta', 'Tipo', 'Movimentos', 'Entrou', 'Saiu', 'Saldo'],
        grade: '1fr 240px 130px 140px 140px 140px', direita: [2, 3, 4, 5] },
      contas.map((c) => {
        const m = linhas.find((l) => l.id === c.id) || {}
        const ciclo = c.diaFechamento && c.diaVencimento
          ? ' · fecha dia ' + c.diaFechamento + ', vence dia ' + c.diaVencimento : ''
        const saldo = (Number(m.entradas) || 0) - (Number(m.saidas) || 0)
        return { chave: c.id, celulas: [
          { texto: c.nome, forte: true, cor: '#111' },
          (TIPO_CONTA[c.tipo] || c.tipo || '—') + ciclo,
          String(m.movimentos || 0),
          { texto: brl(m.entradas || 0), cor: 'var(--acento-texto)' },
          { texto: brl(m.saidas || 0), cor: '#b42318' },
          { texto: brl(saldo), forte: true, cor: saldo >= 0 ? '#111' : '#b42318' },
        ] }
      }),
    )
    : '<div class="evazio">Nenhuma conta cadastrada. É ela que preenche o campo "saiu de qual conta" na baixa — '
      + 'pagamento em dinheiro não pede conta, sai da gaveta do caixa.</div>'

  return kpis + cartao('Movimento por conta' + (d.rotuloPeriodo ? ' · ' + d.rotuloPeriodo : ''), '',
    '<div style="padding:18px">' + cadastro + '</div>', 0.05)
}

/** Ponto de entrada: a aba escolhida manda. */
function htmlFinanceiro(dados, estado) {
  estado = estado || {}
  if (!dados) return aviso('Sem dados ainda. Quando o app falar com o painel, esta tela aparece aqui.')
  const aba = estado.aba || 'visao'
  if (aba === 'vendas') return abaVendas(dados, estado)
  if (aba === 'extrato') return abaExtrato(dados, estado)
  if (aba === 'livro') return abaLivroCaixa(dados, estado)
  if (aba === 'despesas') return abaDespesas(dados, estado)
  if (aba === 'pagar') return abaContas(dados, estado, 'pagar')
  if (aba === 'receber') return abaContas(dados, estado, 'receber')
  if (aba === 'dre') return abaDre(dados, estado)
  if (aba === 'bancos') return abaBancos(dados, estado)
  return null   // 'visao' tem tela própria (telas-principais.js)
}

module.exports = {
  htmlFinanceiro, mesLabel, somaMes, dataBr, rotuloParcela, situacaoConta, saldoDaConta,
  filtrarMovimentos, totaisMovimento, consolidarPorDia, resumoContas, filtrarContas,
  CATEGORIA_MOV, FORMA, ORIGEM, SITUACAO_CONTA, POR_PAGINA, FISCAL_DESPESA, TIPO_CONTA, contaNaRegua,
}
