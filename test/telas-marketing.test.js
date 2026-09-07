const { test } = require('node:test')
const assert = require('node:assert')
const M = require('../renderer/elo/telas-marketing')
const demo = require('../src-electron/demo-dados')

const apoio = demo.listasApoio()
const finais = demo.apoioFinal()

test('Cupons: a lista e o formulário do painel ficam lado a lado', () => {
  const h = M.htmlCupons(apoio.cupons, {})
  assert.ok(h.includes('4 cupom(ns) cadastrado(s) · 3 ativo(s)'))
  assert.ok(h.includes('VOLTA10') && h.includes('Novo cupom'))
  assert.ok(h.includes('Código (sem espaços)') && h.includes('Dias da semana'))
  assert.ok(/Isenta a taxa de entrega inteira/.test(h), 'o que cada opção faz é explicado, como no painel')
})

test('Cupons: o que muda o comportamento do cupom aparece na linha', () => {
  const h = M.htmlCupons(apoio.cupons, {})
  const primeira = h.split('data-linha="PRIMEIRA15"')[1].split('data-linha=')[0]
  assert.ok(primeira.includes('só 1ª compra'))
  const frete = h.split('data-linha="FRETEGRATIS"')[1].split('data-linha=')[0]
  assert.ok(frete.includes('frete grátis'))
})

test('Cupons sem nenhum cadastrado ainda mostra o formulário', () => {
  const h = M.htmlCupons({ itens: [] }, {})
  assert.ok(h.includes('Nenhum cupom cadastrado.') && h.includes('Criar cupom'))
})

test('Campanhas: os sete perfis do painel, com a contagem de cada um', () => {
  const h = M.htmlCampanhas(apoio.campanhas, {})
  assert.ok(h.includes('412 contatos'))
  M.PERFIS.forEach((p) => assert.ok(h.includes(p.nome), 'falta o perfil ' + p.nome))
  assert.ok(/nunca recebeu mensagem/.test(h), 'o perfil importado precisa do aviso de cautela')
  assert.ok(h.includes('Continuar com 128 contatos'))
})

test('Campanhas: as três abas trocam o conteúdo', () => {
  const hist = M.htmlCampanhas(apoio.campanhas, { abaCampanha: 'historico' })
  assert.ok(hist.includes('Terça em dobro') && !hist.includes('Quem vai receber'))
  const cfg = M.htmlCampanhas(apoio.campanhas, { abaCampanha: 'config' })
  assert.ok(cfg.includes('1840 de 3000 disparos'))
})

test('Push: formulário, dicas, prévia e histórico', () => {
  const h = M.htmlPush(finais.push, {})
  assert.ok(h.includes('248 clientes inscritos'))
  assert.ok(h.includes('Título da notificação *') && h.includes('Link ao clicar *'))
  assert.ok(h.includes('Dicas para melhores resultados') && h.includes('Pré-visualização'))
  assert.ok(h.includes('Faturamento via push') && h.includes('R$ 2.140,60'))
  assert.ok(h.includes('Volta pra gente'))
})

test('Push sem inscrito explica onde o cliente se inscreve', () => {
  const h = M.htmlPush({ inscritos: 0, itens: [] }, {})
  assert.ok(/sininho de notificações aparece no cardápio/.test(h))
  assert.ok(/Nenhum envio ainda/.test(h))
})

test('Parceiros: números somados da lista, não inventados', () => {
  const h = M.htmlParceiros(apoio.parceiros, {})
  assert.ok(h.includes('R$ 15.180,00'), 'vendas geradas = soma dos parceiros')
  assert.ok(h.includes('R$ 1.518,00'), 'comissão total')
  assert.ok(h.includes('3</div>'), 'três ativos de quatro cadastrados')
  assert.ok(h.includes('Faturamento por tipo') && h.includes('Influencer'))
})

test('Fidelidade: a visão geral traz os quatro números e os rankings', () => {
  const h = M.htmlFidelidade(apoio.fidelidade, {})
  assert.ok(h.includes('Programa ativado'))
  assert.ok(h.includes('Pontos distribuídos') && h.includes('9840'))
  assert.ok(h.includes('Em descontos') && h.includes('R$ 216,00'))
  assert.ok(h.includes('Top clientes por ganhos no período') && h.includes('Maria Silva'))
  assert.ok(h.includes('Pizza média grátis'))
})

test('Fidelidade: as abas de regras e atividades', () => {
  const cfg = M.htmlFidelidade(apoio.fidelidade, { abaFidelidade: 'config' })
  assert.ok(cfg.includes('Pontos por real gasto') && cfg.includes('100 pontos'))
  const ativ = M.htmlFidelidade(apoio.fidelidade, { abaFidelidade: 'atividades' })
  assert.ok(ativ.includes('- 200') && ativ.includes('+ 62'), 'resgate sai negativo e ganho positivo')
})

test('Fidelidade sem movimentação avisa em vez de desenhar tabela vazia', () => {
  const h = M.htmlFidelidade({ ativo: true, itens: [] }, {})
  assert.ok(/Sem movimenta/.test(h) && /Nenhum prêmio resgatado/.test(h))
})

test('todas as telas de marketing avisam quando não há dado', () => {
  ;[M.htmlCupons, M.htmlCampanhas, M.htmlPush, M.htmlParceiros, M.htmlFidelidade].forEach((f) => {
    assert.ok(/sem dados/i.test(f(null, {})), f.name + ' precisa avisar')
  })
})
