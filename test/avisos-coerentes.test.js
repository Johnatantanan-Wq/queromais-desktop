// Os recados de "ainda é pelo painel" envelhecem: a ação passa a ser feita pelo app e o
// aviso continua na tela, dizendo o contrário do que acontece. Foi o que aconteceu em
// 08/09 — o quadro já aceitava pedidos e o rodapé ainda mandava aceitar pelo painel.
const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')

const demo = require('../src-electron/demo-dados')
const shell = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'shell.js'), 'utf8')

/** As ações que o shell trata ele mesmo — as que o app FAZ. */
function acoesQueOAppFaz() {
  const t = new Set()
  for (const m of shell.matchAll(/acao === '([^']+)'/g)) t.add(m[1])
  for (const m of shell.matchAll(/acao\.indexOf\('([^']+)'\) === 0/g)) t.add(m[1])
  return t
}

// palavra do aviso → ação que, se o app já fizer, torna o aviso mentira
const PROMESSAS = [
  { palavra: 'aceitar', acao: 'avancar:' },
  { palavra: 'despachar', acao: 'despachar:' },
  { palavra: 'sangria', acao: 'caixa:sangria' },
  { palavra: 'fechamento', acao: 'caixa:fechar' },
  { palavra: 'Abrir e fechar o caixa', acao: 'caixa:abrir' },
  { palavra: 'marcar item como pronto', acao: 'kds:pronto:' },
  { palavra: 'esgotar', acao: 'esgotar-item:' },
  { palavra: 'editar', acao: 'editar-preco:' },
  { palavra: 'receber compra', acao: 'compras:recebi:' },
  { palavra: 'anotar item', acao: 'compras:adicionar-avulso' },
  { palavra: 'liquidar conta', acao: 'conta:liquidar:' },
  { palavra: 'registrar recebimento', acao: 'conta:receber:' },
  { palavra: 'fechar conta de mesa', acao: 'mesa:fechar:' },
  { palavra: 'confirmar o recebimento', acao: 'entrega:confirmar:' },
]

const TELAS = {
  'contas a pagar': () => require('../renderer/elo/telas-abas').htmlComAbas('/admin/financeiro', demo.telasComAbas().financeiro, { aba: 'pagar', mesConta: '2026-09' }),
  compras: () => require('../renderer/elo/tela-compras').htmlCompras(demo.listasApoio().compras, {}),
  cardapio: () => require('../renderer/elo/tela-cardapio').htmlCardapio(demo.listas().cardapio, { online: true, ts: Date.now() }),
  despacho: () => require('../renderer/elo/tela-despacho').htmlDespacho(demo.listas().despacho, { visao: 'bairro' }),
  cozinha: () => require('../renderer/elo/tela-operacao').htmlKds(demo.operacao().cozinha, { departamento: 'cozinha' }),
  quadro: () => require('../renderer/elo/telas-catalogo').htmlDaRota('/admin/pedidos', demo.listas().pedidos, { modo: 'quadro' }),
  caixa: () => require('../renderer/elo/tela-caixa').htmlDoCaixa(demo.caixa(), { online: true, ts: Date.now() }),
  'caixa delivery': () => require('../renderer/elo/tela-caixa').htmlDoCaixa(demo.caixa(), { online: true, ts: Date.now(), aba: 'atual', subaba: 'delivery' }),
  'caixa fechado': () => require('../renderer/elo/tela-caixa').htmlDoCaixa({ ...demo.caixa(), aberto: null }, { online: true, ts: Date.now() }),
}

test('nenhuma tela manda ao painel uma ação que o app já faz', () => {
  const faz = acoesQueOAppFaz()
  const mentiras = []
  for (const nome of Object.keys(TELAS)) {
    const html = TELAS[nome]()
    for (const p of PROMESSAS) {
      if (!faz.has(p.acao)) continue          // o app ainda não faz: o aviso é verdade
      const trecho = new RegExp('[^<>]*' + p.palavra + '[^<>]*pelo painel', 'i')
      const achou = html.match(trecho)
      if (achou) mentiras.push(nome + ': "' + achou[0].trim() + '" — mas o app faz (' + p.acao + ')')
    }
  }
  assert.deepStrictEqual(mentiras, [], mentiras.join(' | '))
})

test('o quadro diz o que REALMENTE falta: imprimir e escolher o entregador', () => {
  const h = TELAS.quadro()
  assert.ok(/imprimir e escolher o entregador ainda são pelo painel/.test(h), 'o rodapé precisa dizer o que sobra')
})
