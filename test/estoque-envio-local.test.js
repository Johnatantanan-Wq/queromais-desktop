// Gestão pelo app: os canais novos e a demonstração (editar item, ajuste de saldo, entrada
// sem nota soma no estoque, fornecedor editado, pendência resolvida, ficha técnica salva).
const { test } = require('node:test')
const assert = require('node:assert')
const E = require('../src-electron/estoque-envio')
const { criarRegistro } = require('../src-electron/estoque-local')
const A = require('../src-electron/estoque-acoes')
const demo = require('../src-electron/demo-dados')

function montar(enviar) {
  const canais = new Map()
  E.registrar({ ipcMain: { handle: (c, fn) => canais.set(c, fn) }, enviar, log: null })
  return { canais, chamar: (c, a) => canais.get(c)(null, a) }
}
const item = { id: 'i1', nome: 'Muçarela', unidade: 'kg', saldo: 4, minimo: 2, custo: 30 }

test('os canais novos existem e mandam com o método da decisão', async () => {
  const idas = []
  const { canais, chamar } = montar(async (caminho, corpo, metodo) => { idas.push([metodo, caminho]); return { ok: true } })
  for (const c of ['estoque-editar-insumo', 'estoque-ajuste', 'estoque-entrada-sem-nota', 'estoque-entrada-manual', 'estoque-editar-fornecedor', 'estoque-excluir-fornecedor', 'estoque-resolver-pendencia', 'estoque-ficha-tecnica']) assert.ok(canais.has(c), c)
  await chamar('estoque-editar-insumo', { item, minimo: '3' })
  await chamar('estoque-ajuste', { item, acao: 'entrada', qtd: '1' })
  await chamar('estoque-excluir-fornecedor', { fornecedor: { id: 'forn-1', nome: 'X' } })
  await chamar('estoque-ficha-tecnica', { produto: { produtoId: 'prod-1' }, linhas: [{ ingredienteId: 'i1', qtd: '1' }] })
  assert.deepStrictEqual(idas, [['PATCH', '/api/admin/ingredientes/i1'], ['PATCH', '/api/admin/ingredientes/i1'], ['DELETE', '/api/admin/fornecedores/forn-1'], ['PUT', '/api/admin/estoque/fichas']])
  const r = await chamar('estoque-ajuste', { item, acao: 'saida', qtd: '99' })
  assert.strictEqual(r.ok, false)
  assert.strictEqual(idas.length, 4, 'recusa da decisão não vai à rede')
})

test('demonstração: o que foi feito na Gestão aparece na tela', () => {
  const r = criarRegistro()
  const dados = demo.telasComAbas().estoque
  const it = dados.categorias[0].subcategorias[0].itens.find((x) => x.nome === 'Pizza Calabresa G') || dados.categorias[0].subcategorias[0].itens[1]
  r.editarInsumo(it.id, A.editarInsumo(it, { minimo: '9', custo: '20' }).corpo)
  r.ajuste(it.id, A.ajusteEstoque({ ...it, saldo: 12 }, { acao: 'entrada', qtd: '3' }).corpo)
  const forn = dados.fornecedores[0]
  r.editarFornecedor(forn.id, A.editarFornecedor(forn, { telefone: '(75) 90000-0000' }).corpo)
  r.excluirFornecedor(dados.fornecedores[1].id)
  r.resolverPendencia(dados.nfEntrada.pendencias[0].id)
  const ficha = dados.fichas.itens[0]
  r.fichaTecnica(ficha.produtoId, A.fichaTecnica(ficha, [{ ingredienteId: dados.insumos[0].id, qtd: '2' }]).corpo)
  r.entradaSemNota(A.entradaSemNota({ fornecedorNome: 'Mercado', itens: [{ ingredienteId: it.id, qtd: '5', custo: '21' }] }).corpo)
  const d = r.aplicar(dados)
  const it2 = d.categorias[0].subcategorias[0].itens.find((x) => x.id === it.id)
  assert.strictEqual(it2.minimo, 9)
  assert.strictEqual(it2.custo, 20)
  assert.strictEqual(it2.saldo, (Number(it.saldo) || 0) + 3 + 5, 'entrada avulsa + entrada sem nota somam no saldo')
  assert.strictEqual(d.fornecedores.find((f) => f.id === forn.id).telefone, '(75) 90000-0000')
  assert.ok(!d.fornecedores.some((f) => f.id === dados.fornecedores[1].id), 'excluído sumiu')
  assert.strictEqual(d.nfEntrada.pendencias[0].resolvida, true)
  const f2 = d.fichas.itens.find((f) => f.produtoId === ficha.produtoId)
  assert.strictEqual(f2.insumos.length, 1)
  assert.strictEqual(f2.insumos[0].id, dados.insumos[0].id)
  assert.match(f2.insumos[0].qtd, /^2 /)
})
