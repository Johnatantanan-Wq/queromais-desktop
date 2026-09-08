const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../src-electron/estoque-acoes')
const { criarRegistro } = require('../src-electron/estoque-local')

test('novo insumo: o grupo vem da aba e vira grupo_estoque + tipo', () => {
  const r = A.novoInsumo({ grupo: 'insumos', nome: 'Azeitona', unidade: 'kg', qtd: '2,5', minimo: '1', custo: '38,90' })
  assert.deepStrictEqual(r.corpo, { nome: 'Azeitona', unidade: 'kg', qtd_atual: 2.5, qtd_minima: 1, custo_unitario: 38.9, grupo_estoque: 'insumo', tipo: 'ingrediente' })
  assert.strictEqual(A.novoInsumo({ grupo: 'revenda', nome: 'Coca 2L' }).corpo.tipo, 'produto_pronto', 'revenda é produto pronto')
  assert.strictEqual(A.novoInsumo({ grupo: 'producao', nome: 'Massa' }).corpo.grupo_estoque, 'producao')
})

test('novo insumo: campos em branco viram zero, não erro — cadastrar sem saldo é normal', () => {
  const r = A.novoInsumo({ grupo: 'insumos', nome: 'Orégano' })
  assert.deepStrictEqual([r.corpo.qtd_atual, r.corpo.qtd_minima, r.corpo.custo_unitario, r.corpo.unidade], [0, 0, 0, 'un'])
  assert.ok(!/ com /.test(r.resumo), 'sem saldo o resumo não fala em quantidade')
})

test('novo insumo: recusa grupo, nome, unidade e números inválidos — cada um com a frase certa', () => {
  assert.ok(/grupo/.test(A.novoInsumo({ grupo: 'x', nome: 'Az' }).motivo))
  assert.ok(/duas letras/.test(A.novoInsumo({ grupo: 'insumos', nome: 'A' }).motivo))
  assert.ok(/Unidade tem de ser/.test(A.novoInsumo({ grupo: 'insumos', nome: 'Az', unidade: 'saco' }).motivo))
  assert.ok(/Quantidade atual/.test(A.novoInsumo({ grupo: 'insumos', nome: 'Az', qtd: '-1' }).motivo))
  assert.ok(/mínimo/.test(A.novoInsumo({ grupo: 'insumos', nome: 'Az', minimo: 'abc' }).motivo))
  assert.ok(/Custo/.test(A.novoInsumo({ grupo: 'insumos', nome: 'Az', custo: '-5' }).motivo))
})

test('nova categoria: nome obrigatório, "interno" por padrão', () => {
  assert.ok(/nome/.test(A.novaCategoria({ nome: ' ' }).motivo))
  assert.deepStrictEqual(A.novaCategoria({ nome: 'Descartáveis' }).corpo, { nome: 'Descartáveis', comportamento: 'interno' })
  assert.strictEqual(A.novaCategoria({ nome: 'Bebidas', comportamento: 'venda' }).corpo.comportamento, 'venda')
})

test('novo fornecedor: CNPJ só com 14 dígitos (ou CPF com 11), guardado sem máscara', () => {
  const r = A.novoFornecedor({ nome: 'Laticínios Vale', cnpj: '12.345.678/0001-90', telefone: '(75) 3322-1100' })
  assert.deepStrictEqual(r.corpo, { nome: 'Laticínios Vale', tipo: 'fornecedor', telefone: '(75) 3322-1100', cnpj_cpf: '12345678000190' })
  assert.ok(/14 dígitos/.test(A.novoFornecedor({ nome: 'ACME', cnpj: '123' }).motivo))
  assert.ok(!('cnpj_cpf' in A.novoFornecedor({ nome: 'ACME' }).corpo), 'sem CNPJ não manda campo vazio')
  assert.ok(/duas letras/.test(A.novoFornecedor({ nome: 'A' }).motivo))
})

test('sincronizar não precisa de nada — é idempotente no painel', () => {
  const r = A.sincronizar()
  assert.strictEqual(r.caminho, '/api/admin/estoque/sincronizar-cardapio')
  assert.deepStrictEqual(r.corpo, {})
})

test('em demonstração o insumo entra na categoria do grupo, e o fornecedor na lista', () => {
  const reg = criarRegistro()
  const base = { categorias: [
    { id: 'producao', nome: 'Produção', subcategorias: [{ nome: 'Produção', itens: [{ nome: 'Massa' }] }] },
    { id: 'insumo', nome: 'Insumos', subcategorias: [{ nome: 'Insumos', itens: [] }] },
  ], fornecedores: [{ nome: 'Vale Verde' }] }
  reg.insumo(A.novoInsumo({ grupo: 'insumos', nome: 'Azeitona', unidade: 'kg', qtd: '2', minimo: '5' }).corpo)
  reg.fornecedor(A.novoFornecedor({ nome: 'ACME' }).corpo)
  const d = reg.aplicar(base)
  assert.deepStrictEqual(d.categorias[1].subcategorias[0].itens.map((i) => i.nome), ['Azeitona'])
  assert.strictEqual(d.categorias[1].subcategorias[0].itens[0].situacao, 'baixo', '2 < mínimo 5')
  assert.deepStrictEqual(d.categorias[0].subcategorias[0].itens.map((i) => i.nome), ['Massa'], 'a outra categoria não muda')
  assert.deepStrictEqual(d.fornecedores.map((f) => f.nome), ['ACME', 'Vale Verde'])
  assert.strictEqual(base.categorias[1].subcategorias[0].itens.length, 0, 'o dado de origem não é tocado')
})
