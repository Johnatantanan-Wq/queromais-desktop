// renderer/elo/telas-catalogo.js — as telas de lista do app, declaradas.
//
// Cada módulo diz o que mostra (KPIs, filtros, colunas, ações); o desenho vem do
// formato único (tela-lista.js). Tela nova = uma entrada aqui + a rota em TELAS_NATIVAS.
// Os dados chegam prontos do servidor (ou do modo demonstração): a tela não calcula.

const L = require('./tela-lista')
const Quadro = require('./tela-quadro')

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// status → cor da etiqueta, um lugar só (o mesmo vocabulário do painel)
const COR_STATUS = {
  'Novo': 'azul', 'Em produção': 'amarelo', 'Pronto': 'verde', 'Em entrega': 'azul',
  'Entregue': 'verde', 'Cancelado': 'vermelho', 'Aguardando': 'cinza', 'Pago': 'verde',
  'Pendente': 'amarelo', 'Ativo': 'verde', 'Inativo': 'cinza', 'Esgotado': 'vermelho',
  'Disponível': 'verde', 'Livre': 'verde', 'Ocupada': 'amarelo', 'Em rota': 'azul',
  'Vencido': 'vermelho', 'A vencer': 'amarelo', 'Liquidado': 'verde',
}
const etiqueta = (texto) => ({ texto, etiqueta: COR_STATUS[texto] || 'cinza' })

const CATALOGO = {
  '/admin/pedidos': {
    canal: 'pedidos-carregar',
    def: (d) => ({
      titulo: 'Pedidos do turno',
      subtitulo: 'tudo que entrou hoje, por etapa',
      kpis: [
        { rotulo: 'Novos', valor: String(d.contadores.novo), sub: 'aguardando aceite', cor: '#1d4ed8' },
        { rotulo: 'Em produção', valor: String(d.contadores.producao), sub: 'na cozinha' },
        { rotulo: 'Prontos', valor: String(d.contadores.pronto), sub: 'para sair', cor: '#0A7A3E' },
        { rotulo: 'Faturamento', valor: brl(d.faturamento), sub: 'no turno' },
      ],
      filtros: [
        { chave: 'todos', rotulo: 'Todos', contador: d.itens.length },
        { chave: 'novo', rotulo: 'Novos', contador: d.contadores.novo },
        { chave: 'producao', rotulo: 'Em produção', contador: d.contadores.producao },
        { chave: 'pronto', rotulo: 'Prontos', contador: d.contadores.pronto },
        { chave: 'entrega', rotulo: 'Em entrega', contador: d.contadores.entrega },
      ],
      busca: 'Buscar por número, cliente ou telefone',
      colunas: ['Pedido', 'Hora', 'Cliente', 'Canal', 'Status', 'Valor'],
      grade: '90px 70px 1fr 110px 130px 120px',
      direita: [5],
      acoes: [{ chave: 'novo-pedido', rotulo: '+ Novo pedido', primaria: true }, { chave: 'imprimir', rotulo: '🖨 Imprimir' }],
      rodape: 'aceitar, imprimir e despachar ainda são pelo painel',
    }),
    linhas: (d) => d.itens.map((p) => ({
      chave: p.numero,
      celulas: [
        { texto: '#' + p.numero, forte: true, cor: '#111' }, p.hora, p.cliente, p.canal,
        etiqueta(p.status), { texto: brl(p.valor), forte: true, cor: '#111' },
      ],
    })),
    filtrar: (linhas, filtro, d) => filtro === 'todos' ? linhas : linhas.filter((l, i) => d.itens[i].filtro === filtro),
  },

  '/admin/carrinhos': {
    canal: 'carrinhos-carregar',
    def: (d) => ({
      titulo: 'Carrinhos em aberto',
      subtitulo: 'clientes que montaram o pedido e não fecharam',
      kpis: [
        { rotulo: 'Carrinhos', valor: String(d.itens.length), sub: 'em aberto' },
        { rotulo: 'Valor parado', valor: brl(d.total), sub: 'se todos fecharem' },
        { rotulo: 'Mais antigo', valor: d.maisAntigo, sub: 'sem mexer' },
      ],
      filtros: [{ chave: 'todos', rotulo: 'Todos' }, { chave: 'hoje', rotulo: 'De hoje' }],
      busca: 'Buscar cliente ou telefone',
      colunas: ['Cliente', 'Telefone', 'Itens', 'Parado há', 'Valor'],
      grade: '1fr 150px 80px 130px 120px',
      direita: [4],
      acoes: [{ chave: 'lembrar', rotulo: '💬 Lembrar no WhatsApp', primaria: true }],
      rodape: 'o disparo de lembrete ainda é pelo painel',
    }),
    linhas: (d) => d.itens.map((c) => ({
      chave: c.telefone,
      celulas: [c.cliente, c.telefone, String(c.itens), c.paradoHa, { texto: brl(c.valor), forte: true, cor: '#111' }],
    })),
  },

  '/admin/clientes': {
    canal: 'clientes-carregar',
    def: (d) => ({
      titulo: 'Clientes',
      subtitulo: 'quem já comprou na loja',
      kpis: [
        { rotulo: 'Cadastrados', valor: String(d.total), sub: 'no total' },
        { rotulo: 'Compraram no mês', valor: String(d.ativosMes), sub: 'clientes ativos', cor: '#0A7A3E' },
        { rotulo: 'Ticket médio', valor: brl(d.ticket), sub: 'por pedido' },
      ],
      filtros: [{ chave: 'todos', rotulo: 'Todos' }, { chave: 'recorrentes', rotulo: 'Recorrentes' }, { chave: 'novos', rotulo: 'Novos no mês' }],
      busca: 'Buscar por nome, telefone ou endereço',
      colunas: ['Cliente', 'Telefone', 'Bairro', 'Pedidos', 'Último pedido', 'Total gasto'],
      grade: '1fr 150px 160px 90px 130px 130px',
      direita: [5],
      acoes: [{ chave: 'novo-cliente', rotulo: '+ Novo cliente', primaria: true }],
    }),
    linhas: (d) => d.itens.map((c) => ({
      chave: c.telefone,
      celulas: [c.nome, c.telefone, c.bairro, String(c.pedidos), c.ultimo, { texto: brl(c.total), forte: true, cor: '#111' }],
    })),
  },

  '/admin/cardapio': {
    canal: 'cardapio-carregar',
    def: (d) => ({
      titulo: 'Cardápio',
      subtitulo: 'produtos e disponibilidade',
      kpis: [
        { rotulo: 'Produtos', valor: String(d.total), sub: 'no cardápio' },
        { rotulo: 'Disponíveis', valor: String(d.disponiveis), sub: 'à venda agora', cor: '#0A7A3E' },
        { rotulo: 'Esgotados', valor: String(d.esgotados), sub: 'fora do ar', cor: '#b42318' },
        { rotulo: 'Preço médio', valor: brl(d.precoMedio), sub: 'por item' },
      ],
      filtros: [{ chave: 'todos', rotulo: 'Todos' }, { chave: 'disponivel', rotulo: 'Disponíveis' }, { chave: 'esgotado', rotulo: 'Esgotados' }],
      busca: 'Buscar produto ou categoria',
      colunas: ['Produto', 'Categoria', 'Preço', 'Vendas (7d)', 'Situação'],
      grade: '1fr 180px 120px 120px 140px',
      direita: [2, 3],
      acoes: [{ chave: 'novo-produto', rotulo: '+ Novo produto', primaria: true }],
      rodape: 'editar preço e disponibilidade ainda é pelo painel',
    }),
    linhas: (d) => d.itens.map((p) => ({
      chave: p.nome,
      celulas: [p.nome, p.categoria, { texto: brl(p.preco), forte: true, cor: '#111' }, String(p.vendas7d), etiqueta(p.situacao)],
    })),
  },

  '/admin/despacho': {
    canal: 'despacho-carregar',
    def: (d) => ({
      titulo: 'Despacho',
      subtitulo: 'quem está na rua e o que falta sair',
      kpis: [
        { rotulo: 'Aguardando', valor: String(d.contadores.aguardando), sub: 'para despachar' },
        { rotulo: 'Em rota', valor: String(d.contadores.rota), sub: 'na rua', cor: '#1d4ed8' },
        { rotulo: 'Entregues hoje', valor: String(d.contadores.entregue), sub: 'concluídas', cor: '#0A7A3E' },
      ],
      filtros: [{ chave: 'todos', rotulo: 'Todos' }, { chave: 'aguardando', rotulo: 'Aguardando' }, { chave: 'rota', rotulo: 'Em rota' }],
      busca: 'Buscar pedido, cliente ou entregador',
      colunas: ['Pedido', 'Cliente', 'Bairro', 'Entregador', 'Situação', 'Saiu às'],
      grade: '90px 1fr 160px 160px 130px 100px',
      acoes: [{ chave: 'despachar', rotulo: '🛵 Despachar selecionados', primaria: true }],
      rodape: 'despachar e confirmar entrega ainda são pelo painel',
    }),
    linhas: (d) => d.itens.map((e) => ({
      chave: e.pedido,
      celulas: [{ texto: '#' + e.pedido, forte: true, cor: '#111' }, e.cliente, e.bairro, e.entregador || '—', etiqueta(e.situacao), e.saiu || '—'],
    })),
  },

  '/admin/financeiro': {
    canal: 'financeiro-carregar',
    def: (d) => ({
      titulo: 'Contas do mês',
      subtitulo: 'a pagar e a receber',
      kpis: [
        { rotulo: 'A receber', valor: brl(d.aReceber), sub: 'no mês', cor: '#0A7A3E' },
        { rotulo: 'A pagar', valor: brl(d.aPagar), sub: 'no mês', cor: '#b42318' },
        { rotulo: 'Saldo previsto', valor: brl(d.aReceber - d.aPagar), sub: 'se tudo entrar e sair' },
        { rotulo: 'Vencidas', valor: String(d.vencidas), sub: 'contas atrasadas', cor: '#b42318' },
      ],
      filtros: [{ chave: 'todos', rotulo: 'Todas' }, { chave: 'pagar', rotulo: 'A pagar' }, { chave: 'receber', rotulo: 'A receber' }, { chave: 'vencido', rotulo: 'Vencidas' }],
      busca: 'Buscar descrição ou fornecedor',
      colunas: ['Descrição', 'Categoria', 'Vencimento', 'Situação', 'Valor'],
      grade: '1fr 180px 130px 130px 130px',
      direita: [4],
      acoes: [{ chave: 'nova-conta', rotulo: '+ Nova conta', primaria: true }],
      rodape: 'baixa e estorno ainda são pelo painel',
    }),
    linhas: (d) => d.itens.map((c) => ({
      chave: c.descricao,
      celulas: [c.descricao, c.categoria, c.vencimento, etiqueta(c.situacao),
        { texto: (c.tipo === 'pagar' ? '- ' : '') + brl(c.valor), forte: true, cor: c.tipo === 'pagar' ? '#b42318' : '#0A7A3E' }],
    })),
  },

  '/admin/motoboys': {
    canal: 'entregadores-carregar',
    def: (d) => ({
      titulo: 'Entregadores',
      subtitulo: 'quem está disponível e como foi o dia',
      kpis: [
        { rotulo: 'Na rua', valor: String(d.contadores.rota), sub: 'entregando', cor: '#1d4ed8' },
        { rotulo: 'Livres', valor: String(d.contadores.livre), sub: 'disponíveis', cor: '#0A7A3E' },
        { rotulo: 'Entregas hoje', valor: String(d.entregasHoje), sub: 'concluídas' },
      ],
      filtros: [{ chave: 'todos', rotulo: 'Todos' }, { chave: 'rota', rotulo: 'Na rua' }, { chave: 'livre', rotulo: 'Livres' }],
      busca: 'Buscar entregador',
      colunas: ['Entregador', 'Telefone', 'Situação', 'Entregas hoje', 'A receber'],
      grade: '1fr 150px 130px 130px 130px',
      direita: [4],
      acoes: [{ chave: 'novo-entregador', rotulo: '+ Novo entregador', primaria: true }],
    }),
    linhas: (d) => d.itens.map((m) => ({
      chave: m.nome,
      celulas: [m.nome, m.telefone, etiqueta(m.situacao), String(m.entregas), { texto: brl(m.aReceber), forte: true, cor: '#111' }],
    })),
  },
}

// Pedidos tem dois modos: QUADRO (kanban, o padrão — é como o balcão trabalha) e
// LISTA (a mesma grade das outras telas, para quem quer ver tudo de uma vez).
function htmlPedidos(dados, estado) {
  if (!dados) return L.htmlLista({ titulo: '', colunas: [] }, null, estado)
  const modo = estado.modo === 'lista' ? 'lista' : 'quadro'
  const cfg = CATALOGO['/admin/pedidos']
  const def = cfg.def(dados)

  const kpis = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;animation:eloFadeUp .5s ease both">'
    + def.kpis.map((k) => '<div class="ecard" style="padding:13px 20px;min-width:0">'
      + '<div style="font-size:11.5px;font-weight:700;color:#6b7280;margin-bottom:6px">' + L.esc(k.rotulo) + '</div>'
      + '<div style="font-size:22px;font-weight:800;color:' + (k.cor || '#111111') + ';letter-spacing:-.02em;line-height:1">' + L.esc(k.valor) + '</div>'
      + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:5px">' + L.esc(k.sub || '') + '</div></div>').join('')
    + '</div>'

  const botao = (chave, rotulo, ligado) =>
    '<button type="button" data-modo="' + chave + '" class="echip' + (ligado ? ' is-on' : '') + '" style="cursor:pointer;'
    + (ligado ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800' : 'background:#f0f0ee;color:#4b5563') + '">' + rotulo + '</button>'

  const barra = '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111">Pedidos do turno</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">tudo que entrou hoje, por etapa</div></div>'
    + '<div style="display:flex;gap:6px;align-items:center;margin-left:auto">'
    + botao('quadro', 'Quadro', modo === 'quadro') + botao('lista', 'Lista', modo === 'lista')
    + (modo === 'quadro'
        ? '<button type="button" data-extras="1" class="echip' + (estado.extras ? ' is-on' : '') + '" style="cursor:pointer;'
          + (estado.extras ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800' : 'background:#f0f0ee;color:#4b5563')
          + '">' + (estado.extras ? '− Entrega' : '+ Entrega') + '</button>'
        : '')
    + '<button type="button" data-acao="novo-pedido" style="height:36px;padding:0 16px;border:none;border-radius:10px;background:var(--acento);'
    + 'color:#fff;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer">+ Novo pedido</button>'
    + '</div></div>'

  if (modo === 'lista') {
    return '<div style="display:flex;flex-direction:column;gap:18px">' + kpis
      + '<div class="ecard" style="padding:24px">' + barra + '</div>'
      + htmlListaDaRota('/admin/pedidos', dados, estado) + '</div>'
  }
  return '<div style="display:flex;flex-direction:column;gap:18px">' + kpis
    + '<div class="ecard" style="padding:20px 24px">' + barra + '</div>'
    + Quadro.htmlQuadro(dados, estado)
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600">'
    + 'aceitar, imprimir e despachar ainda são pelo painel</div></div>'
}

/** Desenha a tela de lista da rota, com o filtro e a busca do momento. */
function htmlDaRota(rota, dados, estado) {
  if (rota === '/admin/pedidos') return htmlPedidos(dados, estado)
  return htmlListaDaRota(rota, dados, estado)
}

function htmlListaDaRota(rota, dados, estado) {
  const cfg = CATALOGO[rota]
  if (!cfg) return null
  if (!dados) return L.htmlLista({ titulo: '', colunas: [] }, null, estado)
  const def = cfg.def(dados)
  let linhas = cfg.linhas(dados)
  const filtro = estado.filtro || (def.filtros && def.filtros[0] && def.filtros[0].chave) || 'todos'
  if (cfg.filtrar) linhas = cfg.filtrar(linhas, filtro, dados)
  const termo = ('' + (estado.termo || '')).trim().toLowerCase()
  if (termo) {
    linhas = linhas.filter((l) => l.celulas.some((c) => {
      const t = (c && typeof c === 'object') ? c.texto : c
      return ('' + t).toLowerCase().indexOf(termo) >= 0
    }))
  }
  return L.htmlLista(def, linhas, { ...estado, filtro })
}

module.exports = { CATALOGO, htmlDaRota, htmlListaDaRota, htmlPedidos, brl, etiqueta, COR_STATUS }
