// renderer/elo/tela-impressao.js — Impressão: configuração, teste e comanda.
//
// Esta é a primeira tela do app que NÃO é espelho do painel: impressora é coisa da
// máquina, não da nuvem. E é aqui que o desktop se justifica frente ao navegador —
// listar as impressoras do sistema, imprimir uma comanda em bobina e gerar PDF só o
// app consegue fazer.
//
// Diferente das outras telas, os botões daqui FAZEM: o teste imprime de verdade.

const L = require('./tela-lista')
const esc = L.esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function cartao(titulo, sub, conteudo, acao) {
  return '<div class="ecard" style="padding:24px;animation:eloFadeUp .5s ease .05s both">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">' + esc(titulo) + '</div>'
    + (sub ? '<div style="font-size:12.5px;color:#9ca3af;font-weight:500">' + esc(sub) + '</div>' : '') + '</div>'
    + (acao || '') + '</div>' + conteudo + '</div>'
}

function botao(acao, rotulo, primaria) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:36px;padding:0 16px;border-radius:10px;'
    + 'font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;white-space:nowrap;'
    + (primaria ? 'border:none;background:var(--acento);color:#fff' : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">'
    + esc(rotulo) + '</button>'
}

function linhaCampo(rotulo, valor, destaque) {
  return '<div style="display:grid;grid-template-columns:240px 1fr;gap:14px;padding:9px 0;border-bottom:1px solid #eef0f3">'
    + '<span style="font-size:12.5px;font-weight:700;color:#6b7280">' + esc(rotulo) + '</span>'
    + '<span style="font-size:13px;font-weight:' + (destaque ? '800' : '600') + ';color:' + (destaque || '#111') + '">' + esc(valor) + '</span></div>'
}

/** Agrupa os adicionais/sabores por GRUPO, preservando a ordem em que apareceram.
 *
 *  ⚠️ Só funde grupos CONSECUTIVOS de mesmo nome (olha o último aberto, não procura no
 *  meio da lista): um combo com "Escolha a pizza 1", "Turbine com molho", "Escolha a
 *  pizza 2" tem o mesmo nome de grupo repetido, e juntar tudo num só embaralharia a
 *  ordem em que a cozinha monta. Regra do painel (ComandaTermica.tsx, 08/09/2026).
 */
function agruparSabores(sabores) {
  const grupos = []
  for (const s of (sabores || [])) {
    const aberto = grupos[grupos.length - 1]
    if (aberto && aberto.grupo === s.grupo) { aberto.itens.push(s); continue }
    grupos.push({ grupo: s.grupo, itens: [s] })
  }
  return grupos
}

/** A linha de um adicional. O destaque (negrito + sublinhado, ligado por loja) vai só
 *  no NOME, nunca no prefixo "+"/"•": sublinhar o rótulo inteiro deixava um traço solto
 *  sobrando no fim da linha quebrada. */
function linhaAdicional(s, recuo, destacar) {
  const pago = Number(s.precoAdicional || s.preco_adicional) > 0
  const nome = destacar
    ? '<b style="text-decoration:underline">' + esc(s.nome) + '</b>'
    : esc(s.nome)
  return '<div style="padding-left:' + recuo + 'px">' + (pago ? '+ ' : '• ') + nome + '</div>'
}

/** Um item da comanda. Aceita o formato simples ("1x Pizza G", que é como as telas de
 *  lista trazem) e o completo, com sabores e observação. */
function linhaItem(i, destacar) {
  if (typeof i === 'string') return '<div>' + esc(i) + '</div>'
  const qtd = Number(i.qtd) || 1
  const cabeca = '<div style="display:flex;justify-content:space-between;gap:8px">'
    + '<span>' + qtd + 'x ' + esc(i.nome || '') + '</span>'
    + (i.valor != null ? '<span>' + esc(brl(i.valor)) + '</span>' : '') + '</div>'
  const grupos = agruparSabores(i.sabores).map((g) =>
    (g.grupo ? '<div style="padding-left:12px;font-weight:700">' + esc(g.grupo) + ':</div>' : '')
    + g.itens.map((s) => linhaAdicional(s, g.grupo ? 20 : 12, destacar)).join('')).join('')
  const obs = i.obs || i.observacao
  return cabeca + grupos
    + (obs ? '<div style="padding-left:12px;font-style:italic">OBS: ' + esc(obs) + '</div>' : '')
}

/** A comanda como ela sai na bobina — mesma largura de 72mm da impressão real. */
function htmlComanda(pedido, loja) {
  if (!pedido) return ''
  const cfg = (loja && loja.comanda) || {}
  const linha = '<div style="border-top:1px dashed #000;margin:5px 0"></div>'
  const itens = (pedido.itens || []).map((i) => linhaItem(i, !!cfg.destacarAdicional)).join('')
  const end = pedido.enderecoCampos || null
  // ⚠️ CAIXA ALTA por CSS, não no dado: é o bloco que o entregador lê na moto, muitas
  // vezes no escuro e com a bobina amassada. O endereço continua gravado como o cliente
  // digitou — etiqueta, WhatsApp e histórico não mudam.
  const blocoEndereco = (end || pedido.endereco) && pedido.canal !== 'Balcão'
    ? linha
      + '<div style="font-weight:800">ENDEREÇO DE ENTREGA</div>'
      + '<div style="text-transform:uppercase">'
      + esc(end
        ? end.rua + ', ' + end.numero + (end.complemento ? ' - ' + end.complemento : '')
          + '<br>' + end.bairro + (end.referencia ? ' — ' + end.referencia : '')
        : pedido.endereco).replace(/&lt;br&gt;/g, '<br>')
      + '</div>'
    : ''
  const troco = Number(pedido.trocoPara) || 0
  return '<div style="width:72mm;padding:4mm;background:#fff;font-family:\'Courier New\',monospace;font-size:12px;color:#000;'
    + 'border:1px solid #e5e7eb;border-radius:6px;box-shadow:0 1px 2px rgba(17,17,17,.04)">'
    + (cfg.cabecalho ? '<div style="text-align:center;white-space:pre-line">' + esc(cfg.cabecalho) + '</div>' : '')
    + '<div style="text-align:center;font-weight:800;font-size:14px">' + esc((loja && loja.nome) || 'Loja') + '</div>'
    + '<div style="text-align:center">' + esc((loja && loja.documento) || '') + '</div>'
    + linha
    + '<div style="font-weight:800">PEDIDO #' + esc(pedido.numero) + '</div>'
    + '<div>' + esc(pedido.canal || '') + ' · ' + esc(pedido.hora || '') + '</div>'
    + '<div>Cliente: ' + esc(pedido.cliente || '') + '</div>'
    + (pedido.telefone ? '<div>Tel: ' + esc(pedido.telefone) + '</div>' : '')
    + blocoEndereco
    + linha + itens + linha
    + (Number(pedido.taxa) ? '<div style="display:flex;justify-content:space-between"><span>Taxa de entrega</span>'
      + '<span>' + brl(pedido.taxa) + '</span></div>' : '')
    + '<div style="display:flex;justify-content:space-between"><span>TOTAL</span>'
    + '<span style="font-weight:800">' + brl(pedido.valor) + '</span></div>'
    + '<div style="display:flex;justify-content:space-between"><span>Pagamento</span><span>' + esc(pedido.pagamento || '—') + '</span></div>'
    // ⛔ Troco: o entregador LEVA o pedido e VOLTA COM A NOTA. Sai na comanda porque é
    // ali que ele confere quanto separar antes de sair.
    + (troco > 0
      ? '<div style="display:flex;justify-content:space-between"><span>Troco para</span><span>' + brl(troco) + '</span></div>'
        + '<div style="display:flex;justify-content:space-between;font-weight:800"><span>Levar de troco</span>'
        + '<span>' + brl(Math.max(0, troco - (Number(pedido.valor) || 0))) + '</span></div>'
      : '')
    + linha
    + '<div style="text-align:center;white-space:pre-line">' + esc(cfg.rodape || 'Obrigado pela preferência!') + '</div>'
    + '</div>'
}

function htmlImpressao(dados, estado) {
  estado = estado || {}
  if (!dados) {
    return '<div class="ecard"><div class="evazio">Lendo as impressoras do computador…</div></div>'
  }

  const impressoras = dados.impressoras || []
  const atual = dados.impressoraAtual || ''
  const listaImpressoras = impressoras.length
    ? impressoras.map((p) => {
        const escolhida = p.name === atual || (!atual && p.isDefault)
        return '<div data-impressora="' + esc(p.name) + '" style="display:flex;align-items:center;justify-content:space-between;gap:12px;'
          + 'padding:12px 14px;border:1.5px solid ' + (escolhida ? 'var(--acento)' : '#e8eaee') + ';border-radius:12px;cursor:pointer;'
          + 'background:' + (escolhida ? 'var(--acento-suave)' : '#fff') + ';margin-bottom:8px">'
          + '<div style="min-width:0"><div style="font-size:13.5px;font-weight:800;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
          + esc(p.displayName || p.name) + '</div>'
          + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600">' + esc(p.status != null ? ('status ' + p.status) : '')
          + (p.isDefault ? ' · padrão do sistema' : '') + '</div></div>'
          + (escolhida ? '<span class="echip" style="background:#fff;color:var(--acento-texto);font-weight:800">em uso</span>' : '')
          + '</div>'
      }).join('')
    : '<div class="evazio">Nenhuma impressora encontrada neste computador.<br>'
      + 'Instale a impressora no sistema e clique em "Procurar de novo".</div>'

  const config = [
    linhaCampo('Impressora da comanda', atual || 'padrão do sistema'),
    linhaCampo('Fila IPP (rede)', dados.ippUrl || 'não configurada'),
    linhaCampo('Largura da bobina', '72 mm (papel 80 mm)'),
    linhaCampo('Impressão automática', dados.automatica ? 'ao aceitar o pedido' : 'desligada',
      dados.automatica ? '#0A7A3E' : '#b42318'),
    linhaCampo('Vias da comanda', String(dados.vias || 1)),
    linhaCampo('Caminho de impressão', dados.caminho || '—'),
  ].join('')

  return '<div style="display:flex;flex-direction:column;gap:18px">'
    + cartao('Impressoras deste computador', impressoras.length + ' encontrada(s) · toque para escolher',
        listaImpressoras,
        '<div style="display:flex;gap:8px">' + botao('impressao:procurar', '↻ Procurar de novo')
        + botao('impressao:teste', '🖨 Imprimir teste', true) + '</div>')
    + cartao('Configuração', 'como a comanda sai', config)
    + cartao('Comanda', 'como fica na bobina de 80 mm',
        '<div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">'
        + htmlComanda(dados.exemplo, dados.loja)
        + '<div style="flex:1;min-width:240px;font-size:12.5px;color:#6b7280;font-weight:500;line-height:1.6">'
        + 'Esta é a comanda do último pedido, no tamanho real. O botão imprime nesta impressora escolhida — '
        + 'é o mesmo caminho que o app usa quando um pedido entra.'
        + '<div style="margin-top:14px;display:flex;gap:8px">' + botao('impressao:comanda', '🖨 Imprimir esta comanda', true) + '</div>'
        + '</div></div>')
    + '</div>'
}

module.exports = { htmlImpressao, htmlComanda, agruparSabores, linhaItem }
