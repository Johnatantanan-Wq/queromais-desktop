// caixa-envio.js — os canais que MEXEM no caixa, pela view já logada.
// Espelha pedido-envio.js: a regra mora em caixa-acoes.js; aqui só se fala com o painel.
const A = require('./caixa-acoes')

const DECISAO = {
  'caixa-movimentacao': A.movimentacao,
  'caixa-fechar': A.fechamento,
  'caixa-abrir': A.abertura,
}

function registrar({ ipcMain, enviar, log }) {
  for (const canal of Object.keys(DECISAO)) {
    ipcMain.handle(canal, async (evento, args) => {
      const decidido = DECISAO[canal](args || {})
      if (!decidido.ok) return { ok: false, erro: decidido.motivo }

      let resposta = null
      try {
        resposta = await enviar(decidido.caminho, decidido.corpo)
      } catch (e) {
        if (log) log.warn('[CAIXA] ' + canal + ' falhou:', e && e.message)
        return { ok: false, erro: 'Não deu para falar com o painel agora. Nada foi lançado.' }
      }
      // Silêncio não é sucesso: dizer que lançou sem ter lançado é pior do que o erro.
      if (!resposta) return { ok: false, erro: 'Sem resposta do painel. Nada foi lançado.' }
      if (resposta.error) return { ok: false, erro: String(resposta.error) }
      return { ok: true, resumo: decidido.resumo }
    })
  }
}

module.exports = { registrar, DECISAO }
