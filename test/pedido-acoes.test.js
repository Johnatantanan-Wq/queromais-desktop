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

// ── correção pelo popup da conversa ──
const { correcao } = require('../src-electron/pedido-acoes')
const pedidoBase = {
  id: 'ped-1042', telefone: '(75) 98811-0001',
  enderecoCampos: { rua: 'Rua das Flores', numero: '120', complemento: '', bairro: 'Centro',
    cidade: 'Valença', uf: 'BA', cep: '45400-000', referencia: '' },
}

test('sem mudar nada, não se manda nada ao painel', () => {
  assert.strictEqual(correcao(pedidoBase, {}).ok, false)
  assert.strictEqual(correcao(pedidoBase, { bairro: 'Centro' }).ok, false, 'o mesmo valor não é mudança')
})

test('mudar o bairro manda o endereço INTEIRO — o painel recusa pela metade', () => {
  const r = correcao(pedidoBase, { bairro: 'Praia de Guaibim' })
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(Object.keys(r.corpo.endereco).sort(),
    ['bairro', 'cep', 'cidade', 'complemento', 'numero', 'referencia', 'rua', 'uf'])
  assert.strictEqual(r.corpo.endereco.rua, 'Rua das Flores', 'o que não mudou vai junto')
  assert.strictEqual(r.trocouBairro, true, 'e avisa que a taxa muda')
})

test('campo obrigatório apagado é recusado AQUI, com o nome do campo', () => {
  const r = correcao(pedidoBase, { cidade: '' })
  assert.strictEqual(r.ok, false)
  assert.ok(/Falta preencher: cidade/.test(r.motivo), r.motivo)
  const semDois = correcao(pedidoBase, { cidade: '', cep: '' })
  assert.ok(/cidade, CEP/.test(semDois.motivo), semDois.motivo)
})

test('UF e CEP são conferidos antes de sair', () => {
  assert.ok(/duas letras/.test(correcao(pedidoBase, { uf: 'BAH' }).motivo))
  assert.ok(/8 dígitos/.test(correcao(pedidoBase, { cep: '4540' }).motivo))
  assert.strictEqual(correcao(pedidoBase, { cep: '45400000' }).ok, true, 'CEP sem hífen vale')
})

test('telefone: só vai se mudou, e precisa de DDD', () => {
  assert.strictEqual(correcao(pedidoBase, { telefone: '(75) 98811-0001' }).ok, false, 'igual não é mudança')
  assert.ok(/DDD/.test(correcao(pedidoBase, { telefone: '98811' }).motivo))
  const r = correcao(pedidoBase, { telefone: '(75) 98811-9999' })
  assert.strictEqual(r.corpo.cliente_telefone, '(75) 98811-9999')
  assert.ok(!r.corpo.endereco, 'sem mexer no endereço, ele não vai')
})

test('pedido sem endereço (balcão) só aceita correção de telefone', () => {
  const balcao = { id: 'p', telefone: '(75) 98811-0001', enderecoCampos: null }
  assert.strictEqual(correcao(balcao, { bairro: 'Praia' }).ok, false, 'não há endereço para corrigir')
  assert.strictEqual(correcao(balcao, { telefone: '(75) 98811-9999' }).ok, true)
})

test('pedido sem id não vira chamada com "undefined" na URL', () => {
  const r = correcao({ telefone: '(75) 98811-0001' }, { telefone: '(75) 98811-9999' })
  assert.strictEqual(r.ok, false)
  assert.ok(!/undefined/.test(r.motivo || ''))
})
