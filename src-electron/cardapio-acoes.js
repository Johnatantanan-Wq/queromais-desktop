// cardapio-acoes.js — o que o balcão mexe no cardápio durante o dia.
//
// Três coisas, e são as que acontecem no meio do movimento: acabou um item (esgotar),
// acabou a categoria inteira (esgotar tudo), o preço mudou (editar preço). Regra pura;
// quem grava é o painel, por PATCH — e ele registra no histórico do cardápio quem
// mudou o quê.
//
// Esgotar a CATEGORIA é como o painel faz: um PATCH por produto (esgotado: true,
// ativo: true). A categoria em si não muda — ela continua aparecendo, com tudo
// esgotado, e volta produto a produto quando chega mercadoria.

function esgotarItem(item, esgotar) {
  const i = item || {}
  if (!i.id) return { ok: false, motivo: 'Este produto veio sem identificação — recarregue a tela.' }
  const alvo = esgotar !== false
  return {
    ok: true,
    caminho: '/api/admin/cardapio/produtos/' + i.id,
    corpo: { esgotado: alvo },
    resumo: (i.nome || 'Produto') + (alvo ? ' marcado como esgotado.' : ' voltou a ser vendido.'),
  }
}

function esgotarCategoria(categoria, esgotar) {
  const c = categoria || {}
  const alvo = esgotar !== false
  const itens = (c.itens || []).filter((i) => !!i.esgotado !== alvo)
  if (!itens.length) {
    return { ok: false, motivo: alvo ? 'Tudo nesta categoria já está esgotado.' : 'Nada nesta categoria está esgotado.' }
  }
  const semId = itens.filter((i) => !i.id)
  if (semId.length) return { ok: false, motivo: 'Produto sem identificação — recarregue a tela.' }
  return {
    ok: true,
    chamadas: itens.map((i) => ({
      caminho: '/api/admin/cardapio/produtos/' + i.id,
      corpo: { esgotado: alvo, ativo: true },
    })),
    resumo: itens.length + (itens.length === 1 ? ' produto' : ' produtos') + ' de ' + (c.nome || 'categoria')
      + (alvo ? (itens.length === 1 ? ' esgotado.' : ' esgotados.') : ' de volta à venda.'),
  }
}

/** "59,90", "59.90", "1.259,90" — o lojista digita como fala. */
function precoDigitado(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN
  const limpo = ('' + (v == null ? '' : v)).trim().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  return limpo === '' ? NaN : Number(limpo)
}

function editarPreco(item, novo) {
  const i = item || {}
  if (!i.id) return { ok: false, motivo: 'Este produto veio sem identificação — recarregue a tela.' }
  const n = precoDigitado(novo)
  if (!isFinite(n) || n < 0) return { ok: false, motivo: 'Informe um preço válido.' }
  // Zero é "a partir de" no painel — não é erro, mas não pode entrar por engano.
  if (n === 0) return { ok: false, motivo: 'Preço zero vira "a partir de" no cardápio. Se é isso mesmo, faça pelo painel.' }
  const atual = Number(i.preco) || 0
  if (Math.abs(n - atual) < 0.005) return { ok: false, motivo: 'O preço não mudou.' }
  return {
    ok: true,
    caminho: '/api/admin/cardapio/produtos/' + i.id,
    corpo: { preco: Math.round(n * 100) / 100 },
    resumo: (i.nome || 'Produto') + ': ' + brl(atual) + ' → ' + brl(n) + '.',
  }
}

function brl(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * O MESMO item vendido como OPÇÃO dentro de outro produto (meia pizza, sabor de combo)
 * cobra por outro campo: `sabores.preco_adicional`, não `produtos.preco`. Mexer só no
 * preço do produto deixa o cliente pagando o valor VELHO ao escolher aquele item dentro
 * de outro — foi o que o painel fechou em 08/09/2026, e é o buraco que faltava aqui.
 *
 * Esta função decide o que fazer com a resposta do painel: quantos lugares existem,
 * quantos ainda cobram o preço antigo, e QUAIS levar junto. ⚠️ Só entram os que cobram
 * o preço antigo: opção de R$ 0 (bebida inclusa no combo) tem que ficar em R$ 0.
 */
function opcoesParaAtualizar(consulta, precoAntigo) {
  const r = consulta || {}
  const opcoes = Array.isArray(r.opcoes) ? r.opcoes : []
  if (!opcoes.length) return { lugares: 0, comPrecoAntigo: 0, sabores: [] }
  // O painel já devolve quais acompanham o preço do produto hoje; sem isso, compara-se
  // com o preço antigo, que é a mesma conta.
  const marcados = Array.isArray(r.acompanhamPorPadrao) && r.acompanhamPorPadrao.length
    ? r.acompanhamPorPadrao
    : opcoes.filter((o) => Math.abs((Number(o.preco_adicional) || 0) - (Number(precoAntigo) || 0)) < 0.005)
      .map((o) => o.id)
  const ids = marcados.map((m) => (m && m.id ? m.id : m)).filter(Boolean)
  return { lugares: opcoes.length, comPrecoAntigo: ids.length, sabores: ids }
}

/** O PATCH que leva o preço novo para as opções. `apenasOpcoes` porque o preço do
 *  produto já foi gravado pela rota dele — sem isso o painel gravaria duas vezes. */
function propagarPreco(produtoId, preco, sabores) {
  if (!produtoId || !sabores || !sabores.length) return null
  return {
    caminho: '/api/admin/estoque/preco-venda/' + produtoId,
    corpo: { preco: Math.round((Number(preco) || 0) * 100) / 100, sabores, apenasOpcoes: true },
  }
}

module.exports = { esgotarItem, esgotarCategoria, editarPreco, precoDigitado,
  opcoesParaAtualizar, propagarPreco }
