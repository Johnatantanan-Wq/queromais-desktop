// despacho-local.js — os despachos feitos DENTRO do app, em demonstração.
// O pedido sai de "prontos" e o entregador ganha (ou soma) uma linha em "em trânsito".
function criarRegistro() {
  const despachados = new Map()   // id do pedido → nome do entregador

  function despachar(chamadas, prontos) {
    for (const c of chamadas) for (const i of c.corpo.itens) despachados.set(i.pedido_id, c.entregador)
    void prontos
  }

  function aplicar(dados) {
    if (!dados || !despachados.size) return dados
    const prontos = (dados.prontos || []).filter((p) => !despachados.has(p.id))
    const saiu = (dados.prontos || []).filter((p) => despachados.has(p.id))
    const emTransito = (dados.emTransito || []).map((t) => ({ ...t }))
    for (const p of saiu) {
      const nome = despachados.get(p.id)
      let linha = emTransito.find((t) => t.entregador === nome)
      if (!linha) { linha = { entregador: nome, entregas: 0, dinheiroAReceber: 0, esperadoDeVolta: 0 }; emTransito.push(linha) }
      linha.entregas += 1
      // Só o que NÃO está pago o entregador recebe na porta.
      if (!p.pago) { linha.dinheiroAReceber += Number(p.valor) || 0; linha.esperadoDeVolta += Number(p.valor) || 0 }
    }
    return { ...dados, prontos, emTransito }
  }

  return { despachar, aplicar, tamanho: () => despachados.size }
}

module.exports = { criarRegistro }
