const { test } = require('node:test')
const assert = require('node:assert')
const T = require('../renderer/elo/tela-conversas')
const demo = require('../src-electron/demo-dados')

const dados = demo.conversas()

test('a lista traz as conversas, com as não lidas em destaque', () => {
  const h = T.htmlConversas(dados, {})
  assert.strictEqual((h.match(/data-conversa=/g) || []).length, 4)
  assert.ok(/Marina/.test(h) && /Joao P\./.test(h))
  // João tem 2 não lidas: a bolinha mostra o número
  const joao = h.split('data-conversa="c2"')[1].split('data-conversa=')[0]
  assert.ok(/>2</.test(joao), 'a contagem de não lidas aparece')
})

test('cliente à esquerda, loja à direita — como todo mundo espera', () => {
  const h = T.htmlConversas(dados, { conversa: 'c1' })
  const balaoLoja = h.split('Pedido #1042 confirmado')[0]
  assert.ok(/justify-content:flex-end/.test(balaoLoja.slice(-400)), 'mensagem da loja alinha à direita')
  const balaoCliente = h.split('Consegue mandar sem cebola')[0]
  assert.ok(/justify-content:flex-start/.test(balaoCliente.slice(-400)), 'a do cliente, à esquerda')
})

test('mensagem automática é marcada como tal', () => {
  const h = T.htmlConversas(dados, { conversa: 'c1' })
  assert.ok(/· automática/.test(h), 'quem escreveu foi o sistema, e a tela diz')
})

test('só a conversa aberta mostra o miolo; as outras, só a prévia', () => {
  const h = T.htmlConversas(dados, { conversa: 'c2' })
  assert.ok(/Boa noite!/.test(h))
  assert.ok(!/já avisei a cozinha/.test(h), 'mensagens da outra conversa não vazam')
})

test('sem conversa escolhida, abre a primeira em vez de ficar em branco', () => {
  const h = T.htmlConversas(dados, {})
  assert.ok(/Consegue mandar sem cebola/.test(h), 'a primeira conversa vem aberta')
})

test('sem envio de pé, a caixa de resposta fica desabilitada e explica', () => {
  const semConexao = T.htmlConversas({ ...dados, estado: 'close', provedor: 'evolution' }, {})
  assert.ok(/disabled/.test(semConexao))
  assert.ok(/Conecte o WhatsApp em Configurações/.test(semConexao),
    'caixa que aceita texto e não manda é pior do que caixa desabilitada')

  const comConexao = T.htmlConversas({ ...dados, estado: 'open' }, {})
  assert.ok(!/disabled/.test(comConexao))
  // App Desktop envia pela própria janela: também pode responder
  const web = T.htmlConversas({ ...dados, estado: 'close', provedor: 'wabot' }, {})
  assert.ok(!/disabled/.test(web))
})

test('nenhuma conversa: a tela diz o que fazer, e onde', () => {
  const h = T.htmlConversas({ conversas: [] }, {})
  assert.ok(/Nenhuma conversa ainda/.test(h))
  assert.ok(/Configurações › WhatsApp/.test(h), 'aponta onde se escolhe o caminho')
})

test('a hora é dita como se fala: hora hoje, "ontem" ontem, dia da semana antes', () => {
  const agora = new Date('2026-09-08T15:00:00').getTime()
  assert.match(T.quando(new Date('2026-09-08T14:32:00').toISOString(), agora), /14:32/)
  assert.strictEqual(T.quando(new Date('2026-09-07T20:00:00').toISOString(), agora), 'ontem')
  assert.ok(/^(seg|ter|qua|qui|sex|sáb|dom)/.test(T.quando(new Date('2026-09-05T20:00:00').toISOString(), agora)))
  assert.strictEqual(T.quando(null, agora), '')
  assert.strictEqual(T.quando('não é data', agora), '')
})

test('iniciais para o avatar, sem quebrar com nome vazio', () => {
  assert.strictEqual(T.iniciais('Marina Prado'), 'MP')
  assert.strictEqual(T.iniciais('João'), 'J')
  assert.strictEqual(T.iniciais(''), '—')
  assert.strictEqual(T.iniciais(null), '—')
})

test('a conversa liga ao pedido quando existe', () => {
  const h = T.htmlConversas(dados, { conversa: 'c1' })
  assert.ok(h.includes('data-acao="conversa:pedido:1042"'), 'dá para pular da conversa ao pedido')
})

// ── quem está do outro lado ──
const A = require('../src-electron/adaptadores')

test('a conversa reconhece o cliente pelo telefone, mesmo em outro formato', () => {
  const d = A.conversas({
    conversasResp: { conversas: [{ id: '1', nome: 'Marina (WhatsApp)', telefone: '5575988110001' }] },
    clientesResp: { itens: [{ nome: 'MARINA PRADO', telefone: '(75) 98811-0001', bairro: 'Centro' }] },
    pedidosResp: { itens: [
      { numero: '1042', telefone: '75988110001', valor: 89.9, etapa: 'entregue' },
      { numero: '1030', telefone: '(75) 8811-0001', valor: 54, etapa: 'entregue' },
    ] },
  })
  const c = d.conversas[0].cliente
  assert.strictEqual(c.nome, 'MARINA PRADO')
  assert.strictEqual(c.cadastrado, true)
  assert.strictEqual(c.pedidos, 2, 'achou os dois pedidos, um deles sem o nono dígito')
  assert.strictEqual(c.gasto, 143.9)
  assert.strictEqual(c.ultimoPedido.numero, '1042')
})

test('telefone que não bate com ninguém NÃO ganha vínculo', () => {
  // Vínculo errado mostra o histórico de outra pessoa — pior do que sem vínculo.
  const d = A.conversas({
    conversasResp: { conversas: [{ id: '1', nome: 'Desconhecido', telefone: '5511977776666' }] },
    clientesResp: { itens: [{ nome: 'Marina', telefone: '(75) 98811-0001' }] },
    pedidosResp: { itens: [{ numero: '1042', telefone: '75988110001', valor: 89.9 }] },
  })
  assert.strictEqual(d.conversas[0].cliente, null)
})

test('conversa sem telefone não casa com ninguém', () => {
  const d = A.conversas({
    conversasResp: { conversas: [{ id: '1', nome: 'X', telefone: '' }] },
    clientesResp: { itens: [{ nome: 'Marina', telefone: '(75) 98811-0001' }] },
  })
  assert.strictEqual(d.conversas[0].cliente, null)
})

test('quem tem pedido mas não está cadastrado é reconhecido assim mesmo', () => {
  const d = A.conversas({
    conversasResp: { conversas: [{ id: '1', nome: 'Zé', telefone: '5575988119999' }] },
    clientesResp: { itens: [] },
    pedidosResp: { itens: [{ numero: '1050', telefone: '75988119999', cliente: 'Zé da Esquina', valor: 40, etapa: 'entregue' }] },
  })
  const c = d.conversas[0].cliente
  assert.strictEqual(c.cadastrado, false, 'não está no cadastro')
  assert.strictEqual(c.nome, 'Zé da Esquina', 'mas o pedido sabe o nome')
  assert.strictEqual(c.pedidos, 1)
})

test('só pedido ENTREGUE conta como gasto — o resto ainda pode cair', () => {
  const d = A.conversas({
    conversasResp: { conversas: [{ id: '1', telefone: '5575988110001' }] },
    pedidosResp: { itens: [
      { numero: '1', telefone: '75988110001', valor: 100, etapa: 'entregue' },
      { numero: '2', telefone: '75988110001', valor: 50, etapa: 'producao' },
    ] },
  })
  assert.strictEqual(d.conversas[0].cliente.gasto, 100)
  assert.strictEqual(d.conversas[0].cliente.pedidos, 2, 'mas os dois contam como pedidos')
})

test('o nome do CADASTRO ganha do nome que o WhatsApp mostra', () => {
  const T2 = require('../renderer/elo/tela-conversas')
  const h = T2.htmlConversas({ estado: 'open', conversas: [{
    id: '1', nome: '+55 75 98811-0001', telefone: '5575988110001',
    cliente: { nome: 'MARINA PRADO', cadastrado: true, chave: '(75) 98811-0001', pedidos: 2, gasto: 143.9, bairro: 'Centro',
      ultimoPedido: { numero: '1042', etapa: 'entregue' } },
    mensagens: [{ de: 'cliente', texto: 'oi' }],
  }] }, {})
  assert.ok(/MARINA PRADO/.test(h))
  assert.ok(/>cliente</.test(h), 'e é marcado como cliente conhecido')
  assert.ok(/2 pedidos · R\$ 143,90 já entregues · Centro · último #1042/.test(h), 'a faixa resume o histórico')
  assert.ok(h.includes('data-acao="conversa:cliente:'), 'dá para abrir a ficha')
  assert.ok(/\(75\) 98811-0001/.test(h), 'o telefone aparece formatado, não colado')
})

test('sem reconhecer, a tela não inventa faixa nem selo', () => {
  const T2 = require('../renderer/elo/tela-conversas')
  const h = T2.htmlConversas({ estado: 'open', conversas: [{
    id: '1', nome: 'Desconhecido', telefone: '5511977776666', cliente: null, mensagens: [],
  }] }, {})
  assert.ok(!/>cliente</.test(h))
  assert.ok(!h.includes('data-acao="conversa:cliente:'))
  assert.ok(!/pedidos ·/.test(h))
})
