// renderer/elo/tela-quadro.js — Gestão de pedido, o quadro ao vivo.
//
// Desenhado olhando a tela real do painel (Du Pellegrini, 07/09). O que ela ensina:
//
//  - São CINCO colunas fixas (Em análise → Em produção → Prontos → Em trânsito →
//    Entregue), cada uma com sua cor. Não são três com duas opcionais.
//  - A faixa de indicadores fica em LINHA, fina, no topo — e o número que importa é o
//    "tempo médio contra a meta": na loja real estava 129 min para uma meta de 15.
//  - O filtro é por canal (delivery, retirada, consumo local) E por forma de pagamento.
//  - O cartão é compacto: número, espera, cliente, etiquetas, valor e UM botão com a
//    ação da etapa. Quem trabalha no balcão precisa ver muitos pedidos de uma vez.
//  - "Em análise" abriga a configuração de tempos e o aceite automático.

const COLUNAS = [
  { id: 'analise', titulo: 'Em análise', cor: '#1e2a5a', limite: 10 },
  { id: 'producao', titulo: 'Em produção', cor: '#2563eb', limite: 25 },
  { id: 'pronto', titulo: 'Prontos para entrega', cor: '#047857', limite: 15 },
  { id: 'transito', titulo: 'Em trânsito', cor: '#6d28d9', limite: 45 },
  { id: 'entregue', titulo: 'Entregue', cor: '#16a34a', limite: null },
]
/**
 * Versão clara da cor da coluna, para a faixa que corre por trás dos cards. Pedido do
 * dono (07/09): a cor do título tem que continuar visível na coluna inteira, não só no
 * cabeçalho — é ela que diz, de longe, em que etapa aquele bloco de pedidos está.
 * Clara de propósito: se competir com o cartão branco, o número do pedido perde a vez.
 */
function clarear(hex, peso) {
  const n = parseInt(('' + hex).replace('#', ''), 16)
  const canal = (d) => Math.round(((n >> d) & 255) + (255 - ((n >> d) & 255)) * peso)
  const p2 = (v) => ('0' + v.toString(16)).slice(-2)
  return '#' + p2(canal(16)) + p2(canal(8)) + p2(canal(0))
}

// Rótulos de consumo local: "prontos para entrega" não existe para quem come na mesa.
const TITULOS_LOCAL = { pronto: 'Prontos para servir', transito: 'Servidos', entregue: 'Fechados' }
/** Como a etapa é dita ao lojista depois que o pedido anda. */
const ROTULO_ETAPA = {
  em_producao: 'Em produção', pronto: 'Pronto', em_entrega: 'Em trânsito',
  entregue: 'Entregue', servido: 'Servido',
  producao: 'Em produção', transito: 'Em trânsito',
}
const ACAO = { analise: 'Aceitar', producao: 'Marcar pronto', pronto: 'Entregar', transito: 'Confirmar entrega', entregue: null }
const FILTROS = [
  { chave: 'todos', rotulo: 'Todos' }, { chave: 'delivery', rotulo: 'Delivery' },
  { chave: 'retirada', rotulo: 'Retirada' }, { chave: 'local', rotulo: 'Consumo local' },
  { chave: 'pix', rotulo: 'PIX' }, { chave: 'cartao', rotulo: 'Cartão' }, { chave: 'dinheiro', rotulo: 'Dinheiro' },
]

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function tempoDeEspera(min) {
  const m = Math.max(0, Math.round(Number(min) || 0))
  if (m < 60) return m + ' min'
  const h = Math.floor(m / 60), r = m % 60
  return r ? h + ' h ' + String(r).padStart(2, '0') : h + ' h'
}
function etiqueta(texto, tom) {
  const tons = { canal: 'background:#eef4ff;color:#1d4ed8', forma: 'background:#eef0f3;color:#4b5563',
    conta: 'background:#fff3cc;color:#8a6508', mesa: 'background:#E7FAF0;color:#0A7A3E' }
  return '<span style="font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:6px;white-space:nowrap;'
    + (tons[tom] || tons.forma) + '">' + esc(texto) + '</span>'
}

/** Faixa de indicadores — fina e em linha, como no painel. */
function faixaIndicadores(k) {
  const atrasado = k.tempoMedio != null && k.meta != null && k.tempoMedio > k.meta
  const itens = [
    { v: k.online, r: 'Pessoas online' },
    { v: k.hoje, r: 'Pedidos hoje' },
    { v: k.cancelados, r: 'Cancelados', cor: (k.cancelados > 0 ? '#b42318' : null) },
    { v: k.analise, r: 'Em análise' },
    { v: k.producao, r: 'Em produção' },
    { v: k.prontos, r: 'Prontos' },
    { v: k.entregues, r: 'Entregues' },
  ].map((i) => '<div style="padding:10px 16px;border-right:1px solid #eef0f3;min-width:0">'
    + '<div style="font-size:18px;font-weight:800;color:' + (i.cor || '#111') + ';line-height:1.1">' + esc(i.v != null ? i.v : '—') + '</div>'
    + '<div style="font-size:11px;color:#9ca3af;font-weight:600;white-space:nowrap">' + esc(i.r) + '</div></div>').join('')

  const tempo = '<div style="padding:10px 16px;min-width:0">'
    + '<div style="font-size:18px;font-weight:800;color:' + (atrasado ? '#b42318' : '#111') + ';line-height:1.1">'
    + esc(k.tempoMedio != null ? k.tempoMedio + ' min' : '—') + '</div>'
    + '<div style="font-size:11px;color:' + (atrasado ? '#b42318' : '#9ca3af') + ';font-weight:600;white-space:nowrap">'
    + 'Tempo médio (meta ' + esc(k.meta != null ? k.meta : '—') + ')</div></div>'

  return '<div class="ecard" style="display:flex;flex-wrap:wrap;align-items:center;padding:0;overflow:hidden;margin-bottom:14px">'
    + '<div style="padding:14px 18px;font-size:14px;font-weight:800;color:#111;white-space:nowrap">Pedidos ao vivo</div>'
    + itens + tempo + '</div>'
}

function barraAcoes(dados) {
  const aberta = dados.lojaAberta !== false
  const bt = (acao, rotulo, estilo) => '<button type="button" data-acao="' + esc(acao) + '" style="height:34px;padding:0 14px;'
    + 'border-radius:10px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer;white-space:nowrap;' + estilo + '">' + esc(rotulo) + '</button>'
  return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px">'
    + bt('venda-manual', '+ Venda manual', 'border:none;background:#6d28d9;color:#fff')
    + '<span style="margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + bt('pausar-cardapio', '⏸ Pausar cardápio', 'border:1px solid #f3c0bb;background:#fff;color:#b42318')
    + bt('ver-transito', '🛵 Em trânsito / Entregue', 'border:1px solid #d8ccf5;background:#fff;color:#6d28d9')
    + '<span style="display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:800;color:'
    + (aberta ? 'var(--acento-texto)' : '#b42318') + '">'
    + '<span data-acao="alternar-loja" style="width:38px;height:22px;border-radius:999px;background:'
    + (aberta ? 'var(--acento)' : '#e5e7eb') + ';position:relative;cursor:pointer;display:inline-block">'
    + '<span style="position:absolute;top:3px;' + (aberta ? 'right:3px' : 'left:3px')
    + ';width:16px;height:16px;border-radius:50%;background:#fff"></span></span>'
    + (aberta ? 'Loja aberta' : 'Loja fechada') + '</span></span></div>'
}

function barraFiltros(atual, termo) {
  return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px">'
    + '<div style="display:flex;align-items:center;gap:8px;height:36px;padding:0 14px;border:1px solid #e5e7eb;border-radius:10px;background:#fafbfc;min-width:280px">'
    + '<span style="color:#9ca3af">🔎</span>'
    + '<input id="buscaPedidos" placeholder="Buscar pedido, cliente ou telefone…" value="' + esc(termo || '') + '" autocomplete="off"'
    + ' style="border:none;outline:none;background:none;font-family:inherit;font-size:13px;color:#111;flex:1"></div>'
    + FILTROS.map((f) => '<button type="button" data-filtro-pedido="' + esc(f.chave) + '" class="eaba'
      + (f.chave === atual ? ' is-on' : '') + '">' + esc(f.rotulo) + '</button>').join('')
    + '</div>'
}

function cartao(p, coluna, consumoLocal) {
  const atrasado = coluna.limite != null && p.esperaMin > coluna.limite
  const acao = ACAO[coluna.id]
  const rotuloAcao = (coluna.id === 'pronto' && (p.canal === 'Mesa' || consumoLocal)) ? 'Servir' : acao
  const marcas = []
  if (p.canal) marcas.push(etiqueta(p.canal, p.canal === 'Mesa' ? 'mesa' : 'canal'))
  if (p.contaAberta) marcas.push(etiqueta('Conta aberta', 'conta'))
  else if (p.forma) marcas.push(etiqueta(p.forma, 'forma'))
  return '<div data-pedido="' + esc(p.numero) + '" class="ecard" style="padding:11px 13px;border-radius:12px;cursor:pointer;'
    + 'border-left:3px solid ' + (atrasado ? '#b42318' : coluna.cor) + '">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'
    + '<span style="font-size:13.5px;font-weight:800;color:#111">#' + esc(p.numero) + '</span>'
    + '<span style="font-size:11.5px;font-weight:' + (atrasado ? '800' : '700') + ';color:' + (atrasado ? '#b42318' : '#9ca3af') + '">'
    + esc(tempoDeEspera(p.esperaMin)) + '</span></div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 6px">'
    + '<span style="font-size:13px;font-weight:700;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.cliente) + '</span>'
    + (p.pessoas ? '<span style="font-size:11px;color:#9ca3af;font-weight:700;white-space:nowrap">👤 ' + esc(p.pessoas) + '</span>' : '') + '</div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'
    + '<span style="display:flex;gap:5px;flex-wrap:wrap">' + marcas.join('') + '</span>'
    + '<span style="font-size:13.5px;font-weight:800;color:#111">' + brl(p.valor) + '</span></div>'
    + (rotuloAcao
      ? '<button type="button" data-acao="avancar:' + esc(p.numero) + '" style="width:100%;margin-top:9px;height:30px;border:none;'
        + 'border-radius:9px;background:' + coluna.cor + ';color:#fff;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer">'
        + esc(rotuloAcao) + ' →</button>'
      : '<div style="width:100%;margin-top:9px;height:30px;border-radius:9px;background:#f0f7f2;color:#0A7A3E;'
        + 'display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">✓ Entregue</div>')
    + '</div>'
}

/** Configuração que mora dentro da coluna "Em análise", como no painel. */
function painelAnalise(dados) {
  const t = dados.tempos || {}
  return '<div class="ecard" style="padding:13px;border-radius:12px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:700;color:#111">'
    + '<span>Balcão: <b>' + esc(t.balcao != null ? t.balcao + ' min' : '—') + '</b></span>'
    + '<button type="button" data-acao="editar-tempos" style="border:none;background:none;color:var(--acento-texto);'
    + 'font-family:inherit;font-size:12px;font-weight:800;cursor:pointer">Editar</button></div>'
    + '<div style="font-size:12.5px;font-weight:700;color:#111;margin-top:2px">Delivery: <b>'
    + esc(t.delivery != null ? t.delivery + ' min' : '—') + '</b></div>'
    + '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:#4b5563;font-weight:600;cursor:pointer">'
    + '<input type="checkbox" data-acao="aceite-automatico"' + (dados.aceiteAutomatico ? ' checked' : '')
    + ' style="width:15px;height:15px;accent-color:var(--acento)">Aceitar os pedidos automaticamente</label>'
    + (dados.aceiteAutomatico
      ? '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:8px;text-align:center">Todos os pedidos são aceitos automaticamente</div>'
      : '') + '</div>'
}

function passaNoFiltro(p, filtro) {
  if (!filtro || filtro === 'todos') return true
  const canal = ('' + (p.canal || '')).toLowerCase()
  const forma = ('' + (p.forma || '')).toLowerCase()
  if (filtro === 'delivery') return canal.indexOf('delivery') >= 0
  if (filtro === 'retirada') return canal.indexOf('retirada') >= 0
  if (filtro === 'local') return canal.indexOf('mesa') >= 0 || canal.indexOf('local') >= 0 || canal.indexOf('balc') >= 0
  if (filtro === 'pix') return forma.indexOf('pix') >= 0
  if (filtro === 'cartao') return forma.indexOf('cart') >= 0 || forma.indexOf('créd') >= 0 || forma.indexOf('déb') >= 0
  if (filtro === 'dinheiro') return forma.indexOf('dinheiro') >= 0
  return true
}

function htmlQuadro(dados, estado) {
  estado = estado || {}
  if (!dados) {
    return '<div class="ecard"><div class="evazio">Sem dados dos pedidos ainda.<br>'
      + 'Quando o app falar com o painel, o quadro aparece aqui.</div></div>'
  }
  const filtro = estado.filtroPedido || 'todos'
  const termo = ('' + (estado.termoPedido || '')).trim().toLowerCase()
  let itens = (dados.itens || []).filter((p) => passaNoFiltro(p, filtro))
  if (termo) {
    itens = itens.filter((p) => [p.numero, p.cliente, p.telefone].some((x) => ('' + (x || '')).toLowerCase().indexOf(termo) >= 0))
  }

  const colunas = COLUNAS.map((c) => {
    const doColuna = itens.filter((p) => p.etapa === c.id)
    const titulo = estado.consumoLocal ? (TITULOS_LOCAL[c.id] || c.titulo) : c.titulo
    const cartoes = doColuna.length
      ? doColuna.map((p) => cartao(p, c, estado.consumoLocal)).join('')
      : (c.id === 'analise' ? '' : '<div style="padding:22px 12px;text-align:center;color:#9ca3af;font-size:12.5px">Nenhum pedido no momento.</div>')
    // A coluna INTEIRA leva a cor do título, bem clara, e todas têm a mesma altura —
    // é o que faz o quadro parecer um quadro. Alturas soltas deixavam manchas de
    // tamanhos diferentes na tela (ajuste pedido em 08/09). Quando os cartões passam
    // da altura, a coluna rola por dentro, sem empurrar as vizinhas.
    return '<div style="display:flex;flex-direction:column;min-width:0;border-radius:12px;overflow:hidden;'
      + 'background:' + clarear(c.cor, 0.9) + '">'
      + '<div style="background:' + c.cor + ';padding:11px 14px;display:flex;align-items:center;'
      + 'justify-content:space-between;flex-shrink:0">'
      + '<span style="font-size:13px;font-weight:800;color:#fff">' + esc(titulo) + '</span>'
      + '<span style="font-size:15px;font-weight:800;color:#fff">' + doColuna.length + '</span></div>'
      + '<div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:10px">'
      + (c.id === 'analise' ? painelAnalise(dados) : '') + cartoes + '</div></div>'
  }).join('')

  return '<div>' + faixaIndicadores(dados.kpis || {}) + barraAcoes(dados) + barraFiltros(filtro, estado.termoPedido)
    + '<div style="display:grid;grid-template-columns:repeat(5,minmax(210px,1fr));gap:14px;align-items:stretch;'
    + 'height:calc(100vh - 350px);min-height:380px;animation:eloFadeUp .5s ease both">'
    + colunas + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">'
    + 'imprimir e escolher o entregador ainda são pelo painel</div></div>'
}

module.exports = { htmlQuadro, tempoDeEspera, passaNoFiltro, clarear, COLUNAS, ACAO, ROTULO_ETAPA, FILTROS }
