// A COMANDA sai no papel — e papel errado não se corrige depois. Estas são as regras
// que o dono fixou no painel (ComandaTermica.tsx, 08/09/2026) e que o app precisa
// repetir, porque quem imprime no balcão é ele.
const { test } = require('node:test')
const assert = require('node:assert')
const T = require('../renderer/elo/tela-impressao')
const demo = require('../src-electron/demo-dados')

const loja = { nome: 'Pizzaria do Jasson', documento: '00.000.000/0001-00' }
const pedido = {
  numero: '1043', cliente: 'Sandra Reis', canal: 'Delivery', hora: '20:18',
  valor: 112.80, taxa: 8, pagamento: 'Dinheiro', trocoPara: 150, telefone: '(75) 98811-7788',
  enderecoCampos: { rua: 'Rua das Palmeiras', numero: '45', complemento: 'apto 2',
    bairro: 'Centro', referencia: 'perto da praça' },
  itens: [{ qtd: 1, nome: 'Combo Família', valor: 99.80, obs: 'sem cebola', sabores: [
    { grupo: 'Escolha a pizza 1', nome: 'Calabresa', precoAdicional: 0 },
    { grupo: 'Turbine', nome: 'Borda recheada', precoAdicional: 8 },
    { grupo: 'Escolha a pizza 2', nome: 'Portuguesa', precoAdicional: 0 },
  ] }],
}

test('o endereço sai em CAIXA ALTA — o entregador lê na moto, no escuro', () => {
  const h = T.htmlComanda(pedido, loja)
  assert.match(h, /ENDEREÇO DE ENTREGA/)
  assert.match(h, /text-transform:uppercase/)
  // ⚠️ por CSS, não no dado: o endereço continua gravado como o cliente digitou.
  assert.match(h, /Rua das Palmeiras/, 'o dado não pode vir maiúsculo do app')
})

test('⚠️ grupos de mesmo nome só se juntam se forem CONSECUTIVOS', () => {
  // Um combo com "Escolha a pizza 1 / Turbine / Escolha a pizza 2" tem grupos repetidos.
  // Juntar tudo num só embaralharia a ordem em que a cozinha monta.
  const g = T.agruparSabores([
    { grupo: 'A', nome: 'x' }, { grupo: 'B', nome: 'y' }, { grupo: 'A', nome: 'z' },
  ])
  assert.strictEqual(g.length, 3, 'os dois "A" não podem virar um grupo só')
  const juntos = T.agruparSabores([{ grupo: 'A', nome: 'x' }, { grupo: 'A', nome: 'y' }])
  assert.strictEqual(juntos.length, 1, 'grupo repetido em seguida sai uma vez só')
  assert.strictEqual(juntos[0].itens.length, 2)
})

test('o nome do grupo sai uma vez, não na frente de cada adicional', () => {
  const h = T.htmlComanda(pedido, loja)
  assert.strictEqual((h.match(/Turbine:/g) || []).length, 1)
})

test('⚠️ o destaque do adicional vai só no NOME, nunca no "+"', () => {
  // Sublinhar o rótulo inteiro deixava um traço solto no fim da linha quebrada.
  const h = T.htmlComanda(pedido, { ...loja, comanda: { destacarAdicional: true } })
  assert.match(h, /\+ <b style="text-decoration:underline">Borda recheada<\/b>/)
  assert.ok(!/<b[^>]*>\+/.test(h), 'o prefixo não pode entrar no destaque')
})

test('loja sem o destaque ligado imprime o adicional normal', () => {
  const h = T.htmlComanda(pedido, loja)
  assert.match(h, /\+ Borda recheada/)
  assert.ok(!/text-decoration:underline/.test(h))
})

test('⛔ troco: a comanda diz quanto SEPARAR antes de sair', () => {
  const h = T.htmlComanda(pedido, loja)
  assert.match(h, /Troco para/)
  assert.match(h, /Levar de troco/)
  assert.match(h, /37,20/, '150 − 112,80 = o que sai da gaveta com ele')
})

test('pedido sem troco não inventa linha de troco', () => {
  const h = T.htmlComanda({ ...pedido, trocoPara: 0 }, loja)
  assert.ok(!/Troco para/.test(h))
})

test('cabeçalho e rodapé da loja entram quando existem', () => {
  const h = T.htmlComanda(pedido, { ...loja, comanda: { cabecalho: 'DELIVERY 24H', rodape: 'Volte sempre!' } })
  assert.match(h, /DELIVERY 24H/)
  assert.match(h, /Volte sempre!/)
  const semCfg = T.htmlComanda(pedido, loja)
  assert.match(semCfg, /Obrigado pela preferência/, 'sem configuração, o rodapé padrão fica')
})

test('a observação do item sai para a cozinha', () => {
  assert.match(T.htmlComanda(pedido, loja), /OBS: sem cebola/)
})

test('o formato simples das listas continua imprimindo', () => {
  // As telas de lista trazem o item como texto ("1x Pizza G"). A comanda não pode
  // quebrar por causa disso — é o pedido de exemplo da tela de Impressão.
  const h = T.htmlComanda(demo.listas().pedidos.itens[0], demo.menu().loja)
  assert.ok(h.length > 200)
  assert.ok(!/undefined|NaN|\[object/.test(h))
})
