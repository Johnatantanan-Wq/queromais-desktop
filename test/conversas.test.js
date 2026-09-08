const { test } = require('node:test')
const assert = require('node:assert')
const T = require('../renderer/elo/tela-conversas')
const demo = require('../src-electron/demo-dados')

const dados = demo.conversas()

test('a lista traz as conversas, com as não lidas em destaque', () => {
  const h = T.htmlConversas(dados, {})
  assert.strictEqual((h.match(/data-conversa=/g) || []).length, 4)
  assert.ok(/Marina Prado/.test(h) && /João Pereira/.test(h))
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
