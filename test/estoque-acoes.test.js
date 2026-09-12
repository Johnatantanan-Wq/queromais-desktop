const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../src-electron/estoque-acoes')
const { criarRegistro } = require('../src-electron/estoque-local')

test('novo insumo: o grupo vem da aba e vira grupo_estoque + tipo', () => {
  const r = A.novoInsumo({ grupo: 'insumos', nome: 'Azeitona', unidade: 'kg', qtd: '2,5', minimo: '1', custo: '38,90' })
  assert.deepStrictEqual(r.corpo, { nome: 'Azeitona', unidade: 'kg', qtd_atual: 2.5, qtd_minima: 1, custo_unitario: 38.9, grupo_estoque: 'insumo', tipo: 'ingrediente' })
  // ⚠️ Revenda deixou de ser sinônimo de BEBIDA (painel, 09/09/2026): gelo, sorvete,
  // salgadinho e doce são revenda e caíam em Insumos. O tipo agora é próprio.
  assert.strictEqual(A.novoInsumo({ grupo: 'revenda', nome: 'Gelo 5kg' }).corpo.tipo, 'revenda')
  assert.strictEqual(A.novoInsumo({ grupo: 'producao', nome: 'Massa' }).corpo.grupo_estoque, 'producao')
})

test('⛔ uso e consumo é DESPESA, não estoque de produção', () => {
  // Sacola, guardanapo e produto de limpeza só cabiam em "Embalagem", que o sistema
  // trata como insumo de produção — e o gasto se misturava com o custo do prato.
  const r = A.novoInsumo({ grupo: 'uso_consumo', nome: 'Sacola 40x50', unidade: 'un', custo: '0,18' })
  assert.strictEqual(r.corpo.grupo_estoque, 'uso_consumo')
  assert.strictEqual(r.corpo.tipo, 'uso_consumo', 'entrar como ingrediente sujaria a ficha técnica')
  assert.match(r.resumo, /Uso e consumo/)
  const Ficha = require('../renderer/elo/ficha')
  assert.match(Ficha.fichaNovoInsumo('uso_consumo'), /nunca vira item de ficha técnica/)
})

test('o estoque agrupa os tipos novos no lugar certo', () => {
  const Adapt = require('../src-electron/adaptadores')
  const d = Adapt.estoque({ ingredientesResp: [
    { nome: 'Gelo', tipo: 'revenda', qtd_atual: 10, unidade: 'un' },
    { nome: 'Sacola', tipo: 'uso_consumo', qtd_atual: 500, unidade: 'un' },
    { nome: 'Farinha', tipo: 'ingrediente', qtd_atual: 20, unidade: 'kg' },
  ] })
  const porId = {}
  for (const c of d.categorias) porId[c.id] = c.subcategorias[0].itens.map((i) => i.nome)
  assert.deepStrictEqual(porId.revenda, ['Gelo'], 'revenda que não é bebida caía em Insumos')
  assert.deepStrictEqual(porId.uso_consumo, ['Sacola'])
  assert.deepStrictEqual(porId.insumos, ['Farinha'])
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

const E = require('../src-electron/estoque-acoes')

// ── "Ajustar" reabre a nota já lançada (painel, 08/09/2026) ────────────────
test('reabrir estorna o estoque e devolve a nota para "A lançar"', () => {
  const r = E.reabrirNota({ id: 'n1', numero: '8821', situacao: 'processada' })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.caminho, '/api/admin/estoque/entradas/n1/reabrir')
  assert.match(r.resumo, /estornado/)
  assert.match(r.resumo, /A lançar/)
})

test('⛔ nota que ainda não foi lançada não tem o que estornar', () => {
  const r = E.reabrirNota({ id: 'n1', numero: '4410', situacao: 'pendente' })
  assert.strictEqual(r.ok, false)
  assert.match(r.motivo, /ainda não foi lançada/)
})

test('nota sem id não vira chamada com "undefined" na URL', () => {
  assert.strictEqual(E.reabrirNota({ numero: '1' }).ok, false)
  assert.strictEqual(E.reabrirNota(null).ok, false)
})

// ── GESTÃO pelo app: editar item, ajuste de estoque, entradas, fornecedor, pendência, ficha técnica ──
const item = { id: 'i1', nome: 'Muçarela', unidade: 'kg', saldo: 4, minimo: 2, custo: 30, tipo: 'ingrediente', grupo: 'producao', ativo: true }

test('editar item: só o que mudou, por id — nome, unidade, mínimo, custo, tipo, grupo, ativo e negativo', () => {
  const r = A.editarInsumo(item, { nome: 'Muçarela ', unidade: 'kg', minimo: '3', custo: '32,50', ativo: false, permiteNegativo: true })
  assert.strictEqual(r.caminho, '/api/admin/ingredientes/i1')
  assert.strictEqual(r.metodo, 'PATCH')
  assert.deepStrictEqual(r.corpo, { qtd_minima: 3, custo_unitario: 32.5, ativo: false, permite_estoque_negativo: true })
  assert.match(A.editarInsumo(item, { nome: 'Muçarela', unidade: 'kg', minimo: '2', custo: '30' }).motivo, /Nada mudou/)
  assert.match(A.editarInsumo(item, { nome: 'M' }).motivo, /duas letras/)
  assert.match(A.editarInsumo(item, { unidade: 'ton' }).motivo, /Unidade/)
  assert.match(A.editarInsumo({}, {}).motivo, /identificação/)
  assert.deepStrictEqual(A.editarInsumo(item, { tipo: 'bebida', grupo: 'revenda' }).corpo, { tipo: 'bebida', grupo_estoque: 'revenda' })
})

test('ajuste de estoque: entrada soma, saída/perda/consumo tiram, acerto fixa o saldo contado', () => {
  const e = A.ajusteEstoque(item, { acao: 'entrada', qtd: '5', custo: '31', motivo: 'Compra avulsa' })
  assert.deepStrictEqual({ c: e.caminho, m: e.metodo, b: e.corpo }, { c: '/api/admin/ingredientes/i1', m: 'PATCH', b: { acao: 'entrada', qtd: 5, custo_lancamento: 31, motivo: 'Compra avulsa' } })
  assert.match(e.resumo, /\+5 kg/)
  const p = A.ajusteEstoque(item, { acao: 'perda', qtd: '1,5', observacao: 'venceu' })
  assert.deepStrictEqual(p.corpo, { acao: 'perda', qtd: 1.5, observacao: 'venceu' })
  assert.match(p.resumo, /−1,5 kg/)
  const a = A.ajusteEstoque(item, { acao: 'ajuste', qtd: '7' })
  assert.deepStrictEqual(a.corpo, { acao: 'ajuste', qtd: 7 })
  assert.match(a.resumo, /saldo.*7 kg/)
  assert.match(A.ajusteEstoque(item, { acao: 'saida', qtd: '9' }).motivo, /só tem 4/)
  assert.match(A.ajusteEstoque(item, { acao: 'voar', qtd: '1' }).motivo, /tipo de movimento/i)
  assert.match(A.ajusteEstoque(item, { acao: 'entrada', qtd: '0' }).motivo, /maior que zero/)
})

test('entrada sem nota: fornecedor (cadastrado ou só o nome), documento, data e os itens com quantidade e custo', () => {
  const r = A.entradaSemNota({ fornecedorId: 'forn-1', documento: 'recibo 12', data: '10/09/2026', motivo: 'compra no mercado',
    itens: [{ ingredienteId: 'i1', qtd: '2', custo: '31' }, { ingredienteId: '', qtd: '', custo: '' }, { ingredienteId: 'i2', qtd: '10' }] })
  assert.strictEqual(r.caminho, '/api/admin/estoque/entrada-sem-nota')
  assert.strictEqual(r.metodo, 'POST')
  assert.deepStrictEqual(r.corpo, { fornecedor_id: 'forn-1', documento: 'recibo 12', data: '2026-09-10', motivo: 'compra no mercado',
    itens: [{ ingrediente_id: 'i1', qtd: 2, custo_unitario: 31 }, { ingrediente_id: 'i2', qtd: 10 }] })
  assert.match(r.resumo, /2 itens/)
  assert.match(A.entradaSemNota({ itens: [] }).motivo, /ao menos um item/)
  assert.match(A.entradaSemNota({ itens: [{ ingredienteId: 'i1', qtd: '0' }] }).motivo, /quantidade/i)
  assert.strictEqual(A.entradaSemNota({ fornecedorNome: 'Mercado da esquina', itens: [{ ingredienteId: 'i1', qtd: '1' }] }).corpo.fornecedor_nome, 'Mercado da esquina')
})

test('entrada manual COM nota: fornecedor, número/série/data e itens por descrição — vai para a conferência normal', () => {
  const r = A.entradaManual({ fornecedorNome: 'Vale Verde', fornecedorCnpj: '12.345.678/0001-90', fornecedorId: 'forn-1', numero: '8822', serie: '1', dataEmissao: '09/09/2026',
    itens: [{ descricao: 'Muçarela peça 5kg', unidade: 'CX', quantidade: '2', valorUnitario: '150' }, { descricao: '', quantidade: '', valorUnitario: '' }] })
  assert.strictEqual(r.caminho, '/api/admin/estoque/entradas/manual')
  assert.deepStrictEqual(r.corpo, { fornecedor_nome: 'Vale Verde', fornecedor_cnpj: '12345678000190', fornecedor_id: 'forn-1', numero: '8822', serie: '1', data_emissao: '2026-09-09',
    tipo_documento: 'nfe', itens: [{ descricao: 'Muçarela peça 5kg', unidade: 'CX', quantidade: 2, valor_unitario: 150 }] })
  assert.match(r.resumo, /8822/)
  assert.match(A.entradaManual({ itens: [{ descricao: 'x', quantidade: '1', valorUnitario: '1' }] }).motivo, /fornecedor/i)
  assert.match(A.entradaManual({ fornecedorNome: 'V', itens: [] }).motivo, /ao menos um item/)
})

test('fornecedor: editar por id (só o que mudou) e excluir', () => {
  const f = { id: 'forn-1', nome: 'Vale Verde', cnpj: '12.345.678/0001-90', telefone: '(75) 3222-1010', email: '', endereco: '', observacoes: '', tipo: 'fornecedor', ativo: true }
  const r = A.editarFornecedor(f, { nome: 'Vale Verde', telefone: '(75) 3222-2020', email: 'vendas@vale.com', tipo: 'fornecedor', ativo: true })
  assert.deepStrictEqual({ c: r.caminho, m: r.metodo, b: r.corpo }, { c: '/api/admin/fornecedores/forn-1', m: 'PATCH', b: { telefone: '(75) 3222-2020', email: 'vendas@vale.com' } })
  assert.match(A.editarFornecedor(f, { nome: 'Vale Verde', telefone: '(75) 3222-1010' }).motivo, /Nada mudou/)
  assert.match(A.editarFornecedor(f, { email: 'x' }).motivo, /e-mail/i)
  assert.match(A.editarFornecedor(f, { cnpj: '123' }).motivo, /CNPJ/)
  const d = A.excluirFornecedor(f)
  assert.deepStrictEqual({ c: d.caminho, m: d.metodo }, { c: '/api/admin/fornecedores/forn-1', m: 'DELETE' })
})

test('pendência: resolver diz o que foi feito', () => {
  const r = A.resolverPendencia({ id: 'pend-1', produto: 'Energético', problema: 'Falta' }, { resolucao: 'fornecedor mandou os 6 no dia seguinte' })
  assert.deepStrictEqual({ c: r.caminho, m: r.metodo, b: r.corpo }, { c: '/api/admin/estoque/pendencias', m: 'PATCH', b: { id: 'pend-1', status: 'resolvida', resolucao: 'fornecedor mandou os 6 no dia seguinte' } })
  assert.match(r.resumo, /Energético/)
  assert.match(A.resolverPendencia({ id: 'pend-1' }, { resolucao: '' }).motivo, /como foi resolvid/i)
  assert.match(A.resolverPendencia({}, { resolucao: 'x' }).motivo, /identificação/)
})

test('ficha técnica: as linhas com insumo e quantidade, ignorando as em branco — e a repetida é recusada', () => {
  const r = A.fichaTecnica({ produtoId: 'prod-1', produto: 'Pizza Calabresa G' }, [{ ingredienteId: 'i1', qtd: '0,25' }, { ingredienteId: '', qtd: '' }, { ingredienteId: 'i2', qtd: '0,18' }])
  assert.deepStrictEqual({ c: r.caminho, m: r.metodo, b: r.corpo }, { c: '/api/admin/estoque/fichas', m: 'PUT', b: { produto_id: 'prod-1', linhas: [{ ingrediente_id: 'i1', qtd_consumida: 0.25 }, { ingrediente_id: 'i2', qtd_consumida: 0.18 }], modo: 'ficha_tecnica' } })
  assert.match(r.resumo, /Pizza Calabresa G.*2 insumos/)
  assert.match(A.fichaTecnica({ produtoId: 'prod-1' }, [{ ingredienteId: 'i1', qtd: '1' }, { ingredienteId: 'i1', qtd: '2' }]).motivo, /repetido/)
  assert.match(A.fichaTecnica({ produtoId: 'prod-1' }, [{ ingredienteId: 'i1', qtd: '0' }]).motivo, /maior que zero/)
  assert.strictEqual(A.fichaTecnica({ produtoId: 'prod-1', produto: 'X' }, []).corpo.linhas.length, 0, 'ficha vazia = produto sem ficha (o painel aceita)')
  assert.match(A.fichaTecnica({}, []).motivo, /identificação/)
})
