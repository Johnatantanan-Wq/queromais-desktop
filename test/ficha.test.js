const { test } = require('node:test')
const assert = require('node:assert')
const F = require('../renderer/elo/ficha')

const pedido = { numero: '1042', cliente: 'Maria Silva', canal: 'Delivery', hora: '20:12', valor: 89.9,
  pagamento: 'Pix', etapa: 'producao', entrouHaMin: 8, itens: ['1x Pizza Calabresa G', '1x Refrigerante 2L'],
  endereco: 'Rua das Flores, 120 — Centro', telefone: '(75) 98811-0001', taxa: 8, desconto: 5 }

test('a ficha do pedido traz cabeçalho, itens e a conta fechando', () => {
  const h = F.fichaPedido(pedido)
  assert.ok(h.includes('#1042') && h.includes('Maria Silva'))
  assert.ok(h.includes('Pizza Calabresa'))
  assert.ok(h.includes('Entrega') && h.includes('8,00'))
  assert.ok(h.includes('Desconto') && h.includes('5,00'))
  assert.ok(h.includes('89,90'))
})

test('a ficha do pedido tem os botões de ação, incluindo imprimir a comanda', () => {
  const h = F.fichaPedido(pedido)
  assert.ok(h.includes('data-acao="ficha:imprimir:1042"'))
  assert.ok(/imprimir comanda/i.test(h))
})

test('pedido de delivery mostra endereço; de balcão, não', () => {
  assert.ok(F.fichaPedido(pedido).includes('Rua das Flores'))
  const balcao = F.fichaPedido({ ...pedido, canal: 'Balcão', endereco: null })
  assert.ok(!balcao.includes('Rua das Flores'))
})

test('a ficha do cliente traz contato, resumo e últimos pedidos', () => {
  const h = F.fichaCliente({ nome: 'Maria Silva', telefone: '(75) 98811-0001', bairro: 'Centro',
    pedidos: 42, total: 2480.3, ultimo: 'hoje', ultimos: [{ numero: '1042', data: 'hoje', valor: 89.9 }] })
  assert.ok(h.includes('Maria Silva') && h.includes('(75) 98811-0001'))
  assert.ok(h.includes('42') && h.includes('2.480,30'))
  assert.ok(h.includes('#1042'))
})

test('a ficha do produto traz preço, vendas e ficha técnica', () => {
  const h = F.fichaProduto({ nome: 'Pizza Calabresa G', categoria: 'Pizzas salgadas', preco: 59.9,
    vendas7d: 128, situacao: 'Disponível', custo: 18.4, insumos: ['Muçarela 250g', 'Calabresa 120g'] })
  assert.ok(h.includes('Pizza Calabresa G') && h.includes('59,90'))
  assert.ok(h.includes('128'))
  assert.ok(h.includes('Muçarela'))
  assert.ok(/margem/i.test(h))
})

test('o painel embrulha a ficha com título e botão de fechar', () => {
  const h = F.painel('Pedido #1042', '<p>x</p>')
  assert.ok(h.includes('Pedido #1042'))
  assert.ok(h.includes('data-fechar-ficha'))
  assert.ok(h.includes('<p>x</p>'))
})

test('ficha de item que não existe não quebra', () => {
  assert.ok(/não encontrad/i.test(F.fichaPedido(null)))
  assert.ok(/não encontrad/i.test(F.fichaCliente(null)))
})

// ── F3.4: conferência do fechamento e a fila ───────────────────────────────
test('a ficha de conferência lista o que o app não viu, o esperado novo, e deixa confirmar ou deixar para depois', () => {
  const h = F.fichaConferencia({
    caixaId: 'cx1', em: '2026-09-12T01:30:00Z',
    naoVistas: [{ id: 'x', tipo: 'venda', forma: 'pix', valor: 55, descricao: 'Pedido #12', criado_em: '2026-09-12T01:10:00Z' }],
    esperado: { dinheiro: 255, pix: 0, cartao: 0 }, contados: { dinheiro: 200, pix: 0, cartao: 0 },
  })
  assert.ok(h.includes('Pedido #12') && h.includes('55,00'))
  assert.ok(h.includes('255,00'), 'o esperado depois do que o app não viu')
  assert.ok(/data-campo="dinheiro" value="200"/.test(h), 'o contado vem preenchido para conferir')
  assert.ok(h.includes('data-acao="caixa:conferencia:confirmar"') && h.includes('data-acao="caixa:conferencia:depois"'))
  assert.ok(/não viu/.test(h))
})

test('a ficha da fila mostra cada operação, o erro de quem não subiu, e as saídas: tentar, exportar, desistir', () => {
  const h = F.fichaFila({ pendentes: 1, comErro: 1, total: 30, ultimoErro: 'Caixa fechado', itens: [
    { id: 'a', tipo: 'venda', provisorio: 'L-1', cliente: 'Ana', valor: 30, erro: null, criadoEm: '2026-09-12T01:00:00Z' },
    { id: 'b', tipo: 'movimentacao', provisorio: null, cliente: 'Sangria', valor: 10, erro: 'Caixa fechado', criadoEm: '2026-09-12T01:05:00Z' },
  ] })
  assert.ok(h.includes('L-1') && h.includes('Ana') && h.includes('30,00'))
  assert.ok(h.includes('Caixa fechado'))
  assert.ok(h.includes('data-acao="fila:remover:b"'), 'desistir só do que deu erro')
  assert.ok(!h.includes('data-acao="fila:remover:a"'), 'o que ainda vai subir não se apaga')
  assert.ok(h.includes('data-acao="fila:tentar"') && h.includes('data-acao="fila:exportar"'))
})

// ── Fichas de Configurações/Financeiro/Gestão: os helpers de formulário ────
test('campoSelecao desenha um select com a opção atual marcada', () => {
  const h = F.campoSelecao('Tipo', 'tipo', [{ v: 'banco', r: 'Banco' }, { v: 'carteira', r: 'Carteira' }], 'carteira', 'onde cai')
  assert.ok(/<select data-campo="tipo"/.test(h))
  assert.ok(/value="carteira" selected/.test(h))
  assert.ok(!/value="banco" selected/.test(h))
  assert.ok(h.includes('onde cai'))
})

test('campoMarcar é uma caixa de marcar com o estado atual', () => {
  assert.ok(/<input type="checkbox" data-campo="ativo" checked/.test(F.campoMarcar('Ativo', 'ativo', true)))
  assert.ok(!/checked/.test(F.campoMarcar('Ativo', 'ativo', false)))
  assert.ok(F.campoMarcar('Ativo', 'ativo', false, 'liga ou desliga').includes('liga ou desliga'))
})

test('campoArea é um texto de várias linhas com o valor atual', () => {
  const h = F.campoArea('Observações', 'obs', 'linha 1')
  assert.ok(/<textarea data-campo="obs"/.test(h) && h.includes('linha 1'))
})
