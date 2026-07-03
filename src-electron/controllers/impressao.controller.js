/**
 * Controller de impressão — recebe pedidos de impressão vindos da view do
 * cardápio (via preload/cardapio.preload.js) e imprime SILENCIOSAMENTE
 * (sem diálogo do SO), usando uma janela oculta + webContents.print.
 *
 * A janela oculta usa a MESMA sessão (persist:cardapio) da view do cardápio,
 * senão a página da comanda cai na tela de login (ela exige sessão admin).
 */
const { BrowserWindow, ipcMain, session } = require('electron')
const { URL } = require('url')
const log = require('electron-log')
const { getConfig } = require('../config')

function resolverUrl(relOuAbs) {
  try {
    return new URL(relOuAbs, getConfig().cardapioUrl).toString()
  } catch (e) {
    log.error('[IMPRESSAO] URL inválida:', relOuAbs, e.message)
    return null
  }
}

function imprimirUrl(url, impressoraNome) {
  return new Promise((resolve) => {
    const absUrl = resolverUrl(url)
    if (!absUrl) return resolve(false)

    const win = new BrowserWindow({
      show: false,
      width: 400,
      height: 700,
      webPreferences: {
        session: session.fromPartition('persist:cardapio'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    let resolvido = false
    const finalizar = (ok) => {
      if (resolvido) return
      resolvido = true
      clearTimeout(timeout)
      try { if (!win.isDestroyed()) win.close() } catch (_) {}
      resolve(ok)
    }

    const timeout = setTimeout(() => {
      log.warn('[IMPRESSAO] Timeout carregando comanda:', absUrl)
      finalizar(false)
    }, 15000)

    win.webContents.once('did-finish-load', () => {
      // pequena espera pra garantir que o layout/CSS da comanda assentou antes de imprimir
      setTimeout(() => {
        if (resolvido) return
        win.webContents.print(
          { silent: true, printBackground: true, deviceName: impressoraNome || undefined },
          (success, errorType) => {
            if (success) {
              log.info('[IMPRESSAO] Comanda impressa:', absUrl, impressoraNome ? `(${impressoraNome})` : '(padrão)')
              finalizar(true)
              return
            }
            // Impressão silenciosa falhou (impressora offline, sem impressora padrão definida, etc.)
            // — cai pro diálogo do SO em vez de sumir com o pedido sem imprimir e sem ninguém saber.
            log.error('[IMPRESSAO] Falha na impressão silenciosa, caindo pro diálogo:', errorType, absUrl)
            if (resolvido) return
            clearTimeout(timeout)
            // dá mais tempo (o usuário precisa ver e confirmar o diálogo manualmente)
            const timeoutFallback = setTimeout(() => {
              log.warn('[IMPRESSAO] Timeout aguardando diálogo de impressão:', absUrl)
              finalizar(false)
            }, 120000)
            try { win.show() } catch (_) {}
            win.webContents.print({ silent: false, printBackground: true }, (success2, errorType2) => {
              clearTimeout(timeoutFallback)
              if (!success2) log.error('[IMPRESSAO] Falha também no diálogo de impressão:', errorType2, absUrl)
              else log.info('[IMPRESSAO] Comanda impressa via diálogo (fallback):', absUrl)
              finalizar(success2)
            })
          }
        )
      }, 300)
    })

    win.webContents.once('did-fail-load', (_event, code, desc) => {
      log.error('[IMPRESSAO] Falha ao carregar comanda:', code, desc, absUrl)
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
    log.error('[IMPRESSAO] Erro inesperado:', e)
  }
  processando = false
  processarFila()
}

function init() {
  ipcMain.on('imprimir-comanda', (_event, { url, impressoraNome } = {}) => {
    if (!url) return
    fila.push({ url, impressoraNome })
    processarFila()
  })

  ipcMain.handle('listar-impressoras', async () => {
    try {
      const win = global.cardapioView
      if (!win || win.webContents.isDestroyed()) return []
      const impressoras = await win.webContents.getPrintersAsync()
      return impressoras.map(p => ({ name: p.name, displayName: p.displayName || p.name }))
    } catch (e) {
      log.error('[IMPRESSAO] Falha ao listar impressoras:', e)
      return []
    }
  })
}

module.exports = { impressaoController: { init } }
