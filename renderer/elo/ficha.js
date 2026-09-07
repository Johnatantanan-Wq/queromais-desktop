// renderer/elo/ficha.js — o detalhe que abre ao clicar numa linha ou num cartão.
//
// Painel lateral, não página nova: no balcão, quem abre um pedido quer voltar para a
// lista em seguida — trocar de tela faria perder o lugar. É o mesmo padrão que o Elo usa
// para a ficha do cliente.

const esc = require('./tela-lista').esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const naoAchou = (o) => '<div class="evazio">' + o + ' não encontrado.</div>'

function bloco(titulo, conteudo) {
  return '<div style="margin-bottom:20px">'
    + '<div style="font-size:11px;font-weight:800;color:#b3b2ac;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px">' + esc(titulo) + '</div>'
    + conteudo + '</div>'
}
function linha(rotulo, valor, forte) {
  return '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #f6f6f4">'
    + '<span style="font-size:12.5px;color:#6b7280;font-weight:600">' + esc(rotulo) + '</span>'
    + '<span style="font-size:13px;color:#111;font-weight:' + (forte ? 800 : 600) + ';text-align:right">' + esc(valor) + '</span></div>'
}
function botao(acao, rotulo, primaria) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:36px;padding:0 14px;border-radius:10px;'
    + 'font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;white-space:nowrap;'
    + (primaria ? 'border:none;background:var(--acento);color:#fff' : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">'
    + esc(rotulo) + '</button>'
}

/** Moldura do painel: fundo escurecido + folha à direita. */
function painel(titulo, conteudo) {
  return '<div id="eloFicha" style="position:fixed;inset:0;z-index:900;display:flex;justify-content:flex-end">'
    + '<div data-fechar-ficha="1" style="position:absolute;inset:0;background:rgba(17,17,17,.28)"></div>'
    + '<div style="position:relative;width:460px;max-width:92vw;height:100%;background:#fff;border-left:1px solid #ebebe8;'
    + 'box-shadow:-8px 0 32px rgba(17,17,17,.10);display:flex;flex-direction:column;animation:eloFadeUp .25s ease both">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 24px;border-bottom:1px solid #ebebe8">'
    + '<div style="font-size:16px;font-weight:800;color:#111">' + esc(titulo) + '</div>'
    + '<button type="button" data-fechar-ficha="1" style="width:32px;height:32px;border:1px solid #e5e7eb;border-radius:9px;'
    + 'background:#fff;color:#6b7280;cursor:pointer;font-family:inherit;font-size:14px">✕</button></div>'
    + '<div style="flex:1;overflow:auto;padding:22px 24px">' + conteudo + '</div></div></div>'
}

const ETAPAS = { aguardando: 'Em análise', producao: 'Em produção', pronto: 'Pronto', transito: 'Em trânsito', entregue: 'Entregue' }

function fichaPedido(p) {
  if (!p) return naoAchou('Pedido')
  const itens = (p.itens || []).map((i) =>
    '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #f6f6f4">'
    + '<span style="font-size:13px;color:#111;font-weight:600">' + esc(i) + '</span></div>').join('')
  const subtotal = Number(p.valor || 0) - Number(p.taxa || 0) + Number(p.desconto || 0)
  const conta = linha('Subtotal', brl(subtotal))
    + (p.taxa ? linha('Entrega', brl(p.taxa)) : '')
    + (p.desconto ? linha('Desconto', '- ' + brl(p.desconto)) : '')
    + linha('Total', brl(p.valor), true)

  return bloco('Situação',
      linha('Pedido', '#' + (p.numero || '—'), true)
      + linha('Etapa', ETAPAS[p.etapa] || '—')
      + linha('Entrou às', p.hora || '—')
      + linha('Esperando há', (p.entrouHaMin != null ? p.entrouHaMin + ' min' : '—'))
      + linha('Canal', p.canal || '—'))
    + bloco('Cliente',
      linha('Nome', p.cliente || '—')
      + (p.telefone ? linha('Telefone', p.telefone) : '')
      + (p.endereco ? linha('Endereço', p.endereco) : ''))
    + bloco('Itens', itens || '<div class="evazio">Sem itens.</div>')
    + bloco('Conta', conta + linha('Pagamento', p.pagamento || '—'))
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px">'
    + botao('ficha:imprimir:' + p.numero, '🖨 Imprimir comanda', true)
    + botao('ficha:whatsapp:' + p.numero, '💬 Falar com o cliente')
    + '</div>'
}

function fichaCliente(c) {
  if (!c) return naoAchou('Cliente')
  const ultimos = (c.ultimos || []).map((p) =>
    '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #f6f6f4">'
    + '<span style="font-size:13px;color:#111;font-weight:700">#' + esc(p.numero) + '</span>'
    + '<span style="font-size:12.5px;color:#6b7280;font-weight:600">' + esc(p.data) + '</span>'
    + '<span style="font-size:13px;color:#111;font-weight:800">' + brl(p.valor) + '</span></div>').join('')
  return bloco('Contato',
      linha('Nome', c.nome || '—') + linha('Telefone', c.telefone || '—') + linha('Bairro', c.bairro || '—'))
    + bloco('Resumo',
      linha('Pedidos', String(c.pedidos || 0))
      + linha('Último pedido', c.ultimo || '—')
      + linha('Total gasto', brl(c.total), true))
    + bloco('Últimos pedidos', ultimos || '<div class="evazio">Sem pedidos ainda.</div>')
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px">'
    + botao('ficha:whatsapp-cliente:' + (c.telefone || ''), '💬 Falar no WhatsApp', true)
    + botao('ficha:novo-pedido:' + (c.telefone || ''), '+ Novo pedido')
    + '</div>'
}

function fichaProduto(p) {
  if (!p) return naoAchou('Produto')
  const margem = p.custo && p.preco ? Math.round(((p.preco - p.custo) / p.preco) * 100) : null
  const insumos = (p.insumos || []).map((i) =>
    '<div style="padding:6px 0;border-bottom:1px solid #f6f6f4;font-size:13px;color:#111;font-weight:600">' + esc(i) + '</div>').join('')
  return bloco('Produto',
      linha('Nome', p.nome || '—') + linha('Categoria', p.categoria || '—') + linha('Situação', p.situacao || '—'))
    + bloco('Preço e custo',
      linha('Preço de venda', brl(p.preco), true)
      + (p.custo ? linha('Custo (ficha técnica)', brl(p.custo)) : '')
      + (margem != null ? linha('Margem', margem + '%') : ''))
    + bloco('Saída', linha('Vendas nos últimos 7 dias', String(p.vendas7d != null ? p.vendas7d : '—')))
    + (insumos ? bloco('Ficha técnica', insumos) : '')
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px">'
    + botao('ficha:esgotar:' + (p.nome || ''), p.situacao === 'Esgotado' ? '✓ Voltar a vender' : '⛔ Marcar esgotado')
    + '</div>'
}

module.exports = { painel, fichaPedido, fichaCliente, fichaProduto, brl }
