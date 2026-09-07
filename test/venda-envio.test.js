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
