// contas-envio.js — baixa e conta nova, pela view logada.
const A = require('./contas-acoes')

async function mandar(enviar, log, d, canal) {
  let r = null
  try { r = await enviar(d.caminho, d.corpo) } catch (e) {
    if (log) log.warn('[CONTAS] ' + canal + ' falhou:', e && e.message)
    return { ok: false, erro: 'Não deu para falar com o painel agora. Nada foi lançado.' }
  }
  if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada foi lançado.' }
  if (r.error) return { ok: false, erro: String(r.error) }
  return { ok: true, resumo: d.resumo, quita: d.quita }
}

function registrar({ ipcMain, enviar, log }) {
  ipcMain.handle('conta-baixar', async (e, args) => {
    const d = A.baixa(args && args.conta, args || {})
    return d.ok ? mandar(enviar, log, d, 'conta-baixar') : { ok: false, erro: d.motivo }
  })
  ipcMain.handle('conta-nova', async (e, args) => {
    const d = A.nova(args || {})
    return d.ok ? mandar(enviar, log, d, 'conta-nova') : { ok: false, erro: d.motivo }
  })
}

module.exports = { registrar }
