// pedidos-locais.js — as etapas que o lojista mudou DENTRO do app.
//
// Em demonstração não há servidor: sem isto, clicar em "Aceitar" não teria para onde
// escrever e o cartão voltaria para a mesma coluna na próxima leitura. Guarda só o
// que mudou (número → etapa), e aplica por cima do que veio do painel/demonstração.
// Mesma ideia de vendas-locais.js: registro em memória, ninguém finge que persiste.
const { ETAPA_DEPOIS } = require('./pedido-acoes')

const ROTULO = {
  analise: 'Novo', producao: 'Em produção', pronto: 'Pronto',
  transito: 'Em trânsito', entregue: 'Entregue',
}

function criarRegistro() {
  const etapas = new Map()

  /** Avança um pedido uma etapa. Devolve a nova etapa, ou null se já acabou. */
  function avancar(numero, etapaAtual) {
    const destino = ETAPA_DEPOIS[etapaAtual]
    if (!destino) return null
    etapas.set(String(numero), destino)
    return destino
  }

  /** Aplica as mudanças locais sobre a lista que veio de fora. */
  function aplicar(dados) {
    if (!dados || !etapas.size) return dados
    const itens = (dados.itens || []).map((p) => {
      const nova = etapas.get(String(p.numero))
      if (!nova || nova === p.etapa) return p
      return { ...p, etapa: nova, status: ROTULO[nova] || p.status, filtro: nova === 'analise' ? 'novo' : nova }
    })
    return { ...dados, itens }
  }

  return { avancar, aplicar, tamanho: () => etapas.size }
}

module.exports = { criarRegistro, ROTULO }
