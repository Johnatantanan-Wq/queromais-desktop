// A venda do app vira pedido no painel. O que se testa aqui é a conversão: é ela que
// decide o que vai como forma do PEDIDO e o que vai como forma do CAIXA — errar isso
// faz o fechamento não bater no fim do dia.
const { test } = require('node:test')
const assert = require('node:assert')
const V = require('../src-electron/venda-envio')

const venda = (extra) => ({
  tipo: 'retirada', cliente: 'Ana', telefone: '(75) 98811-0001', forma: 'dinheiro',
  itens: [{ id: 'p1', nome: 'Pizza G', preco: 59.9, qtd: 2 }], ...extra,
})

test('a venda vira o corpo que o painel espera', () => {
  const r = V.paraOPainel(venda())
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.corpo.tipo, 'retirada')
  assert.strictEqual(r.corpo.cliente_nome, 'Ana')
  assert.deepStrictEqual(r.corpo.items, [
    { produto_id: 'p1', nome: 'Pizza G', preco_base: 59.9, imagem_url: null, qtd: 2, sabores: [] },
  ])
})

test('crédito e débito não existem como forma de PEDIDO — viajam na forma do caixa', () => {
  const credito = V.paraOPainel(venda({ forma: 'credito' })).corpo
  assert.strictEqual(credito.forma_pagamento, 'cartao_entrega')
  assert.strictEqual(credito.forma_caixa, 'credito')
  const debito = V.paraOPainel(venda({ forma: 'debito' })).corpo
  assert.strictEqual(debito.forma_caixa, 'debito')
  const pix = V.paraOPainel(venda({ forma: 'pix' })).corpo
  assert.strictEqual(pix.forma_pagamento, 'pix')
})

test('troco só vai em dinheiro — em cartão confundiria o fechamento', () => {
  assert.strictEqual(V.paraOPainel(venda({ forma: 'dinheiro', trocoPara: 100 })).corpo.troco_para, 100)
  assert.strictEqual(V.paraOPainel(venda({ forma: 'credito', trocoPara: 100 })).corpo.troco_para, null)
  assert.strictEqual(V.paraOPainel(venda({ forma: 'dinheiro', trocoPara: 0 })).corpo.troco_para, null)
})

test('entrega leva endereço; retirada não manda endereço vazio', () => {
  const entrega = V.paraOPainel(venda({ tipo: 'entrega', bairro: 'Centro', endereco: 'Rua A, 100' })).corpo
  assert.deepStrictEqual(entrega.endereco, { rua: 'Rua A, 100', numero: '', bairro: 'Centro', cidade: '', uf: '', cep: '' })
  assert.strictEqual(V.paraOPainel(venda()).corpo.endereco, undefined)
})

test('recusa antes de mandar o que o painel rejeitaria', () => {
  assert.match(V.paraOPainel({ itens: [] }).erro, /ao menos um item/)
  assert.match(V.paraOPainel(venda({ cliente: '  ' })).erro, /nome do cliente/)
  const semId = V.paraOPainel(venda({ itens: [{ nome: 'Pizza', preco: 10, qtd: 1 }] }))
  assert.strictEqual(semId.ok, false)
  assert.match(semId.erro, /sem cadastro no cardápio: Pizza/)
})

test('o canal devolve o número do pedido que o painel criou', async () => {
  let recebido = null
  const canais = new Map()
  V.registrar({
    ipcMain: { handle: (c, fn) => canais.set(c, fn) },
    enviar: async (caminho, corpo) => { recebido = { caminho, corpo }; return { id: 'x', numero: 1044, total: 119.8 } },
  })
  const r = await canais.get('venda-registrar')(null, venda())
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.numero, 1044)
  assert.strictEqual(recebido.caminho, '/api/admin/venda')
})

test('sem conexão, a venda NÃO se perde em silêncio — a tela recebe o motivo', async () => {
  const canais = new Map()
  V.registrar({
    ipcMain: { handle: (c, fn) => canais.set(c, fn) },
    enviar: async () => { throw new Error('view morta') },
  })
  const r = await canais.get('venda-registrar')(null, venda())
  assert.strictEqual(r.ok, false)
  assert.match(r.erro, /Sem conexão/)
})

test('erro do painel chega à tela com a mensagem dele', async () => {
  const canais = new Map()
  V.registrar({
    ipcMain: { handle: (c, fn) => canais.set(c, fn) },
    enviar: async () => ({ error: 'Caixa fechado' }),
  })
  const r = await canais.get('venda-registrar')(null, venda())
  assert.strictEqual(r.ok, false)
  assert.strictEqual(r.erro, 'Caixa fechado')
})

test('o item que o PDV monta serve direto para o painel', () => {
  // Regressão: o carrinho guardava só nome e preço, e o painel exige produto_id.
  const doCarrinho = { id: 'demo-p1', nome: 'Pizza', preco: 59.9, qtd: 1 }
  const r = V.paraOPainel({ tipo: 'retirada', cliente: 'Ana', forma: 'dinheiro', itens: [doCarrinho] })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.corpo.items[0].produto_id, 'demo-p1')
})

// ── F3.3: vender SEM internet ──────────────────────────────────────────────
// A venda nasce no app com id próprio e número provisório, entra na fila e sobe
// quando a rede volta. O que decide é o monitor de rede — e, se a rede cair no meio
// do envio, o resultado é o mesmo: a venda não se perde.
const { criarFila } = require('../src-electron/fila-escrita')
const storeMem = () => { const m = new Map(); return { get: (k) => m.get(k) || null, set: (k, v) => { m.set(k, v); return { ok: true } } } }
function montar({ online, enviarComStatus }) {
  const canais = new Map()
  const fila = criarFila({ store: storeMem(), chave: 'fila|L1', gerarId: () => 'g', agora: () => Date.parse('2026-09-12T01:00:00Z') })
  let n = 0
  V.registrar({
    ipcMain: { handle: (c, fn) => canais.set(c, fn) },
    enviar: async () => { throw new Error('não deveria usar o enviar antigo') },
    enviarComStatus, fila, online, gerarId: () => 'uuid-' + (++n), agora: () => Date.parse('2026-09-12T01:00:00Z'),
  })
  return { fila, fechar: (v) => canais.get('venda-registrar')(null, v) }
}

test('sem internet, a venda em dinheiro entra na fila com número provisório — e o corpo já leva o id e o carimbo', async () => {
  const { fila, fechar } = montar({ online: () => false, enviarComStatus: async () => { throw new Error('não deveria tentar') } })
  const r = await fechar(venda({ total: 119.8 }))
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.provisorio, true)
  assert.strictEqual(r.numero, 'L-1')
  assert.strictEqual(r.id_cliente_app, 'uuid-1')
  const item = fila.pendentes()[0]
  assert.strictEqual(item.corpo.id_cliente_app, 'uuid-1')
  assert.strictEqual(item.corpo.criado_no_app_em, '2026-09-12T01:00:00.000Z')
  assert.strictEqual(item.corpo.forma_pagamento, 'dinheiro')
  assert.deepStrictEqual(item.resumo, { cliente: 'Ana', telefone: '(75) 98811-0001', total: 119.8, forma: 'dinheiro', tipo: 'retirada', itens: ['2× Pizza G'], bairro: '', observacao: '' })
})

test('sem internet, Pix e cartão são recusados com o motivo — nada entra na fila', async () => {
  const { fila, fechar } = montar({ online: () => false, enviarComStatus: async () => ({ status: 201, body: {} }) })
  for (const forma of ['pix', 'credito', 'debito']) {
    const r = await fechar(venda({ forma }))
    assert.strictEqual(r.ok, false)
    assert.match(r.erro, /Sem internet/)
    assert.match(r.erro, /dinheiro/)
  }
  assert.strictEqual(fila.tamanho(), 0)
})

test('com internet, a venda sobe na hora — e o corpo também leva o id (o servidor precisa dele para reconhecer o reenvio)', async () => {
  let recebido = null
  const { fila, fechar } = montar({ online: () => true, enviarComStatus: async (caminho, corpo) => { recebido = corpo; return { status: 201, body: { id: 'x', numero: 1044, total: 119.8 } } } })
  const r = await fechar(venda())
  assert.deepStrictEqual({ ok: r.ok, numero: r.numero, provisorio: r.provisorio }, { ok: true, numero: 1044, provisorio: undefined })
  assert.strictEqual(recebido.id_cliente_app, 'uuid-1')
  assert.strictEqual(fila.tamanho(), 0)
})

test('a rede cai NO MEIO do envio: a venda em dinheiro vai para a fila em vez de se perder', async () => {
  const { fila, fechar } = montar({ online: () => true, enviarComStatus: async () => { throw new Error('rede') } })
  const r = await fechar(venda())
  assert.strictEqual(r.provisorio, true)
  assert.strictEqual(fila.tamanho(), 1)
  const r2 = await fechar(venda({ forma: 'pix' }))
  assert.strictEqual(r2.ok, false, 'Pix com a rede caindo: pede para trocar a forma, não enfileira')
  assert.match(r2.erro, /dinheiro/)
  assert.strictEqual(fila.tamanho(), 1)
})

test('sessão expirada (401) e servidor fora (5xx): a venda já aconteceu no balcão — entra na fila, qualquer forma', async () => {
  for (const status of [401, 503]) {
    const { fila, fechar } = montar({ online: () => true, enviarComStatus: async () => ({ status, body: { error: 'x' } }) })
    const r = await fechar(venda({ forma: 'credito' }))
    assert.strictEqual(r.provisorio, true, 'status ' + status)
    assert.strictEqual(fila.tamanho(), 1)
  }
})

test('o painel recusando (4xx) continua sendo erro na tela — não vai para a fila', async () => {
  const { fila, fechar } = montar({ online: () => true, enviarComStatus: async () => ({ status: 422, body: { error: 'Caixa fechado' } }) })
  const r = await fechar(venda())
  assert.strictEqual(r.ok, false)
  assert.strictEqual(r.erro, 'Caixa fechado')
  assert.strictEqual(fila.tamanho(), 0)
})

test('"já existe" do servidor é sucesso normal para a tela', async () => {
  const { fechar } = montar({ online: () => true, enviarComStatus: async () => ({ status: 200, body: { id: 'x', numero: 1044, total: 119.8, repetida: true } }) })
  const r = await fechar(venda())
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.numero, 1044)
})
