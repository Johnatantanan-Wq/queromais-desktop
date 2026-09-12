/**
 * venda-envio.js — a venda do app vira pedido no painel.
 *
 * O PDV do desktop monta a venda no seu próprio formato (o que a tela precisa) e o
 * painel espera outro (o que o banco guarda). A conversão é pura, e mora aqui, porque
 * é ela que decide coisas que doem quando erram: o que vai como forma de pagamento do
 * PEDIDO e o que vai como forma do CAIXA — crédito e débito não existem como forma de
 * pedido no painel, entram como "cartão na entrega" com a forma do caixa ao lado.
 *
 * Na F3 (offline) é este mesmo pacote que vai para a fila quando não houver rede.
 */

const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0 }

// O painel aceita só três formas no PEDIDO; as de cartão viajam em forma_caixa.
const FORMA_PEDIDO = { dinheiro: 'dinheiro', pix: 'pix', credito: 'cartao_entrega', debito: 'cartao_entrega' }
const FORMA_CAIXA = { dinheiro: 'dinheiro', pix: 'pix', credito: 'credito', debito: 'debito' }

/**
 * Converte a venda do app no corpo do POST /api/admin/venda.
 * Devolve { ok: false, erro } quando falta o que o painel exige — melhor recusar aqui
 * do que mandar e receber um 400 que a tela não sabe explicar.
 */
function paraOPainel(venda) {
  if (!venda || !Array.isArray(venda.itens) || !venda.itens.length) {
    return { ok: false, erro: 'A venda precisa de ao menos um item.' }
  }
  const semId = venda.itens.filter((i) => !i.id)
  if (semId.length) {
    // Acontece se o cardápio veio de cache antigo, de antes de o id passar a vir junto.
    return { ok: false, erro: 'Item sem cadastro no cardápio: ' + semId.map((i) => i.nome).join(', ') }
  }
  const nome = (venda.cliente || '').trim()
  if (!nome) return { ok: false, erro: 'A venda precisa do nome do cliente.' }

  const corpo = {
    tipo: venda.tipo === 'entrega' ? 'entrega' : venda.tipo === 'consumo_local' ? 'consumo_local' : 'retirada',
    cliente_nome: nome,
    cliente_telefone: venda.telefone || '',
    items: venda.itens.map((i) => ({
      produto_id: i.id,
      nome: i.nome,
      preco_base: num(i.preco),
      imagem_url: null,
      qtd: num(i.qtd) || 1,
      sabores: [],
    })),
    forma_pagamento: FORMA_PEDIDO[venda.forma] || 'dinheiro',
    forma_caixa: FORMA_CAIXA[venda.forma] || 'dinheiro',
    desconto: 0,
    // Troco só faz sentido em dinheiro; mandar em cartão confundiria o fechamento.
    troco_para: venda.forma === 'dinheiro' && num(venda.trocoPara) > 0 ? num(venda.trocoPara) : null,
    pago: true,
    pago_no_ato: true,
    observacao: venda.observacao || '',
    gerar_cobranca_pix: false,
  }
  if (corpo.tipo === 'entrega') {
    corpo.endereco = {
      rua: venda.endereco || '', numero: '', bairro: venda.bairro || '',
      cidade: '', uf: '', cep: '',
    }
  }
  return { ok: true, corpo }
}

// Regra da spec: sem internet só dinheiro. O app não gera QR de Pix, e a maquininha é
// outra máquina — mas a decisão é do dono (spec F3), e a frase diz o que fazer.
const SEM_INTERNET_FORMA = 'Sem internet só dá para fechar em dinheiro — Pix e cartão precisam de conexão. Troque a forma e feche de novo.'

/** O que as telas precisam mostrar da venda enquanto ela espera na fila. */
function resumoDaVenda(venda, corpo) {
  return {
    cliente: corpo.cliente_nome, telefone: venda.telefone || '', total: num(venda.total),
    forma: venda.forma || 'dinheiro', tipo: corpo.tipo,
    itens: (venda.itens || []).map((i) => (num(i.qtd) || 1) + '× ' + i.nome),
    bairro: venda.bairro || '', observacao: venda.observacao || '',
  }
}

/**
 * Registra o canal de escrita. `enviar` faz o POST por dentro da view logada.
 *
 * Com `fila` (F3.3), a venda ganha id próprio e carimbo, e o app decide:
 *  • sem internet → só dinheiro entra na fila (número provisório L-n); Pix e cartão
 *    são recusados com o motivo, em vez de aceitar e falhar depois;
 *  • com internet → sobe na hora; se a rede cair NO MEIO, vale a regra de cima;
 *  • sessão expirada (401) ou servidor fora (5xx) → a venda já aconteceu no balcão:
 *    entra na fila, qualquer forma — reenviar é seguro porque o servidor reconhece o id;
 *  • o painel recusando (4xx) → erro na tela, como sempre. Um 400 não se cura sozinho.
 */
function registrar({ ipcMain, enviar, enviarComStatus, log, fila, online, gerarId, agora }) {
  const idNovo = () => (gerarId ? gerarId() : require('crypto').randomUUID())
  const carimbo = () => new Date(agora ? agora() : Date.now()).toISOString()

  ipcMain.handle('venda-registrar', async (evento, venda) => {
    const pronto = paraOPainel(venda)
    if (!pronto.ok) return pronto
    const corpo = pronto.corpo

    if (fila && enviarComStatus) {
      corpo.id_cliente_app = idNovo()
      corpo.criado_no_app_em = carimbo()
      const soDinheiro = (venda.forma || 'dinheiro') === 'dinheiro'
      const enfileirar = () => {
        const item = fila.enfileirar({ tipo: 'venda', caminho: '/api/admin/venda', corpo, resumo: resumoDaVenda(venda, corpo) })
        if (log) log.info('[VENDA] ' + item.provisorio + ' guardada na fila — sobe quando a internet voltar')
        return { ok: true, provisorio: true, numero: item.provisorio, id_cliente_app: corpo.id_cliente_app }
      }

      if (online && !online()) {
        if (!soDinheiro) return { ok: false, erro: SEM_INTERNET_FORMA }
        return enfileirar()
      }

      let r = null
      try { r = await enviarComStatus('/api/admin/venda', corpo) } catch (e) { r = null }
      const status = r ? (Number(r.status) || 0) : 0
      const body = r ? r.body : null
      if (status >= 200 && status < 300 && body && !body.error) {
        if (log) log.info('[VENDA] #' + body.numero + ' lançada no painel' + (body.repetida ? ' (já existia)' : ''))
        return { ok: true, numero: body.numero, id: body.id, total: body.total }
      }
      if (status === 0) {
        if (!soDinheiro) return { ok: false, erro: 'A conexão caiu no meio. ' + SEM_INTERNET_FORMA }
        return enfileirar()
      }
      if (status === 401 || status === 403 || status >= 500) return enfileirar()
      return { ok: false, erro: (body && body.error) || 'O painel recusou a venda.' }
    }

    // Sem fila (marcas sem shell elo): o caminho de sempre.
    let resposta = null
    try {
      resposta = await enviar('/api/admin/venda', corpo)
    } catch (e) {
      return { ok: false, erro: 'Sem conexão com o painel para lançar a venda.' }
    }
    if (!resposta || resposta.error) {
      return { ok: false, erro: (resposta && resposta.error) || 'O painel recusou a venda.' }
    }
    if (log) log.info('[VENDA] #' + resposta.numero + ' lançada no painel')
    return { ok: true, numero: resposta.numero, id: resposta.id, total: resposta.total }
  })
}

module.exports = { paraOPainel, registrar, resumoDaVenda, FORMA_PEDIDO, FORMA_CAIXA, SEM_INTERNET_FORMA }
