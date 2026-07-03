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

const MICRONS_POR_PX = 25400 / 96 // 96 CSS px/polegada
const FOLGA_ALTURA_MICRONS = 8000 // ~8mm de folga (evita cortar a última linha por arredondamento)
const ALTURA_PADRAO_MICRONS = 400000 // fallback (~400mm) se a medição falhar
// 72mm, não os 80mm do papel: a cabeça de impressão térmica só imprime ~72mm
// dos 80mm da bobina — com 80mm o fim das linhas (ex.: centavos do preço)
// saía cortado à direita. Bate com o `@page { size: 72mm auto }` do CSS.
const LARGURA_IMPRESSAO_MICRONS = 72000

// Mede a altura real da comanda renderizada (.ticket). Sem isso, o print
// silencioso usa o tamanho de página PADRÃO da impressora (não o
// `@page { size: 72mm auto }` do CSS) — numa bobina, o padrão do driver costuma
// ser mais curto que um pedido com vários itens, cortando o resto da comanda.
async function medirPageSize(win) {
  try {
    const alturaPx = await win.webContents.executeJavaScript(
      "(function(){ var el = document.querySelector('.ticket'); return el ? el.scrollHeight : document.body.scrollHeight })()"
    )
    if (typeof alturaPx === 'number' && alturaPx > 0) {
      return { width: LARGURA_IMPRESSAO_MICRONS, height: Math.round(alturaPx * MICRONS_POR_PX) + FOLGA_ALTURA_MICRONS }
    }
  } catch (e) {
    log.warn('[IMPRESSAO] Falha ao medir altura da comanda, usando fallback:', e.message)
  }
  return { width: LARGURA_IMPRESSAO_MICRONS, height: ALTURA_PADRAO_MICRONS }
}

function imprimirUrl(url, impressoraNome) {
  return new Promise((resolve) => {
    const absUrl = resolverUrl(url)
    if (!absUrl) return resolve(false)

    const win = new BrowserWindow({
      show: false,
      x: -10000, y: -10000, // fora da tela — mas PRECISA ficar "shown" (ver showInactive abaixo)
      width: 400,
      height: 700,
      webPreferences: {
        session: session.fromPartition('persist:cardapio'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    // Janela nunca mostrada (show:false) nunca é pintada pelo Chromium no Windows —
    // o print silencioso saía em branco mesmo com o conteúdo certo no DOM (o diálogo
    // manual funcionava porque cai no win.show() do fallback, abaixo). showInactive()
    // pinta a janela sem roubar foco nem aparecer (fica fora da tela).
    try { win.showInactive() } catch (_) {}

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
      setTimeout(async () => {
        if (resolvido) return
        const pageSize = await medirPageSize(win)
        if (resolvido) return
        win.webContents.print(
          { silent: true, printBackground: true, deviceName: impressoraNome || undefined, pageSize },
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
            // volta a janela pra tela — o usuário precisa ver e interagir com o diálogo
            try { win.setPosition(100, 100); win.show() } catch (_) {}
            win.webContents.print({ silent: false, printBackground: true, pageSize }, (success2, errorType2) => {
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
