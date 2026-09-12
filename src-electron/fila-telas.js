/**
 * fila-telas.js — a fila SOMADA por cima do dado do servidor/cache (F3.3).
 *
 * Sem internet, o operador vende três pedidos, olha o Caixa e precisa ver o dinheiro
 * que está na gaveta — senão para de confiar no sistema, que é pior do que o sistema
 * parar. Aqui a venda, a sangria e o suprimento pendentes entram nas telas do Caixa e
 * do quadro de pedidos MARCADOS como não sincronizados: nunca se passam por dado que
 * já subiu. Puro: sem Electron, sem rede.
 */

const CANAL = { entrega: 'Delivery', retirada: 'Retirada', consumo_local: 'Consumo local', balcao: 'Retirada' }
const CAMPO_DA_FORMA = { dinheiro: 'vendaDinheiro', pix: 'vendaPix', credito: 'vendaCartao', debito: 'vendaCartao', cartao: 'vendaCartao' }
const cent = (v) => Math.round((Number(v) || 0) * 100) / 100
const mais = (obj, campo, v) => { obj[campo] = cent((Number(obj[campo]) || 0) + v) }

function minutosDesde(iso, agora) {
  const t = Date.parse(iso)
  if (!isFinite(t)) return 0
  return Math.max(0, Math.round(((agora || Date.now()) - t) / 60000))
}

/** Caixa: vendas e movimentações pendentes somam no resumo, no esperado e na lista. */
function aplicarNoCaixa(dados, fila, agora) {
  if (!dados) return dados
  const estado = fila.estado()
  const pendentes = fila.pendentes()
  const vendas = pendentes.filter((i) => i.tipo === 'venda')
  const movs = pendentes.filter((i) => i.tipo === 'movimentacao')

  const resumo = { ...(dados.resumo || {}) }
  let esperado = Number(dados.esperadoDinheiro) || 0
  const linhas = []
  for (const v of vendas) {
    const r = v.resumo || {}
    const total = cent(r.total)
    const forma = r.forma || 'dinheiro'
    const campo = CAMPO_DA_FORMA[forma]
    if (campo) mais(resumo, campo, total)
    // O Pix da fila foi informado por gente (balcão): é o que se confere no fechamento.
    if (forma === 'pix' && resumo.vendaPixConferir != null) mais(resumo, 'vendaPixConferir', total)
    if (forma === 'dinheiro') esperado += total
    linhas.push({
      id: 'fila-' + v.id, tipo: 'venda', forma, valor: total,
      descricao: 'Venda ' + v.provisorio + ' — ' + (r.cliente || 'Consumidor') + ' · não sincronizada',
      criadoEm: v.criadoEm, estornada: false, naoSincronizada: true, provisorio: v.provisorio,
    })
  }
  for (const m of movs) {
    const c = m.corpo || {}
    const valor = cent(c.valor)
    const tipo = c.tipo === 'suprimento' ? 'suprimento' : 'sangria'
    if (tipo === 'sangria') { mais(resumo, 'sangrias', valor); esperado -= valor } else { mais(resumo, 'suprimentos', valor); esperado += valor }
    linhas.push({
      id: 'fila-' + m.id, tipo, forma: 'dinheiro', valor,
      descricao: (c.motivo || (tipo === 'sangria' ? 'Sangria pelo app' : 'Suprimento pelo app')) + ' · não sincronizada',
      criadoEm: m.criadoEm, estornada: false, naoSincronizada: true,
    })
  }
  void agora
  return {
    ...dados,
    resumo,
    esperadoDinheiro: cent(esperado),
    movimentacoes: linhas.concat(dados.movimentacoes || []),
    fila: estado,
    fechamentoProvisorio: estado.fechamentoProvisorio,
    conferencia: fila.conferencia(),
  }
}

/** Quadro de pedidos: a venda pendente vira cartão em produção, com o número provisório. */
function aplicarNoQuadro(dados, fila, agora) {
  if (!dados) return dados
  const vendas = fila.pendentes().filter((i) => i.tipo === 'venda')
  if (!vendas.length) return dados
  const cartoes = vendas.map((v) => {
    const r = v.resumo || {}
    return {
      pedido: v.provisorio, numero: v.provisorio, cliente: r.cliente || 'Consumidor',
      canal: CANAL[r.tipo] || 'Retirada', etapa: 'producao', valor: cent(r.total), forma: r.forma || 'dinheiro',
      esperaMin: minutosDesde(v.criadoEm, agora),
      itens: r.itens || [], bairro: r.bairro || '', telefone: r.telefone || '', obs: r.observacao || '',
      manual: true, naoSincronizada: true,
    }
  })
  return { ...dados, itens: cartoes.concat(dados.itens || []) }
}

module.exports = { aplicarNoCaixa, aplicarNoQuadro, CANAL }
