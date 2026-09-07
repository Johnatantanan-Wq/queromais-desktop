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
  assert.ok(/Produtos em estoque/.test(h))
})

test('Financeiro: contas a pagar e a receber separam os lançamentos', () => {
  const pagar = T.htmlComAbas('/admin/financeiro', dados.financeiro, { aba: 'pagar' })
  const receber = T.htmlComAbas('/admin/financeiro', dados.financeiro, { aba: 'receber' })
  assert.ok(pagar.includes('Aluguel do ponto') && !pagar.includes('Repasse iFood'))
  assert.ok(receber.includes('Repasse iFood') && !receber.includes('Aluguel do ponto'))
})

test('Gestão: insumo abaixo do mínimo sai em vermelho', () => {
  const h = T.htmlComAbas('/admin/estoque', dados.estoque, { aba: 'produtos' })
  // a linha inteira, até o começo da próxima (o saldo é a 3ª célula)
  const linha = h.split('data-linha="Farinha de trigo"')[1].split('data-linha=')[0]
  assert.ok(/b42318/.test(linha), 'saldo abaixo do mínimo precisa gritar: ' + linha.slice(0, 200))
  const ok = h.split('data-linha="Muçarela"')[1].split('data-linha=')[0]   // 42 de saldo, mínimo 30
  assert.ok(!/b42318/.test(ok), 'insumo com saldo bom não pode aparecer em vermelho')
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
