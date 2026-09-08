// estoque-local.js — cadastros feitos na Gestão DENTRO do app, em demonstração.
function criarRegistro() {
  const insumos = []      // { grupo, item }
  const categorias = []
  const fornecedores = []
  let seq = 0
  function insumo(corpo) {
    insumos.push({ grupo: corpo.grupo_estoque, item: {
      codigo: 'APP-' + (++seq), nome: corpo.nome, unidade: corpo.unidade, saldo: corpo.qtd_atual,
      minimo: corpo.qtd_minima, custo: corpo.custo_unitario, cardapio: undefined, situacao: corpo.qtd_atual <= corpo.qtd_minima ? 'baixo' : 'ok',
    } })
  }
  const categoria = (corpo) => categorias.push({ nome: corpo.nome, itens: 0 })
  const fornecedor = (corpo) => fornecedores.push({ nome: corpo.nome, telefone: corpo.telefone || '', cnpj: corpo.cnpj_cpf || '', compras: 0 })
  function aplicar(dados) {
    if (!dados || (!insumos.length && !categorias.length && !fornecedores.length)) return dados
    const cats = (dados.categorias || []).map((c) => ({ ...c, subcategorias: (c.subcategorias || []).map((s) => ({ ...s, itens: (s.itens || []).slice() })) }))
    for (const { grupo, item } of insumos) {
      const cat = cats.find((c) => c.id === grupo) || cats[0]
      if (cat && cat.subcategorias[0]) cat.subcategorias[0].itens.unshift(item)
    }
    return { ...dados, categorias: cats, fornecedores: fornecedores.concat(dados.fornecedores || []),
      categoriasNovas: categorias.slice() }
  }
  return { insumo, categoria, fornecedor, aplicar }
}
module.exports = { criarRegistro }
