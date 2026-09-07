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
// Telas do APP, que não existem no painel: impressora é da máquina, não da nuvem.
const TELAS_DO_APP = ['/app/impressao']
const TELAS_NATIVAS = ['/admin', '/admin/caixa'].concat(Object.keys(CATALOGO_LISTAS)).concat(TELAS_OPERACAO).concat(TELAS_FINAIS).concat(TELAS_DO_APP)

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
  let MODO_PEDIDOS = 'quadro'   // quadro (padrão) | lista
  let EXTRAS_PEDIDOS = false    // colunas de entrega no quadro
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
      desenhar: (dados, estado) => TelaCaixa.htmlDoCaixa(dados, estado),
      erro: 'Não deu para carregar o caixa agora.',
    },
  }

  const Operacao = require('./tela-operacao')
  NATIVAS['/admin/cozinha'] = {
    canal: 'cozinha-carregar',
    desenhar: (dados, estado) => Operacao.htmlKds(dados, { ...estado, titulo: 'Cozinha' }),
    erro: 'Não deu para carregar a produção agora.',
  }
  NATIVAS['/admin/bar'] = {
    canal: 'bar-carregar',
    desenhar: (dados, estado) => Operacao.htmlKds(dados, { ...estado, titulo: 'Bar' }),
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
        modo: MODO_PEDIDOS, extras: EXTRAS_PEDIDOS,
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
      desenhar: (dados, estado) => ComAbas.htmlComAbas(rota, dados, { ...estado, aba: ABA[rota] }),
      erro: 'Não deu para carregar esta tela agora.',
    }
  }

  const TelaImpressao = require('./tela-impressao')
  const Ficha = require('./ficha')
  NATIVAS['/app/impressao'] = {
    canal: 'impressao-info',
    desenhar: (dados, estado) => TelaImpressao.htmlImpressao(dados, estado),
    erro: 'Não deu para ler as impressoras deste computador.',
  }

  const Finais = require('./telas-finais')
  NATIVAS['/admin/insights'] = { canal: 'insights-carregar', desenhar: (d, e) => Finais.htmlInsights(d, e), erro: 'Não deu para carregar os insights agora.' }
  NATIVAS['/admin/relatorios'] = { canal: 'relatorios-carregar', desenhar: (d, e) => Finais.htmlRelatorios(d, e), erro: 'Não deu para carregar os relatórios agora.' }
  NATIVAS['/admin/configuracoes'] = { canal: 'configuracoes-carregar', desenhar: (d, e) => Finais.htmlConfiguracoes(d, e), erro: 'Não deu para carregar as configurações agora.' }

  function telaDe(rota) {
    if (NATIVAS[rota]) return NATIVAS[rota]
    const base = Object.keys(NATIVAS).find((b) => b !== '/admin' && ('' + rota).indexOf(b + '/') === 0)
    return base ? NATIVAS[base] : null
  }

  async function carregarTelaNativa(rota) {
    const alvo = document.getElementById('econtent')
    const tela = telaDe(rota)
    if (!tela) return
    alvo.innerHTML = '<div class="ecard"><div class="evazio">Carregando…</div></div>'
    try {
      const r = await ipcRenderer.invoke(tela.canal, tela.argumentos ? tela.argumentos() : undefined)
      if (ROTA !== rota) return   // o lojista já foi para outra tela
      DADOS_TELA = r && r.dados
      alvo.innerHTML = tela.desenhar(DADOS_TELA, { online: !(r && r.offline), ts: (r && r.ts) || 0, demo: DEMO })
    } catch (e) {
      alvo.innerHTML = '<div class="ecard"><div class="evazio">' + tela.erro + '</div></div>'
    }
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

  /** Acha o registro clicado dentro do dado que a tela já tem na mão. */
  function acharNoDado(chave) {
    const d = DADOS_TELA
    if (!d) return null
    const listas = [d.itens, d.mesas, d.produtos, d.contas].filter(Array.isArray)
    for (const lista of listas) {
      const achado = lista.find((x) => String(x.numero || x.nome || x.telefone || x.codigo || x.descricao || x.pedido) === String(chave))
      if (achado) return achado
    }
    return null
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
    const btAba = e.target.closest ? e.target.closest('[data-aba]') : null
    if (btAba) {
      ABA[ROTA] = btAba.getAttribute('data-aba')
      redesenharTelaAtual()
      return
    }
    const btModo = e.target.closest ? e.target.closest('[data-modo]') : null
    if (btModo) {
      MODO_PEDIDOS = btModo.getAttribute('data-modo')
      redesenharTelaAtual()
      return
    }
    const btExtras = e.target.closest ? e.target.closest('[data-extras]') : null
    if (btExtras) {
      EXTRAS_PEDIDOS = !EXTRAS_PEDIDOS
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
      if (acao === 'impressao:procurar') { carregarTelaNativa(ROTA); return }
      if (acao.indexOf('ficha:imprimir:') === 0) {
        const pedido = acharNoDado(acao.split(':')[2])
        const antes = btAcao.textContent
        btAcao.textContent = 'imprimindo…'
        ipcRenderer.invoke('impressao-comanda', { pedido }).then((r) => {
          btAcao.textContent = (r && r.ok) ? '✓ enviado à impressora' : '✗ não imprimiu'
          setTimeout(() => { btAcao.textContent = antes }, 3500)
        }).catch(() => { btAcao.textContent = '✗ não imprimiu' })
        return
      }
      if (acao === 'impressao:teste' || acao === 'impressao:comanda') {
        const canal = acao === 'impressao:teste' ? 'impressao-teste' : 'impressao-comanda'
        const antes = btAcao.textContent
        btAcao.textContent = 'imprimindo…'
        ipcRenderer.invoke(canal).then((r) => {
          btAcao.textContent = (r && r.ok) ? '✓ enviado à impressora' : '✗ não imprimiu'
          if (r && !r.ok) console.error('[impressao]', r.erro)
          setTimeout(() => { btAcao.textContent = antes }, 3500)
        }).catch(() => { btAcao.textContent = '✗ não imprimiu'; setTimeout(() => { btAcao.textContent = antes }, 3500) })
        return
      }
    }
    if (btAcao) {
      // Ações de escrita ainda vivem no painel: em vez de fingir que fazem, dizem onde estão.
      window.mensagemTopo && window.mensagemTopo('Esta ação ainda é feita pelo painel.')
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
