/**
 * Controller de impressão — fila serial + carregamento da comanda remota.
 * A EXECUÇÃO da impressão (PDF/Sumatra, IPP, silent) vive no impressao.service.
 *
 * IPC exposto (novo padrão + canais antigos mantidos p/ compat com o web app):
 *   printer:list   → lista impressoras (nome, padrão)
 *   printer:test   → imprime cupom de teste LOCAL (data URL, sem rede)
 *   printer:order  → { url, impressoraNome } imprime comanda remota (mesma fila)
 *   'imprimir-comanda' (send) e 'listar-impressoras' (invoke) — legado
 *
 * A janela oculta usa a MESMA sessão (persist:cardapio) da view do cardápio,
 * senão a página da comanda cai na tela de login (ela exige sessão admin).
 */
const { BrowserWindow, ipcMain, session } = require('electron')
const { URL } = require('url')
const log = require('electron-log')
const { getConfig } = require('../config')
const { impressaoService } = require('./impressao.service')

function resolverUrl(relOuAbs) {
  try {
    return new URL(relOuAbs, getConfig().cardapioUrl).toString()
  } catch (e) {
    impressaoService.plog('error', 'URL inválida:', relOuAbs, e.message)
    return null
  }
}

function imprimirUrl(url, impressoraNome) {
  return new Promise((resolve) => {
    const absUrl = resolverUrl(url)
    if (!absUrl) return resolve(false)

    const printSession = session.fromPartition('persist:cardapio')
    const win = new BrowserWindow({
      show: false,
      x: -10000, y: -10000, // fora da tela — mas precisa ficar "shown" (showInactive abaixo)
      width: 400,
      height: 700,
      webPreferences: {
        session: printSession,
        contextIsolation: true,
        nodeIntegration: false,
        // janela oculta é despriorizada pelo Chromium (timers/rede em marcha lenta)
        backgroundThrottling: false,
      },
    })
    try { win.showInactive() } catch (_) {}

    // Telemetria de carregamento — aponta o estágio exato quando algo trava.
    win.webContents.on('did-start-loading', () => impressaoService.plog('info', '[LOAD] start-loading'))
    win.webContents.on('did-navigate', (_e, u) => impressaoService.plog('info', '[LOAD] did-navigate:', u))
    win.webContents.on('did-redirect-navigation', (_e, u) => impressaoService.plog('info', '[LOAD] REDIRECT:', u))
    win.webContents.on('dom-ready', () => impressaoService.plog('info', '[LOAD] dom-ready:', win.webContents.getURL()))
    win.webContents.on('did-finish-load', () => impressaoService.plog('info', '[LOAD] finish-load:', win.webContents.getURL()))

    let resolvido = false
    let timeoutAtivo = null
    const armarTimeout = (ms, rotulo) => {
      clearTimeout(timeoutAtivo)
      timeoutAtivo = setTimeout(() => {
        impressaoService.plog('warn', `Timeout ${rotulo}:`, absUrl)
        finalizar(false)
      }, ms)
    }
    const finalizar = (ok) => {
      if (resolvido) return
      resolvido = true
      clearTimeout(timeoutAtivo)
      try { if (!win.isDestroyed()) win.close() } catch (_) {}
      resolve(ok)
    }

    // Prazo por FASE (um timer rearmado). O timeout de load NÃO pode continuar
    // valendo depois do did-finish-load — já fechou janela no meio da impressão
    // (causa do "5mm de papel em branco" em máquina lenta).
    armarTimeout(45000, 'carregando comanda')

    win.webContents.once('did-finish-load', () => {
      armarTimeout(60000, 'imprimindo comanda')
      // espera curta pro layout/fontes assentarem antes de medir/imprimir
      setTimeout(async () => {
        if (resolvido) return
        try {
          try { await win.webContents.executeJavaScript('document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>1) : 1') } catch (_) {}
          if (resolvido) return
          await impressaoService.imprimirJanela(win, impressoraNome, absUrl)
          finalizar(true)
          return
        } catch (e) {
          impressaoService.plog('error', 'Falha na impressão, caindo pro diálogo:', e.message, absUrl)
          if (resolvido) return
        }
        // Último recurso: diálogo nativo (usuário vê e confirma manualmente)
        armarTimeout(120000, 'aguardando diálogo de impressão')
        try { win.setPosition(100, 100); win.show() } catch (_) {}
        win.webContents.print({ silent: false, printBackground: true }, (ok2, err2) => {
          if (!ok2) impressaoService.plog('error', 'Falha também no diálogo:', err2, absUrl)
          else impressaoService.plog('info', 'Impresso via diálogo (fallback):', absUrl)
          finalizar(ok2)
        })
      }, 400)
    })

    win.webContents.once('did-fail-load', (_event, code, desc) => {
      impressaoService.plog('error', 'Falha ao carregar comanda:', code, desc, absUrl)
      finalizar(false)
    })

    win.loadURL(absUrl)
  })
}

// Fila serial: impressora térmica processa um trabalho por vez — evita
// sobrepor janelas/print jobs quando vários pedidos chegam juntos.
const fila = []
let processando = false

async function processarFila() {
  if (processando || fila.length === 0) return
  processando = true
  const { url, impressoraNome } = fila.shift()
  try {
    await imprimirUrl(url, impressoraNome)
  } catch (e) {
    impressaoService.plog('error', 'Erro inesperado:', e)
  }
  processando = false
  processarFila()
}

function enfileirar(url, impressoraNome) {
  if (!url) return
  fila.push({ url, impressoraNome })
  processarFila()
}

function init() {
  // canais legado (o web app em produção usa estes)
  ipcMain.on('imprimir-comanda', (_event, { url, impressoraNome } = {}) => enfileirar(url, impressoraNome))
  ipcMain.handle('listar-impressoras', async () => {
    const impressoras = await impressaoService.listarImpressoras()
    return impressoras.map(p => ({ name: p.name, displayName: p.displayName || p.name }))
  })

  // canais novos (spec printerService)
  ipcMain.handle('printer:list', async () => {
    const impressoras = await impressaoService.listarImpressoras()
    return impressoras.map(p => ({ name: p.name, displayName: p.displayName || p.name, isDefault: !!p.isDefault }))
  })
  ipcMain.handle('printer:test', (_e, { impressoraNome } = {}) => impressaoService.imprimirTeste(impressoraNome))
  ipcMain.handle('printer:order', (_e, { url, impressoraNome } = {}) => {
    enfileirar(url, impressoraNome)
    return { enfileirado: true }
  })
  ipcMain.handle('printer:diagnostico', () => impressaoService.diagnostico())

  impressaoService.diagnostico().catch(() => {})
}

module.exports = { impressaoController: { init } }
