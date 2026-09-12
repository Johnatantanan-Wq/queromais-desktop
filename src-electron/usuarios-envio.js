// usuarios-envio.js — os canais da aba Equipe, pela view já logada.
const A = require('./usuarios-acoes')

async function mandar(enviar, log, d) {
  let r = null
  try { r = await enviar(d.caminho, d.corpo, d.metodo) } catch (e) {
    if (log) log.warn('[USUARIOS] falhou:', e && e.message)
    return { ok: false, erro: 'Não deu para falar com o painel agora. Nada mudou.' }
  }
  // Silêncio não é sucesso: dizer que salvou sem ter salvo é pior do que o erro.
  if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada mudou.' }
  if (r.error) return { ok: false, erro: String(r.error) }
  return { ok: true, resumo: d.resumo }
}

function registrar({ ipcMain, enviar, log }) {
  ipcMain.handle('usuario-editar', async (e, args) => {
    const d = A.editar(args && args.usuario, args && args.campos)
    if (!d.ok) return { ok: false, erro: d.motivo }
    return mandar(enviar, log, d)
  })
  ipcMain.handle('usuario-ativar', async (e, args) => {
    const d = A.ativar(args && args.usuario, args && args.ligado)
    if (!d.ok) return { ok: false, erro: d.motivo }
    return mandar(enviar, log, d)
  })
}

module.exports = { registrar }
