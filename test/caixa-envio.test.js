// CAIXA SEM INTERNET (F3.3/F3.4): sangria e suprimento entram na fila; o fechamento
// nasce PROVISÓRIO, com o retrato do que o app viu, e só vira definitivo quando o
// servidor confere. Se o servidor achar movimentação que o app não viu, a conferência
// fica guardada para o lojista confirmar — nunca fecha calado com número errado.
const { test } = require('node:test')
const assert = require('node:assert')
const C = require('../src-electron/caixa-envio')
const { criarFila } = require('../src-electron/fila-escrita')

const storeMem = () => { const m = new Map(); return { get: (k) => m.get(k) || null, set: (k, v) => { m.set(k, v); return { ok: true } } } }
const AGORA = Date.parse('2026-09-12T01:00:00Z')
function montar({ online, enviarComStatus, enviar }) {
  const canais = new Map()
  const fila = criarFila({ store: storeMem(), chave: 'fila|L1', gerarId: () => 'g', agora: () => AGORA })
  let n = 0
  C.registrar({
    ipcMain: { handle: (c, fn) => canais.set(c, fn) },
    enviar: enviar || (async () => ({ ok: true })),
    enviarComStatus, fila, online, gerarId: () => 'id-' + (++n), agora: () => AGORA,
    movimentacoesVistas: () => ['srv-1', 'srv-2'],
  })
  return { fila, chamar: (canal, args) => canais.get(canal)(null, args) }
}
const contados = { dinheiro: '200', pix: '0', cartao: '0', caixaAberto: true }

test('sangria sem internet: entra na fila com id, e a tela ouve que ela sobe depois', async () => {
  const { fila, chamar } = montar({ online: () => false, enviarComStatus: async () => { throw new Error('não deveria tentar') } })
  const r = await chamar('caixa-movimentacao', { tipo: 'sangria', valor: '50', motivo: 'Depósito bancário', caixaAberto: true })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.provisorio, true)
  assert.match(r.resumo, /sobe quando a internet voltar/)
  const item = fila.pendentes()[0]
  assert.strictEqual(item.tipo, 'movimentacao')
  assert.deepStrictEqual(item.corpo, { tipo: 'sangria', valor: 50, motivo: 'Depósito bancário', descricao: null, id_cliente_app: 'id-1' })
})

test('fechar sem internet: nasce provisório, com o RETRATO do que o app viu', async () => {
  const { fila, chamar } = montar({ online: () => false, enviarComStatus: async () => { throw new Error('não') } })
  fila.enfileirar({ tipo: 'venda', caminho: '/api/admin/venda', corpo: { id_cliente_app: 'v1' }, resumo: { total: 30, forma: 'dinheiro' } })
  fila.enfileirar({ tipo: 'movimentacao', caminho: '/api/admin/caixa/movimentacao', corpo: { id_cliente_app: 's1', tipo: 'sangria', valor: 10 } })
  const r = await chamar('caixa-fechar', contados)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.provisorio, true)
  assert.match(r.resumo, /PROVISORIAMENTE/)
  assert.match(r.resumo, /sem internet/)
  const item = fila.fechamentoPendente()
  assert.ok(item, 'o fechamento está na fila')
  assert.deepStrictEqual(item.corpo.retrato, { movimentacoes: ['srv-1', 'srv-2'], vendas_app: ['v1'], movimentacoes_app: ['s1'] })
  assert.strictEqual(item.corpo.id_cliente_app, 'id-1')
  assert.strictEqual(item.corpo.fechado_no_app_em, '2026-09-12T01:00:00.000Z')
  assert.strictEqual(item.corpo.dinheiro_contado, 200)
  assert.strictEqual(fila.pendentes().indexOf(item), 2, 'o fechamento é o ÚLTIMO da fila: venda e sangria sobem antes')
})

test('fechar com internet e o servidor achando movimentação que o app não viu: a conferência fica guardada', async () => {
  const resposta = { ok: true, definitivo: false, aguardandoConferencia: true, caixaId: 'cx1',
    naoVistas: [{ id: 'site', tipo: 'venda', forma: 'pix', valor: 55, descricao: 'Pedido #12' }], esperado: { dinheiro: 255, pix: 0, cartao: 0 } }
  const { fila, chamar } = montar({ online: () => true, enviarComStatus: async () => ({ status: 200, body: resposta }) })
  const r = await chamar('caixa-fechar', contados)
  assert.strictEqual(r.ok, true)
  assert.ok(r.conferencia, 'a tela recebe a conferência para abrir na hora')
  assert.match(r.resumo, /não viu/)
  const c = fila.conferencia()
  assert.strictEqual(c.caixaId, 'cx1')
  assert.strictEqual(c.naoVistas.length, 1)
  assert.strictEqual(c.idClienteApp, 'id-1')
  assert.deepStrictEqual(c.contados, { dinheiro: 200, pix: 0, cartao: 0 })
  assert.deepStrictEqual(c.esperado, { dinheiro: 255, pix: 0, cartao: 0 })
  assert.strictEqual(fila.fechamentoPendente(), null, 'não fica na fila: o servidor já recebeu')
})

test('fechar com internet e tudo batendo: definitivo, sem conferência pendente', async () => {
  let recebido = null
  const { fila, chamar } = montar({ online: () => true, enviarComStatus: async (c, corpo) => { recebido = corpo; return { status: 200, body: { ok: true, definitivo: true } } } })
  const r = await chamar('caixa-fechar', contados)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.provisorio, undefined)
  assert.strictEqual(fila.conferencia(), null)
  assert.deepStrictEqual(recebido.retrato, { movimentacoes: ['srv-1', 'srv-2'], vendas_app: [], movimentacoes_app: [] })
})

test('a rede cai no meio do fechar: vai para a fila como provisório', async () => {
  const { fila, chamar } = montar({ online: () => true, enviarComStatus: async () => ({ status: 0, body: null }) })
  const r = await chamar('caixa-fechar', contados)
  assert.strictEqual(r.provisorio, true)
  assert.ok(fila.fechamentoPendente())
})

test('confirmar a conferência fecha de vez: manda confirmar:true com o id do fechamento, e limpa', async () => {
  let recebido = null
  const { fila, chamar } = montar({ online: () => true, enviarComStatus: async (c, corpo) => { recebido = { c, corpo }; return { status: 200, body: { ok: true, definitivo: true } } } })
  const sem = await chamar('caixa-conferencia-confirmar', contados)
  assert.strictEqual(sem.ok, false, 'sem conferência pendente não há o que confirmar')
  fila.guardarConferencia({ caixaId: 'cx1', idClienteApp: 'fx-1', naoVistas: [], esperado: { dinheiro: 255, pix: 0, cartao: 0 }, contados: { dinheiro: 200, pix: 0, cartao: 0 } })
  const r = await chamar('caixa-conferencia-confirmar', { dinheiro: '255', pix: '0', cartao: '0' })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(recebido.c, '/api/admin/caixa/fechar')
  assert.strictEqual(recebido.corpo.confirmar, true)
  assert.strictEqual(recebido.corpo.id_cliente_app, 'fx-1')
  assert.strictEqual(recebido.corpo.dinheiro_contado, 255)
  assert.strictEqual(fila.conferencia(), null)
})

test('confirmar precisa de internet — sem ela, diz isso e mantém a conferência', async () => {
  const { fila, chamar } = montar({ online: () => false, enviarComStatus: async () => ({ status: 0, body: null }) })
  fila.guardarConferencia({ caixaId: 'cx1', idClienteApp: 'fx-1', naoVistas: [], esperado: {}, contados: {} })
  const r = await chamar('caixa-conferencia-confirmar', { dinheiro: '1', pix: '0', cartao: '0' })
  assert.strictEqual(r.ok, false)
  assert.match(r.erro, /internet/)
  assert.ok(fila.conferencia())
})

test('a resposta do fechamento que subiu pela FILA também vira conferência', () => {
  const { fila } = montar({ online: () => true, enviarComStatus: async () => ({ status: 200, body: {} }) })
  const item = { tipo: 'fechamento', corpo: { id_cliente_app: 'fx-9', dinheiro_contado: 200, pix_contado: 0, cartao_contado: 0 } }
  C.aoSubirDoCaixa(fila)(item, { ok: true, definitivo: false, caixaId: 'cx1', naoVistas: [{ id: 'x' }], esperado: { dinheiro: 255, pix: 0, cartao: 0 } })
  assert.strictEqual(fila.conferencia().idClienteApp, 'fx-9')
  C.aoSubirDoCaixa(fila)(item, { ok: true, definitivo: true })
  assert.strictEqual(fila.conferencia(), null)
  C.aoSubirDoCaixa(fila)({ tipo: 'venda', corpo: {} }, { numero: 1 })
})

test('entrega e mesa continuam só com internet: sem painel, nada é lançado — e a tela sabe', async () => {
  const { fila, chamar } = montar({ online: () => false, enviarComStatus: async () => ({ status: 0, body: null }), enviar: async () => { throw new Error('view morta') } })
  const r = await chamar('entrega-concluir', { entrega: { id: 'p1', pedido: '12', valor: 10, forma: 'dinheiro' }, forma: 'dinheiro' })
  assert.strictEqual(r.ok, false)
  assert.match(r.erro, /Nada foi lançado/)
  assert.strictEqual(fila.tamanho(), 0)
})
