// pedido-envio.js — o canal que MEXE no pedido, pela view já logada.
//
// Espelha venda-envio.js: a regra do que mandar mora em pedido-acoes.js (pura,
// testável); aqui só se conversa com o painel e se traduz a resposta para a tela.
// Recusa do painel chega ao lojista com a frase dele, não com um código.
const { avanco } = require('./pedido-acoes')

function registrar({ ipcMain, enviar, log }) {
  ipcMain.handle('pedido-avancar', async (evento, args) => {
    const pedido = (args && args.pedido) || {}
    const etapa = args && args.etapa
    const decidido = avanco(pedido, etapa)
    if (!decidido.ok) return { ok: false, erro: decidido.motivo }

    let resposta = null
    try {
      resposta = await enviar(decidido.caminho, decidido.corpo)
    } catch (e) {
      if (log) log.warn('[PEDIDO] falhou ao avançar:', e && e.message)
      return { ok: false, erro: 'Não deu para falar com o painel agora. O pedido não mudou.' }
    }

    // Sem resposta = sem rede ou sessão caída. Nunca dizer que deu certo: o cartão
    // ficaria numa coluna que o painel não conhece.
    if (!resposta) return { ok: false, erro: 'Sem resposta do painel. O pedido não mudou.' }
    if (resposta.error) return { ok: false, erro: String(resposta.error) }

    return { ok: true, status: decidido.status, numero: pedido.numero }
  })
}

module.exports = { registrar }
