// Varredura de BOTÕES: desenha toda tela, colhe cada `data-acao` e cada atributo
// interativo, e falha se algum não tiver tratamento. Foi assim que se descobriu que
// 109 botões eram mudos — o aviso genérico chamava `window.mensagemTopo`, que nunca
// existiu. Enquanto este teste passar, clicar em qualquer botão devolve alguma coisa.
const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')

const demo = require('../src-electron/demo-dados')
const Acoes = require('../renderer/elo/acoes')
const Operacao = require('../renderer/elo/tela-operacao')
const ComAbas = require('../renderer/elo/telas-abas')
const Catalogo = require('../renderer/elo/telas-catalogo')
const Principais = require('../renderer/elo/telas-principais')
const Compras = require('../renderer/elo/tela-compras')
const Finais = require('../renderer/elo/telas-finais')
const Mkt = require('../renderer/elo/telas-marketing')
const TelaCaixa = require('../renderer/elo/tela-caixa')
const TelaDespacho = require('../renderer/elo/tela-despacho')
const TelaCardapio = require('../renderer/elo/tela-cardapio')
const TelaVG = require('../renderer/elo/tela-visao-geral')
const TelaImpressao = require('../renderer/elo/tela-impressao')
const Ficha = require('../renderer/elo/ficha')
const TelaEntregadores = require('../renderer/elo/tela-entregadores')

const listas = demo.listas(), apoio = demo.listasApoio(), oper = demo.operacao()
const finais = demo.apoioFinal(), abas = demo.telasComAbas()
const e = { online: true, ts: Date.now() }

const TELAS = {
  '/admin': () => TelaVG.htmlVisaoGeral(demo.visaoGeral('semana'), { ...e, metrica: 'faturamento', periodo: 'semana' }),
  '/admin/caixa#mesas': () => TelaCaixa.htmlDoCaixa(demo.caixa(), { ...e, aba: 'atual', subaba: 'mesas' }),
  '/admin/caixa#delivery': () => TelaCaixa.htmlDoCaixa(demo.caixa(), { ...e, aba: 'atual', subaba: 'delivery' }),
  '/admin/caixa#movimentacoes': () => TelaCaixa.htmlDoCaixa(demo.caixa(), { ...e, aba: 'atual', subaba: 'movimentacoes' }),
  '/admin/caixa#historico': () => TelaCaixa.htmlDoCaixa(demo.caixa(), { ...e, aba: 'historico' }),
  '/admin/pedidos#quadro': () => Catalogo.htmlDaRota('/admin/pedidos', listas.pedidos, { ...e, modo: 'quadro' }),
  '/admin/pedidos#lista': () => Catalogo.htmlDaRota('/admin/pedidos', listas.pedidos, { ...e, modo: 'lista' }),
  '/admin/despacho': () => TelaDespacho.htmlDespacho(listas.despacho, { visao: 'bairro', selecionados: ['132'] }),
  '/admin/carrinhos': () => Principais.htmlCarrinhos(listas.carrinhos, e),
  '/admin/clientes': () => Principais.htmlClientes(listas.clientes, e),
  '/admin/cardapio': () => TelaCardapio.htmlCardapio(listas.cardapio, { abertas: ['Bebidas'] }),
  '/admin/cozinha': () => Operacao.htmlKds(oper.cozinha, { ...e, departamento: 'cozinha' }),
  '/admin/bar': () => Operacao.htmlKds(oper.bar, { ...e, departamento: 'bar' }),
  '/admin/compras': () => Compras.htmlCompras(apoio.compras, e),
  '/admin/motoboys#entregas': () => TelaEntregadores.htmlEntregadores(listas.entregadores, { ...e, aba: 'entregas' }),
  '/admin/motoboys#fechamentos': () => TelaEntregadores.htmlEntregadores(listas.entregadores, { ...e, aba: 'fechamentos' }),
  '/admin/motoboys#equipe': () => TelaEntregadores.htmlEntregadores(listas.entregadores, { ...e, aba: 'equipe' }),
  '/admin/relatorios': () => Finais.htmlRelatorios(finais.relatorios, e),
  '/admin/insights': () => Finais.htmlInsights(finais.insights, e),
  '/admin/configuracoes': () => Finais.htmlConfiguracoes(finais.configuracoes, e),
  '/admin/cupons': () => Mkt.htmlCupons(apoio.cupons, e),
  '/admin/vendedores': () => Mkt.htmlParceiros(apoio.parceiros, e),
  '/admin/food-marketing/campanhas': () => Mkt.htmlCampanhas(apoio.campanhas, e),
  '/admin/food-marketing/push': () => Mkt.htmlPush(finais.push, e),
  '/admin/fidelidade': () => Mkt.htmlFidelidade(apoio.fidelidade, e),
  '/app/impressao': () => TelaImpressao.htmlImpressao({
    impressoras: [{ name: 'POS-80', displayName: 'POS-80', isDefault: true }], impressoraAtual: 'POS-80',
    loja: demo.menu().loja, exemplo: listas.pedidos.itens[0], automatica: true, vias: 1, caminho: 'x',
  }, e),
  'ficha:pedido': () => Ficha.fichaPedido(listas.pedidos.itens[0]),
  'ficha:cliente': () => Ficha.fichaCliente(listas.clientes.itens[0]),
  'ficha:produto': () => Ficha.fichaProduto({ nome: 'Pizza', categoria: 'P', preco: 59.9, custo: 18.4, situacao: 'Ativo', vendas7d: 12 }),
  'ficha:acessoTv': () => Ficha.fichaAcessoTv({ definido: true, dispositivos: 1, dominioCardapio: 'https://x' }),
}
for (const rota of Object.keys(ComAbas.ABAS)) {
  for (const aba of ComAbas.ABAS[rota].map((x) => x.chave)) {
    const chave = rota.split('/').pop()
    TELAS[rota + '#' + aba] = () => ComAbas.htmlComAbas(rota, abas[chave === 'estoque' ? 'estoque' : chave], { ...e, aba })
  }
}

function varrer() {
  const acoes = new Map(), atributos = new Map()
  for (const nome of Object.keys(TELAS)) {
    const html = TELAS[nome]()
    for (const m of html.matchAll(/data-acao="([^"]+)"/g)) {
      if (!acoes.has(m[1])) acoes.set(m[1], nome)
    }
    for (const m of html.matchAll(/\sdata-([a-z-]+)=/g)) {
      if (m[1] !== 'acao' && !atributos.has(m[1])) atributos.set(m[1], nome)
    }
  }
  return { acoes, atributos }
}

const shell = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'shell.js'), 'utf8')

/** Ações que o shell trata ele mesmo, antes de consultar o mapa de destinos —
 *  `acao === 'x'` e `acao.indexOf('x:') === 0`. Elas não precisam (nem devem) estar
 *  em acoes.js: se estivessem, o clique abriria o painel em vez de FAZER. */
function tratadasNoShell() {
  const t = new Set()
  for (const m of shell.matchAll(/acao === '([^']+)'/g)) t.add(m[1])
  for (const m of shell.matchAll(/acao\.indexOf\('([^']+)'\) === 0/g)) t.add(m[1])
  return t
}
const ehTratadaNoShell = (a) => {
  for (const x of tratadasNoShell()) if (a === x || a.indexOf(x) === 0) return true
  return false
}

test('todo botão desenhado tem destino declarado — nenhum clique morre calado', () => {
  const { acoes } = varrer()
  const semDestino = [...acoes].filter(([a]) => !Acoes.destinoDe(a) && !ehTratadaNoShell(a)).map(([a, t]) => a + ' (' + t + ')')
  assert.deepStrictEqual(semDestino, [], 'ações sem destino em acoes.js: ' + semDestino.join(', '))
  assert.ok(acoes.size > 60, 'a varredura precisa achar os botões de verdade (achou ' + acoes.size + ')')
})

test('todo atributo interativo desenhado é tratado pelo shell', () => {
  const { atributos } = varrer()
  // rownav-idx é só a numeração das linhas (navegação por teclado); não é clicável.
  // Só marcação, não são clicáveis: rownav-idx numera a linha; item-kds identifica o
  // item dentro do cartão, cujo clique é tratado pelo cartão (data-pedido-kds).
  const naoClicaveis = ['rownav-idx', 'item-kds']
  const tratados = new Set([...shell.matchAll(/getAttribute\('data-([a-z-]+)'\)/g)].map((m) => m[1]))
  for (const m of shell.matchAll(/closest\('\[data-([a-z-]+)\]'\)/g)) tratados.add(m[1])
  for (const m of shell.matchAll(/getAttribute\('data-([a-z-]+)'\)/g)) tratados.add(m[1])
  // Os filtros do Financeiro são declarados num MAPA ('data-forma-fin': 'forma') e
  // tratados em laço — contam como tratados igual aos do closest() literal.
  for (const m of shell.matchAll(/'data-([a-z-]+)':\s*'/g)) tratados.add(m[1])
  const soltos = [...atributos].filter(([a, t]) => !tratados.has(a) && naoClicaveis.indexOf(a) < 0)
    .map(([a, t]) => a + ' (' + t + ')')
  assert.deepStrictEqual(soltos, [], 'atributos desenhados que o shell ignora: ' + soltos.join(', '))
})

test('as ações que o app FAZ sozinho são as da máquina e as de tela', () => {
  const doApp = Object.keys(Acoes.DESTINOS).filter((k) => Acoes.DESTINOS[k].app)
  // impressão e PDF são da máquina; o resto só mexe no que já está na tela
  assert.ok(doApp.includes('relatorio:pdf') && doApp.includes('mov:pdf'))
  assert.ok(doApp.includes('impressao:teste') && doApp.includes('mesa:imprimir'))
  assert.ok(doApp.includes('ordenar-clientes') && doApp.includes('limpar-selecao'))
})

test('toda ação que vai para o painel aponta uma rota que existe no menu', () => {
  const menu = demo.menu()
  const doMenu = new Set(menu.secoes.flatMap((s) => s.itens.map((i) => i.href)))
  // rotas do painel que não têm item de menu próprio, mas existem no CardapioPro
  const extras = new Set(['/admin/venda', '/admin/escolher-loja', '/admin/whatsapp', '/admin/nf', '/admin/contabil'])
  const ruins = Object.keys(Acoes.DESTINOS)
    .filter((k) => Acoes.DESTINOS[k].rota)
    .filter((k) => !doMenu.has(Acoes.DESTINOS[k].rota) && !extras.has(Acoes.DESTINOS[k].rota))
    .map((k) => k + ' → ' + Acoes.DESTINOS[k].rota)
  assert.deepStrictEqual(ruins, [], 'ações apontando para rota inexistente: ' + ruins.join(', '))
})

test('toda ação que vai para o painel diz O QUE vai fazer lá', () => {
  const semExplicacao = Object.keys(Acoes.DESTINOS)
    .filter((k) => Acoes.DESTINOS[k].rota && !Acoes.DESTINOS[k].o)
  assert.deepStrictEqual(semExplicacao, [], 'sem o "o quê": ' + semExplicacao.join(', '))
})

test('a chave da ação ignora o identificador que vem depois', () => {
  assert.strictEqual(Acoes.chaveDe('despachar:1042'), 'despachar')
  assert.strictEqual(Acoes.chaveDe('mesa:imprimir:7'), 'mesa:imprimir', 'chave composta que está no mapa')
  assert.strictEqual(Acoes.chaveDe('esgotar-item:Pizza: a boa'), 'esgotar-item')
  assert.strictEqual(Acoes.destinoDe('mesa:imprimir:7').app, 'comanda')
})

test('ação que saiu do mapa não tem destino — porque o app FAZ', () => {
  // kds:iniciar saiu quando a cozinha passou a mover a fila pelo app. Um destino
  // sobrando aqui faria o clique abrir o painel em vez de mover o item.
  assert.strictEqual(Acoes.destinoDe('kds:iniciar:c1'), null)
  assert.strictEqual(Acoes.destinoDe('kds:pronto:c1'), null)
  assert.strictEqual(Acoes.destinoDe('caixa:sangria'), null)
  assert.strictEqual(Acoes.destinoDe('avancar:1042'), null)
})

test('o aviso do topo existe de verdade (era ele que faltava)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'index.html'), 'utf8')
  const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'elo.css'), 'utf8')
  assert.ok(html.includes('id="eaviso"'), 'a faixa precisa existir no HTML')
  assert.ok(/#eaviso\{/.test(css) && /#eaviso\.ok\{/.test(css), 'e ter estilo, senão não aparece')
  assert.ok(shell.includes('function avisar('), 'e o shell precisa saber usá-la')
  assert.ok(shell.includes("window.mensagemTopo = "), 'mensagemTopo passa a existir')
})
