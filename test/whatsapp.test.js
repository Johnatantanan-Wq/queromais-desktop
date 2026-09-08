const { test } = require('node:test')
const assert = require('node:assert')
const T = require('../renderer/elo/config-whatsapp')
const A = require('../src-electron/adaptadores')

test('a tela traz os cinco caminhos do painel, com o em uso marcado', () => {
  const h = T.htmlConfigWhatsapp({ provedor: 'evolution', estado: 'open' }, {})
  for (const nome of ['Desativado', 'App Desktop', 'Evolution API', 'Z-API', 'Meta Cloud API']) {
    assert.ok(h.includes(nome), 'falta o caminho ' + nome)
  }
  const depois = h.split('data-provedor-whats="evolution"')[1].slice(0, 900)
  assert.ok(/✓ em uso/.test(depois), 'o escolhido tem de estar marcado')
  const outro = h.split('data-provedor-whats="z_api"')[1].slice(0, 900)
  assert.ok(!/✓ em uso/.test(outro), 'e só ele')
})

test('só o provedor escolhido pede credencial, e segredo não volta do servidor', () => {
  const h = T.htmlConfigWhatsapp({
    provedor: 'evolution', estado: 'close',
    evolution_url: 'https://ev.exemplo', evolution_instance: 'loja1', tem_evolution_api_key: true,
  }, {})
  assert.ok(h.includes('value="https://ev.exemplo"'), 'a URL não é segredo: volta preenchida')
  assert.ok(h.includes('data-campo-whats="evolution_api_key"'))
  assert.ok(/já preenchido/.test(h), 'a chave gravada é sinalizada')
  assert.ok(/deixe em branco para manter/.test(h), 'e diz como manter a que está lá')
  assert.ok(!/value="[^"]*api_key/i.test(h), 'a chave em si nunca aparece na tela')
  // Z-API não é o escolhido: seus campos não podem estar desenhados
  assert.ok(!h.includes('data-campo-whats="zapi_token"'))
})

test('servidor da plataforma dispensa credencial — só o QR', () => {
  const h = T.htmlConfigWhatsapp({ provedor: 'evolution', estado: 'close', evolution_gerenciada: true }, {})
  assert.ok(/servidor próprio/.test(h))
  assert.ok(!h.includes('data-campo-whats="evolution_url"'), 'não pede o que a plataforma já tem')
  assert.ok(h.includes('data-acao="whatsapp:conectar"'))
})

test('o botão diz o que falta em cada caminho', () => {
  const evoDesligado = T.htmlConfigWhatsapp({ provedor: 'evolution', estado: 'close' }, {})
  assert.ok(evoDesligado.includes('Conectar por QR'))
  const evoLigado = T.htmlConfigWhatsapp({ provedor: 'evolution', estado: 'open' }, {})
  assert.ok(evoLigado.includes('data-acao="whatsapp:desconectar"'))

  // App Desktop é o WhatsApp Web desta janela: "conectar" é abrir a conversa
  const web = T.htmlConfigWhatsapp({ provedor: 'wabot' }, {})
  assert.ok(web.includes('data-acao="whatsapp:abrir-web"'))
  const webAberto = T.htmlConfigWhatsapp({ provedor: 'wabot', webAberto: true }, {})
  assert.ok(webAberto.includes('data-acao="whatsapp:fechar-web"'))
})

test('escolher outro caminho faz aparecer o Salvar, sem gravar antes da hora', () => {
  const h = T.htmlConfigWhatsapp({ provedor: 'desativado' }, { provedorWhats: 'wabot' })
  assert.ok(h.includes('data-acao="whatsapp:salvar:wabot"'), 'o Salvar é do caminho escolhido')
  const depois = h.split('data-provedor-whats="wabot"')[1].slice(0, 900)
  assert.ok(/✓ em uso/.test(depois), 'a marcação segue o clique, não o servidor')
})

test('o QR só aparece durante o pareamento, e data URI não é embrulhado de novo', () => {
  assert.ok(!/QR do WhatsApp/.test(T.htmlConfigWhatsapp({ provedor: 'evolution', estado: 'open' }, {})))
  const h = T.htmlConfigWhatsapp({ provedor: 'evolution', estado: 'connecting', qr: 'iVBOR', pairingCode: 'ABCD' }, {})
  assert.ok(h.includes('data:image/png;base64,iVBOR') && h.includes('ABCD'))
  const j = T.htmlConfigWhatsapp({ provedor: 'evolution', estado: 'connecting', qr: 'data:image/svg+xml;base64,PHN2Zw==' }, {})
  assert.ok(j.includes('src="data:image/svg+xml;base64,PHN2Zw=="'))
  assert.ok(!j.includes('base64,data:'))
})

test('o ponto pulsa só quando há o que acompanhar', () => {
  assert.ok(/class="epulso"/.test(T.selo('open')))
  assert.ok(/class="epulso"/.test(T.selo('connecting')))
  assert.ok(!/class="epulso"/.test(T.selo('close')))
})

test('estado desconhecido e tela sem dado não quebram', () => {
  assert.ok(T.htmlConfigWhatsapp({ estado: 'coisa_nova' }, {}).includes('Evolution API'))
  const vazio = T.htmlConfigWhatsapp(null, {})
  assert.ok(vazio.includes('App Desktop') && !vazio.includes('undefined'))
})

test('o adaptador junta o status com a configuração', () => {
  const d = A.whatsapp({
    statusResp: { estado: 'open', provedor: 'evolution' },
    configResp: { provedor: 'evolution', ativo: true, evolution_url: 'https://ev', tem_evolution_api_key: true },
  })
  assert.strictEqual(d.estado, 'open')
  assert.strictEqual(d.provedor, 'evolution')
  assert.strictEqual(d.evolution_url, 'https://ev')
  assert.strictEqual(d.tem_evolution_api_key, true)
  // o provedor da CONFIG manda: o status só sabe do Evolution
  const outro = A.whatsapp({ statusResp: { estado: 'indisponivel', provedor: 'evolution' }, configResp: { provedor: 'wabot' } })
  assert.strictEqual(outro.provedor, 'wabot')
  assert.strictEqual(A.whatsapp({}), null)
})

test('o WhatsApp entra no menu do painel, abaixo de Clientes', () => {
  const fs = require('fs')
  const path = require('path')
  const shell = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'shell.js'), 'utf8')
  assert.ok(/findIndex\(\(x\) => x\.href === '\/admin\/clientes'\)/.test(shell))
  assert.ok(/splice\(i2 \+ 1, 0, \{/.test(shell))
})
