const { app, BrowserWindow, BrowserView, ipcMain, Menu, Tray, session, net, screen, shell, safeStorage } = require('electron')
const { autoUpdater } = require('electron-updater')
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const url = require('url')
const log = require('electron-log')

// ── Marca (multi-marca: Quero Mais / Pediu!) ─────────────────────────────────
// Precisa vir ANTES do require('./config'): o electron-store resolve o caminho
// do userData na construção. Cada marca tem userData próprio (config e sessão
// do WhatsApp separadas). Para queromais é no-op — caminho padrão de hoje.
const brand = require('./brand')
if (brand.user_data_name && brand.user_data_name !== app.getName()) {
  app.setName(brand.user_data_name)
  app.setPath('userData', path.join(app.getPath('appData'), brand.user_data_name))
}

const { initConfig, getConfig, setConfig } = require('./config')
// Shell "elo": só a marca que declara `"shell": "elo"` (hoje só os apps beta).
// Os módulos do shell novo nem sequer são CARREGADOS nas marcas atuais — o boot
// delas continua exatamente como era.
const SHELL_ELO = require('./brand').shell === 'elo'
const { calcularBounds } = SHELL_ELO ? require('./layout-views') : {}
const { makeStore } = SHELL_ELO ? require('./cache-store') : {}
const { criarMonitor } = SHELL_ELO ? require('./rede') : {}
const ponte = SHELL_ELO ? require('./ponte') : null
// Modo DEMONSTRAÇÃO (ver src-electron/modo.js): padrão no beta. Para falar com o
// painel de verdade: `open -a "<app>" --args --conectado` (ou PEDIU_DEMO=0). Serve para
// trabalhar nas telas sem depender de login/servidor. A topbar
// mostra um selo permanente — dado fictício não pode se passar por real.
const DEMO = require('./modo').modoDemonstracao({ shellElo: SHELL_ELO, argv: process.argv, env: process.env })
const dadosDemo = DEMO ? require('./demo-dados') : null
initConfig()

// ── Status da loja (aberta/fechada) ──────────────────────────────────────────
let _sbLoja = null
function getSupabaseLoja() {
  if (!_sbLoja) {
    const { supabaseUrl, supabaseKey } = getConfig()
    if (!supabaseUrl || !supabaseKey) return null
    _sbLoja = createClient(supabaseUrl, supabaseKey)
  }
  return _sbLoja
}

async function buscarStatusLoja() {
  const { lojaId } = getConfig()
  if (!lojaId) return null
  const sb = getSupabaseLoja()
  if (!sb) return null
  const { data } = await sb.from('lojas').select('aberta, nome').eq('id', lojaId).single()
  return data
}

async function toggleStatusLoja() {
  const { lojaId } = getConfig()
  if (!lojaId) return null
  const sb = getSupabaseLoja()
  if (!sb) return null
  const { data } = await sb.rpc('toggle_loja_aberta', { loja_id_arg: lojaId })
  if (data == null) return null
  const status = await buscarStatusLoja()
  return status
}

function enviarStatusLoja(aberta, nome) {
  global.mainWindow?.webContents.send('loja-status', { aberta, nome: nome || 'Loja' })
}

const { whatsappController } = require('./controllers/whatsapp.controller')
const { botController } = require('./controllers/bot.controller')
const { outboxController } = require('./controllers/outbox.controller')
const { cacheController } = require('./controllers/cache.controller')
const { impressaoController } = require('./controllers/impressao.controller')

const CARDAPIO_URL = getConfig().cardapioUrl
const WA_URL = 'https://web.whatsapp.com'
const WA_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const CSS_NO_SCROLL = `
  ::-webkit-scrollbar,
  ::-webkit-scrollbar-button,
  ::-webkit-scrollbar-track,
  ::-webkit-scrollbar-thumb,
  ::-webkit-scrollbar-corner {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
  }
  html, body, * {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
`

global.bot_enabled = true
global.activeView = 'cardapio'

// ── Painel compacto WhatsApp: injeta CSS+JS direto na página ─────────────────
async function injetarPainelCompacto(wc) {
  try {
    // CSS via insertCSS — vence inline styles do React (que não usam !important)
    await wc.insertCSS(CSS_NO_SCROLL)
    await wc.insertCSS(`
      /* Container esquerdo (pai de #side) marcado pelo JS com qm-side-parent */
      body.qm-compact .qm-side-parent {
        display: none !important;
      }
      /* #main sobe como overlay full-screen */
      body.qm-compact #main {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        max-height: none !important;
        z-index: 2147483640 !important;
        flex: none !important;
      }
      /* Botão voltar — aba verde no meio vertical da borda esquerda */
      #qm-btn {
        position: fixed !important;
        top: calc(50vh - 26px) !important;
        left: 0 !important;
        width: 36px !important;
        height: 52px !important;
        padding: 0 !important;
        z-index: 2147483647 !important;
        background: #25D366 !important;
        border: none !important;
        border-radius: 0 12px 12px 0 !important;
        cursor: pointer !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 2px 0 10px rgba(0,0,0,0.3) !important;
      }
      #qm-btn:hover { background: #128C7E !important; }
      body.qm-compact #qm-btn { display: flex !important; }
    `)

    await wc.executeJavaScript(`
      (function() {
        if (window.__qmDone) return;
        window.__qmDone = true;

        // Remove botão antigo se existir
        var old = document.getElementById('qm-btn');
        if (old) old.remove();

        // Cria botão "← Conversas"
        var btn = document.createElement('button');
        btn.id = 'qm-btn';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
        btn.title = 'Voltar para conversas';
        document.body.appendChild(btn);

        // Verifica se um chat está aberto
        function chatAberto() {
          return !!(
            document.querySelector('[data-testid="conversation-panel-wrapper"]') ||
            document.querySelector('[data-testid="msg-container"]') ||
            document.querySelector('#main footer')
          );
        }

        // Marca o container esquerdo para CSS poder escondê-lo
        function marcarSideParent() {
          var side = document.querySelector('#side');
          if (side && side.parentElement && !side.parentElement.classList.contains('qm-side-parent')) {
            side.parentElement.classList.add('qm-side-parent');
            console.log('[QM] sideParent marcado: ' + side.parentElement.tagName);
          }
        }

        function compactar() {
          if (document.body.classList.contains('qm-compact')) return;
          marcarSideParent();
          document.body.classList.add('qm-compact');
          console.log('[QM] compactado main=' + !!document.querySelector('#main'));
        }

        function expandir() {
          // Pausa PERMANENTE — só reativa quando o usuário clicar num contato
          window.__qmPaused = true;
          document.body.classList.remove('qm-compact');

          // Clica no botão de voltar nativo do WhatsApp
          var back = document.querySelector('[data-testid="back"]') ||
                     document.querySelector('[data-icon="back"]')?.closest('button') ||
                     document.querySelector('button[aria-label*="Back"]') ||
                     document.querySelector('button[aria-label*="Voltar"]') ||
                     document.querySelector('span[data-icon="back"]')?.parentElement;
          if (back) { back.click(); console.log('[QM] expandido + back'); }
          else { console.log('[QM] expandido'); }
        }

        btn.addEventListener('click', function(e) { e.stopPropagation(); expandir(); });
        marcarSideParent();

        // Clique em qualquer contato da lista reativa o observer
        document.addEventListener('click', function(e) {
          if (window.__qmPaused) {
            var side = document.querySelector('#side');
            if (side && side.contains(e.target)) {
              window.__qmPaused = false;
            }
          }
        }, true);

        // MutationObserver: detecta abertura/fechamento de conversa
        var t;
        var obs = new MutationObserver(function() {
          if (window.__qmPaused) return;
          clearTimeout(t);
          t = setTimeout(function() {
            if (window.__qmPaused) return;
            var aberto = chatAberto();
            var jaCompacto = document.body.classList.contains('qm-compact');
            if (aberto && !jaCompacto) compactar();
            else if (!aberto && jaCompacto) expandir();
          }, 350);
        });
        obs.observe(document.body, { childList: true, subtree: true });

        if (chatAberto()) compactar();
        console.log('[QM] init OK');
      })();
    `)
    log.info('[WA] Painel compacto injetado')
  } catch (e) {
    log.error('[WA] Erro ao injetar painel compacto:', e)
  }
}

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-site-isolation-trials')
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
app.commandLine.appendSwitch('disable-web-security')
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// ─── Single instance lock ─────────────────────────────────────────────────────

// Instância de desenvolvimento isolada: userData próprio → não colide com o
// app instalado (lock é por userData) nem suja a sessão real do WhatsApp
if (process.argv.includes('--dev-instance')) {
  app.setPath('userData', path.join(app.getPath('temp'), `${brand.user_data_name}-dev`))
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.on('second-instance', () => {
  if (global.mainWindow) {
    if (global.mainWindow.isMinimized()) global.mainWindow.restore()
    global.mainWindow.show()
    global.mainWindow.focus()
  }
})

// ─── Posicionamento das BrowserViews ─────────────────────────────────────────

// Shell "elo" (sidebar 252px + topbar 74px sob a titlebar de 44px): só a marca que
// declara `"shell": "elo"` no brand.json — hoje apenas `pediu-beta`, um app SEPARADO
// (appId/userData/instalador próprios). Quero Mais, Pediu! e Jasson não passam por
// nenhuma linha nova: nem shell, nem ponte, nem monitor de rede.
global.sidebarW   = SHELL_ELO ? 252 : 56
global.splitRatio = 0.7
const HANDLE_W    = 6
const HEADER      = SHELL_ELO ? 118 : 44   // 44 titlebar + 74 topbar

function posicionarViews() {
  const win = global.mainWindow
  if (!win || !global.cardapioView || !global.whatsappView) return
  // Tela nativa na frente: as views saem da área de conteúdo e FICAM fora — senão o
  // posicionamento do boot (e o do resize) devolvia a BrowserView para cima da tela
  // nativa, que é o que escondia o Caixa atrás do login no modo demonstração.
  if (global.telaNativaAtiva) {
    const fora = { x: 0, y: 0, width: 0, height: 0 }
    global.cardapioView.setBounds(fora)
    global.whatsappView.setBounds(fora)
    return
  }
  const b = win.getContentBounds()
  const w = b.width, h = b.height
  const SB = global.sidebarW
  const CW = w - SB
  const CH = h - HEADER

  // Shell novo: o cálculo vem de layout-views.js (puro, testado). O caminho de baixo
  // é o dos apps que já existem, INTOCADO de propósito — test/layout-views.test.js
  // prova que os dois dão o mesmo resultado, então trocar depois é seguro.
  if (SHELL_ELO) {
    const modo = global.activeView === 'split' ? 'split' : 'cardapio'
    const bounds = calcularBounds({
      largura: w, altura: h, sidebarW: SB, topoH: HEADER,
      modo, splitRatio: global.splitRatio, handleW: HANDLE_W,
    })
    global.cardapioView.setBounds(bounds.cardapio)
    global.whatsappView.setBounds(bounds.whatsapp)
    if (modo !== 'split') {
      win.setTopBrowserView(global.activeView === 'whatsapp' ? global.whatsappView : global.cardapioView)
    }
    return
  }

  // Ambas as views ficam sempre na janela e a troca usa setTopBrowserView (evita
  // add/remove de BrowserView em runtime, que causava congelamento no Windows).
  // O bounds nunca invade sidebar/titlebar, evitando congelamento dos controles HTML.
  if (global.activeView === 'split') {
    // Lado a lado: bounds não se sobrepõem, as duas ficam visíveis.
    // Nunca add/remove — só setBounds, mantendo o padrão que não congela.
    const CARD_W = Math.max(200, Math.floor(CW * global.splitRatio) - HANDLE_W)
    const WA_X   = SB + CARD_W + HANDLE_W
    const WA_W   = Math.max(200, w - WA_X)
    global.cardapioView.setBounds({ x: SB,   y: HEADER, width: CARD_W, height: CH })
    global.whatsappView.setBounds({ x: WA_X, y: HEADER, width: WA_W,   height: CH })
  } else if (global.activeView === 'whatsapp') {
    global.cardapioView.setBounds({ x: SB, y: HEADER, width: CW, height: CH })
    global.whatsappView.setBounds({ x: SB, y: HEADER, width: CW, height: CH })
    win.setTopBrowserView(global.whatsappView)
  } else {
    global.cardapioView.setBounds({ x: SB, y: HEADER, width: CW, height: CH })
    global.whatsappView.setBounds({ x: SB, y: HEADER, width: CW, height: CH })
    win.setTopBrowserView(global.cardapioView)
  }
}
global.posicionarViews = posicionarViews

// ─── Criação da janela ───────────────────────────────────────────────────────

async function createWindow() {
  global.mainWindow = new BrowserWindow({
    title: brand.nome_app,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  })

  // O shell elo pede o menu (menu-carregar) assim que carrega — se o HTML entrar
  // antes de a ponte registrar os canais, o app sobe com a barra lateral VAZIA
  // ("No handler registered for 'menu-carregar'", visto ao abrir o beta 07/09).
  // Por isso, no beta a página só entra depois da ponte, mais abaixo. As outras
  // marcas continuam carregando exatamente aqui, como sempre.
  const carregarRenderer = async () => {
    await global.mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, SHELL_ELO ? '../renderer/elo/index.html' : '../renderer/index.html'),
      protocol: 'file:',
      slashes: true,
    }))
    global.mainWindow.webContents.send('app-version', { version: app.getVersion() })
  }
  if (!SHELL_ELO) await carregarRenderer()
  global.mainWindow.setMenu(null)
  global.mainWindow.setMenuBarVisibility(false)
  if (typeof global.mainWindow.removeMenu === 'function') {
    global.mainWindow.removeMenu()
  }

  // ── BrowserView: cardápio admin (sessão persistente = cache em disco) ────
  // Sessão persistente: cache de imagens/assets sobrevive entre sessões
  const cardapioSes = session.fromPartition('persist:cardapio')

  global.cardapioView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: cardapioSes,
      preload: path.join(__dirname, 'preload/cardapio.preload.js'),
    },
  })
  global.cardapioView.webContents.loadURL(CARDAPIO_URL)

  // Sem isto, ctrl+clique / clique do meio / target="_blank" num link da view
  // (ex.: menu lateral) cai no comportamento padrão do Electron: abre uma
  // BrowserWindow genérica com a sessão PADRÃO (não a persist:cardapio) — sem
  // o cookie de login, a página vem redirecionada pra tela de login. Links da
  // mesma origem navegam na própria view (mantém a sessão autenticada);
  // links externos abrem no navegador do sistema.
  global.cardapioView.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const destino = new URL(url)
      const atual = new URL(CARDAPIO_URL)
      if (destino.origin === atual.origin) {
        global.cardapioView.webContents.loadURL(url)
      } else {
        shell.openExternal(url)
      }
    } catch (e) {
      log.warn('[NAV] setWindowOpenHandler: URL inválida:', url, e && e.message)
    }
    return { action: 'deny' }
  })

  // Autodescoberta da loja: pergunta ao admin LOGADO quem é a loja (id/slug).
  // Sem isso, outbox (notificações WhatsApp) e bot ficavam mudos em máquina
  // nova — o loja_id só entrava por variável de ambiente (caso Ludimila).
  async function descobrirLoja() {
    try {
      if (getConfig().lojaId) return
      const wc = global.cardapioView?.webContents
      if (!wc || wc.isDestroyed()) return
      const data = await wc.executeJavaScript(
        "fetch('/api/admin/loja',{credentials:'include'}).then(r=>r.ok?r.json():null).catch(()=>null)", true)
      if (data && data.id) {
        const eraOutra = getConfig().lojaId !== data.id
        setConfig({ loja_id: data.id, loja_slug: data.slug || '', loja_nome: data.nome || '' })
        log.info(`[CONFIG] loja descoberta pela sessão do admin: ${data.nome || data.id}`)
        // Avisa a tela na hora. Sem isto o shell só descobria no tick seguinte do
        // menu (30s): a barra e os números entravam "aos poucos" depois de abrir.
        if (eraOutra) { try { global.mainWindow?.webContents.send('painel-pronto') } catch (e) {} }
      }
    } catch (e) { log.warn('[CONFIG] descobrirLoja falhou:', e && e.message) }
  }
  global.cardapioView.webContents.on('did-finish-load', () => {
    descobrirLoja()
    // A view terminou de carregar: se há sessão, o menu e as telas do painel já
    // respondem. Pedir agora evita a espera do ciclo de 30 segundos.
    try { global.mainWindow?.webContents.send('painel-pronto') } catch (e) {}
  })
  setInterval(descobrirLoja, 5 * 60 * 1000) // cobre login feito depois do boot

  // Captura a sessão REAL do admin (access_token/refresh_token) da mesma view
  // autenticada — outbox/bot passam a chamar o Supabase como esse usuário
  // (is_admin_da_loja) em vez da chave anon compartilhada, que perdeu acesso
  // a whatsapp_envios/whatsapp_config/whatsapp_bot_envios na migration 0094.
  // Sempre tenta de novo (sem guard de "já tem"): o refresh_token pode ter
  // sido revogado (logout/troca de senha) e o access_token expira em ~1h.
  async function descobrirTokenWhatsapp() {
    try {
      const wc = global.cardapioView?.webContents
      if (!wc || wc.isDestroyed()) return
      const data = await wc.executeJavaScript(
        "fetch('/api/admin/whatsapp/token',{credentials:'include'}).then(r=>r.ok?r.json():null).catch(()=>null)", true)
      if (data && data.access_token && data.refresh_token) {
        setConfig({ wa_access_token: data.access_token, wa_refresh_token: data.refresh_token })
        log.info('[CONFIG] sessão do WhatsApp (outbox/bot) atualizada')
      }
    } catch (e) { log.warn('[CONFIG] descobrirTokenWhatsapp falhou:', e && e.message) }
  }
  global.cardapioView.webContents.on('did-finish-load', () => { descobrirTokenWhatsapp() })
  setInterval(descobrirTokenWhatsapp, 30 * 60 * 1000) // renova antes do access_token expirar

  const injetarSemScrollbar = (wc) => wc.insertCSS(CSS_NO_SCROLL).catch(() => {})
  // did-finish-load: carga inicial; did-navigate-in-page: rotas SPA (Next.js)
  global.cardapioView.webContents.on('did-finish-load',    () => injetarSemScrollbar(global.cardapioView.webContents))
  global.cardapioView.webContents.on('did-navigate-in-page', () => injetarSemScrollbar(global.cardapioView.webContents))
  global.cardapioView.webContents.on('did-frame-finish-load', () => injetarSemScrollbar(global.cardapioView.webContents))

  // ── BrowserView: WhatsApp Web ─────────────────────────────────────────────
  global.whatsappView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload/whatsapp.preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  })
  // Ambas as views adicionadas com bounds corretos desde o início
  // Troca de tela via setTopBrowserView — nunca add/remove em runtime
  const { width: _cw, height: _ch } = global.mainWindow.getContentBounds()
  const _CW = _cw - global.sidebarW, _CH = _ch - HEADER
  global.cardapioView.setBounds({ x: global.sidebarW, y: HEADER, width: _CW, height: _CH })
  global.whatsappView.setBounds({ x: global.sidebarW, y: HEADER, width: _CW, height: _CH })
  global.mainWindow.addBrowserView(global.cardapioView)
  global.mainWindow.addBrowserView(global.whatsappView)
  global.whatsappView.webContents.setUserAgent(WA_USER_AGENT)
  global.whatsappView.webContents.loadURL(WA_URL)

  // ── Ponte do shell nativo — SÓ no app beta (brand.shell === 'elo') ───────────
  // Os apps que já existem não passam por nada disto: sem cache novo em disco, sem
  // monitor de rede, sem canal IPC novo. É o que mantém Quero Mais, Pediu! e Jasson
  // byte a byte com o comportamento de hoje enquanto o beta evolui em paralelo.
  if (SHELL_ELO) {
    // ── Ponte do shell nativo (só faz diferença na marca Pediu!, que usa o shell
    // elo; nas demais fica inerte porque o renderer antigo não chama estes canais).
    // O renderer NUNCA fala com a rede: pede aqui, e aqui se decide entre servidor
    // e cache. É essa separação que faz o modo offline caber na F3 sem reescrever tela.
    const cacheDisco = makeStore(path.join(app.getPath('userData'), 'cache'), {
      available: () => safeStorage.isEncryptionAvailable(),
      encrypt: (texto) => safeStorage.encryptString(texto),
      decrypt: (buf) => safeStorage.decryptString(Buffer.from(buf)),
    })

    // vai POR DENTRO da view logada — mesmo caminho do ping de presença, sem token novo
    const pedirMenuAoPainel = async () => {
      const wc = global.cardapioView?.webContents
      if (!wc || wc.isDestroyed()) return null
      return wc.executeJavaScript(
        "fetch('/api/admin/menu',{credentials:'include'}).then(r=>r.ok?r.json():null).catch(()=>null)", true)
    }

    const monitorRede = criarMonitor({
      pingar: async () => {
        const wc = global.cardapioView?.webContents
        if (!wc || wc.isDestroyed()) return false
        return wc.executeJavaScript(
          "fetch('/api/admin/menu',{method:'HEAD',credentials:'include'}).then(r=>r.status<500).catch(()=>false)", true)
      },
      aoMudar: (online) => {
        try { global.mainWindow?.webContents.send('rede-mudou', online) } catch (e) {}
        log.info('[REDE] ' + (online ? 'conectado' : 'sem internet'))
      },
    })
    if (!DEMO) monitorRede.iniciar()

    // Impressão: da MÁQUINA, não da nuvem — vale nos dois modos e continua de pé sem
    // internet. Estava só no bloco de demonstração, então o app conectado abria a tela
    // de Impressão vazia e nenhum botão respondia.
    require('./impressao-canais').registrar({
      ipcMain, BrowserWindow,
      impressaoService: require('./controllers/impressao.service').impressaoService,
      getConfig, setConfig, log,
      lojaAtual: () => {
        if (dadosDemo) return dadosDemo.menu().loja
        const guardado = cacheDisco.get('menu|' + (getConfig().lojaId || 'sem-loja'))
        return (guardado && guardado.body && guardado.body.loja) || { nome: brand.nome_delivery }
      },
      pedidoDeExemplo: () => {
        if (dadosDemo) return dadosDemo.listas().pedidos.itens[0]
        // Sem demonstração não há pedido de exemplo: a tela imprime o teste, que não
        // depende de pedido nenhum.
        return null
      },
    })

    // "Imprimir / Salvar PDF" é do APP (não do painel): imprime o pedaço de conteúdo da
    // tela nativa numa janela oculta. Vale no modo demonstração e no app conectado.
    require('./relatorio-pdf').registrar({
      ipcMain, BrowserWindow, dialog: require('electron').dialog,
      appDir: path.join(__dirname, '..'),
      pastaPadrao: app.getPath('downloads'),
      nomeLoja: () => (dadosDemo ? dadosDemo.menu().loja.nome : (getConfig().lojaNome || brand.nome_delivery)),
      log,
    })

    // Escrita no painel, pela MESMA view logada: sem token novo, sem sessão paralela.
    // É por aqui que a venda manual do app vira pedido de verdade.
    // O método é parâmetro porque nem tudo que escreve é POST: a configuração do
    // WhatsApp é PUT, e mandar POST nela devolveria 405 sem explicação na tela.
    const enviarAoPainel = async (caminho, corpo, metodo) => {
      const wc = global.cardapioView?.webContents
      if (!wc || wc.isDestroyed()) return null
      return wc.executeJavaScript(
        "fetch(" + JSON.stringify(caminho) + ",{method:" + JSON.stringify(metodo || 'POST') + ",credentials:'include',"
        + "headers:{'content-type':'application/json'},body:" + JSON.stringify(JSON.stringify(corpo))
        + "}).then(r=>r.json().catch(()=>null)).catch(()=>null)", true)
    }

    // qualquer rota de leitura do painel, pela view logada
    const pedirTela = async (caminho) => {
      const wc = global.cardapioView?.webContents
      if (!wc || wc.isDestroyed()) return null
      return wc.executeJavaScript(
        "fetch('" + caminho + "',{credentials:'include'}).then(r=>r.ok?r.json():null).catch(()=>null)", true)
    }

    ipcMain.handle('app-info', () => ({ demo: DEMO, versao: app.getVersion(), marca: brand.nome_app }))

    if (DEMO) {
      // Demonstração: nada de rede. Os mesmos canais, com dados fictícios.
      log.info('[DEMO] modo demonstração ligado — dados fictícios, sem servidor')
      ipcMain.handle('menu-carregar', () => ({ dados: dadosDemo.menu(), offline: false, ts: Date.now(), demo: true }))
      ipcMain.handle('caixa-carregar', () => {
        const caixa = dadosDemo.caixa()
        const manuais = registroVendas.listar()
        if (manuais.length) {
          // O que foi vendido no app entra no resumo e nas movimentações do turno.
          const dinheiro = manuais.filter((v) => v.forma === 'dinheiro').reduce((s2, v) => s2 + v.total, 0)
          const pix = manuais.filter((v) => v.forma === 'pix').reduce((s2, v) => s2 + v.total, 0)
          const cartao = manuais.filter((v) => v.forma === 'credito' || v.forma === 'debito')
            .reduce((s2, v) => s2 + v.total, 0)
          caixa.resumo = { ...caixa.resumo,
            vendaDinheiro: caixa.resumo.vendaDinheiro + dinheiro,
            vendaPix: caixa.resumo.vendaPix + pix,
            vendaCartao: caixa.resumo.vendaCartao + cartao }
          caixa.esperadoDinheiro = (caixa.esperadoDinheiro || 0) + dinheiro
          caixa.movimentacoes = manuais.map((v) => ({
            id: 'vm' + v.numero, tipo: 'venda', forma: v.forma, valor: v.total,
            descricao: 'Venda manual #' + String(v.numero).padStart(4, '0'),
            criadoEm: v.criadoEm, estornada: false,
          })).concat(caixa.movimentacoes)
        }
        // E o que foi lançado no caixa pelo app (sangria/suprimento) entra por cima.
        return { dados: registroCaixa.aplicar(caixa), offline: false, ts: Date.now(), demo: true }
      })
      ipcMain.handle('visao-geral-carregar', (e, a) => ({ dados: dadosDemo.visaoGeral(a && a.periodo), offline: false, ts: Date.now(), demo: true }))
      const listasDemo = dadosDemo.listas()
      const CANAIS_LISTA = {
        'pedidos-carregar': 'pedidos', 'carrinhos-carregar': 'carrinhos', 'clientes-carregar': 'clientes',
        'cardapio-carregar': 'cardapio', 'despacho-carregar': 'despacho', 'financeiro-carregar': 'financeiro',
        'entregadores-carregar': 'entregadores',
      }
      for (const canal of Object.keys(CANAIS_LISTA)) {
        const chave = CANAIS_LISTA[canal]
        ipcMain.handle(canal, () => {
          const dados = dadosDemo.listas()[chave]
          // Pedidos: as vendas fechadas no app entram na frente das que vieram do painel,
          // e as etapas que o lojista mudou aqui dentro valem por cima.
          if (chave === 'pedidos') {
            const manuais = registroVendas.listar().map(registroVendas.comoPedido)
            const juntos = manuais.length ? { ...dados, itens: manuais.concat(dados.itens) } : dados
            return { dados: registroEtapas.aplicar(juntos), offline: false, ts: Date.now(), demo: true }
          }
          return { dados, offline: false, ts: Date.now(), demo: true }
        })
      }
      const CANAIS_APOIO = {
        'compras-carregar': 'compras', 'estoque-carregar': 'estoque', 'cupons-carregar': 'cupons',
        'fidelidade-carregar': 'fidelidade', 'parceiros-carregar': 'parceiros', 'campanhas-carregar': 'campanhas',
      }
      for (const canal of Object.keys(CANAIS_APOIO)) {
        const chave = CANAIS_APOIO[canal]
        ipcMain.handle(canal, () => ({ dados: dadosDemo.listasApoio()[chave], offline: false, ts: Date.now(), demo: true }))
      }
      const CANAIS_FINAIS = {
        'insights-carregar': 'insights', 'relatorios-carregar': 'relatorios',
        'configuracoes-carregar': 'configuracoes', 'push-carregar': 'push',
      }
      for (const canal of Object.keys(CANAIS_FINAIS)) {
        const chave = CANAIS_FINAIS[canal]
        ipcMain.handle(canal, () => ({ dados: dadosDemo.apoioFinal()[chave], offline: false, ts: Date.now(), demo: true }))
      }
      // ── Venda manual: a primeira tela do app que ESCREVE ──
      // A venda fechada aqui recebe número, entra no quadro de pedidos, no caixa e no
      // extrato. É o ensaio do modo offline: fechar venda sem depender do servidor.
      const registroVendas = require('./vendas-locais').criarRegistro({ proximoNumero: 1044 })
      // Em demonstração o quadro anda de verdade: "Aceitar" move o cartão de coluna e
      // ele fica lá. Sem servidor, o registro mora na memória desta sessão.
      const registroEtapas = require('./pedidos-locais').criarRegistro()
      // O caixa também anda em demonstração: sangria e suprimento entram nas
      // movimentações do turno e mudam o dinheiro esperado na gaveta.
      const registroCaixa = require('./caixa-local').criarRegistro()
      // WhatsApp em demonstração: começa desconectado, e "Conectar" devolve um QR
      // fictício — dá para ver a tela inteira sem servidor.
      let whatsDemo = { estado: 'sem_config', provedor: 'evolution', ativo: false }
      ipcMain.handle('whatsapp-carregar', () => ({ dados: whatsDemo, offline: false, ts: Date.now(), demo: true }))
      // As conversas em demonstração mostram como a tela fica em uso: cliente à
      // esquerda, loja à direita, automáticas marcadas.
      ipcMain.handle('conversas-carregar', () => {
        // Em demonstração o cruzamento é o mesmo do app conectado: o telefone da
        // conversa contra o cadastro e os pedidos — inclusive com formatos diferentes.
        const bruto = dadosDemo.conversas()
        const junto = require('./adaptadores').conversas({
          conversasResp: bruto,
          clientesResp: dadosDemo.listas().clientes,
          pedidosResp: dadosDemo.listas().pedidos,
        })
        return {
          dados: { ...junto, agora: bruto.agora, estado: whatsDemo.estado, provedor: whatsDemo.provedor },
          offline: false, ts: Date.now(), demo: true,
        }
      })
      ipcMain.handle('whatsapp-conectar', () => {
        whatsDemo = { ...whatsDemo, estado: 'connecting', provedor: 'evolution', ativo: true }
        return { ok: true, estado: 'connecting', qr: dadosDemo.qrFicticio(), pairingCode: 'DEMO-2026', demo: true }
      })
      ipcMain.handle('whatsapp-desconectar', () => {
        whatsDemo = { ...whatsDemo, estado: 'close', ativo: false }
        return { ok: true, demo: true }
      })
      ipcMain.handle('whatsapp-salvar', (e, args) => {
        const provedor = (args && args.provedor) || 'desativado'
        whatsDemo = {
          ...whatsDemo, ...((args && args.campos) || {}),
          provedor, ativo: provedor !== 'desativado',
          // Trocar de caminho derruba a conexão do anterior — como no painel.
          estado: provedor === 'evolution' ? 'close' : 'indisponivel',
        }
        return { ok: true, demo: true }
      })
      const acoesCaixa = require('./caixa-acoes')
      ipcMain.handle('caixa-movimentacao', (e, args) => {
        const d = acoesCaixa.movimentacao({ ...(args || {}), caixaAberto: true })
        if (!d.ok) return { ok: false, erro: d.motivo }
        registroCaixa.lancar({ tipo: args.tipo, valor: d.corpo.valor, motivo: d.corpo.motivo })
        return { ok: true, resumo: d.resumo, demo: true }
      })
      ipcMain.handle('caixa-fechar', (e, args) => {
        const d = acoesCaixa.fechamento({ ...(args || {}), caixaAberto: true })
        return d.ok ? { ok: true, resumo: d.resumo, demo: true } : { ok: false, erro: d.motivo }
      })
      ipcMain.handle('caixa-abrir', (e, args) => {
        const d = acoesCaixa.abertura({ ...(args || {}), caixaAberto: false })
        return d.ok ? { ok: true, resumo: d.resumo, demo: true } : { ok: false, erro: d.motivo }
      })
      // Correção pelo popup da conversa também funciona em demonstração: a mudança
      // fica na sessão, como as etapas.
      ipcMain.handle('pedido-corrigir', (e, args) => {
        const d = require('./pedido-acoes').correcao(args && args.pedido, args && args.campos)
        return d.ok ? { ok: true, trocouBairro: d.trocouBairro, demo: true } : { ok: false, erro: d.motivo }
      })
      ipcMain.handle('pedido-avancar', (e, args) => {
        const pedido = (args && args.pedido) || {}
        const nova = registroEtapas.avancar(pedido.numero, args && args.etapa)
        if (!nova) return { ok: false, erro: 'O pedido já está na última etapa.' }
        return { ok: true, status: nova, numero: pedido.numero, demo: true }
      })
      ipcMain.handle('venda-cardapio', () => ({
        dados: {
          categorias: dadosDemo.listas().cardapio.categorias,
          clientes: dadosDemo.listas().clientes.itens,
          taxasBairro: { 'Praia de Guaibim': 5.00, Centro: 7.00, 'Bela Vista': 9.00, 'São Félix': 8.00 },
        },
        offline: false, ts: Date.now(), demo: true,
      }))
      ipcMain.handle('venda-registrar', (e, v) => {
        const r = registroVendas.registrar(v)
        if (r.ok) log.info('[VENDA] #' + r.numero + ' fechada no app · ' + r.venda.total)
        return r
      })

      const CANAIS_ABAS = {
        'financeiro-abas-carregar': 'financeiro', 'atendimento-abas-carregar': 'atendimento',
        'estoque-abas-carregar': 'estoque',
      }
      for (const canal of Object.keys(CANAIS_ABAS)) {
        const chave = CANAIS_ABAS[canal]
        ipcMain.handle(canal, () => {
          const dados = dadosDemo.telasComAbas()[chave]
          // Financeiro: a venda do app aparece no extrato e no livro caixa, como no painel.
          if (chave === 'financeiro' && registroVendas.listar().length) {
            const movs = registroVendas.listar().map(registroVendas.comoMovimento)
            let saldo = dados.extrato.length ? dados.extrato[0].saldo : 0
            movs.forEach((m) => { saldo += m.valor; m.saldo = Math.round(saldo * 100) / 100 })
            return {
              dados: { ...dados,
                extrato: movs.concat(dados.extrato),
                livroCaixa: movs.filter((m) => m.forma === 'dinheiro').concat(dados.livroCaixa),
                vendas: registroVendas.listar().map((v) => ({
                  numero: v.numero, data: v.data, hora: v.hora, cliente: v.cliente, canal: v.canal,
                  produtos: v.produtos, servico: 0, entrega: v.entrega, desconto: 0,
                  pagamento: v.forma, financeiro: 'Pago', pedido: 'em produção', total: v.total,
                })).concat(dados.vendas) },
              offline: false, ts: Date.now(), demo: true,
            }
          }
          return { dados, offline: false, ts: Date.now(), demo: true }
        })
      }
      const CANAIS_OPERACAO = { 'cozinha-carregar': 'cozinha', 'bar-carregar': 'bar', 'salao-carregar': 'salao' }
      for (const canal of Object.keys(CANAIS_OPERACAO)) {
        const chave = CANAIS_OPERACAO[canal]
        ipcMain.handle(canal, () => ({ dados: dadosDemo.operacao()[chave], offline: false, ts: Date.now(), demo: true }))
      }
      void listasDemo
      ipcMain.handle('rede-status', () => ({ online: true, demo: true }))
      ipcMain.handle('cache-get', () => null)
      ipcMain.handle('cache-set', () => ({ ok: true }))
      ipcMain.handle('abrir-rota', () => ({ ok: false, demo: true }))
    } else ponte.registrar({
      ipcMain, cache: cacheDisco, monitorRede,
      pedirAoPainel: pedirMenuAoPainel,
      pedirTela,
      lojaIdAtual: () => getConfig().lojaId,
      abrirRota: (href) => {
        const base = getConfig().cardapioUrl.replace(/\/admin\/?$/, '')
        global.activeView = 'cardapio'
        global.telaNativaAtiva = false
        posicionarViews()
        global.cardapioView.webContents.loadURL(base + href)
        return { ok: true }
      },
    })

    // Venda manual no app conectado: o PDV monta e o painel lança o pedido. No modo
    // demonstração a venda é gravada localmente (vendas-locais.js), então este canal
    // só existe fora dele.
    if (!DEMO) require('./venda-envio').registrar({ ipcMain, enviar: enviarAoPainel, log })
    // Mexer no pedido (aceitar → produzir → pronto → entregar) passa pela mesma view
    // logada. Em demonstração o quadro anda sozinho, sem rede — ver mais acima.
    if (!DEMO) require('./pedido-envio').registrar({ ipcMain, enviar: enviarAoPainel, log })
    if (!DEMO) require('./caixa-envio').registrar({ ipcMain, enviar: enviarAoPainel, log })
    if (!DEMO) require('./whatsapp-envio').registrar({ ipcMain, enviar: enviarAoPainel, log })

    // Tela nativa na frente: a BrowserView sai da área de conteúdo (setBounds 0x0).
    // Esconder assim, em vez de remover a view, mantém o padrão que não congela no
    // Windows (nunca add/remove em runtime) e a página do painel viva por trás.
    ipcMain.on('esconder-view', () => {
      global.telaNativaAtiva = true
      try { posicionarViews() } catch (e) {}
    })

    // Recolher/expandir o menu muda a largura útil: as views acompanham.
    ipcMain.on('sidebar-largura', (e, largura) => {
      global.sidebarW = Number(largura) || global.sidebarW
      posicionarViews()
    })

    // Navegou por dentro do painel (link interno, redirecionamento): o menu acompanha,
    // senão o item pintado mente sobre onde o lojista está.
    const avisarRota = (urlAtual) => {
      try { global.mainWindow?.webContents.send('rota-mudou', new URL(urlAtual).pathname) } catch (e) {}
    }
    global.cardapioView.webContents.on('did-navigate', (e, u) => avisarRota(u))
    global.cardapioView.webContents.on('did-navigate-in-page', (e, u) => avisarRota(u))

    // ponte pronta: agora sim a página do shell entra, com os canais já registrados
    await carregarRenderer()
  }

  // Captura console do WhatsApp para o log do Electron
  global.whatsappView.webContents.on('console-message', (e, level, msg) => {
    if (msg.includes('[QM')) log.info('[WA-CON]', msg)
  })

  // ── Injeção do api.js via executeJavaScript ──────────────────────────────────
  // ⚠️ api.js é um bundle de TERCEIRO (extraído por engenharia reversa de outro
  // app) — pendência de substituir por biblioteca própria/aberta. Ver memória.
  const _fs = require('fs')
  let _apiJsCode = null
  function _loadApiJs() {
    if (_apiJsCode) return _apiJsCode
    try {
      _apiJsCode = _fs.readFileSync(path.join(__dirname, 'preload/api.js'), 'utf8')
      log.info('[WA] api.js lido do disco:', path.join(__dirname, 'preload/api.js'))
    } catch (e) {
      log.error('[WA] Falha ao ler api.js:', e)
    }
    return _apiJsCode
  }

  async function injetarApiJs(wc) {
    const code = _loadApiJs()
    if (!code || !wc || wc.isDestroyed()) return
    try {
      await wc.executeJavaScript(`
        if (!window.__qm_api_injected__) {
          window.__qm_api_injected__ = true;
          ${code}
          console.log('[QM] api.js injetado via main');
        } else {
          console.log('[QM] api.js já estava injetado');
        }
      `)
    } catch (e) {
      log.error('[WA] Falha ao injetar api.js:', e)
    }
  }

  // Injeta api.js no dom-ready (antes do did-finish-load)
  global.whatsappView.webContents.on('dom-ready', () => {
    injetarApiJs(global.whatsappView.webContents)
    injetarSemScrollbar(global.whatsappView.webContents)
  })
  global.whatsappView.webContents.on('did-frame-finish-load', () => {
    injetarSemScrollbar(global.whatsappView.webContents)
  })

  // Injeta painel compacto depois do WhatsApp carregar
  global.whatsappView.webContents.on('did-finish-load', () => {
    setTimeout(() => injetarPainelCompacto(global.whatsappView.webContents), 8000)
  })

  // Polling: detecta quando WhatsApp está logado (#side existe) e ativa o outbox
  let _waConectadoDetectado = false
  const _waPollTimer = setInterval(async () => {
    if (_waConectadoDetectado) return
    try {
      const wc = global.whatsappView?.webContents
      if (!wc || wc.isDestroyed()) return
      const logado = await wc.executeJavaScript(`!!document.querySelector('#side')`)
      if (logado) {
        _waConectadoDetectado = true
        clearInterval(_waPollTimer)
        outboxController.setConnected(true)
        log.info('[WA] #side detectado → outbox ativado')
      }
    } catch (_) {}
  }, 4000)

  // ── Presença na plataforma ────────────────────────────────────────────────
  // Avisa o servidor que ESTE desktop está com o WhatsApp Web conectado. Enquanto
  // o ping estiver fresco (validade de 2 min no servidor), as notificações da loja
  // são roteadas pra cá mesmo que ela esteja configurada em Evolution/Cloud API —
  // e voltam sozinhas pro provedor dela quando o app fecha ou o Web cai.
  // Vai pela BrowserView do admin logado, mesmo caminho de /api/admin/loja.
  let _waAuthAtual = false
  let _presencaEnviada = null
  async function pingarPresenca(conectado) {
    try {
      const wc = global.cardapioView?.webContents
      if (!wc || wc.isDestroyed()) return
      const corpo = JSON.stringify({ conectado: !!conectado, versao: app.getVersion() })
      const ok = await wc.executeJavaScript(
        `fetch('/api/admin/whatsapp/presenca',{method:'POST',credentials:'include',` +
        `headers:{'Content-Type':'application/json'},body:${JSON.stringify(corpo)}})` +
        `.then(r=>r.ok).catch(()=>false)`, true)
      if (ok) {
        if (_presencaEnviada !== !!conectado) log.info(`[PRESENCA] servidor avisado: conectado=${!!conectado}`)
        _presencaEnviada = !!conectado
      }
    } catch (e) { log.warn('[PRESENCA] falhou:', e && e.message) }
  }
  // Renova enquanto conectado; o carimbo do servidor vence em 2 min.
  setInterval(() => pingarPresenca(_waAuthAtual), 60 * 1000)
  // Fechou o app: derruba o carimbo na hora, sem esperar os 2 min de validade.
  app.on('before-quit', () => { pingarPresenca(false) })

  // Detecção de auth via DOM — fallback quando api.js não dispara 'authenticated'
  setInterval(async () => {
    if (!global.whatsappView?.webContents) return
    try {
      const isAuth = await global.whatsappView.webContents.executeJavaScript(
        `!!document.querySelector('#side')`
      )
      const { outboxController } = require('./controllers/outbox.controller')
      outboxController.setConnected(isAuth)
      // Mudou de estado (conectou ou caiu): avisa o servidor na hora, sem
      // esperar o ping de 60s — é o que faz o envio trocar de caminho rápido.
      if (isAuth !== _waAuthAtual) {
        _waAuthAtual = isAuth
        pingarPresenca(isAuth)
      }
    } catch (_) {}
  }, 8000)

  // Posiciona views na abertura
  posicionarViews()

  // Re-posiciona ao redimensionar
  let resizeTimer
  global.mainWindow.on('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(posicionarViews, 50)
  })

  // ── Watchdog: evita que BrowserViews cubram sidebar/titlebar ────────────────
  // Roda a cada 2s e corrige bounds automaticamente — defesa contra regressões
  // em futuras atualizações que possam re-introduzir o bug de congelamento
  setInterval(() => {
    const win = global.mainWindow
    if (!win) return
    const SB = global.sidebarW
    for (const view of win.getBrowserViews()) {
      try {
        const b = view.getBounds()
        if (b.width < 10 || b.height < 10) continue
        if (b.x < SB || b.y < HEADER) {
          const corrigido = {
            x: Math.max(SB, b.x),
            y: Math.max(HEADER, b.y),
            width: Math.max(200, b.width - Math.max(0, SB - b.x)),
            height: Math.max(200, b.height - Math.max(0, HEADER - b.y)),
          }
          view.setBounds(corrigido)
          log.warn('[WATCHDOG] BrowserView cobria chrome — corrigido:', corrigido)
        }
      } catch (_) {}
    }
  }, 2000)

  global.mainWindow.on('closed', () => {
    global.mainWindow = null
    global.cardapioView = null
    global.whatsappView = null
  })

  // Inicia controllers
  whatsappController.init(global.mainWindow, global.whatsappView)
  botController.init(global.mainWindow, global.whatsappView)
  outboxController.init(global.whatsappView)
  cacheController.init(cardapioSes, app.getPath('userData'))
  impressaoController.init()

  // ── Tray ──────────────────────────────────────────────────────────────────
  const trayPath = process.platform === 'darwin'
    ? path.join(__dirname, '../assets/tray-icon.png')
    : path.join(__dirname, '../assets/icon.ico')
  try {
    global.tray = new Tray(trayPath)
    global.tray.setToolTip(brand.nome_app)
    global.tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Abrir', click: () => global.mainWindow?.show() },
      { type: 'separator' },
      { label: 'Reiniciar', click: () => { app.relaunch(); app.quit() } },
      { label: 'Sair', click: () => app.quit() },
    ]))
    global.tray.on('click', () => {
      global.mainWindow?.isVisible() ? null : global.mainWindow?.show()
    })
  } catch (_) { /* ícone ausente em dev — ignorar */ }

  global.mainWindow.maximize()
  global.mainWindow.show()

  // Busca status da loja assim que a janela abre e depois a cada 30s
  async function sincronizarStatusLoja() {
    try {
      const data = await buscarStatusLoja()
      if (data) enviarStatusLoja(data.aberta, data.nome)
    } catch (e) { log.warn('[LOJA] Erro ao buscar status:', e.message) }
  }
  // Aguarda renderer carregar antes do primeiro envio
  global.mainWindow.webContents.once('did-finish-load', () => {
    sincronizarStatusLoja()
    setInterval(sincronizarStatusLoja, 30_000)
  })
}

// ─── IPC: janela / navegação ──────────────────────────────────────────────────

ipcMain.on('window-minimize', () => global.mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  global.mainWindow?.isMaximized()
    ? global.mainWindow.restore()
    : global.mainWindow?.maximize()
})
ipcMain.on('window-close', () => {
  if (process.platform === 'win32') app.quit()
  else global.mainWindow?.hide()
})

ipcMain.on('change-view', (event, { view }) => {
  const nextView = ['whatsapp', 'split'].includes(view) ? view : 'cardapio'
  global.telaNativaAtiva = false   // WhatsApp/tela dividida precisam das views de volta
  log.info('[NAV] change-view recebido:', view, '=>', nextView)
  global.activeView = nextView
  posicionarViews()
  const b = global.mainWindow?.getContentBounds()
  log.info('[NAV] bounds após posicionar: SB='+global.sidebarW+' win='+JSON.stringify(b))
  global.mainWindow?.webContents.send('view-changed', { view: nextView })
})

// Drag do divisor da tela dividida: mousemove não chega ao HTML quando o cursor
// está sobre uma BrowserView nativa → o main faz polling do cursor durante o drag
let _dragPoll = null
ipcMain.on('drag-start', () => {
  if (_dragPoll) clearInterval(_dragPoll)
  _dragPoll = setInterval(() => {
    const win = global.mainWindow
    if (!win) return
    const cursor = screen.getCursorScreenPoint()
    const b = win.getContentBounds()
    const SB = global.sidebarW
    const CW = b.width - SB
    if (CW <= 0) return
    const ratio = Math.min(0.85, Math.max(0.15, (cursor.x - b.x - SB) / CW))
    if (Math.abs(ratio - global.splitRatio) > 0.001) {
      global.splitRatio = ratio
      posicionarViews()
      win.webContents.send('split-ratio-update', { ratio })
    }
  }, 16)
})
ipcMain.on('drag-end', () => {
  if (_dragPoll) { clearInterval(_dragPoll); _dragPoll = null }
})

ipcMain.on('split-resize', (event, { ratio }) => {
  global.splitRatio = Math.min(0.85, Math.max(0.15, ratio))
  posicionarViews()
})

ipcMain.on('bot-toggle', (event, { ativo }) => {
  global.bot_enabled = ativo
  log.info(`[MAIN] Bot ${ativo ? 'ativado' : 'pausado'}`)
})

ipcMain.on('toggle-loja-status', async () => {
  try {
    const data = await toggleStatusLoja()
    if (data) {
      enviarStatusLoja(data.aberta, data.nome)
      log.info(`[LOJA] Status alterado → ${data.aberta ? 'aberta' : 'fechada'}`)
    }
  } catch (e) { log.error('[LOJA] Erro ao alternar status:', e.message) }
})

// ─── Ciclo de vida ────────────────────────────────────────────────────────────

// ─── Auto-update ──────────────────────────────────────────────────────────────

autoUpdater.logger = log
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

autoUpdater.on('update-available', (info) => {
  log.info(`[UPDATE] Nova versão disponível: ${info.version}`)
  global.mainWindow?.webContents.send('update-status', { status: 'disponivel', version: info.version })
})

// Aplica a atualização SOZINHO na madrugada (03h–05h, minuto aleatório pra não
// reiniciar todas as lojas no mesmo segundo). Sem isso, máquina de loja que fica
// ligada dias seguidos nunca instala (o download fica esperando um "fechar" que
// não vem) — foi assim que uma loja rodou versão velha o dia inteiro.
let _updatePronto = false
let _reinicioAgendado = false

const HORA_LIMITE_TENTATIVA = 6 // depois disso a loja certamente está em operação — desiste por hoje
const RETRY_LOJA_ABERTA_MS = 30 * 60 * 1000 // tenta de novo em 30 min

function agendarReinicioMadrugada() {
  if (_reinicioAgendado) return
  _reinicioAgendado = true
  const agora = new Date()
  const alvo = new Date(agora)
  alvo.setHours(3, Math.floor(Math.random() * 90), 0, 0) // 03:00–04:30
  if (alvo <= agora) alvo.setDate(alvo.getDate() + 1)
  const ms = alvo.getTime() - agora.getTime()
  log.info(`[UPDATE] reinício automático agendado para ${alvo.toLocaleString()}`)
  setTimeout(tentarReiniciar, ms)
}

// Lojas com horário noturno (fecha depois da meia-noite) podem estar em
// operação plena às 3h — nunca derruba WhatsApp/impressora com a loja
// aberta. Confirma que está fechada antes de reiniciar; se estiver aberta,
// tenta de novo a cada 30min até as 6h (depois disso, desiste por hoje —
// o "instala ao fechar" de sempre continua valendo).
async function tentarReiniciar() {
  if (!_updatePronto) return
  try {
    const status = await buscarStatusLoja()
    if (status && status.aberta === true) {
      if (new Date().getHours() < HORA_LIMITE_TENTATIVA) {
        log.info('[UPDATE] loja aberta — adiando reinício automático em 30min')
        setTimeout(tentarReiniciar, RETRY_LOJA_ABERTA_MS)
      } else {
        log.info('[UPDATE] loja ainda aberta depois das 6h — desiste por hoje, instala ao fechar')
      }
      return
    }
  } catch (e) {
    log.warn('[UPDATE] não deu pra checar status da loja, reinicia mesmo assim:', e && e.message)
  }
  log.info('[UPDATE] aplicando atualização (reinício automático da madrugada)')
  try { autoUpdater.quitAndInstall(true, true) } catch (e) { log.warn('[UPDATE] quitAndInstall falhou:', e && e.message) }
}

autoUpdater.on('update-downloaded', () => {
  log.info('[UPDATE] Download concluído — instala ao fechar OU sozinho de madrugada')
  _updatePronto = true
  global.mainWindow?.webContents.send('update-status', { status: 'pronto' })
  agendarReinicioMadrugada()
})

autoUpdater.on('error', (e) => {
  log.warn('[UPDATE] Erro (ignorado em dev):', e.message)
})

// ─── Ciclo de vida ────────────────────────────────────────────────────────────

// macOS não tem "instalador" (é arrastar o .app pra Applications), então não dá
// pra criar o atalho na área de trabalho nesse passo como no NSIS do Windows —
// o próprio app cria na primeira vez que abre. Idempotente (não recria se já existe).
function garantirAtalhoDesktopMac() {
  if (process.platform !== 'darwin' || !app.isPackaged) return
  try {
    const fs = require('fs')
    const os = require('os')
    const exePath = app.getPath('exe') // .../Quero Mais Desktop.app/Contents/MacOS/Quero Mais Desktop
    const appBundle = path.resolve(exePath, '..', '..', '..') // .../Quero Mais Desktop.app
    const destino = path.join(os.homedir(), 'Desktop', path.basename(appBundle))
    if (fs.existsSync(destino) || !fs.existsSync(appBundle)) return
    fs.symlinkSync(appBundle, destino)
    log.info('[DESKTOP] Atalho criado em', destino)
  } catch (e) {
    log.warn('[DESKTOP] Falha ao criar atalho na área de trabalho:', e.message)
  }
}

app.on('ready', () => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([]))   // remove File/Edit/View/Window/Help
  app.setAppUserModelId(brand.nome_app)
  garantirAtalhoDesktopMac()
  createWindow()
  // Verifica atualizações 10s após iniciar e a cada 4h (só em produção) —
  // numa loja o app fica aberto o dia inteiro; sem a checagem periódica ele
  // só descobriria versão nova quando fosse reaberto.
  if (app.isPackaged) {
    setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 10_000)
    setInterval(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 60 * 60 * 1000)
  }

  // --teste-impressao: imprime um cupom de teste LOCAL (data URL, sem rede) logo
  // após abrir — permite testar o pipeline de impressão por linha de comando,
  // sem clicar em nada. Resultado no userData/logs/print.log.
  if (process.argv.includes('--teste-impressao')) {
    setTimeout(async () => {
      const { impressaoService } = require('./controllers/impressao.service')
      const r = await impressaoService.imprimirTeste()
      log.info('[IMPRESSAO] Resultado do --teste-impressao:', JSON.stringify(r))
    }, 5000)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!global.mainWindow) createWindow()
  else global.mainWindow.show()  // reabre janela oculta ao clicar no ícone do dock
})
