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
  // Financeiro pelo app: editar, cancelar e lançar (avulso no extrato).
  const editadas = new Map()   // id → campos do PATCH
  const canceladas = new Set()
  const lancamentos = []
  function editar(id, corpo) { editadas.set(id, { ...(editadas.get(id) || {}), ...(corpo || {}) }) }
  function cancelar(id) { canceladas.add(id) }
  function lancar(corpo) {
    const c = corpo || {}
    lancamentos.unshift({
      id: 'app-lanc-' + (++seq), data: c.data, hora: new Date().toTimeString().slice(0, 5),
      descricao: c.descricao, categoria: c.categoria, origem: 'Lançamento manual', origemTipo: 'manual',
      forma: c.forma_pagamento || null, usuario: 'App', direcao: c.tipo === 'receita' ? 'entrada' : 'saida', valor: c.valor,
    })
  }
  function aplicar(dados) {
    if (!dados || (!baixas.size && !novas.length && !editadas.size && !canceladas.size && !lancamentos.length)) return dados
    const contas = (dados.contas || []).concat(novas).map((c) => {
      let x = c
      if (editadas.has(c.id)) x = { ...x, ...editadas.get(c.id) }
      if (canceladas.has(c.id)) x = { ...x, situacao: 'cancelada' }
      const b = baixas.get(c.id)
      if (!b) return x
      const valorPago = Math.round(((Number(c.valorPago) || 0) + b.pago) * 100) / 100
      const quitada = valorPago >= (Number(c.valor) || 0) - 0.001
      return { ...x, valorPago, forma: b.forma || x.forma, liquidadoEm: quitada ? b.quando : x.liquidadoEm,
        situacao: quitada ? (x.direcao === 'receber' ? 'recebida' : 'paga') : 'parcial' }
    })
    if (!lancamentos.length) return { ...dados, contas }
    // O lançamento entra no extrato (saldo corrido) e, se foi em dinheiro, no livro caixa.
    let saldo = (dados.extrato || []).length ? Number(dados.extrato[0].saldo) || 0 : 0
    const novosExtrato = lancamentos.slice().reverse().map((l) => {
      saldo = Math.round((saldo + (l.direcao === 'entrada' ? l.valor : -l.valor)) * 100) / 100
      return { ...l, saldo }
    }).reverse()
    return { ...dados, contas,
      extrato: novosExtrato.concat(dados.extrato || []),
      livroCaixa: novosExtrato.filter((l) => l.forma === 'dinheiro').concat(dados.livroCaixa || []) }
  }
  return { baixar, criar, editar, cancelar, lancar, aplicar }
}
module.exports = { criarRegistro }
