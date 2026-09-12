// A FILA SOMADA NAS TELAS (F3.3): o operador vende três pedidos sem internet, olha o
// Caixa e precisa ver o dinheiro que está na gaveta — senão para de confiar no sistema,
// que é pior do que o sistema parar. A venda pendente aparece MARCADA como não
// sincronizada; nunca se passa por venda que já subiu.
const { test } = require('node:test')
const assert = require('node:assert')
const { criarFila } = require('../src-electron/fila-escrita')
const T = require('../src-electron/fila-telas')

const storeMem = () => { const m = new Map(); return { get: (k) => m.get(k) || null, set: (k, v) => { m.set(k, v); return { ok: true } } } }
const AGORA = Date.parse('2026-09-12T01:30:00Z')
const fila = () => criarFila({ store: storeMem(), chave: 'fila|L1', gerarId: () => 'g', agora: () => Date.parse('2026-09-12T01:00:00Z') })
const venda = (id, total, forma, cliente) => ({ tipo: 'venda', caminho: '/api/admin/venda',
  corpo: { id_cliente_app: id, forma_pagamento: forma === 'dinheiro' ? 'dinheiro' : forma === 'pix' ? 'pix' : 'cartao_entrega' },
  resumo: { cliente: cliente || 'Ana', telefone: '75 9', total, forma, tipo: 'retirada', itens: ['1× Pizza'], bairro: '', observacao: '' } })
const caixaBase = () => ({
  aberto: { fundoInicial: 50 }, esperadoDinheiro: 180,
  resumo: { vendaDinheiro: 130, vendaPix: 40, vendaPixOnline: 25, vendaPixConferir: 15, vendaCartao: 60, sangrias: 0, suprimentos: 0 },
  movimentacoes: [{ id: 'srv-1', tipo: 'venda', forma: 'dinheiro', valor: 130, descricao: 'Pedido #10', criadoEm: '2026-09-12T00:00:00Z', estornada: false }],
})

test('sem dado do caixa continua sem dado — a fila não inventa caixa', () => {
  assert.strictEqual(T.aplicarNoCaixa(null, fila()), null)
})

test('sem nada na fila o caixa fica igual, só ganha o estado da fila', () => {
  const d = T.aplicarNoCaixa(caixaBase(), fila())
  assert.strictEqual(d.esperadoDinheiro, 180)
  assert.strictEqual(d.movimentacoes.length, 1)
  assert.strictEqual(d.fila.pendentes, 0)
})

test('venda em dinheiro e sangria pendentes somam no resumo e no esperado em dinheiro', () => {
  const f = fila()
  f.enfileirar(venda('v1', 30, 'dinheiro'))
  f.enfileirar(venda('v2', 20, 'pix'))   // ficou na fila por sessão expirada
  f.enfileirar({ tipo: 'movimentacao', caminho: '/api/admin/caixa/movimentacao', corpo: { id_cliente_app: 's1', tipo: 'sangria', valor: 10, motivo: 'Depósito bancário' } })
  const d = T.aplicarNoCaixa(caixaBase(), f, AGORA)
  assert.strictEqual(d.resumo.vendaDinheiro, 160)
  assert.strictEqual(d.resumo.vendaPix, 60)
  assert.strictEqual(d.resumo.vendaPixConferir, 35, 'o Pix da fila é de gente, confere no fechamento')
  assert.strictEqual(d.resumo.vendaCartao, 60)
  assert.strictEqual(d.resumo.sangrias, 10)
  assert.strictEqual(d.esperadoDinheiro, 200, '180 + 30 da venda − 10 da sangria')
  assert.strictEqual(d.movimentacoes.length, 4)
  const [m1, m2, m3] = d.movimentacoes
  assert.strictEqual(m1.naoSincronizada, true)
  assert.match(m1.descricao, /Venda L-1 — Ana/)
  assert.match(m1.descricao, /não sincronizada/)
  assert.strictEqual(m1.id, 'fila-v1')
  assert.strictEqual(m2.forma, 'pix')
  assert.strictEqual(m3.tipo, 'sangria')
  assert.match(m3.descricao, /Depósito bancário/)
  assert.strictEqual(d.movimentacoes[3].id, 'srv-1', 'o que veio do servidor continua depois')
  assert.deepStrictEqual({ pendentes: d.fila.pendentes, total: d.fila.total }, { pendentes: 3, total: 50 })
})

test('cartão pendente soma no cartão; o dado do servidor não é mexido no lugar', () => {
  const base = caixaBase()
  const f = fila(); f.enfileirar(venda('v1', 12, 'credito'))
  const d = T.aplicarNoCaixa(base, f)
  assert.strictEqual(d.resumo.vendaCartao, 72)
  assert.strictEqual(base.resumo.vendaCartao, 60)
  assert.strictEqual(base.movimentacoes.length, 1)
})

test('o fechamento provisório e a conferência chegam à tela pelo mesmo caminho', () => {
  const f = fila()
  f.enfileirar({ tipo: 'fechamento', caminho: '/api/admin/caixa/fechar', corpo: { id_cliente_app: 'fx', dinheiro_contado: 200, pix_contado: 0, cartao_contado: 0, fechado_no_app_em: '2026-09-12T01:10:00.000Z' } })
  const d = T.aplicarNoCaixa(caixaBase(), f)
  assert.deepStrictEqual(d.fechamentoProvisorio, { em: '2026-09-12T01:10:00.000Z', contados: { dinheiro: 200, pix: 0, cartao: 0 } })
  assert.strictEqual(d.conferencia, null)
  f.guardarConferencia({ caixaId: 'cx1', naoVistas: [], esperado: { dinheiro: 1, pix: 0, cartao: 0 } })
  assert.strictEqual(T.aplicarNoCaixa(caixaBase(), f).conferencia.caixaId, 'cx1')
})

test('no quadro de pedidos a venda pendente vira cartão em produção, com o número provisório e a marca', () => {
  const f = fila()
  f.enfileirar(venda('v1', 30, 'dinheiro', 'Bia'))
  f.enfileirar(venda('v2', 20, 'dinheiro', 'Caio'))
  const d = T.aplicarNoQuadro({ itens: [{ numero: '10', cliente: 'Zé', etapa: 'pronto' }], colunas: [] }, f, AGORA)
  assert.strictEqual(d.itens.length, 3)
  assert.deepStrictEqual(
    { numero: d.itens[0].numero, pedido: d.itens[0].pedido, cliente: d.itens[0].cliente, etapa: d.itens[0].etapa, valor: d.itens[0].valor, marca: d.itens[0].naoSincronizada, canal: d.itens[0].canal, espera: d.itens[0].esperaMin },
    { numero: 'L-1', pedido: 'L-1', cliente: 'Bia', etapa: 'producao', valor: 30, marca: true, canal: 'Retirada', espera: 30 })
  assert.strictEqual(d.itens[2].numero, '10')
  assert.strictEqual(T.aplicarNoQuadro(null, f), null)
})
