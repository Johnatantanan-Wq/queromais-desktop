const { test } = require('node:test')
const assert = require('node:assert')
const D = require('../renderer/elo/tela-despacho')

const dados = {
  contadores: { aguardando: 2, rota: 3, entregue: 24 },
  itens: [
    { pedido: '1041', cliente: 'João P.', bairro: 'Jardim América', entregador: null, situacao: 'Aguardando', saiu: null, valor: 54, forma: 'pix' },
    { pedido: '1040', cliente: 'Carla N.', bairro: 'Vila Nova', entregador: 'Tiago', situacao: 'Em rota', saiu: '20:02', valor: 132.4, forma: 'dinheiro' },
  ],
  rotas: [
    { id: 'r1', entregador: 'Tiago', saiu: '19:40', entregas: 3, dinheiroEsperado: 197.3, fundoTroco: 50, status: 'aberta' },
    { id: 'r2', entregador: 'Wesley', saiu: '18:10', entregas: 4, dinheiroEsperado: 288.0, fundoTroco: 50, dinheiroContado: 285, diferenca: -3, status: 'fechada' },
  ],
}

test('mostra as duas visões: entregas e rotas', () => {
  const h = D.htmlDespacho(dados, {})
  assert.ok(h.includes('data-visao="entregas"') && h.includes('data-visao="rotas"'))
})

test('a rota aberta mostra o dinheiro que o entregador leva', () => {
  const h = D.htmlDespacho(dados, { visao: 'rotas' })
  assert.ok(h.includes('Tiago') && h.includes('197,30'))
  assert.ok(/troco/i.test(h))
})

test('rota fechada mostra o acerto: esperado, contado e diferença', () => {
  const h = D.htmlDespacho(dados, { visao: 'rotas' })
  const linha = h.split('data-linha="r2"')[1].split('data-linha=')[0]
  assert.ok(/285,00/.test(linha), 'o contado precisa aparecer')
  assert.ok(/b42318/.test(linha), 'diferença negativa em vermelho')
})

test('rota aberta tem o botão de fechar/acertar', () => {
  const h = D.htmlDespacho(dados, { visao: 'rotas' })
  assert.ok(h.includes('data-acao="rota:fechar:r1"'))
})

test('nas entregas, o que está aguardando pode ser despachado em lote', () => {
  const h = D.htmlDespacho(dados, { visao: 'entregas' })
  assert.ok(h.includes('data-acao="despachar-lote"'))
  assert.ok(/2 aguardando|aguardando 2/i.test(h))
})

test('sem rota nenhuma, explica em vez de mostrar tabela vazia', () => {
  const h = D.htmlDespacho({ ...dados, rotas: [] }, { visao: 'rotas' })
  assert.ok(/nenhuma rota/i.test(h))
})

test('sem dados não quebra', () => {
  assert.ok(/sem dados/i.test(D.htmlDespacho(null, {})))
})
