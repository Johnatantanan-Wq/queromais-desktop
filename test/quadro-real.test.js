const { test } = require('node:test')
const assert = require('node:assert')
const Q = require('../renderer/elo/tela-quadro')

const dados = {
  kpis: { online: 0, hoje: 37, cancelados: 5, analise: 0, producao: 23, prontos: 1, entregues: 13, tempoMedio: 129, meta: 15 },
  lojaAberta: true,
  aceiteAutomatico: true,
  tempos: { balcao: 30, delivery: 45 },
  itens: [
    { numero: '12', etapa: 'producao', cliente: 'Luemily', canal: 'Retirada', forma: 'Dinheiro', valor: 19.99, esperaMin: 3, pessoas: 1 },
    { numero: '32', etapa: 'producao', cliente: 'Mesa 27', canal: 'Mesa', forma: null, contaAberta: true, valor: 14.90, esperaMin: 3 },
    { numero: '1', etapa: 'pronto', cliente: 'Mesa 16', canal: 'Mesa', contaAberta: true, valor: 7.99, esperaMin: 308 },
    { numero: '10', etapa: 'entregue', cliente: 'Franciele Silva', canal: 'Delivery', forma: 'Cartão', valor: 66.97, esperaMin: 45, pessoas: 1 },
  ],
}

test('as cinco colunas do painel, com contador', () => {
  const h = Q.htmlQuadro(dados, {})
  for (const t of ['Em análise', 'Em produção', 'Prontos para entrega', 'Em trânsito', 'Entregue']) {
    assert.ok(h.includes(t), 'falta a coluna ' + t)
  }
})

test('a faixa de indicadores traz o que o painel mostra, inclusive o tempo médio e a meta', () => {
  const h = Q.htmlQuadro(dados, {})
  assert.ok(h.includes('37') && /Pedidos hoje/i.test(h))
  assert.ok(h.includes('129') && /meta 15/i.test(h))
  assert.ok(h.includes('5') && /Cancelados/i.test(h))
})

test('tempo médio acima da meta fica em vermelho', () => {
  const h = Q.htmlQuadro(dados, {})
  const bloco = h.split('meta 15')[0].slice(-400)
  assert.ok(/b42318/.test(bloco), 'tempo médio 129 com meta 15 precisa gritar')
})

test('os filtros por canal e por forma de pagamento aparecem', () => {
  const h = Q.htmlQuadro(dados, {})
  for (const f of ['todos', 'delivery', 'retirada', 'local', 'pix', 'cartao', 'dinheiro']) {
    assert.ok(h.includes('data-filtro-pedido="' + f + '"'), 'falta o filtro ' + f)
  }
})

test('o cartão traz número, tempo, cliente, etiquetas, valor e a ação da etapa', () => {
  const h = Q.htmlQuadro(dados, {})
  const c = h.split('data-pedido="12"')[1].split('data-pedido=')[0]
  assert.ok(c.includes('#12') && c.includes('Luemily'))
  assert.ok(c.includes('Retirada') && c.includes('Dinheiro'))
  assert.ok(c.includes('19,99'))
  assert.ok(/Marcar pronto/.test(c))
})

test('pedido de mesa mostra "conta aberta" e a ação é servir', () => {
  const h = Q.htmlQuadro(dados, {})
  const c = h.split('data-pedido="1"')[1].split('data-pedido=')[0]
  assert.ok(/Conta aberta/i.test(c))
  assert.ok(/Servir/.test(c), 'pronto de mesa se serve, não se entrega')
})

test('a coluna Em análise traz o painel de tempos e aceite automático', () => {
  const h = Q.htmlQuadro(dados, {})
  assert.ok(/Balcão/.test(h) && /30 min/.test(h) && /45 min/.test(h))
  assert.ok(/aceitos automaticamente/i.test(h))
})

test('busca e chave de loja aberta estão no topo', () => {
  const h = Q.htmlQuadro(dados, {})
  assert.ok(h.includes('id="buscaPedidos"'))
  assert.ok(/Loja aberta/i.test(h))
  assert.ok(h.includes('data-acao="venda-manual"'))
})

test('filtro por canal esconde o que não é do canal', () => {
  const h = Q.htmlQuadro(dados, { filtroPedido: 'delivery' })
  assert.ok(h.includes('Franciele Silva'))
  assert.ok(!h.includes('Luemily'), 'retirada não aparece no filtro de delivery')
})

test('sem dados não quebra', () => {
  assert.ok(/sem dados/i.test(Q.htmlQuadro(null, {})))
})

test('consumo local troca os rótulos: prontos para SERVIR, servidos, fechados', () => {
  const h = Q.htmlQuadro(dados, { consumoLocal: true })
  assert.ok(h.includes('Prontos para servir') && h.includes('Servidos') && h.includes('Fechados'))
  assert.ok(!h.includes('Prontos para entrega'))
})

test('cada cartão carrega o número, para o clique abrir a ficha certa', () => {
  const h = Q.htmlQuadro(dados, {})
  assert.ok(h.includes('data-pedido="12"') && h.includes('data-pedido="1"'))
})

test('a busca filtra por número e por cliente', () => {
  assert.ok(Q.htmlQuadro(dados, { termoPedido: 'luemily' }).includes('Luemily'))
  assert.ok(!Q.htmlQuadro(dados, { termoPedido: 'luemily' }).includes('Franciele'))
  assert.ok(Q.htmlQuadro(dados, { termoPedido: '10' }).includes('Franciele'))
})

test('coluna vazia diz que não há pedido (menos a de análise, que tem a configuração)', () => {
  const h = Q.htmlQuadro({ ...dados, itens: [] }, {})
  assert.ok(/Nenhum pedido no momento/.test(h))
  assert.ok(/aceitos automaticamente/i.test(h), 'a configuração continua na coluna de análise')
})
