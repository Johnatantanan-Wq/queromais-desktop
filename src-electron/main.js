const { app, BrowserWindow, BrowserView, ipcMain, Menu, Tray, session, net, screen } = require('electron')
const { autoUpdater } = require('electron-updater')
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const url = require('url')
const log = require('electron-log')

const { initConfig, getConfig } = require('./config')
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

const CARDAPIO_URL = getConfig().cardapioUrl
const WA_URL = 'https://web.whatsapp.com'
const WA_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

global.bot_enabled = true
global.activeView = 'cardapio'

// ── Painel compacto WhatsApp: injeta CSS+JS direto na página ─────────────────
async function injetarPainelCompacto(wc) {
  try {
    // CSS via insertCSS — vence inline styles do React (que não usam !important)
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

global.sidebarW   = 56
global.splitRatio  = 0.7
const HANDLE_W     = 6
// No Windows frame nativo, a titlebar do OS está fora do content area → HEADER=0
// No Mac (frameless), a titlebar HTML ocupa 44px dentro do content area → HEADER=44
const HEADER = process.platform === 'win32' ? 0 : 44

function posicionarViews() {
  const win = global.mainWindow
  if (!win || !global.cardapioView || !global.whatsappView) return
  const b = win.getContentBounds()
  const w = b.width, h = b.height
  const SB = global.sidebarW
  const CW = w - SB
  const CH = h - HEADER

  // Usa removeBrowserView para views inativas — setBounds com coords negativas ou zero
  // pode ser ignorado pelo Electron e a view continua cobrindo o conteúdo
  const allViews = win.getBrowserViews()
  const temCard = allViews.includes(global.cardapioView)
  const temWa   = allViews.includes(global.whatsappView)

  if (global.activeView === 'split') {
    if (!temCard) win.addBrowserView(global.cardapioView)
    if (!temWa)  win.addBrowserView(global.whatsappView)
    const CARD_W = Math.max(200, Math.floor(CW * global.splitRatio) - HANDLE_W)
    const WA_X   = SB + CARD_W + HANDLE_W
    const WA_W   = Math.max(200, w - WA_X)
    global.cardapioView.setBounds({ x: SB,   y: HEADER, width: CARD_W, height: CH })
    global.whatsappView.setBounds({ x: WA_X, y: HEADER, width: WA_W,   height: CH })
  } else if (global.activeView === 'whatsapp') {
    if (temCard) win.removeBrowserView(global.cardapioView)
    if (!temWa)  win.addBrowserView(global.whatsappView)
    global.whatsappView.setBounds({ x: SB, y: HEADER, width: CW, height: CH })
  } else {
    // cardapio (default)
    if (!temCard) win.addBrowserView(global.cardapioView)
    if (temWa)   win.removeBrowserView(global.whatsappView)
    global.cardapioView.setBounds({ x: SB, y: HEADER, width: CW, height: CH })
  }
}
global.posicionarViews = posicionarViews

// ─── Criação da janela ───────────────────────────────────────────────────────

async function createWindow() {
  const isWin = process.platform === 'win32'

  global.mainWindow = new BrowserWindow({
    // Mac: sem frame (titlebar HTML customizada)
    // Windows: frame nativo do OS — sem customização, sem conflito de DPI/hit-test
    ...(isWin ? {} : { frame: false }),
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

  await global.mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '../renderer/index.html'),
    protocol: 'file:',
    slashes: true,
  }))

  // ── BrowserView: cardápio admin (sessão persistente = cache em disco) ────
  // Sessão persistente: cache de imagens/assets sobrevive entre sessões
  const cardapioSes = session.fromPartition('persist:cardapio')

  global.cardapioView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: cardapioSes,
    },
  })
  global.mainWindow.addBrowserView(global.cardapioView)
  global.cardapioView.webContents.loadURL(CARDAPIO_URL)

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
  // NÃO adiciona ao window ainda — posicionarViews() adiciona quando necessário
  // (evita que o view cubra a sidebar antes de ter bounds definidos)
  global.whatsappView.webContents.setUserAgent(WA_USER_AGENT)
  global.whatsappView.webContents.loadURL(WA_URL)

  // Captura console do WhatsApp para o log do Electron
  global.whatsappView.webContents.on('console-message', (e, level, msg) => {
    if (msg.includes('[QM')) log.info('[WA-CON]', msg)
  })

  // ── Injeção do api.js via executeJavaScript (mesma técnica do Anota AI) ──────
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

  // Injeta api.js no dom-ready (antes do did-finish-load, como o Anota AI faz)
  global.whatsappView.webContents.on('dom-ready', () => {
    injetarApiJs(global.whatsappView.webContents)
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

  // Detecção de auth via DOM — fallback quando api.js não dispara 'authenticated'
  setInterval(async () => {
    if (!global.whatsappView?.webContents) return
    try {
      const isAuth = await global.whatsappView.webContents.executeJavaScript(
        `!!document.querySelector('#side')`
      )
      const { outboxController } = require('./controllers/outbox.controller')
      outboxController.setConnected(isAuth)
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

  // ── Tray ──────────────────────────────────────────────────────────────────
  const trayPath = process.platform === 'darwin'
    ? path.join(__dirname, '../assets/tray-icon.png')
    : path.join(__dirname, '../assets/icon.ico')
  try {
    global.tray = new Tray(trayPath)
    global.tray.setToolTip('Quero Mais Desktop')
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
ipcMain.on('window-close', () => global.mainWindow?.hide())
ipcMain.on('open-devtools', () => global.mainWindow?.webContents.openDevTools())

ipcMain.on('sidebar-toggle', (event, { open }) => {
  global.sidebarW = open ? 200 : 56
  posicionarViews()
  // Informa renderer o handle X atualizado para reposicionar o drag handle
  const [w] = global.mainWindow?.getSize() || [1400]
  const CW   = w - global.sidebarW
  const hx   = global.sidebarW + Math.floor(CW * global.splitRatio) - 3
  global.mainWindow?.webContents.send('handle-pos', { x: hx })
})

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

ipcMain.on('change-view', (event, { view }) => {
  log.info('[NAV] change-view recebido:', view)
  global.activeView = view
  posicionarViews()
  const b = global.mainWindow?.getContentBounds()
  log.info('[NAV] bounds após posicionar: SB='+global.sidebarW+' win='+JSON.stringify(b))
  global.mainWindow?.webContents.send('view-changed', { view })
  // Atualiza título na titlebar nativa do Windows
  if (process.platform === 'win32') {
    const labels = { cardapio: 'Quero Mais — Cardápio', split: 'Quero Mais — Tela Dividida', whatsapp: 'Quero Mais — WhatsApp' }
    global.mainWindow?.setTitle(labels[view] || 'Quero Mais Desktop')
  }
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

autoUpdater.on('update-downloaded', () => {
  log.info('[UPDATE] Download concluído — será instalado ao fechar')
  global.mainWindow?.webContents.send('update-status', { status: 'pronto' })
})

autoUpdater.on('error', (e) => {
  log.warn('[UPDATE] Erro (ignorado em dev):', e.message)
})

// ─── Ciclo de vida ────────────────────────────────────────────────────────────

app.on('ready', () => {
  Menu.setApplicationMenu(null)   // remove menu nativo (File/Edit/View/Window/Help)
  app.setAppUserModelId('Quero Mais Desktop')
  createWindow()
  // Verifica atualizações 10s após iniciar (só em produção)
  if (app.isPackaged) setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 10_000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!global.mainWindow) createWindow()
  else global.mainWindow.show()  // reabre janela oculta ao clicar no ícone do dock
})
