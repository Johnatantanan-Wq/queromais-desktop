// Simulação de USO: carrega o shell de verdade num DOM, com a ponte trocada pelos
// dados de demonstração, e CLICA nos botões — o mesmo que o lojista faz. Cada teste
// aqui responde "clicar nisso reflete alguma coisa na tela?".
//
// Foi este caminho que mostrou o problema original: os botões chamavam uma função de
// aviso que não existia, então o clique não devolvia nada. Um teste de HTML não pegaria
// isso, porque o botão ESTAVA desenhado — o que faltava era o outro lado.
const { test, before, beforeEach } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const Module = require('module')
const { JSDOM } = require('jsdom')

const raiz = path.join(__dirname, '..')
const demo = require('../src-electron/demo-dados')
const registroDeTeste = require('../src-electron/vendas-locais').criarRegistro({ proximoNumero: 1044 })
const pedidosLocais = require('../src-electron/pedidos-locais')
// recriado a cada teste: a varredura de botões avança tudo, e o próximo teste
// começaria com o quadro no fim.
let etapasDeTeste = pedidosLocais.criarRegistro()
let caixaLocal = require('../src-electron/caixa-local').criarRegistro()
let whatsDoTeste = { estado: 'sem_config', provedor: 'desativado', ativo: false, evolution_gerenciada: true }
let filaDoTeste = new Map()
let despachoDoTeste = require('../src-electron/despacho-local').criarRegistro()
let cardapioDoTeste = require('../src-electron/cardapio-local').criarRegistro()
let comprasDoTeste = require('../src-electron/compras-local').criarRegistro()

// ── ponte falsa: os mesmos canais que o main registra no modo demonstração ──
// `modoDemo` desliga para simular o app CONECTADO (sem --demo), que é como o lojista abre.
let modoDemo = true
// `painelResponde` desliga para simular a sessão caída: o painel não devolve menu.
let painelResponde = true
let ouvintes = {}
const chamadas = []
function responder(canal, args) {
  chamadas.push({ canal, args })
  const ok = (dados) => ({ dados, offline: false, ts: Date.now(), demo: true })
  if (canal === 'menu-carregar') {
    if (!painelResponde) return { dados: require('../src-electron/menu-base').menuBase(), offline: true, ts: 0, base: true }
    return ok(demo.menu())
  }
  if (canal === 'app-info') return { demo: modoDemo, versao: 'teste' }
  if (canal === 'rede-status') return { online: true, demo: true }
  if (canal === 'visao-geral-carregar') return ok(demo.visaoGeral((args && args.periodo) || 'semana'))
  if (canal === 'caixa-carregar') return ok(caixaLocal.aplicar(demo.caixa()))
  if (canal === 'whatsapp-carregar') return ok(whatsDoTeste)
  if (canal === 'conversas-carregar') {
    // Mesmo cruzamento do app: telefone da conversa contra cadastro e pedidos.
    const bruto = demo.conversas()
    const junto = require('../src-electron/adaptadores').conversas({
      conversasResp: bruto, clientesResp: demo.listas().clientes, pedidosResp: demo.listas().pedidos,
    })
    return ok({ ...junto, agora: bruto.agora, estado: whatsDoTeste.estado, provedor: whatsDoTeste.provedor })
  }
  if (canal === 'whatsapp-salvar') {
    whatsDoTeste = { ...whatsDoTeste, ...(args.campos || {}), provedor: args.provedor,
      ativo: args.provedor !== 'desativado', estado: args.provedor === 'evolution' ? 'close' : 'indisponivel' }
    return { ok: true }
  }
  if (canal === 'whatsapp-conectar') {
    whatsDoTeste = { estado: 'connecting', provedor: 'evolution', ativo: true }
    return { ok: true, estado: 'connecting', qr: demo.qrFicticio(), pairingCode: 'DEMO-2026' }
  }
  if (canal === 'whatsapp-desconectar') {
    whatsDoTeste = { estado: 'close', provedor: 'evolution', ativo: false }
    return { ok: true }
  }
  if (canal === 'caixa-movimentacao') {
    const d = require('../src-electron/caixa-acoes').movimentacao({ ...args, caixaAberto: true })
    if (!d.ok) return { ok: false, erro: d.motivo }
    caixaLocal.lancar({ tipo: args.tipo, valor: d.corpo.valor, motivo: d.corpo.motivo })
    return { ok: true, resumo: d.resumo }
  }
  if (canal === 'caixa-fechar') {
    const d = require('../src-electron/caixa-acoes').fechamento({ ...args, caixaAberto: true })
    return d.ok ? { ok: true, resumo: d.resumo } : { ok: false, erro: d.motivo }
  }
  if (canal === 'cozinha-carregar') {
    const c = demo.operacao().cozinha
    return ok({ ...c, pedidos: (c.pedidos || []).map((p) => ({
      ...p, itens: (p.itens || []).map((i) => ({ ...i, estado: filaDoTeste.get(i.id) || i.estado })),
    })) })
  }
  if (canal === 'kds-avancar') {
    const d = require('../src-electron/kds-acoes').avancarItem(args.item)
    if (!d.ok) return { ok: false, erro: d.motivo }
    filaDoTeste.set(args.item.id, d.status)
    return { ok: true, status: d.status, resumo: d.resumo }
  }
  if (canal === 'kds-pedido-pronto') {
    const d = require('../src-electron/kds-acoes').pedidoPronto(args.pedido)
    if (!d.ok) return { ok: false, erro: d.motivo }
    for (const i of args.pedido.itens) if (i.estado !== 'pronto') filaDoTeste.set(i.id, 'pronto')
    return { ok: true, resumo: d.resumo }
  }
  if (canal === 'bar-carregar') return ok(demo.operacao().bar)
  if (canal === 'salao-carregar') return ok(demo.operacao().salao)
  if (canal === 'compras-carregar') return ok(comprasDoTeste.aplicar(demo.listasApoio().compras))
  if (canal.indexOf('compras-') === 0 && canal !== 'compras-carregar') {
    const A = require('../src-electron/compras-acoes')
    if (canal === 'compras-anotar') { const d = A.anotar(args); if (!d.ok) return { ok: false, erro: d.motivo }; comprasDoTeste.anotar(d.corpo); return { ok: true, resumo: d.resumo } }
    if (canal === 'compras-recebi') { const d = A.recebi(args.item, args); if (!d.ok) return { ok: false, erro: d.motivo }; comprasDoTeste.receber(args.item.id, d.corpo.qtd); return { ok: true, resumo: d.resumo } }
    const fn = { 'compras-comprado': ['comprado', 'comprado'], 'compras-voltar': ['voltar', 'pendente'], 'compras-excluir': ['excluir', 'excluido'] }[canal]
    const d = A[fn[0]](args.item); if (!d.ok) return { ok: false, erro: d.motivo }
    comprasDoTeste.marcar(args.item.id, fn[1]); return { ok: true, resumo: d.resumo }
  }
  if (canal === 'cupons-carregar') return ok(demo.listasApoio().cupons)
  if (canal === 'fidelidade-carregar') return ok(demo.listasApoio().fidelidade)
  if (canal === 'parceiros-carregar') return ok(demo.listasApoio().parceiros)
  if (canal === 'campanhas-carregar') return ok(demo.listasApoio().campanhas)
  if (canal === 'push-carregar') return ok(demo.apoioFinal().push)
  if (canal === 'insights-carregar') return ok(demo.apoioFinal().insights)
  if (canal === 'relatorios-carregar') return ok(demo.apoioFinal().relatorios)
  if (canal === 'configuracoes-carregar') return ok(demo.apoioFinal().configuracoes)
  if (canal === 'financeiro-abas-carregar') return ok(demo.telasComAbas().financeiro)
  if (canal === 'atendimento-abas-carregar') return ok(demo.telasComAbas().atendimento)
  if (canal === 'estoque-abas-carregar') return ok(demo.telasComAbas().estoque)
  if (canal === 'pedidos-carregar') return ok(etapasDeTeste.aplicar(demo.listas().pedidos))
  if (canal === 'pedido-corrigir') {
    const d = require('../src-electron/pedido-acoes').correcao(args.pedido, args.campos)
    return d.ok ? { ok: true, trocouBairro: d.trocouBairro } : { ok: false, erro: d.motivo }
  }
  if (canal === 'pedido-avancar') {
    const nova = etapasDeTeste.avancar(args.pedido.numero, args.etapa)
    return nova ? { ok: true, status: nova, numero: args.pedido.numero } : { ok: false, erro: 'última etapa' }
  }
  if (canal === 'clientes-carregar') return ok(demo.listas().clientes)
  if (canal === 'carrinhos-carregar') return ok(demo.listas().carrinhos)
  if (canal === 'cardapio-carregar') return ok(cardapioDoTeste.aplicar(demo.listas().cardapio))
  if (canal === 'cardapio-esgotar-item') {
    const d = require('../src-electron/cardapio-acoes').esgotarItem(args.item, args.esgotar)
    if (!d.ok) return { ok: false, erro: d.motivo }
    cardapioDoTeste.mudar(args.item.id, { esgotado: d.corpo.esgotado })
    return { ok: true, resumo: d.resumo }
  }
  if (canal === 'cardapio-editar-preco') {
    const d = require('../src-electron/cardapio-acoes').editarPreco(args.item, args.preco)
    if (!d.ok) return { ok: false, erro: d.motivo }
    cardapioDoTeste.mudar(args.item.id, { preco: d.corpo.preco })
    return { ok: true, resumo: d.resumo }
  }
  if (canal === 'cardapio-esgotar-categoria') {
    const d = require('../src-electron/cardapio-acoes').esgotarCategoria(args.categoria, args.esgotar)
    if (!d.ok) return { ok: false, erro: d.motivo }
    for (const c of d.chamadas) cardapioDoTeste.mudar(c.caminho.split('/').pop(), { esgotado: c.corpo.esgotado })
    return { ok: true, resumo: d.resumo }
  }
  if (canal === 'despacho-carregar') return ok(despachoDoTeste.aplicar(demo.listas().despacho))
  if (canal === 'despacho-despachar') {
    const d = require('../src-electron/despacho-acoes').despachar(args)
    if (!d.ok) return { ok: false, erro: d.motivo }
    despachoDoTeste.despachar(d.chamadas, args.pedidos)
    return { ok: true, resumo: d.resumo }
  }
  if (canal === 'entregadores-carregar') return ok(demo.listas().entregadores)
  if (canal === 'impressao-info') {
    return ok({ impressoras: [{ name: 'POS-80', displayName: 'POS-80', isDefault: true }],
      impressoraAtual: 'POS-80', loja: demo.menu().loja, exemplo: demo.listas().pedidos.itens[0],
      automatica: true, vias: 1, caminho: 'x' })
  }
  if (canal === 'venda-cardapio') {
    return ok({
      categorias: demo.listas().cardapio.categorias,
      clientes: demo.listas().clientes.itens,
      taxasBairro: { Centro: 7.00, 'Praia de Guaibim': 5.00 },
    })
  }
  if (canal === 'venda-registrar') return registroDeTeste.registrar(args)
  if (canal === 'abrir-rota') return { ok: false, demo: true }
  if (canal === 'impressao-comanda' || canal === 'impressao-teste') return { ok: true }
  if (canal === 'relatorio-pdf') return { ok: true, caminho: '/tmp/x.pdf' }
  return ok(null)
}

let dom, doc, win
const original = Module._load

before(() => {
  // `require('electron')` no renderer → ponte falsa. O resto do shell é o de verdade.
  Module._load = function (pedido, pai, ehMain) {
    if (pedido === 'electron') {
      return {
        ipcRenderer: {
          invoke: (canal, args) => Promise.resolve(responder(canal, args)),
          send: (canal, args) => { chamadas.push({ canal, args }) },
          on: (canal, fn) => { (ouvintes[canal] = ouvintes[canal] || []).push(fn) },
        },
      }
    }
    return original.apply(this, arguments)
  }
})

/** Sobe uma janela nova com o index.html e o shell.js reais. */
async function abrirApp() {
  const html = fs.readFileSync(path.join(raiz, 'renderer', 'elo', 'index.html'), 'utf8')
    .replace('<script src="shell.js"></script>', '')
  ouvintes = {}
  dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' })
  win = dom.window
  doc = win.document
  global.window = win
  global.document = doc
  for (const k of ['HTMLElement', 'Node', 'Event', 'MouseEvent', 'getComputedStyle']) global[k] = win[k]
  // O shell agenda dois intervalos no boot (menu de 30s, fila da cozinha de 5s). Num
  // teste eles só segurariam o processo — então ficam desligados durante a carga.
  const intervaloReal = global.setInterval
  global.setInterval = () => 0
  delete require.cache[require.resolve('../renderer/elo/shell')]
  require('../renderer/elo/shell')
  global.setInterval = intervaloReal
  await esperar(40)
  return win
}

// setTimeout do Node, guardado antes de qualquer troca: usar o do jsdom aqui daria
// recursão (o dele reentra no global).
const setTimeoutReal = setTimeout
const esperar = (ms) => new Promise((r) => setTimeoutReal(r, ms))

/** Clica de verdade: evento que sobe até o document, como no navegador. */
function clicar(el) {
  assert.ok(el, 'elemento não encontrado para clicar')
  el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }))
}
const $ = (sel) => doc.querySelector(sel)
const conteudo = () => doc.getElementById('econtent').innerHTML
const aviso = () => doc.getElementById('eaviso')

async function irPara(href) {
  clicar($('[data-href="' + href + '"]'))
  await esperar(40)
}

/** A venda manual não tem item de menu (no painel também não): chega-se por ela pelo
 *  botão "+ Venda manual" da Gestão de pedido. */
async function irParaVenda() {
  await irPara('/admin/pedidos')
  clicar($('[data-acao="venda-manual"]'))
  await esperar(80)
}

/** A venda manual mora num POPUP, não no palco — é lá que se olha o conteúdo dela. */
const vendaNaTela = () => {
  const f = doc.getElementById('eloFicha')
  return f ? f.innerHTML : ''
}

beforeEach(async () => { chamadas.length = 0; etapasDeTeste = pedidosLocais.criarRegistro(); caixaLocal = require('../src-electron/caixa-local').criarRegistro()
  whatsDoTeste = { estado: 'sem_config', provedor: 'desativado', ativo: false, evolution_gerenciada: true }
  filaDoTeste = new Map()
  despachoDoTeste = require('../src-electron/despacho-local').criarRegistro()
  cardapioDoTeste = require('../src-electron/cardapio-local').criarRegistro()
  comprasDoTeste = require('../src-electron/compras-local').criarRegistro() })

test('o app sobe, pinta o menu e abre a Visão geral', async () => {
  await abrirApp()
  assert.ok(doc.querySelectorAll('.erailitem').length >= 20, 'o menu inteiro precisa aparecer')
  assert.ok(/Faturamento|faturamento/i.test(conteudo()), 'a primeira tela é a Visão geral')
})

test('clicar num item do menu troca a tela', async () => {
  await abrirApp()
  await irPara('/admin/caixa')
  assert.ok(/CAIXA ABERTO|Caixa/i.test(conteudo()))
  assert.ok(chamadas.some((c) => c.canal === 'caixa-carregar'), 'a tela pede o dado dela')
})

test('sangria abre a ficha com o campo de valor — não manda mais para o painel', async () => {
  await abrirApp()
  await irPara('/admin/caixa')
  clicar($('[data-acao="caixa:sangria"]'))
  await esperar(30)
  assert.ok(doc.getElementById('eloFicha'), 'a ficha da sangria precisa abrir')
  assert.ok(doc.querySelector('#eloFicha [data-campo="valor"]'), 'com campo de valor')
  assert.ok(doc.querySelector('#eloFicha [data-motivo-caixa]'), 'e os motivos que o painel conhece')
})

test('sangria sem valor é recusada na hora, com frase de gente', async () => {
  await abrirApp()
  await irPara('/admin/caixa')
  clicar($('[data-acao="caixa:sangria"]'))
  await esperar(30)
  clicar(doc.querySelector('#eloFicha [data-acao^="caixa:mov:confirmar"]'))
  await esperar(50)
  assert.ok(/maior que zero/i.test(aviso().textContent), 'esperava recusa: ' + aviso().textContent)
  assert.ok(doc.getElementById('eloFicha'), 'e a ficha continua aberta para corrigir')
})

test('sangria com valor lança, fecha a ficha e o caixa muda', async () => {
  await abrirApp()
  await irPara('/admin/caixa')
  const antes = conteudo()
  clicar($('[data-acao="caixa:sangria"]'))
  await esperar(30)
  doc.querySelector('#eloFicha [data-campo="valor"]').value = '150,50'
  clicar(doc.querySelector('#eloFicha [data-motivo-caixa]'))
  clicar(doc.querySelector('#eloFicha [data-acao^="caixa:mov:confirmar"]'))
  await esperar(80)
  assert.ok(chamadas.some((c) => c.canal === 'caixa-movimentacao'), 'tem de chamar o canal do caixa')
  assert.ok(/150,50/.test(aviso().textContent), 'o aviso diz o valor: ' + aviso().textContent)
  assert.ok(!doc.getElementById('eloFicha'), 'a ficha fecha depois de lançar')
  assert.notStrictEqual(conteudo(), antes, 'a tela do caixa se redesenha')
})

test('fechar caixa pede os três contados antes de deixar fechar', async () => {
  await abrirApp()
  await irPara('/admin/caixa')
  clicar($('[data-acao="caixa:fechar"]'))
  await esperar(30)
  assert.ok(doc.querySelector('#eloFicha [data-campo="dinheiro"]'), 'a ficha do fechamento abre')
  clicar(doc.querySelector('#eloFicha [data-acao="caixa:fechar:confirmar"]'))
  await esperar(50)
  assert.ok(/dinheiro, Pix e cartão/i.test(aviso().textContent), 'esperava a recusa: ' + aviso().textContent)
})

test('na subaba Delivery, cada cartão tem o botão da sua fase e ele responde', async () => {
  await abrirApp()
  await irPara('/admin/caixa')
  clicar($('[data-subaba="delivery"]'))
  await esperar(30)
  assert.ok($('[data-acao^="entrega:confirmar"]'), 'o pedido esperando fechamento tem o botão')
  clicar($('[data-acao^="entrega:concluir"]'))
  await esperar(30)
  assert.ok(/concluir a entrega/i.test(aviso().textContent), aviso().textContent)
})

test('imprimir conta de mesa é do app: manda para a impressora', async () => {
  await abrirApp()
  await irPara('/admin/caixa')
  clicar($('[data-acao^="mesa:imprimir"]'))
  await esperar(60)
  assert.ok(chamadas.some((c) => c.canal === 'impressao-comanda'), 'precisa chamar a impressão de verdade')
  assert.ok(/impressora/i.test(aviso().textContent), aviso().textContent)
})

test('"Imprimir / Salvar PDF" manda o conteúdo da tela e avisa onde salvou', async () => {
  await abrirApp()
  await irPara('/admin/relatorios')
  clicar($('[data-acao="relatorio:pdf"]'))
  await esperar(60)
  const pdf = chamadas.find((c) => c.canal === 'relatorio-pdf')
  assert.ok(pdf, 'o canal do PDF precisa ser chamado')
  assert.ok(pdf.args.html && pdf.args.html.length > 500, 'e receber o conteúdo da tela')
  assert.ok(/PDF salvo/.test(aviso().textContent), aviso().textContent)
})

test('trocar de aba dentro de Relatórios muda o conteúdo sem sair da tela', async () => {
  await abrirApp()
  await irPara('/admin/relatorios')
  assert.ok(/Evolução diária/.test(conteudo()))
  clicar($('[data-aba-rel="clientes"]'))
  await esperar(30)
  assert.ok(!/Evolução diária/.test(conteudo()), 'a aba Clientes não repete o gráfico de Vendas')
})

test('ordenar clientes reordena a lista de verdade', async () => {
  await abrirApp()
  await irPara('/admin/clientes')
  const primeiro = () => conteudo().split('data-linha="')[1].split('"')[0]
  const antes = primeiro()
  clicar($('[data-acao="ordenar-clientes"]'))
  await esperar(30)
  assert.ok(/Ordenado por/.test(aviso().textContent), aviso().textContent)
  assert.ok(/Comprou recente/.test(conteudo()), 'o botão passa a mostrar o outro critério')
  assert.notStrictEqual(primeiro() + ':' + conteudo().length, antes + ':0')
})

test('marcar um pedido no Despacho aparece na tela e some ao limpar', async () => {
  await abrirApp()
  await irPara('/admin/despacho')
  const caixa = doc.querySelector('[data-sel]')
  clicar(caixa)
  await esperar(30)
  assert.ok(/selecionado/.test(conteudo()), 'a barra de seleção precisa aparecer')
  clicar($('[data-acao="limpar-selecao"]'))
  await esperar(30)
  assert.ok(!/selecionado/.test(conteudo()), 'e sumir quando limpa')
})

test('escolher o perfil na Campanha muda a audiência', async () => {
  await abrirApp()
  await irPara('/admin/food-marketing/campanhas')
  assert.ok(/Continuar com 128 contatos/.test(conteudo()))
  clicar($('[data-perfil-campanha="vip"]'))
  await esperar(30)
  assert.ok(/Continuar com 18 contatos/.test(conteudo()), 'a audiência acompanha o perfil')
})

test('clicar num cartão da cozinha abre a ficha do pedido', async () => {
  await abrirApp()
  await irPara('/admin/cozinha')
  clicar(doc.querySelector('[data-pedido-kds]'))
  await esperar(30)
  const ficha = doc.getElementById('eloFicha')
  assert.ok(ficha, 'a ficha lateral precisa abrir')
  assert.ok(/Pedido #/.test(ficha.textContent))
})

test('o Acesso pela TV abre a ficha em vez de sumir', async () => {
  await abrirApp()
  await irPara('/admin/cozinha')
  clicar($('[data-acao="kds:tv"]'))
  await esperar(30)
  assert.ok(/Acesso pela TV/.test(doc.getElementById('eloFicha').textContent))
})

test('abrir e fechar bloco na Gestão esconde e mostra a tabela', async () => {
  await abrirApp()
  await irPara('/admin/estoque')
  assert.ok(/Combo Família/.test(conteudo()))
  clicar(doc.querySelector('[data-bloco-estoque]'))
  await esperar(30)
  assert.ok(!/Combo Família/.test(conteudo()), 'bloco fechado esconde as linhas')
})

test('nenhuma tela do menu quebra ao ser aberta pelo clique', async () => {
  await abrirApp()
  const hrefs = [...doc.querySelectorAll('.erailitem')].map((i) => i.getAttribute('data-href'))
  for (const href of hrefs) {
    await irPara(href)
    const html = conteudo()
    assert.ok(html.length > 200, href + ' abriu vazia')
    assert.ok(!/undefined|NaN|\[object Object\]/.test(html), href + ' abriu com lixo na tela')
    assert.ok(!/Carregando…/.test(html), href + ' ficou presa em "Carregando…"')
  }
})

test('todo controle de tela (aba, filtro, chip, período) muda alguma coisa ao ser clicado', async () => {
  await abrirApp()
  // Atributos que existem para MUDAR a tela. Se clicar num deles não muda nada, ou o
  // controle está morto ou está desenhando o mesmo estado — os dois são defeito.
  const CONTROLES = ['aba', 'subaba', 'aba-rel', 'aba-cfg', 'sub-cfg', 'aba-campanha',
    'aba-fidelidade', 'aba-cliente', 'aba-carrinho', 'aba-cardapio', 'subgestao',
    'cat-estoque', 'bloco-estoque', 'filtro', 'filtro-pedido', 'filtro-carrinho',
    'modo', 'visao', 'metrica', 'periodo', 'periodo-rel', 'periodo-fid', 'periodo-mov',
    'periodo-fin', 'categoria', 'perfil-campanha', 'ficha']
  const hrefs = [...doc.querySelectorAll('.erailitem')].map((i) => i.getAttribute('data-href'))
  const mortos = []
  for (const href of hrefs) {
    await irPara(href)
    for (const attr of CONTROLES) {
      const todos = [...doc.querySelectorAll('#econtent [data-' + attr + ']')]
      if (!todos.length) continue
      // Clica num que NÃO seja o estado atual — clicar no que já está ativo não muda
      // nada por definição, e isso não é defeito.
      const alvo = todos.filter((el) => !/\bis-on\b|\bon\b/.test(el.className || '')).pop()
      if (!alvo) continue
      const valor = alvo.getAttribute('data-' + attr)
      const antes = conteudo()
      clicar(alvo)
      await esperar(45)
      if (conteudo() === antes) mortos.push(href + ' → data-' + attr + '="' + valor + '"')
    }
  }
  assert.deepStrictEqual(mortos, [], 'controles que não mudaram nada: ' + mortos.join(', '))
})

test('a busca filtra a lista enquanto se digita, sem perder o campo', async () => {
  await abrirApp()
  await irPara('/admin/clientes')
  const campo = doc.getElementById('listaBusca')
  assert.ok(campo, 'a lista de clientes tem busca')
  const antes = conteudo()
  campo.value = 'maria'
  campo.dispatchEvent(new win.Event('input', { bubbles: true }))
  await esperar(40)
  assert.notStrictEqual(conteudo(), antes, 'digitar precisa filtrar')
  assert.ok(/Maria Silva/.test(conteudo()) && !/Rafael Souza/.test(conteudo()))
  assert.ok(doc.getElementById('listaBusca'), 'e o campo continua na tela')
  assert.strictEqual(doc.getElementById('listaBusca').value, 'maria', 'com o que foi digitado')
})

test('o item avulso de Compras guarda o que foi digitado', async () => {
  await abrirApp()
  await irPara('/admin/compras')
  const campo = doc.querySelector('[data-compra-avulsa="nome"]')
  assert.ok(campo, 'o formulário de item avulso existe')
  campo.value = 'Saco de lixo 100L'
  campo.dispatchEvent(new win.Event('input', { bubbles: true }))
  await esperar(20)
  clicar(doc.querySelector('[data-acao="compras:relatorio-reposicao"]'))
  await esperar(60)
  await irPara('/admin/compras')
  assert.strictEqual(doc.querySelector('[data-compra-avulsa="nome"]').value, 'Saco de lixo 100L',
    'o que foi digitado sobrevive ao redesenho')
})

test('escolher entregador no Despacho fica escolhido', async () => {
  await abrirApp()
  await irPara('/admin/despacho')
  const sel = doc.querySelector('[data-entregador-de]')
  assert.ok(sel, 'cada linha tem o seletor de entregador')
  const nome = [...sel.options].map((o) => o.value).filter(Boolean)[0]
  sel.value = nome
  sel.dispatchEvent(new win.Event('change', { bubbles: true }))
  await esperar(30)
  assert.ok(/com /.test(aviso().textContent), aviso().textContent)
  clicar(doc.querySelector('[data-visao="lista"]'))
  await esperar(40)
  const depois = doc.querySelector('[data-entregador-de]')
  assert.strictEqual(depois.value, nome, 'a escolha sobrevive ao redesenho')
})

test('clicar numa linha da lista abre a ficha, e Esc fecha', async () => {
  await abrirApp()
  await irPara('/admin/clientes')
  clicar(doc.querySelector('#econtent [data-linha]'))
  await esperar(30)
  assert.ok(doc.getElementById('eloFicha'), 'a ficha do cliente abre')
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await esperar(20)
  assert.ok(!doc.getElementById('eloFicha'), 'e Esc fecha')
})

test('os botões DENTRO da ficha também respondem', async () => {
  await abrirApp()
  await irPara('/admin/pedidos')
  clicar(doc.querySelector('#econtent [data-pedido]') || doc.querySelector('#econtent [data-linha]'))
  await esperar(30)
  const ficha = doc.getElementById('eloFicha')
  assert.ok(ficha, 'a ficha do pedido abre')
  const botao = ficha.querySelector('[data-acao]')
  assert.ok(botao, 'a ficha tem ações')
  aviso().className = ''
  clicar(botao)
  await esperar(60)
  assert.ok(aviso().className.includes('on'), 'clicar dentro da ficha responde: ' + botao.getAttribute('data-acao'))
})

test('venda manual: dá para fechar uma venda inteira só clicando', async () => {
  await abrirApp()
  await irParaVenda()
  assert.ok(/Venda manual/.test(vendaNaTela()), 'a tela do PDV abre')

  // 1. cliente — retirada, para não depender de bairro e endereço
  clicar($('[data-venda-tipo="retirada"]'))
  await esperar(40)
  const nome = doc.querySelector('[data-venda-campo="nome"]')
  nome.value = 'Seu Antônio'
  nome.dispatchEvent(new win.Event('input', { bubbles: true }))
  await esperar(40)
  assert.strictEqual(doc.querySelector('[data-venda-campo="nome"]').value, 'Seu Antônio')

  // 2. produtos — dois cliques no mesmo produto viram quantidade 2
  clicar($('[data-acao="venda:etapa:produtos"]'))
  await esperar(40)
  const produto = doc.querySelector('#eloFicha [data-venda-add]')
  const nomeProduto = produto.getAttribute('data-venda-add')
  clicar(produto)
  await esperar(40)
  clicar(doc.querySelector('[data-venda-add="' + nomeProduto + '"]'))
  await esperar(40)
  assert.ok(/1 item\(ns\)/.test(vendaNaTela()), 'um produto, duas unidades')
  assert.ok(doc.querySelector('[data-venda-menos]'), 'o carrinho aparece')

  // 3. pagamento — dinheiro com troco
  clicar($('[data-acao="venda:etapa:pagamento"]'))
  await esperar(40)
  clicar($('[data-venda-forma="dinheiro"]'))
  await esperar(40)
  const troco = doc.querySelector('[data-venda-campo="trocoPara"]')
  troco.value = '500'
  troco.dispatchEvent(new win.Event('input', { bubbles: true }))
  await esperar(40)
  assert.ok(/Troco a separar/.test(vendaNaTela()))

  // fecha
  const antes = registroDeTeste.listar().length
  clicar($('[data-acao="venda:fechar"]'))
  await esperar(80)
  assert.strictEqual(registroDeTeste.listar().length, antes + 1, 'a venda foi gravada de verdade')
  assert.ok(/registrada/.test(vendaNaTela()), 'a tela vira recibo: ' + vendaNaTela().slice(0, 200))
  assert.ok(/Seu Antônio/.test(vendaNaTela()))
  // O id do produto tem que ir junto: é ele que o painel exige para lançar o pedido
  // quando o app está conectado.
  const gravada = registroDeTeste.listar()[0]
  assert.ok(gravada.itens[0].nome, 'a venda gravada tem o item')
})

test('venda manual: o app barra a venda incompleta em vez de gravar torto', async () => {
  await abrirApp()
  await irParaVenda()
  clicar($('[data-acao="venda:etapa:produtos"]'))
  await esperar(40)
  clicar($('[data-acao="venda:etapa:pagamento"]'))
  await esperar(40)
  assert.ok(/Adicione ao menos um item/.test(vendaNaTela()), 'sem item, a tela diz o que falta')
  assert.ok(!$('[data-acao="venda:fechar"]'), 'e o botão de fechar nem existe')
})

test('venda manual: "Venda manual" da Gestão de pedido abre o PDV', async () => {
  await abrirApp()
  await irPara('/admin/pedidos')
  const bt = $('[data-acao="venda-manual"]')
  assert.ok(bt, 'o botão existe no quadro de pedidos')
  clicar(bt)
  await esperar(60)
  assert.ok(/Venda manual/.test(vendaNaTela()) && /1\. cliente/.test(vendaNaTela()),
    'clicar leva para o PDV do app, não para o painel')
})

test('venda manual: cancelar limpa o pedido montado', async () => {
  await abrirApp()
  await irParaVenda()
  clicar($('[data-acao="venda:etapa:produtos"]'))
  await esperar(40)
  clicar(doc.querySelector('#eloFicha [data-venda-add]'))
  await esperar(40)
  assert.ok(/1 item\(ns\)/.test(vendaNaTela()))
  clicar($('[data-acao="venda:cancelar"]'))
  await esperar(40)
  assert.ok(/0 item\(ns\)/.test(vendaNaTela()) && /1\. cliente/.test(vendaNaTela()))
})

test('todo botão de toda tela do menu responde ao clique', async () => {
  await abrirApp()
  const hrefs = [...doc.querySelectorAll('.erailitem')].map((i) => i.getAttribute('data-href'))
  const mudos = []
  for (const href of hrefs) {
    await irPara(href)
    const quantos = Math.min(6, doc.querySelectorAll('#econtent [data-acao]').length)
    for (let i = 0; i < quantos; i++) {            // os primeiros de cada tela já bastam
      // Relê o DOM a cada volta: uma ação pode redesenhar a tela, e aí o botão que eu
      // tinha guardado sai do documento e o clique nele não chega a lugar nenhum.
      const b = doc.querySelectorAll('#econtent [data-acao]')[i]
      if (!b) break
      const acao = b.getAttribute('data-acao')
      aviso().className = ''
      const antes = conteudo()
      clicar(b)
      await esperar(40)
      const respondeu = aviso().className.includes('on') || conteudo() !== antes
        || doc.getElementById('eloFicha') || chamadas.some((c) => c.canal === 'abrir-rota')
      if (!respondeu) mudos.push(href + ' → ' + acao)
      chamadas.length = 0
      const f = doc.getElementById('eloFicha')
      if (f) f.remove()
    }
  }
  assert.deepStrictEqual(mudos, [], 'botões que não devolveram nada: ' + mudos.join(', '))
})

test('conectado (sem --demo), o app sobe na Visão geral — não na tela do painel', async () => {
  // Regressão do 07/09: fora da demonstração o boot não abria rota nenhuma. O palco
  // nativo ficava vazio e a BrowserView do painel aparecia por baixo — quem abria o
  // beta caía na TELA DE LOGIN do painel, como se o app novo não existisse.
  modoDemo = false
  try {
    await abrirApp()
    assert.ok(chamadas.some((c) => c.canal === 'esconder-view'),
      'a view do painel precisa sair da área de conteúdo: ' + chamadas.map((c) => c.canal).join(', '))
    assert.ok(chamadas.some((c) => c.canal === 'visao-geral-carregar'), 'a Visão geral pede o dado dela')
    assert.ok(!chamadas.some((c) => c.canal === 'abrir-rota'), 'nada de abrir o painel no boot')
    assert.ok(conteudo().trim().length > 0, 'o palco nativo não pode subir vazio')
  } finally { modoDemo = true }
})

test('painel sem responder: a barra lateral ainda traz as telas do app', async () => {
  // O sintoma de 07/09: sessão do painel caída → menu vazio → nenhuma tela alcançável.
  modoDemo = false
  painelResponde = false
  try {
    await abrirApp()
    const itens = doc.querySelectorAll('.erailitem')
    assert.ok(itens.length >= 20, 'a barra precisa dos itens do app: veio ' + itens.length)
    assert.ok(doc.querySelector('[data-href="/admin/caixa"]'), 'o Caixa tem de estar alcançável')
    assert.ok(doc.querySelector('[data-href="/admin/pedidos"]'), 'a Gestão de pedido também')
    await irPara('/admin/caixa')
    assert.ok(chamadas.some((c) => c.canal === 'caixa-carregar'), 'e clicar nela pede o dado dela')
  } finally { modoDemo = true; painelResponde = true }
})

/** Dispara um aviso do main para o renderer, como o ipcRenderer.on receberia. */
function avisarDoMain(canal, args) { (ouvintes[canal] || []).forEach((fn) => fn({}, args)) }

test('quando o painel fica pronto, o menu e a tela recarregam na hora', async () => {
  // Sem este aviso o app esperava o ciclo de 30s: a barra e os números apareciam
  // "aos poucos" depois de abrir, e era isso que se via na tela.
  modoDemo = false
  painelResponde = false
  try {
    await abrirApp()
    assert.ok(doc.querySelectorAll('.erailitem').length >= 20, 'a barra sobe com o menu do app')
    painelResponde = true
    chamadas.length = 0
    avisarDoMain('painel-pronto')
    await esperar(60)
    assert.ok(chamadas.some((c) => c.canal === 'menu-carregar'), 'pede o menu do painel na hora')
    assert.ok(chamadas.some((c) => c.canal === 'visao-geral-carregar'), 'e recarrega a tela aberta')
  } finally { modoDemo = true; painelResponde = true }
})

test('clicar em Aceitar move o pedido de coluna — a primeira ação de operação do app', async () => {
  await abrirApp()
  await irPara('/admin/pedidos')
  const antes = conteudo()
  const bt = doc.querySelector('#econtent [data-acao^="avancar:"]')
  assert.ok(bt, 'o cartão precisa do botão da etapa')
  const numero = bt.getAttribute('data-acao').split(':')[1]
  clicar(bt)
  await esperar(80)
  assert.ok(chamadas.some((c) => c.canal === 'pedido-avancar'), 'o clique tem de pedir o avanço')
  assert.ok(aviso().className.includes('on'), 'e dizer o que aconteceu')
  assert.notStrictEqual(conteudo(), antes, 'o quadro se redesenha')
  // o cartão saiu da coluna em que estava
  const depois = doc.querySelector('[data-pedido="' + numero + '"]')
  assert.ok(depois, 'o pedido continua no quadro, só que noutra coluna')
})

test('avançar de novo continua andando, sem travar no primeiro clique', async () => {
  await abrirApp()
  await irPara('/admin/pedidos')
  for (let i = 0; i < 2; i++) {
    const bt = doc.querySelector('#econtent [data-acao^="avancar:"]')
    if (!bt) break
    clicar(bt)
    await esperar(80)
  }
  const avancos = chamadas.filter((c) => c.canal === 'pedido-avancar').length
  assert.ok(avancos >= 2, 'esperava pelo menos 2 avanços, veio ' + avancos)
})

test('WhatsApp: o item está no menu, logo abaixo de Clientes', async () => {
  await abrirApp()
  const hrefs = [...doc.querySelectorAll('.erailitem')].map((x) => x.getAttribute('data-href'))
  const i = hrefs.indexOf('/admin/clientes')
  assert.ok(i >= 0, 'Clientes tem de estar no menu')
  assert.strictEqual(hrefs[i + 1], '/admin/whatsapp', 'WhatsApp vem logo depois: ' + hrefs.slice(0, 8).join(' '))
})

test('WhatsApp no menu: são as CONVERSAS, não a configuração', async () => {
  await abrirApp()
  await irPara('/admin/whatsapp')
  assert.ok(/Maria Silva/.test(conteudo()), 'a lista aparece com o nome do CADASTRO, não o do WhatsApp')
  assert.ok(/Configurar WhatsApp/.test(conteudo()), 'e um atalho para a configuração')
  assert.ok(!/Meta Cloud API/.test(conteudo()), 'a escolha de provedor NÃO fica aqui')
})

test('clicar numa conversa abre as mensagens dela', async () => {
  await abrirApp()
  await irPara('/admin/whatsapp')
  clicar(doc.querySelector('[data-conversa="c2"]'))
  await esperar(60)
  assert.ok(/Boa noite!/.test(conteudo()), 'as mensagens da conversa escolhida')
  // "Chegou quentinha" continua na tela: é a PRÉVIA da outra conversa na lista.
  // O que não pode aparecer é o miolo dela.
  assert.ok(!/já avisei a cozinha/.test(conteudo()), 'as mensagens da outra conversa não vazam')
})

test('o atalho da conversa leva à configuração, na aba certa', async () => {
  await abrirApp()
  await irPara('/admin/whatsapp')
  clicar(doc.querySelector('[data-acao="conversa:configurar"]'))
  await esperar(90)
  assert.ok(chamadas.some((c) => c.canal === 'configuracoes-carregar'), 'foi para Configurações')
  assert.ok(/Meta Cloud API/.test(conteudo()), 'e já na aba WhatsApp: ' + conteudo().slice(0, 160))
})

test('Configurações › WhatsApp: escolher o caminho e salvar', async () => {
  await abrirApp()
  await irPara('/admin/configuracoes')
  clicar(doc.querySelector('[data-aba-cfg="whatsapp"]'))
  await esperar(60)
  clicar(doc.querySelector('#econtent [data-provedor-whats="evolution"]'))
  await esperar(50)
  clicar(doc.querySelector('#econtent [data-acao="whatsapp:salvar:evolution"]'))
  await esperar(90)
  assert.ok(chamadas.some((c) => c.canal === 'whatsapp-salvar'), 'o clique grava a escolha')
  assert.ok(/configurado/i.test(aviso().textContent), aviso().textContent)
})

test('Configurações › WhatsApp: conectar traz o QR', async () => {
  await abrirApp()
  await irPara('/admin/configuracoes')
  clicar(doc.querySelector('[data-aba-cfg="whatsapp"]'))
  await esperar(60)
  clicar(doc.querySelector('#econtent [data-provedor-whats="evolution"]'))
  await esperar(50)
  clicar(doc.querySelector('#econtent [data-acao="whatsapp:conectar"]'))
  await esperar(90)
  assert.ok(chamadas.some((c) => c.canal === 'whatsapp-conectar'))
  assert.ok(/QR do WhatsApp/.test(conteudo()), 'o QR entra na tela')
})

test('Configurações › Impressora mostra a impressora DESTE computador', async () => {
  // Não vem do painel: a impressora é local. Antes a aba caía em "ainda não veio".
  await abrirApp()
  await irPara('/admin/configuracoes')
  clicar(doc.querySelector('[data-aba-cfg="impressora"]'))
  await esperar(60)
  assert.ok(/Neste computador/.test(conteudo()), 'a aba precisa da seção local: ' + conteudo().slice(0, 200))
  assert.ok(/POS-80/.test(conteudo()), 'a impressora escolhida aparece')
  assert.ok(!/ainda não veio para o app/.test(conteudo()), 'não pode mais mandar para o painel')
})

test('⌘K abre a busca, digitar filtra e Enter abre a tela', async () => {
  await abrirApp()
  const atalho = new win.KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true })
  doc.dispatchEvent(atalho)
  await esperar(40)
  const campo = doc.getElementById('buscaGlobal')
  assert.ok(campo, 'a busca precisa abrir com ⌘K')

  campo.value = 'entregador'
  campo.dispatchEvent(new win.Event('input', { bubbles: true }))
  await esperar(40)
  assert.ok(/Entregadores/.test(doc.getElementById('buscaLista').innerHTML))

  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  await esperar(80)
  assert.ok(!doc.getElementById('buscaGlobal'), 'a busca fecha ao escolher')
  assert.ok(chamadas.some((c) => c.canal === 'entregadores-carregar'), 'e a tela escolhida carrega')
})

test('Esc fecha a busca sem levar a lugar nenhum', async () => {
  await abrirApp()
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }))
  await esperar(40)
  assert.ok(doc.getElementById('buscaGlobal'))
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
  await esperar(40)
  assert.ok(!doc.getElementById('eloFicha'), 'fechou')
})

test('a busca acha AÇÃO e executa: sangria abre a janela do caixa', async () => {
  await abrirApp()
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true }))
  await esperar(40)
  const campo = doc.getElementById('buscaGlobal')
  campo.value = 'sangria'
  campo.dispatchEvent(new win.Event('input', { bubbles: true }))
  await esperar(40)
  clicar(doc.querySelector('[data-busca-idx="0"]'))
  await esperar(400)
  assert.ok(chamadas.some((c) => c.canal === 'caixa-carregar'), 'foi para o Caixa')
  assert.ok(doc.querySelector('#eloFicha [data-campo="valor"]'), 'e a janela da sangria abriu sozinha')
})

test('o sino mostra o que está esperando e leva à tela', async () => {
  await abrirApp()
  const bolinha = doc.getElementById('sinoContador')
  assert.strictEqual(bolinha.textContent, '7', 'a demonstração tem 5 pedidos + 2 carrinhos')
  assert.strictEqual(bolinha.style.display, 'block')
  clicar(doc.getElementById('btnSino'))
  await esperar(40)
  assert.ok(/pedidos esperando resposta/.test(doc.getElementById('eloFicha').innerHTML))
  clicar(doc.querySelector('[data-aviso="/admin/pedidos"]'))
  await esperar(80)
  assert.ok(chamadas.some((c) => c.canal === 'pedidos-carregar'), 'o aviso leva à Gestão de pedido')
})

test('a conversa reconhece o cliente e leva à ficha dele', async () => {
  await abrirApp()
  await irPara('/admin/whatsapp')
  // o telefone da conversa chega com DDI; o cadastro tem máscara — e mesmo assim casa
  assert.ok(/Maria Silva/.test(conteudo()), 'o nome do cadastro aparece no lugar do número')
  assert.ok(/>cliente</.test(conteudo()), 'e o selo de cliente conhecido')
  const bt = doc.querySelector('#econtent [data-acao^="conversa:cliente:"]')
  assert.ok(bt, 'com atalho para a ficha')
  clicar(bt)
  await esperar(420)
  assert.ok(chamadas.some((c) => c.canal === 'clientes-carregar'), 'foi para Clientes')
  assert.ok(doc.getElementById('eloFicha'), 'e a ficha do cliente abriu')
})

test('número que não é de cliente nenhum não ganha vínculo na tela', async () => {
  await abrirApp()
  await irPara('/admin/whatsapp')
  clicar(doc.querySelector('[data-conversa="c4"]'))
  await esperar(60)
  const painel = conteudo().split('data-conversa="c4"')[1] || ''
  assert.ok(!/data-acao="conversa:cliente:/.test(conteudo().split('Enviar')[0].split('c4')[1] || ''),
    'sem cadastro, sem atalho de ficha')
})

test('o pedido em andamento aparece ao lado da conversa', async () => {
  await abrirApp()
  await irPara('/admin/whatsapp')
  // Maria Silva tem o #1042 em produção
  assert.ok(/Pedido #1042/.test(conteudo()), 'o pedido ativo entra na coluna da direita')
  assert.ok(/Em produção/.test(conteudo()), 'com a etapa em que está')
  assert.ok(/Abrir o pedido/.test(conteudo()))

  // Carla não tem pedido andando: a coluna some
  clicar(doc.querySelector('[data-conversa="c3"]'))
  await esperar(60)
  assert.ok(!/Abrir o pedido/.test(conteudo()), 'sem pedido ativo, sem coluna')
})

test('o pedido abre em popup SOBRE a conversa, sem sair da tela', async () => {
  await abrirApp()
  await irPara('/admin/whatsapp')
  clicar(doc.querySelector('#econtent [data-acao="conversa:pedido:1042"]'))
  await esperar(60)
  const ficha = doc.getElementById('eloFicha')
  assert.ok(ficha, 'o popup abre')
  assert.ok(/Pizza Calabresa G/.test(ficha.innerHTML), 'com os itens do pedido')
  assert.ok(/align-items:center;justify-content:center/.test(ficha.outerHTML), 'centralizado')
  // e a conversa continua atrás
  assert.ok(/Maria Silva/.test(conteudo()), 'a conversa não foi embora')
  assert.ok(!chamadas.some((c) => c.canal === 'pedidos-carregar'), 'não trocou de tela')
})

test('editar o pedido pela conversa: corrige o endereço e avisa da taxa', async () => {
  await abrirApp()
  await irPara('/admin/whatsapp')
  clicar(doc.querySelector('#econtent [data-acao="conversa:pedido:1042"]'))
  await esperar(60)
  clicar(doc.querySelector('#eloFicha [data-acao="pedido-conversa:editar"]'))
  await esperar(60)
  const bairro = doc.querySelector('#eloFicha [data-campo-pedido="bairro"]')
  assert.ok(bairro, 'o formulário traz o endereço em campos')
  assert.strictEqual(bairro.value, 'Centro', 'já preenchido com o que está lá')
  bairro.value = 'Praia de Guaibim'
  clicar(doc.querySelector('#eloFicha [data-acao^="pedido-conversa:salvar"]'))
  await esperar(90)
  assert.ok(chamadas.some((c) => c.canal === 'pedido-corrigir'), 'a correção sai')
  assert.ok(/taxa de entrega foi recalculada/.test(aviso().textContent), aviso().textContent)
  assert.ok(!doc.getElementById('eloFicha'), 'e o popup fecha')
})

test('correção inválida é recusada na hora, sem fechar o popup', async () => {
  await abrirApp()
  await irPara('/admin/whatsapp')
  clicar(doc.querySelector('#econtent [data-acao="conversa:pedido:1042"]'))
  await esperar(60)
  clicar(doc.querySelector('#eloFicha [data-acao="pedido-conversa:editar"]'))
  await esperar(60)
  doc.querySelector('#eloFicha [data-campo-pedido="cidade"]').value = ''
  clicar(doc.querySelector('#eloFicha [data-acao^="pedido-conversa:salvar"]'))
  await esperar(80)
  assert.ok(/Falta preencher: cidade/.test(aviso().textContent), aviso().textContent)
  assert.ok(doc.getElementById('eloFicha'), 'o popup fica aberto para corrigir')
})

test('teclado de tela: 123 digita no telefone, ABC digita no nome', async () => {
  await abrirApp()
  await irParaVenda()
  const teclar = (v) => clicar(doc.querySelector('#eloFicha [data-tecla="' + v + '"]'))

  // numérico é o padrão: telefone
  teclar('7'); await esperar(30)
  teclar('5'); await esperar(30)
  assert.strictEqual(doc.querySelector('[data-venda-campo="telefone"]').value, '75')

  // ABC passa a digitar no nome
  clicar(doc.querySelector('#eloFicha [data-modo-teclado="texto"]'))
  await esperar(40)
  assert.ok(/digitando nome/.test(vendaNaTela()), 'a tela diz para onde vai')
  teclar('A'); await esperar(30)
  teclar('N'); await esperar(30)
  assert.strictEqual(doc.querySelector('[data-venda-campo="nome"]').value, 'AN')
  assert.strictEqual(doc.querySelector('[data-venda-campo="telefone"]').value, '75', 'o telefone nao foi tocado')

  // apagar tira do campo do modo atual
  clicar(doc.querySelector('#eloFicha [data-tecla="' + String.fromCharCode(8) + '"]'))
  await esperar(40)
  assert.strictEqual(doc.querySelector('[data-venda-campo="nome"]').value, 'A')
})

test('KDS: iniciar o preparo move o item na fila, sem sair da tela', async () => {
  await abrirApp()
  await irPara('/admin/cozinha')
  const bt = doc.querySelector('#econtent [data-acao^="kds:iniciar:"]')
  assert.ok(bt, 'o item na fila tem o botão de iniciar')
  clicar(bt)
  await esperar(90)
  assert.ok(chamadas.some((c) => c.canal === 'kds-avancar'), 'o clique move o item')
  assert.ok(/Preparo iniciado/.test(aviso().textContent), aviso().textContent)
  assert.ok(chamadas.some((c) => c.canal === 'cozinha-carregar'), 'e a fila se redesenha')
})

test('KDS: marcar o pedido inteiro pronto marca só o que falta', async () => {
  await abrirApp()
  await irPara('/admin/cozinha')
  const bt = doc.querySelector('#econtent [data-acao^="kds:pedido-pronto:"]')
  assert.ok(bt, 'o cartão tem o botão do pedido inteiro')
  clicar(bt)
  await esperar(90)
  const chamada = chamadas.find((c) => c.canal === 'kds-pedido-pronto')
  assert.ok(chamada, 'o clique marca o pedido')
  assert.ok(/marcad/.test(aviso().textContent), aviso().textContent)
})

test('Despacho: sem entregador escolhido, o app recusa dizendo qual pedido', async () => {
  await abrirApp()
  await irPara('/admin/despacho')
  const bt = doc.querySelector('#econtent [data-acao^="despachar:"]')
  assert.ok(bt, 'cada linha tem o botão de despachar')
  clicar(bt)
  await esperar(90)
  assert.ok(/Escolha o entregador de #/.test(aviso().textContent), aviso().textContent)
  assert.ok(doc.querySelector('#econtent [data-acao^="despachar:"]'), 'o pedido continua na fila — nada saiu')
})

test('Despacho: escolher o entregador e despachar tira o pedido da fila', async () => {
  await abrirApp()
  await irPara('/admin/despacho')
  const sel = doc.querySelector('#econtent [data-entregador-de="7"]')
  assert.ok(sel, 'a linha do #7 tem o seletor')
  sel.value = 'Tiago Moura'
  sel.dispatchEvent(new win.Event('change', { bubbles: true }))
  await esperar(40)
  clicar(doc.querySelector('#econtent [data-acao="despachar:7"]'))
  await esperar(120)
  const ch = chamadas.find((c) => c.canal === 'despacho-despachar')
  assert.ok(ch, 'o clique despacha')
  assert.strictEqual(ch.args.pedidos[0].pedido, '7')
  assert.ok(/Saiu: 1 pedido com Tiago Moura/.test(aviso().textContent), aviso().textContent)
  assert.ok(!doc.querySelector('#econtent [data-acao="despachar:7"]'), 'o #7 saiu da fila de prontos')
})

/** Abre a primeira categoria do cardápio (os itens ficam dentro dela). */
async function abrirPrimeiraCategoria() {
  await irPara('/admin/cardapio')
  clicar(doc.querySelector('#econtent [data-categoria]'))
  await esperar(60)
}

test('Cardápio: esgotar um item muda o cardápio na hora', async () => {
  await abrirApp()
  await abrirPrimeiraCategoria()
  const bt = doc.querySelector('#econtent [data-acao^="esgotar-item:"]')
  assert.ok(bt, 'o item tem a chave de esgotar')
  const nome = bt.getAttribute('data-acao').slice('esgotar-item:'.length)
  clicar(bt)
  await esperar(100)
  const ch = chamadas.find((c) => c.canal === 'cardapio-esgotar-item')
  assert.ok(ch && ch.args.item.nome === nome, 'o clique esgota o item certo')
  assert.ok(/marcado como esgotado/.test(aviso().textContent), aviso().textContent)
})

test('Cardápio: editar preço abre popup, salva e o aviso mostra de → para', async () => {
  await abrirApp()
  await abrirPrimeiraCategoria()
  const bt = doc.querySelector('#econtent [data-acao^="editar-preco:"]')
  assert.ok(bt, 'o item tem o botão de preço')
  clicar(bt)
  await esperar(60)
  const campo = doc.querySelector('#eloFicha [data-campo="preco"]')
  assert.ok(campo, 'o popup do preço abre')
  campo.value = '1.234,50'
  clicar(doc.querySelector('#eloFicha [data-acao^="cardapio:preco:confirmar:"]'))
  await esperar(100)
  const ch = chamadas.find((c) => c.canal === 'cardapio-editar-preco')
  assert.ok(ch, 'o preço sai')
  assert.ok(/→ R\$ 1\.234,50/.test(aviso().textContent), aviso().textContent)
  assert.ok(!doc.getElementById('eloFicha'), 'o popup fecha')
})

test('Cardápio: preço igual ao atual é recusado sem fechar o popup', async () => {
  await abrirApp()
  await abrirPrimeiraCategoria()
  const bt = doc.querySelector('#econtent [data-acao^="editar-preco:"]')
  clicar(bt)
  await esperar(60)
  const item = ((doc.getElementById('eloFicha').innerHTML.match(/Preço atual: <b[^>]*>R\$ ([\d.,]+)/) || [])[1])
  doc.querySelector('#eloFicha [data-campo="preco"]').value = item
  clicar(doc.querySelector('#eloFicha [data-acao^="cardapio:preco:confirmar:"]'))
  await esperar(80)
  assert.ok(/não mudou/.test(aviso().textContent), aviso().textContent)
  assert.ok(doc.getElementById('eloFicha'), 'fica aberto para corrigir')
})

test('Cardápio: esgotar a categoria esgota os produtos dela', async () => {
  await abrirApp()
  await irPara('/admin/cardapio')
  const bt = doc.querySelector('#econtent [data-acao^="esgotar-categoria:"]')
  assert.ok(bt, 'a categoria tem a chave de esgotar tudo')
  clicar(bt)
  await esperar(100)
  const ch = chamadas.find((c) => c.canal === 'cardapio-esgotar-categoria')
  assert.ok(ch, 'o clique esgota a categoria')
  assert.ok(/produtos? de .* esgotad/.test(aviso().textContent), aviso().textContent)
})

test('Compras: anotar um item avulso entra na lista na hora', async () => {
  await abrirApp()
  await irPara('/admin/compras')
  doc.querySelector('#econtent [data-compra-avulsa="nome"]').value = 'Papel toalha'
  doc.querySelector('#econtent [data-compra-avulsa="qtd"]').value = '3'
  clicar(doc.querySelector('#econtent [data-acao="compras:adicionar-avulso"]'))
  await esperar(100)
  assert.ok(chamadas.some((c) => c.canal === 'compras-anotar'), 'o clique anota')
  assert.ok(/Papel toalha anotado/.test(aviso().textContent), aviso().textContent)
  assert.ok(/Papel toalha/.test(conteudo()), 'e o item aparece na lista')
})

test('Compras: marcar comprado tira o item da lista de avulsos', async () => {
  await abrirApp()
  await irPara('/admin/compras')
  const bt = doc.querySelector('#econtent [data-acao^="compras:comprado:"]')
  assert.ok(bt, 'o avulso tem o botão Comprado')
  const nome = bt.getAttribute('data-acao').slice('compras:comprado:'.length)
  clicar(bt)
  await esperar(100)
  assert.ok(/marcado como comprado/.test(aviso().textContent), aviso().textContent)
  assert.ok(!doc.querySelector('#econtent [data-acao="compras:comprado:' + nome + '"]'), 'saiu dos avulsos')
  assert.ok(doc.querySelector('#econtent [data-acao="compras:voltar-lista:' + nome + '"]'), 'e foi para os comprados')
})

test('Compras: "Recebi" abre o popup com a sugestão e dá entrada no estoque', async () => {
  await abrirApp()
  await irPara('/admin/compras')
  const bt = doc.querySelector('#econtent [data-acao^="compras:recebi:"]')
  assert.ok(bt, 'o item de reposição tem o botão Recebi')
  clicar(bt)
  await esperar(60)
  const qtd = doc.querySelector('#eloFicha [data-campo="qtd"]')
  assert.ok(qtd && Number(qtd.value) > 0, 'o popup abre com a quantidade sugerida: ' + (qtd && qtd.value))
  clicar(doc.querySelector('#eloFicha [data-acao^="compras:recebi:confirmar:"]'))
  await esperar(100)
  const ch = chamadas.find((c) => c.canal === 'compras-recebi')
  assert.ok(ch && ch.args.item.id, 'a entrada sai com o id do ingrediente')
  assert.ok(/Entrou \d+/.test(aviso().textContent), aviso().textContent)
  assert.ok(!doc.getElementById('eloFicha'), 'o popup fecha')
})

test('venda manual: digitar o telefone nao mexe a tela — a busca so vem depois de parar', async () => {
  await abrirApp()
  await irParaVenda()
  const quadro = doc.querySelector('#eloFicha > div:nth-child(2)')
  assert.ok(/height:88vh/.test(quadro.getAttribute('style')), 'o quadro da venda tem altura fixa')
  const tel = doc.querySelector('[data-venda-campo="telefone"]')
  const antes = vendaNaTela()
  tel.value = '7'
  tel.dispatchEvent(new win.Event('input', { bubbles: true }))
  await esperar(120)
  assert.strictEqual(vendaNaTela(), antes, 'uma tecla nao redesenha nada')
  assert.ok(!/Clientes que batem/.test(vendaNaTela()), 'e nao busca com um digito')

  tel.value = '(75) 98811-0001'
  tel.dispatchEvent(new win.Event('input', { bubbles: true }))
  await esperar(120)
  assert.ok(!/Clientes que batem/.test(vendaNaTela()), 'ainda digitando: nada aparece')
  await esperar(500)
  assert.ok(/Clientes que batem/.test(vendaNaTela()), 'parou de digitar: a busca roda')
  assert.ok(/Maria Silva/.test(vendaNaTela()), 'e acha o cliente')
})
