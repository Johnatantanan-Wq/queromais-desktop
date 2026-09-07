/**
 * vendas-locais.js — as vendas fechadas DENTRO do app.
 *
 * É a primeira escrita do desktop e o ensaio do modo offline: a venda é montada, numerada
 * e guardada aqui, e as telas de Gestão de pedido, Caixa e Financeiro passam a mostrá-la
 * junto das que vieram do servidor. Se o app sabe fechar uma venda sozinho, sabe fechar
 * sem internet — que é o destino deste projeto.
 *
 * O número segue a regra do painel: sequência da loja, começando de onde o último pedido
 * parou. Cada venda guarda a hora do fechamento, porque é isso que o Extrato e o Livro
 * Caixa mostram na linha.
 */

function agora() { return new Date() }

function hora(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
function dia(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const CANAL = { entrega: 'Delivery', retirada: 'Retirada', consumo_local: 'Consumo local' }

/**
 * Guarda em memória. Não persiste em disco de propósito: enquanto a fila offline (F3)
 * não existir, gravar em disco daria a impressão de que a venda vai subir sozinha.
 */
function criarRegistro({ proximoNumero }) {
  const vendas = []
  let ultimo = Number(proximoNumero) || 1

  function registrar(v) {
    if (!v || !Array.isArray(v.itens) || !v.itens.length) {
      return { ok: false, erro: 'A venda precisa de ao menos um item.' }
    }
    const total = Number(v.total) || 0
    if (!(total > 0)) return { ok: false, erro: 'O total da venda ficou zerado.' }
    if (v.tipo === 'entrega' && !(v.cliente || '').trim()) {
      return { ok: false, erro: 'Entrega precisa do nome do cliente.' }
    }
    const d = agora()
    const numero = ultimo++
    const venda = {
      numero,
      criadoEm: d.toISOString(),
      data: dia(d),
      hora: hora(d),
      tipo: v.tipo || 'retirada',
      canal: CANAL[v.tipo] || 'Retirada',
      cliente: (v.cliente || '').trim() || 'Consumidor',
      telefone: v.telefone || '',
      bairro: v.bairro || '',
      endereco: v.endereco || '',
      observacao: v.observacao || '',
      forma: v.forma || 'dinheiro',
      trocoPara: Number(v.trocoPara) || 0,
      itens: v.itens.map((i) => ({ nome: i.nome, qtd: Number(i.qtd) || 1, preco: Number(i.preco) || 0 })),
      produtos: Number(v.produtos) || 0,
      entrega: Number(v.entrega) || 0,
      total,
      origem: 'venda-manual',
    }
    vendas.unshift(venda)
    return { ok: true, numero, venda }
  }

  const listar = () => vendas.slice()
  const total = () => vendas.reduce((s, v) => s + v.total, 0)

  /** Linha do quadro de pedidos: entra em "Em produção", como no painel. */
  function comoPedido(v) {
    return {
      pedido: String(v.numero), numero: String(v.numero), cliente: v.cliente,
      canal: v.canal, etapa: 'producao', valor: v.total, forma: v.forma,
      esperaMin: Math.max(0, Math.round((Date.now() - new Date(v.criadoEm).getTime()) / 60000)),
      itens: v.itens.map((i) => i.qtd + '× ' + i.nome),
      bairro: v.bairro, telefone: v.telefone, obs: v.observacao, manual: true,
    }
  }

  /** Linha do extrato/livro caixa: uma entrada por venda, com a origem rastreável. */
  function comoMovimento(v) {
    return {
      id: 'vm' + v.numero, data: v.data, hora: v.hora,
      descricao: 'Venda manual #' + String(v.numero).padStart(4, '0') + ' — ' + v.cliente,
      categoria: 'venda', origem: 'Pedido #' + String(v.numero).padStart(4, '0'),
      origemTipo: 'pedido', forma: v.forma, usuario: 'Balcão',
      direcao: 'entrada', valor: v.total,
    }
  }

  return { registrar, listar, total, comoPedido, comoMovimento }
}

module.exports = { criarRegistro, CANAL }
