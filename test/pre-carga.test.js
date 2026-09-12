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

test('o que a spec manda guardar, com a validade dela', () => {
  assert.deepStrictEqual(P.ITENS.map((i) => i.chave), ['cardapio', 'formas', 'caixa', 'clientes'])
  const porChave = Object.fromEntries(P.ITENS.map((i) => [i.chave, i.validadeMin]))
  assert.strictEqual(porChave.cardapio, 6 * 60)
  assert.strictEqual(porChave.formas, 12 * 60)
  assert.strictEqual(porChave.clientes, 24 * 60)
  assert.strictEqual(porChave.caixa, 0, 'o caixa muda a cada venda: revalida sempre')
})

test('⛔ aquece pelo CANAL da tela, não por rota solta', () => {
  // A primeira versão buscava rotas soltas e guardava em chave própria — que nenhuma
  // tela lia. O app baixava tudo e, na queda, a tela continuava vazia.
  for (const i of P.ITENS) {
    assert.ok(i.canal, i.chave + ' sem canal')
    assert.ok(!i.rota, i.chave + ' voltou a apontar rota solta — isso vira cache morto')
  }
  assert.strictEqual(P.ITENS.find((i) => i.chave === 'cardapio').canal, 'venda-cardapio')
  assert.strictEqual(P.ITENS.find((i) => i.chave === 'caixa').canal, 'caixa-carregar')
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
  const e = P.estado((k) => ({ cardapio: hAtras(20), formas: hAtras(1),
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
  const e = P.estado((k) => (k === 'cardapio' || k === 'clientes' ? 0 : hAtras(1)), AGORA)
  assert.match(e.aviso, /falta cardápio e clientes recentes/)
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

test('a rodada aquece só o que está na hora', async () => {
  const pedidos = []
  const r = await P.rodada({
    tsDe: (k) => (k === 'cardapio' ? Date.now() : 0),
    aquecer: async (canal) => { pedidos.push(canal); return { dados: { x: 1 }, offline: false } },
  })
  assert.ok(!pedidos.includes('venda-cardapio'), 'o cardápio fresco não é buscado de novo')
  assert.ok(r.buscados.includes('clientes') && r.buscados.includes('caixa'))
})

test('⚠️ cache respondendo NÃO conta como revalidado', () => {
  // `offline: true` é o cache devolvendo o que já tinha. Contar isso como sucesso faria
  // a pré-carga achar que atualizou, e o dado envelheceria sem ninguém ver.
  return P.rodada({
    tsDe: () => 0,
    aquecer: async () => ({ dados: { x: 1 }, offline: true }),
  }).then((r) => {
    assert.strictEqual(r.buscados.length, 0)
    assert.strictEqual(r.falhas.length, P.ITENS.length)
  })
})

test('um canal que explode não derruba os outros', async () => {
  const r = await P.rodada({
    tsDe: () => 0,
    aquecer: async (canal) => {
      if (canal === 'clientes-carregar') throw new Error('timeout')
      return { dados: { x: 1 }, offline: false }
    },
  })
  assert.deepStrictEqual(r.falhas, ['clientes'])
  assert.strictEqual(r.buscados.length, P.ITENS.length - 1)
})

test('⚠️ sem sessão a pré-carga nem tenta — insistir só gasta chamada', async () => {
  // Com a sessão caída o painel recusa tudo. Bater de 10 em 10 minutos enche o log de
  // falha que não é falha, e não guarda nada. Quando o lojista entrar, a rodada
  // seguinte pega tudo de uma vez.
  const ponte = require('../src-electron/ponte')
  let chamadas = 0
  const pc = ponte.iniciarPreCarga({
    cache: { meta: () => null }, lojaIdAtual: () => 'l1', podeRodar: () => false, intervaloMs: 1e9,
  })
  pc.ligar({ carregarCanal: async () => { chamadas++; return { dados: {}, offline: false } }, chaveDoCanal: (c) => c })
  await pc.rodar()
  pc.parar()
  assert.strictEqual(chamadas, 0)
})
