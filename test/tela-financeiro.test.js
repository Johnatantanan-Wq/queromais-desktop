const { test } = require('node:test')
const assert = require('node:assert')
const F = require('../renderer/elo/tela-financeiro')
const demo = require('../src-electron/demo-dados')

const d = demo.telasComAbas().financeiro
const base = { mesConta: '2026-09' }

test('Extrato: saldo corrido bate com entradas menos saídas', () => {
  const totais = F.totaisMovimento(d.extrato)
  assert.ok(totais.entradas > 0 && totais.saidas > 0)
  assert.strictEqual(Math.round((totais.entradas - totais.saidas) * 100) / 100, Math.round(totais.saldo * 100) / 100)
})

test('Extrato: o estornado não entra na conta, mas continua na lista', () => {
  const estornado = d.extrato.find((l) => l.estornado)
  assert.ok(estornado, 'os dados precisam ter um estorno para este teste valer')
  const semEle = F.totaisMovimento(d.extrato.filter((l) => l !== estornado))
  assert.strictEqual(F.totaisMovimento(d.extrato).entradas, semEle.entradas)
  const h = F.htmlFinanceiro(d, { aba: 'extrato', modoExtrato: 'detalhado' })
  assert.ok(h.includes('cancelado'), 'a linha estornada continua visível')
})

test('Extrato: os quatro indicadores do painel', () => {
  const h = F.htmlFinanceiro(d, { aba: 'extrato' })
  assert.ok(h.includes('Entradas') && h.includes('Saídas') && h.includes('Saldo do período') && h.includes('Movimentações'))
})

test('Extrato: "Por dia" junta as vendas do dia numa linha só, que abre', () => {
  const fechado = F.htmlFinanceiro(d, { aba: 'extrato' })
  assert.ok(/Venda diária/.test(fechado))
  assert.ok(!/Pedido #1043 — Marina/.test(fechado), 'fechado, as vendas do dia ficam escondidas')
  const aberto = F.htmlFinanceiro(d, { aba: 'extrato', diasAbertos: ['2026-09-07'] })
  assert.ok(/Pedido #1043/.test(aberto), 'aberto, mostra venda a venda')
})

test('Extrato: filtro por direção, categoria e busca', () => {
  const soSaidas = F.filtrarMovimentos(d.extrato, { direcaoFin: 'saida' })
  assert.ok(soSaidas.length && soSaidas.every((l) => l.direcao === 'saida'))
  const soVenda = F.filtrarMovimentos(d.extrato, { categoriaFin: 'venda' })
  assert.ok(soVenda.every((l) => l.categoria === 'venda'))
  const busca = F.filtrarMovimentos(d.extrato, { buscaFin: 'aluguel' })
  assert.strictEqual(busca.length, 1)
})

test('Extrato detalhado: colunas de origem, forma, usuário e saldo', () => {
  const h = F.htmlFinanceiro(d, { aba: 'extrato', modoExtrato: 'detalhado' })
  assert.ok(h.includes('Origem') && h.includes('Usuário') && h.includes('Saldo'))
  assert.ok(h.includes('Ana Paula'), 'quem lançou aparece')
  assert.ok(/Totais do período/.test(h))
})

test('Livro Caixa é só a GAVETA: cartão e Pix ficam de fora', () => {
  assert.ok(d.livroCaixa.every((l) => l.forma === 'dinheiro'))
  const h = F.htmlFinanceiro(d, { aba: 'livro' })
  assert.ok(h.includes('Vendas em dinheiro') && h.includes('Saldo do movimento'))
  assert.ok(h.includes('Operador'), 'a coluna do Livro Caixa é Operador, não Usuário')
  assert.ok(!/Repasse do cartão/.test(h), 'repasse por transferência não passa pela gaveta')
})

test('Contas a pagar: os quatro números do MÊS', () => {
  const h = F.htmlFinanceiro(d, { ...base, aba: 'pagar' })
  assert.ok(h.includes('Vencidas') && /A vencer em setembro de 2026/.test(h))
  assert.ok(/Pagas em setembro de 2026/.test(h) && /Total previsto setembro de 2026/.test(h))
})

test('Conta vencida NUNCA some do mês, mesmo filtrando outro mês', () => {
  const outroMes = F.htmlFinanceiro(d, { ...base, aba: 'pagar', mesConta: '2026-11' })
  assert.ok(/Manutenção do forno/.test(outroMes), 'a vencida de setembro continua aparecendo em novembro')
})

test('Contas a pagar: sequência, saldo e o que já foi pago', () => {
  const h = F.htmlFinanceiro(d, { ...base, aba: 'pagar' })
  assert.ok(h.includes('1 de 3'), 'parcela vira "1 de 3"')
  assert.ok(/pago R\$ 1\.400,00/.test(h), 'conta parcial mostra o que já entrou')
  assert.ok(/\(previsto\)/.test(h), 'forma definida antes da baixa aparece como prevista')
})

test('Contas a pagar: filtro por situação e por tipo', () => {
  const hoje = d.hoje
  const soVencidas = F.filtrarContas(d.contas.filter((c) => c.direcao === 'pagar'), '2026-09',
    { situacaoConta: 'vencidas' }, hoje)
  assert.ok(soVencidas.length && soVencidas.every((c) => F.situacaoConta(c, hoje) === 'vencida'))
  const soImposto = F.filtrarContas(d.contas.filter((c) => c.direcao === 'pagar'), '2026-09',
    { tipoConta: 'imposto' }, hoje)
  assert.ok(soImposto.length === 1 && /Simples Nacional/.test(soImposto[0].descricao))
})

test('Contas a receber: repasses previstos ficam num cartão à parte', () => {
  const h = F.htmlFinanceiro(d, { ...base, aba: 'receber' })
  assert.ok(/Repasses previstos/.test(h) && /Cartão \(Cielo\)/.test(h))
  assert.ok(/Recebi este repasse/.test(h))
  assert.ok(h.includes('Valor líquido'), 'a coluna do líquido é o que cai na conta')
  assert.ok(/Em aberto \(todos os meses\)/.test(h), 'o quinto número do painel')
})

test('a situação da conta sai do estado + do vencimento', () => {
  const hoje = '2026-09-07'
  assert.strictEqual(F.situacaoConta({ vencimento: '2026-09-02', valor: 100, valorPago: 0 }, hoje), 'vencida')
  assert.strictEqual(F.situacaoConta({ vencimento: '2026-09-20', valor: 100, valorPago: 0 }, hoje), 'pendente')
  assert.strictEqual(F.situacaoConta({ vencimento: '2026-09-02', valor: 100, valorPago: 40 }, hoje), 'parcial')
  assert.strictEqual(F.situacaoConta({ vencimento: '2026-09-02', valor: 100, valorPago: 100 }, hoje), 'paga')
  assert.strictEqual(F.situacaoConta({ direcao: 'receber', vencimento: '2026-09-02', valor: 100, valorPago: 100 }, hoje), 'recebida')
  assert.strictEqual(F.saldoDaConta({ valor: 100, valorPago: 40 }), 60)
})

test('Vendas: cada venda com o que a loja recebeu e o que não entrou', () => {
  const h = F.htmlFinanceiro(d, { aba: 'vendas' })
  assert.ok(h.includes('#1043') && h.includes('Marina Prado'))
  assert.ok(h.includes('Pendente'), 'a venda de mesa em aberto não pode parecer paga')
  assert.ok(/Total de \d+ venda/.test(h))
  const soPagas = F.htmlFinanceiro(d, { aba: 'vendas', filtroFin: 'pagas' })
  assert.ok(!/Mesa 7/.test(soPagas))
})

test('DRE: os cinco números e as linhas que abrem', () => {
  const h = F.htmlFinanceiro(d, { aba: 'dre' })
  assert.ok(h.includes('Receita bruta') && h.includes('Resultado do período'))
  assert.ok(!/Vendas de produtos/.test(h), 'fechada, a linha não mostra as filhas')
  const aberta = F.htmlFinanceiro(d, { aba: 'dre', dreAbertas: ['receita'] })
  assert.ok(/Vendas de produtos/.test(aberta))
  assert.ok(/Despesas por centro de custo/.test(h) && /Cozinha/.test(h))
})

test('o mês anda para frente e para trás sem quebrar o ano', () => {
  assert.strictEqual(F.somaMes('2026-09', 1), '2026-10')
  assert.strictEqual(F.somaMes('2026-12', 1), '2027-01')
  assert.strictEqual(F.somaMes('2026-01', -1), '2025-12')
  assert.strictEqual(F.mesLabel('2026-09'), 'setembro de 2026')
})

test('sem dado, o Financeiro avisa em vez de desenhar tabela vazia', () => {
  assert.ok(/sem dados/i.test(F.htmlFinanceiro(null, { aba: 'extrato' })))
})
