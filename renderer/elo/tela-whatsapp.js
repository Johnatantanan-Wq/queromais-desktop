// renderer/elo/tela-whatsapp.js — WhatsApp: a conexão e a configuração.
//
// Espelha Configurações › WhatsApp do painel, que é a MESMA tela (lá a aba de
// Configurações aponta para /admin/whatsapp). São cinco caminhos, e a loja usa um:
//
//   Desativado     — nada sai automático
//   App Desktop    — envia pelo WhatsApp Web deste computador (precisa do app aberto)
//   Evolution API  — servidor próprio, conecta por QR; funciona com o app fechado
//   Z-API          — serviço de terceiro
//   Meta Cloud API — a oficial, com templates aprovados
//
// Os dois que o lojista de fato escolhe são App Desktop e Evolution: um usa a máquina
// do balcão, o outro roda sozinho. Por isso o botão de cada um diz o que falta nele.

const PROVEDORES = [
  { id: 'desativado', titulo: 'Desativado', desc: 'Nenhuma mensagem é enviada automaticamente.',
    marcas: ['Sem custo', 'Sem credenciais'], campos: [] },
  { id: 'wabot', titulo: 'App Desktop', tag: 'recomendado',
    desc: 'Envia pelo WhatsApp Web deste computador. Precisa do app aberto na loja.',
    marcas: ['Sem custo extra', 'Sem API externa'], campos: [] },
  { id: 'evolution', titulo: 'Evolution API',
    desc: 'Conecta por QR uma vez e continua enviando com o app fechado.',
    marcas: ['Roda sozinho', 'Texto livre'],
    campos: [
      { chave: 'evolution_url', rotulo: 'Endereço do servidor', segredo: false },
      { chave: 'evolution_instance', rotulo: 'Instância', segredo: false },
      { chave: 'evolution_api_key', rotulo: 'Chave da API', segredo: true, tem: 'tem_evolution_api_key' },
    ] },
  { id: 'z_api', titulo: 'Z-API', tag: 'não-oficial', desc: 'Conecta o WhatsApp pessoal da loja.',
    marcas: ['Configuração rápida', 'Serviço de terceiro'],
    campos: [
      { chave: 'zapi_instance_id', rotulo: 'ID da instância', segredo: false },
      { chave: 'zapi_token', rotulo: 'Token', segredo: true, tem: 'tem_zapi_token' },
    ] },
  { id: 'cloud_api', titulo: 'Meta Cloud API', tag: 'oficial', desc: 'API oficial da Meta, sem intermediário.',
    marcas: ['Direto com a Meta', 'Templates aprovados'],
    campos: [
      { chave: 'phone_number_id', rotulo: 'ID do número', segredo: false },
      { chave: 'access_token', rotulo: 'Token de acesso', segredo: true, tem: 'tem_access_token' },
    ] },
]

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

function marca(t) {
  return '<span style="font-size:11px;font-weight:700;color:#6b7280;background:#f4f5f7;border-radius:6px;'
    + 'padding:3px 8px">' + esc(t) + '</span>'
}

/** Um provedor. O escolhido fica com a borda do acento. */
function cartaoProvedor(p, escolhido) {
  const on = p.id === escolhido
  return '<button type="button" data-provedor-whats="' + esc(p.id) + '" class="ecard ecard-vivo"'
    + ' style="text-align:left;padding:16px 18px;cursor:pointer;font-family:inherit;display:block;width:100%;'
    + 'border:1.5px solid ' + (on ? 'var(--acento)' : '#e8eaee') + ';background:' + (on ? 'var(--acento-suave)' : '#fff') + '">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
    + '<span style="font-size:14px;font-weight:800;color:#111">' + esc(p.titulo) + '</span>'
    + (p.tag ? '<span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;'
      + 'color:var(--acento-texto);background:#fff;border:1px solid var(--acento);border-radius:5px;'
      + 'padding:2px 6px">' + esc(p.tag) + '</span>' : '')
    + (on ? '<span style="margin-left:auto;font-size:12px;font-weight:800;color:var(--acento-texto)">✓ em uso</span>' : '')
    + '</div>'
    + '<div style="font-size:12.5px;color:#6b7280;font-weight:500;line-height:1.5;margin-bottom:8px">'
    + esc(p.desc) + '</div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap">' + p.marcas.map(marca).join('') + '</div>'
    + '</button>'
}

/** As credenciais do provedor escolhido. Segredo já gravado não volta do servidor. */
function credenciais(p, dados) {
  if (!p.campos.length) return ''
  if (p.id === 'evolution' && dados.evolution_gerenciada) {
    return '<div style="background:#E7FAF0;border-radius:10px;padding:12px 14px;font-size:12.5px;'
      + 'color:#0A7A3E;font-weight:600;line-height:1.5">'
      + 'A plataforma tem servidor próprio: não é preciso preencher nada, basta conectar pelo QR.</div>'
  }
  return p.campos.map((c) => {
    const guardado = c.tem && dados[c.tem]
    const valor = c.segredo ? '' : (dados[c.chave] || '')
    return '<label style="display:block;margin-bottom:12px">'
      + '<span style="display:block;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;'
      + 'letter-spacing:.06em;margin-bottom:5px">' + esc(c.rotulo)
      + (guardado ? '<span style="color:#0A7A3E;margin-left:6px">• já preenchido</span>' : '') + '</span>'
      + '<input data-campo-whats="' + esc(c.chave) + '" value="' + esc(valor) + '" autocomplete="off"'
      + (c.segredo ? ' type="password" placeholder="' + (guardado ? 'deixe em branco para manter' : '') + '"' : '')
      + ' style="width:100%;height:38px;border:1px solid #e5e7eb;border-radius:9px;padding:0 11px;'
      + 'font-family:inherit;font-size:13px;color:#111;box-sizing:border-box"></label>'
  }).join('')
}

function areaQr(dados) {
  if (!dados.qr) return ''
  const src = ('' + dados.qr).indexOf('data:') === 0 ? dados.qr : 'data:image/png;base64,' + dados.qr
  return '<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:16px;'
    + 'padding-top:16px;border-top:1px solid #eef0f3">'
    + '<img src="' + esc(src) + '" alt="QR do WhatsApp" style="width:170px;height:170px;border-radius:10px;background:#fff">'
    + '<div style="flex:1;min-width:200px">'
    + '<div style="font-size:14px;font-weight:800;color:#111;margin-bottom:6px">Leia o código no celular</div>'
    + '<div style="font-size:12.5px;color:#6b7280;font-weight:500;line-height:1.6">'
    + 'WhatsApp → Aparelhos conectados → Conectar aparelho. O código vale por poucos minutos.</div>'
    + (dados.pairingCode
      ? '<div style="margin-top:10px;font-size:12.5px;color:#111;font-weight:700">Ou digite: '
        + '<span style="font-family:ui-monospace,monospace;letter-spacing:.12em">' + esc(dados.pairingCode) + '</span></div>'
      : '') + '</div></div>'
}

function botao(acao, rotulo, primaria) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:38px;padding:0 16px;border-radius:10px;'
    + 'font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer;' + (primaria
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}

/** O que dá para fazer no provedor escolhido. */
function acoesDoProvedor(p, dados) {
  const conectado = dados.estado === 'open'
  if (p.id === 'wabot') {
    // App Desktop = o WhatsApp Web desta janela. Quem "conecta" é abrir a conversa.
    return dados.webAberto
      ? botao('whatsapp:fechar-web', 'Fechar a conversa', false)
      : botao('whatsapp:abrir-web', 'Abrir a conversa aqui', true)
  }
  if (p.id === 'evolution') {
    return (conectado
      ? botao('whatsapp:desconectar', 'Desconectar', false)
      : botao('whatsapp:conectar', 'Conectar por QR', true))
  }
  return ''
}

function htmlWhatsapp(dados, estado) {
  dados = dados || {}
  estado = estado || {}
  const escolhido = estado.provedorWhats || dados.provedor || 'desativado'
  const p = PROVEDORES.find((x) => x.id === escolhido) || PROVEDORES[0]
  const mudou = escolhido !== (dados.provedor || 'desativado')

  const cabecalho = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;'
    + 'flex-wrap:wrap;margin-bottom:18px">'
    + '<div><div style="font-size:19px;font-weight:800;color:#111;letter-spacing:-.02em">WhatsApp</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:4px">'
    + 'Por onde a loja fala com o cliente — é a mesma configuração de Configurações › WhatsApp</div></div>'
    + selo(dados.estado || 'indisponivel') + '</div>'

  const coluna1 = '<div>'
    + '<div style="font-size:12px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.08em;'
    + 'margin-bottom:10px">Conexão</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px">'
    + PROVEDORES.map((x) => cartaoProvedor(x, escolhido)).join('') + '</div></div>'

  const coluna2 = '<div class="ecard" style="padding:20px;align-self:start">'
    + '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">' + esc(p.titulo) + '</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-bottom:16px">' + esc(p.desc) + '</div>'
    + credenciais(p, dados)
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">'
    + acoesDoProvedor(p, dados)
    + (mudou || p.campos.length ? botao('whatsapp:salvar:' + p.id, 'Salvar', mudou) : '')
    + '</div>'
    + areaQr(dados)
    + '</div>'

  return '<div>' + cabecalho
    + '<div style="display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:18px;align-items:start;'
    + 'animation:eloFadeUp .4s ease both">' + coluna1 + coluna2 + '</div></div>'
}

module.exports = { htmlWhatsapp, PROVEDORES, ESTADO, selo }
