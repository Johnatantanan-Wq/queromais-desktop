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

  // Guardar o caminho escolhido e as credenciais. `ativo` acompanha o provedor:
  // escolher "Desativado" é justamente desligar o envio automático.
  ipcMain.handle('whatsapp-salvar', async (evento, args) => {
    const provedor = args && args.provedor
    const validos = ['desativado', 'wabot', 'evolution', 'z_api', 'cloud_api']
    if (validos.indexOf(provedor) < 0) return { ok: false, erro: 'Caminho desconhecido.' }

    const corpo = { provedor, ativo: provedor !== 'desativado', ...((args && args.campos) || {}) }
    let r = null
    try {
      r = await enviar('/api/admin/whatsapp/config', corpo, 'PUT')
    } catch (e) {
      if (log) log.warn('[WHATSAPP] salvar falhou:', e && e.message)
      return { ok: false, erro: 'Não deu para falar com o painel agora. Nada foi salvo.' }
    }
    if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada foi salvo.' }
    if (r.error) return { ok: false, erro: String(r.error) }
    return { ok: true }
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
