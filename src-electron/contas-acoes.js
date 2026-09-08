// contas-acoes.js — contas a pagar e a receber, em regra pura.
//
// Duas coisas: dar BAIXA numa conta (pagar/receber, inteira ou parcial) e lançar uma
// conta nova. Quem grava é o painel: POST /api/admin/contas/<id>/baixas registra cada
// baixa sem nunca alterar o valor original da obrigação, e POST /api/admin/contas
// cria a conta com quem lançou. O que se recusa aqui é o que o painel recusaria —
// com a mesma frase, para o lojista não precisar de duas explicações.

const { valorDigitado } = require('./caixa-acoes')

const FORMAS = ['dinheiro', 'pix', 'debito', 'credito', 'boleto', 'cheque', 'transferencia', 'debito_automatico']
const NOME_FORMA = {
  dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito', boleto: 'Boleto',
  cheque: 'Cheque', transferencia: 'Transferência', debito_automatico: 'Débito automático',
}

const arred = (v) => Math.round(v * 100) / 100
function hojeISO() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
/** "10/09/2026" → "2026-09-10"; "2026-09-10" fica. Outra coisa → ''. */
function dataISO(v) {
  const t = ('' + (v || '')).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? m[3] + '-' + m[2] + '-' + m[1] : ''
}
function saldoDe(c) {
  return arred(Math.max(0, (Number(c.valor) || 0) - (Number(c.valorPago) || 0)))
}

/** Baixa: pagamento (ou recebimento) de uma conta. `hoje` é parâmetro para o teste. */
function baixa(conta, { valor, data, forma, observacao } = {}, hoje) {
  const c = conta || {}
  hoje = hoje || hojeISO()
  if (!c.id) return { ok: false, motivo: 'Esta conta veio sem identificação — recarregue a tela.' }
  if (c.situacao === 'paga' || c.situacao === 'recebida') return { ok: false, motivo: 'Esta conta já está quitada.' }
  if (c.situacao === 'cancelada') return { ok: false, motivo: 'Conta cancelada não pode receber baixa.' }

  const saldo = saldoDe(c)
  const v = arred(valorDigitado(valor == null || valor === '' ? saldo : valor))
  if (!isFinite(v) || v <= 0) return { ok: false, motivo: 'Informe um valor maior que zero.' }
  if (v > saldo + 0.001) {
    return { ok: false, motivo: 'Valor acima do saldo devedor (' + saldo.toFixed(2).replace('.', ',') + ').' }
  }
  const d = data ? dataISO(data) : hoje
  if (!d) return { ok: false, motivo: 'Informe a data no formato dd/mm/aaaa.' }
  if (d > hoje) return { ok: false, motivo: 'A data do pagamento não pode ser futura.' }
  const f = ('' + (forma || '')).trim()
  if (f && FORMAS.indexOf(f) < 0) return { ok: false, motivo: 'Forma de pagamento desconhecida.' }

  const corpo = { valor: v, data: d }
  if (f) corpo.forma_pagamento = f
  const obs = ('' + (observacao || '')).trim()
  if (obs) corpo.observacao = obs.slice(0, 300)
  const quita = v >= saldo - 0.001
  const verbo = c.direcao === 'receber' ? 'Recebid' : 'Pag'
  return {
    ok: true, caminho: '/api/admin/contas/' + c.id + '/baixas', corpo,
    quita,
    resumo: (quita ? verbo + 'a por inteiro' : verbo + 'o ' + brl(v) + ' — restam ' + brl(arred(saldo - v)))
      + (f ? ' em ' + (NOME_FORMA[f] || f) : '') + '.',
  }
}

/** Conta nova, avulsa: uma obrigação, um vencimento. */
function nova({ direcao, descricao, valor, vencimento, forma, categoria, contraparte } = {}) {
  if (direcao !== 'pagar' && direcao !== 'receber') return { ok: false, motivo: 'Diga se é a pagar ou a receber.' }
  const desc = ('' + (descricao || '')).trim()
  if (!desc) return { ok: false, motivo: 'Diga do que é a conta.' }
  const v = arred(valorDigitado(valor))
  if (!isFinite(v) || v <= 0) return { ok: false, motivo: 'Informe um valor maior que zero.' }
  const venc = dataISO(vencimento)
  if (!venc) return { ok: false, motivo: 'Informe o vencimento no formato dd/mm/aaaa.' }
  const f = ('' + (forma || '')).trim()
  if (f && FORMAS.indexOf(f) < 0) return { ok: false, motivo: 'Forma de pagamento desconhecida.' }
  const corpo = { direcao, descricao: desc, valor: v, vencimento: venc }
  if (f) corpo.forma_pagamento = f
  if (categoria && ('' + categoria).trim()) corpo.categoria = ('' + categoria).trim()
  if (contraparte && ('' + contraparte).trim()) corpo.contraparte = ('' + contraparte).trim()
  return {
    ok: true, caminho: '/api/admin/contas', corpo,
    resumo: 'Conta a ' + direcao + ' lançada: ' + desc + ', ' + brl(v) + ' para ' + venc.split('-').reverse().join('/') + '.',
  }
}

function brl(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

module.exports = { baixa, nova, saldoDe, dataISO, hojeISO, FORMAS, NOME_FORMA }
