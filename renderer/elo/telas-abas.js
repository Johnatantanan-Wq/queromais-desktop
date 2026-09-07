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
  Aberta: 'amarelo', Atendida: 'verde', Recusada: 'vermelho', Ativa: 'verde', Inativa: 'cinza', Entrada: 'verde', Saída: 'vermelho' }
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
function financeiro(d, aba) {
  if (aba === 'visao') {
    return faixaKpis([
      { rotulo: 'Entradas no mês', valor: brl(d.entradas), sub: 'recebido', cor: '#0A7A3E' },
      { rotulo: 'Saídas no mês', valor: brl(d.saidas), sub: 'pago', cor: '#b42318' },
      { rotulo: 'Resultado', valor: brl(d.entradas - d.saidas), sub: 'entradas − saídas' },
      { rotulo: 'Em aberto', valor: brl(d.aReceber - d.aPagar), sub: 'a receber − a pagar' },
    ]) + cartao('Entradas e saídas', 'por dia, no mês',
      G.linha([
        { values: d.serie.entradas, color: '#14CE6B', labelColor: '#0A7A3E' },
        { values: d.serie.saidas, color: '#b42318', labelColor: '#b42318' },
      ], d.serie.labels, { w: 900, h: 200, yBottom: 150, fmt: (v) => 'R$ ' + Math.round(v / 1000) + 'k' })
      + '<div style="display:flex;gap:16px;font-size:12px;font-weight:600;color:#6b7280;margin-top:6px">'
      + '<span>— entradas</span><span style="color:#b42318">— saídas</span></div>')
  }
  if (aba === 'vendas') {
    return cartao('Vendas por dia', 'faturamento e pedidos',
      grade(['Dia', 'Pedidos', 'Faturamento', 'Ticket médio'],
        d.vendas.map((v) => ({ chave: v.dia, celulas: [v.dia, String(v.pedidos), { texto: brl(v.total), forte: true, cor: '#111' }, brl(v.total / (v.pedidos || 1))] })),
        '1fr 120px 160px 160px', [1, 2, 3]))
  }
  if (aba === 'extrato' || aba === 'livro') {
    const titulo = aba === 'extrato' ? 'Extrato' : 'Livro caixa'
    return cartao(titulo, aba === 'extrato' ? 'tudo que entrou e saiu' : 'entradas e saídas com saldo corrido',
      grade(['Data', 'Descrição', 'Tipo', 'Valor', 'Saldo'],
        d.extrato.map((m) => ({ chave: m.data + m.descricao, celulas: [m.data, m.descricao, et(m.tipo),
          { texto: (m.tipo === 'Saída' ? '- ' : '') + brl(m.valor), forte: true, cor: m.tipo === 'Saída' ? '#b42318' : '#0A7A3E' },
          { texto: brl(m.saldo), forte: true, cor: '#111' }] })),
        '110px 1fr 120px 140px 140px', [3, 4]))
  }
  if (aba === 'pagar' || aba === 'receber') {
    const itens = d.contas.filter((c) => (aba === 'pagar' ? c.tipo === 'pagar' : c.tipo === 'receber'))
    const total = itens.reduce((s, c) => s + c.valor, 0)
    return faixaKpis([
      { rotulo: aba === 'pagar' ? 'Total a pagar' : 'Total a receber', valor: brl(total), sub: 'no mês', cor: aba === 'pagar' ? '#b42318' : '#0A7A3E' },
      { rotulo: 'Contas', valor: String(itens.length), sub: 'lançamentos' },
      { rotulo: 'Vencidas', valor: String(itens.filter((c) => c.situacao === 'Vencido').length), sub: 'atrasadas', cor: '#b42318' },
    ]) + cartao(aba === 'pagar' ? 'Contas a pagar' : 'Contas a receber', 'por vencimento',
      grade(['Descrição', 'Categoria', 'Vencimento', 'Situação', 'Valor'],
        itens.map((c) => ({ chave: c.descricao, celulas: [c.descricao, c.categoria, c.vencimento, et(c.situacao), { texto: brl(c.valor), forte: true, cor: '#111' }] })),
        '1fr 170px 130px 130px 140px', [4]))
  }
  if (aba === 'dre') {
    return cartao('DRE', 'resultado do mês, linha a linha',
      grade(['Conta', 'Participação', 'Valor'],
        d.dre.map((l) => ({ chave: l.conta, celulas: [
          { texto: (l.nivel === 'item' ? '   ' : '') + l.conta, forte: l.nivel !== 'item', cor: l.nivel !== 'item' ? '#111' : '#4b5563' },
          l.pct + '%', { texto: (l.valor < 0 ? '- ' : '') + brl(Math.abs(l.valor)), forte: true, cor: l.valor < 0 ? '#b42318' : '#111' }] })),
        '1fr 150px 170px', [1, 2]))
  }
  return aviso('Aba sem conteúdo.')
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
      + d.relatorios.map((r) => '<div style="border:1px solid #ebebe8;border-radius:12px;padding:16px">'
        + '<div style="font-size:14px;font-weight:800;color:#111;margin-bottom:4px">' + esc(r.nome) + '</div>'
        + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(r.desc) + '</div></div>').join('') + '</div>')
  }
  if (aba === 'controle' || aba === 'app') {
    const campos = aba === 'controle' ? d.controle : d.app
    return cartao(aba === 'controle' ? 'Controle do salão' : 'App do garçom', 'em leitura — alterar é pelo painel',
      campos.map((c) => '<div style="display:grid;grid-template-columns:240px 1fr;gap:14px;padding:9px 0;border-bottom:1px solid #f0f0ee">'
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
  if (i.ativo === false) return { texto: 'Desativado', cor: '#6b7280', bg: '#f0f0ee' }
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
    + ';align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid #f0f0ee'
    + (i.ativo === false ? ';opacity:.5' : '') + '">'
    + '<span style="font-size:12px;color:#9ca3af;font-weight:600;font-variant-numeric:tabular-nums">' + esc(i.codigo || '—') + '</span>'
    + '<span style="font-size:13.5px;color:#111;font-weight:600;min-width:0">' + esc(i.nome)
    + (i.cardapio ? selo('↔ cardápio', '#6b7280', '#f0f0ee', 'Vinculado ao produto do cardápio — a venda baixa aqui') : '')
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
    + 'background:#f6f6f4;cursor:pointer' + (aberto ? ';border-bottom:1px solid #ebebe8' : '') + '">'
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
  const busca = '<div style="padding:8px 14px;border-bottom:1px solid #f0f0ee">'
    + '<input data-busca-bloco="' + esc(id) + '" placeholder="Buscar por nome ou código…" value="' + esc(termo || '') + '"'
    + ' autocomplete="off" style="width:240px;max-width:100%;height:32px;border:1px solid #e5e7eb;border-radius:9px;'
    + 'padding:0 11px;font-family:inherit;font-size:13px;color:#111;background:#fff"></div>'
  if (!vistos.length) {
    return busca + '<div class="evazio">' + (itens.length
      ? 'Nada encontrado.' : 'Nenhum produto nesta subcategoria ainda.') + '</div>'
  }
  const cabecalho = '<div style="display:grid;grid-template-columns:' + GRADE_ESTOQUE + ';gap:10px;padding:9px 14px;'
    + 'border-bottom:1px solid #ebebe8;font-size:10.5px;font-weight:800;color:#b3b2ac;text-transform:uppercase;letter-spacing:.08em">'
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
      '<button type="button" data-cat-estoque="' + esc(c.id) + '" class="echip' + (escolhida === c.id ? ' on' : '') + '"'
      + ' style="cursor:pointer;height:32px;' + (escolhida === c.id
        ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800'
        : 'background:#f0f0ee;color:#4b5563') + '">' + esc(c.nome) + '</button>').join('')
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
function gestao(d, aba, estado) {
  estado = estado || {}
  if (aba === 'produtos') return gestaoProdutos(d, estado)
  if (aba === 'entrada' || aba === 'saida') {
    const notas = aba === 'entrada' ? d.nfEntrada : d.nfSaida
    return cartao(aba === 'entrada' ? 'Notas de entrada' : 'Notas de saída',
      aba === 'entrada' ? 'compras que deram entrada no estoque' : 'notas emitidas pela loja',
      grade(['Número', aba === 'entrada' ? 'Fornecedor' : 'Cliente', 'Data', 'Itens', 'Valor'],
        notas.map((n) => ({ chave: n.numero, celulas: [{ texto: n.numero, forte: true, cor: '#111' }, n.parte, n.data, String(n.itens), { texto: brl(n.valor), forte: true, cor: '#111' }] })),
        '130px 1fr 120px 100px 150px', [3, 4]))
  }
  if (aba === 'movimentacoes') {
    return cartao('Movimentações', 'tudo que entrou e saiu do estoque',
      grade(['Data', 'Insumo', 'Tipo', 'Quantidade', 'Motivo'],
        d.movimentacoes.map((m) => ({ chave: m.data + m.insumo, celulas: [m.data, m.insumo, et(m.tipo),
          { texto: (m.tipo === 'Saída' ? '- ' : '+ ') + m.qtd, forte: true, cor: m.tipo === 'Saída' ? '#b42318' : '#0A7A3E' }, m.motivo] })),
        '110px 1fr 120px 130px 200px', [3]))
  }
  if (aba === 'fichas') {
    return cartao('Fichas técnicas', 'o que cada produto consome do estoque',
      grade(['Produto', 'Insumos', 'Custo', 'Preço de venda', 'Margem'],
        d.fichas.map((f) => ({ chave: f.produto, celulas: [f.produto, String(f.insumos), brl(f.custo), brl(f.preco),
          { texto: Math.round(((f.preco - f.custo) / f.preco) * 100) + '%', forte: true, cor: '#0A7A3E' }] })),
        '1fr 110px 140px 160px 120px', [1, 2, 3, 4]))
  }
  if (aba === 'fornecedores') {
    return cartao('Fornecedores', 'quem abastece a loja',
      grade(['Fornecedor', 'Telefone', 'Última compra', 'Compras no mês'],
        d.fornecedores.map((f) => ({ chave: f.nome, celulas: [f.nome, f.telefone, f.ultima, { texto: brl(f.mes), forte: true, cor: '#111' }] })),
        '1fr 160px 150px 170px', [3]))
  }
  return aviso('Aba sem conteúdo.')
}

/** Desenha a tela com abas: barra + conteúdo da aba escolhida. */
function htmlComAbas(rota, dados, estado) {
  const abas = ABAS[rota]
  if (!abas) return null
  if (!dados) return aviso('Sem dados ainda. Quando o app falar com o painel, esta tela aparece aqui.')
  const aba = Abas.abaAtual(abas, estado && estado.aba)
  const corpo = rota === '/admin/financeiro' ? financeiro(dados, aba)
    : rota === '/admin/atendimento' ? atendimento(dados, aba)
    : gestao(dados, aba, estado)
  return '<div>' + Abas.barraDeAbas(abas, aba) + corpo + '</div>'
}

module.exports = { htmlComAbas, ABAS, situacaoEstoque }
