/**
 * Controller do bot — atendimento automático por WhatsApp:
 *  • Mensagem recebida → responde com boas-vindas + LINK do cardápio DA LOJA
 *    (dominio da marca + slug da loja: funciona pra toda marca e toda loja).
 *  • O pedido acontece no cardápio web — o bot NÃO vende por número no chat
 *    (o fluxo antigo criava pedidos paralelos sem endereço e respondia
 *    "Cardápio indisponível" quando não achava produtos).
 *  • As notificações ativas (pedido recebido/preparo/entrega…) são o
 *    outbox.controller — este arquivo só cuida das mensagens RECEBIDAS.
 *  • Anti-interferência: o cardápio automático sai NO MÁXIMO 1x por dia por
 *    contato — depois disso, quem conversa com o cliente é o atendente
 *    humano. O controle é persistido no Supabase (whatsapp_bot_envios,
 *    migration 0105 do repo `aula`), não em memória: reiniciar o app não
 *    reseta o dia (era o bug — cooldown de 10min num Map() que zerava a
 *    cada restart, reenviando o link a qualquer troca de mensagem).
 *  • Cliente com pedido nas últimas 24h NÃO recebe boas-vindas nenhuma —
 *    "obrigado, chegou" depois da entrega não pode ganhar link de cardápio
 *    de volta (quem fala com ele são as notificações do pedido/atendente).
 */
const { createClient } = require('@supabase/supabase-js')
const log = require('electron-log')
const { getConfig } = require('../config')
const brand = require('../brand')

let _supabase = null
let _sessaoAplicadaToken = null
async function getSupabase() {
  if (!_supabase) {
    const { supabaseUrl, supabaseKey } = getConfig()
    if (!supabaseUrl || !supabaseKey) { log.warn('[BOT] Supabase não configurado'); return null }
    _supabase = createClient(supabaseUrl, supabaseKey)
  }
  // Autentica como o admin REAL (RLS is_admin_da_loja) — sem isto a chave anon
  // compartilhada não enxerga whatsapp_bot_envios (mesmo motivo do outbox: a
  // migration 0094 fechou o acesso anon a esta família de tabelas).
  const { waAccessToken, waRefreshToken } = getConfig()
  if (waAccessToken && waAccessToken !== _sessaoAplicadaToken) {
    const { error } = await _supabase.auth.setSession({ access_token: waAccessToken, refresh_token: waRefreshToken })
    if (error) log.error('[BOT] Falha ao aplicar sessão do admin:', error)
    else _sessaoAplicadaToken = waAccessToken
  }
  return _supabase
}

// ── Loja (nome + link do cardápio próprio) ────────────────────────────────────
let cacheLoja = null
let cacheLojaAt = 0

async function buscarLoja() {
  if (cacheLoja && Date.now() - cacheLojaAt < 10 * 60 * 1000) return cacheLoja
  const { lojaId } = getConfig()
  const supabase = await getSupabase()
  if (!lojaId || !supabase) return null
  const { data, error } = await supabase
    .from('lojas')
    .select('id, nome, slug')
    .eq('id', lojaId)
    .maybeSingle()
  if (error || !data) { log.error('[BOT] Erro ao buscar loja:', error); return null }
  cacheLoja = data
  cacheLojaAt = Date.now()
  return cacheLoja
}

function linkCardapio(loja) {
  const base = (brand.dominio_cardapio || '').replace(/\/$/, '')
  if (!base) return null
  // Mesmo link do canal WhatsApp do modal "Links" do admin: o ?src=wpp marca a
  // origem no navegador do cliente e o Insights atribui a venda ao WhatsApp.
  const caminho = loja?.slug ? `${base}/${loja.slug}` : base
  return `${caminho}?src=wpp`
}

// ── Controle por dia (persistido — sobrevive a restart do app) ───────────────
const TIPO_MSG = 'cardapio_automatico'

// Data local (YYYY-MM-DD) da máquina do lojista — "dia" aqui é dia civil, não
// uma janela deslizante de 24h.
function dataDeHoje() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Reivindica o envio de hoje ANTES de mandar a mensagem: o INSERT é a própria
// trava (índice único uq_whatsapp_bot_envios_dia) — se outra mensagem quase
// simultânea do mesmo contato já reivindicou, este perde a corrida (23505) e
// não envia de novo. Falha de qualquer outro tipo (rede, tabela ausente por
// migration não aplicada) também não envia — silêncio é mais seguro que
// reenviar sem controle.
async function reivindicarEnvioHoje(supabase, lojaId, telefone) {
  const { error } = await supabase
    .from('whatsapp_bot_envios')
    .insert({ loja_id: lojaId, telefone, tipo_mensagem: TIPO_MSG, data_envio: dataDeHoje() })
  if (error && error.code !== '23505') log.error('[BOT] Falha ao registrar envio do dia:', error)
  return !error
}

// ── Cliente em atendimento (pedido recente) ──────────────────────────────────
// O `from` vem como "5575988289808@c.us"; pedidos.cliente_telefone guarda só
// DDD+número sem o 55 (às vezes sem o 9º dígito). Normaliza os dois pra
// DDD + últimos 8 dígitos antes de comparar.
function normalizarTelefone(v) {
  let d = String(v || '').replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  if (d.length < 10) return null
  return d.slice(0, 2) + d.slice(-8)
}

const JANELA_PEDIDO_RECENTE_MS = 24 * 60 * 60 * 1000

// Pedido nas últimas 24h = cliente já está comprando: qualquer mensagem dele
// ("obrigado", "chegou", dúvida) é conversa do pedido, nunca gatilho de
// boas-vindas. Falha na consulta NÃO silencia o bot (a trava diária ainda
// segura reenvio) — só perde esta proteção extra.
async function contatoComPedidoRecente(supabase, lojaId, from) {
  const alvo = normalizarTelefone(from)
  if (!alvo) return false
  const desde = new Date(Date.now() - JANELA_PEDIDO_RECENTE_MS).toISOString()
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, cliente_telefone')
    .eq('loja_id', lojaId)
    .gte('criado_em', desde)
    .like('cliente_telefone', `%${alvo.slice(-8)}`)
    .limit(5)
  if (error) { log.error('[BOT] Falha ao consultar pedido recente:', error); return false }
  return (data || []).some((p) => normalizarTelefone(p.cliente_telefone) === alvo)
}

function mensagemBoasVindas(nome, loja) {
  const url = linkCardapio(loja)
  const nomeStr = nome ? `, ${String(nome).split(' ')[0]}` : ''
  const nomeLoja = loja?.nome || brand.nome_delivery
  return (
    `Olá${nomeStr}! 😊 Bem-vindo ao *${nomeLoja}*!\n\n` +
    `Faça seu pedido pelo nosso cardápio:\n👉 ${url}\n\n` +
    `Assim que você pedir, eu te aviso por aqui a cada etapa (confirmação, preparo e entrega). ✅`
  )
}

const botController = {
  init() {
    // nada a inicializar por enquanto
  },

  async responder(msg) {
    if (!global.bot_enabled) return   // bot pausado pelo botão da sidebar
    const from = msg.from || ''
    // grupos/status/broadcast nunca recebem resposta automática
    if (!from.endsWith('@c.us')) return

    const texto = (msg.message || '').trim()
    const nome = msg.name || ''

    // Sem loja configurada / sem link → silêncio (nunca responder errado)
    const loja = await buscarLoja()
    const url = linkCardapio(loja)
    if (!url) { log.warn('[BOT] Sem loja/link configurado — não vou responder'); return }

    const supabase = await getSupabase()
    if (!supabase || !loja?.id) { log.warn('[BOT] Sem Supabase/loja — não vou responder'); return }

    // Antes de reivindicar a cota do dia: cliente com pedido recente está
    // agradecendo/conversando sobre o pedido — silêncio (e a cota do dia
    // fica intacta pra uma conversa realmente nova no futuro).
    if (await contatoComPedidoRecente(supabase, loja.id, from)) {
      log.info(`[BOT] ${from} tem pedido nas últimas 24h — não respondo`)
      return
    }

    const podeEnviar = await reivindicarEnvioHoje(supabase, loja.id, from)
    log.info(`[BOT] ${from} "${texto.slice(0, 60)}" enviaCardapio=${podeEnviar}`)
    if (!podeEnviar) return // já recebeu o cardápio hoje — atendente humano assume

    const { whatsappController } = require('./whatsapp.controller')
    await whatsappController.enviarTexto(from, mensagemBoasVindas(nome, loja))
  },
}

module.exports = { botController }
