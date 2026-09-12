// estoque-acoes.js — o que se cadastra na Gestão sem sair do app, em regra pura.
//
// Quatro coisas de um passo só: sincronizar com o cardápio, nova categoria, novo
// fornecedor e novo insumo. Entrada por nota fiscal (SEFAZ, XML, manual) continua
// pelo painel — são fluxos de várias telas, e um formulário meia-boca aqui erraria
// o custo. Quem grava é o painel, e é ele que amarra o insumo ao produto do cardápio.

const { valorDigitado } = require('./caixa-acoes')

const UNIDADES = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct']
// Os grupos que o estoque conhece. `uso_consumo` chegou em 09/09/2026 (sacola,
// guardanapo, limpeza): é DESPESA da loja, não estoque de produção nem mercadoria —
// antes só cabia em "Embalagem" e a despesa se misturava com o custo do prato.
const GRUPO = { insumos: 'insumo', insumo: 'insumo', producao: 'producao', revenda: 'revenda',
  uso_consumo: 'uso_consumo', 'uso e consumo': 'uso_consumo' }
const NOME_GRUPO = { insumo: 'Insumos', producao: 'Produção', revenda: 'Revenda',
  uso_consumo: 'Uso e consumo' }

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
      // ⚠️ O TIPO segue o grupo: revenda que não é bebida tem tipo próprio desde
      // 09/09, e uso e consumo nunca vira item de ficha técnica.
      tipo: g === 'revenda' ? 'revenda' : (g === 'uso_consumo' ? 'uso_consumo' : 'ingrediente'),
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


// ── Gestão pelo app: editar item, ajuste, entradas à mão, fornecedor, pendência, ficha técnica ──
// Os mesmos campos e rotas dos modais do painel (PainelProdutos, ModalLancamentoEntrada,
// ModalFichaFornecedor, PainelPendencias, PainelFichas). Só o que mudou viaja.
const { dataISO } = require('./contas-acoes')
const t = (v) => ('' + (v == null ? '' : v)).trim()
const num = (v) => { const n = valorDigitado(t(v) === '' ? NaN : v); return isFinite(n) ? n : NaN }
const TIPOS_ITEM = ['ingrediente', 'bebida', 'embalagem', 'produto_pronto', 'revenda', 'uso_consumo']
const GRUPOS_ITEM = ['producao', 'revenda', 'insumo', 'uso_consumo']
const UNIDADES_TXT = (u) => t(u).toLowerCase()

/** Editar o cadastro do item (não mexe no saldo — isso é o ajuste). */
function editarInsumo(item, campos) {
  const i = item || {}, c = campos || {}
  if (!i.id) return { ok: false, motivo: 'Este item veio sem identificação — recarregue a tela.' }
  const corpo = {}
  if (c.nome !== undefined) {
    const n = t(c.nome)
    if (n.length < 2) return { ok: false, motivo: 'Diga o nome do item (pelo menos duas letras).' }
    if (n !== t(i.nome)) corpo.nome = n
  }
  if (c.unidade !== undefined && t(c.unidade) !== '') {
    const u = UNIDADES_TXT(c.unidade)
    if (UNIDADES.indexOf(u) < 0) return { ok: false, motivo: 'Unidade tem de ser uma destas: ' + UNIDADES.join(', ') + '.' }
    if (u !== t(i.unidade).toLowerCase()) corpo.unidade = u
  }
  if (c.minimo !== undefined && t(c.minimo) !== '') {
    const m = num(c.minimo)
    if (!(m >= 0)) return { ok: false, motivo: 'Estoque mínimo inválido.' }
    if (Math.abs(m - (Number(i.minimo) || 0)) > 0.0001) corpo.qtd_minima = m
  }
  if (c.custo !== undefined && t(c.custo) !== '') {
    const v = num(c.custo)
    if (!(v >= 0)) return { ok: false, motivo: 'Custo unitário inválido.' }
    if (Math.abs(v - (Number(i.custo) || 0)) > 0.0001) corpo.custo_unitario = v
  }
  if (c.tipo !== undefined && t(c.tipo) !== '' && t(c.tipo) !== t(i.tipo)) {
    if (TIPOS_ITEM.indexOf(t(c.tipo)) < 0) return { ok: false, motivo: 'Tipo de item desconhecido.' }
    corpo.tipo = t(c.tipo)
  }
  if (c.grupo !== undefined && t(c.grupo) !== '' && t(c.grupo) !== t(i.grupo)) {
    if (GRUPOS_ITEM.indexOf(t(c.grupo)) < 0) return { ok: false, motivo: 'Grupo desconhecido.' }
    corpo.grupo_estoque = t(c.grupo)
  }
  if (typeof c.ativo === 'boolean' && c.ativo !== (i.ativo !== false)) corpo.ativo = c.ativo
  if (typeof c.permiteNegativo === 'boolean' && c.permiteNegativo !== !!i.permiteNegativo) corpo.permite_estoque_negativo = c.permiteNegativo
  if (!Object.keys(corpo).length) return { ok: false, motivo: 'Nada mudou.' }
  return { ok: true, caminho: '/api/admin/ingredientes/' + i.id, metodo: 'PATCH', corpo, resumo: (corpo.nome || i.nome || 'Item') + ' salvo.' }
}

const ACOES_MOV = {
  entrada: 'Entrada', saida: 'Saída', perda: 'Perda', consumo_interno: 'Consumo interno', ajuste: 'Acerto de saldo',
}
const qtdTxt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 })

/** Movimento manual: entrada soma, saída/perda/consumo tiram, acerto fixa o saldo contado (regra da rota). */
function ajusteEstoque(item, { acao, qtd, motivo, observacao, custo } = {}) {
  const i = item || {}
  if (!i.id) return { ok: false, motivo: 'Este item veio sem identificação — recarregue a tela.' }
  const a = t(acao)
  if (!ACOES_MOV[a]) return { ok: false, motivo: 'Escolha o tipo de movimento.' }
  const q = num(qtd)
  if (a !== 'ajuste' && !(q > 0)) return { ok: false, motivo: 'Informe uma quantidade maior que zero.' }
  if (a === 'ajuste' && !(q >= 0)) return { ok: false, motivo: 'Informe o saldo contado (zero vale).' }
  const saldo = Number(i.saldo) || 0
  const u = i.unidade || 'un'
  if ((a === 'saida' || a === 'perda' || a === 'consumo_interno') && q > saldo + 0.0001 && !i.permiteNegativo) {
    return { ok: false, motivo: 'Não dá para tirar ' + qtdTxt(q) + ' ' + u + ': só tem ' + qtdTxt(saldo) + ' ' + u + '. Use o acerto de saldo se a contagem estiver diferente.' }
  }
  const corpo = { acao: a, qtd: q }
  if (a === 'entrada' && t(custo) !== '') {
    const cu = num(custo)
    if (!(cu >= 0)) return { ok: false, motivo: 'Custo unitário inválido.' }
    corpo.custo_lancamento = cu
  }
  if (t(motivo)) corpo.motivo = t(motivo).slice(0, 120)
  if (t(observacao)) corpo.observacao = t(observacao).slice(0, 300)
  const resumo = a === 'entrada' ? i.nome + ': +' + qtdTxt(q) + ' ' + u + ' (saldo ' + qtdTxt(saldo + q) + ').'
    : a === 'ajuste' ? i.nome + ': saldo acertado para ' + qtdTxt(q) + ' ' + u + '.'
    : i.nome + ': −' + qtdTxt(q) + ' ' + u + ' (' + ACOES_MOV[a].toLowerCase() + ', saldo ' + qtdTxt(Math.max(0, saldo - q)) + ').'
  return { ok: true, caminho: '/api/admin/ingredientes/' + i.id, metodo: 'PATCH', corpo, resumo }
}

/** Entrada SEM nota: entra no estoque marcada como sem comprovante fiscal. */
function entradaSemNota({ fornecedorId, fornecedorNome, documento, data, motivo, itens } = {}) {
  const linhas = (Array.isArray(itens) ? itens : []).filter((l) => l && (t(l.ingredienteId) || t(l.qtd) || t(l.custo)))
  if (!linhas.length) return { ok: false, motivo: 'Informe ao menos um item com quantidade.' }
  const corpo = {}
  if (t(fornecedorId)) corpo.fornecedor_id = t(fornecedorId)
  if (t(fornecedorNome)) corpo.fornecedor_nome = t(fornecedorNome).slice(0, 120)
  if (t(documento)) corpo.documento = t(documento).slice(0, 60)
  if (t(data)) { const d = dataISO(data); if (!d) return { ok: false, motivo: 'Data no formato dd/mm/aaaa.' }; corpo.data = d }
  if (t(motivo)) corpo.motivo = t(motivo).slice(0, 200)
  corpo.itens = []
  for (const l of linhas) {
    if (!t(l.ingredienteId)) return { ok: false, motivo: 'Escolha o item do estoque em cada linha preenchida.' }
    const q = num(l.qtd)
    if (!(q > 0)) return { ok: false, motivo: 'Quantidade maior que zero em cada item.' }
    const it = { ingrediente_id: t(l.ingredienteId), qtd: q }
    if (t(l.custo) !== '') { const c = num(l.custo); if (!(c >= 0)) return { ok: false, motivo: 'Custo unitário inválido.' }; it.custo_unitario = c }
    corpo.itens.push(it)
  }
  return { ok: true, caminho: '/api/admin/estoque/entrada-sem-nota', metodo: 'POST', corpo,
    resumo: 'Entrada sem nota lançada: ' + corpo.itens.length + (corpo.itens.length === 1 ? ' item' : ' itens') + ' no estoque.' }
}

/** Entrada manual COM nota: vai para a conferência normal (vincular, criar, ignorar por item). */
function entradaManual({ fornecedorNome, fornecedorCnpj, fornecedorId, numero, serie, dataEmissao, itens } = {}) {
  const nome = t(fornecedorNome)
  if (!nome) return { ok: false, motivo: 'Diga o fornecedor da nota.' }
  const linhas = (Array.isArray(itens) ? itens : []).filter((l) => l && (t(l.descricao) || t(l.quantidade) || t(l.valorUnitario)))
  if (!linhas.length) return { ok: false, motivo: 'Informe ao menos um item da nota.' }
  const corpo = { fornecedor_nome: nome.slice(0, 120) }
  const cnpj = t(fornecedorCnpj).replace(/\D/g, '')
  if (cnpj) corpo.fornecedor_cnpj = cnpj
  if (t(fornecedorId)) corpo.fornecedor_id = t(fornecedorId)
  if (t(numero)) corpo.numero = t(numero).slice(0, 20)
  if (t(serie)) corpo.serie = t(serie).slice(0, 10)
  if (t(dataEmissao)) { const d = dataISO(dataEmissao); if (!d) return { ok: false, motivo: 'Data de emissão no formato dd/mm/aaaa.' }; corpo.data_emissao = d }
  corpo.tipo_documento = 'nfe'
  corpo.itens = []
  for (const l of linhas) {
    if (!t(l.descricao)) return { ok: false, motivo: 'Cada item precisa da descrição.' }
    const q = num(l.quantidade)
    if (!(q > 0)) return { ok: false, motivo: 'Quantidade maior que zero em cada item.' }
    const v = t(l.valorUnitario) === '' ? 0 : num(l.valorUnitario)
    if (!(v >= 0)) return { ok: false, motivo: 'Valor unitário inválido.' }
    corpo.itens.push({ descricao: t(l.descricao).slice(0, 200), unidade: (t(l.unidade) || 'UN').toUpperCase().slice(0, 10), quantidade: q, valor_unitario: v })
  }
  return { ok: true, caminho: '/api/admin/estoque/entradas/manual', metodo: 'POST', corpo,
    resumo: 'NF ' + (corpo.numero || 'sem número') + ' de ' + nome + ' lançada com ' + corpo.itens.length + ' item(ns) — confira e lance no estoque.' }
}

function editarFornecedor(fornecedor, campos) {
  const f = fornecedor || {}, c = campos || {}
  if (!f.id) return { ok: false, motivo: 'Este fornecedor veio sem identificação — recarregue a tela.' }
  const corpo = {}
  if (c.nome !== undefined) { const n = t(c.nome); if (n.length < 2) return { ok: false, motivo: 'Nome com pelo menos duas letras.' }; if (n !== t(f.nome)) corpo.nome = n }
  if (c.cnpj !== undefined) {
    const d = t(c.cnpj).replace(/\D/g, '')
    if (d && d.length !== 11 && d.length !== 14) return { ok: false, motivo: 'CNPJ tem 14 dígitos; CPF, 11.' }
    if (d !== t(f.cnpj).replace(/\D/g, '')) corpo.cnpj_cpf = d || null
  }
  if (c.telefone !== undefined && t(c.telefone) !== t(f.telefone)) corpo.telefone = t(c.telefone).slice(0, 30) || null
  if (c.email !== undefined) {
    const e = t(c.email)
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, motivo: 'E-mail inválido.' }
    if (e !== t(f.email)) corpo.email = e
  }
  if (c.endereco !== undefined && t(c.endereco) !== t(f.endereco)) corpo.endereco = t(c.endereco) || null
  if (c.inscricao !== undefined && t(c.inscricao) !== t(f.inscricao)) corpo.inscricao_estadual = t(c.inscricao) || null
  if (c.observacoes !== undefined && t(c.observacoes) !== t(f.observacoes)) corpo.observacoes = t(c.observacoes) || null
  if (c.tipo !== undefined && t(c.tipo) && t(c.tipo) !== t(f.tipo || 'fornecedor')) {
    if (['fornecedor', 'prestador', 'transportadora'].indexOf(t(c.tipo)) < 0) return { ok: false, motivo: 'Tipo desconhecido.' }
    corpo.tipo = t(c.tipo)
  }
  if (typeof c.ativo === 'boolean' && c.ativo !== (f.ativo !== false)) corpo.ativo = c.ativo
  if (!Object.keys(corpo).length) return { ok: false, motivo: 'Nada mudou.' }
  return { ok: true, caminho: '/api/admin/fornecedores/' + f.id, metodo: 'PATCH', corpo, resumo: 'Fornecedor ' + (corpo.nome || f.nome || '') + ' salvo.' }
}

function excluirFornecedor(fornecedor) {
  const f = fornecedor || {}
  if (!f.id) return { ok: false, motivo: 'Este fornecedor veio sem identificação — recarregue a tela.' }
  return { ok: true, caminho: '/api/admin/fornecedores/' + f.id, metodo: 'DELETE', corpo: {}, resumo: 'Fornecedor ' + (f.nome || '') + ' excluído.' }
}

function resolverPendencia(pendencia, { resolucao } = {}) {
  const p = pendencia || {}
  if (!p.id) return { ok: false, motivo: 'Esta pendência veio sem identificação — recarregue a tela.' }
  const r = t(resolucao)
  if (!r) return { ok: false, motivo: 'Diga como foi resolvida (o fornecedor repôs, foi abatido da nota…).' }
  return { ok: true, caminho: '/api/admin/estoque/pendencias', metodo: 'PATCH', corpo: { id: p.id, status: 'resolvida', resolucao: r.slice(0, 400) },
    resumo: 'Pendência de ' + (p.produto || 'item') + ' resolvida.' }
}

/** A ficha técnica de um produto: quanto de cada insumo sai por unidade vendida. */
function fichaTecnica(produto, linhas) {
  const p = produto || {}
  if (!p.produtoId) return { ok: false, motivo: 'Este produto veio sem identificação — recarregue a tela.' }
  const vistos = new Set()
  const saida = []
  for (const l of (Array.isArray(linhas) ? linhas : [])) {
    // Linha sem insumo escolhido ("—") é linha tirada da ficha, mesmo que a quantidade
    // tenha ficado escrita — é assim que a ficha diz para remover um insumo.
    if (!l || !t(l.ingredienteId)) continue
    if (vistos.has(t(l.ingredienteId))) return { ok: false, motivo: 'Insumo repetido na ficha — some as quantidades numa linha só.' }
    const q = num(l.qtd)
    if (!(q > 0)) return { ok: false, motivo: 'Quantidade maior que zero em cada insumo.' }
    vistos.add(t(l.ingredienteId))
    saida.push({ ingrediente_id: t(l.ingredienteId), qtd_consumida: q })
  }
  return { ok: true, caminho: '/api/admin/estoque/fichas', metodo: 'PUT', corpo: { produto_id: p.produtoId, linhas: saida, modo: 'ficha_tecnica' },
    resumo: 'Ficha de ' + (p.produto || 'produto') + ' salva com ' + saida.length + (saida.length === 1 ? ' insumo.' : ' insumos.') }
}

module.exports = { sincronizar, novaCategoria, novoFornecedor, novoInsumo, reabrirNota, UNIDADES, GRUPO,
  editarInsumo, ajusteEstoque, entradaSemNota, entradaManual, editarFornecedor, excluirFornecedor, resolverPendencia, fichaTecnica,
  ACOES_MOV, TIPOS_ITEM, GRUPOS_ITEM }
