// renderer/elo/telas-abas.js — as três telas que têm seções por dentro, com as
// MESMAS abas do painel: Financeiro (PainelFinanceiro.tsx), Atendimento
// (PainelAtendimento.tsx) e Gestão (EstoqueTabs.tsx).
//
// Cada aba reaproveita o que já existe: o formato de lista, os gráficos e os cartões.
// Aba sem dado ainda diz isso — não desenha tabela vazia fingindo conteúdo.

const L = require('./tela-lista')
const G = require('./graficos')
const Abas = require('./abas')
const Operacao = require('./tela-operacao')

const esc = L.esc
function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const ETIQ = { Pago: 'verde', Pendente: 'amarelo', Vencido: 'vermelho', 'A vencer': 'amarelo', Liquidado: 'verde',
  Aberta: 'amarelo', Atendida: 'verde', Recusada: 'vermelho', Ativa: 'verde', Inativa: 'cinza', Entrada: 'verde', Saída: 'vermelho',
  Perda: 'vermelho', Ajuste: 'amarelo', Produção: 'verde', 'Consumo interno': 'amarelo',
  'A conferir': 'amarelo', Conferida: 'verde' }
const et = (t) => ({ texto: t, etiqueta: ETIQ[t] || 'cinza' })

const ABAS = {
  '/admin/financeiro': [
    { chave: 'visao', rotulo: 'Visão geral' }, { chave: 'vendas', rotulo: 'Vendas' },
    { chave: 'extrato', rotulo: 'Extrato' }, { chave: 'livro', rotulo: 'Livro caixa' },
    { chave: 'pagar', rotulo: 'Contas a pagar' }, { chave: 'receber', rotulo: 'Contas a receber' },
    { chave: 'dre', rotulo: 'DRE' },
  ],
  '/admin/atendimento': [
    { chave: 'salao', rotulo: 'Salão' }, { chave: 'solicitacoes', rotulo: 'Solicitações' },
    { chave: 'gorjetas', rotulo: 'Gorjetas' }, { chave: 'relatorios', rotulo: 'Relatórios' },
    { chave: 'controle', rotulo: 'Controle' }, { chave: 'taxas', rotulo: 'Taxas' },
    { chave: 'app', rotulo: 'App do garçom' },
  ],
  '/admin/estoque': [
    { chave: 'produtos', rotulo: 'Produtos' }, { chave: 'entrada', rotulo: 'Nota fiscal (entrada)' },
    { chave: 'saida', rotulo: 'Nota fiscal (saída)' }, { chave: 'movimentacoes', rotulo: 'Movimentações' },
    { chave: 'fichas', rotulo: 'Fichas técnicas' }, { chave: 'fornecedores', rotulo: 'Fornecedores' },
  ],
}

function cartaoKpi(k) {
  return '<div class="ecard" style="padding:13px 20px;min-width:0">'
    + '<div style="font-size:11.5px;font-weight:700;color:#6b7280;margin-bottom:6px">' + esc(k.rotulo) + '</div>'
    + '<div style="font-size:22px;font-weight:800;color:' + (k.cor || '#111') + ';letter-spacing:-.02em;line-height:1">' + esc(k.valor) + '</div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:5px">' + esc(k.sub || '') + '</div></div>'
}
function faixaKpis(lista) {
  return '<div style="display:grid;grid-template-columns:repeat(' + Math.min(lista.length, 4) + ',minmax(0,1fr));gap:18px;margin-bottom:18px">'
    + lista.map(cartaoKpi).join('') + '</div>'
}
function cartao(titulo, sub, conteudo) {
  return '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .05s both">'
    + '<div style="margin-bottom:18px"><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">' + esc(titulo) + '</div>'
    + (sub ? '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(sub) + '</div>' : '') + '</div>' + conteudo + '</div>'
}
function grade(colunas, linhas, gradeCss, direita) {
  return L.apenasGrade({ colunas, grade: gradeCss, direita: direita || [] }, linhas)
}
const aviso = (t) => '<div class="ecard"><div class="evazio">' + esc(t) + '</div></div>'

// ── Financeiro ──────────────────────────────────────────────────────────────
// As sete abas moraram aqui até 07/09 como cinco tabelas parecidas. Agora cada uma
// tem filtro, coluna e número próprios, em `tela-financeiro.js`.
const TelaFinanceiro = require('./tela-financeiro')
function financeiro(d, aba, estado) {
  // A Visão geral tem desenho próprio (telas-principais.js): é a única aba que não é
  // lista nem extrato — são os números do período em três blocos.
  if ((!aba || aba === 'visao') && d && d.visao) {
    return require('./telas-principais').htmlFinanceiroVisao(d.visao, estado || {})
  }
  return TelaFinanceiro.htmlFinanceiro(d, { ...(estado || {}), aba }) || aviso('Aba sem conteúdo.')
}

// ── Atendimento ─────────────────────────────────────────────────────────────
function atendimento(d, aba) {
  if (aba === 'salao') return Operacao.htmlMesas(d.salao, {})
  if (aba === 'solicitacoes') {
    return cartao('Solicitações das mesas', 'chamados de garçom e pedidos de conta',
      grade(['Mesa', 'Pedido', 'Feita às', 'Situação'],
        d.solicitacoes.map((s) => ({ chave: s.mesa + s.hora, celulas: ['Mesa ' + s.mesa, s.tipo, s.hora, et(s.situacao)] })),
        '120px 1fr 130px 140px'))
  }
  if (aba === 'gorjetas') {
    const total = d.gorjetas.reduce((s, g) => s + g.valor, 0)
    return faixaKpis([
      { rotulo: 'Gorjetas do turno', valor: brl(total), sub: 'a dividir', cor: '#0A7A3E' },
      { rotulo: 'Garçons', valor: String(d.gorjetas.length), sub: 'no turno' },
    ]) + cartao('Gorjetas por garçom', 'sobre as mesas atendidas',
      grade(['Garçom', 'Mesas', 'Vendas', 'Gorjeta'],
        d.gorjetas.map((g) => ({ chave: g.nome, celulas: [g.nome, String(g.mesas), brl(g.vendas), { texto: brl(g.valor), forte: true, cor: '#111' }] })),
        '1fr 100px 160px 160px', [1, 2, 3]))
  }
  if (aba === 'relatorios') {
    return cartao('Relatórios do salão', 'geração ainda pelo painel',
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">'
      + d.relatorios.map((r) => '<div style="border:1px solid #e8eaee;border-radius:12px;padding:16px">'
        + '<div style="font-size:14px;font-weight:800;color:#111;margin-bottom:4px">' + esc(r.nome) + '</div>'
        + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(r.desc) + '</div></div>').join('') + '</div>')
  }
  if (aba === 'controle' || aba === 'app') {
    const campos = aba === 'controle' ? d.controle : d.app
    return cartao(aba === 'controle' ? 'Controle do salão' : 'App do garçom', 'em leitura — alterar é pelo painel',
      campos.map((c) => '<div style="display:grid;grid-template-columns:240px 1fr;gap:14px;padding:9px 0;border-bottom:1px solid #eef0f3">'
        + '<span style="font-size:12.5px;font-weight:700;color:#6b7280">' + esc(c.rotulo) + '</span>'
        + '<span style="font-size:13px;font-weight:600;color:#111">' + esc(c.valor) + '</span></div>').join(''))
  }
  if (aba === 'taxas') {
    return cartao('Taxas do salão', 'serviço e couvert',
      grade(['Taxa', 'Valor', 'Aplicação', 'Situação'],
        d.taxas.map((t) => ({ chave: t.nome, celulas: [t.nome, t.valor, t.aplicacao, et(t.situacao)] })),
        '1fr 140px 200px 130px'))
  }
  return aviso('Aba sem conteúdo.')
}

// ── Gestão › Produtos ───────────────────────────────────────────────────────
// Conforme a tela real (Sabor do Pirão, 07/09): não é uma lista de insumos — é o
// CADASTRO-MESTRE em categorias. Pílula de categorias em cima, e cada subcategoria
// vira um bloco que abre e fecha, com a sua própria busca e a tabela densa de ERP
// (código, produto, estoque, mínimo, custo, situação). Os selos ao lado do nome são
// o que o dono precisa ver de relance: "↔ cardápio" (a venda baixa aqui) e "⚠ fiscal"
// (falta classificação, a nota sai no chute).

/** Situação da prateleira — a mesma regra do painel (zerado / abaixo do mínimo / ok). */
function situacaoEstoque(i) {
  if (i.ativo === false) return { texto: 'Desativado', cor: '#6b7280', bg: '#eef0f3' }
  const saldo = Number(i.saldo) || 0
  if (saldo <= 0) return { texto: 'Sem estoque', cor: '#b42318', bg: '#fdeaea' }
  if (saldo <= (Number(i.minimo) || 0)) return { texto: 'Estoque baixo', cor: '#8a6508', bg: '#fff9e8' }
  return { texto: 'OK', cor: '#0A7A3E', bg: '#E7FAF0' }
}
function baixos(itens) {
  return (itens || []).filter((i) => i.ativo !== false && Number(i.saldo) > 0 && Number(i.saldo) <= Number(i.minimo)).length
}

const GRADE_ESTOQUE = '80px 1fr 110px 70px 110px 120px 34px'

function selo(texto, cor, bg, titulo) {
  return '<span title="' + esc(titulo || '') + '" style="margin-left:6px;font-size:10px;font-weight:700;color:' + cor
    + ';background:' + bg + ';border-radius:5px;padding:1px 5px;white-space:nowrap">' + esc(texto) + '</span>'
}

function linhaItemEstoque(i) {
  const s = situacaoEstoque(i)
  return '<div data-linha="' + esc(i.nome) + '" style="display:grid;grid-template-columns:' + GRADE_ESTOQUE
    + ';align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid #eef0f3'
    + (i.ativo === false ? ';opacity:.5' : '') + '">'
    + '<span style="font-size:12px;color:#9ca3af;font-weight:600;font-variant-numeric:tabular-nums">' + esc(i.codigo || '—') + '</span>'
    + '<span style="font-size:13.5px;color:#111;font-weight:600;min-width:0">' + esc(i.nome)
    + (i.cardapio ? selo('↔ cardápio', '#6b7280', '#eef0f3', 'Vinculado ao produto do cardápio — a venda baixa aqui') : '')
    + (i.cardapio === false ? selo('sem vínculo', '#b42318', '#fdeaea', 'Sem produto do cardápio vinculado') : '')
    + (i.fiscalPendente ? selo('⚠ fiscal', '#8a6508', '#fff9e8', 'Classificação fiscal incompleta — a nota sai no padrão de alimentação') : '')
    + '</span>'
    + '<span style="font-size:13px;color:#111;font-weight:700;text-align:right;font-variant-numeric:tabular-nums">'
    + esc((Number(i.saldo) || 0) + ' ' + (i.unidade || 'un')) + '</span>'
    + '<span style="font-size:12.5px;color:#9ca3af;font-weight:600;text-align:right;font-variant-numeric:tabular-nums">'
    + esc(String(Number(i.minimo) || 0)) + '</span>'
    + '<span style="font-size:13px;color:#111;font-weight:600;text-align:right;font-variant-numeric:tabular-nums">'
    + esc(brl(i.custo)) + '</span>'
    + '<span><span style="font-size:10.5px;font-weight:800;color:' + s.cor + ';background:' + s.bg
    + ';border-radius:6px;padding:2px 7px;white-space:nowrap">' + esc(s.texto) + '</span></span>'
    + '<button type="button" data-acao="estoque:menu:' + esc(i.nome) + '" title="Lançar, editar, histórico"'
    + ' style="border:none;background:none;color:#9ca3af;font-size:17px;line-height:1;cursor:pointer;font-family:inherit">⋯</button>'
    + '</div>'
}

/** Bloco que abre e fecha, com faixa cinza no cabeçalho — o mesmo do painel. */
function blocoEstoque(id, titulo, contagem, alerta, extra, corpo, aberto) {
  return '<div class="ecard" style="padding:0;overflow:hidden;margin-bottom:14px">'
    + '<div data-bloco-estoque="' + esc(id) + '" style="display:flex;align-items:center;gap:10px;padding:11px 14px;'
    + 'background:var(--painel);cursor:pointer' + (aberto ? ';border-bottom:1px solid #e8eaee' : '') + '">'
    + '<span style="font-size:13.5px;font-weight:800;color:#111;flex:1;letter-spacing:-.01em">' + esc(titulo) + '</span>'
    + '<span style="font-size:12px;color:#9ca3af;font-weight:600;white-space:nowrap">' + contagem
    + (contagem === 1 ? ' item' : ' itens') + '</span>'
    + (alerta > 0 ? '<span style="font-size:10.5px;font-weight:800;color:#b42318;background:#fdeaea;border-radius:6px;'
      + 'padding:2px 7px;white-space:nowrap">' + alerta + ' baixo</span>' : '')
    + (extra || '')
    + '<span style="font-size:11px;color:#9ca3af;transition:transform .2s;display:inline-block'
    + (aberto ? ';transform:rotate(180deg)' : '') + '">▼</span>'
    + '</div>'
    + (aberto ? corpo : '')
    + '</div>'
}

function botaoEstoque(acao, rotulo, primaria, pequeno) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:' + (pequeno ? 28 : 32) + 'px;padding:0 '
    + (pequeno ? 10 : 12) + 'px;border-radius:9px;font-size:' + (pequeno ? 11.5 : 12.5) + 'px;font-weight:800;'
    + 'font-family:inherit;cursor:pointer;white-space:nowrap;' + (primaria
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}

function corpoDoBloco(id, itens, termo) {
  const t = (termo || '').trim().toLowerCase()
  const vistos = t
    ? itens.filter((i) => (i.nome || '').toLowerCase().indexOf(t) >= 0 || (i.codigo || '').toLowerCase().indexOf(t) >= 0)
    : itens
  const busca = '<div style="padding:8px 14px;border-bottom:1px solid #eef0f3">'
    + '<input data-busca-bloco="' + esc(id) + '" placeholder="Buscar por nome ou código…" value="' + esc(termo || '') + '"'
    + ' autocomplete="off" style="width:240px;max-width:100%;height:32px;border:1px solid #e5e7eb;border-radius:9px;'
    + 'padding:0 11px;font-family:inherit;font-size:13px;color:#111;background:#fff"></div>'
  if (!vistos.length) {
    return busca + '<div class="evazio">' + (itens.length
      ? 'Nada encontrado.' : 'Nenhum produto nesta subcategoria ainda.') + '</div>'
  }
  const cabecalho = '<div style="display:grid;grid-template-columns:' + GRADE_ESTOQUE + ';gap:10px;padding:9px 14px;'
    + 'border-bottom:1px solid #e8eaee;font-size:10.5px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.08em">'
    + ['Código', 'Produto'].map((c) => '<span>' + c + '</span>').join('')
    + ['Estoque', 'Mín.', 'Custo'].map((c) => '<span style="text-align:right">' + c + '</span>').join('')
    + '<span>Situação</span><span></span></div>'
  return busca + cabecalho + vistos.map(linhaItemEstoque).join('')
}

function gestaoProdutos(d, estado) {
  const categorias = d.categorias || []
  if (!categorias.length) return aviso('Nenhuma categoria de estoque cadastrada ainda.')
  const escolhida = estado.catEstoque || 'todos'
  const fechados = estado.blocosFechados || []
  const buscas = estado.buscaBloco || {}
  const visiveis = escolhida === 'todos' ? categorias : categorias.filter((c) => c.id === escolhida)

  const pilula = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px">'
    + [{ id: 'todos', nome: 'Todos' }].concat(categorias).map((c) =>
      '<button type="button" data-cat-estoque="' + esc(c.id) + '" class="eaba'
      + (escolhida === c.id ? ' is-on' : '') + '">' + esc(c.nome) + '</button>').join('')
    + botaoEstoque('estoque:nova-categoria', '+', false)
    + '<span style="margin-left:auto">' + botaoEstoque('estoque:sincronizar-cardapio', '↔ Sincronizar com o cardápio', false) + '</span>'
    + '</div>'

  const secoes = visiveis.map((cat) => {
    const subs = (cat.subcategorias || []).map((sub) => {
      const id = cat.id + ':' + sub.nome
      const itens = sub.itens || []
      const aberto = fechados.indexOf(id) < 0
      const extra = botaoEstoque('estoque:adicionar:' + cat.id, '+ Adicionar', false, true)
      return blocoEstoque(id, sub.nome, itens.length, baixos(itens), extra,
        corpoDoBloco(id, itens, buscas[id]), aberto)
    }).join('')
    const massas = cat.mostraMassas
      ? blocoEstoque(cat.id + ':massas', 'Estoque de Massas', (cat.massas || []).length,
        0, botaoEstoque('estoque:sincronizar-massas', '↻ Sincronizar cardápio', true, true),
        corpoDoBloco(cat.id + ':massas', cat.massas || [], buscas[cat.id + ':massas']),
        fechados.indexOf(cat.id + ':massas') < 0)
      : ''
    return subs + massas
  }).join('')

  return pilula + '<div style="animation:eloFadeUp .5s ease both">' + secoes + '</div>'
}

// ── Gestão (estoque) ────────────────────────────────────────────────────────
// As cinco abas restantes, desenhadas olhando o painel (Du Pellegrini, 07/09).

/** Sub-abas sublinhadas (Nota Fiscal de entrada, Movimentações, Fichas). */
function subAbas(aba, lista, atual) {
  const escolhida = lista.some((s) => s.chave === atual) ? atual : lista[0].chave
  return '<div style="display:flex;gap:18px;border-bottom:1px solid #e8eaee;margin-bottom:18px">'
    + lista.map((s) => '<button type="button" data-subgestao="' + esc(aba) + ':' + esc(s.chave) + '"'
      + ' style="border:none;background:none;font-family:inherit;cursor:pointer;padding:0 0 10px;font-size:13px;'
      + (s.chave === escolhida
        ? 'font-weight:800;color:var(--acento-texto);box-shadow:inset 0 -2px 0 var(--acento)'
        : 'font-weight:600;color:#6b7280') + '">' + esc(s.rotulo) + '</button>').join('')
    + '</div>'
}
const subAtual = (lista, atual) => (lista.some((s) => s.chave === atual) ? atual : lista[0].chave)

/** Botão de tela (as ações de escrita seguem indo para o painel). */
function botao(acao, rotulo, primaria, pequeno) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:' + (pequeno ? 30 : 36) + 'px;padding:0 '
    + (pequeno ? 12 : 16) + 'px;border-radius:' + (pequeno ? 9 : 10) + 'px;font-size:12.5px;font-weight:800;'
    + 'font-family:inherit;cursor:pointer;white-space:nowrap;' + (primaria
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}
/** Cabeçalho de aba: título grande à esquerda, ação à direita. */
function tituloDeAba(titulo, sub, acao) {
  return '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px">'
    + '<div><div style="font-size:19px;font-weight:800;color:#111;letter-spacing:-.02em">' + esc(titulo) + '</div>'
    + (sub ? '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:4px">' + esc(sub) + '</div>' : '')
    + '</div>' + (acao || '') + '</div>'
}
/** Faixa de aviso do painel (fundo âmbar, barra à esquerda). */
function faixaAviso(titulo, texto) {
  return '<div style="border-left:3px solid #eab308;background:#fff9e8;border-radius:10px;padding:12px 16px;margin-bottom:18px">'
    + '<div style="font-size:13px;font-weight:800;color:#8a6508">⚠ ' + esc(titulo) + '</div>'
    + '<div style="font-size:12.5px;color:#8a6508;font-weight:500;margin-top:3px">' + esc(texto) + '</div></div>'
}
/** Filtros que o app ainda não aplica sozinho: mostram o estado, não fingem filtrar. */
function campoFalso(rotulo, valor, largura) {
  return '<div style="min-width:0">'
    + (rotulo ? '<div style="font-size:11px;font-weight:700;color:#9ca3af;margin-bottom:5px">' + esc(rotulo) + '</div>' : '')
    + '<div style="height:34px;border:1px solid #e5e7eb;border-radius:9px;background:#fff;display:flex;align-items:center;'
    + 'padding:0 11px;font-size:12.5px;color:#9ca3af;font-weight:500;width:' + (largura || '100%') + '">'
    + esc(valor) + '</div></div>'
}

const PERIODOS_MOV = [
  { chave: 'hoje', rotulo: 'Hoje' }, { chave: 'ontem', rotulo: 'Ontem' }, { chave: '7dias', rotulo: '7 dias' },
  { chave: 'mes', rotulo: 'Este mês' }, { chave: 'mespassado', rotulo: 'Mês passado' }, { chave: 'ano', rotulo: 'Este ano' },
]
const SUB_ENTRADA = [{ chave: 'notas', rotulo: 'Notas de compra' }, { chave: 'pendencias', rotulo: 'Pendências' }]
const SUB_MOV = [
  { chave: 'extrato', rotulo: 'Extrato' }, { chave: 'tipo', rotulo: 'Resumo por tipo' },
  { chave: 'giro', rotulo: 'Giro por produto' }, { chave: 'giro4', rotulo: 'Giro 4 semanas' },
  { chave: 'abc', rotulo: 'Curva ABC' }, { chave: 'operador', rotulo: 'Por operador' },
]
const SUB_FICHAS = [{ chave: 'produto', rotulo: 'Por produto' }, { chave: 'insumo', rotulo: '⇄ Por insumo (onde é usado)' }]

// ── Nota Fiscal (Entrada) ───────────────────────────────────────────────────
// Conforme PainelEntradas.tsx: a nota entra "A conferir" e o estoque SÓ muda quando
// alguém confirma os itens. Por isso a tela tem dois níveis: a lista de notas e, ao
// abrir uma, a conferência item a item com o destino de cada um.
//
// "Nova entrada" é um menu em cascata, porque a nota chega de três jeitos diferentes:
// buscando na SEFAZ (as emitidas contra o CNPJ da loja), importando o XML que o
// fornecedor mandou, ou digitando à mão — e aí ainda pergunta se tem nota fiscal.

const STATUS_NOTA = {
  pendente: { rotulo: 'A conferir', etiqueta: 'amarelo' },
  processada: { rotulo: 'Processada', etiqueta: 'verde' },
  ignorada: { rotulo: 'Ignorada', etiqueta: 'cinza' },
}
const TIPO_DOC = { nfe: 'NF-e', nfse: 'NFS-e', manual: 'Manual', sem_nota: 'Sem nota' }

function menuNovaEntrada() {
  const opcao = (acao, titulo, explica) => '<button type="button" data-acao="' + esc(acao) + '"'
    + ' style="display:block;width:100%;text-align:left;padding:12px 14px;background:none;border:none;'
    + 'border-bottom:1px solid #eef0f3;cursor:pointer;font-family:inherit">'
    + '<div style="font-size:13.5px;font-weight:700;color:#111">' + esc(titulo) + '</div>'
    + '<div style="font-size:11px;color:#9ca3af;font-weight:500;margin-top:2px">' + esc(explica) + '</div></button>'
  return '<div class="ecard" style="padding:0;overflow:hidden;margin-bottom:14px">'
    + '<div style="padding:10px 14px;font-size:12.5px;font-weight:800;color:#6b7280;'
    + 'border-bottom:1px solid #eef0f3">Nova entrada — de onde vem a nota?</div>'
    + opcao('entrada:sefaz', '☁ Buscar da SEFAZ (automática)', 'Traz as notas de compra emitidas contra o CNPJ da loja')
    + opcao('entrada:xml', '⭱ Importar XML', 'Você já tem o arquivo da nota')
    + opcao('entrada:manual', '📄 Lançar manualmente — com nota fiscal', 'Digita fornecedor e itens; vai para a conferência normal')
    + opcao('entrada:sem-nota', '📄 Lançar manualmente — sem nota fiscal', 'Entra no estoque marcada como sem comprovante fiscal')
    + '</div>'
}

/** Conferência: a nota aberta, item a item, com o destino de cada um. */
function conferenciaDaNota(nota) {
  const itens = nota.itens || []
  const cabecalho = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;'
    + 'flex-wrap:wrap;padding:16px 20px;border-bottom:1px solid #eef0f3">'
    + '<div style="min-width:0"><div style="font-size:15px;font-weight:800;color:#111">'
    + esc(nota.fornecedor) + ' · NF ' + esc(nota.numero) + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;margin-top:3px">'
    + esc(TIPO_DOC[nota.tipoDocumento || 'nfe'] || 'NF-e') + ' · ' + esc(nota.emissao) + ' · '
    + esc(brl(nota.valor)) + ' · CNPJ ' + esc(nota.cnpj || '—') + '</div>'
    + (nota.fornecedorCadastrado === false
      ? '<div style="font-size:11.5px;color:#8a6508;font-weight:600;margin-top:4px">'
        + 'Fornecedor ainda não cadastrado — cadastre em Fornecedores para completar o contato.</div>'
      : '')
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-shrink:0">'
    + botaoEstoque('entrada:fechar', 'Fechar', false)
    + (nota.situacao === 'pendente' ? botaoEstoque('entrada:confirmar:' + nota.numero, '✓ Confirmar entradas', true) : '')
    + '</div></div>'

  const linhas = itens.map((i) => ({
    chave: i.nome,
    celulas: [
      { texto: i.nome, forte: true, cor: '#111' },
      String(i.qtd), i.unidade || 'un',
      brl(i.precoUnitario), { texto: brl(i.qtd * i.precoUnitario), forte: true, cor: '#111' },
      i.destino
        ? { texto: i.destino, etiqueta: 'verde' }
        : { texto: 'sem vínculo', etiqueta: 'vermelho' },
      { html: botaoEstoque('entrada:ajustar:' + i.nome, 'Ajustar', false, true) },
    ],
  }))

  return '<div class="ecard" style="padding:0;overflow:hidden;margin-bottom:14px;'
    + 'animation:eloFadeUp .4s ease both">' + cabecalho
    + '<div style="padding:18px">'
    + L.apenasGrade({
      colunas: ['Item', 'Qtd', 'Unid.', 'Preço unitário', 'Preço total', 'Destino', ''],
      grade: '1fr 80px 80px 130px 130px 160px 110px', direita: [1, 3, 4],
    }, linhas)
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
    + 'enquanto não confirmar, o estoque não muda — é assim no painel</div></div></div>'
}

function gestaoEntrada(d, estado) {
  const sub = subAtual(SUB_ENTRADA, estado.subGestao)
  const dados = d.nfEntrada || {}
  const notas = dados.notas || []
  const pendencias = dados.pendencias || []
  const topo = subAbas('entrada', SUB_ENTRADA, sub)

  if (sub === 'pendencias') {
    return topo + (pendencias.length
      ? cartao('Pendências da conferência', 'falta, avaria e vencimento apontados item a item',
        grade(['Problema', 'Produto', 'Qtd', 'Valor', 'Nota / fornecedor', 'Registrada', ''],
          pendencias.map((p) => ({ chave: p.produto + p.registrada, celulas: [
            { texto: p.problema, etiqueta: p.resolvida ? 'cinza' : (p.problema === 'Falta' ? 'vermelho' : 'amarelo') },
            { texto: p.produto, forte: true, cor: '#111' },
            String(p.qtd), brl(p.valor),
            { texto: p.nota, sub: p.fornecedor || '' },
            p.registrada,
            { html: p.resolvida
              ? '<span style="font-size:11.5px;color:#9ca3af;font-weight:700">resolvida</span>'
              : botaoEstoque('entrada:resolver:' + p.produto, 'Resolver', true, true) }] })),
          '120px 1fr 90px 110px 190px 120px 120px', [2, 3]))
      : aviso('Nenhuma pendência em aberto. Falta, avaria e vencimento são apontados na conferência da nota, '
        + 'no botão Ajustar de cada item.'))
  }

  const aberta = estado.notaAberta && notas.find((n) => n.numero === estado.notaAberta)

  const barra = '<div class="ecard" style="padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;'
    + 'gap:14px;flex-wrap:wrap">' + botaoEstoque('entrada:nova', '+ Nova entrada', true)
    + '<span style="margin-left:auto;font-size:12.5px;color:#9ca3af;font-weight:500">'
    + 'A nota entra como “A conferir” — o estoque só muda quando você confirmar os itens.</span></div>'
    + (estado.menuEntrada ? menuNovaEntrada() : '')
    + (aberta ? conferenciaDaNota(aberta) : '')

  const filtros = '<div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:0 0 16px">'
    + '<div style="font-size:15px;font-weight:800;color:#111">Notas de compra (' + notas.length + ')</div>'
    + campoFalso('', 'Buscar fornecedor, NF ou CNPJ…', '260px')
    + '<span style="margin-left:auto;display:flex;align-items:flex-end;gap:10px">'
    + campoFalso('DE', 'dd/mm/aaaa', '150px') + campoFalso('ATÉ', 'dd/mm/aaaa', '150px')
    + botaoEstoque('entrada:buscar-notas', 'Buscar', true, true) + '</span></div>'

  const corpo = notas.length
    ? grade(['Data', 'Fornecedor', 'CNPJ', 'NF', 'Tipo', 'Valor', 'Itens', 'Status', ''],
      notas.map((n) => {
        const st = STATUS_NOTA[n.situacao] || STATUS_NOTA.pendente
        return { chave: n.numero, celulas: [
          n.emissao, { texto: n.fornecedor, forte: true, cor: '#111' }, n.cnpj || '—',
          { texto: n.numero, forte: true, cor: '#111' },
          TIPO_DOC[n.tipoDocumento || 'nfe'] || 'NF-e',
          { texto: brl(n.valor), forte: true, cor: '#111' },
          String((n.itens || []).length || n.qtdItens || 0),
          { texto: st.rotulo, etiqueta: st.etiqueta },
          { html: botaoEstoque('entrada:abrir:' + n.numero, n.situacao === 'pendente' ? 'Conferir' : 'Ver', n.situacao === 'pendente', true) },
        ] }
      }), '110px 1fr 160px 100px 90px 130px 80px 120px 110px', [5, 6])
    : '<div class="evazio">Nenhuma nota importada ainda. Use “Buscar da SEFAZ” (notas emitidas contra o CNPJ da loja) '
      + 'ou envie o XML que o fornecedor mandou.</div>'

  return topo + barra + '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .05s both">'
    + filtros + corpo + '</div>'
}

// ── Nota Fiscal (Saída) ─────────────────────────────────────────────────────
const SITUACAO_NF = { 'Sem nota': 'amarelo', Emitida: 'verde', Falha: 'vermelho', Cancelada: 'cinza' }

function gestaoSaida(d) {
  const nf = d.nfSaida || {}
  const f = nf.fiscal || {}
  const itens = nf.itens || []

  const cartoes = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-bottom:18px">'
    + [
      { r: 'Notas emitidas hoje', v: String(nf.emitidasHoje || 0), s: 'Total: ' + brl(nf.emitidasHojeValor) },
      { r: 'Pendentes de emissão', v: String(nf.pendentes || 0), s: 'Valor total: ' + brl(nf.pendentesValor), c: '#6d28d9' },
      { r: 'Com falha', v: String(nf.comFalha || 0), s: nf.comFalha ? 'precisam de reenvio' : 'Nenhuma falha no momento', c: nf.comFalha ? '#b42318' : '#0A7A3E' },
      { r: 'Total do período', v: String(nf.periodo || 0), s: 'Valor total: ' + brl(nf.periodoValor) },
    ].map((k) => cartaoKpi({ rotulo: k.r, valor: k.v, sub: k.s, cor: k.c })).join('') + '</div>'

  const semProvedor = !f.provedor || f.provedor === 'Nenhum'
  const alerta = semProvedor
    ? faixaAviso('Emissão fiscal não configurada',
      'Para emitir NF de verdade escolha um provedor fiscal em Configurações › Dados fiscais.')
    : ''

  const par = (rotulo, valor, sub, cor) => '<div style="min-width:0">'
    + '<div style="font-size:11.5px;color:#6b7280;font-weight:700;margin-bottom:4px">' + esc(rotulo) + '</div>'
    + '<div style="font-size:14px;font-weight:800;color:' + (cor || '#111') + '">' + esc(valor) + '</div>'
    + (sub ? '<div style="font-size:11.5px;color:#9ca3af;font-weight:500;margin-top:2px">' + esc(sub) + '</div>' : '') + '</div>'

  const status = '<div class="ecard" style="padding:20px 24px;margin-bottom:18px;background:#fffdf5;border-color:#f0e6c8">'
    + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 32px">'
    + par('Ambiente', f.ambiente || '—', f.ambiente === 'Produção' ? '' : 'nota de teste, sem valor fiscal')
    + par('Provedor fiscal', f.provedor || 'Nenhum', '', semProvedor ? '#b42318' : '#111')
    + par('Situação da emissão', f.situacao || '—', semProvedor ? 'Configure em Dados fiscais' : '')
    + par('Fila de reenvio', f.fila || 'Vazia', 'reenvio automático a cada 5 min')
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:10px;border-top:1px solid #f0e6c8;margin-top:16px;padding-top:12px">'
    + '<span style="font-size:11.5px;color:#8a6508;font-weight:600">Última verificação: ' + esc(f.verificadoEm || '—') + '</span>'
    + '<span style="margin-left:auto">' + botao('nf:atualizar-status', '↻ Atualizar status', false, true) + '</span></div></div>'

  const filtros = '<div class="ecard" style="padding:16px 20px;margin-bottom:14px;display:grid;'
    + 'grid-template-columns:1fr 170px 220px 200px auto;gap:14px;align-items:end">'
    + campoFalso('Buscar', 'Cliente ou nº do pedido')
    + campoFalso('Situação', 'Todas')
    + campoFalso('Período', 'dd/mm/aaaa → dd/mm/aaaa')
    + campoFalso('Valor (R$)', 'Mínimo até Máximo')
    + botao('nf:limpar-filtros', 'Limpar filtros', false, true) + '</div>'

  const tabela = itens.length
    ? grade(['Data', 'Nº pedido', 'Cliente', 'Valor', 'Situação', 'Nº nota', 'Ações'],
      itens.map((n) => ({ chave: n.pedido, celulas: [n.data, { texto: '#' + n.pedido, forte: true, cor: '#111' }, n.cliente,
        { texto: brl(n.valor), forte: true, cor: '#111' },
        { texto: n.situacao, etiqueta: SITUACAO_NF[n.situacao] || 'cinza' },
        n.nota || '—',
        { html: botao('nf:gerar:' + n.pedido, 'Gerar nota', false, true) }] })),
      '110px 110px 1fr 120px 130px 110px 130px', [3])
    : '<div class="evazio">Nenhuma venda no período.</div>'

  return tituloDeAba('Notas Fiscais', 'Emissão de NF em sincronia com as vendas efetivadas',
    botao('nf:emitir-manual', '📄 Emitir nota manualmente', true))
    + cartoes + alerta + status + filtros
    + '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .05s both">' + tabela + '</div>'
}

// ── Movimentações ───────────────────────────────────────────────────────────
function gestaoMovimentacoes(d, estado) {
  const mv = d.movimentacoes || {}
  const itens = mv.itens || []
  const sub = subAtual(SUB_MOV, estado.subGestao)
  const periodo = PERIODOS_MOV.some((p) => p.chave === estado.periodoMov) ? estado.periodoMov : 'mes'

  const chips = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">'
    + PERIODOS_MOV.map((p) => '<button type="button" data-periodo-mov="' + esc(p.chave) + '" class="eaba'
      + (p.chave === periodo ? ' is-on' : '') + '">' + esc(p.rotulo) + '</button>').join('') + '</div>'

  const filtros = '<div class="ecard" style="padding:16px 20px;margin-bottom:14px;display:grid;'
    + 'grid-template-columns:1fr 190px 190px 190px;gap:12px;align-items:end">'
    + campoFalso('', 'Buscar produto…')
    + campoFalso('', 'Todos os tipos') + campoFalso('', 'Ingredientes e massas') + campoFalso('', 'Todos os operadores')
    + '</div>'

  const kpis = '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-bottom:18px">'
    + [
      { r: 'Entradas (valor)', v: brl(mv.entradasValor), s: 'compras e produção' },
      { r: 'Saídas (valor)', v: brl(mv.saidasValor), s: 'vendas e consumo', c: '#b42318' },
      { r: 'Perdas (valor)', v: brl(mv.perdasValor), s: 'descarte e quebra', c: mv.perdasValor ? '#b42318' : '#111' },
      { r: 'Lançamentos', v: String(mv.lancamentos != null ? mv.lancamentos : itens.length), s: 'no período' },
      { r: 'Produtos movimentados', v: String(mv.produtosMovimentados != null ? mv.produtosMovimentados : 0), s: 'itens distintos' },
    ].map((k) => cartaoKpi({ rotulo: k.r, valor: k.v, sub: k.s, cor: k.c })).join('') + '</div>'

  let corpo
  if (sub === 'extrato') {
    corpo = itens.length
      ? grade(['Data', 'Produto', 'Movimento', 'Qtd', 'Conversão', 'Saldo após', 'Custo', 'Operador', 'Observação'],
        itens.map((m) => ({ chave: m.data + m.produto + m.hora, celulas: [
          { texto: m.data + (m.hora ? '  ' + m.hora : ''), cor: '#4b5563' },
          { texto: m.produto, forte: true, cor: '#111' },
          et(m.movimento), String(m.qtd), m.conversao || '—', String(m.saldoApos),
          brl(m.custo), m.operador || 'Sistema', m.observacao || '—'] })),
        '150px 1fr 110px 70px 100px 100px 100px 110px 130px', [3, 5, 6])
      : '<div class="evazio">Nenhum lançamento no período.</div>'
  } else if (sub === 'tipo') {
    const porTipo = {}
    itens.forEach((m) => { porTipo[m.movimento] = (porTipo[m.movimento] || 0) + 1 })
    corpo = Object.keys(porTipo).length
      ? grade(['Movimento', 'Lançamentos'], Object.keys(porTipo).map((t) => ({ chave: t, celulas: [et(t), String(porTipo[t])] })),
        '1fr 160px', [1])
      : '<div class="evazio">Nenhum lançamento no período.</div>'
  } else if (sub === 'operador') {
    const porOp = {}
    itens.forEach((m) => { const o = m.operador || 'Sistema'; porOp[o] = (porOp[o] || 0) + 1 })
    corpo = grade(['Operador', 'Lançamentos'], Object.keys(porOp).map((o) => ({ chave: o, celulas: [o, String(porOp[o])] })),
      '1fr 160px', [1])
  } else {
    const giro = mv.giro || []
    corpo = giro.length
      ? grade(['Produto', 'Saídas', 'Saldo', 'Giro'],
        giro.map((g) => ({ chave: g.produto, celulas: [g.produto, String(g.saidas), String(g.saldo),
          { texto: g.giro + 'x', forte: true, cor: '#111' }] })), '1fr 120px 120px 120px', [1, 2, 3])
      : '<div class="evazio">O giro é calculado pelo painel — ainda não veio para o app.</div>'
  }

  const rodape = '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
    + itens.length + ' lançamento(s) · ' + (mv.diasNoPeriodo != null ? mv.diasNoPeriodo : 0) + ' dia(s) no período</div>'

  return chips + filtros + kpis
    + '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .05s both">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">'
    + '<div style="flex:1;min-width:0">' + subAbas('movimentacoes', SUB_MOV, sub) + '</div>'
    + botao('mov:pdf', '🖨 Baixar PDF', false, true) + '</div>'
    + corpo + rodape + '</div>'
}

// ── Fichas técnicas ─────────────────────────────────────────────────────────
function gestaoFichas(d, estado) {
  const fichas = d.fichas || {}
  const itens = fichas.itens || []
  const sub = subAtual(SUB_FICHAS, estado.subGestao)
  const escolhido = estado.fichaAberta && itens.find((i) => i.produto === estado.fichaAberta)
  const comFicha = itens.filter((i) => (i.insumos || []).length).length

  const topo = '<div class="ecard" style="padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    + SUB_FICHAS.map((s) => '<button type="button" data-subgestao="fichas:' + esc(s.chave) + '"'
      + ' class="eaba' + (s.chave === sub ? ' is-on' : '') + '">' + esc(s.rotulo) + '</button>').join('') + '</div>'

  if (sub === 'insumo') {
    const porInsumo = {}
    itens.forEach((i) => (i.insumos || []).forEach((n) => {
      (porInsumo[n.nome] = porInsumo[n.nome] || []).push(i.produto)
    }))
    const nomes = Object.keys(porInsumo)
    return topo + '<div class="ecard" style="padding:24px">'
      + (nomes.length
        ? grade(['Insumo', 'Sai em', 'Produtos'],
          nomes.map((n) => ({ chave: n, celulas: [{ texto: n, forte: true, cor: '#111' },
            String(porInsumo[n].length) + ' produto(s)', porInsumo[n].join(', ')] })),
          '220px 130px 1fr', [1])
        : '<div class="evazio">Nenhuma ficha técnica montada ainda — nenhum insumo sai do estoque na venda.</div>')
      + '</div>'
  }

  const busca = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">'
    + campoFalso('', 'Buscar produto…', '360px') + campoFalso('', 'Todas as categorias', '190px')
    + '<span style="margin-left:auto;display:flex;align-items:center;gap:14px">'
    + '<span style="font-size:12px;font-weight:800;color:var(--acento-texto)">' + comFicha + ' com estoque configurado</span>'
    + '<span style="font-size:12px;font-weight:700;color:#9ca3af">' + (itens.length - comFicha) + ' sem controle</span>'
    + '</span></div>'

  const lista = '<div class="ecard" style="padding:0;overflow:hidden">'
    + '<div style="padding:12px 16px;border-bottom:1px solid #e8eaee;font-size:13.5px;font-weight:800;color:#111">'
    + 'Produtos (' + itens.length + ')</div>'
    + (itens.length ? itens.map((i) => {
      const temFicha = (i.insumos || []).length
      const aberto = escolhido && escolhido.produto === i.produto
      return '<div data-ficha="' + esc(i.produto) + '" style="display:flex;align-items:center;gap:10px;padding:11px 16px;'
        + 'border-bottom:1px solid #eef0f3;cursor:pointer' + (aberto ? ';background:var(--acento-suave)' : '') + '">'
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:13.5px;font-weight:700;color:#111">' + esc(i.produto) + '</div>'
        + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:2px">' + esc(i.categoria || '—')
        + ' · ' + (temFicha ? temFicha + ' insumo(s)' : 'sem ficha') + '</div></div>'
        + '<span style="font-size:12.5px;font-weight:700;color:#6b7280">' + esc(brl(i.preco)) + '</span></div>'
    }).join('') : '<div class="evazio">Nenhum produto no cardápio ainda.</div>')
    + '</div>'

  const detalhe = escolhido
    ? '<div class="ecard" style="padding:24px">'
      + '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">' + esc(escolhido.produto) + '</div>'
      + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-bottom:18px">'
      + esc(escolhido.categoria || '—') + ' · vende por ' + esc(brl(escolhido.preco)) + '</div>'
      + ((escolhido.insumos || []).length
        ? grade(['Insumo', 'Quantidade'], escolhido.insumos.map((n) => ({ chave: n.nome,
          celulas: [n.nome, { texto: n.qtd, forte: true, cor: '#111' }] })), '1fr 160px', [1])
          + '<div style="display:flex;justify-content:space-between;gap:12px;padding-top:14px;font-size:13px;font-weight:800;color:#111">'
          + '<span>Custo da ficha</span><span>' + esc(brl(escolhido.custo)) + '</span></div>'
          + '<div style="display:flex;justify-content:space-between;gap:12px;padding-top:6px;font-size:12.5px;font-weight:700;color:var(--acento-texto)">'
          + '<span>Margem</span><span>' + (escolhido.preco ? Math.round(((escolhido.preco - escolhido.custo) / escolhido.preco) * 100) : 0)
          + '%</span></div>'
        : '<div class="evazio">Produto sem ficha — a venda dele não mexe no estoque de insumos.</div>')
      + '</div>'
    : '<div class="ecard" style="padding:60px 24px;text-align:center">'
      + '<div style="font-size:30px;line-height:1;margin-bottom:12px">👨‍🍳</div>'
      + '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:6px">Escolha um produto</div>'
      + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;line-height:1.6;max-width:360px;margin:0 auto">'
      + 'A ficha técnica é a receita: quanto de cada insumo sai do estoque quando o produto vende. '
      + 'Produto sem ficha não mexe no estoque de insumos.</div></div>'

  return topo + busca
    + '<div style="display:grid;grid-template-columns:minmax(280px,340px) 1fr;gap:18px;align-items:start">'
    + lista + detalhe + '</div>'
}

// ── Fornecedores ────────────────────────────────────────────────────────────
function gestaoFornecedores(d) {
  const lista = d.fornecedores || []
  return tituloDeAba('Fornecedores', lista.length ? 'quem abastece a loja' : 'Nenhum fornecedor cadastrado.',
    botao('estoque:novo-fornecedor', '+ Adicionar fornecedor', true))
    + (lista.length
      ? '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .05s both">'
        + grade(['Fornecedor', 'CNPJ / CPF', 'Telefone', 'Última compra', 'Compras no mês'],
          lista.map((f) => ({ chave: f.nome, celulas: [{ texto: f.nome, forte: true, cor: '#111' },
            f.cnpj || '—', f.telefone, f.ultima, { texto: brl(f.mes), forte: true, cor: '#111' }] })),
          '1fr 180px 160px 150px 170px', [4]) + '</div>'
      : aviso('Nenhum fornecedor cadastrado. Eles entram sozinhos quando você importa uma nota de compra.'))
}

function gestao(d, aba, estado) {
  estado = estado || {}
  if (aba === 'produtos') return gestaoProdutos(d, estado)
  if (aba === 'entrada') return gestaoEntrada(d, estado)
  if (aba === 'saida') return gestaoSaida(d, estado)
  if (aba === 'movimentacoes') return gestaoMovimentacoes(d, estado)
  if (aba === 'fichas') return gestaoFichas(d, estado)
  if (aba === 'fornecedores') return gestaoFornecedores(d)
  return aviso('Aba sem conteúdo.')
}

/** Desenha a tela com abas: barra + conteúdo da aba escolhida. */
function htmlComAbas(rota, dados, estado) {
  const abas = ABAS[rota]
  if (!abas) return null
  if (!dados) return aviso('Sem dados ainda. Quando o app falar com o painel, esta tela aparece aqui.')
  const aba = Abas.abaAtual(abas, estado && estado.aba)
  const corpo = rota === '/admin/financeiro' ? financeiro(dados, aba, estado)
    : rota === '/admin/atendimento' ? atendimento(dados, aba)
    : gestao(dados, aba, estado)
  return '<div>' + Abas.barraDeAbas(abas, aba) + corpo + '</div>'
}

module.exports = { htmlComAbas, ABAS, situacaoEstoque }
