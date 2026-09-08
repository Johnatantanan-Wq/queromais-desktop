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
