const { test } = require('node:test')
const assert = require('node:assert')
const t = require('../renderer/elo/tela-visao-geral')

const dados = {
  periodo: { de: '2026-09-01', ate: '2026-09-07', rotulo: 'Últimos 7 dias' },
  kpis: {
    faturamento: { atual: 18420.5, anterior: 15900 },
    pedidos: { atual: 312, anterior: 340 },
    ticket: { atual: 59.04, anterior: 46.76 },
  },
  serie: {
    labels: ['01/09', '02/09', '03/09'],
    atual: [2100, 2600, 3010],
    anterior: [1900, 2400, 2200],
  },
  canais: [{ label: 'Delivery', value: 210 }, { label: 'Balcão', value: 72 }, { label: 'Mesa', value: 30 }],
  formas: [{ label: 'Pix', value: 8200 }, { label: 'Cartão', value: 7100 }, { label: 'Dinheiro', value: 3120 }],
  bairros: [{ label: 'Centro', value: 88 }, { label: 'Jardins', value: 54 }],
}

test('os três KPIs aparecem com a variação contra o período anterior', () => {
  const h = t.htmlVisaoGeral(dados, { metrica: 'faturamento', online: true, ts: Date.now() })
  assert.ok(h.includes('18.420,50'))
  assert.ok(h.includes('312'))
  assert.ok(/\+15,8%|\+15,9%/.test(h), 'faturamento subiu ~15,9%: ' + (h.match(/[+-][\d,]+%/g) || []).join(' '))
  assert.ok(h.includes('-8,2%'), 'pedidos caíram 8,2%')
})

test('a métrica escolhida fica marcada e manda o gráfico', () => {
  const h = t.htmlVisaoGeral(dados, { metrica: 'pedidos', online: true, ts: Date.now() })
  assert.ok(h.includes('data-metrica="pedidos"'))
  assert.ok(/is-on/.test(h.split('data-metrica="pedidos"')[1].slice(0, 80)), 'a métrica escolhida vem marcada')
  assert.ok(!/is-on/.test(h.split('data-metrica="ticket"')[1].slice(0, 80)), 'as outras não')
})

test('o gráfico traz período atual e anterior', () => {
  const h = t.htmlVisaoGeral(dados, { metrica: 'faturamento', online: true, ts: Date.now() })
  assert.strictEqual((h.match(/<path d="M/g) || []).length, 3) // 2 séries + a área da primeira
  assert.ok(h.includes('período anterior'))
})

test('quebra por canal, forma e bairro', () => {
  const h = t.htmlVisaoGeral(dados, { metrica: 'faturamento', online: true, ts: Date.now() })
  assert.ok(h.includes('Delivery') && h.includes('Pix') && h.includes('Centro'))
})

test('sem dado nenhum não inventa número', () => {
  const h = t.htmlVisaoGeral(null, { metrica: 'faturamento', online: false, ts: 0 })
  assert.ok(/sem dados/i.test(h))
  assert.ok(!h.includes('R$ 0,00'))
})

test('variação some quando não há período anterior', () => {
  const semAnterior = { ...dados, kpis: { faturamento: { atual: 100, anterior: 0 }, pedidos: { atual: 1, anterior: 0 }, ticket: { atual: 100, anterior: 0 } } }
  const h = t.htmlVisaoGeral(semAnterior, { metrica: 'faturamento', online: true, ts: Date.now() })
  assert.ok(!h.includes('Infinity') && !h.includes('NaN'))
})

test('variação: cálculo e sinal', () => {
  assert.strictEqual(t.variacao(110, 100).texto, '+10,0%')
  assert.strictEqual(t.variacao(90, 100).texto, '-10,0%')
  assert.strictEqual(t.variacao(100, 100).texto, '0,0%')
  assert.strictEqual(t.variacao(50, 0).texto, '')
  assert.strictEqual(t.variacao(110, 100).subiu, true)
})

const dadosPeriodo = {
  periodo: { chave: 'dia', rotulo: 'Hoje · comparado com ontem' },
  kpis: { faturamento: { atual: 1978.2, anterior: 4210 }, pedidos: { atual: 33, anterior: 71 }, ticket: { atual: 59.9, anterior: 59.3 } },
  series: {
    labels: ['10h', '11h', '12h', '13h', '14h'],
    faturamento: { atual: [120, 340, 610, 420, 488], anterior: [100, 300, 700, 500, 410] },
    pedidos: { atual: [2, 6, 11, 7, 7], anterior: [2, 5, 12, 8, 6] },
    ticket: { atual: [60, 56, 55, 60, 69], anterior: [50, 60, 58, 62, 68] },
  },
  canais: [{ label: 'Delivery', value: 20 }],
  formas: [{ label: 'Pix', value: 900 }],
  bairros: [],
}

test('os quatro botões de período são os do painel, com o atual marcado', () => {
  const h = t.htmlVisaoGeral(dadosPeriodo, { metrica: 'faturamento', periodo: 'hoje', online: true, ts: Date.now() })
  // Os mesmos do painel: Hoje · Esta semana · Este mês · Mês anterior.
  for (const p of ['hoje', 'semana', 'mes', 'mes_anterior']) assert.ok(h.includes('data-periodo="' + p + '"'), 'falta ' + p)
  const depois = h.split('data-periodo="hoje"')[1].slice(0, 60)
  assert.ok(/is-on/.test(depois), 'o período atual deve vir marcado: ' + depois)
  const outro = h.split('data-periodo="mes"')[1].slice(0, 60)
  assert.ok(!/is-on/.test(outro), 'os demais não podem vir marcados')
})

test('no dia, o eixo do gráfico é horário', () => {
  const h = t.htmlVisaoGeral(dadosPeriodo, { metrica: 'faturamento', periodo: 'dia', online: true, ts: Date.now() })
  assert.ok(h.includes('10h') && h.includes('14h'))
})

test('o rótulo do período aparece como subtítulo do gráfico', () => {
  const h = t.htmlVisaoGeral(dadosPeriodo, { metrica: 'faturamento', periodo: 'dia', online: true, ts: Date.now() })
  assert.ok(h.includes('Hoje · comparado com ontem'))
})

test('período sem movimento nenhum não quebra o gráfico', () => {
  const vazio = { ...dadosPeriodo, series: { labels: [], faturamento: { atual: [], anterior: [] } } }
  const h = t.htmlVisaoGeral(vazio, { metrica: 'faturamento', periodo: 'dia', online: true, ts: Date.now() })
  assert.ok(h.includes('<svg'))
  assert.ok(!h.includes('NaN'))
})

// ── o que veio da tela real do painel (07/09) ──
const completa = require('../src-electron/demo-dados').visaoGeral('semana')

test('a faixa HOJE mostra os dois números do dia, independentes do período', () => {
  const h = t.htmlVisaoGeral(completa, { periodo: 'mes' })
  const faixa = h.split('Faturamento bruto')[1].slice(0, 200)
  assert.ok(/3\.440,79/.test(faixa), 'o faturamento de hoje não muda com o período: ' + faixa)
})

test('Detalhes do faturamento soma as partes e mostra o total', () => {
  const h = t.detalhesDoFaturamento(completa, [])
  assert.ok(h.includes('Total dos produtos') && h.includes('Taxas de serviço (gorjeta)'))
  assert.ok(/Faturamento<\/span><span[^>]*>R\$ 3\.440,79/.test(h), 'produtos + gorjeta = 3.440,79')
})

test('tirar uma parte do cálculo muda o total — é a pergunta "por que não bate"', () => {
  const semGorjeta = t.detalhesDoFaturamento(completa, ['taxaServico'])
  assert.ok(/Faturamento<\/span><span[^>]*>R\$ 3\.217,76/.test(semGorjeta), 'sem a gorjeta, sobra o produto')
  assert.ok(/opacity:\.45/.test(semGorjeta), 'a linha desligada fica apagada')
})

test('o desconto entra como negativo, nunca somando', () => {
  const comDesconto = t.detalhesDoFaturamento(
    { composicao: { produtos: 100, taxaEntrega: 0, taxaServico: 0, descontos: 30 } }, [])
  assert.ok(/− R\$ 30,00/.test(comDesconto))
  assert.ok(/Faturamento<\/span><span[^>]*>R\$ 70,00/.test(comDesconto))
})

test('Análise dos pedidos por: troca entre forma, canal e tipo', () => {
  const porForma = t.htmlVisaoGeral(completa, { segmento: 'forma' })
  assert.ok(porForma.includes('Cartão de crédito') && porForma.includes('Ticket médio'))
  const porCanal = t.htmlVisaoGeral(completa, { segmento: 'canal' })
  assert.ok(porCanal.includes('Mesa') && !porCanal.includes('Cartão de crédito'))
  assert.ok(porCanal.includes('data-seg-visao'), 'o seletor fica na tela')
})

test('o ticket médio da análise sai do próprio segmento', () => {
  const h = t.htmlVisaoGeral(completa, { segmento: 'forma' })
  // Cartão de crédito: 1336,93 em 20 pedidos = 66,85 — o mesmo do painel.
  assert.ok(h.includes('66,85'), 'ticket médio por forma')
})

test('segmento sem dado avisa em vez de desenhar rosca vazia', () => {
  const h = t.htmlVisaoGeral({ ...completa, segmentos: { forma: [] } }, { segmento: 'forma' })
  assert.ok(/Nada encontrado para o período/.test(h))
})
