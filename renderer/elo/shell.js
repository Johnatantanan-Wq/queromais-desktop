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
      if (!online) classes += ' off'
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

module.exports = { htmlDoMenu, iniciaisDe, tituloDaRota, dataPorExtenso, esc, ehAtivo }

// ── daqui pra baixo, só roda dentro da janela ────────────────────────────────
if (typeof document !== 'undefined') {
  const { ipcRenderer } = require('electron')
  const brand = require('../../src-electron/brand')

  let MENU = null
  let ROTA = '/admin'
  let ONLINE = false

  const $ = (id) => document.getElementById(id)

  function pintar() {
    $('erailNav').innerHTML = htmlDoMenu(MENU, ROTA, ONLINE)
    $('etitle').textContent = tituloDaRota(MENU, ROTA)
    $('edate').textContent = dataPorExtenso(new Date())
    const loja = (MENU && MENU.loja) || {}
    $('erailAvatar').textContent = iniciaisDe(loja.nome)
    $('erailNome').textContent = loja.nome || brand.nome_delivery
    $('erailDoc').textContent = loja.documento || ''
    $('chipRede').className = 'echip' + (ONLINE ? '' : ' offline')
    $('chipRede').textContent = ONLINE ? 'conectado' : 'sem internet'
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
      ipcRenderer.invoke('abrir-rota', ROTA)
    }
  })

  $('erailToggle').addEventListener('click', () => {
    const recolhido = $('erail').classList.toggle('recolhido')
    $('erailToggle').textContent = recolhido ? '›' : '‹'
    ipcRenderer.send('sidebar-largura', recolhido ? 76 : 252)
  })

  $('jbMin').addEventListener('click', () => ipcRenderer.send('janela-minimizar'))
  $('jbMax').addEventListener('click', () => ipcRenderer.send('janela-maximizar'))
  $('jbFechar').addEventListener('click', () => ipcRenderer.send('janela-fechar'))
  $('chipSplit').addEventListener('click', () => ipcRenderer.send('trocar-view', 'split'))
  $('btnWhats').addEventListener('click', () => ipcRenderer.send('trocar-view', 'whatsapp'))

  ipcRenderer.on('rota-mudou', (e, rota) => { ROTA = rota; pintar() })
  ipcRenderer.on('rede-mudou', (e, online) => { ONLINE = online; pintar(); if (online) carregarMenu() })
  ipcRenderer.on('view-mudou', (e, qual) => {
    $('chipSplit').className = 'echip' + (qual === 'split' ? ' on' : '')
    $('btnWhats').className = 'eiconbtn' + (qual === 'whatsapp' ? ' on' : '')
  })

  $('tbNome').textContent = brand.nome_app
  document.title = brand.nome_app
  pintar()
  ipcRenderer.invoke('rede-status').then((r) => { ONLINE = !!(r && r.online); pintar() }).catch(() => {})
  carregarMenu()
  setInterval(carregarMenu, 30000)
}
