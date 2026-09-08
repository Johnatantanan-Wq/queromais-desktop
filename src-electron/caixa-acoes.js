// caixa-acoes.js — o que o app manda quando alguém mexe no caixa.
//
// Regra pura, sem Electron e sem rede, no mesmo espírito de pedido-acoes.js: aqui só
// se decide PARA ONDE e O QUE mandar. Quem lança a movimentação, vira despesa quando o
// motivo pede, grava a auditoria e fecha a conferência continua sendo o painel.
//
// O que é recusado aqui é o que o painel recusaria com 400/422 — vale mais dizer na
// hora, com a frase de gente, do que mandar e traduzir um código de volta.

const MOTIVOS_SANGRIA = ['Pagamento de fornecedor', 'Troco para outro caixa', 'Depósito bancário', 'Retirada do sócio', 'Outro']

/** Aceita "12,50", "12.50", " 12 " — o lojista digita como fala. */
function valorDigitado(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN
  const limpo = ('' + (v == null ? '' : v)).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  return limpo === '' ? NaN : Number(limpo)
}

/** Sangria (tira dinheiro) ou suprimento (põe dinheiro). */
function movimentacao({ tipo, valor, motivo, descricao, caixaAberto }) {
  if (tipo !== 'sangria' && tipo !== 'suprimento') {
    return { ok: false, motivo: 'Movimentação desconhecida.' }
  }
  // O painel devolve 422 "Abra o caixa primeiro" — a tela já sabe disso antes.
  if (caixaAberto === false) {
    return { ok: false, motivo: 'O caixa está fechado. Abra o caixa antes de lançar ' + tipo + '.' }
  }
  const n = valorDigitado(valor)
  if (!isFinite(n) || n <= 0) return { ok: false, motivo: 'Informe um valor maior que zero.' }

  return {
    ok: true,
    caminho: '/api/admin/caixa/movimentacao',
    corpo: { tipo, valor: n, motivo: motivo || null, descricao: descricao || null },
    resumo: (tipo === 'sangria' ? 'Sangria' : 'Suprimento') + ' de ' + brl(n) + ' lançada no caixa.',
  }
}

/** Fechamento: os três contados são obrigatórios — é o que o painel exige. */
function fechamento({ dinheiro, pix, cartao, observacao, caixaAberto }) {
  if (caixaAberto === false) return { ok: false, motivo: 'Não há caixa aberto para fechar.' }
  const d = valorDigitado(dinheiro), p = valorDigitado(pix), c = valorDigitado(cartao)
  if (![d, p, c].every((x) => isFinite(x) && x >= 0)) {
    return { ok: false, motivo: 'Informe os valores contados de dinheiro, Pix e cartão antes de fechar.' }
  }
  return {
    ok: true,
    caminho: '/api/admin/caixa/fechar',
    corpo: { dinheiro_contado: d, pix_contado: p, cartao_contado: c, observacao: observacao || null },
    resumo: 'Caixa fechado com ' + brl(d + p + c) + ' conferidos.',
  }
}

function abertura({ fundo, observacao, caixaAberto }) {
  if (caixaAberto === true) return { ok: false, motivo: 'Já existe um caixa aberto.' }
  const f = valorDigitado(fundo == null || fundo === '' ? 0 : fundo)
  if (!isFinite(f) || f < 0) return { ok: false, motivo: 'Informe um fundo de troco válido (pode ser zero).' }
  return {
    ok: true,
    caminho: '/api/admin/caixa/abrir',
    corpo: { fundo_inicial: f, observacao: observacao || null },
    resumo: 'Caixa aberto com ' + brl(f) + ' de fundo.',
  }
}

function brl(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

module.exports = { movimentacao, fechamento, abertura, valorDigitado, MOTIVOS_SANGRIA }

// ── Delivery e Mesas do Caixa ────────────────────────────────────────────────
//
// Três coisas que o caixa faz com uma entrega: CONCLUIR (o pedido chegou — marca
// entregue e lança a venda com a forma confirmada), CONFIRMAR RECEBIMENTO (o motoboy
// voltou com o dinheiro de um pedido já entregue) e RETIRADA ENTREGUE (o cliente
// buscou no balcão). E uma com a mesa: FECHAR A CONTA.
//
// Quem grava é o painel: /pedidos/<id>/status já lança a venda no caixa, baixa
// estoque e oferece a nota; /sessoes/<id>/fechar rateia gorjeta e fecha a mesa.

const FORMAS_CAIXA = ['dinheiro', 'pix', 'cartao', 'credito', 'debito']
/** O pedido guarda 3 formas; no caixa, "cartão na entrega" vira "cartao". */
function formaDoCaixa(f) {
  const v = ('' + (f || '')).trim().toLowerCase()
  if (v === 'cartao_entrega' || v === 'cartão') return 'cartao'
  return FORMAS_CAIXA.indexOf(v) >= 0 ? v : ''
}

function concluirEntrega(entrega, { forma, valor } = {}) {
  const e = entrega || {}
  if (!e.id) return { ok: false, motivo: 'Este pedido veio sem identificação — recarregue a tela.' }
  const f = formaDoCaixa(forma || e.forma)
  if (!f) return { ok: false, motivo: 'Escolha como o cliente pagou.' }
  const corpo = { status: 'entregue', forma_caixa: f }
  if (valor != null && valor !== '') {
    const v = valorDigitado(valor)
    if (!isFinite(v) || v <= 0) return { ok: false, motivo: 'Valor recebido precisa ser maior que zero.' }
    corpo.valor_recebido = v
  }
  const retirada = e.tipo === 'retirada'
  return {
    ok: true, caminho: '/api/admin/pedidos/' + e.id + '/status', corpo,
    resumo: 'Pedido #' + (e.pedido || '') + (retirada ? ' entregue no balcão' : ' entregue') + ' — ' + brl(e.valor) + ' em ' + NOME_FORMA_CAIXA[f] + '.',
  }
}

function confirmarRecebimento(entrega, { forma } = {}) {
  const e = entrega || {}
  if (!e.id) return { ok: false, motivo: 'Este pedido veio sem identificação — recarregue a tela.' }
  const f = formaDoCaixa(forma || e.forma)
  if (!f) return { ok: false, motivo: 'Diga como o motoboy recebeu.' }
  return {
    ok: true, caminho: '/api/admin/pedidos/' + e.id + '/recebimento', corpo: { forma_caixa: f },
    resumo: 'Recebimento do #' + (e.pedido || '') + ' confirmado — ' + brl(e.valor) + ' em ' + NOME_FORMA_CAIXA[f] + ' entrou no caixa.',
  }
}

/**
 * Fechar a conta da mesa. O painel exige que os pagamentos somem o total — aqui
 * uma forma só; dividir é pelo painel, e o popup diz isso.
 */
function fecharMesa(mesa, { forma, valor, gorjeta } = {}) {
  const m = mesa || {}
  if (!m.sessaoId) return { ok: false, motivo: 'Esta mesa veio sem a sessão — recarregue a tela.' }
  const total = Number(m.consumo) || 0
  if (!(total > 0)) return { ok: false, motivo: 'Esta mesa não tem consumo para fechar.' }
  const f = formaDoCaixa(forma)
  if (!f) return { ok: false, motivo: 'Escolha como a mesa pagou.' }
  const g = gorjeta == null || gorjeta === '' ? 0 : valorDigitado(gorjeta)
  if (!isFinite(g) || g < 0) return { ok: false, motivo: 'Gorjeta inválida.' }
  const v = valorDigitado(valor == null || valor === '' ? total + g : valor)
  if (!isFinite(v) || v <= 0) return { ok: false, motivo: 'Informe o valor pago.' }
  const esperado = Math.round((total + g) * 100) / 100
  if (Math.abs(v - esperado) > 0.009) {
    return { ok: false, motivo: 'O pagamento (' + brl(v) + ') tem de fechar com a conta (' + brl(esperado) + '). Para dividir, use o painel.' }
  }
  return {
    ok: true, caminho: '/api/admin/atendimento/sessoes/' + m.sessaoId + '/fechar',
    corpo: { gorjeta_valor: g, pagamentos: [{ forma: f, valor: v }] },
    resumo: 'Mesa ' + (m.mesa || '') + ' fechada — ' + brl(v) + ' em ' + NOME_FORMA_CAIXA[f] + (g ? ' (com ' + brl(g) + ' de gorjeta)' : '') + '.',
  }
}

const NOME_FORMA_CAIXA = { dinheiro: 'dinheiro', pix: 'Pix', cartao: 'cartão', credito: 'crédito', debito: 'débito' }

module.exports.concluirEntrega = concluirEntrega
module.exports.confirmarRecebimento = confirmarRecebimento
module.exports.fecharMesa = fecharMesa
module.exports.formaDoCaixa = formaDoCaixa
module.exports.FORMAS_CAIXA = FORMAS_CAIXA
