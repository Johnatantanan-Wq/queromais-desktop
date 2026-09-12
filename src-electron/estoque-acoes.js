// estoque-acoes.js — o que se cadastra na Gestão sem sair do app, em regra pura.
//
// Quatro coisas de um passo só: sincronizar com o cardápio, nova categoria, novo
// fornecedor e novo insumo. Entrada por nota fiscal (SEFAZ, XML, manual) continua
// pelo painel — são fluxos de várias telas, e um formulário meia-boca aqui erraria
// o custo. Quem grava é o painel, e é ele que amarra o insumo ao produto do cardápio.

const { valorDigitado } = require('./caixa-acoes')

const UNIDADES = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct']
const GRUPO = { insumos: 'insumo', insumo: 'insumo', producao: 'producao', revenda: 'revenda' }
const NOME_GRUPO = { insumo: 'Insumos', producao: 'Produção', revenda: 'Revenda' }

function sincronizar() {
  return { ok: true, caminho: '/api/admin/estoque/sincronizar-cardapio', corpo: {},
    resumo: 'Gestão sincronizada com o cardápio.' }
}

function novaCategoria({ nome, comportamento } = {}) {
  const n = ('' + (nome || '')).trim()
  if (n.length < 1) return { ok: false, motivo: 'Diga o nome da categoria.' }
  if (n.length > 60) return { ok: false, motivo: 'Nome muito longo (até 60 letras).' }
  const c = comportamento === 'venda' ? 'venda' : 'interno'
  return { ok: true, caminho: '/api/admin/estoque/categorias', corpo: { nome: n, comportamento: c },
    resumo: 'Categoria ' + n + ' criada.' }
}

function novoFornecedor({ nome, telefone, cnpj } = {}) {
  const n = ('' + (nome || '')).trim()
  if (n.length < 2) return { ok: false, motivo: 'Diga o nome do fornecedor (pelo menos duas letras).' }
  const corpo = { nome: n, tipo: 'fornecedor' }
  const t = ('' + (telefone || '')).trim()
  if (t) corpo.telefone = t.slice(0, 30)
  const d = ('' + (cnpj || '')).replace(/\D/g, '')
  if (d && d.length !== 11 && d.length !== 14) return { ok: false, motivo: 'CNPJ tem 14 dígitos; CPF, 11.' }
  if (d) corpo.cnpj_cpf = d
  return { ok: true, caminho: '/api/admin/fornecedores', corpo, resumo: 'Fornecedor ' + n + ' cadastrado.' }
}

/** Novo insumo. Grupo vem da aba (insumos/producao/revenda); o resto é o formulário. */
function novoInsumo({ grupo, nome, unidade, qtd, minimo, custo } = {}) {
  const g = GRUPO[('' + (grupo || '')).toLowerCase()]
  if (!g) return { ok: false, motivo: 'Diga em que grupo o item entra.' }
  const n = ('' + (nome || '')).trim()
  if (n.length < 2) return { ok: false, motivo: 'Diga o nome do item (pelo menos duas letras).' }
  const u = ('' + (unidade || 'un')).trim().toLowerCase()
  if (UNIDADES.indexOf(u) < 0) return { ok: false, motivo: 'Unidade tem de ser uma destas: ' + UNIDADES.join(', ') + '.' }
  const q = valorDigitado(qtd == null || qtd === '' ? 0 : qtd)
  const m = valorDigitado(minimo == null || minimo === '' ? 0 : minimo)
  const c = valorDigitado(custo == null || custo === '' ? 0 : custo)
  if (!isFinite(q) || q < 0) return { ok: false, motivo: 'Quantidade atual inválida.' }
  if (!isFinite(m) || m < 0) return { ok: false, motivo: 'Estoque mínimo inválido.' }
  if (!isFinite(c) || c < 0) return { ok: false, motivo: 'Custo unitário inválido.' }
  return {
    ok: true, caminho: '/api/admin/ingredientes',
    corpo: {
      nome: n, unidade: u, qtd_atual: q, qtd_minima: m, custo_unitario: c, grupo_estoque: g,
      // bebida e produto pronto são o que se REVENDE; o resto entra como ingrediente
      tipo: g === 'revenda' ? 'produto_pronto' : 'ingrediente',
    },
    resumo: n + ' cadastrado em ' + NOME_GRUPO[g] + (q ? ' com ' + q + ' ' + u : '') + '.',
  }
}

/**
 * "Ajustar" de uma nota já lançada: REABRE. O estoque volta atrás (movimento de ajuste
 * negativo no kardex, auditável) e a nota retorna para "A lançar", para ser lançada de
 * novo já corrigida. É o caminho de quem lançou errado — item no insumo trocado, fator
 * de caixa errado, quantidade errada.
 *
 * ⚠️ O que NÃO se desfaz, de propósito (regra do painel): produto criado na conferência,
 * preço de venda, fornecedor, embalagem aprendida, custo médio e as contas a pagar
 * geradas pela nota. Apagar isso quebraria mais do que conserta — o relançamento
 * sobrescreve o que mudar.
 */
function reabrirNota(nota) {
  const n = nota || {}
  if (!n.id) return { ok: false, motivo: 'Esta nota veio sem identificação — recarregue a tela.' }
  if (n.situacao === 'pendente') return { ok: false, motivo: 'Esta nota ainda não foi lançada.' }
  return {
    ok: true,
    caminho: '/api/admin/estoque/entradas/' + n.id + '/reabrir',
    corpo: {},
    resumo: 'NF ' + (n.numero || '') + ' reaberta: o estoque foi estornado e ela voltou para "A lançar".',
  }
}

module.exports = { sincronizar, novaCategoria, novoFornecedor, novoInsumo, reabrirNota, UNIDADES, GRUPO }
