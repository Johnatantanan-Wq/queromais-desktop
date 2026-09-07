const { test } = require('node:test')
const assert = require('node:assert')
const { htmlDoCaixa, fmtBRL, fmtHora, idadeDoDado, rotuloTipo } = require('../renderer/elo/tela-caixa')

const dados = {
  aberto: { id: 'c1', abertoEm: '2026-09-07T10:00:00Z', abertoPor: 'Ana', fundoInicial: 100 },
  resumo: { vendaDinheiro: 50, vendaPix: 30, vendaCartao: 20, vendaAReceber: 0, suprimentos: 5, sangrias: 10, ajustes: 0 },
  esperadoDinheiro: 145,
  movimentacoes: [
    { id: 'm1', tipo: 'venda', forma: 'dinheiro', valor: 50, descricao: 'Pedido #12', criadoEm: '2026-09-07T11:00:00Z', estornada: false },
    { id: 'm2', tipo: 'sangria', forma: null, valor: 10, descricao: 'Troco', criadoEm: '2026-09-07T12:00:00Z', estornada: true },
  ],
}

test('mostra os KPIs do caixa aberto', () => {
  const h = htmlDoCaixa(dados, { online: true, ts: Date.now() })
  assert.ok(h.includes('145,00'), 'esperado em dinheiro')
  assert.ok(h.includes('50,00') && h.includes('30,00') && h.includes('20,00'))
})

test('caixa fechado não inventa número: mostra o estado', () => {
  const h = htmlDoCaixa({ aberto: null, resumo: { vendaDinheiro: 0 }, esperadoDinheiro: 0, movimentacoes: [] }, { online: true, ts: Date.now() })
  assert.ok(/caixa fechado/i.test(h))
  assert.ok(!h.includes('R$ 145'))
})

test('movimentação estornada aparece marcada', () => {
  const h = htmlDoCaixa(dados, { online: true, ts: Date.now() })
  assert.ok(/estornad/i.test(h))
})

test('dado do cache mostra a idade, nunca se passa por atual', () => {
  const h = htmlDoCaixa(dados, { online: false, ts: Date.now() - 2 * 60 * 60 * 1000 })
  assert.ok(/h[áa] 2 h/i.test(h), 'devia dizer há 2 h: ' + h.slice(0, 300))
})

test('sem dado nenhum não quebra', () => {
  const h = htmlDoCaixa(null, { online: false, ts: 0 })
  assert.ok(h.length > 0)
  assert.ok(/sem dados/i.test(h))
})

test('formata dinheiro em pt-BR', () => {
  assert.strictEqual(fmtBRL(1234.5), '1.234,50')
  assert.strictEqual(fmtBRL(0), '0,00')
  assert.strictEqual(fmtBRL(null), '0,00')
})

test('idade do dado em linguagem de gente', () => {
  const agora = Date.now()
  assert.match(idadeDoDado(agora - 30 * 1000, agora), /agora/i)
  assert.match(idadeDoDado(agora - 5 * 60 * 1000, agora), /5 min/)
  assert.match(idadeDoDado(agora - 3 * 60 * 60 * 1000, agora), /3 h/)
  assert.match(idadeDoDado(0, agora), /nunca/i)
})

test('rótulos em português, não o nome da coluna', () => {
  assert.strictEqual(rotuloTipo('venda'), 'Venda')
  assert.strictEqual(rotuloTipo('sangria'), 'Sangria')
  assert.strictEqual(rotuloTipo('suprimento'), 'Suprimento')
  assert.strictEqual(rotuloTipo('ajuste'), 'Ajuste')
})

test('hora local em HH:MM', () => {
  assert.match(fmtHora('2026-09-07T11:30:00Z'), /^\d{2}:\d{2}$/)
})
