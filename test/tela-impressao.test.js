const { test } = require('node:test')
const assert = require('node:assert')
const I = require('../renderer/elo/tela-impressao')

const dados = {
  impressoras: [
    { name: 'POS-80', displayName: 'POS-80 (USB)', isDefault: false, status: 0 },
    { name: 'HP_LaserJet', displayName: 'HP LaserJet', isDefault: true, status: 0 },
  ],
  impressoraAtual: 'POS-80', ippUrl: '', automatica: true, vias: 2, caminho: 'SumatraPDF',
  loja: { nome: 'Pizzaria Demonstração', documento: '00.000.000/0001-00' },
  exemplo: { numero: '1042', cliente: 'Maria Silva', canal: 'Delivery', hora: '20:12', valor: 89.9, pagamento: 'Pix', itens: ['1x Pizza Calabresa G', '1x Refrigerante 2L'] },
}

test('lista as impressoras do computador e marca a que está em uso', () => {
  const h = I.htmlImpressao(dados, {})
  assert.ok(h.includes('POS-80 (USB)') && h.includes('HP LaserJet'))
  assert.ok(/em uso/.test(h.split('data-impressora="POS-80"')[1].slice(0, 600)))
})

test('sem impressora instalada, explica o que fazer', () => {
  const h = I.htmlImpressao({ ...dados, impressoras: [] }, {})
  assert.ok(/nenhuma impressora/i.test(h) && /instale/i.test(h))
})

test('os botões que FAZEM estão lá (teste e comanda)', () => {
  const h = I.htmlImpressao(dados, {})
  assert.ok(h.includes('data-acao="impressao:teste"'))
  assert.ok(h.includes('data-acao="impressao:comanda"'))
  assert.ok(h.includes('data-acao="impressao:procurar"'))
})

test('a comanda sai com largura de bobina e os dados do pedido', () => {
  const c = I.htmlComanda(dados.exemplo, dados.loja)
  assert.ok(c.includes('72mm'))
  assert.ok(c.includes('PEDIDO #1042') && c.includes('Maria Silva'))
  assert.ok(c.includes('Pizza Calabresa') && c.includes('89,90'))
  assert.ok(c.includes('Pizzaria Demonstração'))
})

test('impressão automática desligada aparece em vermelho', () => {
  const h = I.htmlImpressao({ ...dados, automatica: false }, {})
  assert.ok(/desligada/.test(h) && /b42318/.test(h))
})

test('enquanto não leu as impressoras, avisa em vez de dizer que não há', () => {
  assert.ok(/lendo as impressoras/i.test(I.htmlImpressao(null, {})))
})

test('a comanda da venda feita sem internet diz que o número é provisório', () => {
  const h = I.htmlComanda({ numero: 'L-3', provisorio: true, cliente: 'Ana', canal: 'Retirada', hora: '20:12', valor: 30, itens: ['1× Pizza'] }, dados.loja)
  assert.ok(h.includes('PEDIDO L-3'))
  assert.ok(/PROVIS[ÓO]RIO/.test(h) && /sem internet/i.test(h))
  const normal = I.htmlComanda({ numero: '1042', cliente: 'Ana', canal: 'Retirada', hora: '20:12', valor: 30, itens: ['1× Pizza'] }, dados.loja)
  assert.ok(normal.includes('PEDIDO #1042') && !/PROVIS/.test(normal))
})
