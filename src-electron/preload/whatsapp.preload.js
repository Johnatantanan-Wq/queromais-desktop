/**
 * Preload do WhatsApp Web — injetado antes do DOM carregar.
 * Baseado na técnica do Anota AI: escuta eventos do api.js e repassa via IPC.
 */
const { ipcRenderer } = require('electron')

let isConnected = false
let blacklist = {}

// ─── Blacklist ────────────────────────────────────────────────────────────────

function loadBlacklist() {
  try {
    blacklist = JSON.parse(localStorage.getItem('qm_blacklist') || '{}')
  } catch (_) { blacklist = {} }
}

function saveBlacklist() {
  localStorage.setItem('qm_blacklist', JSON.stringify(blacklist))
}

function isBlocked(from) {
  const until = blacklist[from]
  if (!until) return false
  if (new Date(until) > new Date()) return true
  delete blacklist[from]
  saveBlacklist()
  return false
}

function blockContact(from, days = 1) {
  const until = new Date()
  until.setDate(until.getDate() + days)
  blacklist[from] = until.toISOString()
  saveBlacklist()
}

function unblockContact(from) {
  delete blacklist[from]
  saveBlacklist()
}

// ─── Inicialização ────────────────────────────────────────────────────────────
// api.js é injetado pelo processo principal via executeJavaScript (dom-ready)
// Aqui só carregamos a blacklist do localStorage

window.addEventListener('DOMContentLoaded', () => {
  loadBlacklist()
})


// ─── Eventos do api.js (dispatchados no DOM) ───────────────────────────────────

document.addEventListener('authenticated', () => {
  isConnected = true
  const phone = getPhone()
  ipcRenderer.send('wa-status', { status: 'authenticated', phone })
})

document.addEventListener('ready', () => {
  ipcRenderer.send('wa-status', { status: 'ready' })
})

document.addEventListener('qr', ({ detail }) => {
  ipcRenderer.send('wa-qr', { qr: detail.qr })
})

document.addEventListener('disconnected', () => {
  isConnected = false
  ipcRenderer.send('wa-status', { status: 'disconnected' })
})

// ─── Recebimento de mensagem ───────────────────────────────────────────────────

document.addEventListener('message_received', async ({ detail }) => {
  const msg = detail.message
  if (!msg) return

  // Filtra: grupos, status, broadcast, mensagens próprias
  if (msg.isGroup || msg.broadcast || msg.isStatus || msg.fromMe) return

  // Tipos suportados
  const tiposOk = ['chat', 'image', 'ptt', 'location']
  if (!tiposOk.includes(msg.type)) return

  // Blacklist
  if (isBlocked(msg.from)) return

  const payload = {
    from: msg.from,
    name: msg.notifyName || msg.name || '',
    type: msg.type,
    message: msg.type === 'chat' ? (msg.body || '') : '',
  }

  if (msg.type === 'image') {
    payload.message = msg.caption || ''
  }

  ipcRenderer.send('wa-message', payload)
})

// ─── Envio de mensagem (via IPC do main) ──────────────────────────────────────

ipcRenderer.on('wa-send', async (event, { id, to, text }) => {
  try {
    // Aguarda api.js estar pronto (pode estar sendo injetado)
    let attempts = 0
    while (!window.API && attempts < 20) {
      await new Promise(r => setTimeout(r, 500))
      attempts++
    }
    if (!window.API) {
      ipcRenderer.send('wa-send-result', { id, success: false, error: 'window.API não disponível' })
      return
    }
    const toId = to.includes('@') ? to : `${to}@c.us`
    await window.API.anotaAI.mainSendMessage({
      senderId: toId,
      arrayMessage: [{ type: 'text', content: text }],
      source: 'notification',
    })
    ipcRenderer.send('wa-send-result', { id, success: true })
  } catch (e) {
    console.error('[QM] Erro ao enviar mensagem:', e)
    ipcRenderer.send('wa-send-result', { id, success: false, error: String(e) })
  }
})

// ─── Pausa/retoma bot por contato ─────────────────────────────────────────────

ipcRenderer.on('wa-block', (event, { from, days }) => {
  blockContact(from, days || 1)
})

ipcRenderer.on('wa-unblock', (event, { from }) => {
  unblockContact(from)
})

// ─── Utilitário: pegar telefone conectado ─────────────────────────────────────

function getPhone() {
  try {
    const wid = localStorage['last-wid'] || localStorage['last-wid-md'] || ''
    return wid.replace(/"/g, '').split('@')[0].split(':')[0]
  } catch (_) { return '' }
}
