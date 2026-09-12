// contas-envio.js — baixa e conta nova, pela view logada.
const A = require('./contas-acoes')

async function mandar(enviar, log, d, canal) {
  let r = null
  // O método é o da decisão: lançar é POST, editar e cancelar são PATCH por id.
  try { r = await enviar(d.caminho, d.corpo, d.metodo) } catch (e) {
    if (log) log.warn('[CONTAS] ' + canal + ' falhou:', e && e.message)
    return { ok: false, erro: 'Não deu para falar com o painel agora. Nada foi lançado.' }
  }
  if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada foi lançado.' }
  if (r.error) return { ok: false, erro: String(r.error) }
  return { ok: true, resumo: d.resumo, quita: d.quita }
}

function registrar({ ipcMain, enviar, log }) {
  // Só a conta: divide o total e devolve a grade para a tela mostrar ANTES de lançar.
  // Nada sai daqui para o painel — é cálculo, não escrita.
  ipcMain.handle('conta-parcelas', (e, args) => {
    const a = args || {}
    const d = A.nova({ ...a, direcao: 'pagar', descricao: a.descricao || 'x',
      parcelas: Math.max(2, Math.floor(Number(a.parcelas) || 2)) })
    if (!d.ok) return { ok: false, erro: d.motivo }
    return { ok: true, parcelas: d.parcelas || [] }
  })
  ipcMain.handle('conta-baixar', async (e, args) => {
    const d = A.baixa(args && args.conta, args || {})
    return d.ok ? mandar(enviar, log, d, 'conta-baixar') : { ok: false, erro: d.motivo }
  })
  ipcMain.handle('conta-nova', async (e, args) => {
    const d = A.nova(args || {})
    return d.ok ? mandar(enviar, log, d, 'conta-nova') : { ok: false, erro: d.motivo }
  })
  // Financeiro pelo app: lançamento avulso no extrato, editar e cancelar conta.
  ipcMain.handle('lancamento-novo', async (e, args) => {
    const d = A.lancamento(args || {})
    return d.ok ? mandar(enviar, log, d, 'lancamento-novo') : { ok: false, erro: d.motivo }
  })
  ipcMain.handle('conta-editar', async (e, args) => {
    const a = args || {}
    const d = A.editar(a.conta, a)
    return d.ok ? mandar(enviar, log, d, 'conta-editar') : { ok: false, erro: d.motivo }
  })
  ipcMain.handle('conta-cancelar', async (e, args) => {
    const a = args || {}
    const d = A.cancelar(a.conta, a.escopo)
    return d.ok ? mandar(enviar, log, d, 'conta-cancelar') : { ok: false, erro: d.motivo }
  })
}

module.exports = { registrar }
