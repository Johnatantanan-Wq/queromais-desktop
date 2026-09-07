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
const TELAS_NATIVAS = ['/admin/caixa']

function ehNativa(rota) {
  return TELAS_NATIVAS.some((base) => rota === base || ('' + rota).indexOf(base + '/') === 0)
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

  let MENU = null
  let ROTA = '/admin'
  let ONLINE = false
  let VIEW = 'cardapio'
  let DEMO = false

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

  async function carregarTelaNativa(rota) {
    const alvo = document.getElementById('econtent')
    if (!ehNativa(rota)) return
    alvo.innerHTML = '<div class="ecard"><div class="evazio">Carregando…</div></div>'
    try {
      const r = await ipcRenderer.invoke('caixa-carregar')
      if (ROTA !== rota) return   // o lojista já foi para outra tela
      alvo.innerHTML = TelaCaixa.htmlDoCaixa(r && r.dados, { online: !(r && r.offline), ts: (r && r.ts) || 0 })
    } catch (e) {
      alvo.innerHTML = '<div class="ecard"><div class="evazio">Não deu para carregar o caixa agora.</div></div>'
    }
  }

  async function carregarMenu() {
    try {
      const r = await ipcRenderer.invoke('menu-carregar')
      if (r && r.dados) { MENU = r.dados; pintar() }
    } catch (e) { /* boot antes da ponte: o próximo ciclo pega */ }
  }

  document.addEventListener('click', (e) => {
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

  ipcRenderer.on('rota-mudou', (e, rota) => { ROTA = rota; pintar() })
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
    if (DEMO) { ONLINE = true; abrirRota('/admin/caixa'); ROTA = '/admin/caixa' }
    pintar()
  }).catch(() => {})
  ipcRenderer.invoke('rede-status').then((r) => { ONLINE = !!(r && r.online); pintar() }).catch(() => {})
  carregarMenu()
  setInterval(carregarMenu, 30000)
}
