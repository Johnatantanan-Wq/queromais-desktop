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

/** Registra o canal de escrita. `enviar` faz o POST por dentro da view logada. */
function registrar({ ipcMain, enviar, log }) {
  ipcMain.handle('venda-registrar', async (evento, venda) => {
    const pronto = paraOPainel(venda)
    if (!pronto.ok) return pronto

    let resposta = null
    try {
      resposta = await enviar('/api/admin/venda', pronto.corpo)
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

module.exports = { paraOPainel, registrar, FORMA_PEDIDO, FORMA_CAIXA }
