// config-envio.js — os canais de Configurações, pela view logada.
// Espelha caixa-envio.js: a regra mora em config-acoes.js; aqui só se fala com o
// painel — com o MÉTODO da decisão (PATCH, POST, PUT, DELETE), porque nem tudo é POST.
//
// Em demonstração (`local`), o mesmo canal aplica a mudança por cima do dado fictício e
// responde na hora — é assim que o dono valida as fichas sem servidor.
const C = require('./config-acoes')

const CANAIS = {
  'config-loja': (a) => C.loja(a),
  'config-horarios': (a) => C.horarios(a),
  'config-bairros': (a) => C.bairros(a),
  'config-forma-nova': (a) => C.formaNova(a),
  'config-forma-editar': (a) => C.formaEditar(a.forma, a),
  'config-conta-financeira': (a) => C.contaFinanceira(a.conta || null, a),
  'config-conta-financeira-excluir': (a) => C.contaFinanceiraExcluir(a.conta),
  'config-mesas-criar': (a) => C.mesasCriar(a),
  'config-mesa-editar': (a) => C.mesaEditar(a.mesa, a),
  'config-mesa-excluir': (a) => C.mesaExcluir(a.mesa),
  'config-colaborador-novo': (a) => C.colaboradorNovo(a),
  'config-comanda': (a) => C.comanda(a.atual, a.campos || a),
}

function registrar({ ipcMain, enviar, log, local }) {
  for (const canal of Object.keys(CANAIS)) {
    ipcMain.handle(canal, async (evento, args) => {
      const a = args || {}
      const decidido = CANAIS[canal](a)
      if (!decidido.ok) return { ok: false, erro: decidido.motivo }
      if (local) {
        const extra = local.aplicarDecisao(canal, decidido, a) || {}
        return { ok: true, resumo: decidido.resumo, ...extra, demo: true }
      }
      let r = null
      try {
        r = await enviar(decidido.caminho, decidido.corpo, decidido.metodo)
      } catch (e) {
        if (log) log.warn('[CONFIG] ' + canal + ' falhou:', e && e.message)
        return { ok: false, erro: 'Não deu para falar com o painel agora. Nada foi gravado.' }
      }
      // Silêncio não é sucesso: dizer que salvou sem ter salvo é pior do que o erro.
      if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada foi gravado.' }
      if (r.error) return { ok: false, erro: String(r.error) }
      if (log) log.info('[CONFIG] ' + canal + ' → ' + decidido.metodo + ' ' + decidido.caminho)
      return { ok: true, resumo: decidido.resumo }
    })
  }
}

module.exports = { registrar, CANAIS }
