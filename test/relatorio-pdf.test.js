const { test } = require('node:test')
const assert = require('node:assert')
const P = require('../src-electron/relatorio-pdf')

test('o nome do arquivo sai limpo e datado', () => {
  const d = new Date(2026, 8, 7)
  assert.strictEqual(P.nomeDoArquivo('Relatórios', d), 'relatorios-2026-09-07.pdf')
  assert.strictEqual(P.nomeDoArquivo('Gestão de pedido', d), 'gestao-de-pedido-2026-09-07.pdf')
  assert.strictEqual(P.nomeDoArquivo('', d), 'relatorio-2026-09-07.pdf')
})

test('o documento leva o CSS da tela — senão o PDF sai sem formato nenhum', () => {
  const doc = P.montarDocumento('<div class="ecard">x</div>', 'Relatórios', 'Loja', '.ecard{border:1px}')
  assert.ok(doc.includes('.ecard{border:1px}'), 'o elo.css precisa entrar')
  assert.ok(doc.includes('@page'), 'e o papel precisa ser definido')
})

test('o cabeçalho identifica loja e momento — PDF sem isso não serve de comprovante', () => {
  const doc = P.montarDocumento('<p>corpo</p>', 'Caixa', 'Pizzaria Demonstração', '')
  assert.ok(doc.includes('Caixa') && doc.includes('Pizzaria Demonstração'))
  assert.ok(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(doc), 'precisa da data/hora')
})

test('o PDF é papel: sem animação, sem sombra e sem a ficha aberta por cima', () => {
  assert.ok(/animation: none/.test(P.CSS_EXTRA))
  assert.ok(/#eloFicha \{ display: none/.test(P.CSS_EXTRA))
})

test('título com aspas ou HTML não escapa para dentro do documento', () => {
  const doc = P.montarDocumento('<p>ok</p>', '<script>alert(1)</script>', '', '')
  assert.ok(doc.includes('&lt;script&gt;'))
  assert.ok(!doc.includes('<script>alert'))
})

test('sem conteúdo, o canal recusa em vez de gerar papel em branco', async () => {
  let handler = null
  P.registrar({
    ipcMain: { handle: (canal, fn) => { if (canal === 'relatorio-pdf') handler = fn } },
    BrowserWindow: function () {}, dialog: {}, appDir: __dirname + '/..', pastaPadrao: '/tmp',
  })
  assert.ok(handler, 'o canal relatorio-pdf precisa ser registrado')
  const r = await handler({}, { titulo: 'X', html: '' })
  assert.strictEqual(r.ok, false)
  assert.match(r.erro, /conteúdo/)
})

test('cancelar o salvamento não vira erro', async () => {
  let handler = null
  P.registrar({
    ipcMain: { handle: (canal, fn) => { if (canal === 'relatorio-pdf') handler = fn } },
    BrowserWindow: function () {},
    dialog: { showSaveDialog: async () => ({ canceled: true }) },
    appDir: __dirname + '/..', pastaPadrao: '/tmp',
  })
  const r = await handler({}, { titulo: 'X', html: '<p>a</p>' })
  assert.deepStrictEqual(r, { cancelado: true })
})
