// FILA DE ESCRITA (F3.3): o que o app fez SEM internet, esperando para subir.
//
// A fila é a verdade da operação enquanto não há rede: venda, sangria/suprimento e
// fechamento entram aqui com id próprio, e sobem em ORDEM quando a conexão volta. O
// servidor reconhece o id (F3.1), então reenviar nunca duplica — para a fila, "já
// existe" é sucesso. Uma falha de rede PARA a fila (a ordem venda → fechamento
// importa); um 400 marca o item com erro e a fila segue, porque ele não se cura sozinho.
const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { criarFila } = require('../src-electron/fila-escrita')
const { makeStore } = require('../src-electron/cache-store')

const storeEmMemoria = () => { const m = new Map(); return { get: (k) => m.get(k) || null, set: (k, v) => { m.set(k, { ...v, ts: 1 }); return { ok: true } } } }
let n = 0
const gerarId = () => 'id-' + (++n)
const AGORA = Date.parse('2026-09-12T01:00:00Z')
const nova = (extra) => criarFila({ store: storeEmMemoria(), chave: 'fila|L1', gerarId, agora: () => AGORA, ...extra })
const venda = (total, forma) => ({ tipo: 'venda', caminho: '/api/admin/venda', corpo: { id_cliente_app: gerarId(), forma_pagamento: forma || 'dinheiro' },
  resumo: { cliente: 'Ana', total, forma: forma || 'dinheiro', tipo: 'retirada', itens: ['1× Pizza'] } })
const ok = (body) => async () => ({ status: 201, body })

test('a venda enfileirada ganha número provisório em sequência e guarda o carimbo', () => {
  const f = nova()
  const a = f.enfileirar(venda(30))
  const b = f.enfileirar(venda(20))
  assert.strictEqual(a.provisorio, 'L-1')
  assert.strictEqual(b.provisorio, 'L-2')
  assert.strictEqual(a.id, a.corpo.id_cliente_app)
  assert.strictEqual(a.criadoEm, '2026-09-12T01:00:00.000Z')
  assert.strictEqual(f.tamanho(), 2)
})

test('o prefixo é por máquina: L1-, L2-', () => {
  const f = nova({ prefixo: 'L2' })
  assert.strictEqual(f.enfileirar(venda(10)).provisorio, 'L2-1')
})

test('a fila sobrevive ao app fechar: recriada do disco, continua de onde parou', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fila-'))
  const store = makeStore(dir, { available: () => false })
  const f1 = criarFila({ store, chave: 'fila|L1', gerarId, agora: () => AGORA })
  f1.enfileirar(venda(30)); f1.enfileirar(venda(20))
  const f2 = criarFila({ store, chave: 'fila|L1', gerarId, agora: () => AGORA })
  assert.strictEqual(f2.tamanho(), 2)
  assert.strictEqual(f2.enfileirar(venda(5)).provisorio, 'L-3', 'o contador também é do disco')
})

test('processar sobe em ordem, remove o que subiu e registra a subida', async () => {
  const f = nova()
  f.enfileirar(venda(30)); f.enfileirar(venda(20))
  const enviados = []; const subidas = []
  const r = await f.processar({
    enviar: async (caminho, corpo) => { enviados.push(corpo.id_cliente_app); return { status: 201, body: { numero: 1050 + enviados.length, id: 'p' } } },
    online: () => true, aoSubir: (item, body) => subidas.push([item.provisorio, body.numero]),
  })
  assert.deepStrictEqual(r, { subiram: 2, parou: null })
  assert.deepStrictEqual(enviados, ['id-' + (n - 1), 'id-' + n])
  assert.strictEqual(f.tamanho(), 0)
  assert.deepStrictEqual(subidas, [['L-1', 1051], ['L-2', 1052]])
  assert.deepStrictEqual(f.subidas().map((s) => [s.provisorio, s.numero]), [['L-1', 1051], ['L-2', 1052]])
})

test('"já existe" (repetida) também é sucesso — a fila não fica presa numa venda que já subiu', async () => {
  const f = nova(); f.enfileirar(venda(30))
  const r = await f.processar({ enviar: ok({ numero: 1044, repetida: true }), online: () => true })
  assert.strictEqual(r.subiram, 1)
  assert.strictEqual(f.subidas()[0].numero, 1044)
})

test('sem internet nem tenta', async () => {
  const f = nova(); f.enfileirar(venda(30))
  let chamou = false
  const r = await f.processar({ enviar: async () => { chamou = true }, online: () => false })
  assert.strictEqual(r.parou, 'offline')
  assert.strictEqual(chamou, false)
  assert.strictEqual(f.tamanho(), 1)
})

test('falha de rede PARA a fila e não conta tentativa — o próximo item espera a vez', async () => {
  const f = nova(); f.enfileirar(venda(30)); f.enfileirar(venda(20))
  let chamadas = 0
  const r = await f.processar({ enviar: async () => { chamadas++; throw new Error('rede') }, online: () => true })
  assert.strictEqual(r.parou, 'rede')
  assert.strictEqual(chamadas, 1, 'parou no primeiro')
  assert.strictEqual(f.tamanho(), 2)
  assert.strictEqual(f.pendentes()[0].tentativas, 0)
})

test('status 0 é rede caída, igual a lançar', async () => {
  const f = nova(); f.enfileirar(venda(30))
  const r = await f.processar({ enviar: async () => ({ status: 0, body: null }), online: () => true })
  assert.strictEqual(r.parou, 'rede')
})

test('401 para a fila: falta sessão, não falta rede', async () => {
  const f = nova(); f.enfileirar(venda(30))
  const r = await f.processar({ enviar: async () => ({ status: 401, body: { error: 'x' } }), online: () => true })
  assert.strictEqual(r.parou, 'sessao')
  assert.strictEqual(f.tamanho(), 1)
})

test('5xx conta tentativa e para; na quinta vira erro e a fila segue para o próximo', async () => {
  const f = nova(); f.enfileirar(venda(30)); f.enfileirar(venda(20))
  for (let i = 0; i < 4; i++) {
    const r = await f.processar({ enviar: async () => ({ status: 500, body: null }), online: () => true })
    assert.strictEqual(r.parou, 'servidor')
  }
  assert.strictEqual(f.pendentes()[0].tentativas, 4)
  let enviados = 0
  const r = await f.processar({ enviar: async (c, corpo) => { enviados++; return enviados === 1 ? { status: 500, body: null } : { status: 201, body: { numero: 9 } } }, online: () => true })
  assert.strictEqual(f.comErro().length, 1)
  assert.match(f.comErro()[0].erro, /servidor/i)
  assert.strictEqual(r.subiram, 1, 'o segundo item subiu depois que o primeiro virou erro')
  assert.strictEqual(f.tamanho(), 1, 'o com erro continua guardado, para exportar')
  assert.strictEqual(f.pendentes().length, 0)
})

test('4xx vira erro na hora, com a frase do painel, e o próximo item ainda sobe', async () => {
  const f = nova(); f.enfileirar(venda(30)); f.enfileirar(venda(20))
  let i = 0
  const r = await f.processar({ enviar: async () => (++i === 1 ? { status: 422, body: { error: 'Caixa fechado' } } : { status: 201, body: { numero: 7 } }), online: () => true })
  assert.strictEqual(r.subiram, 1)
  assert.strictEqual(f.comErro()[0].erro, 'Caixa fechado')
})

test('processar é single-flight: duas chamadas ao mesmo tempo não mandam a mesma venda duas vezes', async () => {
  const f = nova(); f.enfileirar(venda(30))
  let chamadas = 0
  const enviar = () => new Promise((res) => setTimeout(() => { chamadas++; res({ status: 201, body: { numero: 1 } }) }, 10))
  await Promise.all([f.processar({ enviar, online: () => true }), f.processar({ enviar, online: () => true })])
  assert.strictEqual(chamadas, 1)
})

test('o estado diz o que a topbar precisa: quantas esperam, quantas deram erro e o valor das vendas', async () => {
  const f = nova(); f.enfileirar(venda(30)); f.enfileirar(venda(20))
  f.enfileirar({ tipo: 'movimentacao', caminho: '/api/admin/caixa/movimentacao', corpo: { id_cliente_app: gerarId(), tipo: 'sangria', valor: 50 }, resumo: { tipo: 'sangria', valor: 50 } })
  await f.processar({ enviar: async () => ({ status: 400, body: { error: 'ruim' } }), online: () => true })
  const e = f.estado()
  assert.strictEqual(e.pendentes, 0)
  assert.strictEqual(e.comErro, 3)
  assert.strictEqual(e.ultimoErro, 'ruim')
  const g = nova(); g.enfileirar(venda(30)); g.enfileirar(venda(20))
  assert.deepStrictEqual({ pendentes: g.estado().pendentes, total: g.estado().total, comErro: g.estado().comErro }, { pendentes: 2, total: 50, comErro: 0 })
})

test('exportar leva tudo — inclusive o que deu erro — para o lojista não perder venda', async () => {
  const f = nova(); f.enfileirar(venda(30))
  await f.processar({ enviar: async () => ({ status: 400, body: { error: 'ruim' } }), online: () => true })
  const j = JSON.parse(f.exportar())
  assert.strictEqual(j.itens.length, 1)
  assert.strictEqual(j.itens[0].erro, 'ruim')
  assert.ok(j.exportadoEm)
})

test('remover tira o item (o lojista desistiu de uma venda com erro)', async () => {
  const f = nova(); const a = f.enfileirar(venda(30))
  f.remover(a.id)
  assert.strictEqual(f.tamanho(), 0)
})

test('o fechamento provisório fica visível enquanto espera, e a conferência é guardada em disco', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fila-'))
  const store = makeStore(dir, { available: () => false })
  const f = criarFila({ store, chave: 'fila|L1', gerarId, agora: () => AGORA })
  assert.strictEqual(f.fechamentoPendente(), null)
  f.enfileirar({ tipo: 'fechamento', caminho: '/api/admin/caixa/fechar',
    corpo: { id_cliente_app: gerarId(), dinheiro_contado: 100, pix_contado: 0, cartao_contado: 0, fechado_no_app_em: '2026-09-12T01:00:00.000Z' } })
  assert.strictEqual(f.fechamentoPendente().corpo.dinheiro_contado, 100)
  assert.deepStrictEqual(f.estado().fechamentoProvisorio, { em: '2026-09-12T01:00:00.000Z', contados: { dinheiro: 100, pix: 0, cartao: 0 } })
  f.guardarConferencia({ caixaId: 'cx1', naoVistas: [{ id: 'x', valor: 55 }], esperado: { dinheiro: 155, pix: 0, cartao: 0 } })
  const g = criarFila({ store, chave: 'fila|L1', gerarId, agora: () => AGORA })
  assert.strictEqual(g.conferencia().caixaId, 'cx1')
  assert.strictEqual(g.estado().conferencia, true)
  g.guardarConferencia(null)
  assert.strictEqual(g.conferencia(), null)
})

test('o estado leva a lista resumida — é o que a ficha da fila mostra', async () => {
  const f = nova(); f.enfileirar(venda(30))
  f.enfileirar({ tipo: 'movimentacao', caminho: '/x', corpo: { id_cliente_app: gerarId(), tipo: 'sangria', valor: 10, motivo: 'Depósito' } })
  await f.processar({ enviar: async () => ({ status: 422, body: { error: 'ruim' } }), online: () => true })
  const itens = f.estado().itens
  assert.strictEqual(itens.length, 2)
  assert.deepStrictEqual(Object.keys(itens[0]).sort(), ['cliente', 'criadoEm', 'erro', 'id', 'provisorio', 'tipo', 'valor'])
  assert.strictEqual(itens[0].provisorio, 'L-1')
  assert.strictEqual(itens[0].valor, 30)
  assert.strictEqual(itens[0].erro, 'ruim')
  assert.strictEqual(itens[1].cliente, 'Depósito')
  assert.strictEqual(itens[1].valor, 10)
})
