/**
 * Controller do WhatsApp — gerencia IPC e fila de mensagens.
 * Repassa mensagens recebidas para o bot.controller.
 */
const { ipcMain } = require('electron')
const log = require('electron-log')

let whatsappView = null
let mainWindow = null

// Fila anti-flood: processa uma mensagem por vez com 500ms de intervalo
const fila = []
let processando = false

async function processarFila() {
  if (processando || fila.length === 0) return
  processando = true

  const { botController } = require('./bot.controller')
  const msg = fila.shift()
  try {
    await botController.responder(msg)
  } catch (e) {
    log.error('[WA] Erro ao processar mensagem:', e)
  }

  setTimeout(() => {
    processando = false
    processarFila()
  }, 500)
}

const whatsappController = {
  init(win, waView) {
    mainWindow = win
    whatsappView = waView

    // Status da conexão
    ipcMain.on('wa-status', (event, { status, phone }) => {
      log.info(`[WA] status: ${status}${phone ? ' / ' + phone : ''}`)
      mainWindow?.webContents.send('wa-status-update', { status, phone })
      const { outboxController } = require('./outbox.controller')
      outboxController.setConnected(status === 'authenticated' || status === 'ready')
    })

    // QR code recebido — envia para o renderer mostrar o overlay
    // NÃO força split view automaticamente: adicionar WhatsApp BrowserView inesperadamente
    // causava congelamento da sidebar no Windows (view adicionada sem bounds corretos)
    ipcMain.on('wa-qr', (event, { qr }) => {
      mainWindow?.webContents.send('wa-qr-update', { qr })
    })

    // Mensagem recebida do cliente
    ipcMain.on('wa-message', (event, msg) => {
      log.info(`[WA] msg de ${msg.from}: "${msg.message}"`)
      fila.push(msg)
      processarFila()
    })
  },

  // Envia texto para um contato
  enviarTexto(to, text) {
    if (!whatsappView) return
    whatsappView.webContents.send('wa-send', { to, text })
  },

  // Envia array de mensagens (formato nativo do api.js)
  enviarRaw(to, arrayMessage) {
    if (!whatsappView) return
    whatsappView.webContents.send('wa-send-raw', { to, arrayMessage })
  },

  bloquear(from, days = 1) {
    whatsappView?.webContents.send('wa-block', { from, days })
  },

  desbloquear(from) {
    whatsappView?.webContents.send('wa-unblock', { from })
  },
}

module.exports = { whatsappController }
