// cardapio-local.js — o que foi mexido no cardápio DENTRO do app, em demonstração.
// Guarda por id do produto: esgotado e preço. Aplica por cima do que a demonstração devolve.
function criarRegistro() {
  const mudancas = new Map()   // id → { esgotado?, preco? }
  const mudar = (id, campos) => mudancas.set(id, { ...(mudancas.get(id) || {}), ...campos })
  function aplicar(dados) {
    if (!dados || !mudancas.size) return dados
    const categorias = (dados.categorias || []).map((c) => ({
      ...c,
      itens: (c.itens || []).map((i) => (mudancas.has(i.id) ? { ...i, ...mudancas.get(i.id) } : i)),
    }))
    const todos = categorias.flatMap((c) => c.itens || [])
    return {
      ...dados, categorias,
      esgotados: todos.filter((i) => i.esgotado).length,
      disponiveis: todos.filter((i) => !i.esgotado).length,
    }
  }
  return { mudar, aplicar, tamanho: () => mudancas.size }
}
module.exports = { criarRegistro }
