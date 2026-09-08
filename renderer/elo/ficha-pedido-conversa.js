// renderer/elo/ficha-pedido-conversa.js — o pedido aberto DENTRO da conversa.
//
// Popup na própria tela do WhatsApp: quem está falando com o cliente não pode perder
// a conversa de vista para conferir o pedido. Dois modos:
//
//  · ver     — o pedido inteiro, com o botão da etapa (aceitar, marcar pronto…)
//  · editar  — corrigir telefone e endereço, que é o que se descobre CONVERSANDO
//              ("mudei de endereço", "meu número é outro").
//
// Acrescentar item continua sendo pelo painel: precisa do cardápio e do seletor de
// sabores, e um formulário meia-boca aqui erraria o preço.

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
function brl(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const ETAPA = {
  analise: { rotulo: 'Em análise', cor: '#1e2a5a', acao: 'Aceitar' },
  producao: { rotulo: 'Em produção', cor: '#2563eb', acao: 'Marcar pronto' },
  pronto: { rotulo: 'Pronto', cor: '#047857', acao: 'Entregar' },
  transito: { rotulo: 'Em trânsito', cor: '#6d28d9', acao: 'Confirmar entrega' },
  entregue: { rotulo: 'Entregue', cor: '#16a34a', acao: null },
}

/** Campos do endereço, na ordem em que se fala: rua, número, complemento… */
const CAMPOS_ENDERECO = [
  { chave: 'rua', rotulo: 'Rua / avenida', largura: '1fr' },
  { chave: 'numero', rotulo: 'Número', largura: '110px' },
  { chave: 'complemento', rotulo: 'Complemento', largura: '1fr' },
  { chave: 'bairro', rotulo: 'Bairro', largura: '1fr' },
  { chave: 'cidade', rotulo: 'Cidade', largura: '1fr' },
  { chave: 'uf', rotulo: 'UF', largura: '80px' },
  { chave: 'cep', rotulo: 'CEP', largura: '140px' },
  { chave: 'referencia', rotulo: 'Ponto de referência', largura: '1fr' },
]

function campo(c, valor) {
  return '<label style="display:block">'
    + '<span style="display:block;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;'
    + 'letter-spacing:.06em;margin-bottom:5px">' + esc(c.rotulo) + '</span>'
    + '<input data-campo-pedido="' + esc(c.chave) + '" value="' + esc(valor || '') + '" autocomplete="off"'
    + ' style="width:100%;height:36px;border:1px solid #e5e7eb;border-radius:9px;padding:0 11px;'
    + 'font-family:inherit;font-size:13px;color:#111;box-sizing:border-box"></label>'
}

function linhaConta(rotulo, valor, forte) {
  return '<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0">'
    + '<span style="font-size:12.5px;color:#6b7280;font-weight:600">' + esc(rotulo) + '</span>'
    + '<span style="font-size:13px;color:#111;font-weight:' + (forte ? '800' : '700') + '">' + esc(valor) + '</span></div>'
}

function modoVer(p) {
  const e = ETAPA[p.etapa] || { rotulo: p.status || '', cor: '#4b5563', acao: null }
  const subtotal = Number(p.valor || 0) - Number(p.taxa || 0) + Number(p.desconto || 0)
  return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
    + '<span style="font-size:11px;font-weight:800;color:#fff;background:' + e.cor + ';border-radius:999px;'
    + 'padding:4px 11px">' + esc(e.rotulo) + '</span>'
    + '<span style="font-size:12px;color:#9ca3af;font-weight:600">'
    + esc([p.canal, p.hora, p.esperaMin ? 'há ' + p.esperaMin + ' min' : ''].filter(Boolean).join(' · ')) + '</span></div>'

    + ((p.itens || []).length
      ? '<div style="margin-bottom:14px">' + (p.itens || []).map((i) =>
        '<div style="font-size:13px;color:#111;font-weight:600;padding:5px 0;border-bottom:1px solid #f4f5f7">'
        + esc(i) + '</div>').join('') + '</div>'
      : '')

    + linhaConta('Subtotal', brl(subtotal))
    + (p.taxa ? linhaConta('Entrega', brl(p.taxa)) : '')
    + (p.desconto ? linhaConta('Desconto', '− ' + brl(p.desconto)) : '')
    + linhaConta('Total', brl(p.valor), true)
    + (p.forma ? linhaConta('Pagamento', p.forma) : '')

    + (p.endereco
      ? '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #eef0f3">'
        + '<div style="font-size:10.5px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.06em;'
        + 'margin-bottom:4px">Entrega</div>'
        + '<div style="font-size:13px;color:#111;font-weight:600;line-height:1.5">' + esc(p.endereco) + '</div></div>'
      : '')

    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap">'
    + '<button type="button" data-acao="pedido-conversa:editar" style="height:38px;padding:0 16px;border-radius:10px;'
    + 'border:1px solid #e5e7eb;background:#fff;color:#111;font-family:inherit;font-size:12.5px;font-weight:800;'
    + 'cursor:pointer">✎ Editar</button>'
    + (e.acao
      ? '<button type="button" data-acao="avancar:' + esc(p.numero) + '" style="height:38px;padding:0 18px;'
        + 'border-radius:10px;border:none;background:' + e.cor + ';color:#fff;font-family:inherit;font-size:12.5px;'
        + 'font-weight:800;cursor:pointer">' + esc(e.acao) + ' →</button>'
      : '')
    + '</div>'
}

function modoEditar(p) {
  const end = p.enderecoCampos || {}
  const temEndereco = !!p.enderecoCampos
  return '<div style="font-size:12.5px;color:#6b7280;font-weight:500;line-height:1.55;margin-bottom:16px">'
    + 'Corrigir o que o cliente disse na conversa. Mudar o bairro <b>recalcula a taxa de entrega</b>.</div>'

    + '<div style="margin-bottom:14px">' + campo({ chave: 'telefone', rotulo: 'Telefone do cliente' }, p.telefone) + '</div>'

    + (temEndereco
      ? '<div style="font-size:10.5px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.06em;'
        + 'margin-bottom:8px">Endereço de entrega</div>'
        + '<div style="display:grid;grid-template-columns:1fr 110px;gap:10px;margin-bottom:10px">'
        + campo(CAMPOS_ENDERECO[0], end.rua) + campo(CAMPOS_ENDERECO[1], end.numero) + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
        + campo(CAMPOS_ENDERECO[2], end.complemento) + campo(CAMPOS_ENDERECO[3], end.bairro) + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 80px 140px;gap:10px;margin-bottom:10px">'
        + campo(CAMPOS_ENDERECO[4], end.cidade) + campo(CAMPOS_ENDERECO[5], end.uf) + campo(CAMPOS_ENDERECO[6], end.cep)
        + '</div>'
        + '<div style="margin-bottom:10px">' + campo(CAMPOS_ENDERECO[7], end.referencia) + '</div>'
      : '<div style="background:#f7f8fa;border-radius:10px;padding:12px 14px;font-size:12.5px;color:#6b7280;'
        + 'font-weight:600">Este pedido não é de entrega — só o telefone dá para corrigir aqui.</div>')

    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:12px;line-height:1.5">'
    + 'Acrescentar item ainda é pelo painel: precisa do cardápio e dos sabores para não errar o preço.</div>'

    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">'
    + '<button type="button" data-acao="pedido-conversa:ver" style="height:38px;padding:0 16px;border-radius:10px;'
    + 'border:1px solid #e5e7eb;background:#fff;color:#111;font-family:inherit;font-size:12.5px;font-weight:800;'
    + 'cursor:pointer">Cancelar</button>'
    + '<button type="button" data-acao="pedido-conversa:salvar:' + esc(p.numero) + '" style="height:38px;padding:0 18px;'
    + 'border-radius:10px;border:none;background:var(--acento);color:#fff;font-family:inherit;font-size:12.5px;'
    + 'font-weight:800;cursor:pointer">Salvar correção</button></div>'
}

function corpoPedido(p, editando) {
  if (!p) return '<div class="evazio">Não achei este pedido.</div>'
  return editando ? modoEditar(p) : modoVer(p)
}

module.exports = { corpoPedido, CAMPOS_ENDERECO, ETAPA }
