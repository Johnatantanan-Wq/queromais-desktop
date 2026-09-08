// compras-envio.js — os canais de Compras, pela view logada. POST, PATCH e DELETE.
const A = require('./compras-acoes')

const CANAIS = {
  'compras-anotar': (a) => A.anotar(a || {}),
  'compras-comprado': (a) => A.comprado(a && a.item),
  'compras-voltar': (a) => A.voltar(a && a.item),
  'compras-excluir': (a) => A.excluir(a && a.item),
  'compras-recebi': (a) => A.recebi(a && a.item, a || {}),
}

function registrar({ ipcMain, enviar, log }) {
  for (const canal of Object.keys(CANAIS)) {
    ipcMain.handle(canal, async (e, args) => {
      const d = CANAIS[canal](args)
      if (!d.ok) return { ok: false, erro: d.motivo }
      let r = null
      try { r = await enviar(d.caminho, d.corpo, d.metodo) } catch (err) {
        if (log) log.warn('[COMPRAS] ' + canal + ' falhou:', err && err.message)
        return { ok: false, erro: 'Não deu para falar com o painel agora. Nada mudou.' }
      }
      if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada mudou.' }
      if (r.error) return { ok: false, erro: String(r.error) }
      return { ok: true, resumo: d.resumo }
    })
  }
}

module.exports = { registrar, CANAIS }
