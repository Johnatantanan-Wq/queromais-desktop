const { test } = require('node:test')
const assert = require('node:assert')
const { avanco, ETAPA_DEPOIS, ehLocal } = require('../src-electron/pedido-acoes')
const { criarRegistro } = require('../src-electron/pedidos-locais')

test('aceitar manda o pedido para produção, pela rota do painel', () => {
  const r = avanco({ id: 'p1', tipo: 'balcao' }, 'analise')
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.caminho, '/api/admin/pedidos/p1/status')
  assert.deepStrictEqual(r.corpo, { status: 'em_producao' })
})

test('a sequência inteira do quadro bate com os status do painel', () => {
  const p = { id: 'p1', tipo: 'balcao' }
  assert.strictEqual(avanco(p, 'analise').corpo.status, 'em_producao')
  assert.strictEqual(avanco(p, 'producao').corpo.status, 'pronto')
  assert.strictEqual(avanco(p, 'pronto').corpo.status, 'em_entrega')
  assert.strictEqual(avanco(p, 'transito').corpo.status, 'entregue')
})

test('entrega sem entregador é recusada AQUI — o painel devolveria 422', () => {
  const r = avanco({ id: 'p1', tipo: 'entrega', motoboyId: null }, 'pronto')
  assert.strictEqual(r.ok, false)
  assert.ok(/entregador/i.test(r.motivo), r.motivo)
})

test('com entregador escolhido, despacha', () => {
  const r = avanco({ id: 'p1', tipo: 'entrega', motoboyId: 'm1' }, 'pronto')
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(r.corpo, { status: 'em_entrega' })
})

test('mesa não "sai para entrega": é servida, e tem rota própria', () => {
  const r = avanco({ id: 'p1', canal: 'Mesa 7' }, 'pronto')
  assert.strictEqual(r.caminho, '/api/admin/pedidos/p1/servir')
  assert.strictEqual(r.status, 'servido')
  assert.strictEqual(ehLocal({ tipo: 'consumo_local' }), true)
  assert.strictEqual(ehLocal({ canal: 'Delivery' }), false)
})

test('pedido sem id não vira chamada com "undefined" na URL', () => {
  const r = avanco({ numero: '9' }, 'analise')
  assert.strictEqual(r.ok, false)
  assert.ok(!/undefined/.test(r.motivo || ''))
})

test('quem já está entregue não avança', () => {
  assert.strictEqual(avanco({ id: 'p1' }, 'entregue').ok, false)
  assert.strictEqual(ETAPA_DEPOIS.entregue, undefined)
})

// ── demonstração: o quadro anda sem servidor ──
test('em demonstração o cartão muda de coluna e FICA lá', () => {
  const reg = criarRegistro()
  const dados = { itens: [{ numero: '12', etapa: 'analise', status: 'Novo' }, { numero: '13', etapa: 'producao' }] }
  assert.strictEqual(reg.avancar('12', 'analise'), 'producao')
  const depois = reg.aplicar(dados)
  assert.strictEqual(depois.itens[0].etapa, 'producao')
  assert.strictEqual(depois.itens[0].status, 'Em produção')
  assert.strictEqual(depois.itens[1].etapa, 'producao', 'quem não foi tocado não muda')
  // o dado de origem continua intacto — o registro não escreve na lista de fora
  assert.strictEqual(dados.itens[0].etapa, 'analise')
})

test('em demonstração, avançar duas vezes leva duas colunas adiante', () => {
  const reg = criarRegistro()
  reg.avancar('12', 'analise')
  reg.avancar('12', 'producao')
  const d = reg.aplicar({ itens: [{ numero: '12', etapa: 'analise' }] })
  assert.strictEqual(d.itens[0].etapa, 'pronto')
})

test('sem nenhuma mudança, a lista volta igualzinha', () => {
  const reg = criarRegistro()
  const dados = { itens: [{ numero: '12', etapa: 'analise' }] }
  assert.strictEqual(reg.aplicar(dados), dados)
})
