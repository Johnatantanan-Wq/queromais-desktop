// compras-acoes.js — a lista de reposição e os itens avulsos, em regra pura.
//
// Cinco coisas que se faz nessa tela: anotar um item avulso, marcar comprado, voltar
// para a lista, excluir, e "Recebi" — que é o mais importante, porque dá ENTRADA no
// estoque (POST /api/admin/compras/receber) e mexe no custo médio do ingrediente.
// Quem grava é o painel; aqui se monta o que mandar e se recusa o que ele recusaria.

const { valorDigitado } = require('./caixa-acoes')

function anotar({ nome, qtd, unidade }) {
  const n = ('' + (nome || '')).trim()
  if (!n) return { ok: false, motivo: 'Diga o que é o item.' }
  if (n.length > 80) return { ok: false, motivo: 'Nome muito longo (até 80 letras).' }
  const q = valorDigitado(qtd == null || qtd === '' ? 1 : qtd)
  if (!isFinite(q) || q <= 0) return { ok: false, motivo: 'Quantidade precisa ser maior que zero.' }
  return {
    ok: true, caminho: '/api/admin/compras', metodo: 'POST',
    corpo: { nome: n, quantidade: q, unidade: ('' + (unidade || 'un')).trim().slice(0, 12) || 'un' },
    resumo: n + ' anotado na lista.',
  }
}

function comprado(item) {
  const i = item || {}
  if (!i.id) return { ok: false, motivo: 'Este item veio sem identificação — recarregue a tela.' }
  return { ok: true, caminho: '/api/admin/compras/' + i.id, metodo: 'PATCH', corpo: { status: 'comprado' },
    resumo: (i.nome || 'Item') + ' marcado como comprado.' }
}

function voltar(item) {
  const i = item || {}
  if (!i.id) return { ok: false, motivo: 'Este item veio sem identificação — recarregue a tela.' }
  return { ok: true, caminho: '/api/admin/compras/' + i.id, metodo: 'PATCH', corpo: { status: 'pendente' },
    resumo: (i.nome || 'Item') + ' voltou para a lista.' }
}

function excluir(item) {
  const i = item || {}
  if (!i.id) return { ok: false, motivo: 'Este item veio sem identificação — recarregue a tela.' }
  return { ok: true, caminho: '/api/admin/compras/' + i.id, metodo: 'DELETE', corpo: {},
    resumo: (i.nome || 'Item') + ' excluído da lista.' }
}

/** Quanto comprar: o painel repõe até 2× o mínimo. */
function sugestaoDe(i) {
  return Math.max(0, (Number(i.minimo) || 0) * 2 - (Number(i.saldo) || 0))
}

/**
 * Recebi: dá entrada no estoque. A quantidade é obrigatória; o custo é opcional e,
 * quando vem, atualiza o custo médio — por isso é conferido, não só aceito.
 */
function recebi(item, { qtd, custo } = {}) {
  const i = item || {}
  if (!i.id) return { ok: false, motivo: 'Este ingrediente veio sem identificação — recarregue a tela.' }
  const q = valorDigitado(qtd == null || qtd === '' ? sugestaoDe(i) : qtd)
  if (!isFinite(q) || q <= 0) return { ok: false, motivo: 'Quantidade recebida precisa ser maior que zero.' }
  const corpo = { ingrediente_id: i.id, qtd: q }
  if (custo != null && custo !== '') {
    const c = valorDigitado(custo)
    if (!isFinite(c) || c < 0) return { ok: false, motivo: 'Custo unitário inválido.' }
    corpo.custo_unitario = c
  }
  return {
    ok: true, caminho: '/api/admin/compras/receber', metodo: 'POST', corpo,
    resumo: 'Entrou ' + q + ' ' + (i.unidade || 'un') + ' de ' + (i.nome || 'ingrediente') + ' no estoque.',
  }
}

module.exports = { anotar, comprado, voltar, excluir, recebi, sugestaoDe }
