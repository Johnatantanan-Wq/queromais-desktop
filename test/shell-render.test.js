const { test } = require('node:test')
const assert = require('node:assert')
const { htmlDoMenu, iniciaisDe, tituloDaRota, dataPorExtenso, esc } = require('../renderer/elo/shell')

const menu = {
  secoes: [
    { titulo: 'Principal', itens: [
      { id: 'dashboard', href: '/admin', label: 'Visão geral', icone: '<rect x="3" y="3" width="7" height="7"/>' },
      { id: 'pedidos', href: '/admin/pedidos', label: 'Gestão de pedido', icone: '<path d="M9 5H7"/>', badge: 'pedidos' },
    ] },
  ],
  badges: { pedidos: 5, carrinhos: 0 },
}

test('desenha grupo e itens', () => {
  const h = htmlDoMenu(menu, '/admin', true)
  assert.ok(h.includes('Principal'))
  assert.ok(h.includes('Visão geral'))
  assert.ok(h.includes('data-href="/admin/pedidos"'))
})

test('marca como ativo só o item da rota atual', () => {
  const h = htmlDoMenu(menu, '/admin/pedidos', true)
  const pedacos = h.split('<div class="erailitem')
  const ativo = pedacos.find(p => p.includes('data-href="/admin/pedidos"'))
  const outro = pedacos.find(p => p.includes('data-href="/admin"') && !p.includes('/admin/pedidos'))
  assert.ok(ativo.startsWith(' on"'))
  assert.ok(!outro.startsWith(' on"'))
})

test('badge zerado não aparece', () => {
  const h = htmlDoMenu({ ...menu, badges: { pedidos: 0, carrinhos: 0 } }, '/admin', true)
  assert.ok(!h.includes('eranbadge'))
})

test('badge com número aparece', () => {
  assert.ok(htmlDoMenu(menu, '/admin', true).includes('>5</span>'))
})

test('offline esmaece os itens (nenhum módulo é nativo ainda na F1)', () => {
  assert.ok(htmlDoMenu(menu, '/admin', false).includes('erailitem off'))
})

test('menu vazio não quebra', () => {
  assert.strictEqual(htmlDoMenu(null, '/admin', true), '')
})

test('iniciais da loja para o avatar', () => {
  assert.strictEqual(iniciaisDe('Pizzaria do Jasson'), 'PJ')
  assert.strictEqual(iniciaisDe('Pediu'), 'PE')
  assert.strictEqual(iniciaisDe(''), '—')
})

test('título vem do item da rota, o mais específico', () => {
  assert.strictEqual(tituloDaRota(menu, '/admin/pedidos'), 'Gestão de pedido')
  assert.strictEqual(tituloDaRota(menu, '/admin'), 'Visão geral')
  assert.strictEqual(tituloDaRota(menu, '/admin/desconhecido'), 'Painel')
})

test('data por extenso em pt-BR', () => {
  assert.match(dataPorExtenso(new Date('2026-09-07T12:00:00')), /setembro/)
})

test('escapa o que vem do servidor', () => {
  assert.strictEqual(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;')
})
