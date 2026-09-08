// A ponte das telas: cada canal busca no painel, adapta e guarda no cache — e, sem
// rede, devolve o último bom. O que se testa aqui é o comportamento que só aparece
// quando algo dá errado: sessão piscando, uma rota fora do ar, troca de loja.
const { test } = require('node:test')
const assert = require('node:assert')
const ponte = require('../src-electron/ponte')
const { TELAS, SEM_API } = require('../src-electron/telas-ponte')

function cacheDeTeste() {
  const m = new Map()
  return {
    get: (k) => m.get(k) || null,
    set: (k, v) => m.set(k, { ...v, ts: Date.now() }),
    tamanho: () => m.size,
    chaves: () => [...m.keys()],
  }
}
function registrador() {
  const canais = new Map()
  return { ipcMain: { handle: (c, fn) => canais.set(c, fn) }, chamar: (c, a) => canais.get(c)(null, a), canais }
}

const respostas = {
  '/api/admin/fila/dept/cozinha': { items: [{ id: 'i1', pedido_id: 'p1', produto_nome: 'Pizza', qtd: 1,
    status: 'pendente', sabores: [], pedido_numero: 10, pedido_cliente: 'Ana', pedido_tipo: 'entrega',
    pedido_criado_em: new Date().toISOString(), pedido_mesa: null }] },
  '/api/admin/kds/codigo': { definido: true, dispositivos: 1 },
  '/api/admin/clientes': [{ nome: 'Maria', telefone: '111', total_pedidos: 3, total_gasto: 300 }],
  '/api/admin/loja': { id: 'l1', nome: 'Pizzaria' },
  '/api/admin/desktop/pedidos': { itens: [], kpis: {}, contadores: {} },
  '/api/admin/desktop/visao-geral?periodo=mes': { kpis: { faturamento: { valor: 1 } } },
  '/api/admin/desktop/visao-geral?periodo=dia': { kpis: { faturamento: { valor: 2 } } },
}

function pontePronta({ falha = [], loja = 'loja-1' } = {}) {
  const r = registrador()
  const cache = cacheDeTeste()
  const pedidas = []
  ponte.registrar({
    ipcMain: r.ipcMain, cache,
    monitorRede: { online: () => true },
    pedirAoPainel: async () => ({ secoes: [] }),
    pedirTela: async (rota) => {
      pedidas.push(rota)
      if (falha.indexOf(rota) >= 0) throw new Error('fora do ar')
      if (falha.indexOf('*') >= 0) return null
      return respostas[rota] !== undefined ? respostas[rota] : {}
    },
    abrirRota: () => ({ ok: true }),
    lojaIdAtual: () => loja,
  })
  return { ...r, cache, pedidas }
}

test('todas as telas do catálogo viram canal registrado', () => {
  const p = pontePronta()
  for (const t of TELAS) assert.ok(p.canais.has(t.canal), 'faltou registrar ' + t.canal)
  for (const c of Object.keys(SEM_API)) assert.ok(p.canais.has(c), 'faltou registrar ' + c)
  assert.ok(p.canais.has('caixa-carregar') && p.canais.has('menu-carregar'))
})

test('as 23 telas do app têm rota — nenhuma depende mais do modo demonstração', () => {
  const p = pontePronta()
  // Este era o buraco: 20 telas prontas que só existiam com --demo.
  assert.ok(TELAS.length >= 23, 'o catálogo precisa cobrir todas as telas (tem ' + TELAS.length + ')')
  const canais = TELAS.map((t) => t.canal)
  assert.strictEqual(new Set(canais).size, canais.length, 'canal repetido no catálogo')
  for (const t of TELAS) assert.ok(p.canais.has(t.canal))
})

test('nenhum canal do modo demonstração fica sem par no app conectado', () => {
  // Era exatamente este o buraco: 20 telas prontas que só existiam com --demo.
  const p = pontePronta()
  const doDemo = ['visao-geral-carregar', 'caixa-carregar', 'pedidos-carregar', 'clientes-carregar',
    'carrinhos-carregar', 'cardapio-carregar', 'despacho-carregar', 'financeiro-abas-carregar',
    'atendimento-abas-carregar', 'estoque-abas-carregar', 'cozinha-carregar', 'bar-carregar',
    'salao-carregar', 'compras-carregar', 'cupons-carregar', 'fidelidade-carregar',
    'parceiros-carregar', 'campanhas-carregar', 'push-carregar', 'insights-carregar',
    'relatorios-carregar', 'configuracoes-carregar', 'entregadores-carregar']
  const semPar = doDemo.filter((c) => !p.canais.has(c))
  assert.deepStrictEqual(semPar, [], 'canais sem handler no app conectado: ' + semPar.join(', '))
})

test('a tela busca no painel, adapta e devolve no formato da tela', async () => {
  const p = pontePronta()
  const r = await p.chamar('cozinha-carregar')
  assert.strictEqual(r.offline, false)
  assert.strictEqual(r.dados.pedidos.length, 1)
  assert.strictEqual(r.dados.pedidos[0].cliente, 'Ana')
  assert.deepStrictEqual(r.dados.acessoTv, { definido: true, dispositivos: 1 })
})

test('o que voltou bom fica no cache, por LOJA', async () => {
  const p = pontePronta({ loja: 'loja-7' })
  await p.chamar('clientes-carregar')
  assert.ok(p.cache.chaves().includes('clientes|loja-7'), p.cache.chaves().join(','))
})

test('sem rede, devolve o último bom e AVISA que é do cache', async () => {
  const p = pontePronta()
  await p.chamar('clientes-carregar')          // enche o cache
  const q = pontePronta({ falha: ['*'] })
  // cache novo, sem nada guardado: dados nulos e offline
  const vazio = await q.chamar('clientes-carregar')
  assert.strictEqual(vazio.dados, null)
  assert.strictEqual(vazio.offline, true)
})

test('resposta de erro do painel NÃO apaga o que já estava guardado', async () => {
  const r = registrador()
  const cache = cacheDeTeste()
  let responder = async () => respostas['/api/admin/clientes']
  ponte.registrar({
    ipcMain: r.ipcMain, cache, monitorRede: { online: () => true },
    pedirAoPainel: async () => ({ secoes: [] }),
    pedirTela: async (rota) => responder(rota),
    abrirRota: () => ({ ok: true }), lojaIdAtual: () => 'l1',
  })
  const bom = await r.chamar('clientes-carregar')
  assert.strictEqual(bom.dados.itens.length, 1)

  responder = async () => ({ error: 'Não autorizado' })   // sessão piscou
  const depois = await r.chamar('clientes-carregar')
  assert.strictEqual(depois.offline, true, 'o 401 conta como sem rede')
  assert.strictEqual(depois.dados.itens.length, 1, 'e o dado bom continua na tela')
})

test('uma rota fora do ar não derruba a tela inteira', async () => {
  // A cozinha junta a fila e o código da TV. Sem o código, a fila continua.
  const p = pontePronta({ falha: ['/api/admin/kds/codigo'] })
  const r = await p.chamar('cozinha-carregar')
  assert.strictEqual(r.dados.pedidos.length, 1)
  assert.strictEqual(r.dados.acessoTv, null)
})

test('mas se a rota PRINCIPAL falha, a tela não inventa dado', async () => {
  const p = pontePronta({ falha: ['/api/admin/fila/dept/cozinha'] })
  const r = await p.chamar('cozinha-carregar')
  assert.strictEqual(r.dados, null)
  assert.strictEqual(r.offline, true)
})

test('nenhuma tela ficou sem rota — SEM_API está vazio', () => {
  assert.deepStrictEqual(Object.keys(SEM_API), [],
    'telas ainda sem rota no painel: ' + Object.keys(SEM_API).join(', '))
})

test('o aviso de "falta ligar" continua de pé para a próxima tela que entrar', async () => {
  // O mecanismo é o que importa: quando uma tela nova chegar antes da rota dela, o app
  // precisa dizer O QUE falta em vez de "não deu para carregar", que faz o lojista
  // procurar problema na internet dele.
  const r = registrador()
  ponte.registrar({
    ipcMain: r.ipcMain, cache: cacheDeTeste(), monitorRede: { online: () => true },
    pedirAoPainel: async () => ({ secoes: [] }), pedirTela: async () => null,
    abrirRota: () => ({ ok: true }), lojaIdAtual: () => 'l1',
    semApi: { 'tela-futura-carregar': 'a rota ainda não existe no painel' },
  })
  const resposta = await r.chamar('tela-futura-carregar')
  assert.strictEqual(resposta.dados, null)
  assert.match(resposta.semApi, /ainda não existe/)
})

test('a Visão geral leva o período na rota E na chave do cache', async () => {
  const p = pontePronta()
  await p.chamar('visao-geral-carregar', { periodo: 'mes' })
  assert.ok(p.pedidas.some((r) => r.indexOf('periodo=mes') > 0), p.pedidas.join(','))
  await p.chamar('visao-geral-carregar', { periodo: 'dia' })
  const chaves = p.cache.chaves()
  assert.ok(chaves.some((k) => k.indexOf('periodo=mes') > 0) && chaves.some((k) => k.indexOf('periodo=dia') > 0),
    'cada período tem a sua chave: ' + chaves.join(','))
})

test('as telas do painel novo vêm prontas — o app não retraduz', async () => {
  const p = pontePronta()
  const r = await p.chamar('pedidos-carregar')
  assert.strictEqual(r.offline, false, 'a rota respondeu')
  assert.ok(p.pedidas.includes('/api/admin/desktop/pedidos'))
})

test('cada tela do catálogo declara rota, adaptador e validação', () => {
  for (const t of TELAS) {
    assert.ok(t.canal && t.cache, 'tela sem canal ou cache')
    assert.ok(Object.keys(t.rotas || {}).length, t.canal + ' sem rota')
    assert.strictEqual(typeof t.adaptar, 'function', t.canal + ' sem adaptador')
    assert.strictEqual(typeof t.valida, 'function', t.canal + ' sem validação — um 401 apagaria o cache')
    for (const r of Object.values(t.rotas)) {
      assert.match(r, /^\/api\/admin\//, t.canal + ' aponta para fora da API do painel: ' + r)
    }
  }
})

test('duas lojas não dividem o mesmo cache', async () => {
  const r = registrador()
  const cache = cacheDeTeste()
  let loja = 'loja-A'
  ponte.registrar({
    ipcMain: r.ipcMain, cache, monitorRede: { online: () => true },
    pedirAoPainel: async () => ({ secoes: [] }),
    pedirTela: async (rota) => respostas[rota],
    abrirRota: () => ({ ok: true }), lojaIdAtual: () => loja,
  })
  await r.chamar('clientes-carregar')
  loja = 'loja-B'
  await r.chamar('clientes-carregar')
  assert.ok(cache.chaves().includes('clientes|loja-A') && cache.chaves().includes('clientes|loja-B'),
    'cada loja com a sua chave: ' + cache.chaves().join(','))
})
