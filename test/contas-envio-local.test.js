// Financeiro pelo app: os canais novos (lançamento, editar, cancelar) e a demonstração,
// que aplica por cima do dado fictício — a conta editada muda, a cancelada some da
// régua, o lançamento entra no extrato (e no livro caixa quando é dinheiro).
const { test } = require('node:test')
const assert = require('node:assert')
const E = require('../src-electron/contas-envio')
const { criarRegistro } = require('../src-electron/contas-local')
const A = require('../src-electron/contas-acoes')

function montar(enviar) {
  const canais = new Map()
  E.registrar({ ipcMain: { handle: (c, fn) => canais.set(c, fn) }, enviar, log: null })
  return { canais, chamar: (c, a) => canais.get(c)(null, a) }
}
const conta = { id: 'c1', direcao: 'pagar', descricao: 'Aluguel', valor: 1400, valorPago: 0, vencimento: '2026-09-10', categoria: 'Aluguel', situacao: 'pendente' }

test('os canais novos existem e mandam com o método certo', async () => {
  const idas = []
  const { canais, chamar } = montar(async (caminho, corpo, metodo) => { idas.push({ caminho, corpo, metodo }); return { id: 'x' } })
  for (const c of ['lancamento-novo', 'conta-editar', 'conta-cancelar']) assert.ok(canais.has(c), c)
  await chamar('lancamento-novo', { tipo: 'despesa', categoria: 'Energia', descricao: 'Luz', valor: '100', data: '10/09/2026' })
  await chamar('conta-editar', { conta, valor: '1500' })
  await chamar('conta-cancelar', { conta, escopo: 'serie' })
  assert.deepStrictEqual(idas.map((i) => [i.metodo, i.caminho]), [['POST', '/api/admin/lancamentos'], ['PATCH', '/api/admin/contas/c1'], ['PATCH', '/api/admin/contas/c1']])
  assert.deepStrictEqual(idas[2].corpo, { acao: 'cancelar' }, 'sem série, cancela só esta')
})

test('demonstração: editar, cancelar e lançar refletem na tela do Financeiro', () => {
  const r = criarRegistro()
  r.editar('c1', A.editar(conta, { valor: '1500', descricao: 'Aluguel de setembro' }).corpo)
  r.cancelar('c2')
  r.lancar(A.lancamento({ tipo: 'despesa', categoria: 'Energia', descricao: 'Luz', valor: '100', data: '10/09/2026', forma: 'dinheiro' }).corpo)
  r.lancar(A.lancamento({ tipo: 'receita', categoria: 'Outras receitas', descricao: 'Aluguel do espaço', valor: '300', data: '10/09/2026', forma: 'pix' }).corpo)
  const d = r.aplicar({
    contas: [conta, { ...conta, id: 'c2', descricao: 'Internet' }],
    extrato: [{ id: 'e1', data: '2026-09-09', hora: '10:00', descricao: 'Venda', categoria: 'venda', forma: 'pix', direcao: 'entrada', valor: 50, saldo: 50 }],
    livroCaixa: [],
  })
  const c1 = d.contas.find((c) => c.id === 'c1')
  assert.strictEqual(c1.valor, 1500)
  assert.strictEqual(c1.descricao, 'Aluguel de setembro')
  assert.strictEqual(d.contas.find((c) => c.id === 'c2').situacao, 'cancelada')
  assert.strictEqual(d.extrato.length, 3)
  assert.strictEqual(d.extrato[0].descricao, 'Aluguel do espaço', 'o mais novo primeiro')
  assert.strictEqual(d.extrato[0].direcao, 'entrada')
  assert.strictEqual(d.extrato[1].direcao, 'saida')
  assert.strictEqual(d.extrato[1].valor, 100)
  assert.strictEqual(d.livroCaixa.length, 1, 'só o que foi em dinheiro entra no livro caixa')
  assert.strictEqual(d.livroCaixa[0].descricao, 'Luz')
})
