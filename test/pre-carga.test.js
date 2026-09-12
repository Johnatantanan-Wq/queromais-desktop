// PRÉ-CARGA (F3.2): o que o app baixa DE PROPÓSITO para conseguir vender sem internet.
//
// O cache que a ponte mantém é oportunista — guarda o que o lojista abriu. Se ele não
// abriu o Cardápio hoje, não há cardápio guardado, e é exatamente ele que falta quando
// a rede cai.
const { test } = require('node:test')
const assert = require('node:assert')
const P = require('../src-electron/pre-carga')

const AGORA = Date.parse('2026-09-11T22:00:00Z')
const hAtras = (n) => AGORA - n * 3600 * 1000

test('as cinco coisas que a spec manda guardar estão aqui', () => {
  assert.deepStrictEqual(P.ITENS.map((i) => i.chave), ['cardapio', 'formas', 'bairros', 'caixa', 'clientes'])
  const porChave = Object.fromEntries(P.ITENS.map((i) => [i.chave, i.validadeMin]))
  assert.strictEqual(porChave.cardapio, 6 * 60)
  assert.strictEqual(porChave.formas, 12 * 60)
  assert.strictEqual(porChave.bairros, 12 * 60)
  assert.strictEqual(porChave.clientes, 24 * 60)
  assert.strictEqual(porChave.caixa, 0, 'o caixa muda a cada venda: revalida sempre')
})

test('revalida quando vence, e nunca antes', () => {
  const cardapio = P.ITENS[0]
  assert.strictEqual(P.precisaRevalidar(cardapio, hAtras(5), AGORA), false)
  assert.strictEqual(P.precisaRevalidar(cardapio, hAtras(7), AGORA), true)
  assert.strictEqual(P.precisaRevalidar(cardapio, 0, AGORA), true, 'o que nunca veio vem agora')
  const caixa = P.ITENS.find((i) => i.chave === 'caixa')
  assert.strictEqual(P.precisaRevalidar(caixa, AGORA - 1000, AGORA), true, 'validade 0 = sempre')
})

test('⛔ dado velho NÃO bloqueia a venda — ele é DITO', () => {
  // Bloquear a venda por cache velho pararia o balcão para proteger um preço, que é
  // exatamente o que o modo offline existe para evitar.
  const e = P.estado((k) => ({ cardapio: hAtras(20), formas: hAtras(1), bairros: hAtras(1),
    caixa: hAtras(0.1), clientes: hAtras(1) })[k], AGORA)
  assert.strictEqual(e.pronto, true, 'tudo que precisa existe — velho, mas existe')
  assert.strictEqual(e.velho.length, 1)
  assert.match(e.aviso, /cardápio há 20 h/)
  assert.match(e.aviso, /Dá para vender/)
})

test('o que nunca foi baixado aparece com todas as letras', () => {
  const e = P.estado((k) => (k === 'cardapio' ? 0 : hAtras(1)), AGORA)
  assert.strictEqual(e.pronto, false)
  assert.match(e.aviso, /falta cardápio/)
  assert.match(e.aviso, /nenhuma vez/, 'a frase precisa dizer que nunca veio')
})

test('duas coisas faltando saem numa frase de gente', () => {
  const e = P.estado((k) => (k === 'cardapio' || k === 'bairros' ? 0 : hAtras(1)), AGORA)
  assert.match(e.aviso, /falta cardápio e taxa por bairro/)
})

test('tudo em dia não vira aviso nenhum', () => {
  const e = P.estado(() => hAtras(0.5), AGORA)
  assert.strictEqual(e.pronto, true)
  assert.strictEqual(e.aviso, '')
})

test('o caixa não fica "velho" a cada rodada — isso viraria alarme constante', () => {
  const e = P.estado((k) => (k === 'caixa' ? hAtras(3) : hAtras(0.1)), AGORA)
  assert.strictEqual(e.velho.length, 0)
  assert.strictEqual(e.aviso, '')
})

test('a idade é dita como gente fala', () => {
  assert.strictEqual(P.idade(0), 'nunca')
  assert.strictEqual(P.idade(AGORA - 30 * 1000, AGORA), 'agora mesmo')
  assert.strictEqual(P.idade(AGORA - 25 * 60 * 1000, AGORA), 'há 25 min')
  assert.strictEqual(P.idade(hAtras(3), AGORA), 'há 3 h')
  assert.strictEqual(P.idade(hAtras(50), AGORA), 'há 2 dias')
})

// ── a rodada ────────────────────────────────────────────────────────────────
function cacheFalso(inicial) {
  const m = new Map(Object.entries(inicial || {}))
  return {
    get: (k) => m.get(k) || null,
    set: (k, v) => m.set(k, { ...v, ts: Date.now() }),
    meta: (k) => (m.get(k) ? { ts: m.get(k).ts } : null),
    tudo: () => m,
  }
}

test('a rodada busca só o que está na hora', async () => {
  const cache = cacheFalso({ 'p:cardapio': { body: { x: 1 }, ts: Date.now() } })
  const pedidas = []
  const r = await P.rodada({
    cache, chaveDe: (n) => 'p:' + n,
    pedirTela: async (rota) => { pedidas.push(rota); return { ok: true } },
  })
  assert.ok(!pedidas.some((x) => /desktop\/venda/.test(x)), 'o cardápio fresco não é buscado de novo')
  assert.ok(r.buscados.includes('formas') && r.buscados.includes('clientes'))
})

test('⚠️ resposta ruim NÃO apaga o que já estava guardado', () => {
  // Mesma regra da ponte: um 401 no meio do turno não pode esvaziar o cardápio que já
  // estava em disco — a tela ficaria vazia justo quando a sessão pisca.
  return P.rodada({
    cache: cacheFalso(), chaveDe: (n) => 'p:' + n,
    pedirTela: async () => ({ error: 'Não autorizado' }),
  }).then((r) => {
    assert.strictEqual(r.buscados.length, 0)
    assert.strictEqual(r.falhas.length, 5)
  })
})

test('uma rota que explode não derruba as outras', async () => {
  const r = await P.rodada({
    cache: cacheFalso(), chaveDe: (n) => 'p:' + n,
    pedirTela: async (rota) => { if (/clientes/.test(rota)) throw new Error('timeout'); return { ok: true } },
  })
  assert.strictEqual(r.falhas.length, 1)
  assert.strictEqual(r.buscados.length, 4)
})
