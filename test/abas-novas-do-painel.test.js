// As abas que o PAINEL ganhou entre 08 e 10/09/2026 e que o app precisa ter, com a
// regra de cada uma — não só a aba desenhada:
//
//   Financeiro › Despesas          (09/09) — o GASTO, não a obrigação
//   Financeiro › Contas bancárias  (10/09) — de onde sai cada pagamento
//   Gestão › Prestadores de serviço (08/09) — quem emitiu NFS-e/CT-e para a loja
//   Caixa › NF pendentes           (09/09) — vendas sem nota em colunas por forma
const { test } = require('node:test')
const assert = require('node:assert')
const demo = require('../src-electron/demo-dados')
const ComAbas = require('../renderer/elo/telas-abas')
const TelaCaixa = require('../renderer/elo/tela-caixa')
const A = require('../src-electron/adaptadores')

const estado = { online: true, ts: Date.now() }
const fin = demo.telasComAbas().financeiro
const est = demo.telasComAbas().estoque

test('as nove abas do Financeiro estão na ordem do painel', () => {
  const chaves = ComAbas.ABAS['/admin/financeiro'].map((a) => a.chave)
  assert.deepStrictEqual(chaves,
    ['visao', 'vendas', 'extrato', 'livro', 'despesas', 'pagar', 'receber', 'dre', 'bancos'])
})

test('a aba Despesas mostra o gasto e o estado da nota', () => {
  const h = ComAbas.htmlComAbas('/admin/financeiro', fin, { ...estado, aba: 'despesas' })
  assert.ok(h.includes('Pendente de NFS-e'), 'falta o total pendente de nota')
  assert.ok(h.includes('Contabilidade Andrade'), 'a despesa não apareceu')
  assert.ok(!/undefined|NaN/.test(h))
})

test('⛔ Despesas NÃO fala de vencimento nem de pagamento — isso é Contas a pagar', () => {
  const h = ComAbas.htmlComAbas('/admin/financeiro', fin, { ...estado, aba: 'despesas' })
  assert.ok(!/[Vv]encimento/.test(h), 'despesa não tem vencimento: isso é obrigação, não gasto')
  assert.ok(!/Dar baixa|Marcar como pago/.test(h), 'pagamento é da aba vizinha')
})

test('a aba Contas bancárias soma o que passou por cada conta', () => {
  const h = ComAbas.htmlComAbas('/admin/financeiro', fin, { ...estado, aba: 'bancos' })
  assert.ok(h.includes('Nubank PJ'), 'a conta cadastrada não apareceu')
  assert.ok(h.includes('Cartão de crédito'), 'falta o tipo da conta')
  assert.ok(h.includes('fecha dia 28, vence dia 5'), 'o ciclo do cartão é o que junta a fatura')
  assert.ok(!/undefined|NaN/.test(h))
})

test('Gestão tem a aba Prestadores, com NFS-e e CT-e separados', () => {
  const chaves = ComAbas.ABAS['/admin/estoque'].map((a) => a.chave)
  assert.ok(chaves.includes('prestadores'), 'a aba não foi registrada')
  const h = ComAbas.htmlComAbas('/admin/estoque', est, { ...estado, aba: 'prestadores' })
  assert.ok(h.includes('NFS-e') && h.includes('CT-e'), 'um modelo, um tipo')
  assert.ok(h.includes('Fora do cadastro'), 'quem emitiu nota sem cadastro é o que importa aqui')
  assert.ok(h.includes('🔗 entregador Tiago Moura'), 'o vínculo com o entregador fecha o ciclo fiscal')
  assert.ok(h.includes('31.222.333/0001-44'), 'o CNPJ deveria sair formatado')
})

// ── Caixa › NF pendentes ──────────────────────────────────────────────────
const vendas = [
  { tipo: 'pedido', id: 'a', rotulo: '#1', total: 10, forma: 'dinheiro' },
  { tipo: 'pedido', id: 'b', rotulo: '#2', total: 20, forma: 'pix' },
  { tipo: 'pedido', id: 'c', rotulo: '#3', total: 30, forma: 'cartao_entrega', cartaoTipo: 'credito' },
  { tipo: 'pedido', id: 'd', rotulo: '#4', total: 40, forma: 'cartao_entrega', cartaoTipo: 'debito' },
  { tipo: 'sessao', id: 'e', rotulo: 'Mesa 3', total: 50, formasConta: ['pix', 'dinheiro'] },
]

test('⛔ crédito e débito dividem UMA coluna de cartão — o lote da maquininha é um só', () => {
  const cols = TelaCaixa.colunasNfPendentes(vendas)
  const cartao = cols.find((c) => c.chave === 'cartao')
  assert.strictEqual(cartao.vendas.length, 2)
  assert.strictEqual(cartao.total, 70)
  // ...mas o card de cada venda continua dizendo o que foi.
  assert.strictEqual(TelaCaixa.rotuloFormaNf(vendas[2]), 'Crédito')
  assert.strictEqual(TelaCaixa.rotuloFormaNf(vendas[3]), 'Débito')
})

test('conta dividida entre formas vai para "Outras formas"', () => {
  const cols = TelaCaixa.colunasNfPendentes(vendas)
  const outros = cols.find((c) => c.chave === 'outros')
  assert.strictEqual(outros.vendas.length, 1)
  assert.strictEqual(TelaCaixa.rotuloFormaNf(vendas[4]), 'Dividido')
})

test('⚠️ PIX com cartaoTipo sujo não cai na coluna do cartão', () => {
  // Existe pedido PIX com `cartaoTipo` sobrando de uma correção de forma (visto na
  // Pizzas do Jasson, 09/09). Ler o tipo sem olhar a FORMA jogaria o PIX no débito.
  const sujo = { tipo: 'pedido', id: 'x', rotulo: '#9', total: 15, forma: 'pix', cartaoTipo: 'debito' }
  assert.strictEqual(TelaCaixa.chaveFormaNf(sujo), 'pix')
})

test('as colunas saem na ordem do fechamento, e só as que têm venda', () => {
  const cols = TelaCaixa.colunasNfPendentes(vendas)
  assert.deepStrictEqual(cols.map((c) => c.chave), ['dinheiro', 'pix', 'cartao', 'outros'])
  assert.deepStrictEqual(TelaCaixa.colunasNfPendentes([vendas[0]]).map((c) => c.chave), ['dinheiro'])
})

test('a aba NF pendentes só aparece na loja que emite NFC-e manual', () => {
  const caixa = demo.caixa()
  const com = TelaCaixa.htmlDoCaixa(caixa, estado)
  assert.ok(com.includes('NF pendentes'), 'a loja que emite deveria ver a aba')
  const sem = TelaCaixa.htmlDoCaixa({ ...caixa, nfPendentes: { ativo: false, vendas: [] } }, estado)
  assert.ok(!sem.includes('NF pendentes'), 'lista vazia não distingue "em dia" de "não emite nota"')
})

test('a NF pendente desenha com o valor e o botão de emitir', () => {
  const h = TelaCaixa.htmlDoCaixa(demo.caixa(), { ...estado, subaba: 'nf' })
  assert.ok(h.includes('Emitir todas da coluna'), 'falta a emissão em série da coluna')
  assert.ok(h.includes('data-acao="nf:emitir-venda:'), 'o card precisa do próprio Emitir')
  assert.ok(!/undefined|NaN/.test(h))
})

test('rota de NF fora do ar não derruba o Caixa — a aba só não aparece', () => {
  assert.deepStrictEqual(A.nfPendentes(null), { ativo: false, vendas: [] })
  assert.deepStrictEqual(A.nfPendentes({ error: 'Não autorizado' }), { ativo: false, vendas: [] })
  const caixa = A.caixaCompleto({ resumoResp: { aberto: null }, entregasResp: null, salaoResp: null, semNotaResp: null })
  assert.strictEqual(caixa.nfPendentes.ativo, false)
})

test('rota de despesas ou de contas fora do ar não apaga as outras abas', () => {
  const d = A.financeiro({ d: { extrato: [{ id: 'm1', valor: 10 }] }, despesasResp: { error: 'x' }, bancosResp: null })
  assert.deepStrictEqual(d.despesas, [])
  assert.deepStrictEqual(d.bancos, [])
  assert.strictEqual(d.extrato.length, 1, 'o resto do Financeiro tem que continuar de pé')
})
