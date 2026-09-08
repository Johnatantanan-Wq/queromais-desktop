// renderer/elo/tela-conversas.js — as conversas do WhatsApp dentro do app.
//
// É a tela do menu WhatsApp: lista de conversas à esquerda, a conversa aberta à
// direita. A CONFIGURAÇÃO (por onde a loja fala) não mora aqui — está em
// Configurações › WhatsApp, como no painel.
//
// Duas coisas que a tela nunca esconde:
//  · de quem é a mensagem — cliente à esquerda, loja à direita, como todo mundo
//    espera de um WhatsApp;
//  · se o envio está de pé. Caixa de resposta que aceita texto e não manda é pior
//    do que caixa desabilitada.

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function iniciais(nome) {
  const p = ('' + (nome || '')).trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '—'
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

/** "14:32" · "ontem" · "ter" — o que o olho precisa para situar a conversa. */
function quando(iso, agora) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const hoje = new Date(agora || Date.now())
  const mesmoDia = d.toDateString() === hoje.toDateString()
  if (mesmoDia) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const ontem = new Date(hoje.getTime() - 86400000)
  if (d.toDateString() === ontem.toDateString()) return 'ontem'
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
}

function linhaConversa(c, aberta, agora) {
  const on = c.id === aberta
  const naoLidas = Number(c.naoLidas) || 0
  return '<div data-conversa="' + esc(c.id) + '" style="display:flex;align-items:center;gap:11px;padding:11px 14px;'
    + 'cursor:pointer;border-bottom:1px solid #f4f5f7;'
    + 'background:' + (on ? 'var(--acento-suave)' : 'transparent') + '">'
    + '<span style="width:38px;height:38px;border-radius:50%;background:#eef0f3;color:#4b5563;flex-shrink:0;'
    + 'display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:800">'
    + esc(iniciais(c.nome)) + '</span>'
    + '<span style="flex:1;min-width:0">'
    + '<span style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">'
    + '<span style="font-size:13.5px;font-weight:' + (naoLidas ? '800' : '700') + ';color:#111;overflow:hidden;'
    + 'text-overflow:ellipsis;white-space:nowrap">' + esc(nomeDe(c)) + '</span>'
    + '<span style="font-size:11px;color:#9ca3af;font-weight:600;white-space:nowrap">'
    + esc(quando(c.ultimaEm, agora)) + '</span></span>'
    + '<span style="display:flex;align-items:center;gap:6px;margin-top:2px">'
    + '<span style="flex:1;min-width:0;font-size:12.5px;color:#6b7280;font-weight:' + (naoLidas ? '700' : '500') + ';'
    + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.ultima || '') + '</span>'
    + (naoLidas ? '<span style="min-width:18px;height:18px;border-radius:999px;background:var(--acento);color:#fff;'
      + 'font-size:10.5px;font-weight:800;line-height:18px;text-align:center;padding:0 5px">' + naoLidas + '</span>' : '')
    + '</span></span></div>'
}

const fone = require('../../src-electron/telefone')

/** O nome do CADASTRO ganha do nome que o WhatsApp mostra — é o que a loja conhece. */
function nomeDe(c) {
  return (c.cliente && c.cliente.nome) || c.nome || 'Sem nome'
}

/** O pedido ligado à conversa: o que veio junto ou o último do cliente. */
function pedidoDaConversa(c) {
  if (c.pedido) return c.pedido
  return (c.cliente && c.cliente.ultimoPedido && c.cliente.ultimoPedido.numero) || null
}

/**
 * A faixa que diz quem é o cliente. Só aparece quando o telefone bateu com o
 * cadastro ou com um pedido — nunca é preenchida por adivinhação.
 */
function faixaDoCliente(cli) {
  if (!cli) return ''
  const partes = []
  if (cli.pedidos) partes.push(cli.pedidos + (cli.pedidos === 1 ? ' pedido' : ' pedidos'))
  if (cli.gasto) partes.push(brl(cli.gasto) + ' já entregues')
  if (cli.bairro) partes.push(cli.bairro)
  const u = cli.ultimoPedido
  if (u) partes.push('último #' + u.numero + (u.etapa && u.etapa !== 'entregue' ? ' (em andamento)' : ''))
  if (!partes.length) return ''
  return '<div style="display:flex;align-items:center;gap:8px;padding:8px 18px;background:var(--acento-suave);'
    + 'font-size:12px;font-weight:700;color:var(--acento-texto);flex-wrap:wrap">'
    + partes.map(esc).join(' · ') + '</div>'
}

function brl(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function balao(m) {
  const daLoja = m.de === 'loja'
  return '<div style="display:flex;justify-content:' + (daLoja ? 'flex-end' : 'flex-start') + ';margin-bottom:8px">'
    + '<div style="max-width:74%;padding:9px 13px;border-radius:' + (daLoja ? '14px 14px 4px 14px' : '14px 14px 14px 4px') + ';'
    + 'background:' + (daLoja ? 'var(--acento-suave)' : '#fff') + ';border:1px solid '
    + (daLoja ? 'transparent' : '#e8eaee') + '">'
    + '<div style="font-size:13.5px;color:#111;font-weight:500;line-height:1.5;white-space:pre-wrap">'
    + esc(m.texto) + '</div>'
    + '<div style="font-size:10.5px;color:#9ca3af;font-weight:600;margin-top:4px;text-align:right">'
    + esc(quando(m.em)) + (daLoja && m.automatica ? ' · automática' : '') + '</div>'
    + '</div></div>'
}

/** A conversa aberta. Sem nenhuma escolhida, explica em vez de ficar em branco. */
function painelConversa(c, podeEnviar) {
  const cli = c && c.cliente
  if (!c) {
    return '<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:40px 24px">'
      + '<div style="text-align:center;max-width:320px">'
      + '<div style="font-size:30px;line-height:1;margin-bottom:10px">💬</div>'
      + '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">Escolha uma conversa</div>'
      + '<div style="font-size:13px;color:#9ca3af;font-weight:500;line-height:1.55">'
      + 'As mensagens que a loja trocou com o cliente aparecem aqui.</div></div></div>'
  }
  const cabecalho = '<div style="display:flex;align-items:center;gap:11px;padding:13px 18px;border-bottom:1px solid #eef0f3">'
    + '<span style="width:36px;height:36px;border-radius:50%;background:#eef0f3;color:#4b5563;'
    + 'display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">'
    + esc(iniciais(c.nome)) + '</span>'
    + '<span style="flex:1;min-width:0">'
    + '<span style="display:flex;align-items:center;gap:7px">'
    + '<span style="font-size:14px;font-weight:800;color:#111">' + esc(nomeDe(c)) + '</span>'
    + (cli && cli.cadastrado
      ? '<span class="echip" style="background:var(--acento-suave);color:var(--acento-texto);font-weight:800">cliente</span>'
      : '')
    + '</span>'
    + '<span style="display:block;font-size:11.5px;color:#9ca3af;font-weight:600">'
    + esc(fone.formatar(c.telefone)) + '</span>'
    + '</span>'
    + (cli && cli.cadastrado
      ? '<button type="button" data-acao="conversa:cliente:' + esc(cli.chave) + '" class="echip"'
        + ' style="cursor:pointer">ver ficha</button>'
      : '')
    + (pedidoDaConversa(c) ? '<button type="button" data-acao="conversa:pedido:' + esc(pedidoDaConversa(c)) + '"'
      + ' class="echip" style="cursor:pointer">pedido #' + esc(pedidoDaConversa(c)) + '</button>' : '')
    + '</div>'
    + faixaDoCliente(cli)

  const mensagens = '<div style="flex:1;overflow:auto;padding:16px 18px;background:#f7f8fa">'
    + ((c.mensagens || []).length
      ? (c.mensagens || []).map(balao).join('')
      : '<div style="text-align:center;color:#9ca3af;font-size:13px;font-weight:500;padding:20px">'
        + 'Nenhuma mensagem nesta conversa ainda.</div>')
    + '</div>'

  const resposta = '<div style="display:flex;gap:8px;align-items:center;padding:12px 16px;border-top:1px solid #eef0f3">'
    + '<input id="conversaTexto" autocomplete="off"' + (podeEnviar ? '' : ' disabled')
    + ' placeholder="' + (podeEnviar ? 'Escreva a resposta…' : 'Conecte o WhatsApp em Configurações para responder')
    + '" style="flex:1;height:40px;border:1px solid #e5e7eb;border-radius:10px;padding:0 13px;'
    + 'font-family:inherit;font-size:13.5px;color:#111;background:' + (podeEnviar ? '#fff' : '#f4f5f7') + '">'
    + '<button type="button" data-acao="conversa:enviar"' + (podeEnviar ? '' : ' disabled')
    + ' style="height:40px;padding:0 18px;border:none;border-radius:10px;background:var(--acento);color:#fff;'
    + 'font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">Enviar</button></div>'

  return '<div style="display:flex;flex-direction:column;height:100%">' + cabecalho + mensagens + resposta + '</div>'
}

const ETAPA_PEDIDO = {
  analise: { rotulo: 'Em análise', cor: '#1e2a5a' },
  producao: { rotulo: 'Em produção', cor: '#2563eb' },
  pronto: { rotulo: 'Pronto para entrega', cor: '#047857' },
  transito: { rotulo: 'Em trânsito', cor: '#6d28d9' },
  entregue: { rotulo: 'Entregue', cor: '#16a34a' },
}

/**
 * O pedido que está andando, ao lado da conversa. Só aparece quando existe — coluna
 * vazia à direita rouba largura da conversa sem dar nada em troca.
 *
 * O que ele mostra é o que se responde ao cliente sem sair da tela: em que etapa
 * está, há quanto tempo, o que foi pedido, quanto deu e para onde vai.
 */
function painelPedido(p) {
  if (!p) return ''
  const e = ETAPA_PEDIDO[p.etapa] || { rotulo: p.status || 'Em andamento', cor: '#4b5563' }
  const linha = (rotulo, valor, forte) => '<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0">'
    + '<span style="font-size:12.5px;color:#6b7280;font-weight:600">' + esc(rotulo) + '</span>'
    + '<span style="font-size:12.5px;color:#111;font-weight:' + (forte ? '800' : '700') + ';text-align:right">'
    + esc(valor) + '</span></div>'

  const itens = (p.itens || []).length
    ? '<div style="margin:12px 0 6px">'
      + '<div style="font-size:10.5px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.06em;'
      + 'margin-bottom:6px">O que ele pediu</div>'
      + (p.itens || []).map((i) => '<div style="font-size:12.5px;color:#111;font-weight:600;padding:3px 0;'
        + 'border-bottom:1px solid #f4f5f7">' + esc(i) + '</div>').join('')
      + '</div>'
    : ''

  const subtotal = p.valor - p.taxa + p.desconto
  return '<div style="border-left:1px solid #eef0f3;background:#fff;display:flex;flex-direction:column;height:100%">'
    + '<div style="padding:13px 16px;border-bottom:1px solid #eef0f3">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">'
    + '<span style="font-size:14px;font-weight:800;color:#111">Pedido #' + esc(p.numero) + '</span>'
    + '<span style="font-size:11px;font-weight:800;color:#fff;background:' + e.cor + ';border-radius:999px;'
    + 'padding:4px 10px;white-space:nowrap">' + esc(e.rotulo) + '</span></div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600">'
    + esc([p.canal, p.hora, p.esperaMin ? 'há ' + p.esperaMin + ' min' : ''].filter(Boolean).join(' · ')) + '</div>'
    + '</div>'
    + '<div style="flex:1;overflow:auto;padding:12px 16px">'
    + itens
    + '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #eef0f3">'
    + linha('Subtotal', brl(subtotal))
    + (p.taxa ? linha('Entrega', brl(p.taxa)) : '')
    + (p.desconto ? linha('Desconto', '− ' + brl(p.desconto)) : '')
    + linha('Total', brl(p.valor), true)
    + (p.forma ? linha('Pagamento', p.forma) : '')
    + '</div>'
    + (p.endereco ? '<div style="margin-top:12px">'
      + '<div style="font-size:10.5px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.06em;'
      + 'margin-bottom:4px">Entrega</div>'
      + '<div style="font-size:12.5px;color:#111;font-weight:600;line-height:1.5">' + esc(p.endereco) + '</div></div>' : '')
    + '</div>'
    + '<div style="padding:12px 16px;border-top:1px solid #eef0f3">'
    + '<button type="button" data-acao="conversa:pedido:' + esc(p.numero) + '" style="width:100%;height:36px;'
    + 'border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#111;font-family:inherit;font-size:12.5px;'
    + 'font-weight:800;cursor:pointer">Abrir o pedido</button></div>'
    + '</div>'
}

function htmlConversas(dados, estado) {
  dados = dados || {}
  estado = estado || {}
  const conversas = dados.conversas || []
  const abertaId = estado.conversa || (conversas[0] && conversas[0].id) || null
  const aberta = conversas.find((c) => c.id === abertaId) || null
  // Só se responde com o envio de pé — o estado vem da configuração, não daqui.
  const podeEnviar = dados.estado === 'open' || dados.provedor === 'wabot'

  if (!conversas.length) {
    return '<div class="ecard" style="padding:0;overflow:hidden">'
      + '<div class="evazio" style="padding:46px 24px">'
      + '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:6px">Nenhuma conversa ainda</div>'
      + 'Quando um cliente escrever para a loja, a conversa aparece aqui.<br>'
      + 'Escolher por onde a loja fala é em <b>Configurações › WhatsApp</b>.</div></div>'
  }

  const naoLidas = conversas.reduce((s, c) => s + (Number(c.naoLidas) || 0), 0)
  const cabecalho = '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;'
    + 'flex-wrap:wrap;margin-bottom:14px">'
    + '<div style="font-size:12.5px;color:#6b7280;font-weight:500">'
    + conversas.length + (conversas.length === 1 ? ' conversa' : ' conversas')
    + (naoLidas ? ' · ' + naoLidas + ' sem resposta' : '') + '</div>'
    + '<button type="button" data-acao="conversa:configurar" class="echip" style="cursor:pointer">'
    + '⚙ Configurar WhatsApp</button></div>'

  // O pedido em andamento do cliente da conversa aberta — se houver, ganha a coluna
  // da direita. Sem pedido ativo, a conversa fica com a largura toda.
  const pedidoAtivo = (aberta && aberta.cliente && aberta.cliente.emAndamento) || null
  const colunas = pedidoAtivo
    ? 'minmax(220px,290px) 1fr minmax(240px,300px)'
    : 'minmax(240px,320px) 1fr'

  return '<div>' + cabecalho
    + '<div class="ecard" style="padding:0;overflow:hidden;display:grid;'
    + 'grid-template-columns:' + colunas + ';height:calc(100vh - 260px);min-height:420px">'
    + '<div style="border-right:1px solid #eef0f3;overflow:auto">'
    + conversas.map((c) => linhaConversa(c, abertaId, dados.agora)).join('') + '</div>'
    + '<div style="min-width:0">' + painelConversa(aberta, podeEnviar) + '</div>'
    + (pedidoAtivo ? '<div style="min-width:0">' + painelPedido(pedidoAtivo) + '</div>' : '')
    + '</div></div>'
}

module.exports = { htmlConversas, quando, iniciais }
