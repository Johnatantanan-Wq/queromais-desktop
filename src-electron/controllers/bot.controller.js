/**
 * Controller do bot — atendimento automático estilo Anota AI, adaptado:
 *  • Mensagem recebida → responde com boas-vindas + LINK do cardápio DA LOJA
 *    (dominio da marca + slug da loja: funciona pra toda marca e toda loja).
 *  • O pedido acontece no cardápio web — o bot NÃO vende por número no chat
 *    (o fluxo antigo criava pedidos paralelos sem endereço e respondia
 *    "Cardápio indisponível" quando não achava produtos).
 *  • As notificações ativas (pedido recebido/preparo/entrega…) são o
 *    outbox.controller — este arquivo só cuida das mensagens RECEBIDAS.
 *  • Anti-interferência: fora de saudação explícita, o bot responde no máximo
 *    1x por conversa a cada 6h — quem conversa com o cliente é o atendente.
 */
const { createClient } = require('@supabase/supabase-js')
const log = require('electron-log')
const { getConfig } = require('../config')
const brand = require('../brand')

let _supabase = null
function getSupabase() {
  if (!_supabase) {
    const { supabaseUrl, supabaseKey } = getConfig()
    if (!supabaseUrl || !supabaseKey) { log.warn('[BOT] Supabase não configurado'); return null }
    _supabase = createClient(supabaseUrl, supabaseKey)
  }
  return _supabase
}

// ── Loja (nome + link do cardápio próprio) ────────────────────────────────────
let cacheLoja = null
let cacheLojaAt = 0

async function buscarLoja() {
  if (cacheLoja && Date.now() - cacheLojaAt < 10 * 60 * 1000) return cacheLoja
  const { lojaId } = getConfig()
  const supabase = getSupabase()
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

// ── Controle por conversa (anti-flood) ────────────────────────────────────────
const conversas = new Map() // from → { ultimaRespostaEm }
// QUALQUER mensagem recebida ganha boas-vindas + link do cardápio (pedido do
// dono: o cliente não precisa mandar "oi"). O cooldown só evita repetir o
// link a cada mensagem numa conversa em andamento com o atendente.
const COOLDOWN_MS = 10 * 60 * 1000

// Limpa conversas antigas a cada hora
setInterval(() => {
  const limite = Date.now() - 24 * 60 * 60 * 1000
  for (const [from, c] of conversas) {
    if (c.ultimaRespostaEm < limite) conversas.delete(from)
  }
}, 60 * 60 * 1000)

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

    const conversa = conversas.get(from) || { ultimaRespostaEm: 0 }
    const desdeUltima = Date.now() - conversa.ultimaRespostaEm
    const deveResponder = desdeUltima > COOLDOWN_MS

    log.info(`[BOT] ${from} "${texto.slice(0, 60)}" responder=${deveResponder}`)
    if (!deveResponder) return

    const { whatsappController } = require('./whatsapp.controller')
    conversas.set(from, { ultimaRespostaEm: Date.now() })
    await whatsappController.enviarTexto(from, mensagemBoasVindas(nome, loja))
  },
}

module.exports = { botController }
