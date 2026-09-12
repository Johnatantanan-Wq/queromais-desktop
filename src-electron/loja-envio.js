// loja-envio.js — as ações de loja/operação, pela view logada. PATCH e POST.
const A = require('./loja-acoes')
const CANAIS = {
  'loja-aceite': (a) => A.aceiteAutomatico(a && a.ligado),
  'loja-aberta': (a) => A.lojaAberta(a && a.aberta),
  'loja-tempos': (a) => A.tempos(a || {}),
  'loja-pausar': (a) => A.pausar(a ? a.minutos : null),
  'kds-gerar-codigo': () => A.gerarCodigoKds(),
  'kds-revogar': () => A.revogarTelasKds(),
  'entregador-novo': (a) => A.novoEntregador(a || {}),
  'rota-fechar': (a) => A.fecharRota(a && a.rota, a || {}),
  'cliente-novo': (a) => A.novoCliente(a || {}),
}
function registrar({ ipcMain, enviar, log }) {
  for (const canal of Object.keys(CANAIS)) {
    ipcMain.handle(canal, async (e, args) => {
      const d = CANAIS[canal](args)
      if (!d.ok) return { ok: false, erro: d.motivo }
      let r = null
      try { r = await enviar(d.caminho, d.corpo, d.metodo) } catch (err) {
        if (log) log.warn('[LOJA] ' + canal + ' falhou:', err && err.message)
        return { ok: false, erro: 'Não deu para falar com o painel agora. Nada mudou.' }
      }
      if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada mudou.' }
      if (r.error) return { ok: false, erro: String(r.error) }
      // O código da TV vem na resposta: é ele que o lojista precisa ver.
      if (canal === 'kds-gerar-codigo' && r.codigo) return { ok: true, codigo: String(r.codigo), resumo: 'Código novo: ' + r.codigo }
      return { ok: true, resumo: d.resumo }
    })
  }
}
module.exports = { registrar, CANAIS }
