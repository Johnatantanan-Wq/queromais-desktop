// Entregadores: as TRÊS abas do painel e, dentro da primeira, a conta que o dono usa
// para acertar com o entregador no fim do turno. Cada `assert` aqui é uma regra que,
// se cair, faz o app mostrar um acerto diferente do que o painel paga.
const { test } = require('node:test')
const assert = require('node:assert')
const demo = require('../src-electron/demo-dados')
const T = require('../renderer/elo/tela-entregadores')
const A = require('../src-electron/adaptadores')
const Acoes = require('../renderer/elo/acoes')
const Shell = require('../renderer/elo/shell')

const estado = { online: true, ts: Date.now() }
const d = demo.listas().entregadores

test('a tela tem as três abas do painel', () => {
  assert.deepStrictEqual(T.ABAS.map((a) => a.chave), ['entregas', 'fechamentos', 'equipe'])
  for (const aba of ['entregas', 'fechamentos', 'equipe']) {
    const h = T.htmlEntregadores(d, { ...estado, aba })
    assert.ok(h.length > 1000, 'a aba ' + aba + ' não desenhou')
    assert.ok(!/undefined|NaN/.test(h), 'a aba ' + aba + ' mostrou undefined/NaN')
  }
})

test('⚠️ o troco VOLTA com a nota: quem leva 50 presta contas de 100', () => {
  // Pedido de R$ 50 com troco para R$ 100: o entregador leva R$ 50 do caixa, devolve ao
  // cliente e volta com a nota de R$ 100. Prestar só o valor do pedido deixaria R$ 50 do
  // caixa desaparecidos todo dia.
  const r = T.resumoPrestacao([
    { total: 50, produtos: 41, taxaEntrega: 9, troco: 50, emRota: false, pagoAntes: false,
      pagamentos: [{ forma: 'dinheiro', valor: 50 }], aPrestar: 100 },
  ])
  assert.strictEqual(r.especie, 100, 'espécie = dinheiro recebido + troco levado')
  assert.strictEqual(r.aPrestar, 100)
})

test('⛔ entrega EM ROTA não vira repasse — só previsão', () => {
  const emRota = { total: 88, produtos: 79, taxaEntrega: 9, troco: 0, emRota: true, pagoAntes: false,
    pagamentos: [{ forma: 'dinheiro', valor: 88 }], aPrestar: 88 }
  const r = T.resumoPrestacao([emRota])
  assert.strictEqual(r.taxas, 0, 'a taxa da entrega em rota não pode entrar no que o fechamento paga')
  assert.strictEqual(r.taxasEmRota, 9)
  assert.strictEqual(r.emRota, 1)
  assert.strictEqual(r.emRotaValor, 88)
})

test('⛔ o que já estava pago antes de sair NÃO entra na prestação', () => {
  const r = T.resumoPrestacao([
    { total: 128, produtos: 119, taxaEntrega: 9, troco: 0, emRota: false, pagoAntes: true,
      pagamentos: [], aPrestar: 0 },
  ])
  assert.strictEqual(r.jaPago, 128)
  assert.strictEqual(r.aPrestar, 0, 'o entregador não tem esse dinheiro na mão')
  assert.strictEqual(r.taxas, 9, 'mas a taxa da entrega ele recebe do mesmo jeito')
})

test('entrega paga em duas formas soma nas duas, sem dobrar o total', () => {
  const r = T.resumoPrestacao([
    { total: 118, produtos: 109, taxaEntrega: 9, troco: 0, emRota: false, pagoAntes: false,
      pagamentos: [{ forma: 'debito', valor: 70 }, { forma: 'dinheiro', valor: 48 }], aPrestar: 118 },
  ])
  assert.strictEqual(r.entregas, 1)
  assert.strictEqual(r.debito, 70)
  assert.strictEqual(r.dinheiro, 48)
  assert.strictEqual(r.aPrestar, 118)
})

test('cada entregador presta a conta dele, e a lista vem por quem deve mais', () => {
  const por = T.agruparPorEntregador(d.entregas)
  assert.strictEqual(por.length, 3)
  assert.ok(por[0].aPrestar >= por[1].aPrestar, 'ordenado por quem tem mais a prestar')
  const tiago = por.find((x) => x.nome === 'Tiago Moura')
  assert.strictEqual(tiago.aPrestar, 189.90, '50 em dinheiro + 50 de troco + 89,90 no crédito')
  assert.strictEqual(tiago.taxas, 18)
})

test('a aba Entregas mostra o acerto e o período', () => {
  const h = T.htmlEntregadores(d, { ...estado, aba: 'entregas' })
  assert.ok(h.includes('Prestação de contas por entregador'))
  assert.ok(h.includes('Troco levado (volta com ele)'), 'o troco precisa estar dito com todas as letras')
  assert.ok(h.includes('Total a prestar contas'))
  assert.ok(h.includes('ainda em rota'), 'entrega na rua tem que aparecer como previsão')
  assert.ok(h.includes('11/09/2026'), 'falta o período do acerto')
})

test('o filtro por entregador muda o rodapé, não a tabela de cima', () => {
  const todos = T.htmlEntregadores(d, { ...estado, aba: 'entregas' })
  const so = T.htmlEntregadores(d, { ...estado, aba: 'entregas', quemEntregador: 'm1' })
  assert.ok(todos.includes('Wesley Barros') && so.includes('Wesley Barros'),
    'a tabela por entregador mostra todos, para dar o quadro do turno')
  assert.ok(so.includes('2 entregas'), 'o rodapé é do entregador escolhido')
})

test('período já fechado não oferece fechar de novo — repasse em dobro', () => {
  const fechado = {
    ...d,
    periodo: { de: '2026-09-01', ate: '2026-09-07' },
    fechamentos: [{ id: 'f', entregadorId: 'm1', entregador: 'Tiago Moura',
      periodoInicio: '2026-09-01', periodoFim: '2026-09-07', valor: 576 }],
  }
  const h = T.htmlEntregadores(fechado, { ...estado, aba: 'entregas' })
  assert.ok(h.includes('✓ Fechado'), 'a linha tem que dizer que o período já foi fechado')
  const aberto = T.htmlEntregadores(d, { ...estado, aba: 'entregas' })
  assert.ok(aberto.includes('Fechar período'))
})

test('⚠️ na cobertura de folga a nota sai no nome do TITULAR', () => {
  const h = T.htmlEntregadores(d, { ...estado, aba: 'fechamentos' })
  assert.ok(h.includes('nota em nome de Tiago Moura'),
    'quem cobriu recebe, mas quem responde pelo CNPJ é o titular')
  assert.ok(h.includes('Não lançado'), 'fechamento sem conta lançada tem que dizer isso')
})

test('fechar período vai para o painel, não fecha pelo app', () => {
  const dest = Acoes.destinoDe('entregador:fechar-periodo:m1')
  assert.ok(dest, 'a ação não pode ficar muda')
  assert.strictEqual(dest.rota, '/admin/motoboys')
})

test('a tela continua alcançável sem internet', () => {
  assert.ok(Shell.ehNativa('/admin/motoboys'),
    'fora de TELAS_NATIVAS a tela fica esmaecida e inalcançável offline')
})

// ── o que vem do servidor ───────────────────────────────────────────────────
test('⚠️ a data da entrega é a do dia da LOJA, não a do relógio da máquina', () => {
  // A rota já resolve o fuso. Reinterpretar como UTC joga a entrega das 21h30 para o dia
  // seguinte — e o acerto fecharia no dia errado.
  const r = A.entregadores({ d: null, fechamentosResp: null,
    entregasResp: { entregas: [{ id: 'x', data: '2026-09-11', total: 10, pagamentos: [] }] } })
  assert.strictEqual(r.entregas[0].data, '2026-09-11')
})

test('uma fonte fora do ar não derruba as outras abas', () => {
  const so = A.entregadores({ d: { itens: [{ nome: 'Tiago' }], contadores: { rota: 1, livre: 0 }, entregasHoje: 2 },
    entregasResp: { error: 'x' }, fechamentosResp: null })
  assert.deepStrictEqual(so.entregas, [])
  assert.deepStrictEqual(so.fechamentos, [])
  assert.strictEqual(so.itens.length, 1, 'a aba Equipe tem que continuar de pé')

  const semEquipe = A.entregadores({ d: { error: 'x' }, fechamentosResp: null,
    entregasResp: { entregas: [{ id: 'x', total: 10, pagamentos: [] }], periodo: { de: 'a', ate: 'b' } } })
  assert.strictEqual(semEquipe.entregas.length, 1, 'a prestação de contas tem que continuar de pé')
  assert.deepStrictEqual(semEquipe.itens, [])
})
