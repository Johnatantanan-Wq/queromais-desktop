// Casar telefone errado mostra a conversa de um cliente com o histórico de OUTRO.
// Estes testes existem para isso não acontecer.
const { test } = require('node:test')
const assert = require('node:assert')
const T = require('../src-electron/telefone')

test('o mesmo número em formatos diferentes é a mesma pessoa', () => {
  const alvo = '(75) 98811-0001'
  for (const outro of ['5575988110001', '75988110001', '+55 (75) 98811-0001', '75 98811 0001']) {
    assert.strictEqual(T.mesmoTelefone(alvo, outro), true, outro + ' deveria casar')
  }
})

test('com e sem o nono dígito é a mesma pessoa', () => {
  // A Anatel acrescentou o 9 aos celulares; cadastro antigo não tem.
  assert.strictEqual(T.mesmoTelefone('(75) 98811-0001', '(75) 8811-0001'), true)
  assert.strictEqual(T.mesmoTelefone('5575988110001', '7588110001'), true)
})

test('DDD diferente NÃO é a mesma pessoa', () => {
  assert.strictEqual(T.mesmoTelefone('(75) 98811-0001', '(71) 98811-0001'), false)
  assert.strictEqual(T.mesmoTelefone('(75) 98811-0001', '(11) 98811-0001'), false)
})

test('sem DDD não dá para afirmar — e afirmar seria pior', () => {
  assert.strictEqual(T.mesmoTelefone('(75) 98811-0001', '98811-0001'), false)
  assert.strictEqual(T.chaveTelefone('98811-0001'), '')
  assert.strictEqual(T.chaveTelefone('8811-0001'), '')
})

test('vazio, nulo e lixo nunca casam', () => {
  for (const v of ['', null, undefined, 'sem número', '000']) {
    assert.strictEqual(T.mesmoTelefone('(75) 98811-0001', v), false, JSON.stringify(v))
    assert.strictEqual(T.mesmoTelefone(v, v), false, 'dois ' + JSON.stringify(v))
  }
})

test('um dígito de diferença é outra pessoa', () => {
  assert.strictEqual(T.mesmoTelefone('(75) 98811-0001', '(75) 98811-0002'), false)
})

test('55 só é DDI quando o tamanho permite — 55 também é DDD', () => {
  // (55) 98811-0001 é Santa Maria/RS, não "Brasil + 98811-0001".
  assert.strictEqual(T.digitos('(55) 98811-0001'), '55988110001')
  assert.strictEqual(T.mesmoTelefone('(55) 98811-0001', '(75) 98811-0001'), false)
  // com DDI de verdade (13 dígitos), o 55 da frente sai
  assert.strictEqual(T.digitos('5555988110001'), '55988110001')
})

test('acharPorTelefone devolve o cadastro certo, ou nada', () => {
  const lista = [
    { nome: 'Maria', telefone: '(75) 98811-0001' },
    { nome: 'João', telefone: '5575988110002' },
    { nome: 'Sem telefone' },
  ]
  assert.strictEqual(T.acharPorTelefone(lista, '5575988110001').nome, 'Maria')
  assert.strictEqual(T.acharPorTelefone(lista, '(75) 8811-0002').nome, 'João')
  assert.strictEqual(T.acharPorTelefone(lista, '(11) 98811-0001'), null)
  assert.strictEqual(T.acharPorTelefone(lista, ''), null)
  assert.strictEqual(T.acharPorTelefone([], '5575988110001'), null)
})

test('formatar deixa como o lojista lê e disca', () => {
  assert.strictEqual(T.formatar('5575988110001'), '(75) 98811-0001')
  assert.strictEqual(T.formatar('7533221100'), '(75) 3322-1100')
  assert.strictEqual(T.formatar('não é número'), 'não é número')
  assert.strictEqual(T.formatar(''), '')
})
