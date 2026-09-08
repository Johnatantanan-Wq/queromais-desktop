const { test } = require('node:test')
const assert = require('node:assert')
const T = require('../renderer/elo/tela-whatsapp')
const A = require('../src-electron/adaptadores')

test('a tela mostra os DOIS caminhos, com o estado de cada um', () => {
  const h = T.htmlWhatsapp({ estado: 'open', provedor: 'evolution', modo: 'evolution' }, {})
  assert.ok(h.includes('Evolution (API)') && h.includes('WhatsApp Web'))
  assert.ok(/Mensagens autom/.test(h) && /Atender no balc/.test(h), 'cada um diz para que serve')
  assert.ok(h.includes('conectado'), 'o estado do Evolution aparece')
})

test('o botão diz o que falta em cada caminho', () => {
  const desligado = T.htmlWhatsapp({ estado: 'sem_config' }, {})
  assert.ok(desligado.includes('data-acao="whatsapp:conectar"'), 'sem config: oferece conectar')
  assert.ok(desligado.includes('Conectar por QR'))

  const ligado = T.htmlWhatsapp({ estado: 'open' }, {})
  assert.ok(ligado.includes('data-acao="whatsapp:desconectar"'), 'conectado: oferece desconectar')

  const webFechado = T.htmlWhatsapp({ estado: 'close' }, {})
  assert.ok(webFechado.includes('data-acao="whatsapp:abrir-web"'))
  const webAberto = T.htmlWhatsapp({ estado: 'close', webAberto: true }, {})
  assert.ok(webAberto.includes('data-acao="whatsapp:fechar-web"'))
})

test('o QR só aparece enquanto o pareamento não terminou', () => {
  assert.ok(!/QR do WhatsApp/.test(T.htmlWhatsapp({ estado: 'open' }, {})), 'conectado não mostra QR')
  const h = T.htmlWhatsapp({ estado: 'connecting', qr: 'iVBORw0KGgo=', pairingCode: 'ABCD-1234' }, {})
  assert.ok(/QR do WhatsApp/.test(h))
  assert.ok(h.includes('data:image/png;base64,iVBORw0KGgo='), 'base64 puro vira data URI')
  assert.ok(h.includes('ABCD-1234'), 'o código de pareamento é alternativa ao QR')
})

test('QR que já vem como data URI não é embrulhado de novo', () => {
  const h = T.htmlWhatsapp({ estado: 'connecting', qr: 'data:image/svg+xml;base64,PHN2Zw==' }, {})
  assert.ok(h.includes('src="data:image/svg+xml;base64,PHN2Zw=="'))
  assert.ok(!h.includes('data:image/png;base64,data:'), 'não pode embrulhar duas vezes')
})

test('o ponto pulsa só quando há o que acompanhar', () => {
  assert.ok(/class="epulso"/.test(T.selo('open')), 'conectado: pulsa')
  assert.ok(/class="epulso"/.test(T.selo('connecting')), 'conectando: pulsa')
  assert.ok(!/class="epulso"/.test(T.selo('close')), 'desconectado: parado')
  assert.ok(!/class="epulso"/.test(T.selo('sem_config')), 'sem config: parado')
})

test('estado desconhecido não quebra a tela', () => {
  const h = T.htmlWhatsapp({ estado: 'coisa_nova' }, {})
  assert.ok(h.includes('WhatsApp Web'))
  assert.ok(!h.includes('undefined'))
})

test('sem dado nenhum a tela ainda desenha os caminhos', () => {
  const h = T.htmlWhatsapp(null, {})
  assert.ok(h.includes('Evolution (API)') && h.includes('WhatsApp Web'))
})

test('o adaptador traduz o status do painel', () => {
  assert.deepStrictEqual(A.whatsapp({ statusResp: { estado: 'open', provedor: 'evolution', ativo: true } }),
    { estado: 'open', provedor: 'evolution', ativo: true, numero: null, modo: 'evolution' })
  // sem conexão de pé, nenhum modo está "em uso"
  assert.strictEqual(A.whatsapp({ statusResp: { estado: 'close', provedor: 'evolution' } }).modo, null)
  assert.strictEqual(A.whatsapp({ statusResp: null }), null)
})

test('o WhatsApp entra no menu do painel, abaixo de Clientes', () => {
  // Sem isto o item sumiria assim que o servidor respondesse: o menu dele manda.
  const fs = require('fs')
  const path = require('path')
  const shell = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'shell.js'), 'utf8')
  assert.ok(/findIndex\(\(x\) => x\.href === '\/admin\/clientes'\)/.test(shell), 'a posição é relativa a Clientes')
  assert.ok(/splice\(i2 \+ 1, 0, \{/.test(shell), 'entra logo DEPOIS dela')
  assert.ok(/id: 'whatsapp', href: '\/admin\/whatsapp'/.test(shell))
})
