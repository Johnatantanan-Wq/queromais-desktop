// loja-local.js — o que mudou na loja DENTRO do app, em demonstração.
function criarRegistro() {
  const estado = {}            // aceite, aberta, pausadoAte, tempos
  const entregadores = []
  const rotasFechadas = new Set()
  const clientes = []
  let seqCodigo = 0
  function aplicar(chave, dados) {
    if (!dados) return dados
    if (chave === 'pedidos') {
      const d = { ...dados }
      if ('aberta' in estado) d.lojaAberta = estado.aberta
      if ('aceite' in estado) d.aceiteAutomatico = estado.aceite
      if ('pausadoAte' in estado) d.pausadoAte = estado.pausadoAte
      if (estado.tempos) d.tempos = { ...(dados.tempos || {}), ...estado.tempos }
      return d
    }
    if (chave === 'despacho') {
      return { ...dados,
        emTransito: (dados.emTransito || []).filter((t) => !rotasFechadas.has(t.rotaId || t.entregador)),
        entregadores: (dados.entregadores || []).concat(entregadores.map((e) => ({ id: e.id, nome: e.nome }))) }
    }
    if (chave === 'entregadores') return { ...dados, itens: entregadores.map((e) => ({ ...e })).concat(dados.itens || []) }
    if (chave === 'clientes') return { ...dados, itens: clientes.map((c) => ({ ...c })).concat(dados.itens || []) }
    return dados
  }
  return {
    aceite: (v) => { estado.aceite = v }, aberta: (v) => { estado.aberta = v },
    pausar: (ate) => { estado.pausadoAte = ate }, tempos: (t) => { estado.tempos = { ...(estado.tempos || {}), ...t } },
    entregador: (c) => entregadores.unshift({ id: 'app-m' + (entregadores.length + 1), nome: c.nome, telefone: c.telefone, entregasHoje: 0, ativo: true }),
    fecharRota: (id) => rotasFechadas.add(id),
    cliente: (c) => clientes.unshift({ nome: c.nome, telefone: c.telefone, bairro: '', pedidos: 0, gasto: 0, ultimo: null }),
    codigoKds: () => String(1000 + ((++seqCodigo * 7919) % 9000)),
    aplicar,
  }
}
module.exports = { criarRegistro }
