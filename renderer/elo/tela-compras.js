// renderer/elo/tela-compras.js — Compras.
//
// Desenhada olhando a tela real do painel (Du Pellegrini, 07/09): Compras NÃO é a lista
// de notas de fornecedor (essas moram em Gestão › Nota Fiscal de entrada). É a LISTA DE
// REPOSIÇÃO: todo produto com estoque mínimo cadastrado aparece aqui sozinho quando
// chega no mínimo, com quanto comprar e quanto isso deve custar.
//
// Embaixo ficam os itens avulsos — saco de lixo, detergente, o que não está no cadastro
// de produtos e só existe anotado à mão.

const L = require('./tela-lista')
const esc = L.esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function botao(acao, rotulo, primaria, pequeno) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:' + (pequeno ? 30 : 34) + 'px;padding:0 '
    + (pequeno ? 12 : 14) + 'px;border-radius:' + (pequeno ? 9 : 10) + 'px;font-size:12.5px;font-weight:800;'
    + 'font-family:inherit;cursor:pointer;white-space:nowrap;' + (primaria
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}

function cabecalhoCartao(titulo, sub, direita) {
  return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;'
    + 'padding:16px 20px;border-bottom:1px solid #f0f0ee">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111">' + esc(titulo) + '</div>'
    + (sub ? '<div style="font-size:12px;color:#9ca3af;font-weight:500;margin-top:2px">' + esc(sub) + '</div>' : '')
    + '</div>' + (direita || '') + '</div>'
}

/** Quanto comprar: o painel repõe até 2× o mínimo. */
function sugestaoDe(i) {
  if (i.sugestao != null) return Number(i.sugestao)
  return Math.max(0, (Number(i.minimo) || 0) * 2 - (Number(i.saldo) || 0))
}

function linhaReposicao(i) {
  const zerado = (Number(i.saldo) || 0) <= 0
  const sugestao = sugestaoDe(i)
  const previsto = i.custo ? Number(i.custo) * sugestao : 0
  return '<div data-linha="' + esc(i.nome) + '" style="display:grid;'
    + 'grid-template-columns:1fr 190px 150px 150px 110px;align-items:center;gap:12px;'
    + 'padding:11px 20px;border-bottom:1px solid #f0f0ee">'
    + '<span style="font-size:13.5px;font-weight:700;color:#111;min-width:0">' + esc(i.nome)
    + (zerado ? '<span style="margin-left:8px;font-size:10.5px;font-weight:800;color:#b42318;background:#fdeaea;'
      + 'border-radius:5px;padding:2px 6px">SEM ESTOQUE</span>' : '') + '</span>'
    + '<span style="font-size:13px"><span style="font-weight:800;color:' + (zerado ? '#b42318' : '#8a6508') + '">'
    + esc((Number(i.saldo) || 0) + ' ' + (i.unidade || 'un')) + '</span>'
    + '<span style="font-size:11px;color:#9ca3af;font-weight:600"> / mín ' + esc(String(Number(i.minimo) || 0)) + '</span></span>'
    + '<span title="Repõe até 2× o estoque mínimo" style="font-size:13px;font-weight:800;color:var(--acento-texto)">'
    + esc(sugestao + ' ' + (i.unidade || 'un')) + '</span>'
    + '<span style="font-size:12.5px;color:#9ca3af;font-weight:600">' + (previsto ? esc(brl(previsto)) : '—') + '</span>'
    + '<span style="text-align:right">' + botao('compras:recebi:' + i.nome, 'Recebi', true, true) + '</span>'
    + '</div>'
}

function htmlCompras(dados, estado) {
  estado = estado || {}
  if (!dados) {
    return '<div class="ecard"><div class="evazio">Sem dados de compras ainda.<br>'
      + 'Quando o app falar com o painel, a lista de reposição aparece aqui.</div></div>'
  }
  const repor = dados.repor || []
  const avulsos = dados.avulsos || []
  const comprados = dados.comprados || []
  const previsto = repor.reduce((s, i) => s + (i.custo ? Number(i.custo) * sugestaoDe(i) : 0), 0)

  const topo = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;'
    + 'flex-wrap:wrap;margin-bottom:18px">'
    + '<div><div style="font-size:19px;font-weight:800;color:#111;letter-spacing:-.02em">Compras</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:4px">'
    + 'Todo produto com estoque mínimo cadastrado aparece aqui quando chega no mínimo</div></div>'
    + botao('compras:relatorio-reposicao', '🖨 Relatório de reposição', false) + '</div>'

  const cabecalhoTabela = '<div style="display:grid;grid-template-columns:1fr 190px 150px 150px 110px;gap:12px;'
    + 'padding:9px 20px;background:#f6f6f4;border-bottom:1px solid #ebebe8;font-size:10.5px;font-weight:800;'
    + 'color:#b3b2ac;text-transform:uppercase;letter-spacing:.06em">'
    + '<span>Produto</span><span>Estoque</span><span>Comprar</span><span>Custo previsto</span><span></span></div>'

  const cartaoRepor = '<div class="ecard" style="padding:0;overflow:hidden;margin-bottom:16px;'
    + 'animation:eloFadeUp .5s ease both">'
    + cabecalhoCartao('Repor pelo estoque (' + repor.length + ')', '',
      previsto > 0 ? '<span style="font-size:12.5px;color:#9ca3af;font-weight:600">Custo previsto: '
        + '<strong style="color:#111">' + esc(brl(previsto)) + '</strong></span>' : '')
    + (repor.length
      ? cabecalhoTabela + repor.map(linhaReposicao).join('')
      : '<div style="padding:18px 20px;font-size:13px;color:#9ca3af;font-weight:500">Nenhum produto no mínimo. 🎉</div>')
    + '</div>'

  const formulario = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;padding:16px 20px'
    + (avulsos.length ? ';border-bottom:1px solid #f0f0ee' : '') + '">'
    + '<label style="flex:2;min-width:180px"><span style="display:block;font-size:11px;font-weight:700;color:#9ca3af;'
    + 'margin-bottom:5px">ITEM</span><input data-compra-avulsa="nome" placeholder="Ex.: Saco de lixo 100L"'
    + ' value="' + esc(estado.avulsoNome || '') + '" autocomplete="off" style="width:100%;height:34px;'
    + 'border:1px solid #e5e7eb;border-radius:9px;padding:0 11px;font-family:inherit;font-size:13px;color:#111"></label>'
    + '<label style="width:90px"><span style="display:block;font-size:11px;font-weight:700;color:#9ca3af;'
    + 'margin-bottom:5px">QTD</span><input data-compra-avulsa="qtd" value="' + esc(estado.avulsoQtd || '1') + '"'
    + ' style="width:100%;height:34px;border:1px solid #e5e7eb;border-radius:9px;padding:0 11px;'
    + 'font-family:inherit;font-size:13px;color:#111"></label>'
    + '<label style="width:80px"><span style="display:block;font-size:11px;font-weight:700;color:#9ca3af;'
    + 'margin-bottom:5px">UNID.</span><input data-compra-avulsa="unidade" value="' + esc(estado.avulsoUnidade || 'un') + '"'
    + ' style="width:100%;height:34px;border:1px solid #e5e7eb;border-radius:9px;padding:0 11px;'
    + 'font-family:inherit;font-size:13px;color:#111"></label>'
    + botao('compras:adicionar-avulso', '+ Adicionar', true) + '</div>'

  const listaAvulsos = avulsos.map((a) => '<div data-linha="' + esc(a.nome) + '" style="display:flex;align-items:center;'
    + 'gap:12px;padding:11px 20px;border-bottom:1px solid #f0f0ee">'
    + '<span style="flex:1;min-width:0;font-size:13.5px;font-weight:700;color:#111">' + esc(a.nome) + '</span>'
    + '<span style="font-size:12.5px;color:#9ca3af;font-weight:600">' + esc(a.qtd + ' ' + (a.unidade || 'un')) + '</span>'
    + botao('compras:comprado:' + a.nome, 'Comprado', true, true)
    + botao('compras:excluir-avulso:' + a.nome, '×', false, true) + '</div>').join('')

  const cartaoAvulsos = '<div class="ecard" style="padding:0;overflow:hidden;margin-bottom:16px;'
    + 'animation:eloFadeUp .5s ease .05s both">'
    + cabecalhoCartao('Itens avulsos (' + avulsos.length + ')',
      'Coisas que não estão no cadastro de produtos — anotadas à mão', '')
    + formulario + listaAvulsos + '</div>'

  const cartaoComprados = comprados.length
    ? '<div class="ecard" style="padding:0;overflow:hidden;animation:eloFadeUp .5s ease .09s both">'
      + cabecalhoCartao('Comprados recentes', '', '')
      + comprados.map((c) => '<div style="display:flex;align-items:center;gap:12px;padding:11px 20px;'
        + 'border-bottom:1px solid #f0f0ee">'
        + '<span style="flex:1;min-width:0;font-size:13px;color:#9ca3af;font-weight:600">'
        + esc(c.nome + ' · ' + c.qtd + ' ' + (c.unidade || 'un')) + '</span>'
        + botao('compras:voltar-lista:' + c.nome, 'Voltar p/ lista', false, true) + '</div>').join('')
      + '</div>'
    : ''

  return topo + cartaoRepor + cartaoAvulsos + cartaoComprados
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
    + 'receber compra e anotar item ainda são pelo painel</div>'
}

module.exports = { htmlCompras, sugestaoDe }
