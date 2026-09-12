const { test } = require('node:test')
const assert = require('node:assert')
const V = require('../renderer/elo/tela-venda')
const R = require('../src-electron/vendas-locais')

const cardapio = {
  categorias: [{ nome: 'Pizzas', itens: [
    { nome: 'Pizza Calabresa G', preco: 59.90 },
    { nome: 'Pizza Portuguesa G', preco: 62.90 },
    { nome: 'Pizza Esgotada', preco: 40, esgotado: true },
  ] }],
  clientes: [{ nome: 'Maria Silva', telefone: '(75) 98811-0001', bairro: 'Centro' }],
  taxasBairro: { Centro: 7.00, 'Praia de Guaibim': 5.00 },
}
const comItens = (extra) => ({ ...V.vendaVazia(), itens: [{ nome: 'Pizza Calabresa G', preco: 59.90, qtd: 2 }], ...extra })

test('a conta do pedido: produtos + taxa do bairro, e o troco a separar', () => {
  const v = comItens({ tipo: 'entrega', bairro: 'Centro', forma: 'dinheiro', trocoPara: 150 })
  const t = V.totais(v, cardapio.taxasBairro)
  assert.strictEqual(t.produtos, 119.80)
  assert.strictEqual(t.entrega, 7.00)
  assert.strictEqual(t.total, 126.80)
  assert.strictEqual(Math.round(t.troco * 100) / 100, 23.20)
})

test('retirada e consumo local não cobram entrega', () => {
  assert.strictEqual(V.totais(comItens({ tipo: 'retirada', bairro: 'Centro' }), cardapio.taxasBairro).entrega, 0)
  assert.strictEqual(V.totais(comItens({ tipo: 'consumo_local', bairro: 'Centro' }), cardapio.taxasBairro).entrega, 0)
})

test('o app não deixa fechar venda pela metade — e diz o que falta', () => {
  assert.match(V.oQueFalta(V.vendaVazia(), {}), /ao menos um item/)
  assert.match(V.oQueFalta(comItens({ tipo: 'entrega' }), {}), /nome do cliente/)
  assert.match(V.oQueFalta(comItens({ tipo: 'entrega', nome: 'Ana' }), cardapio.taxasBairro), /bairro/)
  assert.match(V.oQueFalta(comItens({ tipo: 'entrega', nome: 'Ana', bairro: 'Centro' }), cardapio.taxasBairro), /endereço/)
  assert.strictEqual(V.oQueFalta(comItens({ tipo: 'retirada' }), cardapio.taxasBairro), null,
    'retirada com item já pode fechar')
})

test('troco menor que o total é erro — é o engano que faz falta no caixa', () => {
  const v = comItens({ tipo: 'retirada', forma: 'dinheiro', trocoPara: 50 })
  assert.match(V.oQueFalta(v, cardapio.taxasBairro), /troco não pode ser menor/)
})

test('a tela abre no passo do cliente, com os três tipos', () => {
  const h = V.htmlVenda(cardapio, {})
  assert.ok(h.includes('Venda manual') && h.includes('1. cliente'))
  assert.ok(h.includes('data-venda-tipo="entrega"') && h.includes('data-venda-tipo="consumo_local"'))
})

test('produto esgotado não aparece para vender', () => {
  const h = V.htmlVenda(cardapio, { venda: { ...V.vendaVazia(), etapa: 'produtos' } })
  assert.ok(h.includes('Pizza Calabresa G') && !h.includes('Pizza Esgotada'))
})

test('a busca filtra o cardápio da venda', () => {
  const h = V.htmlVenda(cardapio, { venda: { ...V.vendaVazia(), etapa: 'produtos', busca: 'portug' } })
  assert.ok(h.includes('Pizza Portuguesa G') && !h.includes('Pizza Calabresa G'))
})

test('o carrinho mostra quantidade, unitário e subtotal', () => {
  const h = V.htmlVenda(cardapio, { venda: comItens({ etapa: 'produtos' }) })
  assert.ok(h.includes('R$ 59,90') && h.includes('R$ 119,80'))
  assert.ok(h.includes('data-venda-menos="Pizza Calabresa G"'), 'dá para tirar uma unidade')
})

test('no pagamento, o botão de fechar só liga quando a venda está completa', () => {
  const faltando = V.htmlVenda(cardapio, { venda: comItens({ etapa: 'pagamento', tipo: 'entrega' }) })
  assert.ok(faltando.includes('disabled') && /nome do cliente/.test(faltando))
  const pronta = V.htmlVenda(cardapio, { venda: comItens({ etapa: 'pagamento', tipo: 'retirada' }) })
  assert.ok(pronta.includes('data-acao="venda:fechar"') && pronta.includes('R$ 119,80'))
})

test('fechada, a tela vira recibo com o número e o troco', () => {
  const h = V.htmlVenda(cardapio, { venda: comItens({ numero: 1044, tipo: 'retirada', forma: 'dinheiro', trocoPara: 150 }) })
  assert.ok(h.includes('#1044') && /registrada/.test(h))
  assert.ok(/Troco/.test(h) && h.includes('R$ 30,20'))
  assert.ok(h.includes('data-acao="venda:nova"') && h.includes('venda:imprimir:1044'))
})

// ── o registro que grava a venda ──
test('o registro numera em sequência e devolve a venda pronta', () => {
  const reg = R.criarRegistro({ proximoNumero: 1044 })
  const a = reg.registrar({ tipo: 'retirada', cliente: 'Ana', itens: [{ nome: 'X', qtd: 1, preco: 10 }], total: 10, produtos: 10 })
  const b = reg.registrar({ tipo: 'retirada', cliente: '', itens: [{ nome: 'Y', qtd: 2, preco: 5 }], total: 10, produtos: 10 })
  assert.strictEqual(a.numero, 1044)
  assert.strictEqual(b.numero, 1045)
  assert.strictEqual(b.venda.cliente, 'Consumidor', 'venda sem nome vira Consumidor, como no balcão')
  assert.strictEqual(reg.listar().length, 2)
  assert.strictEqual(reg.total(), 20)
})

test('o registro recusa venda vazia, zerada ou entrega sem nome', () => {
  const reg = R.criarRegistro({ proximoNumero: 1 })
  assert.match(reg.registrar({ itens: [] }).erro, /ao menos um item/)
  assert.match(reg.registrar({ itens: [{ nome: 'X', qtd: 1, preco: 0 }], total: 0 }).erro, /zerado/)
  assert.match(reg.registrar({ tipo: 'entrega', itens: [{ nome: 'X', qtd: 1, preco: 10 }], total: 10 }).erro, /nome do cliente/)
})

test('a venda vira linha do quadro de pedidos e do extrato', () => {
  const reg = R.criarRegistro({ proximoNumero: 1044 })
  const { venda } = reg.registrar({ tipo: 'entrega', cliente: 'Ana', bairro: 'Centro', forma: 'pix',
    itens: [{ nome: 'Pizza', qtd: 2, preco: 30 }], produtos: 60, entrega: 7, total: 67 })
  const pedido = reg.comoPedido(venda)
  assert.strictEqual(pedido.etapa, 'producao', 'venda nova entra em produção')
  assert.strictEqual(pedido.canal, 'Delivery')
  assert.deepStrictEqual(pedido.itens, ['2× Pizza'])
  const mov = reg.comoMovimento(venda)
  assert.strictEqual(mov.direcao, 'entrada')
  assert.strictEqual(mov.categoria, 'venda')
  assert.strictEqual(mov.valor, 67)
  assert.match(mov.origem, /#1044/)
})

// ── teclado de tela ──
// O balcão é operado em tela sensível: sem teclado na tela, não se preenche o cliente.
const APAGAR = String.fromCharCode(8)

test('o teclado numérico tem os dígitos e o apagar', () => {
  const h = V.tecladoDeTela('numerico')
  for (const d of ['1', '5', '9', '0']) {
    assert.ok(h.includes('data-tecla="' + d + '"'), 'falta a tecla ' + d)
  }
  assert.ok(h.includes('data-tecla="' + APAGAR + '"'), 'apagar')
  assert.ok(/background:#fdeaea/.test(h), 'o apagar e o unico vermelho - errar nele doi')
})

test('o teclado de letras e QWERTY, com espaco', () => {
  const h = V.tecladoDeTela('texto')
  for (const l of ['Q', 'W', 'M', 'L']) assert.ok(h.includes('data-tecla="' + l + '"'), 'falta ' + l)
  assert.ok(h.includes('data-tecla=" "'), 'espaco')
  assert.strictEqual(V.TECLAS_LETRAS[0].join(''), 'QWERTYUIOP')
})

test('a tela DIZ para onde a tecla vai - senao digita-se nome no telefone', () => {
  assert.ok(/digitando telefone/.test(V.tecladoDeTela('numerico')))
  assert.ok(/digitando nome/.test(V.tecladoDeTela('texto')))
})

test('o modo escolhido fica marcado nos botoes 123 / ABC', () => {
  const num = V.tecladoDeTela('numerico')
  const depoisNum = num.split('data-modo-teclado="numerico"')[1].slice(0, 200)
  assert.ok(/background:var\(--acento\)/.test(depoisNum), '123 marcado')
  const depoisTxt = num.split('data-modo-teclado="texto"')[1].slice(0, 200)
  assert.ok(!/background:var\(--acento\)/.test(depoisTxt), 'e ABC nao')
})

test('sem modo escolhido, comeca no numerico - telefone e o primeiro a digitar', () => {
  assert.ok(/digitando telefone/.test(V.tecladoDeTela(undefined)))
  assert.ok(/digitando telefone/.test(V.tecladoDeTela(null)))
})

test('o teclado aparece na etapa do cliente, ao lado do formulario', () => {
  const h = V.htmlVenda({ categorias: [], clientes: [], taxasBairro: {} },
    { venda: { ...V.vendaVazia(), etapa: 'cliente' } })
  assert.ok(h.includes('data-tecla='), 'o teclado esta na tela')
  assert.ok(h.includes('data-modo-teclado='), 'com as duas abas')
})

// ── a busca de cliente não pode mexer a tela ──
const LISTA = [
  { nome: 'Maria Silva', telefone: '(75) 98811-0001', bairro: 'Centro' },
  { nome: 'Joao Pereira', telefone: '(75) 98811-0002' },
  { nome: 'Mariana Costa', telefone: '(71) 99999-0003' },
]

test('um digito so nao busca — casaria com o DDD de todo mundo', () => {
  assert.deepStrictEqual(V.clientesQueBatem(LISTA, '7', ''), [])
  assert.deepStrictEqual(V.clientesQueBatem(LISTA, '75988', ''), [], 'ainda nao e um numero')
})

test('com o numero quase inteiro (8 digitos) a busca acha', () => {
  assert.strictEqual(V.MIN_DIGITOS_BUSCA, 8)
  const r = V.clientesQueBatem(LISTA, '98811000', '')
  assert.deepStrictEqual(r.map((c) => c.nome), ['Maria Silva', 'Joao Pereira'])
  assert.strictEqual(V.clientesQueBatem(LISTA, '(75) 98811-0001', '')[0].nome, 'Maria Silva')
})

test('pelo nome, tres letras bastam; duas nao', () => {
  assert.strictEqual(V.MIN_LETRAS_BUSCA, 3)
  assert.deepStrictEqual(V.clientesQueBatem(LISTA, '', 'Ma').map((c) => c.nome), [])
  assert.deepStrictEqual(V.clientesQueBatem(LISTA, '', 'mar').map((c) => c.nome), ['Maria Silva', 'Mariana Costa'])
})

test('o cartao de clientes tem a MESMA altura com e sem resultado', () => {
  const base = { categorias: [], clientes: LISTA, taxasBairro: {} }
  const vazio = V.htmlVenda(base, { venda: { ...V.vendaVazia(), etapa: 'cliente', telefone: '7' } })
  const cheio = V.htmlVenda(base, { venda: { ...V.vendaVazia(), etapa: 'cliente', telefone: '98811000' } })
  const altura = /min-height:196px;max-height:196px;overflow:auto/
  assert.ok(altura.test(vazio), 'sem resultado, a caixa ja reserva o espaco')
  assert.ok(altura.test(cheio), 'com resultado, a lista rola dentro do mesmo espaco')
  assert.ok(!/Clientes que batem/.test(vazio) && /Clientes que batem/.test(cheio))
})

test('a lista de sugestoes nunca passa de cinco — e o resto rola', () => {
  const muitos = Array.from({ length: 9 }, (_, i) => ({ nome: 'Cliente ' + i, telefone: '(75) 98811-000' + i }))
  assert.strictEqual(V.clientesQueBatem(muitos, '98811000', '').length, 5)
})

// ── F3.3: a venda sem internet ─────────────────────────────────────────────
test('sem internet, Pix e cartão ficam esmaecidos com o motivo — dinheiro segue', () => {
  const h = V.htmlVenda(cardapio, { venda: comItens({ etapa: 'pagamento' }), semInternet: true })
  for (const f of ['pix', 'credito', 'debito']) {
    const bt = h.match(new RegExp('<button[^>]*data-venda-forma="' + f + '"[^>]*>'))
    assert.ok(bt, 'botão de ' + f)
    assert.ok(/disabled/.test(bt[0]), f + ' desabilitado')
    assert.ok(/internet/.test(bt[0]), f + ' diz o motivo')
  }
  const dinheiro = h.match(/<button[^>]*data-venda-forma="dinheiro"[^>]*>/)[0]
  assert.ok(!/disabled/.test(dinheiro))
  assert.ok(/Sem internet/.test(h), 'a tela diz que só dinheiro fecha')
  const online = V.htmlVenda(cardapio, { venda: comItens({ etapa: 'pagamento' }), semInternet: false })
  assert.ok(!/data-venda-forma="pix"[^>]*disabled/.test(online))
})

test('o recibo da venda feita sem internet diz que é provisória e que sobe depois', () => {
  const h = V.htmlVenda(cardapio, { venda: comItens({ numero: 'L-3', provisorio: true }) })
  assert.ok(/Venda L-3/.test(h), 'o número provisório aparece como é')
  assert.ok(!/0L-3/.test(h), 'não pode preencher com zero à esquerda')
  assert.ok(/sem internet/i.test(h) && /sobe/.test(h))
  assert.ok(h.includes('data-acao="venda:imprimir:L-3"'))
  assert.ok(!/entrou na Gestão de pedido, no Caixa e no Extrato/.test(h), 'não promete o que ainda não subiu')
})

test('quando a venda sobe, o recibo mostra o número oficial no lugar do provisório', () => {
  const h = V.htmlVenda(cardapio, { venda: comItens({ numero: 'L-3', provisorio: true, numeroOficial: 1051 }) })
  assert.ok(/L-3/.test(h) && /#1051/.test(h))
  assert.ok(/subiu/.test(h))
})

test('o recibo da venda normal continua com o número do painel', () => {
  const h = V.htmlVenda(cardapio, { venda: comItens({ numero: 1044 }) })
  assert.ok(/Venda #1044/.test(h))
})
