/**
 * Outbox controller — processa whatsapp_envios pendentes e envia via WhatsApp Web.
 * Mesmo padrão do anota.ai: injeção JS no WhatsApp Web via IPC wa-send → preload → mainSendMessage.
 * Roda no Electron (sem depender de cron/servidor externo).
 */
const { createClient } = require('@supabase/supabase-js')
const { ipcMain } = require('electron')
const log = require('electron-log')
const { getConfig } = require('../config')

const POLL_MS   = 6000  // verifica a cada 6s
const MAX_TENT  = 3
// Delay entre destinatários diferentes — mainSendMessage já tem delay interno de 3-8s
// por mensagem (digitando + random); aqui garantimos separação mínima entre envios
const DELAY_MIN = 4000
const DELAY_MAX = 10000
const delayAleatorio = () => Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN) + DELAY_MIN)

let _sb = null
let _sessaoAplicadaToken = null
let waView = null
let waConectado = false
let processando = false

async function getSb() {
  if (!_sb) {
    const { supabaseUrl, supabaseKey } = getConfig()
    if (!supabaseUrl || !supabaseKey) { log.warn('[OUTBOX] Supabase não configurado'); return null }
    try {
      if (!global.WebSocket) global.WebSocket = require('ws')
      _sb = createClient(supabaseUrl, supabaseKey)
      log.info('[OUTBOX] Supabase client inicializado')
    } catch (e) {
      log.error('[OUTBOX] createClient FALHOU:', e)
      return null
    }
  }
  // Autentica como o admin REAL (RLS is_admin_da_loja) — sem isto a chave anon
  // compartilhada não enxerga whatsapp_envios desde a migration 0094 (fechou o
  // vazamento cross-tenant). Só reaplica quando o token mudou (evitar setSession
  // a cada poll de 6s).
  const { waAccessToken, waRefreshToken } = getConfig()
  if (waAccessToken && waAccessToken !== _sessaoAplicadaToken) {
    const { error } = await _sb.auth.setSession({ access_token: waAccessToken, refresh_token: waRefreshToken })
    if (error) log.error('[OUTBOX] Falha ao aplicar sessão do admin:', error)
    else _sessaoAplicadaToken = waAccessToken
  }
  return _sb
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

let _sendCounter = 0

// Envia via IPC → preload → window.API.anotaAI.mainSendMessage (addAndSendMsgToChat interno)
function enviarViaWA(destinatario, mensagem) {
  return new Promise((resolve, reject) => {
    if (!waView?.webContents) return reject(new Error('WhatsApp View indisponível'))

    const phone = String(destinatario).replace(/\D/g, '')
    if (!phone) return reject(new Error('Destinatário inválido'))

    const id = `send_${Date.now()}_${++_sendCounter}`
    let done = false

    const timer = setTimeout(() => {
      if (done) return
      done = true
      ipcMain.removeListener('wa-send-result', handler)
      reject(new Error('Timeout: sem resposta do WhatsApp em 45s'))
    }, 45000)

    const handler = (event, result) => {
      if (result.id !== id) return
      clearTimeout(timer)
      if (done) return
      done = true
      ipcMain.removeListener('wa-send-result', handler)
      if (result.success) resolve()
      else reject(new Error(result.error || 'Falha no envio'))
    }

    ipcMain.on('wa-send-result', handler)
    waView.webContents.send('wa-send', { id, to: phone, text: mensagem })
    log.info(`[OUTBOX] wa-send → ${phone} id=${id}`)
  })
}

async function processarPendentes() {
  if (processando || !waConectado) return

  const sb = await getSb()
  if (!sb) return

  processando = true
  try {
    const agora = new Date().toISOString()

    const { lojaId } = getConfig()
    if (!lojaId) { log.warn('[OUTBOX] lojaId não configurado'); return }

    const { data: envios, error: qErr } = await sb
      .from('whatsapp_envios')
      .select('id, destinatario, mensagem, tentativas, evento')
      .eq('loja_id', lojaId)
      .in('status', ['pendente', 'falhou'])
      .lt('tentativas', MAX_TENT)
      .or(`proximo_retry.is.null,proximo_retry.lte.${agora}`)
      .order('enviado_em', { ascending: true })
      .limit(10)

    if (qErr) log.error('[OUTBOX] Erro na query:', qErr)
    log.info(`[OUTBOX] encontrados ${(envios || []).length} pendentes (loja=${lojaId})`)

    for (const env of (envios || [])) {
      if (!env.mensagem || !env.destinatario) continue

      try {
        await enviarViaWA(env.destinatario, env.mensagem)

        await sb.from('whatsapp_envios')
          .update({ status: 'enviado', sucesso: true, erro: null, proximo_retry: null })
          .eq('id', env.id)

        log.info(`[OUTBOX] ✓ ${env.evento} → ${env.destinatario}`)
      } catch (e) {
        const tent = (env.tentativas || 0) + 1
        const proximo = tent < MAX_TENT
          ? new Date(Date.now() + tent * 60_000).toISOString()
          : null

        await sb.from('whatsapp_envios')
          .update({ status: 'falhou', tentativas: tent, erro: String(e), proximo_retry: proximo })
          .eq('id', env.id)

        log.error(`[OUTBOX] ✗ ${env.destinatario}:`, e)
      }

      const d = delayAleatorio()
      log.info(`[OUTBOX] aguardando ${d}ms antes do próximo envio`)
      await delay(d)
    }
  } catch (e) {
    log.error('[OUTBOX] Erro no polling:', e)
  } finally {
    processando = false
  }
}

const outboxController = {
  init(whatsappView) {
    waView = whatsappView
    setInterval(processarPendentes, POLL_MS)
    log.info('[OUTBOX] Iniciado — polling a cada 6s')
  },

  setConnected(connected) {
    waConectado = connected
    if (connected) {
      log.info('[OUTBOX] WhatsApp conectado → processando fila imediatamente')
      processarPendentes()
    }
  },
}

module.exports = { outboxController }
