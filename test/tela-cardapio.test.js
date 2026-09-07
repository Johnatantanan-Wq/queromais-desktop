const { test } = require('node:test')
const assert = require('node:assert')
const C = require('../renderer/elo/tela-cardapio')

const dados = {
  qualidade: { pontuacao: 63, promocionais: 1, comFotos: 71, comDescricoes: 79, promocoesCategorias: 0 },
  categorias: [
    { nome: 'Promoção do dia!🔥', etiquetas: ['Promocional', 'OCULTA', 'Destaque pop-up'], esgotada: false, itens: [] },
    { nome: 'Bebidas', etiquetas: ['Itens principais'], esgotada: false, itens: [
      { nome: 'Cabaré Ice', preco: 15, esgotado: false, foto: true },
      { nome: 'Cerveja (600 ml)', preco: 0, esgotado: true, foto: false, descricao: 'Preço sob consulta — confirmar com a loja antes de ativar a venda.' },
    ] },
    { nome: 'Pizzas', etiquetas: ['Pizza'], esgotada: false, itens: [{ nome: 'Calabresa G', preco: 59.9, esgotado: false, foto: true }] },
  ],
}

test('as sete abas do gestor aparecem', () => {
  const h = C.htmlCardapio(dados, {})
  for (const a of ['Dashboard', 'Gestor', 'Grupos de adicionais', 'Imagens do cardápio', 'Edição em massa', 'Integrações', 'Potencializador']) {
    assert.ok(h.includes(a), 'falta a aba ' + a)
  }
})

test('a faixa de qualidade traz a pontuação e o que falta melhorar', () => {
  const h = C.htmlCardapio(dados, {})
  assert.ok(h.includes('63') && /Qualidade do Card[áa]pio/i.test(h))
  assert.ok(h.includes('71') && /com fotos/i.test(h))
  assert.ok(h.includes('79') && /com descri/i.test(h))
  assert.ok(/Adicione mais fotos/i.test(h))
})

test('cada categoria aparece com suas etiquetas e a chave de esgotar tudo', () => {
  const h = C.htmlCardapio(dados, {})
  assert.ok(h.includes('Bebidas') && h.includes('Itens principais'))
  assert.ok(h.includes('OCULTA') && h.includes('Destaque pop-up'))
  assert.ok(h.includes('data-acao="esgotar-categoria:Bebidas"'))
  assert.ok(h.includes('data-acao="acoes-categoria:Bebidas"'))
})

test('categoria fechada não mostra os itens; aberta mostra', () => {
  const fechada = C.htmlCardapio(dados, {})
  assert.ok(!fechada.includes('Cabaré Ice'))
  const aberta = C.htmlCardapio(dados, { abertas: ['Bebidas'] })
  assert.ok(aberta.includes('Cabaré Ice'))
})

test('o item traz preço a partir de, editar, esgotar e ações', () => {
  const h = C.htmlCardapio(dados, { abertas: ['Bebidas'] })
  assert.ok(/A partir de/i.test(h) && h.includes('15,00'))
  assert.ok(h.includes('data-acao="editar-preco:Cabaré Ice"'))
  assert.ok(h.includes('data-acao="esgotar-item:Cabaré Ice"'))
  assert.ok(h.includes('data-acao="acoes-item:Cabaré Ice"'))
})

test('item esgotado fica apagado e com a chave ligada', () => {
  const h = C.htmlCardapio(dados, { abertas: ['Bebidas'] })
  const item = h.split('data-item="Cerveja (600 ml)"')[1].split('data-item=')[0]
  assert.ok(/9ca3af/.test(item), 'nome do esgotado fica apagado')
  assert.ok(/Pre[çc]o sob consulta/.test(item), 'a descrição aparece')
})

test('item sem foto mostra o espaço da foto, para saber o que falta', () => {
  const h = C.htmlCardapio(dados, { abertas: ['Bebidas'] })
  assert.ok(/sem<br>foto/i.test(h), 'o espaço da foto avisa que falta')
})

test('busca filtra item e categoria', () => {
  const h = C.htmlCardapio(dados, { termo: 'pizza' })
  assert.ok(h.includes('Pizzas'))
  assert.ok(!h.includes('Bebidas'))
})

test('sem dados não quebra', () => {
  assert.ok(/sem dados/i.test(C.htmlCardapio(null, {})))
})
