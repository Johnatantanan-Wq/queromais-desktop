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
  const fornecedor = (corpo) => fornecedores.push({ id: 'forn-app-' + (++seq), nome: corpo.nome, telefone: corpo.telefone || '', cnpj: corpo.cnpj_cpf || '', compras: 0 })

  // Gestão pelo app (demonstração): o que foi feito aparece na tela.
  const itensEditados = new Map()     // id → campos do PATCH
  const saldos = new Map()            // id → delta ou { fixar }
  const fornEditados = new Map()
  const fornExcluidos = new Set()
  const pendResolvidas = new Set()
  const fichas = new Map()            // produtoId → linhas [{ingrediente_id, qtd_consumida}]
  function editarInsumo(id, corpo) { itensEditados.set(id, { ...(itensEditados.get(id) || {}), ...(corpo || {}) }) }
  function ajuste(id, corpo) {
    const c = corpo || {}
    const atual = saldos.get(id) || { delta: 0, fixar: null }
    if (c.acao === 'ajuste') saldos.set(id, { delta: 0, fixar: Number(c.qtd) || 0 })
    else if (c.acao === 'entrada' || c.acao === 'producao') saldos.set(id, { ...atual, delta: atual.delta + (Number(c.qtd) || 0) })
    else saldos.set(id, { ...atual, delta: atual.delta - (Number(c.qtd) || 0) })
  }
  function entradaSemNota(corpo) { for (const it of ((corpo || {}).itens || [])) ajuste(it.ingrediente_id, { acao: 'entrada', qtd: it.qtd }) }
  function editarFornecedor(id, corpo) { fornEditados.set(id, { ...(fornEditados.get(id) || {}), ...(corpo || {}) }) }
  function excluirFornecedor(id) { fornExcluidos.add(id) }
  function resolverPendencia(id) { pendResolvidas.add(id) }
  function fichaTecnica(produtoId, corpo) { fichas.set(produtoId, ((corpo || {}).linhas || []).slice()) }

  const mudouGestao = () => itensEditados.size || saldos.size || fornEditados.size || fornExcluidos.size || pendResolvidas.size || fichas.size

  function aplicar(dados) {
    if (!dados || (!insumos.length && !categorias.length && !fornecedores.length && !mudouGestao())) return dados
    const cats = (dados.categorias || []).map((c) => ({ ...c, subcategorias: (c.subcategorias || []).map((s) => ({ ...s, itens: (s.itens || []).map((i) => {
      let x = i
      const e = itensEditados.get(i.id)
      if (e) x = { ...x, nome: e.nome || x.nome, unidade: e.unidade || x.unidade, minimo: e.qtd_minima != null ? e.qtd_minima : x.minimo,
        custo: e.custo_unitario != null ? e.custo_unitario : x.custo, ativo: typeof e.ativo === 'boolean' ? e.ativo : x.ativo,
        tipo: e.tipo || x.tipo, grupo: e.grupo_estoque || x.grupo, permiteNegativo: typeof e.permite_estoque_negativo === 'boolean' ? e.permite_estoque_negativo : x.permiteNegativo }
      const s2 = saldos.get(i.id)
      if (s2) x = { ...x, saldo: Math.max(0, Math.round(((s2.fixar != null ? s2.fixar : (Number(x.saldo) || 0)) + s2.delta) * 1000) / 1000) }
      return x
    }) })) }))
    for (const { grupo, item } of insumos) {
      const cat = cats.find((c) => c.id === grupo) || cats[0]
      if (cat && cat.subcategorias[0]) cat.subcategorias[0].itens.unshift(item)
    }
    const forns = fornecedores.concat(dados.fornecedores || []).filter((f) => !fornExcluidos.has(f.id)).map((f) => {
      const e = fornEditados.get(f.id)
      return e ? { ...f, nome: e.nome || f.nome, telefone: e.telefone !== undefined ? (e.telefone || '—') : f.telefone,
        cnpj: e.cnpj_cpf !== undefined ? (e.cnpj_cpf || '—') : f.cnpj, email: e.email !== undefined ? e.email : f.email,
        endereco: e.endereco !== undefined ? (e.endereco || '') : f.endereco, observacoes: e.observacoes !== undefined ? (e.observacoes || '') : f.observacoes,
        tipo: e.tipo || f.tipo, ativo: typeof e.ativo === 'boolean' ? e.ativo : f.ativo } : f
    })
    const nfEntrada = dados.nfEntrada ? { ...dados.nfEntrada, pendencias: (dados.nfEntrada.pendencias || []).map((p) => (pendResolvidas.has(p.id) ? { ...p, resolvida: true } : p)) } : dados.nfEntrada
    const insumoPorId = new Map((dados.insumos || []).map((i) => [i.id, i]))
    const qtdTxt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
    const fichasTela = dados.fichas && Array.isArray(dados.fichas.itens)
      ? { ...dados.fichas, itens: dados.fichas.itens.map((f) => {
        if (!fichas.has(f.produtoId)) return f
        const linhas = fichas.get(f.produtoId)
        const ins = linhas.map((l) => { const i = insumoPorId.get(l.ingrediente_id) || {}; return { id: l.ingrediente_id, nome: i.nome || 'Insumo', qtdNum: l.qtd_consumida, unidade: i.unidade || 'un', qtd: qtdTxt(l.qtd_consumida) + ' ' + (i.unidade || 'un') } })
        const custo = Math.round(linhas.reduce((s, l) => s + l.qtd_consumida * (Number((insumoPorId.get(l.ingrediente_id) || {}).custo) || 0), 0) * 100) / 100
        return { ...f, insumos: ins, custo }
      }) }
      : dados.fichas
    return { ...dados, categorias: cats, fornecedores: forns, nfEntrada, fichas: fichasTela, categoriasNovas: categorias.slice() }
  }
  return { insumo, categoria, fornecedor, aplicar, editarInsumo, ajuste, entradaSemNota, editarFornecedor, excluirFornecedor, resolverPendencia, fichaTecnica }
}
module.exports = { criarRegistro }
