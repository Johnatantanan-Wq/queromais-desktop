// estoque-envio.js — os cadastros da Gestão, pela view logada. Todos POST.
const A = require('./estoque-acoes')
const CANAIS = {
  'estoque-sincronizar': () => A.sincronizar(),
  'estoque-nova-categoria': (a) => A.novaCategoria(a || {}),
  'estoque-novo-fornecedor': (a) => A.novoFornecedor(a || {}),
  'estoque-novo-insumo': (a) => A.novoInsumo(a || {}),
}
function registrar({ ipcMain, enviar, log }) {
  for (const canal of Object.keys(CANAIS)) {
    ipcMain.handle(canal, async (e, args) => {
      const d = CANAIS[canal](args)
      if (!d.ok) return { ok: false, erro: d.motivo }
      let r = null
      try { r = await enviar(d.caminho, d.corpo) } catch (err) {
        if (log) log.warn('[ESTOQUE] ' + canal + ' falhou:', err && err.message)
        return { ok: false, erro: 'Não deu para falar com o painel agora. Nada foi gravado.' }
      }
      if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada foi gravado.' }
      if (r.error) return { ok: false, erro: String(r.error) }
      // A sincronização devolve o que fez: contar é melhor do que dizer "pronto".
      const partes = []
      if (r.criados != null) partes.push(r.criados + ' criado(s)')
      if (r.vinculados != null) partes.push(r.vinculados + ' vinculado(s)')
      return { ok: true, resumo: partes.length ? 'Sincronizado: ' + partes.join(', ') + '.' : d.resumo }
    })
  }
}
module.exports = { registrar, CANAIS }
