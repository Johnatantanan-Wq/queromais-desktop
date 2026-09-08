// caixa-local.js — as movimentações lançadas DENTRO do app, em demonstração.
//
// Sem servidor, "Sangria" não teria para onde escrever e o caixa não mexeria. Guarda o
// que foi lançado nesta sessão e soma por cima do que veio da demonstração — mesma
// ideia de vendas-locais.js e pedidos-locais.js. Os campos são os da tela do Caixa:
// `resumo.sangrias` / `resumo.suprimentos`, `esperadoDinheiro` e `movimentacoes`.
function criarRegistro() {
  const movimentos = []
  const entregasFechadas = new Set()   // ids de pedidos concluídos/confirmados aqui
  const mesasFechadas = new Set()      // sessões fechadas aqui

  /** Entrega concluída ou recebimento confirmado: sai da aba e vira venda no turno. */
  function fecharEntrega(entrega, forma, valor) {
    entregasFechadas.add(entrega.id)
    movimentos.unshift({ id: 'app-v' + entrega.id, tipo: 'venda', forma, valor: Number(valor) || Number(entrega.valor) || 0,
      descricao: 'Pedido #' + entrega.pedido + ' — ' + (entrega.cliente || ''), criadoEm: new Date().toISOString(), estornada: false })
  }
  function fecharMesa(mesa, forma, valor) {
    mesasFechadas.add(mesa.sessaoId)
    movimentos.unshift({ id: 'app-m' + mesa.sessaoId, tipo: 'venda', forma, valor: Number(valor) || 0,
      descricao: 'Mesa ' + mesa.mesa + (mesa.cliente ? ' — ' + mesa.cliente : ''), criadoEm: new Date().toISOString(), estornada: false })
  }

  function lancar({ tipo, valor, motivo }) {
    const m = {
      id: 'app-' + (movimentos.length + 1),
      tipo,
      forma: 'dinheiro',
      valor: Number(valor) || 0,
      descricao: motivo || (tipo === 'sangria' ? 'Sangria pelo app' : 'Suprimento pelo app'),
      criadoEm: new Date().toISOString(),
      estornada: false,
    }
    movimentos.unshift(m)
    return m
  }

  /** Soma o que foi lançado aqui ao resumo do caixa que veio de fora. */
  function aplicar(caixa) {
    if (!caixa || (!movimentos.length && !entregasFechadas.size && !mesasFechadas.size)) return caixa
    const soma = (t) => movimentos.filter((m) => m.tipo === t).reduce((s, m) => s + m.valor, 0)
    const sangrias = soma('sangria')
    const suprimentos = soma('suprimento')
    const resumo = caixa.resumo || {}
    return {
      ...caixa,
      resumo: {
        ...resumo,
        sangrias: (Number(resumo.sangrias) || 0) + sangrias,
        suprimentos: (Number(resumo.suprimentos) || 0) + suprimentos,
      },
      // Sangria tira dinheiro da gaveta; suprimento põe.
      esperadoDinheiro: (Number(caixa.esperadoDinheiro) || 0) - sangrias + suprimentos + vendasEmDinheiro(),
      movimentacoes: movimentos.concat(caixa.movimentacoes || []),
      entregas: (caixa.entregas || []).filter((e) => !entregasFechadas.has(e.id)),
      mesas: (caixa.mesas || []).filter((m) => !mesasFechadas.has(m.sessaoId)),
    }
  }

  function vendasEmDinheiro() {
    return movimentos.filter((m) => m.tipo === 'venda' && m.forma === 'dinheiro').reduce((t, m) => t + m.valor, 0)
  }

  return { lancar, fecharEntrega, fecharMesa, aplicar, listar: () => movimentos.slice() }
}

module.exports = { criarRegistro }
