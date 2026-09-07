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

// ── ponte falsa: os mesmos canais que o main registra no modo demonstração ──
const chamadas = []
function responder(canal, args) {
  chamadas.push({ canal, args })
  const ok = (dados) => ({ dados, offline: false, ts: Date.now(), demo: true })
  if (canal === 'menu-carregar') return ok(demo.menu())
  if (canal === 'app-info') return { demo: true, versao: 'teste' }
  if (canal === 'rede-status') return { online: true, demo: true }
  if (canal === 'visao-geral-carregar') return ok(demo.visaoGeral((args && args.periodo) || 'semana'))
  if (canal === 'caixa-carregar') return ok(demo.caixa())
  if (canal === 'cozinha-carregar') return ok(demo.operacao().cozinha)
  if (canal === 'bar-carregar') return ok(demo.operacao().bar)
  if (canal === 'salao-carregar') return ok(demo.operacao().salao)
  if (canal === 'compras-carregar') return ok(demo.listasApoio().compras)
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
  if (canal === 'pedidos-carregar') return ok(demo.listas().pedidos)
  if (canal === 'clientes-carregar') return ok(demo.listas().clientes)
  if (canal === 'carrinhos-carregar') return ok(demo.listas().carrinhos)
  if (canal === 'cardapio-carregar') return ok(demo.listas().cardapio)
  if (canal === 'despacho-carregar') return ok(demo.listas().despacho)
  if (canal === 'entregadores-carregar') return ok(demo.listas().entregadores)
  if (canal === 'impressao-info') {
    return ok({ impressoras: [{ name: 'POS-80', displayName: 'POS-80', isDefault: true }],
      impressoraAtual: 'POS-80', loja: demo.menu().loja, exemplo: demo.listas().pedidos.itens[0],
      automatica: true, vias: 1, caminho: 'x' })
  }
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
          on: () => {},
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

beforeEach(async () => { chamadas.length = 0 })

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

test('botão de escrita responde: avisa e tenta abrir o painel', async () => {
  await abrirApp()
  await irPara('/admin/caixa')
  clicar($('[data-acao="caixa:sangria"]'))
  await esperar(30)
  assert.ok(aviso().className.includes('on'), 'a faixa precisa aparecer')
  assert.ok(/lançar sangria|painel/i.test(aviso().textContent), 'e dizer o que aconteceria: ' + aviso().textContent)
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
