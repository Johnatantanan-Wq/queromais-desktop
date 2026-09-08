// As abas do topo são o mesmo botão em toda tela. Este teste existe porque elas
// nasceram com estilo inline repetido em 12 arquivos e foram divergindo — uma com
// 30px de altura, outra com 34, uma marcando a ativa em cheio e outra em suave.
const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')

const demo = require('../src-electron/demo-dados')
const estado = { online: true, ts: Date.now() }
const listas = demo.listas(), abas = demo.telasComAbas(), apoio = demo.listasApoio(), finais = demo.apoioFinal()

const TELAS = {
  'pedidos (filtros)': () => require('../renderer/elo/telas-catalogo').htmlDaRota('/admin/pedidos', listas.pedidos, { modo: 'quadro' }),
  'financeiro': () => require('../renderer/elo/telas-abas').htmlComAbas('/admin/financeiro', abas.financeiro, { ...estado, aba: 'extrato' }),
  'atendimento': () => require('../renderer/elo/telas-abas').htmlComAbas('/admin/atendimento', abas.atendimento, { ...estado, aba: 'salao' }),
  'gestão': () => require('../renderer/elo/telas-abas').htmlComAbas('/admin/estoque', abas.estoque, { ...estado, aba: 'movimentacoes' }),
  'configurações': () => require('../renderer/elo/telas-finais').htmlConfiguracoes(finais.configuracoes, { ...estado, abaCfg: 'geral', subCfg: 'config' }),
  'relatórios': () => require('../renderer/elo/telas-finais').htmlRelatorios(finais.relatorios, estado),
  'clientes': () => require('../renderer/elo/telas-principais').htmlClientes(listas.clientes, estado),
  'fidelidade': () => require('../renderer/elo/telas-marketing').htmlFidelidade(apoio.fidelidade, estado),
  'caixa': () => require('../renderer/elo/tela-caixa').htmlDoCaixa(demo.caixa(), { ...estado, aba: 'atual' }),
  'visão geral': () => require('../renderer/elo/tela-visao-geral').htmlVisaoGeral(demo.visaoGeral('semana'), { ...estado, metrica: 'faturamento' }),
}

test('toda tela com abas usa a MESMA aba branca', () => {
  const semAba = Object.keys(TELAS).filter((t) => !TELAS[t]().includes('class="eaba'))
  assert.deepStrictEqual(semAba, [], 'telas com barra própria: ' + semAba.join(', '))
})

test('nenhuma barra de aba ficou com o chip cinza antigo', () => {
  const sujas = []
  for (const nome of Object.keys(TELAS)) {
    const h = TELAS[nome]()
    // o cinza pode continuar em etiqueta e selo; o que não pode é em BOTÃO de aba
    for (const m of h.matchAll(/<button[^>]*background:#eef0f3[^>]*>/g)) sujas.push(nome + ': ' + m[0].slice(0, 90))
  }
  assert.deepStrictEqual(sujas, [], sujas.join(' | '))
})

test('a aba escolhida é marcada de um jeito só, em toda tela', () => {
  for (const nome of Object.keys(TELAS)) {
    const h = TELAS[nome]()
    if (!h.includes('class="eaba')) continue
    // nada de marcar por estilo inline: quem marca é a classe
    assert.ok(!/class="eaba[^"]*"[^>]*style="[^"]*background:var\(--acento\)/.test(h),
      nome + ' ainda marca a aba ativa por estilo inline')
  }
})

test('o CSS define o branco, o movimento e o estado escolhido', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'elo', 'elo.css'), 'utf8')
  assert.ok(/\.eaba\s*\{[^}]*background:\s*#fff/.test(css), 'aba branca')
  assert.ok(/\.eaba:hover\s*\{[^}]*transform:\s*translateY\(-1px\)/.test(css), 'leve movimento no hover')
  assert.ok(/\.eaba\.is-on\s*\{[^}]*var\(--acento-suave\)/.test(css), 'a escolhida usa o acento da marca')
  assert.ok(/prefers-reduced-motion[\s\S]*\.eaba/.test(css), 'quem prefere menos movimento não recebe nenhum')
})
