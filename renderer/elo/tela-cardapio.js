// renderer/elo/tela-cardapio.js — Gestor de Cardápio.
//
// Aqui NÃO é a vitrine de venda (essa fica no site, fora do sistema): é a montagem e a
// gestão — categorias, itens, preço, foto, esgotar. Desenhado olhando o painel ao vivo
// (Du Pellegrini, 07/09).
//
// O que a tela real ensina:
//  - a lista é de CATEGORIAS que abrem, não de produtos soltos;
//  - o topo mede a QUALIDADE do cardápio (fotos, descrições, promoções) e diz o que
//    fazer — é a tela que empurra o lojista a completar o cadastro;
//  - cada item mostra "a partir de" (porque tem variação), a foto (ou a falta dela) e
//    uma chave de esgotar, que é a ação mais usada no dia a dia.

const ABAS = ['Dashboard', 'Gestor', 'Grupos de adicionais', 'Imagens do cardápio', 'Edição em massa', 'Integrações', 'Potencializador']

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function chave(acao, ligada, rotulo) {
  return '<span style="display:inline-flex;align-items:center;gap:7px">'
    + (rotulo ? '<span style="font-size:11px;color:#9ca3af;font-weight:700">' + esc(rotulo) + '</span>' : '')
    + '<span data-acao="' + esc(acao) + '" style="width:36px;height:20px;border-radius:999px;background:'
    + (ligada ? 'var(--acento)' : '#e5e7eb') + ';position:relative;cursor:pointer;display:inline-block;flex:none">'
    + '<span style="position:absolute;top:3px;' + (ligada ? 'right:3px' : 'left:3px')
    + ';width:14px;height:14px;border-radius:50%;background:#fff"></span></span></span>'
}
function menu(acao, rotulo) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:30px;padding:0 11px;border:1px solid #e5e7eb;'
    + 'border-radius:9px;background:#fff;color:#111;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">'
    + esc(rotulo) + ' ▾</button>'
}

const CORES_ETIQUETA = {
  'Promocional': 'background:#fff3cc;color:#8a6508',
  'OCULTA': 'background:#eef0f3;color:#9ca3af',
  'Destaque pop-up': 'background:#f5f3ff;color:#6d28d9',
  'Pizza': 'background:#E7FAF0;color:#0A7A3E',
}
function etiqueta(t) {
  return '<span style="font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:6px;white-space:nowrap;'
    + (CORES_ETIQUETA[t] || 'background:#eef4ff;color:#1d4ed8') + '">' + esc(t) + '</span>'
}

/** Medidor de qualidade — meia-lua, como no painel. */
function medidor(pct) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0))
  const r = 42, circ = Math.PI * r     // meia volta
  const preenchido = (p / 100) * circ
  return '<svg width="110" height="66" viewBox="0 0 110 66">'
    + '<path d="M13 58 A42 42 0 0 1 97 58" fill="none" stroke="#eef0f3" stroke-width="11" stroke-linecap="round"/>'
    + '<path d="M13 58 A42 42 0 0 1 97 58" fill="none" stroke="var(--acento)" stroke-width="11" stroke-linecap="round"'
    + ' stroke-dasharray="' + preenchido.toFixed(1) + ' ' + circ.toFixed(1) + '"/>'
    + '<text x="55" y="54" text-anchor="middle" font-size="22" font-weight="800" fill="#111" font-family="Plus Jakarta Sans, sans-serif">'
    + p + '%</text></svg>'
}

function faixaQualidade(q) {
  const cartao = (valor, rotulo, acao, rotuloAcao) =>
    '<div style="flex:1;min-width:170px;padding:14px 18px;border-left:1px solid #eef0f3">'
    + '<div style="font-size:20px;font-weight:800;color:#111;line-height:1.1">' + esc(valor) + '</div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-bottom:' + (acao ? '10px' : '0') + '">' + esc(rotulo) + '</div>'
    + (acao ? '<button type="button" data-acao="' + esc(acao) + '" style="width:100%;height:32px;border:none;border-radius:9px;'
      + 'background:var(--acento);color:#fff;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer">' + esc(rotuloAcao) + '</button>' : '')
    + '</div>'
  return '<div class="ecard" style="display:flex;flex-wrap:wrap;align-items:center;padding:0;overflow:hidden;margin-bottom:16px">'
    + '<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;min-width:280px">' + medidor(q.pontuacao)
    + '<div><div style="font-size:14px;font-weight:800;color:#111">Qualidade do Cardápio</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600">do cardápio otimizado</div></div></div>'
    + cartao(q.promocionais, 'Itens promocionais', null, null)
    + cartao(q.comFotos + '%', 'do cardápio com fotos', 'melhorar-fotos', 'Adicione mais fotos')
    + cartao(q.comDescricoes + '%', 'com descrições', 'melhorar-descricoes', 'Melhore as descrições')
    + cartao(q.promocoesCategorias, 'Promoções nas categorias', 'criar-promocoes', 'Crie promoções')
    + '</div>'
}

function item(i, aberta) {
  const apagado = i.esgotado
  return '<div data-item="' + esc(i.nome) + '" style="display:grid;grid-template-columns:20px 54px 1fr 34px 150px 90px 120px;'
    + 'align-items:center;gap:12px;padding:10px 16px;border-top:1px solid #f4f5f7;background:#fff">'
    + '<span style="color:#c4c8cf;cursor:grab;font-size:13px">⣿</span>'
    + (i.foto
      ? '<div style="width:48px;height:48px;border-radius:10px;background:#eef0f3"></div>'
      : '<div style="width:48px;height:48px;border-radius:10px;background:#fafbfc;border:1px dashed #e5e7eb;display:flex;'
        + 'align-items:center;justify-content:center;font-size:9px;color:#9ca3af;font-weight:700;text-align:center;line-height:1.1">sem<br>foto</div>')
    + '<div style="min-width:0"><div style="font-size:13.5px;font-weight:800;color:' + (apagado ? '#9ca3af' : '#111') + '">'
    + esc(i.nome) + ' <span style="color:var(--acento-texto);font-size:11px">▾</span></div>'
    + (i.descricao ? '<div style="font-size:12px;color:#9ca3af;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
      + esc(i.descricao) + '</div>' : '') + '</div>'
    + '<button type="button" data-acao="link-item:' + esc(i.nome) + '" title="Copiar link do item" style="width:30px;height:30px;'
    + 'border:none;background:none;color:#9ca3af;cursor:pointer;font-family:inherit">🔗</button>'
    + '<div style="text-align:right"><div style="font-size:10.5px;color:#9ca3af;font-weight:700">A partir de</div>'
    + '<div style="font-size:13.5px;font-weight:800;color:#111">' + brl(i.preco)
    + ' <button type="button" data-acao="editar-preco:' + esc(i.nome) + '" title="Editar preço" style="border:none;background:none;'
    + 'cursor:pointer;color:#9ca3af;font-size:12px">✏️</button></div></div>'
    + chave('esgotar-item:' + i.nome, i.esgotado, 'Esgotar')
    + menu('acoes-item:' + i.nome, 'Ações do item')
    + '</div>'
}

function htmlCardapio(dados, estado) {
  estado = estado || {}
  if (!dados) {
    return '<div class="ecard"><div class="evazio">Sem dados do cardápio ainda.<br>'
      + 'Quando o app falar com o painel, as categorias aparecem aqui.</div></div>'
  }
  const abaAtiva = estado.aba || 'Gestor'
  const abas = '<div style="display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid #e8eaee;margin-bottom:18px">'
    + ABAS.map((a) => '<button type="button" data-aba-cardapio="' + esc(a) + '" style="height:38px;padding:0 14px;border:none;'
      + 'background:none;font-family:inherit;font-size:13px;cursor:pointer;'
      + (a === abaAtiva ? 'color:var(--acento-texto);font-weight:800;box-shadow:inset 0 -2px 0 var(--acento)' : 'color:#6b7280;font-weight:600')
      + '">' + esc(a) + '</button>').join('') + '</div>'

  if (abaAtiva !== 'Gestor') {
    return '<div>' + abas + '<div class="ecard"><div class="evazio">'
      + '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:6px">' + esc(abaAtiva) + '</div>'
      + 'Esta aba ainda é feita pelo painel.</div></div></div>'
  }

  const termo = ('' + (estado.termo || '')).trim().toLowerCase()
  const abertas = estado.abertas || []
  let categorias = dados.categorias || []
  if (termo) {
    categorias = categorias
      .map((c) => ({ ...c, itens: (c.itens || []).filter((i) => i.nome.toLowerCase().indexOf(termo) >= 0) }))
      .filter((c) => c.nome.toLowerCase().indexOf(termo) >= 0 || c.itens.length)
  }

  const barra = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px">'
    + '<div style="display:flex;align-items:center;gap:8px;height:38px;padding:0 14px;border:1px solid #e5e7eb;border-radius:10px;background:#fafbfc;min-width:280px">'
    + '<span style="color:#9ca3af">🔎</span>'
    + '<input id="buscaCardapio" placeholder="Pesquisar item ou categoria" value="' + esc(estado.termo || '') + '" autocomplete="off"'
    + ' style="border:none;outline:none;background:none;font-family:inherit;font-size:13px;color:#111;flex:1"></div>'
    + '<button type="button" data-acao="ver-no-celular" class="echip" style="height:38px;background:#fff;border:1px solid #e5e7eb;color:#111;cursor:pointer">📱 Ver no celular</button>'
    + '<button type="button" data-acao="links-cardapio" class="echip" style="height:38px;background:#fff;border:1px solid #e5e7eb;color:#111;cursor:pointer">🔗 Links</button>'
    + '<span style="display:flex;gap:8px;margin-left:auto">'
    + '<button type="button" data-acao="novo-combo" style="height:38px;padding:0 16px;border:none;border-radius:10px;background:var(--acento);'
    + 'color:#fff;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">+ Novo Combo</button>'
    + '<button type="button" data-acao="nova-categoria" style="height:38px;padding:0 16px;border:none;border-radius:10px;background:var(--acento);'
    + 'color:#fff;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">+ Nova categoria</button></span></div>'

  const lista = categorias.length ? categorias.map((c) => {
    const aberta = abertas.indexOf(c.nome) >= 0 || !!termo
    const itens = aberta ? (c.itens || []).map((i) => item(i, aberta)).join('') : ''
    return '<div class="ecard" style="padding:0;overflow:hidden;margin-bottom:10px">'
      + '<div data-categoria="' + esc(c.nome) + '" style="display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer">'
      + '<span style="color:#c4c8cf;cursor:grab;font-size:13px">⣿</span>'
      + '<span style="font-size:14.5px;font-weight:800;color:#111">' + esc(c.nome) + '</span>'
      + '<span style="color:var(--acento-texto);font-size:12px">' + (aberta ? '▲' : '▼') + '</span>'
      + '<span style="display:flex;gap:6px;flex-wrap:wrap">' + (c.etiquetas || []).map(etiqueta).join('') + '</span>'
      + '<span style="display:flex;gap:10px;align-items:center;margin-left:auto">'
      + chave('esgotar-categoria:' + c.nome, !!c.esgotada, 'Esgotar tudo')
      + menu('acoes-categoria:' + c.nome, 'Ações categoria') + '</span></div>'
      + itens + '</div>'
  }).join('') : '<div class="ecard"><div class="evazio">Nenhuma categoria encontrada.</div></div>'

  return '<div>' + abas + faixaQualidade(dados.qualidade || {}) + barra + lista
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:10px">'
    + 'criar categoria e produto, reordenar e trocar fotos ainda são pelo painel</div></div>'
}

module.exports = { htmlCardapio, ABAS, medidor }
