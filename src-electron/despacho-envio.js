// despacho-envio.js — mandar pedidos para a rua, pela view logada.
// A regra mora em despacho-acoes.js. Uma chamada por entregador; se uma falhar, o
// que já saiu FICOU na rua — a tela recebe quantas foram, sem prometer o resto.
const { despachar } = require('./despacho-acoes')

function registrar({ ipcMain, enviar, log }) {
  ipcMain.handle('despacho-despachar', async (evento, args) => {
    const d = despachar(args || {})
    if (!d.ok) return { ok: false, erro: d.motivo }

    let feitas = 0
    let erro = null
    for (const c of d.chamadas) {
      let r = null
      try {
        r = await enviar(c.caminho, c.corpo)
      } catch (e) {
        if (log) log.warn('[DESPACHO] rota falhou:', e && e.message)
        erro = 'Não deu para falar com o painel.'
        break
      }
      if (!r) { erro = 'Sem resposta do painel.'; break }
      if (r.error) { erro = String(r.error); break }
      feitas++
    }
    if (!feitas) return { ok: false, erro: (erro || 'Não deu para despachar.') + ' Nada saiu.' }
    if (feitas < d.chamadas.length) {
      return { ok: true, parcial: true, resumo: feitas + ' de ' + d.chamadas.length + ' rotas saíram — ' + erro }
    }
    return { ok: true, resumo: d.resumo }
  })
}

module.exports = { registrar }
