// Os nomes e as contas que mudaram no PAINEL entre 09/09 e 11/09/2026, e que o app
// precisa repetir — se divergirem, o app mostra um número ou um nome que a plataforma
// não usa mais, e quem fecha o caixa confia no errado.
//
//  1. `a_receber` chama-se CRÉDITO FUNC como FORMA de pagamento (a chave no banco não
//     mudou). Onde "A receber" é o balde do que ainda não entrou, o nome fica.
//  2. O Pix do SITE (gateway) não entra na conferência do fechamento — só o que uma
//     pessoa lançou na porta/balcão. Foi uma falta falsa de R$ 1.122 que revelou isso.
//  3. Loja sem Pix online continua com um card "Pix" só — inclusive enquanto o
//     servidor não mandar os campos novos.
const { test } = require('node:test')
const assert = require('node:assert')
const C = require('../renderer/elo/tela-caixa')
const Ficha = require('../renderer/elo/ficha')
const Fin = require('../renderer/elo/tela-financeiro')

const estado = { online: true, ts: Date.now() }

const caixaBase = {
  aberto: { id: 'c1', abertoEm: '2026-09-11T08:00:00Z', abertoPor: 'Ana', fundoInicial: 150 },
  resumo: { vendaDinheiro: 842.5, vendaPix: 1959.4, vendaCartao: 2145.9, vendaAReceber: 180,
    suprimentos: 50, sangrias: 300, ajustes: 0 },
  esperadoDinheiro: 742.5,
  movimentacoes: [
    { id: 'm1', tipo: 'venda', forma: 'a_receber', valor: 54, descricao: 'Pedido #1041',
      criadoEm: '2026-09-11T20:05:00Z', estornada: false },
  ],
  mesas: [], entregas: [], historico: [], temMesas: false,
}

// Os números reais do turno de 09/09 da Pizzas do Jasson: R$ 1.959,40 de Pix =
// R$ 1.653,65 do gateway (23 vendas) + R$ 305,75 informados por gente (5).
const comPixOnline = Object.assign({}, caixaBase, {
  resumo: Object.assign({}, caixaBase.resumo, { vendaPixOnline: 1653.65, vendaPixConferir: 305.75 }),
})

test('a forma a_receber aparece como CRÉDITO FUNC no caixa', () => {
  assert.strictEqual(C.rotuloForma('a_receber'), 'CRÉDITO FUNC')
  const h = C.htmlDoCaixa(caixaBase, Object.assign({ subaba: 'movimentacoes' }, estado))
  assert.ok(h.includes('CRÉDITO FUNC'), 'o caixa ainda chama a_receber pelo nome antigo')
})

test('sem Pix online, o caixa mostra um card "Pix" só', () => {
  const h = C.htmlDoCaixa(caixaBase, estado)
  assert.ok(h.includes('>Pix<'), 'o card Pix sumiu na loja que não tem Pix online')
  assert.ok(!h.includes('Pix online'), 'inventou o card de Pix online sem dado do servidor')
})

test('com Pix online, o caixa separa o do site do que se confere na mão', () => {
  const h = C.htmlDoCaixa(comPixOnline, estado)
  assert.ok(h.includes('Pix online'), 'falta o card do Pix do site')
  assert.ok(h.includes('Pix manual'), 'falta o card do Pix conferível')
  assert.ok(h.includes('1.653,65'), 'o valor do gateway não apareceu')
  assert.ok(h.includes('305,75'), 'o valor conferível não apareceu')
})

test('o fechamento NÃO pede o Pix do site — só o conferível', () => {
  const h = Ficha.fichaFechamento(comPixOnline)
  assert.ok(h.includes('305,75'), 'o esperado do Pix deveria ser só o conferível')
  assert.ok(!/Esperado[\s\S]*1\.959,40/.test(h), 'o fechamento está pedindo o Pix TOTAL — falta falsa')
  assert.ok(h.includes('não entra na conferência'), 'falta dizer que o Pix do site está fora')
})

test('sem Pix online, o fechamento segue pedindo o Pix do turno', () => {
  const h = Ficha.fichaFechamento(caixaBase)
  assert.ok(h.includes('1.959,40'), 'o esperado do Pix sumiu na loja sem gateway')
  assert.ok(!h.includes('não entra na conferência'), 'avisou de Pix do site que não existe')
})

test('o financeiro chama os dois Pix pelos nomes do painel', () => {
  assert.strictEqual(Fin.FORMA.pix, 'PIX manual')
  assert.strictEqual(Fin.FORMA.pix_online, 'PIX online (site)')
  assert.strictEqual(Fin.FORMA.a_receber, 'CRÉDITO FUNC')
})

// ── "Vendi × recebi" na Visão geral do Financeiro ──────────────────────────
const Principais = require('../renderer/elo/telas-principais')
const demoDados = require('../src-electron/demo-dados')

test('⚠️ o quadro de recebimentos tem ORDEM FIXA, não por valor', () => {
  // Ordenar por valor fazia a tabela trocar de ordem a cada período — e quem confere a
  // maquininha procura sempre na mesma linha.
  const fora = [
    { forma: 'pix', bruto: 305.75 }, { forma: 'credito', bruto: 1400 },
    { forma: 'pix_online', bruto: 1653.65 }, { forma: 'dinheiro', bruto: 842.5 },
    { forma: 'debito', bruto: 745.9 },
  ]
  assert.deepStrictEqual(Principais.ordenarRecebimentos(fora).map((l) => l.forma),
    ['credito', 'debito', 'dinheiro', 'pix_online', 'pix'])
})

test('forma fora da ordem fixa vem depois, da maior para a menor', () => {
  const l = Principais.ordenarRecebimentos([
    { forma: 'a_receber', bruto: 100 }, { forma: 'ifood', bruto: 900 }, { forma: 'dinheiro', bruto: 10 },
  ])
  assert.deepStrictEqual(l.map((x) => x.forma), ['dinheiro', 'ifood', 'a_receber'])
})

test('os dois PIX ficam vizinhos, e o do site vem antes', () => {
  const h = Principais.quadroRecebimentos([
    { forma: 'pix', recebimentos: 5, bruto: 305.75, taxa: 3.06, pctEfetivo: 1, liquido: 302.69 },
    { forma: 'pix_online', recebimentos: 23, bruto: 1653.65, taxa: 16.54, pctEfetivo: 1, liquido: 1637.11 },
  ])
  assert.ok(h.indexOf('PIX online (site)') < h.indexOf('PIX manual'))
  // ⚠️ A taxa é a MESMA nas duas: sem essa ligação a linha do gateway apareceria sem
  // taxa nenhuma, e o líquido do dia sairia maior do que o que cai na conta.
  assert.match(h, /16,54/)
  assert.match(h, /3,06/)
})

test('dinheiro não tem taxa — e isso aparece como traço, não como zero', () => {
  const h = Principais.quadroRecebimentos([
    { forma: 'dinheiro', recebimentos: 8, bruto: 842.5, taxa: 0, pctEfetivo: 0, liquido: 842.5 },
  ])
  assert.ok(!/− R\$ 0,00/.test(h), 'zero de taxa polui a coluna')
})

test('sem o dado do servidor, o quadro simplesmente não aparece', () => {
  assert.strictEqual(Principais.quadroRecebimentos([]), '')
  assert.strictEqual(Principais.quadroRecebimentos(null), '')
  // ...e a Visão geral continua de pé.
  const h = Principais.htmlFinanceiroVisao({ ...demoDados.telasComAbas().financeiro.visao, recebimentos: null }, {})
  assert.match(h, /Faturamento/)
})
