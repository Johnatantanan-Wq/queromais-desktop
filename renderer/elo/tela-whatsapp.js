// renderer/elo/tela-whatsapp.js — o WhatsApp dentro do app.
//
// São DOIS caminhos, e o lojista escolhe qual conectar:
//
//  · Evolution (API) — a plataforma fala com o WhatsApp por trás. É o que manda
//    confirmação de pedido, boleto e aviso de saiu-para-entrega sozinho, sem
//    ninguém no computador. Conecta lendo um QR uma vez.
//  · WhatsApp Web    — a conversa de sempre, embutida na janela do app. Serve para
//    ATENDER: ver e responder cliente. Não manda nada automático.
//
// Um não substitui o outro, e é por isso que a tela mostra os dois lado a lado, com
// o estado de cada um. O botão diz o que falta em cada caminho.

const MODOS = [
  {
    chave: 'evolution',
    nome: 'Evolution (API)',
    para: 'Mensagens automáticas',
    explica: 'A plataforma envia confirmação de pedido, aviso de entrega e cobrança sozinha — mesmo com o app fechado.',
    conectar: 'Conectar por QR',
  },
  {
    chave: 'web',
    nome: 'WhatsApp Web',
    para: 'Atender no balcão',
    explica: 'A conversa de sempre, embutida aqui dentro. Para ver e responder cliente sem sair do app.',
    conectar: 'Abrir aqui dentro',
  },
]

// Os estados que /api/admin/whatsapp/status devolve, ditos em português.
const ESTADO = {
  open: { rotulo: 'conectado', cor: '#0A7A3E', bg: '#E7FAF0', pulso: true },
  connecting: { rotulo: 'conectando…', cor: '#8a6508', bg: '#fff3cc', pulso: true },
  close: { rotulo: 'desconectado', cor: '#b42318', bg: '#fdeaea', pulso: false },
  sem_config: { rotulo: 'não configurado', cor: '#4b5563', bg: '#eef0f3', pulso: false },
  indisponivel: { rotulo: 'desligado', cor: '#4b5563', bg: '#eef0f3', pulso: false },
}

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function selo(chave) {
  const e = ESTADO[chave] || ESTADO.indisponivel
  return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;'
    + 'padding:5px 11px;border-radius:999px;background:' + e.bg + ';color:' + e.cor + '">'
    + '<span class="' + (e.pulso ? 'epulso' : '') + '" style="width:7px;height:7px;border-radius:50%;'
    + 'background:' + e.cor + ';display:inline-block"></span>' + esc(e.rotulo) + '</span>'
}

/** Um caminho de conexão. `ligado` diz qual está valendo agora. */
function cartao(modo, dados) {
  const estadoWeb = dados.webAberto ? 'open' : 'close'
  const estado = modo.chave === 'evolution' ? (dados.estado || 'indisponivel') : estadoWeb
  const ligado = dados.modo === modo.chave
  const conectado = estado === 'open'

  const acao = modo.chave === 'web'
    ? (dados.webAberto ? 'whatsapp:fechar-web' : 'whatsapp:abrir-web')
    : (conectado ? 'whatsapp:desconectar' : 'whatsapp:conectar')
  const rotulo = modo.chave === 'web'
    ? (dados.webAberto ? 'Fechar a conversa' : modo.conectar)
    : (conectado ? 'Desconectar' : modo.conectar)

  return '<div class="ecard ecard-vivo" data-modo-whats="' + esc(modo.chave) + '" style="padding:0;overflow:hidden;'
    + 'border:1.5px solid ' + (ligado ? 'var(--acento)' : '#e8eaee') + '">'
    + '<div style="padding:18px 20px 16px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px">'
    + '<span style="font-size:15px;font-weight:800;color:#111">' + esc(modo.nome) + '</span>'
    + selo(estado) + '</div>'
    + '<div style="font-size:11.5px;font-weight:800;color:var(--acento-texto);text-transform:uppercase;'
    + 'letter-spacing:.06em;margin-bottom:8px">' + esc(modo.para) + '</div>'
    + '<div style="font-size:13px;color:#6b7280;font-weight:500;line-height:1.55;min-height:58px">'
    + esc(modo.explica) + '</div>'
    + '<button type="button" data-acao="' + esc(acao) + '" style="width:100%;height:40px;margin-top:14px;'
    + 'border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;transition:filter .15s ease;'
    + (conectado || (modo.chave === 'web' && dados.webAberto)
      ? 'border:1px solid #e5e7eb;background:#fff;color:#111'
      : 'border:none;background:var(--acento);color:#fff') + '">' + esc(rotulo) + '</button>'
    + '</div></div>'
}

/** QR do Evolution: aparece enquanto o pareamento não termina. */
function areaQr(dados) {
  if (!dados.qr) return ''
  const src = ('' + dados.qr).indexOf('data:') === 0 ? dados.qr : 'data:image/png;base64,' + dados.qr
  return '<div class="ecard" style="padding:22px;margin-top:16px;display:flex;gap:22px;align-items:center;flex-wrap:wrap">'
    + '<img src="' + esc(src) + '" alt="QR do WhatsApp" style="width:196px;height:196px;border-radius:12px;background:#fff">'
    + '<div style="flex:1;min-width:220px">'
    + '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:8px">Leia o código no celular</div>'
    + '<div style="font-size:13px;color:#6b7280;font-weight:500;line-height:1.6">'
    + 'WhatsApp → Aparelhos conectados → Conectar aparelho. O código vale por poucos minutos;'
    + ' se expirar, peça outro no botão.</div>'
    + (dados.pairingCode
      ? '<div style="margin-top:12px;font-size:13px;color:#111;font-weight:700">Ou digite o código: '
        + '<span style="font-family:ui-monospace,monospace;letter-spacing:.12em">' + esc(dados.pairingCode) + '</span></div>'
      : '')
    + '</div></div>'
}

function htmlWhatsapp(dados, estado) {
  dados = dados || {}
  estado = estado || {}
  const cabecalho = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;'
    + 'flex-wrap:wrap;margin-bottom:18px">'
    + '<div><div style="font-size:19px;font-weight:800;color:#111;letter-spacing:-.02em">WhatsApp</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:4px">'
    + 'Escolha por onde a loja fala com o cliente — dá para usar os dois ao mesmo tempo</div></div>'
    + (dados.numero
      ? '<span class="echip">número ' + esc(dados.numero) + '</span>'
      : '') + '</div>'

  const cartoes = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;'
    + 'animation:eloFadeUp .4s ease both">'
    + MODOS.map((m) => cartao(m, dados)).join('') + '</div>'

  const rodape = '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:16px">'
    + 'as credenciais do Evolution ficam em Configurações › WhatsApp</div>'

  return '<div>' + cabecalho + cartoes + areaQr(dados) + rodape + '</div>'
}

module.exports = { htmlWhatsapp, MODOS, ESTADO, selo }
