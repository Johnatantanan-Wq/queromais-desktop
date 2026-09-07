// renderer/elo/shell.js — desenha a sidebar e a topbar do visual elo a partir do
// menu que o servidor mandou. As funções de montagem são puras (testadas em node);
// só a parte de baixo, guardada por `typeof document`, toca a tela.

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function iconeSvg(interno) {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
    + ' stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' + interno + '</svg>'
}

// Telas que o app já desenha por conta própria (não dependem da BrowserView).
// Lista explícita: um módulo só entra aqui quando tem tela nativa DE VERDADE —
// enquanto não tiver, o item abre o painel e fica esmaecido sem internet.
const CATALOGO_LISTAS = require('./telas-catalogo').CATALOGO
// Telas de operação (quadro de produção e salão) — desenho próprio, fora do formato de lista.
const TELAS_OPERACAO = ['/admin/cozinha', '/admin/bar', '/admin/atendimento']
const TELAS_FINAIS = ['/admin/insights', '/admin/relatorios', '/admin/configuracoes']
// Marketing e compras: saíram do catálogo de listas quando ganharam desenho próprio.
// Ficar de fora desta lista as deixava ESMAECIDAS no menu e inalcançáveis sem internet,
// mesmo já sendo nativas — foi o que a simulação de cliques pegou.
const TELAS_MARKETING = ['/admin/cupons', '/admin/vendedores', '/admin/fidelidade',
  '/admin/food-marketing/campanhas', '/admin/food-marketing/push', '/admin/compras']
// Telas do APP, que não existem no painel: impressora é da máquina, não da nuvem.
const TELAS_DO_APP = ['/app/impressao']
// Venda manual: existe no painel (/admin/venda) e agora TAMBÉM no app, fechando de verdade.
const TELA_VENDA = ['/admin/venda']
const TELAS_NATIVAS = ['/admin', '/admin/caixa'].concat(Object.keys(CATALOGO_LISTAS))
  .concat(TELAS_OPERACAO).concat(TELAS_FINAIS).concat(TELAS_MARKETING).concat(TELA_VENDA).concat(TELAS_DO_APP)

function ehNativa(rota) {
  // '/admin' é prefixo de TODAS as rotas do painel — para ele vale só a igualdade,
  // senão '/admin/cardapio' (que não é nativa) entraria junto.
  return TELAS_NATIVAS.some((base) => (base === '/admin' ? rota === '/admin' : (rota === base || ('' + rota).indexOf(base + '/') === 0)))
}

function ehAtivo(href, rota) {
  return href === '/admin' ? rota === '/admin' : rota.indexOf(href) === 0
}

/** online=false esmaece todo item que depende da web (na F1, todos). */
function htmlDoMenu(menu, rota, online) {
  const badges = (menu && menu.badges) || {}
  return (menu && menu.secoes ? menu.secoes : []).map((secao) => {
    const itens = secao.itens.map((it) => {
      let classes = ''
      if (ehAtivo(it.href, rota)) classes += ' on'
      // sem internet, só o que tem tela nativa continua alcançável
      if (!online && !ehNativa(it.href)) classes += ' off'
      const n = it.badge ? Number(badges[it.badge] || 0) : 0
      const badge = n > 0 ? '<span class="eranbadge">' + n + '</span>' : ''
      return '<div class="erailitem' + classes + '" data-href="' + esc(it.href) + '" data-id="' + esc(it.id) + '"'
        + ' title="' + esc(it.label) + '">' + iconeSvg(it.icone)
        + '<span class="lbl">' + esc(it.label) + '</span>' + badge + '</div>'
    }).join('')
    const titulo = secao.titulo ? '<div class="erailgrp">' + esc(secao.titulo) + '</div><div class="erailgrpdiv"></div>' : ''
    return titulo + itens
  }).join('')
}

function iniciaisDe(nome) {
  const partes = ('' + (nome || '')).trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return '—'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function tituloDaRota(menu, rota) {
  const todos = (menu && menu.secoes ? menu.secoes : []).reduce((acc, s) => acc.concat(s.itens), [])
  const achado = todos.filter((i) => ehAtivo(i.href, rota)).sort((a, b) => b.href.length - a.href.length)[0]
  return achado ? achado.label : 'Painel'
}

function dataPorExtenso(d) {
  try {
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  } catch (e) { return '' }
}

// ── cor do acento por marca ─────────────────────────────────────────────────
// O shell é o mesmo para todas as marcas; o que muda é a cor. Onde o Elo usa o
// amarelo #FFC107 (e seus tons), aqui entra a cor_primaria da marca — verde no
// Pediu!, laranja no Quero Mais. O brand.json pode fixar tons prontos; sem eles,
// derivam da cor base.
function _hex(n) { return '#' + [16, 8, 0].map((d) => ('0' + ((n >> d) & 255).toString(16)).slice(-2)).join('') }
function _num(hex) { return parseInt(('' + hex).replace('#', ''), 16) }
function _mistura(hex, alvo, peso) {
  const c = _num(hex), a = _num(alvo)
  const canal = (d) => Math.round((((c >> d) & 255) * (1 - peso)) + (((a >> d) & 255) * peso))
  return _hex((canal(16) << 16) | (canal(8) << 8) | canal(0))
}

function tonsDoAcento(corPrimaria, fixos) {
  const base = /^#?[0-9a-f]{6}$/i.test('' + (corPrimaria || '')) ? ('#' + ('' + corPrimaria).replace('#', '')) : '#14CE6B'
  const derivado = {
    base,
    escuro: _mistura(base, '#000000', 0.22),  // hover / degradê
    suave:  _mistura(base, '#ffffff', 0.90),  // fundo do item ativo
    texto:  _mistura(base, '#000000', 0.42),  // texto sobre o fundo suave
    linha:  _mistura(base, '#ffffff', 0.62),  // bordas discretas
  }
  return Object.assign(derivado, fixos || {})
}

module.exports = { htmlDoMenu, iniciaisDe, tituloDaRota, dataPorExtenso, esc, ehAtivo, tonsDoAcento, ehNativa, TELAS_NATIVAS }

// ── daqui pra baixo, só roda dentro da janela ────────────────────────────────
if (typeof document !== 'undefined') {
  const { ipcRenderer } = require('electron')
  const brand = require('../../src-electron/brand')
  const TelaCaixa = require('./tela-caixa')
  const TelaVisaoGeral = require('./tela-visao-geral')
  const Acoes = require('./acoes')

  let MENU = null
  let ROTA = '/admin'
  let ONLINE = false
  let VIEW = 'cardapio'
  let DEMO = false
  let PERIODO = 'semana'        // Visão geral: dia | ontem | semana | mes
  let METRICA = 'faturamento'   // Visão geral: faturamento | pedidos | ticket
  const FILTRO = {}             // filtro escolhido, por rota
  const TERMO = {}              // busca digitada, por rota
  const ABA = {}                // aba escolhida, por rota
  const SUBABA = {}             // subaba (Caixa: mesas | delivery | movimentações)
  const VISAO = {}              // visão (Despacho: por bairro | lista)
  let CATEGORIAS_ABERTAS = []   // Cardápio: categorias expandidas
  let CAT_ESTOQUE = 'todos'     // Gestão › Produtos: categoria escolhida
  let BLOCOS_FECHADOS = []      // Gestão › Produtos: blocos recolhidos (abrem por padrão)
  const BUSCA_BLOCO = {}        // Gestão › Produtos: busca de cada bloco
  const SUB_GESTAO = {}         // Gestão: sub-aba de cada aba (entrada, movimentações, fichas)
  let PERIODO_MOV = 'mes'       // Gestão › Movimentações: período escolhido
  let FICHA_ABERTA = null       // Gestão › Fichas técnicas: produto escolhido na lista
  let PERIODO_REL = '30dias'    // Relatórios e Insights: período escolhido
  let ABA_REL = 'vendas'        // Relatórios: aba escolhida
  let ABA_CAMPANHA = 'nova'     // Campanhas: nova | histórico | configurações
  let ABA_FIDELIDADE = 'visao'  // Fidelidade: visão geral | configurações | atividades
  let PERIODO_FID = '30dias'    // Fidelidade: período da visão geral
  let ORDEM_CLIENTES = 'gasto'  // Clientes: por gasto | por recência
  let SEL_DESPACHO = []         // Despacho: pedidos marcados na caixa de seleção
  const ENTREGADOR_DE = {}      // Despacho: entregador escolhido em cada linha
  let PERFIL_CAMPANHA = null    // Campanhas: perfil de cliente escolhido
  // Financeiro: cada aba tem os seus filtros, como no painel
  const FIN = { busca: '', direcao: 'todas', categoria: 'todas', forma: 'todas', origem: 'todas',
    usuario: 'todos', filtro: 'todas', modoExtrato: 'dia', pagina: 0, diasAbertos: [], dreAbertas: [],
    mes: null, situacaoConta: 'todas', tipoConta: 'todas' }
  const AVULSO = {}             // Compras: item avulso sendo digitado
  const TelaVenda = require('./tela-venda')
  let VENDA = TelaVenda.vendaVazia()   // Venda manual: o pedido sendo montado agora
  let NOTA_ABERTA = null        // Gestão › NF entrada: nota em conferência
  let MENU_ENTRADA = false      // Gestão › NF entrada: menu "de onde vem a nota?"
  let ABA_CFG = 'geral'         // Configurações: assunto escolhido
  let SUB_CFG = 'config'        // Configurações › Geral: seção escolhida
  let PERIODO_FIN = 'hoje'      // Financeiro: período da visão geral
  let MODO_PEDIDOS = 'quadro'   // quadro (padrão) | lista
  let FILTRO_PEDIDO = 'todos'   // quadro: canal ou forma de pagamento
  let TERMO_PEDIDO = ''         // quadro: busca por número, cliente ou telefone
  let DADOS_TELA = null         // último dado da tela nativa aberta (troca de métrica não refaz consulta)

  const $ = (id) => document.getElementById(id)

  function pintar() {
    $('erailNav').innerHTML = htmlDoMenu(MENU, ROTA, ONLINE)
    $('etitle').textContent = tituloDaRota(MENU, ROTA)
    $('edate').textContent = dataPorExtenso(new Date())
    const loja = (MENU && MENU.loja) || {}
    $('erailAvatar').textContent = iniciaisDe(loja.nome)
    $('erailNome').textContent = loja.nome || brand.nome_delivery
    $('erailDoc').textContent = loja.documento || ''
    if (DEMO) {
      $('chipRede').className = 'echip demo'
      $('chipRede').textContent = 'DEMONSTRAÇÃO · dados fictícios'
    } else {
      $('chipRede').className = 'echip' + (ONLINE ? '' : ' offline')
      $('chipRede').textContent = ONLINE ? 'conectado' : 'sem internet'
    }
  }

  // Rota nativa: o app desenha em #econtent e ESCONDE a BrowserView (senão ela
  // fica por cima, cobrindo a tela nativa). Rota web: manda a view para a URL.
  function abrirRota(rota) {
    if (ehNativa(rota)) {
      ipcRenderer.send('esconder-view')
      carregarTelaNativa(rota)
      return
    }
    if (DEMO) {
      // Em demonstração não há servidor: em vez de abrir o painel (que pediria
      // login), a tela diz a verdade sobre o que ainda não é nativo.
      ipcRenderer.send('esconder-view')
      document.getElementById('econtent').innerHTML =
        '<div class="ecard"><div class="evazio">'
        + '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:6px">Esta tela ainda não é nativa</div>'
        + 'No modo demonstração o app não fala com o servidor. Hoje só o <b>Caixa</b> é desenhado pelo app; '
        + 'as outras telas abrem o painel, e para isso é preciso conexão e login.</div></div>'
      return
    }
    document.getElementById('econtent').innerHTML = ''
    ipcRenderer.invoke('abrir-rota', rota)
  }

  // Cada tela nativa declara de onde vem o dado e como se desenha. Novo módulo
  // nativo entra aqui e no TELAS_NATIVAS — o resto do shell não muda.
  const NATIVAS = {
    '/admin': {
      canal: 'visao-geral-carregar',
      desenhar: (dados, estado) => TelaVisaoGeral.htmlVisaoGeral(dados, { ...estado, metrica: METRICA, periodo: PERIODO }),
      argumentos: () => ({ periodo: PERIODO }),
      erro: 'Não deu para carregar os números agora.',
    },
    '/admin/caixa': {
      canal: 'caixa-carregar',
      desenhar: (dados, estado) => TelaCaixa.htmlDoCaixa(dados, { ...estado, aba: ABA['/admin/caixa'], subaba: SUBABA['/admin/caixa'] }),
      erro: 'Não deu para carregar o caixa agora.',
    },
  }

  const Operacao = require('./tela-operacao')
  NATIVAS['/admin/cozinha'] = {
    canal: 'cozinha-carregar',
    desenhar: (dados, estado) => Operacao.htmlKds(dados, { ...estado, departamento: 'cozinha' }),
    erro: 'Não deu para carregar a produção agora.',
  }
  NATIVAS['/admin/bar'] = {
    canal: 'bar-carregar',
    desenhar: (dados, estado) => Operacao.htmlKds(dados, { ...estado, departamento: 'bar' }),
    erro: 'Não deu para carregar o bar agora.',
  }
  NATIVAS['/admin/atendimento'] = {
    canal: 'salao-carregar',
    desenhar: (dados, estado) => Operacao.htmlMesas(dados, estado),
    erro: 'Não deu para carregar o salão agora.',
  }

  // As telas de lista vêm do catálogo: cada uma declara colunas, filtros e ações,
  // e o desenho é o formato único (tela-lista.js).
  const Catalogo = require('./telas-catalogo')
  for (const rota of Object.keys(CATALOGO_LISTAS)) {
    NATIVAS[rota] = {
      canal: CATALOGO_LISTAS[rota].canal,
      desenhar: (dados, estado) => Catalogo.htmlDaRota(rota, dados, {
        ...estado, filtro: FILTRO[rota], termo: TERMO[rota],
        modo: MODO_PEDIDOS, filtroPedido: FILTRO_PEDIDO, termoPedido: TERMO_PEDIDO,
      }),
      erro: 'Não deu para carregar esta tela agora.',
    }
  }


  // Telas com seções por dentro: as mesmas abas do painel.
  const ComAbas = require('./telas-abas')
  const CANAL_ABAS = { '/admin/financeiro': 'financeiro-abas-carregar', '/admin/atendimento': 'atendimento-abas-carregar', '/admin/estoque': 'estoque-abas-carregar' }
  for (const rota of Object.keys(ComAbas.ABAS)) {
    NATIVAS[rota] = {
      canal: CANAL_ABAS[rota],
      desenhar: (dados, estado) => {
        // Financeiro › Visão geral e Atendimento › Salão têm versão própria, feita
        // conforme o painel; as demais abas seguem pelo módulo de abas.
        const aba = ABA[rota]
        if (rota === '/admin/financeiro' && (!aba || aba === 'visao') && dados && dados.visao) {
          return require('./abas').barraDeAbas(ComAbas.ABAS[rota], 'visao')
            + Principais.htmlFinanceiroVisao(dados.visao, { ...estado, periodoFin: PERIODO_FIN })
        }
        if (rota === '/admin/atendimento' && (!aba || aba === 'salao') && dados && dados.salaoDetalhado) {
          return require('./abas').barraDeAbas(ComAbas.ABAS[rota], 'salao')
            + Principais.htmlSalao(dados.salaoDetalhado, estado)
        }
        return ComAbas.htmlComAbas(rota, dados, {
          ...estado, aba,
          buscaFin: FIN.busca, direcaoFin: FIN.direcao, categoriaFin: FIN.categoria,
          formaFin: FIN.forma, origemFin: FIN.origem, usuarioFin: FIN.usuario, filtroFin: FIN.filtro,
          modoExtrato: FIN.modoExtrato, paginaFin: FIN.pagina, diasAbertos: FIN.diasAbertos,
          dreAbertas: FIN.dreAbertas, mesConta: FIN.mes, situacaoConta: FIN.situacaoConta,
          tipoConta: FIN.tipoConta,
          catEstoque: CAT_ESTOQUE, blocosFechados: BLOCOS_FECHADOS, buscaBloco: BUSCA_BLOCO,
          subGestao: SUB_GESTAO[aba || 'produtos'], periodoMov: PERIODO_MOV, fichaAberta: FICHA_ABERTA,
          notaAberta: NOTA_ABERTA, menuEntrada: MENU_ENTRADA,
        })
      },
      erro: 'Não deu para carregar esta tela agora.',
    }
  }

  const Mkt = require('./telas-marketing')
  NATIVAS['/admin/cupons'] = { canal: 'cupons-carregar', desenhar: (d, e) => Mkt.htmlCupons(d, e), erro: 'Não deu para carregar os cupons agora.' }
  NATIVAS['/admin/vendedores'] = { canal: 'parceiros-carregar', desenhar: (d, e) => Mkt.htmlParceiros(d, e), erro: 'Não deu para carregar os parceiros agora.' }
  NATIVAS['/admin/food-marketing/campanhas'] = {
    canal: 'campanhas-carregar',
    desenhar: (d, e) => Mkt.htmlCampanhas(d, { ...e, abaCampanha: ABA_CAMPANHA, perfil: PERFIL_CAMPANHA }),
    erro: 'Não deu para carregar as campanhas agora.',
  }
  NATIVAS['/admin/food-marketing/push'] = { canal: 'push-carregar', desenhar: (d, e) => Mkt.htmlPush(d, e), erro: 'Não deu para carregar o push agora.' }
  NATIVAS['/admin/fidelidade'] = {
    canal: 'fidelidade-carregar',
    desenhar: (d, e) => Mkt.htmlFidelidade(d, { ...e, abaFidelidade: ABA_FIDELIDADE, periodoFid: PERIODO_FID }),
    erro: 'Não deu para carregar a fidelidade agora.',
  }

  NATIVAS['/admin/venda'] = {
    canal: 'venda-cardapio',
    desenhar: (d, e) => TelaVenda.htmlVenda(d, { ...e, venda: VENDA }),
    erro: 'Não deu para abrir a venda manual agora.',
  }

  const TelaCompras = require('./tela-compras')
  NATIVAS['/admin/compras'] = {
    canal: 'compras-carregar',
    desenhar: (d, e) => TelaCompras.htmlCompras(d, {
      ...e, avulsoNome: AVULSO.nome, avulsoQtd: AVULSO.qtd, avulsoUnidade: AVULSO.unidade,
    }),
    erro: 'Não deu para carregar as compras agora.',
  }

  const TelaImpressao = require('./tela-impressao')
  const TelaDespacho = require('./tela-despacho')
  const TelaCardapio = require('./tela-cardapio')
  const Principais = require('./telas-principais')
  const Ficha = require('./ficha')
  NATIVAS['/admin/clientes'] = {
    canal: 'clientes-carregar',
    desenhar: (d, e) => Principais.htmlClientes(d, {
      ...e, termo: TERMO['/admin/clientes'], abaCliente: ABA['/admin/clientes'], ordem: ORDEM_CLIENTES,
    }),
    erro: 'Não deu para carregar os clientes agora.',
  }
  NATIVAS['/admin/carrinhos'] = {
    canal: 'carrinhos-carregar',
    desenhar: (d, e) => Principais.htmlCarrinhos(d, { ...e, filtroCarrinho: FILTRO['/admin/carrinhos'], abaCarrinho: ABA['/admin/carrinhos'] }),
    erro: 'Não deu para carregar os carrinhos agora.',
  }

  NATIVAS['/admin/cardapio'] = {
    canal: 'cardapio-carregar',
    desenhar: (dados, estado) => TelaCardapio.htmlCardapio(dados, {
      ...estado, aba: ABA['/admin/cardapio'], abertas: CATEGORIAS_ABERTAS, termo: TERMO['/admin/cardapio'],
    }),
    erro: 'Não deu para carregar o cardápio agora.',
  }

  NATIVAS['/admin/despacho'] = {
    canal: 'despacho-carregar',
    desenhar: (dados, estado) => TelaDespacho.htmlDespacho(dados, {
      ...estado, visao: VISAO['/admin/despacho'], selecionados: SEL_DESPACHO, entregadorDe: ENTREGADOR_DE,
    }),
    erro: 'Não deu para carregar o despacho agora.',
  }

  NATIVAS['/app/impressao'] = {
    canal: 'impressao-info',
    desenhar: (dados, estado) => TelaImpressao.htmlImpressao(dados, estado),
    erro: 'Não deu para ler as impressoras deste computador.',
  }

  const Finais = require('./telas-finais')
  NATIVAS['/admin/insights'] = {
    canal: 'insights-carregar',
    desenhar: (d, e) => Finais.htmlInsights(d, { ...e, periodoRel: PERIODO_REL }),
    erro: 'Não deu para carregar os insights agora.',
  }
  NATIVAS['/admin/relatorios'] = {
    canal: 'relatorios-carregar',
    desenhar: (d, e) => Finais.htmlRelatorios(d, { ...e, periodoRel: PERIODO_REL, abaRel: ABA_REL }),
    erro: 'Não deu para carregar os relatórios agora.',
  }
  NATIVAS['/admin/configuracoes'] = {
    canal: 'configuracoes-carregar',
    desenhar: (d, e) => Finais.htmlConfiguracoes(d, { ...e, abaCfg: ABA_CFG, subCfg: SUB_CFG }),
    erro: 'Não deu para carregar as configurações agora.',
  }

  function telaDe(rota) {
    if (NATIVAS[rota]) return NATIVAS[rota]
    const base = Object.keys(NATIVAS).find((b) => b !== '/admin' && ('' + rota).indexOf(b + '/') === 0)
    return base ? NATIVAS[base] : null
  }

  async function carregarTelaNativa(rota, silencioso) {
    const alvo = document.getElementById('econtent')
    const tela = telaDe(rota)
    if (!tela) return
    // No recarregamento automático do KDS não pode piscar "Carregando…" nem perder a
    // rolagem: na TV da cozinha a fila fica aberta o tempo todo.
    const rolagem = alvo.scrollTop
    if (!silencioso) alvo.innerHTML = '<div class="ecard"><div class="evazio">Carregando…</div></div>'
    try {
      const r = await ipcRenderer.invoke(tela.canal, tela.argumentos ? tela.argumentos() : undefined)
      if (ROTA !== rota) return   // o lojista já foi para outra tela
      DADOS_TELA = r && r.dados
      // Tela pronta cujo painel ainda não tem rota de leitura: dizer o que falta é mais
      // útil que "não deu para carregar", que faz pensar em queda de internet.
      if (r && r.semApi) {
        alvo.innerHTML = '<div class="ecard"><div class="evazio">'
          + 'Esta tela ainda não recebe dado do painel.<br>'
          + '<span style="font-size:12px">Falta ligar: ' + esc(r.semApi) + '.</span><br><br>'
          + 'No modo demonstração ela funciona inteira.</div></div>'
        return
      }
      alvo.innerHTML = tela.desenhar(DADOS_TELA, { online: !(r && r.offline), ts: (r && r.ts) || 0, demo: DEMO })
      if (silencioso) alvo.scrollTop = rolagem
    } catch (e) {
      if (silencioso) return      // falhou a atualização automática: mantém o que está na tela
      alvo.innerHTML = '<div class="ecard"><div class="evazio">' + tela.erro + '</div></div>'
    }
  }

  // A fila de produção se atualiza sozinha a cada 5s, como no painel — é o que a própria
  // tela promete embaixo do título.
  setInterval(() => {
    if (ROTA === '/admin/cozinha' || ROTA === '/admin/bar') carregarTelaNativa(ROTA, true)
  }, 5000)

  // ── Aviso do topo ────────────────────────────────────────────────────────
  // Faixa curta acima do conteúdo, como no painel. Sem ela o clique não devolve
  // NADA e o lojista fica achando que o app travou.
  let _avisoTimer = null
  function avisar(texto, tom) {
    const el = document.getElementById('eaviso')
    if (!el) return
    el.textContent = texto
    el.className = 'on ' + (tom || 'ok')
    clearTimeout(_avisoTimer)
    _avisoTimer = setTimeout(() => { el.className = '' }, 4200)
  }
  window.mensagemTopo = (t) => avisar(t, 'aviso')

  /** Leva para a tela do painel onde a ação acontece (a BrowserView entra na frente). */
  function irPara(rota, oQue) {
    if (DEMO) {
      avisar('No modo demonstração o painel não abre — no app conectado, este botão leva a '
        + rota + (oQue ? ' para ' + oQue : '') + '.', 'aviso')
      return
    }
    avisar('Abrindo o painel' + (oQue ? ' para ' + oQue : '') + '…', 'ok')
    ipcRenderer.invoke('abrir-rota', rota).then((r) => {
      if (!r || !r.ok) avisar('Não deu para abrir o painel agora.', 'erro')
    }).catch(() => avisar('Não deu para abrir o painel agora.', 'erro'))
  }

  /** Impressão de comanda — é da MÁQUINA, então o app faz de verdade. */
  function imprimirComanda(botao, pedido, canal) {
    const antes = botao.textContent
    botao.textContent = 'imprimindo…'
    ipcRenderer.invoke(canal || 'impressao-comanda', pedido ? { pedido } : undefined).then((r) => {
      const ok = !!(r && r.ok)
      botao.textContent = ok ? '✓ enviado à impressora' : '✗ não imprimiu'
      avisar(ok ? 'Comanda enviada à impressora.' : 'Não deu para imprimir — confira a impressora em Impressão.', ok ? 'ok' : 'erro')
      setTimeout(() => { botao.textContent = antes }, 3500)
    }).catch(() => {
      botao.textContent = '✗ não imprimiu'
      avisar('Não deu para imprimir — confira a impressora em Impressão.', 'erro')
      setTimeout(() => { botao.textContent = antes }, 3500)
    })
  }

  /** PDF da tela aberta — o Electron imprime a própria janela, sem passar pelo servidor. */
  function salvarPdf(botao) {
    const antes = botao ? botao.textContent : ''
    if (botao) botao.textContent = 'gerando…'
    const alvo = document.getElementById('econtent')
    ipcRenderer.invoke('relatorio-pdf', {
      titulo: tituloDaRota(MENU, ROTA), rota: ROTA,
      html: alvo ? alvo.innerHTML : '',
    }).then((r) => {
      if (botao) botao.textContent = antes
      if (r && r.ok) avisar('PDF salvo em ' + r.caminho, 'ok')
      else if (r && r.cancelado) avisar('Salvamento cancelado.', 'aviso')
      else avisar('Não deu para gerar o PDF.', 'erro')
    }).catch(() => {
      if (botao) botao.textContent = antes
      avisar('Não deu para gerar o PDF.', 'erro')
    })
  }

  // ── Ficha (painel lateral) ───────────────────────────────────────────────
  // Abre ao clicar numa linha, num cartão do quadro ou numa mesa. Painel, não página:
  // no balcão se abre um pedido e se volta para a lista em seguida.
  function abrirFicha(titulo, corpo) {
    fecharFicha()
    const div = document.createElement('div')
    div.innerHTML = Ficha.painel(titulo, corpo)
    document.body.appendChild(div.firstChild)
  }
  function fecharFicha() {
    const f = document.getElementById('eloFicha')
    if (f) f.remove()
  }

  /** Põe ou tira uma unidade do item no pedido que está sendo montado. */
  function mexerNoItem(nome, delta) {
    const catalogo = (DADOS_TELA && DADOS_TELA.categorias) || []
    const produto = catalogo.reduce((achado, c) => achado
      || (c.itens || []).find((i) => i.nome === nome), null)
    const atual = VENDA.itens.find((i) => i.nome === nome)
    if (atual) {
      atual.qtd += delta
      if (atual.qtd <= 0) VENDA.itens = VENDA.itens.filter((i) => i !== atual)
    } else if (delta > 0 && produto) {
      // O id vai junto: é ele que o painel exige para lançar o pedido.
      VENDA.itens = VENDA.itens.concat([{ id: produto.id || null, nome, preco: Number(produto.preco) || 0, qtd: 1 }])
    }
    redesenharTelaAtual()
  }

  /** Fecha a venda: manda para o main gravar e mostra o recibo com o número. */
  function fecharVenda() {
    const dados = DADOS_TELA || {}
    const falta = TelaVenda.oQueFalta(VENDA, dados.taxasBairro)
    if (falta) { avisar(falta, 'aviso'); return }
    const t = TelaVenda.totais(VENDA, dados.taxasBairro)
    avisar('Fechando a venda…', 'ok')
    ipcRenderer.invoke('venda-registrar', {
      tipo: VENDA.tipo, cliente: VENDA.nome, telefone: VENDA.telefone, bairro: VENDA.bairro,
      endereco: VENDA.endereco, observacao: VENDA.observacao, forma: VENDA.forma,
      trocoPara: Number(VENDA.trocoPara) || 0, itens: VENDA.itens,
      produtos: t.produtos, entrega: t.entrega, total: t.total,
    }).then((r) => {
      if (r && r.ok) {
        VENDA.numero = r.numero
        avisar('Venda #' + String(r.numero).padStart(4, '0') + ' registrada · ' + fmtBRLSimples(t.total), 'ok')
        redesenharTelaAtual()
      } else {
        avisar((r && r.erro) || 'Não deu para fechar a venda agora.', 'erro')
      }
    }).catch(() => avisar('Não deu para fechar a venda agora.', 'erro'))
  }
  const fmtBRLSimples = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  /** Volta os filtros do Financeiro ao neutro (mantém o mês escolhido). */
  function zerarFiltrosFin() {
    FIN.busca = ''; FIN.direcao = 'todas'; FIN.categoria = 'todas'; FIN.forma = 'todas'
    FIN.origem = 'todas'; FIN.usuario = 'todos'; FIN.filtro = 'todas'
    FIN.situacaoConta = 'todas'; FIN.tipoConta = 'todas'; FIN.pagina = 0
  }

  /** Acha o registro clicado dentro do dado que a tela já tem na mão. */
  function acharNoDado(chave) {
    const d = DADOS_TELA
    if (!d) return null
    const listas = [d.itens, d.mesas, d.produtos, d.contas, d.prontos, d.repor, d.avulsos].filter(Array.isArray)
    // Compara com TODOS os identificadores do registro: cada tela usa o seu como chave
    // da linha (a de clientes usa o telefone, a de pedidos o número). Comparar só com o
    // primeiro que existir fazia a ficha do cliente não abrir.
    const bate = (x) => [x.numero, x.nome, x.telefone, x.codigo, x.descricao, x.pedido, x.mesa]
      .some((v) => v != null && String(v) === String(chave))
    for (const lista of listas) {
      const achado = lista.find(bate)
      if (achado) return achado
    }
    return null
  }

  /** Ficha do pedido a partir do cartão do KDS (o dado da fila tem outro formato). */
  function abrirFichaKds(numero) {
    const p = ((DADOS_TELA && DADOS_TELA.pedidos) || []).find((x) => String(x.numero) === String(numero))
    if (!p) return
    abrirFicha('Pedido #' + String(p.numero).padStart(4, '0'), Ficha.fichaPedido({
      numero: p.numero, cliente: p.cliente, canal: p.mesa ? 'Mesa ' + p.mesa : (p.tipo || ''),
      etapa: 'producao', valor: 0,
      itens: (p.itens || []).map((i) => i.qtd + '× ' + i.nome
        + ((i.sabores || []).length ? ' (' + i.sabores.map((s2) => s2.nome).join(', ') + ')' : '')
        + (i.obs ? ' — ' + i.obs : '')),
      obs: p.obs || '',
    }))
  }

  function abrirFichaDe(chave) {
    const item = acharNoDado(chave)
    if (!item) return
    if (ROTA === '/admin/pedidos' || ROTA === '/admin/despacho') {
      abrirFicha('Pedido #' + (item.numero || item.pedido || chave), Ficha.fichaPedido(item))
    } else if (ROTA === '/admin/clientes' || ROTA === '/admin/fidelidade') {
      abrirFicha(item.nome || 'Cliente', Ficha.fichaCliente(item))
    } else if (ROTA === '/admin/cardapio') {
      abrirFicha(item.nome || 'Produto', Ficha.fichaProduto(item))
    }
  }

  // Trocar a métrica redesenha com o dado que já está na mão — sem nova consulta,
  // como no painel (o servidor manda as três séries de uma vez).
  function redesenharTelaAtual() {
    const tela = telaDe(ROTA)
    if (!tela || !DADOS_TELA) return
    document.getElementById('econtent').innerHTML = tela.desenhar(DADOS_TELA, { online: ONLINE, ts: Date.now(), demo: DEMO })
  }

  // O menu vem do servidor, mas o app acrescenta o que é dele: impressão só existe
  // aqui. Entra no grupo Sistema, junto de Configurações.
  function comTelasDoApp(menu) {
    if (!menu || !menu.secoes) return menu
    const copia = { ...menu, secoes: menu.secoes.map((s) => ({ ...s, itens: s.itens.slice() })) }
    let sistema = copia.secoes.find((s) => /sistema/i.test(s.titulo))
    if (!sistema) { sistema = { titulo: 'Sistema', itens: [] }; copia.secoes.push(sistema) }
    if (!sistema.itens.some((i) => i.href === '/app/impressao')) {
      sistema.itens.push({
        id: 'impressao', href: '/app/impressao', label: 'Impressão',
        icone: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
      })
    }
    return copia
  }

  async function carregarMenu() {
    try {
      const r = await ipcRenderer.invoke('menu-carregar')
      if (r && r.dados) { MENU = comTelasDoApp(r.dados); pintar() }
    } catch (e) { /* boot antes da ponte: o próximo ciclo pega */ }
  }

  document.addEventListener('click', (e) => {
    const btPerFin = e.target.closest ? e.target.closest('[data-periodo-fin]') : null
    if (btPerFin) {
      PERIODO_FIN = btPerFin.getAttribute('data-periodo-fin')
      carregarTelaNativa(ROTA)
      return
    }
    const btFiltroCar = e.target.closest ? e.target.closest('[data-filtro-carrinho]') : null
    if (btFiltroCar) {
      FILTRO['/admin/carrinhos'] = btFiltroCar.getAttribute('data-filtro-carrinho')
      redesenharTelaAtual()
      return
    }
    const btAbaCli = e.target.closest ? e.target.closest('[data-aba-cliente]') : null
    if (btAbaCli) { ABA['/admin/clientes'] = btAbaCli.getAttribute('data-aba-cliente'); redesenharTelaAtual(); return }
    const btAbaCar = e.target.closest ? e.target.closest('[data-aba-carrinho]') : null
    if (btAbaCar) { ABA['/admin/carrinhos'] = btAbaCar.getAttribute('data-aba-carrinho'); redesenharTelaAtual(); return }
    const btAbaCard = e.target.closest ? e.target.closest('[data-aba-cardapio]') : null
    if (btAbaCard) {
      ABA['/admin/cardapio'] = btAbaCard.getAttribute('data-aba-cardapio')
      redesenharTelaAtual()
      return
    }
    const btCategoria = e.target.closest ? e.target.closest('[data-categoria]') : null
    if (btCategoria && !e.target.closest('[data-acao]')) {
      const nome = btCategoria.getAttribute('data-categoria')
      const i = CATEGORIAS_ABERTAS.indexOf(nome)
      if (i >= 0) CATEGORIAS_ABERTAS.splice(i, 1)
      else CATEGORIAS_ABERTAS = CATEGORIAS_ABERTAS.concat([nome])
      redesenharTelaAtual()
      return
    }
    const btAbaCfg = e.target.closest ? e.target.closest('[data-aba-cfg]') : null
    if (btAbaCfg) { ABA_CFG = btAbaCfg.getAttribute('data-aba-cfg'); SUB_CFG = 'config'; redesenharTelaAtual(); return }
    const btSubCfg = e.target.closest ? e.target.closest('[data-sub-cfg]') : null
    if (btSubCfg) { SUB_CFG = btSubCfg.getAttribute('data-sub-cfg'); redesenharTelaAtual(); return }
    const btAbaCampanha = e.target.closest ? e.target.closest('[data-aba-campanha]') : null
    if (btAbaCampanha) { ABA_CAMPANHA = btAbaCampanha.getAttribute('data-aba-campanha'); redesenharTelaAtual(); return }
    const btAbaFid = e.target.closest ? e.target.closest('[data-aba-fidelidade]') : null
    if (btAbaFid) { ABA_FIDELIDADE = btAbaFid.getAttribute('data-aba-fidelidade'); redesenharTelaAtual(); return }
    const btPeriodoFid = e.target.closest ? e.target.closest('[data-periodo-fid]') : null
    if (btPeriodoFid) { PERIODO_FID = btPeriodoFid.getAttribute('data-periodo-fid'); carregarTelaNativa(ROTA); return }
    const btPeriodoRel = e.target.closest ? e.target.closest('[data-periodo-rel]') : null
    if (btPeriodoRel) {
      PERIODO_REL = btPeriodoRel.getAttribute('data-periodo-rel')
      carregarTelaNativa(ROTA)   // período novo = números novos: recarrega
      return
    }
    const btAbaRel = e.target.closest ? e.target.closest('[data-aba-rel]') : null
    if (btAbaRel) {
      ABA_REL = btAbaRel.getAttribute('data-aba-rel')
      redesenharTelaAtual()
      return
    }
    // ── Despacho: seleção. É estado de TELA, então o app faz de verdade — sem isso
    // a caixa marcava e desmarcava sozinha a cada redesenho.
    const cxBairro = e.target.closest ? e.target.closest('[data-sel-bairro]') : null
    if (cxBairro) {
      const bairro = cxBairro.getAttribute('data-sel-bairro')
      const doBairro = ((DADOS_TELA && DADOS_TELA.prontos) || [])
        .filter((p) => (p.bairro || 'Sem bairro') === bairro).map((p) => String(p.pedido))
      const todosJa = doBairro.every((n) => SEL_DESPACHO.indexOf(n) >= 0)
      SEL_DESPACHO = todosJa
        ? SEL_DESPACHO.filter((n) => doBairro.indexOf(n) < 0)
        : SEL_DESPACHO.concat(doBairro.filter((n) => SEL_DESPACHO.indexOf(n) < 0))
      redesenharTelaAtual()
      return
    }
    const cxPedido = e.target.closest ? e.target.closest('[data-sel]') : null
    if (cxPedido) {
      const n = cxPedido.getAttribute('data-sel')
      const i = SEL_DESPACHO.indexOf(n)
      SEL_DESPACHO = i >= 0 ? SEL_DESPACHO.filter((x) => x !== n) : SEL_DESPACHO.concat([n])
      redesenharTelaAtual()
      return
    }
    // ── Campanhas: escolher o perfil muda a audiência (o número já vem por perfil).
    const cartaoPerfil = e.target.closest ? e.target.closest('[data-perfil-campanha]') : null
    if (cartaoPerfil) {
      const chave = cartaoPerfil.getAttribute('data-perfil-campanha')
      PERFIL_CAMPANHA = PERFIL_CAMPANHA === chave ? null : chave
      redesenharTelaAtual()
      return
    }
    // ── KDS e cardápio: clicar no cartão abre a ficha, como nas listas.
    const cartaoKds = e.target.closest ? e.target.closest('[data-pedido-kds]') : null
    if (cartaoKds && !e.target.closest('[data-acao]')) {
      abrirFichaKds(cartaoKds.getAttribute('data-pedido-kds'))
      return
    }
    const itemCardapio = e.target.closest ? e.target.closest('[data-item]') : null
    if (itemCardapio && !e.target.closest('[data-acao]')) {
      const produto = acharNoDado(itemCardapio.getAttribute('data-item'))
      if (produto) abrirFicha(produto.nome || 'Produto', Ficha.fichaProduto(produto))
      return
    }
    // ── Venda manual: o PDV é a única tela do app que escreve ──
    const btTipoVenda = e.target.closest ? e.target.closest('[data-venda-tipo]') : null
    if (btTipoVenda) { VENDA.tipo = btTipoVenda.getAttribute('data-venda-tipo'); redesenharTelaAtual(); return }
    const btBairro = e.target.closest ? e.target.closest('[data-venda-bairro]') : null
    if (btBairro) { VENDA.bairro = btBairro.getAttribute('data-venda-bairro'); redesenharTelaAtual(); return }
    const btForma = e.target.closest ? e.target.closest('[data-venda-forma]') : null
    if (btForma) { VENDA.forma = btForma.getAttribute('data-venda-forma'); redesenharTelaAtual(); return }
    const btCliente = e.target.closest ? e.target.closest('[data-venda-cliente]') : null
    if (btCliente) {
      const chave = btCliente.getAttribute('data-venda-cliente')
      const c2 = ((DADOS_TELA && DADOS_TELA.clientes) || []).find((x) => (x.telefone || x.nome) === chave)
      if (c2) { VENDA.nome = c2.nome || ''; VENDA.telefone = c2.telefone || ''; VENDA.bairro = c2.bairro || VENDA.bairro }
      redesenharTelaAtual()
      return
    }
    const btAdd = e.target.closest ? e.target.closest('[data-venda-add]') : null
    if (btAdd) { mexerNoItem(btAdd.getAttribute('data-venda-add'), +1); return }
    const btMenos = e.target.closest ? e.target.closest('[data-venda-menos]') : null
    if (btMenos) { mexerNoItem(btMenos.getAttribute('data-venda-menos'), -1); return }

    // ── Financeiro: filtros, mês, modo e linhas que abrem ──
    const FIN_ATTRS = {
      'data-direcao-fin': 'direcao', 'data-categoria-fin': 'categoria', 'data-forma-fin': 'forma',
      'data-origem-fin': 'origem', 'data-usuario-fin': 'usuario', 'data-filtro-fin': 'filtro',
      'data-modo-extrato': 'modoExtrato', 'data-situacao-conta': 'situacaoConta', 'data-tipo-conta': 'tipoConta',
    }
    for (const attr of Object.keys(FIN_ATTRS)) {
      const bt = e.target.closest ? e.target.closest('[' + attr + ']') : null
      if (bt) {
        FIN[FIN_ATTRS[attr]] = bt.getAttribute(attr)
        FIN.pagina = 0
        redesenharTelaAtual()
        return
      }
    }
    const btMes = e.target.closest ? e.target.closest('[data-mes-fin]') : null
    if (btMes) { FIN.mes = btMes.getAttribute('data-mes-fin'); redesenharTelaAtual(); return }
    const btPag = e.target.closest ? e.target.closest('[data-pag-fin]') : null
    if (btPag) { FIN.pagina = Number(btPag.getAttribute('data-pag-fin')) || 0; redesenharTelaAtual(); return }
    const btDia = e.target.closest ? e.target.closest('[data-dia-extrato]') : null
    if (btDia) {
      const dia = btDia.getAttribute('data-dia-extrato')
      const i = FIN.diasAbertos.indexOf(dia)
      if (i >= 0) FIN.diasAbertos.splice(i, 1); else FIN.diasAbertos.push(dia)
      redesenharTelaAtual()
      return
    }
    const btDre = e.target.closest ? e.target.closest('[data-dre]') : null
    if (btDre) {
      const chave = btDre.getAttribute('data-dre')
      const i = FIN.dreAbertas.indexOf(chave)
      if (i >= 0) FIN.dreAbertas.splice(i, 1); else FIN.dreAbertas.push(chave)
      redesenharTelaAtual()
      return
    }
    const btSubGestao = e.target.closest ? e.target.closest('[data-subgestao]') : null
    if (btSubGestao) {
      const partes = btSubGestao.getAttribute('data-subgestao').split(':')
      SUB_GESTAO[partes[0]] = partes[1]
      redesenharTelaAtual()
      return
    }
    const btPeriodoMov = e.target.closest ? e.target.closest('[data-periodo-mov]') : null
    if (btPeriodoMov) {
      PERIODO_MOV = btPeriodoMov.getAttribute('data-periodo-mov')
      redesenharTelaAtual()
      return
    }
    const btFicha = e.target.closest ? e.target.closest('[data-ficha]') : null
    if (btFicha) {
      const nome = btFicha.getAttribute('data-ficha')
      FICHA_ABERTA = FICHA_ABERTA === nome ? null : nome
      redesenharTelaAtual()
      return
    }
    const btCatEstoque = e.target.closest ? e.target.closest('[data-cat-estoque]') : null
    if (btCatEstoque) {
      CAT_ESTOQUE = btCatEstoque.getAttribute('data-cat-estoque')
      redesenharTelaAtual()
      return
    }
    const btBloco = e.target.closest ? e.target.closest('[data-bloco-estoque]') : null
    if (btBloco && !e.target.closest('[data-acao]')) {
      const id = btBloco.getAttribute('data-bloco-estoque')
      const i = BLOCOS_FECHADOS.indexOf(id)
      if (i >= 0) BLOCOS_FECHADOS.splice(i, 1)
      else BLOCOS_FECHADOS = BLOCOS_FECHADOS.concat([id])
      redesenharTelaAtual()
      return
    }
    const btFiltroPedido = e.target.closest ? e.target.closest('[data-filtro-pedido]') : null
    if (btFiltroPedido) {
      FILTRO_PEDIDO = btFiltroPedido.getAttribute('data-filtro-pedido')
      redesenharTelaAtual()
      return
    }
    const btVisao = e.target.closest ? e.target.closest('[data-visao]') : null
    if (btVisao) {
      VISAO[ROTA] = btVisao.getAttribute('data-visao')
      redesenharTelaAtual()
      return
    }
    const btSubaba = e.target.closest ? e.target.closest('[data-subaba]') : null
    if (btSubaba) {
      SUBABA[ROTA] = btSubaba.getAttribute('data-subaba')
      redesenharTelaAtual()
      return
    }
    const btAba = e.target.closest ? e.target.closest('[data-aba]') : null
    if (btAba) {
      ABA[ROTA] = btAba.getAttribute('data-aba')
      // Filtro é da ABA, não da tela: levar o filtro do Extrato para as Contas a pagar
      // faria a lista abrir vazia sem explicação.
      if (ROTA === '/admin/financeiro') zerarFiltrosFin()
      redesenharTelaAtual()
      return
    }
    const btModo = e.target.closest ? e.target.closest('[data-modo]') : null
    if (btModo) {
      MODO_PEDIDOS = btModo.getAttribute('data-modo')
      redesenharTelaAtual()
      return
    }
    const btFiltro = e.target.closest ? e.target.closest('[data-filtro]') : null
    if (btFiltro) {
      FILTRO[ROTA] = btFiltro.getAttribute('data-filtro')
      redesenharTelaAtual()
      return
    }
    if (e.target.closest && e.target.closest('[data-fechar-ficha]')) { fecharFicha(); return }
    const btImpressora = e.target.closest ? e.target.closest('[data-impressora]') : null
    if (btImpressora) {
      ipcRenderer.invoke('impressao-escolher', { nome: btImpressora.getAttribute('data-impressora') })
        .then(() => carregarTelaNativa(ROTA))
      return
    }
    const btAcao = e.target.closest ? e.target.closest('[data-acao]') : null
    if (btAcao) {
      const acao = btAcao.getAttribute('data-acao')
      // As ações de impressão FAZEM (o resto ainda é pelo painel).
      // Casos que precisam do dado da tela, antes do mapa.
      if (acao === 'impressao:procurar') {
        avisar('Procurando impressoras deste computador…', 'ok')
        carregarTelaNativa(ROTA)
        return
      }
      if (acao === 'kds:tv') {
        const kds = (DADOS_TELA && DADOS_TELA.acessoTv) || {}
        abrirFicha('Acesso pela TV', Ficha.fichaAcessoTv({
          ...kds, dominioCardapio: require('../../src-electron/brand').dominio_cardapio,
        }))
        return
      }
      if (acao === 'impressao:teste' || acao === 'impressao:comanda') {
        imprimirComanda(btAcao, null, acao === 'impressao:teste' ? 'impressao-teste' : 'impressao-comanda')
        return
      }

      // Cada ação tem um destino declarado em acoes.js. Se depende do servidor, o app
      // ABRE a tela certa do painel — o clique leva ao lugar da ação, em vez de morrer
      // num recado. Se é da máquina (impressora, PDF) ou só muda a tela, o app faz.
      const destino = Acoes.destinoDe(acao)
      if (destino && destino.app === 'comanda') {
        const pedido = acao.indexOf('venda:imprimir:') === 0
          ? { numero: VENDA.numero, cliente: VENDA.nome || 'Consumidor',
            valor: TelaVenda.totais(VENDA, (DADOS_TELA || {}).taxasBairro).total,
            itens: VENDA.itens.map((i) => i.qtd + '× ' + i.nome) }
          : acharNoDado(acao.split(':').pop())
        imprimirComanda(btAcao, pedido)
        return
      }
      if (destino && destino.app === 'comanda-ficha') { imprimirComanda(btAcao, acharNoDado(acao.split(':')[2])); return }
      if (destino && destino.app === 'pdf') { salvarPdf(btAcao); return }
      if (destino && destino.app === 'recarregar') {
        avisar('Período aplicado — números atualizados.', 'ok')
        carregarTelaNativa(ROTA)
        return
      }
      if (destino && destino.app === 'limpar-selecao') { SEL_DESPACHO = []; redesenharTelaAtual(); return }
      if (destino && destino.app === 'limpar-filtros-fin') { zerarFiltrosFin(); redesenharTelaAtual(); return }
      // Abrir a venda manual: é tela do APP, não do painel.
      if (destino && destino.app === 'venda') {
        if (ROTA !== '/admin/venda') { ROTA = '/admin/venda'; pintar(); abrirRota(ROTA) }
        return
      }
      if (destino && destino.app === 'venda-cliente') {
        const c3 = acharNoDado(acao.split(':')[2])
        VENDA = TelaVenda.vendaVazia()
        if (c3) { VENDA.nome = c3.nome || ''; VENDA.telefone = c3.telefone || ''; VENDA.bairro = c3.bairro || '' }
        fecharFicha()
        ROTA = '/admin/venda'
        pintar()
        abrirRota(ROTA)
        return
      }
      if (destino && destino.app === 'entrada-menu') { MENU_ENTRADA = !MENU_ENTRADA; redesenharTelaAtual(); return }
      if (destino && destino.app === 'entrada-abrir') {
        const n = acao.split(':')[2]
        NOTA_ABERTA = NOTA_ABERTA === n ? null : n
        MENU_ENTRADA = false
        redesenharTelaAtual()
        return
      }
      if (destino && destino.app === 'entrada-fechar') { NOTA_ABERTA = null; redesenharTelaAtual(); return }
      if (destino && destino.app === 'venda-etapa') { VENDA.etapa = acao.split(':')[2]; redesenharTelaAtual(); return }
      if (destino && destino.app === 'venda-fechar') { fecharVenda(); return }
      if (destino && destino.app === 'venda-nova') {
        const tinha = VENDA.itens.length && !VENDA.numero
        VENDA = TelaVenda.vendaVazia()
        if (tinha) avisar('Venda cancelada.', 'aviso')
        redesenharTelaAtual()
        return
      }
      if (destino && destino.app === 'nf-limpar') { avisar('Os filtros da nota são do painel — aqui a lista vem inteira.', 'aviso'); return }
      if (destino && destino.app === 'ordenar-clientes') {
        ORDEM_CLIENTES = ORDEM_CLIENTES === 'gasto' ? 'recencia' : 'gasto'
        avisar(ORDEM_CLIENTES === 'gasto' ? 'Ordenado por quanto gastou.' : 'Ordenado por quem comprou mais recente.', 'ok')
        redesenharTelaAtual()
        return
      }
      if (destino && destino.rota) { irPara(destino.rota, destino.o); return }
      avisar('Esta ação ainda é feita pelo painel.', 'aviso')
      return
    }
    const btPeriodo = e.target.closest ? e.target.closest('[data-periodo]') : null
    if (btPeriodo) {
      PERIODO = btPeriodo.getAttribute('data-periodo')
      carregarTelaNativa(ROTA)   // período novo = série nova: recarrega
      return
    }
    const btMetrica = e.target.closest ? e.target.closest('[data-metrica]') : null
    if (btMetrica) {
      METRICA = btMetrica.getAttribute('data-metrica')
      redesenharTelaAtual()
      return
    }
    const alvoFicha = e.target.closest
      ? (e.target.closest('[data-linha]') || e.target.closest('[data-pedido]') || e.target.closest('[data-mesa]'))
      : null
    if (alvoFicha && !e.target.closest('[data-acao]')) {
      const chave = alvoFicha.getAttribute('data-linha') || alvoFicha.getAttribute('data-pedido') || alvoFicha.getAttribute('data-mesa')
      abrirFichaDe(chave)
      return
    }
    const item = e.target.closest ? e.target.closest('.erailitem') : null
    if (item && !item.classList.contains('off')) {
      ROTA = item.getAttribute('data-href')
      pintar()
      abrirRota(ROTA)
    }
  })

  $('erailToggle').addEventListener('click', () => {
    const recolhido = $('erail').classList.toggle('recolhido')
    $('erailToggle').textContent = recolhido ? '›' : '‹'
    ipcRenderer.send('sidebar-largura', recolhido ? 76 : 252)
  })

  // canais que o main já tem desde a v1 (main.js:628-647) — o shell novo reusa,
  // em vez de criar um segundo jeito de fazer a mesma coisa
  $('jbMin').addEventListener('click', () => ipcRenderer.send('window-minimize'))
  $('jbMax').addEventListener('click', () => ipcRenderer.send('window-maximize'))
  $('jbFechar').addEventListener('click', () => ipcRenderer.send('window-close'))
  $('chipSplit').addEventListener('click', () => {
    VIEW = VIEW === 'split' ? 'cardapio' : 'split'
    ipcRenderer.send('change-view', { view: VIEW })
  })
  $('btnWhats').addEventListener('click', () => {
    VIEW = VIEW === 'whatsapp' ? 'cardapio' : 'whatsapp'
    ipcRenderer.send('change-view', { view: VIEW })
  })

  // Busca: filtra o que já está na tela, sem nova consulta. O input não é recriado
  // (recriar a cada tecla faria o cursor pular), então só a grade é redesenhada.
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'buscaCardapio') {
      TERMO['/admin/cardapio'] = e.target.value
      const pos3 = e.target.selectionStart
      redesenharTelaAtual()
      const c = document.getElementById('buscaCardapio')
      if (c) { c.focus(); try { c.setSelectionRange(pos3, pos3) } catch (x) {} }
      return
    }
    if (e.target && e.target.id === 'buscaPedidos') {
      TERMO_PEDIDO = e.target.value
      const pos2 = e.target.selectionStart
      redesenharTelaAtual()
      const novoCampo = document.getElementById('buscaPedidos')
      if (novoCampo) { novoCampo.focus(); try { novoCampo.setSelectionRange(pos2, pos2) } catch (x) {} }
      return
    }
    // Venda manual: cada campo digitado entra no pedido que está sendo montado.
    const campoVenda = e.target && e.target.getAttribute && e.target.getAttribute('data-venda-campo')
    if (campoVenda) {
      VENDA[campoVenda] = campoVenda === 'trocoPara'
        ? Number(('' + e.target.value).replace(/[^0-9,.]/g, '').replace(',', '.')) || 0
        : e.target.value
      // Busca e troco mexem no que está na tela; nome e telefone também (as sugestões).
      const pos6 = e.target.selectionStart
      redesenharTelaAtual()
      const campo = document.querySelector('[data-venda-campo="' + campoVenda + '"]')
      if (campo) { campo.focus(); try { campo.setSelectionRange(pos6, pos6) } catch (x) {} }
      return
    }
    // Compras: o que o lojista digita no item avulso precisa sobreviver ao redesenho.
    const campoAvulso = e.target && e.target.getAttribute && e.target.getAttribute('data-compra-avulsa')
    if (campoAvulso) {
      AVULSO[campoAvulso] = e.target.value
      return
    }
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-busca-fin')) {
      FIN.busca = e.target.value
      FIN.pagina = 0
      const pos5 = e.target.selectionStart
      redesenharTelaAtual()
      const campo = document.querySelector('[data-busca-fin]')
      if (campo) { campo.focus(); try { campo.setSelectionRange(pos5, pos5) } catch (x) {} }
      return
    }
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-busca-bloco')) {
      const id = e.target.getAttribute('data-busca-bloco')
      BUSCA_BLOCO[id] = e.target.value
      const pos4 = e.target.selectionStart
      redesenharTelaAtual()
      const campo = document.querySelector('[data-busca-bloco="' + id.replace(/"/g, '\\"') + '"]')
      if (campo) { campo.focus(); try { campo.setSelectionRange(pos4, pos4) } catch (x) {} }
      return
    }
    if (!e.target || e.target.id !== 'listaBusca') return
    TERMO[ROTA] = e.target.value
    const foco = document.activeElement === e.target
    const pos = e.target.selectionStart
    redesenharTelaAtual()
    if (foco) {
      const novo = document.getElementById('listaBusca')
      if (novo) { novo.focus(); try { novo.setSelectionRange(pos, pos) } catch (x) {} }
    }
  })

  // O <select> de entregador do Despacho guarda a escolha: sem isso ele voltava para
  // "— entregador —" no primeiro redesenho, e quem despacha achava que não salvou.
  document.addEventListener('change', (e) => {
    // Os filtros do Financeiro são <select>: mudam no change, não no clique.
    const FIN_SELECTS = {
      'data-categoria-fin': 'categoria', 'data-forma-fin': 'forma', 'data-origem-fin': 'origem',
      'data-usuario-fin': 'usuario', 'data-situacao-conta': 'situacaoConta', 'data-tipo-conta': 'tipoConta',
    }
    for (const attr of Object.keys(FIN_SELECTS)) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute(attr)) {
        FIN[FIN_SELECTS[attr]] = e.target.value
        FIN.pagina = 0
        redesenharTelaAtual()
        return
      }
    }

    const sel = e.target && e.target.getAttribute && e.target.getAttribute('data-entregador-de')
    if (!sel) return
    ENTREGADOR_DE[sel] = e.target.value
    if (e.target.value) avisar('Pedido #' + sel + ' com ' + e.target.value + '. Despachar ainda é pelo painel.', 'ok')
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharFicha()
  })

  ipcRenderer.on('rota-mudou', (e, rota) => {
    // A view por trás não manda no menu: com uma tela nativa na frente (ou em
    // demonstração), o painel navegando sozinho — para o login, por exemplo —
    // apagava o item ativo e trocava o título por "Painel".
    if (DEMO || ehNativa(ROTA)) return
    ROTA = rota
    pintar()
  })
  ipcRenderer.on('rede-mudou', (e, online) => {
    ONLINE = online
    pintar()
    if (online) { carregarMenu(); if (ehNativa(ROTA)) carregarTelaNativa(ROTA) }
  })
  ipcRenderer.on('view-changed', (e, a) => {
    VIEW = (a && a.view) || 'cardapio'
    $('chipSplit').className = 'echip' + (VIEW === 'split' ? ' on' : '')
    $('btnWhats').className = 'eiconbtn' + (VIEW === 'whatsapp' ? ' on' : '')
  })

  // pinta o acento da marca antes do primeiro desenho
  const tons = tonsDoAcento(brand.cor_primaria, brand.acento)
  const raiz = document.documentElement.style
  raiz.setProperty('--acento', tons.base)
  raiz.setProperty('--acento-escuro', tons.escuro)
  raiz.setProperty('--acento-suave', tons.suave)
  raiz.setProperty('--acento-texto', tons.texto)
  raiz.setProperty('--acento-linha', tons.linha)

  // Logo da marca (assets/logo-marca.svg, posta pelo apply-brand). Se a marca não
  // tiver SVG, mostra o nome — nunca o ícone quebrado que aparecia antes.
  const logo = $('erailLogo')
  logo.addEventListener('error', () => {
    logo.style.display = 'none'
    const txt = $('erailNomeMarca')
    txt.textContent = brand.nome_delivery || brand.nome_app
    txt.style.display = 'block'
  })

  $('tbNome').textContent = brand.nome_app
  document.title = brand.nome_app
  pintar()
  ipcRenderer.invoke('app-info').then((info) => {
    DEMO = !!(info && info.demo)
    if (DEMO) { ONLINE = true; ROTA = '/admin'; abrirRota('/admin') }
    pintar()
  }).catch(() => {})
  ipcRenderer.invoke('rede-status').then((r) => { ONLINE = !!(r && r.online); pintar() }).catch(() => {})
  carregarMenu()
  setInterval(carregarMenu, 30000)
}
