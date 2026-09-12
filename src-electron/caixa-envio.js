// caixa-envio.js — os canais que MEXEM no caixa, pela view já logada.
// Espelha pedido-envio.js: a regra mora em caixa-acoes.js; aqui só se fala com o painel.
//
// F3.3/F3.4 (com `fila`): sangria e suprimento entram na fila quando não há internet;
// o fechamento nasce PROVISÓRIO — vai com o RETRATO do que o app viu (movimentações do
// cache + o que a própria fila tem) e só vira definitivo quando o servidor confere. Se
// o servidor achar movimentação que o app não viu, a conferência fica guardada para o
// lojista confirmar; nunca se fecha calado com número errado. Entrega, mesa e abertura
// continuam só com internet: cada uma depende do que só o painel sabe naquele instante.
const A = require('./caixa-acoes')

const DECISAO = {
  'caixa-movimentacao': A.movimentacao,
  'caixa-fechar': A.fechamento,
  'caixa-abrir': A.abertura,
  // Delivery e Mesas: o item vem em `entrega`/`mesa`, o resto são os campos do popup.
  'entrega-concluir': (a) => A.concluirEntrega(a && a.entrega, a || {}),
  'entrega-confirmar': (a) => A.confirmarRecebimento(a && a.entrega, a || {}),
  'mesa-fechar': (a) => A.fecharMesa(a && a.mesa, a || {}),
}

const COM_FILA = { 'caixa-movimentacao': 'movimentacao', 'caixa-fechar': 'fechamento' }

const RESUMO_PROVISORIO = 'Caixa fechado PROVISORIAMENTE — feito sem internet, sujeito a conferência quando a conexão voltar.'
const RESUMO_CONFERENCIA = 'O painel achou movimentação que o app não viu — confira antes de fechar de vez.'

/** A resposta `definitivo: false` do fechar, no formato que a ficha de conferência lê. */
function conferenciaDaResposta(body, corpo, agora) {
  const c = corpo || {}
  return {
    caixaId: body.caixaId || null,
    naoVistas: Array.isArray(body.naoVistas) ? body.naoVistas : [],
    esperado: body.esperado || {},
    diferencas: body.diferencas || null,
    idClienteApp: c.id_cliente_app || null,
    contados: { dinheiro: c.dinheiro_contado, pix: c.pix_contado, cartao: c.cartao_contado },
    em: new Date(agora ? agora() : Date.now()).toISOString(),
  }
}

/** Para a fila: o fechamento que subiu por ela também pode voltar pedindo conferência. */
function aoSubirDoCaixa(fila, agora) {
  return (item, body) => {
    if (!item || item.tipo !== 'fechamento') return
    if (body && body.definitivo === false) fila.guardarConferencia(conferenciaDaResposta(body, item.corpo, agora))
    else fila.guardarConferencia(null)
  }
}

function registrar({ ipcMain, enviar, enviarComStatus, log, fila, online, gerarId, agora, movimentacoesVistas }) {
  const idNovo = () => (gerarId ? gerarId() : require('crypto').randomUUID())
  const carimbo = () => new Date(agora ? agora() : Date.now()).toISOString()
  const comFila = !!(fila && enviarComStatus)

  const retrato = () => ({
    movimentacoes: (movimentacoesVistas ? movimentacoesVistas() : []) || [],
    vendas_app: fila.pendentes().filter((i) => i.tipo === 'venda').map((i) => i.id),
    movimentacoes_app: fila.pendentes().filter((i) => i.tipo === 'movimentacao').map((i) => i.id),
  })

  async function pelaFila(canal, decidido) {
    const tipo = COM_FILA[canal]
    const corpo = { ...decidido.corpo, id_cliente_app: idNovo() }
    if (tipo === 'fechamento') { corpo.retrato = retrato(); corpo.fechado_no_app_em = carimbo() }
    const enfileirar = () => {
      fila.enfileirar({ tipo, caminho: decidido.caminho, corpo })
      if (log) log.info('[CAIXA] ' + canal + ' guardado na fila — sobe quando a internet voltar')
      return { ok: true, provisorio: true,
        resumo: tipo === 'fechamento' ? RESUMO_PROVISORIO : decidido.resumo.replace(/ lançad[ao] no caixa\.$/, '') + ' anotada — sobe quando a internet voltar.' }
    }
    if (online && !online()) return enfileirar()

    let r = null
    try { r = await enviarComStatus(decidido.caminho, corpo) } catch (e) { r = null }
    const status = r ? (Number(r.status) || 0) : 0
    const body = r ? r.body : null
    if (status >= 200 && status < 300 && body && !body.error) {
      if (tipo === 'fechamento') {
        if (body.definitivo === false) {
          fila.guardarConferencia(conferenciaDaResposta(body, corpo, agora))
          return { ok: true, conferencia: fila.conferencia(), resumo: RESUMO_CONFERENCIA }
        }
        fila.guardarConferencia(null)
      }
      return { ok: true, resumo: decidido.resumo }
    }
    if (status === 0 || status === 401 || status === 403 || status >= 500) return enfileirar()
    return { ok: false, erro: (body && body.error) || 'O painel recusou.' }
  }

  for (const canal of Object.keys(DECISAO)) {
    ipcMain.handle(canal, async (evento, args) => {
      const decidido = DECISAO[canal](args || {})
      if (!decidido.ok) return { ok: false, erro: decidido.motivo }
      if (comFila && COM_FILA[canal]) return pelaFila(canal, decidido)

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

  // Confirmar a conferência: o lojista viu o que o app não viu e fecha de vez. Precisa
  // do painel — sem internet a conferência fica guardada e a tela diz isso.
  if (comFila) {
    ipcMain.handle('caixa-conferencia-confirmar', async (evento, args) => {
      const conf = fila.conferencia()
      if (!conf) return { ok: false, erro: 'Não há conferência pendente.' }
      const decidido = A.fechamento({ ...(args || {}), caixaAberto: true })
      if (!decidido.ok) return { ok: false, erro: decidido.motivo }
      const corpo = { ...decidido.corpo, confirmar: true, id_cliente_app: conf.idClienteApp || undefined }
      if (online && !online()) return { ok: false, erro: 'Sem internet — a conferência precisa do painel. Ela fica guardada até a conexão voltar.' }
      let r = null
      try { r = await enviarComStatus(decidido.caminho, corpo) } catch (e) { r = null }
      const status = r ? (Number(r.status) || 0) : 0
      const body = r ? r.body : null
      if (status === 0) return { ok: false, erro: 'Sem internet — a conferência precisa do painel. Ela fica guardada até a conexão voltar.' }
      if (status >= 200 && status < 300 && body && !body.error) {
        fila.guardarConferencia(null)
        if (log) log.info('[CAIXA] conferência confirmada — caixa fechado de vez')
        return { ok: true, resumo: 'Conferência confirmada — caixa fechado de vez com ' + decidido.resumo.replace(/^Caixa fechado com /, '') }
      }
      return { ok: false, erro: (body && body.error) || 'O painel recusou a conferência.' }
    })
  }
}

module.exports = { registrar, DECISAO, COM_FILA, conferenciaDaResposta, aoSubirDoCaixa, RESUMO_PROVISORIO, RESUMO_CONFERENCIA }
