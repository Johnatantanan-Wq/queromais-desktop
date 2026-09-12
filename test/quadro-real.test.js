const { test } = require('node:test')
const assert = require('node:assert')
const Q = require('../renderer/elo/tela-quadro')

const dados = {
  kpis: { online: 0, hoje: 37, cancelados: 5, analise: 0, producao: 23, prontos: 1, entregues: 13, tempoMedio: 129, meta: 15 },
  lojaAberta: true,
  aceiteAutomatico: true,
  tempos: { balcao: 30, delivery: 45 },
  itens: [
    { numero: '12', etapa: 'producao', cliente: 'Luemily', canal: 'Retirada', forma: 'Dinheiro', valor: 19.99, esperaMin: 3, pessoas: 1 },
    { numero: '32', etapa: 'producao', cliente: 'Mesa 27', canal: 'Mesa', forma: null, contaAberta: true, valor: 14.90, esperaMin: 3 },
    { numero: '1', etapa: 'pronto', cliente: 'Mesa 16', canal: 'Mesa', contaAberta: true, valor: 7.99, esperaMin: 308 },
    { numero: '10', etapa: 'entregue', cliente: 'Franciele Silva', canal: 'Delivery', forma: 'Cartão', valor: 66.97, esperaMin: 45, pessoas: 1 },
  ],
}

test('as cinco colunas do painel, com contador', () => {
  const h = Q.htmlQuadro(dados, {})
  for (const t of ['Em análise', 'Em produção', 'Prontos para entrega', 'Em trânsito', 'Entregue']) {
    assert.ok(h.includes(t), 'falta a coluna ' + t)
  }
})

test('a faixa de indicadores traz o que o painel mostra, inclusive o tempo médio e a meta', () => {
  const h = Q.htmlQuadro(dados, {})
  assert.ok(h.includes('37') && /Pedidos hoje/i.test(h))
  assert.ok(h.includes('129') && /meta 15/i.test(h))
  assert.ok(h.includes('5') && /Cancelados/i.test(h))
})

test('tempo médio acima da meta fica em vermelho', () => {
  const h = Q.htmlQuadro(dados, {})
  const bloco = h.split('meta 15')[0].slice(-400)
  assert.ok(/b42318/.test(bloco), 'tempo médio 129 com meta 15 precisa gritar')
})

test('os filtros por canal e por forma de pagamento aparecem', () => {
  const h = Q.htmlQuadro(dados, {})
  for (const f of ['todos', 'delivery', 'retirada', 'local', 'pix', 'cartao', 'dinheiro']) {
    assert.ok(h.includes('data-filtro-pedido="' + f + '"'), 'falta o filtro ' + f)
  }
})

test('o cartão traz número, tempo, cliente, etiquetas, valor e a ação da etapa', () => {
  const h = Q.htmlQuadro(dados, {})
  const c = h.split('data-pedido="12"')[1].split('data-pedido=')[0]
  assert.ok(c.includes('#12') && c.includes('Luemily'))
  assert.ok(c.includes('Retirada') && c.includes('Dinheiro'))
  assert.ok(c.includes('19,99'))
  assert.ok(/Marcar pronto/.test(c))
})

test('pedido de mesa mostra "conta aberta" e a ação é servir', () => {
  const h = Q.htmlQuadro(dados, {})
  const c = h.split('data-pedido="1"')[1].split('data-pedido=')[0]
  assert.ok(/Conta aberta/i.test(c))
  assert.ok(/Servir/.test(c), 'pronto de mesa se serve, não se entrega')
})

test('a coluna Em análise traz o painel de tempos e aceite automático', () => {
  const h = Q.htmlQuadro(dados, {})
  assert.ok(/Balcão/.test(h) && /30 min/.test(h) && /45 min/.test(h))
  assert.ok(/aceitos automaticamente/i.test(h))
})

test('busca e chave de loja aberta estão no topo', () => {
  const h = Q.htmlQuadro(dados, {})
  assert.ok(h.includes('id="buscaPedidos"'))
  assert.ok(/Loja aberta/i.test(h))
  assert.ok(h.includes('data-acao="venda-manual"'))
})

test('filtro por canal esconde o que não é do canal', () => {
  const h = Q.htmlQuadro(dados, { filtroPedido: 'delivery' })
  assert.ok(h.includes('Franciele Silva'))
  assert.ok(!h.includes('Luemily'), 'retirada não aparece no filtro de delivery')
})

test('sem dados não quebra', () => {
  assert.ok(/sem dados/i.test(Q.htmlQuadro(null, {})))
})

test('consumo local troca os rótulos: prontos para SERVIR, servidos, fechados', () => {
  const h = Q.htmlQuadro(dados, { consumoLocal: true })
  assert.ok(h.includes('Prontos para servir') && h.includes('Servidos') && h.includes('Fechados'))
  assert.ok(!h.includes('Prontos para entrega'))
})

test('cada cartão carrega o número, para o clique abrir a ficha certa', () => {
  const h = Q.htmlQuadro(dados, {})
  assert.ok(h.includes('data-pedido="12"') && h.includes('data-pedido="1"'))
})

test('a busca filtra por número e por cliente', () => {
  assert.ok(Q.htmlQuadro(dados, { termoPedido: 'luemily' }).includes('Luemily'))
  assert.ok(!Q.htmlQuadro(dados, { termoPedido: 'luemily' }).includes('Franciele'))
  assert.ok(Q.htmlQuadro(dados, { termoPedido: '10' }).includes('Franciele'))
})

test('coluna vazia diz que não há pedido (menos a de análise, que tem a configuração)', () => {
  const h = Q.htmlQuadro({ ...dados, itens: [] }, {})
  assert.ok(/Nenhum pedido no momento/.test(h))
  assert.ok(/aceitos automaticamente/i.test(h), 'a configuração continua na coluna de análise')
})

test('cada COLUNA leva a cor do título no fundo, bem clara', () => {
  const h = Q.htmlQuadro(dados, {})
  for (const c of Q.COLUNAS) {
    const claro = Q.clarear(c.cor, 0.9)
    assert.ok(h.includes('background:' + claro), c.titulo + ' precisa do fundo ' + claro)
    // cabeçalho cheio em cima, fundo claro embaixo — nessa ordem
    assert.ok(h.indexOf('background:' + claro) < h.indexOf('background:' + c.cor + ';padding:11px 14px'),
      'o fundo da coluna abre o bloco, e o cabeçalho vem dentro: ' + c.titulo)
  }
})

test('as colunas têm a mesma altura e rolam por dentro', () => {
  // Alturas soltas deixavam manchas de cor de tamanhos diferentes na tela; e uma
  // coluna cheia empurrava as vizinhas para baixo.
  const h = Q.htmlQuadro(dados, {})
  assert.ok(/align-items:stretch/.test(h), 'as cinco colunas terminam juntas')
  assert.strictEqual((h.match(/overflow-y:auto/g) || []).length, 5, 'cada uma rola por dentro')
})

test('coluna vazia continua com a cor — é ela que diz que a etapa existe', () => {
  const h = Q.htmlQuadro({ ...dados, itens: [] }, {})
  for (const c of Q.COLUNAS) {
    assert.ok(h.includes('background:' + Q.clarear(c.cor, 0.9)), c.titulo + ' sem fundo')
  }
  assert.ok(/Nenhum pedido no momento/.test(h))
})

test('clarear: 100% vira branco, 0% devolve a própria cor', () => {
  assert.strictEqual(Q.clarear('#2563eb', 1), '#ffffff')
  assert.strictEqual(Q.clarear('#2563eb', 0), '#2563eb')
})

// ── F3.3: a venda feita sem internet no quadro ─────────────────────────────
test('a venda pendente aparece com o número provisório, marcada, e sem botão de avançar — quem move é o painel depois que ela sobe', () => {
  const d = { ...dados, itens: [{ numero: 'L-1', pedido: 'L-1', etapa: 'producao', cliente: 'Bia', canal: 'Retirada', forma: 'dinheiro', valor: 30, esperaMin: 2, naoSincronizada: true, manual: true }].concat(dados.itens) }
  const h = Q.htmlQuadro(d, {})
  assert.ok(h.includes('#L-1'))
  assert.ok(/não sincronizada/.test(h))
  assert.ok(!h.includes('data-acao="avancar:L-1"'), 'não avança o que ainda não existe no painel')
  assert.ok(h.includes('data-acao="avancar:12"'), 'os outros continuam avançando')
})
