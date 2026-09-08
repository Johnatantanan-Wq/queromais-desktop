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
