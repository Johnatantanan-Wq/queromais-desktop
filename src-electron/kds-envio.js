// kds-envio.js — mover item na fila da cozinha/bar, pela view logada.
// A regra mora em kds-acoes.js; aqui só se fala com o painel (PATCH, não POST).
const { avancarItem, pedidoPronto } = require('./kds-acoes')

function registrar({ ipcMain, enviar, log }) {
  ipcMain.handle('kds-avancar', async (evento, args) => {
    const d = avancarItem(args && args.item)
    if (!d.ok) return { ok: false, erro: d.motivo }
    let r = null
    try {
      r = await enviar(d.caminho, d.corpo, 'PATCH')
    } catch (e) {
      if (log) log.warn('[KDS] avançar falhou:', e && e.message)
      return { ok: false, erro: 'Não deu para falar com o painel agora. O item não mudou.' }
    }
    if (!r) return { ok: false, erro: 'Sem resposta do painel. O item não mudou.' }
    if (r.error) return { ok: false, erro: String(r.error) }
    return { ok: true, status: d.status, resumo: d.resumo }
  })

  ipcMain.handle('kds-pedido-pronto', async (evento, args) => {
    const d = pedidoPronto(args && args.pedido)
    if (!d.ok) return { ok: false, erro: d.motivo }

    // Uma chamada por item, porque a rota é por item. Se uma falhar, o que passou
    // fica passado — e a tela recebe QUANTOS foram, para não prometer o que não foi.
    let feitos = 0
    for (const c of d.chamadas) {
      let r = null
      try {
        r = await enviar(c.caminho, c.corpo, 'PATCH')
      } catch (e) {
        if (log) log.warn('[KDS] item falhou:', e && e.message)
        break
      }
      if (!r || r.error) break
      feitos++
    }
    if (!feitos) return { ok: false, erro: 'Não deu para marcar. Nada mudou.' }
    if (feitos < d.chamadas.length) {
      return { ok: true, parcial: true, resumo: feitos + ' de ' + d.chamadas.length + ' itens marcados — tente o resto de novo.' }
    }
    return { ok: true, resumo: d.resumo }
  })
}

module.exports = { registrar }
