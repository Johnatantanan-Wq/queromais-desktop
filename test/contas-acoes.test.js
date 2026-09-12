const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../src-electron/contas-acoes')
const { criarRegistro } = require('../src-electron/contas-local')

const HOJE = '2026-09-08'
const CONTA = { id: 'c1', direcao: 'pagar', descricao: 'Laticínios — NF 8821', valor: 1400, valorPago: 0, situacao: 'pendente' }

test('baixa sem valor paga o saldo inteiro, na data de hoje', () => {
  const r = A.baixa(CONTA, {}, HOJE)
  assert.deepStrictEqual(r.corpo, { valor: 1400, data: HOJE })
  assert.strictEqual(r.quita, true)
  assert.ok(/Paga por inteiro/.test(r.resumo))
})

test('baixa parcial diz quanto resta, e aceita data dd/mm/aaaa e forma', () => {
  const r = A.baixa(CONTA, { valor: '400,00', data: '05/09/2026', forma: 'pix' }, HOJE)
  assert.deepStrictEqual(r.corpo, { valor: 400, data: '2026-09-05', forma_pagamento: 'pix' })
  assert.strictEqual(r.quita, false)
  assert.ok(/restam R\$ 1\.000,00 em Pix/.test(r.resumo), r.resumo)
})

test('a baixa é recusada AQUI com a MESMA frase do painel', () => {
  assert.ok(/acima do saldo devedor \(1400,00\)/.test(A.baixa(CONTA, { valor: '1500' }, HOJE).motivo))
  assert.ok(/não pode ser futura/.test(A.baixa(CONTA, { data: '10/09/2026' }, HOJE).motivo))
  assert.ok(/maior que zero/.test(A.baixa(CONTA, { valor: '0' }, HOJE).motivo))
  assert.ok(/já está quitada/.test(A.baixa({ ...CONTA, situacao: 'paga' }, {}, HOJE).motivo))
  assert.ok(/cancelada/.test(A.baixa({ ...CONTA, situacao: 'cancelada' }, {}, HOJE).motivo))
  assert.ok(/desconhecida/.test(A.baixa(CONTA, { forma: 'vale' }, HOJE).motivo))
  assert.ok(/dd\/mm\/aaaa/.test(A.baixa(CONTA, { data: 'ontem' }, HOJE).motivo))
})

test('o saldo considera o que já foi pago — segunda parcela não repete a primeira', () => {
  const meio = { ...CONTA, valorPago: 1000 }
  assert.strictEqual(A.saldoDe(meio), 400)
  const r = A.baixa(meio, {}, HOJE)
  assert.strictEqual(r.corpo.valor, 400)
  assert.strictEqual(r.quita, true)
})

test('conta a receber fala em "recebida", não em "paga"', () => {
  const r = A.baixa({ ...CONTA, direcao: 'receber' }, {}, HOJE)
  assert.ok(/Recebida por inteiro/.test(r.resumo))
})

test('conta sem id não vira URL com "undefined"', () => {
  const r = A.baixa({ direcao: 'pagar', valor: 10 }, {}, HOJE)
  assert.strictEqual(r.ok, false)
  assert.ok(!/undefined/.test(r.motivo))
})

test('conta nova: só o essencial é obrigatório, e a data entra como o painel quer', () => {
  const r = A.nova({ direcao: 'pagar', descricao: ' Aluguel ', valor: '2.500,00', vencimento: '10/10/2026', forma: 'boleto', contraparte: 'Imobiliária' })
  assert.deepStrictEqual(r.corpo, { direcao: 'pagar', descricao: 'Aluguel', valor: 2500, vencimento: '2026-10-10', forma_pagamento: 'boleto', contraparte: 'Imobiliária' })
  assert.ok(/para 10\/10\/2026/.test(r.resumo))
})

test('conta nova: recusa direção, descrição, valor e vencimento errados', () => {
  assert.ok(/pagar ou a receber/.test(A.nova({ direcao: 'x' }).motivo))
  assert.ok(/do que é/.test(A.nova({ direcao: 'pagar', descricao: '' }).motivo))
  assert.ok(/maior que zero/.test(A.nova({ direcao: 'pagar', descricao: 'A', valor: '0' }).motivo))
  assert.ok(/dd\/mm\/aaaa/.test(A.nova({ direcao: 'pagar', descricao: 'A', valor: '1', vencimento: 'amanhã' }).motivo))
})

test('em demonstração: baixa parcial vira "parcial", inteira vira paga/recebida; conta nova entra', () => {
  const reg = criarRegistro()
  const base = { contas: [{ ...CONTA }, { id: 'c2', direcao: 'receber', valor: 100, valorPago: 0, situacao: 'pendente' }] }
  reg.baixar('c1', 400, 'pix', HOJE)
  reg.baixar('c2', 100, null, HOJE)
  reg.criar({ direcao: 'pagar', descricao: 'Luz', valor: 300, vencimento: '2026-09-20' })
  const d = reg.aplicar(base)
  assert.strictEqual(d.contas[0].situacao, 'parcial')
  assert.strictEqual(d.contas[0].valorPago, 400)
  assert.strictEqual(d.contas[1].situacao, 'recebida')
  assert.strictEqual(d.contas[1].liquidadoEm, HOJE)
  assert.strictEqual(d.contas[2].descricao, 'Luz')
  assert.strictEqual(base.contas[0].valorPago, 0, 'o dado de origem não é tocado')
})

// ── Parcelamento (painel, 09/09/2026) ───────────────────────────────────────
// O operador digita o TOTAL da nota — que é o que ele tem na mão — e em quantas vezes.
const C = require('../src-electron/contas-acoes')

test('⚠️ a sobra dos centavos vai na ÚLTIMA parcela — a soma fecha com a nota', () => {
  const g = C.parcelasSugeridas(1000, 3, '2026-03-10')
  assert.strictEqual(g.length, 3)
  assert.strictEqual(g[0].valor, 333.33)
  assert.strictEqual(g[2].valor, 333.34, 'sem isso o fornecedor cobra um centavo que o sistema não tem')
  assert.strictEqual(g.reduce((s, p) => s + p.valor, 0), 1000)
})

test('dia que não existe no mês transborda para o seguinte', () => {
  // 31/01 + 1 mês: fevereiro não tem 31, então cai em março.
  const g = C.parcelasSugeridas(300, 2, '2026-01-31')
  assert.ok(g[1].vencimento.startsWith('2026-03'), g[1].vencimento)
})

test('vencimento em fim de semana anda para o próximo dia útil', () => {
  // 2026-03-07 é sábado.
  const g = C.parcelasSugeridas(100, 1, '2026-03-07')
  assert.strictEqual(new Date(g[0].vencimento + 'T12:00:00Z').getUTCDay(), 1, 'tem que cair na segunda')
})

test('conta parcelada manda a grade pronta e o total como valor', () => {
  const r = C.nova({ direcao: 'pagar', descricao: 'NF 8821', valor: '4.200,00',
    vencimento: '10/10/2026', parcelas: 3, documento: '8821' })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.corpo.natureza, 'parcelada')
  assert.strictEqual(r.corpo.parcelas, 3)
  assert.strictEqual(r.corpo.documento, '8821')
  assert.strictEqual(r.corpo.parcelas_detalhe.length, 3)
  assert.match(r.resumo, /3x/)
})

test('uma parcela só continua sendo conta avulsa', () => {
  const r = C.nova({ direcao: 'pagar', descricao: 'Aluguel', valor: '6.800,00', vencimento: '05/10/2026', parcelas: 1 })
  assert.strictEqual(r.corpo.natureza, undefined)
  assert.strictEqual(r.corpo.valor, 6800)
})

test('o documento da NF vira campo próprio, não texto solto na descrição', () => {
  const r = C.nova({ direcao: 'pagar', descricao: 'Compra', valor: '100', vencimento: '05/10/2026', documento: 'NF 123' })
  assert.strictEqual(r.corpo.documento, 'NF 123', 'solto na descrição ninguém acha pela busca')
})

test('mais de 60 parcelas é recusado antes de sair', () => {
  const r = C.nova({ direcao: 'pagar', descricao: 'x', valor: '100', vencimento: '05/10/2026', parcelas: 61 })
  assert.strictEqual(r.ok, false)
})

// ── FINANCEIRO pelo app: lançamento avulso, editar e cancelar conta ────────
test('lançamento: receita ou despesa, com categoria do plano e a data — como o NovoLancamento do painel', () => {
  const r = A.lancamento({ tipo: 'despesa', categoria: 'Energia', descricao: ' Conta de luz ', valor: '412,30', data: '10/09/2026', centroCusto: 'cozinha', forma: 'pix', contaFinanceiraId: 'b1' })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.caminho, '/api/admin/lancamentos')
  assert.strictEqual(r.metodo, 'POST')
  assert.deepStrictEqual(r.corpo, { tipo: 'despesa', categoria: 'Energia', descricao: 'Conta de luz', valor: 412.3, data: '2026-09-10', centro_custo: 'cozinha', forma_pagamento: 'pix', conta_financeira_id: 'b1' })
  assert.match(r.resumo, /Despesa.*412,30/)
  const rec = A.lancamento({ tipo: 'receita', categoria: 'Outras receitas', descricao: 'Aluguel do espaço', valor: '300', data: '2026-09-10' })
  assert.deepStrictEqual(rec.corpo, { tipo: 'receita', categoria: 'Outras receitas', descricao: 'Aluguel do espaço', valor: 300, data: '2026-09-10' })
})

test('lançamento: recusa o que o painel recusaria, com frase de gente', () => {
  assert.match(A.lancamento({ tipo: 'x', categoria: 'Energia', descricao: 'a', valor: '1', data: '2026-09-10' }).motivo, /receita ou despesa/)
  assert.match(A.lancamento({ tipo: 'despesa', categoria: '', descricao: 'a', valor: '1', data: '2026-09-10' }).motivo, /categoria/i)
  assert.match(A.lancamento({ tipo: 'despesa', categoria: 'Energia', descricao: '', valor: '1', data: '2026-09-10' }).motivo, /descri/i)
  assert.match(A.lancamento({ tipo: 'despesa', categoria: 'Energia', descricao: 'a', valor: '0', data: '2026-09-10' }).motivo, /maior que zero/)
  assert.match(A.lancamento({ tipo: 'despesa', categoria: 'Energia', descricao: 'a', valor: '1', data: '31/02' }).motivo, /dd\/mm\/aaaa/)
  assert.ok(A.CATEGORIAS_DESPESA.indexOf('Insumos') >= 0 && A.CATEGORIAS_RECEITA.indexOf('Vendas') >= 0)
  assert.ok(A.CENTROS_CUSTO.some((c) => c.v === 'cozinha' && c.r === 'Cozinha'))
})

test('editar conta: só o que mudou viaja, por id — e conta quitada não se edita', () => {
  const conta = { id: 'c1', direcao: 'pagar', descricao: 'Aluguel', valor: 1400, vencimento: '2026-09-10', categoria: 'Aluguel', contraparte: 'Imobiliária', situacao: 'pendente' }
  const r = A.editar(conta, { descricao: 'Aluguel de setembro', valor: '1.450,00', vencimento: '15/09/2026', categoria: 'Aluguel', contraparte: 'Imobiliária', observacao: 'reajuste' })
  assert.strictEqual(r.caminho, '/api/admin/contas/c1')
  assert.strictEqual(r.metodo, 'PATCH')
  assert.deepStrictEqual(r.corpo, { descricao: 'Aluguel de setembro', valor: 1450, vencimento: '2026-09-15', observacao: 'reajuste' })
  assert.match(A.editar(conta, { descricao: 'Aluguel', valor: '1400', vencimento: '10/09/2026' }).motivo, /Nada mudou/)
  assert.match(A.editar({ ...conta, situacao: 'paga' }, { valor: '1' }).motivo, /quitada/)
  assert.match(A.editar(conta, { valor: '0' }).motivo, /maior que zero/)
  assert.match(A.editar({}, {}).motivo, /identificação/)
})

test('cancelar conta: uma só, ou a série inteira quando é parcelada', () => {
  const r = A.cancelar({ id: 'c1', descricao: 'Aluguel', situacao: 'pendente' })
  assert.deepStrictEqual({ c: r.caminho, m: r.metodo, b: r.corpo }, { c: '/api/admin/contas/c1', m: 'PATCH', b: { acao: 'cancelar' } })
  const serie = A.cancelar({ id: 'c2', descricao: 'NF 8821 — parcela 1/3', serie: 's1', situacao: 'pendente' }, 'serie')
  assert.deepStrictEqual(serie.corpo, { acao: 'cancelar', escopo: 'serie' })
  assert.match(serie.resumo, /série/)
  assert.match(A.cancelar({ id: 'c1', situacao: 'paga' }).motivo, /quitada/)
  assert.match(A.cancelar({ id: 'c1', situacao: 'cancelada' }).motivo, /já está cancelada/)
})
