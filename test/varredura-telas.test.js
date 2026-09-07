// Varredura: desenha TODA tela nativa com os dados de demonstração e confere que
// produz conteúdo de verdade. Se alguém registrar uma rota nova e esquecer de cobri-la
// aqui, o primeiro teste falha dizendo qual é — é o que impede uma tela de entrar no
// app sem nunca ter sido desenhada uma vez sequer fora do navegador.
const { test } = require('node:test')
const assert = require('node:assert')
const demo = require('../src-electron/demo-dados')
const Shell = require('../renderer/elo/shell')
const Catalogo = require('../renderer/elo/telas-catalogo')
const ComAbas = require('../renderer/elo/telas-abas')
const Principais = require('../renderer/elo/telas-principais')
const Operacao = require('../renderer/elo/tela-operacao')
const Finais = require('../renderer/elo/telas-finais')
const TelaCaixa = require('../renderer/elo/tela-caixa')
const TelaDespacho = require('../renderer/elo/tela-despacho')
const TelaCardapio = require('../renderer/elo/tela-cardapio')
const TelaVisaoGeral = require('../renderer/elo/tela-visao-geral')
const TelaImpressao = require('../renderer/elo/tela-impressao')
const TelaCompras = require('../renderer/elo/tela-compras')
const Mkt = require('../renderer/elo/telas-marketing')
const TelaVenda = require('../renderer/elo/tela-venda')

const listas = demo.listas()
const apoio = demo.listasApoio()
const oper = demo.operacao()
const finais = demo.apoioFinal()
const comAbas = demo.telasComAbas()
const estado = { online: true, ts: Date.now() }

const TELAS = {
  '/admin': () => TelaVisaoGeral.htmlVisaoGeral(demo.visaoGeral('semana'), { ...estado, metrica: 'faturamento', periodo: 'semana' }),
  '/admin/caixa': () => TelaCaixa.htmlDoCaixa(demo.caixa(), { ...estado, aba: 'atual', subaba: 'mesas' }),
  '/admin/pedidos': () => Catalogo.htmlDaRota('/admin/pedidos', listas.pedidos, { ...estado, modo: 'quadro' }),
  '/admin/despacho': () => TelaDespacho.htmlDespacho(listas.despacho, { visao: 'bairro' }),
  '/admin/carrinhos': () => Principais.htmlCarrinhos(listas.carrinhos, estado),
  '/admin/clientes': () => Principais.htmlClientes(listas.clientes, estado),
  '/admin/cardapio': () => TelaCardapio.htmlCardapio(listas.cardapio, { abertas: ['Bebidas'] }),
  '/admin/cozinha': () => Operacao.htmlKds(oper.cozinha, { ...estado, departamento: 'cozinha' }),
  '/admin/bar': () => Operacao.htmlKds(oper.bar, { ...estado, departamento: 'bar' }),
  '/admin/atendimento': () => Principais.htmlSalao(comAbas.atendimento.salaoDetalhado, estado),
  '/admin/estoque': () => ComAbas.htmlComAbas('/admin/estoque', comAbas.estoque, { aba: 'produtos' }),
  '/admin/compras': () => TelaCompras.htmlCompras(apoio.compras, estado),
  '/admin/venda': () => TelaVenda.htmlVenda({
    categorias: listas.cardapio.categorias, clientes: listas.clientes.itens,
    taxasBairro: { Centro: 7 },
  }, estado),
  '/admin/financeiro': () => Principais.htmlFinanceiroVisao(comAbas.financeiro.visao, estado),
  '/admin/motoboys': () => Catalogo.htmlDaRota('/admin/motoboys', listas.entregadores, estado),
  '/admin/relatorios': () => Finais.htmlRelatorios(finais.relatorios, estado),
  '/admin/insights': () => Finais.htmlInsights(finais.insights, estado),
  '/admin/food-marketing/campanhas': () => Mkt.htmlCampanhas(apoio.campanhas, estado),
  '/admin/food-marketing/push': () => Mkt.htmlPush(finais.push, estado),
  '/admin/cupons': () => Mkt.htmlCupons(apoio.cupons, estado),
  '/admin/vendedores': () => Mkt.htmlParceiros(apoio.parceiros, estado),
  '/admin/fidelidade': () => Mkt.htmlFidelidade(apoio.fidelidade, estado),
  '/admin/configuracoes': () => Finais.htmlConfiguracoes(finais.configuracoes, estado),
  '/app/impressao': () => TelaImpressao.htmlImpressao({
    impressoras: [{ name: 'POS-80', displayName: 'POS-80', isDefault: true }], impressoraAtual: 'POS-80',
    loja: demo.menu().loja, exemplo: listas.pedidos.itens[0], automatica: true, vias: 1, caminho: 'x',
  }, estado),
}

test('toda rota registrada no shell tem cobertura aqui', () => {
  const semTeste = Shell.TELAS_NATIVAS.filter((r) => !TELAS[r])
  assert.deepStrictEqual(semTeste, [], 'telas registradas sem varredura: ' + semTeste.join(', '))
})

test('toda tela desenha conteúdo de verdade com os dados de demonstração', () => {
  for (const rota of Object.keys(TELAS)) {
    let html
    assert.doesNotThrow(() => { html = TELAS[rota]() }, rota + ' lançou erro ao desenhar')
    assert.ok(html && html.length > 300, rota + ' desenhou pouco (' + ((html || '').length) + ' caracteres)')
    assert.ok(!/undefined|NaN|\[object Object\]/.test(html), rota + ' tem "undefined", "NaN" ou "[object Object]" na tela')
  }
})

test('nenhuma tela quebra quando o dado ainda não chegou', () => {
  const semDado = {
    '/admin': () => TelaVisaoGeral.htmlVisaoGeral(null, estado),
    '/admin/caixa': () => TelaCaixa.htmlDoCaixa(null, estado),
    '/admin/despacho': () => TelaDespacho.htmlDespacho(null, estado),
    '/admin/clientes': () => Principais.htmlClientes(null, estado),
    '/admin/carrinhos': () => Principais.htmlCarrinhos(null, estado),
    '/admin/financeiro': () => Principais.htmlFinanceiroVisao(null, estado),
    '/admin/atendimento': () => Principais.htmlSalao(null, estado),
    '/admin/cardapio': () => TelaCardapio.htmlCardapio(null, estado),
    '/admin/cozinha': () => Operacao.htmlKds(null, estado),
    '/admin/compras': () => TelaCompras.htmlCompras(null, estado),
    '/admin/venda': () => TelaVenda.htmlVenda(null, estado),
    '/admin/cupons': () => Mkt.htmlCupons(null, estado),
    '/admin/fidelidade': () => Mkt.htmlFidelidade(null, estado),
    '/admin/vendedores': () => Mkt.htmlParceiros(null, estado),
    '/admin/food-marketing/campanhas': () => Mkt.htmlCampanhas(null, estado),
    '/admin/food-marketing/push': () => Mkt.htmlPush(null, estado),
    '/app/impressao': () => TelaImpressao.htmlImpressao(null, estado),
  }
  for (const rota of Object.keys(semDado)) {
    const h = semDado[rota]()
    assert.ok(h && /sem dados|sem o card[áa]pio|carregando|lendo as impressoras/i.test(h), rota + ' precisa avisar que não tem dado: ' + h.slice(0, 120))
  }
})

test('o menu do app cobre todas as telas nativas (nenhum item leva a lugar nenhum)', () => {
  const menu = demo.menu()
  const hrefs = menu.secoes.flatMap((s) => s.itens.map((i) => i.href))
  const semTela = hrefs.filter((h) => !TELAS[h])
  assert.deepStrictEqual(semTela, [], 'itens do menu sem tela nativa: ' + semTela.join(', '))
})
