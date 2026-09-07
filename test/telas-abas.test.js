const { test } = require('node:test')
const assert = require('node:assert')
const T = require('../renderer/elo/telas-abas')
const demo = require('../src-electron/demo-dados')

const dados = demo.telasComAbas()
const chaveDe = (rota) => rota.split('/').pop()

test('toda aba de toda tela desenha conteúdo de verdade', () => {
  for (const rota of Object.keys(T.ABAS)) {
    for (const aba of T.ABAS[rota]) {
      const h = T.htmlComAbas(rota, dados[chaveDe(rota)], { aba: aba.chave, online: true, ts: Date.now() })
      assert.ok(h && h.length > 400, rota + ' › ' + aba.chave + ' veio vazia (' + (h || '').length + ')')
      assert.ok(!/Aba sem conteúdo/.test(h), rota + ' › ' + aba.chave + ' caiu no aviso genérico')
    }
  }
})

test('a barra de abas aparece com a aba escolhida marcada', () => {
  const h = T.htmlComAbas('/admin/financeiro', dados.financeiro, { aba: 'dre' })
  assert.ok(h.includes('data-aba="visao"') && h.includes('data-aba="dre"'))
  assert.ok(/is-on/.test(h.split('data-aba="dre"')[1].slice(0, 90)))
})

test('aba inválida cai na primeira, não em tela branca', () => {
  const h = T.htmlComAbas('/admin/estoque', dados.estoque, { aba: 'nao-existe' })
  assert.ok(/is-on/.test(h.split('data-aba="produtos"')[1].slice(0, 90)))
  assert.ok(/Sincronizar com o cardápio/.test(h))
})

test('Financeiro: contas a pagar e a receber separam os lançamentos', () => {
  const pagar = T.htmlComAbas('/admin/financeiro', dados.financeiro, { aba: 'pagar' })
  const receber = T.htmlComAbas('/admin/financeiro', dados.financeiro, { aba: 'receber' })
  assert.ok(pagar.includes('Aluguel do ponto') && !pagar.includes('Repasse iFood'))
  assert.ok(receber.includes('Repasse iFood') && !receber.includes('Aluguel do ponto'))
})

test('Gestão: a situação da prateleira segue a regra do painel', () => {
  const h = T.htmlComAbas('/admin/estoque', dados.estoque, { aba: 'produtos' })
  const linha = (nome) => h.split('data-linha="' + nome + '"')[1].split('data-linha=')[0]
  assert.ok(/Sem estoque/.test(linha('Pizza Chocolate M')), 'saldo zerado é "Sem estoque"')
  assert.ok(/Estoque baixo/.test(linha('Farinha de trigo')), 'saldo 18 com mínimo 40 é "Estoque baixo"')
  assert.ok(/>OK</.test(linha('Muçarela')), 'saldo 42 com mínimo 30 está OK')
  assert.ok(/Desativado/.test(linha('Pizza Doce Antiga')), 'item desativado manda na situação')
})

test('Gestão › Produtos: categorias, blocos e selos do cadastro-mestre', () => {
  const h = T.htmlComAbas('/admin/estoque', dados.estoque, { aba: 'produtos' })
  assert.ok(h.includes('data-cat-estoque="todos"') && h.includes('data-cat-estoque="revenda"'))
  assert.ok(h.includes('data-bloco-estoque="producao:Produção Própria"'))
  assert.ok(h.includes('7 itens') && h.includes('3 itens'), 'cada bloco conta os seus itens')
  assert.ok(h.includes('Estoque de Massas'), 'a produção própria tem o bloco de massas')
  const combo = h.split('data-linha="Combo Família"')[1].split('data-linha=')[0]
  assert.ok(/↔ cardápio/.test(combo) && /fiscal/.test(combo), 'os selos do painel ficam ao lado do nome')
})

test('Gestão › Produtos: a pílula filtra a categoria', () => {
  const so = T.htmlComAbas('/admin/estoque', dados.estoque, { aba: 'produtos', catEstoque: 'revenda' })
  assert.ok(so.includes('Refrigerante 2L'))
  assert.ok(!so.includes('data-linha="Muçarela"'), 'insumos ficam de fora quando a categoria é Revenda')
})

test('Gestão › Produtos: bloco fechado esconde a tabela, e a busca filtra dentro dele', () => {
  const fechado = T.htmlComAbas('/admin/estoque', dados.estoque,
    { aba: 'produtos', blocosFechados: ['insumos:Insumos'] })
  assert.ok(!fechado.includes('data-linha="Muçarela"'), 'bloco fechado não desenha as linhas')
  const busca = T.htmlComAbas('/admin/estoque', dados.estoque,
    { aba: 'produtos', buscaBloco: { 'insumos:Insumos': 'calab' } })
  assert.ok(busca.includes('data-linha="Calabresa"'))
  assert.ok(!busca.includes('data-linha="Muçarela"'), 'a busca de um bloco não mexe nos outros')
  assert.ok(busca.includes('data-linha="Pizza Calabresa G"'), 'e não mexe na Produção Própria')
})

test('Atendimento: a aba Salão desenha as mesas', () => {
  const h = T.htmlComAbas('/admin/atendimento', dados.atendimento, { aba: 'salao' })
  assert.ok(h.includes('Mesa 7') && /Conta pedida/.test(h))
})

test('sem dados, a tela avisa em vez de desenhar abas vazias', () => {
  assert.ok(/sem dados/i.test(T.htmlComAbas('/admin/financeiro', null, {})))
})

test('rota sem abas devolve null (o shell segue para o formato de lista)', () => {
  assert.strictEqual(T.htmlComAbas('/admin/clientes', {}, {}), null)
})

test('Pedidos no modo lista não repete a faixa de KPIs', () => {
  const Catalogo = require('../renderer/elo/telas-catalogo')
  const dadosPed = require('../src-electron/demo-dados').listas().pedidos
  const h = Catalogo.htmlDaRota('/admin/pedidos', dadosPed, { modo: 'lista', filtro: 'todos', online: true, ts: Date.now() })
  const vezes = (h.match(/aguardando aceite/g) || []).length
  assert.strictEqual(vezes, 1, 'o KPI "Novos / aguardando aceite" apareceu ' + vezes + ' vezes')
})
