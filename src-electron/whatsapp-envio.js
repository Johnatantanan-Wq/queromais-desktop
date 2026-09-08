// whatsapp-envio.js — conectar e desconectar o WhatsApp pela view logada.
//
// O trabalho é todo do painel: POST /api/admin/whatsapp/evolution/conectar fala com o
// servidor Evolution e devolve o QR; desconectar derruba a instância. O app só pede e
// mostra o código — e nunca diz "conectado" sem o painel ter dito.
function registrar({ ipcMain, enviar, log }) {
  ipcMain.handle('whatsapp-conectar', async () => {
    let r = null
    try {
      r = await enviar('/api/admin/whatsapp/evolution/conectar', {})
    } catch (e) {
      if (log) log.warn('[WHATSAPP] conectar falhou:', e && e.message)
      return { ok: false, erro: 'Não deu para falar com o painel agora.' }
    }
    if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada mudou.' }
    if (r.error) return { ok: false, erro: String(r.error) }
    return { ok: true, estado: r.estado || null, qr: r.qr || null, pairingCode: r.pairingCode || null }
  })

  ipcMain.handle('whatsapp-desconectar', async () => {
    let r = null
    try {
      r = await enviar('/api/admin/whatsapp/evolution/desconectar', {})
    } catch (e) {
      if (log) log.warn('[WHATSAPP] desconectar falhou:', e && e.message)
      return { ok: false, erro: 'Não deu para falar com o painel agora.' }
    }
    if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada mudou.' }
    if (r.error) return { ok: false, erro: String(r.error) }
    return { ok: true }
  })
}

module.exports = { registrar }
