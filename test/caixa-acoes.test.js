const { test } = require('node:test')
const assert = require('node:assert')
const C = require('../src-electron/caixa-acoes')
const { criarRegistro } = require('../src-electron/caixa-local')
const demo = require('../src-electron/demo-dados')

test('sangria vai para a rota do painel, com o valor como número', () => {
  const r = C.movimentacao({ tipo: 'sangria', valor: '1.250,50', motivo: 'Depósito bancário', caixaAberto: true })
  assert.strictEqual(r.caminho, '/api/admin/caixa/movimentacao')
  assert.deepStrictEqual(r.corpo, { tipo: 'sangria', valor: 1250.5, motivo: 'Depósito bancário', descricao: null })
})

test('o lojista digita como fala: 12,50 · 12.50 · 1.250,50', () => {
  assert.strictEqual(C.valorDigitado('12,50'), 12.5)
  assert.strictEqual(C.valorDigitado('12.50'), 1250)   // ponto é milhar em pt-BR
  assert.strictEqual(C.valorDigitado('1.250,50'), 1250.5)
  assert.strictEqual(C.valorDigitado(' 30 '), 30)
  assert.ok(isNaN(C.valorDigitado('')))
})

test('valor zero ou negativo não vira lançamento', () => {
  assert.strictEqual(C.movimentacao({ tipo: 'sangria', valor: '0', caixaAberto: true }).ok, false)
  assert.strictEqual(C.movimentacao({ tipo: 'sangria', valor: '-5', caixaAberto: true }).ok, false)
  assert.strictEqual(C.movimentacao({ tipo: 'sangria', valor: 'abc', caixaAberto: true }).ok, false)
})

test('caixa fechado: o app avisa em vez de tomar 422 do painel', () => {
  const r = C.movimentacao({ tipo: 'sangria', valor: '10', caixaAberto: false })
  assert.strictEqual(r.ok, false)
  assert.ok(/Abra o caixa/i.test(r.motivo), r.motivo)
})

test('tipo desconhecido não vira chamada', () => {
  assert.strictEqual(C.movimentacao({ tipo: 'estorno', valor: '10', caixaAberto: true }).ok, false)
})

test('fechar exige os três contados — é o que o painel exige', () => {
  assert.strictEqual(C.fechamento({ dinheiro: '10', pix: '', cartao: '5', caixaAberto: true }).ok, false)
  const r = C.fechamento({ dinheiro: '592,50', pix: '0', cartao: '2.145,90', caixaAberto: true })
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(r.corpo, {
    dinheiro_contado: 592.5, pix_contado: 0, cartao_contado: 2145.9, observacao: null,
  })
})

test('zero é resposta válida no fechamento — não é campo vazio', () => {
  assert.strictEqual(C.fechamento({ dinheiro: '0', pix: '0', cartao: '0', caixaAberto: true }).ok, true)
})

test('abrir caixa aceita fundo zero, recusa se já há caixa aberto', () => {
  assert.strictEqual(C.abertura({ fundo: '', caixaAberto: false }).corpo.fundo_inicial, 0)
  assert.strictEqual(C.abertura({ fundo: '100', caixaAberto: true }).ok, false)
})

// ── demonstração ──
test('em demonstração a sangria muda o dinheiro esperado e entra nas movimentações', () => {
  const reg = criarRegistro()
  const antes = demo.caixa()
  reg.lancar({ tipo: 'sangria', valor: 100, motivo: 'Depósito bancário' })
  const depois = reg.aplicar(demo.caixa())
  assert.strictEqual(depois.resumo.sangrias, antes.resumo.sangrias + 100)
  assert.strictEqual(depois.esperadoDinheiro, antes.esperadoDinheiro - 100)
  assert.strictEqual(depois.movimentacoes.length, antes.movimentacoes.length + 1)
  assert.strictEqual(depois.movimentacoes[0].tipo, 'sangria')
})

test('suprimento anda para o outro lado', () => {
  const reg = criarRegistro()
  const antes = demo.caixa()
  reg.lancar({ tipo: 'suprimento', valor: 40 })
  const depois = reg.aplicar(demo.caixa())
  assert.strictEqual(depois.esperadoDinheiro, antes.esperadoDinheiro + 40)
  assert.strictEqual(depois.resumo.suprimentos, antes.resumo.suprimentos + 40)
})

test('sem lançamento nenhum, o caixa volta igualzinho', () => {
  const reg = criarRegistro()
  const c = demo.caixa()
  assert.strictEqual(reg.aplicar(c), c)
})

test('a tela de caixa fechado oferece o botão de abrir — não manda ao painel', () => {
  const TelaCaixa = require('../renderer/elo/tela-caixa')
  const h = TelaCaixa.htmlDoCaixa({ ...demo.caixa(), aberto: null }, { online: true, ts: Date.now() })
  assert.ok(h.includes('data-acao="caixa:abrir"'), 'precisa do botão de abrir')
  assert.ok(!/Abrir e fechar o caixa ainda é pelo painel/.test(h), 'o recado velho tem de sair')
})

test('a ficha de abertura pede o fundo e já vem com zero', () => {
  const Ficha = require('../renderer/elo/ficha')
  const h = Ficha.fichaAbertura()
  assert.ok(h.includes('data-campo="fundo"'))
  assert.ok(h.includes('data-acao="caixa:abrir:confirmar"'))
})

test('TODA janela do app é popup centralizado, como as nove do painel', () => {
  // Levantamento do painel (08/09): ficha do pedido, ficha do cliente, concluir
  // entrega, lançamento de entrada — todas centralizadas. Nenhuma lateral.
  const Ficha = require('../renderer/elo/ficha')
  const pop = Ficha.popup('Sangria', '<p>x</p>')
  assert.ok(/align-items:center;justify-content:center/.test(pop), 'o popup fica no meio da tela')
  assert.ok(/border-radius:16px/.test(pop) && /box-shadow:0 24px 64px/.test(pop), 'cantos e sombra do formato do painel')
  assert.ok(/data-fechar-ficha="1"/.test(pop), 'fecha pelo fundo e pelo ✕')
  assert.ok(pop.indexOf('id="eloFicha"') >= 0, 'mesmo id — fecharFicha() serve para todas')
})

test('abrirFicha passou a abrir popup — nenhuma janela ficou lateral', () => {
  const fs = require('fs')
  const path = require('path')
  const shell = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'shell.js'), 'utf8')
  assert.ok(/function abrirFicha\(titulo, corpo, largura\) \{\s*\n\s*abrirPopup\(/.test(shell),
    'abrirFicha tem de delegar ao popup')
  assert.ok(!/Ficha\.painel\(/.test(shell), 'nada no shell pode mais abrir a ficha lateral')
})

test('a largura acompanha o que a janela carrega, como no painel', () => {
  const fs = require('fs')
  const path = require('path')
  const shell = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'shell.js'), 'utf8')
  // pedido inteiro é maior que ficha de cliente — 720 e 560, os números do painel
  assert.ok(/fichaPedido\([\s\S]{0,400}?\), 720\)/.test(shell), 'ficha do pedido em 720')
  assert.ok(/fichaCliente\(item\), 560\)/.test(shell), 'ficha do cliente em 560')
})

test('o shell abre as janelas do caixa como popup, não como ficha lateral', () => {
  const fs = require('fs')
  const path = require('path')
  const shell = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'shell.js'), 'utf8')
  for (const acao of ['Sangria', 'Fechar caixa', 'Abrir caixa']) {
    const linha = shell.split('\n').find((l) => l.includes("'" + acao + "'") && /abrir(Ficha|Popup)/.test(l))
    assert.ok(linha, 'não achei onde ' + acao + ' abre')
    assert.ok(/abrirPopup/.test(linha), acao + ' tem de abrir como popup: ' + linha.trim())
  }
})

test('o popup pode ser de altura FIXA — e so a venda pede isso', () => {
  const Ficha = require('../renderer/elo/ficha')
  assert.ok(/height:88vh;/.test(Ficha.popup('Venda', '<p>x</p>', 980, true)), 'fixo: o quadro nao muda com o conteudo')
  assert.ok(/max-height:88vh;/.test(Ficha.popup('Sangria', '<p>x</p>')), 'os outros crescem ate o limite')
  const fs = require('fs'), path = require('path')
  const shell = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'shell.js'), 'utf8')
  assert.ok(/'Venda manual'[\s\S]{0,200}\}\), 980, true\)/.test(shell), 'a venda manual abre com o quadro fixo')
})

// ── Delivery e Mesas ──
const ENT = { id: 'p1', pedido: '1040', cliente: 'Carla', valor: 132.4, forma: 'cartao_entrega', tipo: 'entrega', trocoPara: 150 }

test('concluir entrega: marca entregue com a forma do CAIXA — "cartão na entrega" vira cartao', () => {
  const r = C.concluirEntrega(ENT, {})
  assert.strictEqual(r.caminho, '/api/admin/pedidos/p1/status')
  assert.deepStrictEqual(r.corpo, { status: 'entregue', forma_caixa: 'cartao' })
  assert.ok(/#1040 entregue — R\$ 132,40 em cartão/.test(r.resumo), r.resumo)
})

test('concluir: a forma escolhida no popup ganha da do pedido, e o valor só vai se informado', () => {
  const r = C.concluirEntrega(ENT, { forma: 'pix', valor: '130,00' })
  assert.deepStrictEqual(r.corpo, { status: 'entregue', forma_caixa: 'pix', valor_recebido: 130 })
  assert.ok(/Escolha como o cliente pagou/.test(C.concluirEntrega({ ...ENT, forma: '' }, {}).motivo))
  assert.ok(/maior que zero/.test(C.concluirEntrega(ENT, { valor: '0' }).motivo))
})

test('retirada entregue diz "no balcão"', () => {
  assert.ok(/entregue no balcão/.test(C.concluirEntrega({ ...ENT, tipo: 'retirada', forma: 'dinheiro' }, {}).resumo))
})

test('confirmar recebimento vai pela rota de recebimento, só com a forma', () => {
  const r = C.confirmarRecebimento({ ...ENT, forma: 'dinheiro' }, {})
  assert.strictEqual(r.caminho, '/api/admin/pedidos/p1/recebimento')
  assert.deepStrictEqual(r.corpo, { forma_caixa: 'dinheiro' })
  assert.ok(/entrou no caixa/.test(r.resumo))
})

test('entrega sem id não vira URL com "undefined"', () => {
  for (const fn of ['concluirEntrega', 'confirmarRecebimento']) {
    const r = C[fn]({ pedido: '9', forma: 'pix' }, {})
    assert.strictEqual(r.ok, false, fn); assert.ok(!/undefined/.test(r.motivo), fn)
  }
})

const MESA = { sessaoId: 's14', mesa: '14', consumo: 76.9, garcom: 'Valdecir', pedidos: 2 }

test('fechar mesa: o pagamento tem de fechar com consumo + gorjeta — o painel exige', () => {
  const ok = C.fecharMesa(MESA, { forma: 'pix' })
  assert.deepStrictEqual(ok.corpo, { gorjeta_valor: 0, pagamentos: [{ forma: 'pix', valor: 76.9 }] })
  const comGorjeta = C.fecharMesa(MESA, { forma: 'dinheiro', gorjeta: '7,69' })
  assert.strictEqual(comGorjeta.corpo.pagamentos[0].valor, 84.59)
  assert.ok(/com R\$ 7,69 de gorjeta/.test(comGorjeta.resumo))
  const errado = C.fecharMesa(MESA, { forma: 'pix', valor: '70' })
  assert.ok(/\(R\$ 70,00\) tem de fechar com a conta \(R\$ 76,90\)/.test(errado.motivo), errado.motivo)
})

test('fechar mesa: recusa sem sessão, sem consumo, sem forma e gorjeta negativa', () => {
  assert.ok(/sem a sessão/.test(C.fecharMesa({ mesa: '1', consumo: 10 }, { forma: 'pix' }).motivo))
  assert.ok(/não tem consumo/.test(C.fecharMesa({ ...MESA, consumo: 0 }, { forma: 'pix' }).motivo))
  assert.ok(/Escolha como a mesa pagou/.test(C.fecharMesa(MESA, {}).motivo))
  assert.ok(/Gorjeta inválida/.test(C.fecharMesa(MESA, { forma: 'pix', gorjeta: '-1' }).motivo))
})

test('as entregas do painel viram os cartões do caixa, com o estado certo', () => {
  const D = require('../src-electron/adaptadores')
  const lista = D.entregasDoCaixa({ pedidos: [
    { id: 'a', numero: 7, tipo: 'entrega', status: 'entregue', pendente_confirmacao: true, total: 28.99, forma_pagamento: 'dinheiro', cliente_nome: 'Ilza' },
    { id: 'b', numero: 8, tipo: 'entrega', status: 'em_entrega', total: 50, forma_pagamento: 'pix', troco_para: null },
    { id: 'c', numero: 9, tipo: 'retirada', status: 'pronto', total: 20, forma_pagamento: 'cartao_entrega', pago_no_ato: false },
  ] })
  assert.deepStrictEqual(lista.map((e) => e.pedido + ':' + e.estado), ['7:fechamento', '8:transito', '9:pronto'])
  assert.strictEqual(lista[0].valor, 28.99)
  assert.strictEqual(lista[2].tipo, 'retirada')
})

test('as mesas do salão viram as mesas do caixa — só as com sessão aberta, com o id da sessão', () => {
  const D = require('../src-electron/adaptadores')
  const mesas = D.mesasDoCaixa({
    mesas: [{ id: 'm1', numero: 14 }, { id: 'm2', numero: 3 }, { id: 'm9', numero: 9 }],
    sessoes: [
      { sessao: { id: 's1', mesa_id: 'm1', cliente_nome: null, n_pessoas: 2, aberta_em: new Date(Date.now() - 30 * 60000).toISOString() },
        garcom_nome: 'Ana', total_parcial: 80, pagamentos_parciais: 10, lancamentos: 2, prontos_nao_entregues: 1 },
      { sessao: { id: 's2', mesa_id: 'm2', aberta_em: new Date().toISOString() }, total_parcial: 30, lancamentos: 1, itens_preparando: 1 },
    ],
    solicitacoes: [{ tipo: 'conta', mesa_id: 'm2' }],
  })
  assert.deepStrictEqual(mesas.map((m) => m.mesa), ['3', '14'], 'ordem numérica, só as abertas')
  const m14 = mesas.find((m) => m.mesa === '14')
  assert.strictEqual(m14.sessaoId, 's1')
  assert.strictEqual(m14.consumo, 70, 'consumo desconta o que já foi pago em parte')
  assert.strictEqual(m14.situacao, 'Pedido pronto')
  assert.ok(m14.abertaHa >= 29 && m14.abertaHa <= 31)
  assert.strictEqual(mesas.find((m) => m.mesa === '3').situacao, 'Pediu a conta')
})

test('caixaCompleto: sem o resumo não há caixa; sem as abas o caixa continua', () => {
  const D = require('../src-electron/adaptadores')
  assert.strictEqual(D.caixaCompleto({ resumoResp: null }), null)
  const c = D.caixaCompleto({ resumoResp: { aberto: null, resumo: {} }, entregasResp: null, salaoResp: null })
  assert.deepStrictEqual(c.entregas, []); assert.deepStrictEqual(c.mesas, [])
})
