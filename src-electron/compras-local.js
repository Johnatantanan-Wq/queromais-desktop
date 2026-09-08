// compras-local.js — o que foi feito em Compras DENTRO do app, em demonstração.
function criarRegistro() {
  const novos = []                 // avulsos anotados aqui
  const status = new Map()         // id → 'comprado' | 'pendente' | 'excluido'
  const recebido = new Map()       // id do ingrediente → qtd que entrou
  let seq = 0

  function anotar(corpo) {
    const item = { id: 'app-c' + (++seq), nome: corpo.nome, qtd: corpo.quantidade, unidade: corpo.unidade }
    novos.push(item); return item
  }
  const marcar = (id, s) => status.set(id, s)
  const receber = (id, qtd) => recebido.set(id, (recebido.get(id) || 0) + qtd)

  function aplicar(dados) {
    if (!dados || (!novos.length && !status.size && !recebido.size)) return dados
    const todos = (dados.avulsos || []).concat(dados.comprados || [], novos)
    const estadoDe = (i) => status.get(i.id) || ((dados.comprados || []).some((c) => c.id === i.id) ? 'comprado' : 'pendente')
    const vivos = todos.filter((i) => estadoDe(i) !== 'excluido')
    const repor = (dados.repor || []).map((i) => (recebido.has(i.id) ? { ...i, saldo: (Number(i.saldo) || 0) + recebido.get(i.id) } : i))
      // Chegou ao mínimo: sai da lista, como no painel.
      .filter((i) => (Number(i.saldo) || 0) < (Number(i.minimo) || 0) || !recebido.has(i.id))
    return {
      ...dados, repor,
      avulsos: vivos.filter((i) => estadoDe(i) === 'pendente'),
      comprados: vivos.filter((i) => estadoDe(i) === 'comprado'),
    }
  }
  return { anotar, marcar, receber, aplicar }
}
module.exports = { criarRegistro }
