// contas-local.js — baixas e contas novas feitas DENTRO do app, em demonstração.
function criarRegistro() {
  const baixas = new Map()   // id → { pago, forma, quando }
  const novas = []
  let seq = 0
  function baixar(id, valor, forma, data) {
    const b = baixas.get(id) || { pago: 0 }
    baixas.set(id, { pago: b.pago + valor, forma: forma || b.forma || null, quando: data })
  }
  function criar(corpo) {
    novas.push({
      id: 'app-conta-' + (++seq), direcao: corpo.direcao, tipo: 'avulsa', vencimento: corpo.vencimento,
      descricao: corpo.descricao, contraparte: corpo.contraparte || null, categoria: corpo.categoria || null,
      valor: corpo.valor, valorPago: 0, forma: corpo.forma_pagamento || null, situacao: 'pendente',
    })
  }
  function aplicar(dados) {
    if (!dados || (!baixas.size && !novas.length)) return dados
    const contas = (dados.contas || []).concat(novas).map((c) => {
      const b = baixas.get(c.id)
      if (!b) return c
      const valorPago = Math.round(((Number(c.valorPago) || 0) + b.pago) * 100) / 100
      const quitada = valorPago >= (Number(c.valor) || 0) - 0.001
      return { ...c, valorPago, forma: b.forma || c.forma, liquidadoEm: quitada ? b.quando : c.liquidadoEm,
        situacao: quitada ? (c.direcao === 'receber' ? 'recebida' : 'paga') : 'parcial' }
    })
    return { ...dados, contas }
  }
  return { baixar, criar, aplicar }
}
module.exports = { criarRegistro }
