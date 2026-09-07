const { test } = require('node:test')
const assert = require('node:assert')
const I = require('../src-electron/impressao-canais')

function montar({ impressoras = [{ name: 'POS-80', displayName: 'POS-80', isDefault: true }], falhar = false } = {}) {
  const canais = new Map()
  const feitos = []
  let cfg = { impressoraNome: 'POS-80' }
  I.registrar({
    ipcMain: { handle: (c, fn) => canais.set(c, fn) },
    BrowserWindow: function () { return { loadURL: async () => {}, isDestroyed: () => false, destroy: () => {} } },
    impressaoService: {
      listarImpressoras: async () => { if (falhar) throw new Error('sem cups'); return impressoras },
      diagnostico: async () => ({ sumatra: false }),
      imprimirTeste: async (nome) => { feitos.push(['teste', nome]); return 'ok' },
      imprimirJanela: async (w, nome, tipo) => { feitos.push([tipo, nome]); return 'ok' },
    },
    getConfig: () => cfg,
    setConfig: (p) => { cfg = { ...cfg, impressoraNome: p.impressora_nome } },
    lojaAtual: () => ({ nome: 'Pizzaria' }),
    pedidoDeExemplo: () => ({ numero: '1042', cliente: 'Ana', valor: 90, itens: ['1× Pizza'] }),
  })
  return { chamar: (c, a) => canais.get(c)(null, a), canais, feitos, cfg: () => cfg }
}

test('a impressão registra os quatro canais — e vale fora do modo demonstração', () => {
  const m = montar()
  for (const c of ['impressao-info', 'impressao-escolher', 'impressao-teste', 'impressao-comanda']) {
    assert.ok(m.canais.has(c), 'faltou ' + c)
  }
})

test('lista as impressoras da máquina e diz qual está escolhida', async () => {
  const r = await montar().chamar('impressao-info')
  assert.strictEqual(r.dados.impressoras.length, 1)
  assert.strictEqual(r.dados.impressoraAtual, 'POS-80')
  assert.strictEqual(r.dados.loja.nome, 'Pizzaria')
})

test('sem serviço de impressão a tela abre assim mesmo, com a lista vazia', async () => {
  const r = await montar({ falhar: true }).chamar('impressao-info')
  assert.deepStrictEqual(r.dados.impressoras, [])
  assert.ok(r.dados.caminho, 'ainda diz por onde imprimiria')
})

test('escolher a impressora grava na configuração', async () => {
  const m = montar()
  await m.chamar('impressao-escolher', { nome: 'Epson' })
  assert.strictEqual(m.cfg().impressoraNome, 'Epson')
})

test('o teste imprime de verdade, na impressora escolhida', async () => {
  const m = montar()
  const r = await m.chamar('impressao-teste')
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(m.feitos[0], ['teste', 'POS-80'])
})

test('a comanda usa o pedido mandado; sem pedido nenhum, recusa em vez de imprimir em branco', async () => {
  const m = montar()
  const r = await m.chamar('impressao-comanda', { pedido: { numero: '9', cliente: 'X', valor: 10, itens: ['1× Y'] } })
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(m.feitos[0], ['comanda', 'POS-80'])

  const canais = new Map()
  I.registrar({
    ipcMain: { handle: (c, fn) => canais.set(c, fn) },
    BrowserWindow: function () { return { loadURL: async () => {}, isDestroyed: () => false, destroy: () => {} } },
    impressaoService: { listarImpressoras: async () => [], diagnostico: async () => ({}), imprimirJanela: async () => 'ok' },
    getConfig: () => ({}), setConfig: () => {},
    lojaAtual: () => ({ nome: 'X' }), pedidoDeExemplo: () => null,
  })
  const semPedido = await canais.get('impressao-comanda')(null, {})
  assert.strictEqual(semPedido.ok, false)
  assert.match(semPedido.erro, /sem pedido/)
})

test('falha da impressora vira erro explicado, não exceção solta', async () => {
  const canais = new Map()
  I.registrar({
    ipcMain: { handle: (c, fn) => canais.set(c, fn) },
    BrowserWindow: function () { return { loadURL: async () => {}, isDestroyed: () => false, destroy: () => {} } },
    impressaoService: {
      listarImpressoras: async () => [], diagnostico: async () => ({}),
      imprimirTeste: async () => { throw new Error('impressora offline') },
    },
    getConfig: () => ({}), setConfig: () => {}, lojaAtual: () => ({}), pedidoDeExemplo: () => null,
  })
  const r = await canais.get('impressao-teste')(null)
  assert.strictEqual(r.ok, false)
  assert.match(r.erro, /impressora offline/)
})
