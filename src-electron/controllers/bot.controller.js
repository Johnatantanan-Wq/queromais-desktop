/**
 * Controller do bot — fluxo de regras para atendimento pelo WhatsApp.
 * Estados: IDLE → CARDAPIO → ESCOLHA_ITEM → QUANTIDADE → CONFIRMAR → PAGO
 */
const { createClient } = require('@supabase/supabase-js')
const log = require('electron-log')
const { getConfig } = require('../config')

let _supabase = null
function getSupabase() {
  if (!_supabase) {
    const { supabaseUrl, supabaseKey } = getConfig()
    if (!supabaseUrl || !supabaseKey) { log.warn('[BOT] Supabase não configurado'); return null }
    _supabase = createClient(supabaseUrl, supabaseKey)
  }
  return _supabase
}

// Estado de cada conversa (por número de telefone)
const sessoes = new Map()
const TIMEOUT_MS = 20 * 60 * 1000 // 20 min sem atividade → reset

// Cache do cardápio em memória (atualiza a cada 5 min)
let cacheCardapio = null
let cacheCardapioAt = 0

function estadoInicial() {
  return { estado: 'IDLE', item: null, qtd: 1, carrinho: [], ultimaAtividade: Date.now() }
}

function getSessao(from) {
  const sessao = sessoes.get(from)
  // Sessão expirada por inatividade → reseta
  if (sessao && Date.now() - sessao.ultimaAtividade > TIMEOUT_MS) {
    sessoes.set(from, estadoInicial())
  }
  if (!sessoes.has(from)) sessoes.set(from, estadoInicial())
  const s = sessoes.get(from)
  s.ultimaAtividade = Date.now()
  return s
}

// Limpa sessões inativas a cada hora
setInterval(() => {
  const limite = Date.now() - TIMEOUT_MS
  for (const [from, s] of sessoes) {
    if (s.ultimaAtividade < limite) sessoes.delete(from)
  }
}, 60 * 60 * 1000)

async function buscarCardapio() {
  if (cacheCardapio && Date.now() - cacheCardapioAt < 5 * 60 * 1000) return cacheCardapio
  const { lojaId } = getConfig()
  if (!lojaId) return []

  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('produtos')
    .select('id, nome, preco, categoria_id, ativo')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .order('nome')

  if (error) { log.error('[BOT] Erro ao buscar cardápio:', error); return [] }
  cacheCardapio = data || []
  cacheCardapioAt = Date.now()
  return cacheCardapio
}

async function criarPedido(from, nome, itens) {
  const { lojaId } = getConfig()
  if (!lojaId) return null
  const total = itens.reduce((s, i) => s + i.preco * i.qtd, 0)
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('pedidos')
    .insert({
      loja_id: lojaId,
      cliente_telefone: from.replace('@c.us', '').replace(/\D/g, ''),
      cliente_nome: nome || 'Cliente WhatsApp',
      tipo: 'retirada',
      status: 'recebido',
      total,
      items: itens.map(i => ({
        produto_id: i.id,
        nome: i.nome,
        qtd: i.qtd,
        preco_base: i.preco,
        sabores: [],
        observacao: '',
      })),
      observacao: 'Pedido via WhatsApp',
      origem: 'whatsapp',
    })
    .select('id, numero')
    .single()

  if (error) { log.error('[BOT] Erro ao criar pedido:', error); return null }
  return data
}

// ─── Formatadores ─────────────────────────────────────────────────────────────

function brl(v) { return 'R$' + Number(v).toFixed(2).replace('.', ',') }

function formatarCardapio(produtos) {
  if (!produtos.length) return 'Cardápio indisponível no momento.'
  let txt = '📋 *Nosso cardápio:*\n\n'
  produtos.forEach((p, i) => {
    txt += `${i + 1}️⃣ ${p.nome} — ${brl(p.preco)}\n`
  })
  txt += '\n👉 Responda o *número* do item que deseja pedir'
  return txt
}

function formatarCarrinho(carrinho) {
  let txt = '🛒 *Seu pedido:*\n'
  let total = 0
  for (const item of carrinho) {
    txt += `• ${item.qtd}x ${item.nome} — ${brl(item.preco * item.qtd)}\n`
    total += item.preco * item.qtd
  }
  txt += `\n💰 *Total: ${brl(total)}*`
  return txt
}

// ─── Motor de regras ──────────────────────────────────────────────────────────

const GREETINGS  = /^(oi|olá|ola|hello|hi|bom\s*dia|boa\s*tarde|boa\s*noite|cardápio|cardapio|menu|quero\s*pedir|pedir|pedido|iniciar|começar|comecar|start|comprar)$/i
const AJUDA      = /^(ajuda|help|socorro|\?)$/i
const CANCELAR   = /^(cancel|cancelar|sair|não\s*quero|nao\s*quero|voltar|recomeçar|recomecar)$/i

const botController = {
  init() {
    // nada a inicializar por enquanto
  },

  async responder(msg) {
    if (!global.bot_enabled) return   // bot pausado pelo botão da sidebar
    const { whatsappController } = require('./whatsapp.controller')
    const from = msg.from
    const texto = (msg.message || '').trim().toLowerCase()
    const nome = msg.name || ''
    const sessao = getSessao(from)

    const reply = (text) => whatsappController.enviarTexto(from, text)

    log.info(`[BOT] ${from} [${sessao.estado}] "${texto}"`)

    // ── IDLE ──────────────────────────────────────────────────────────────────
    if (sessao.estado === 'IDLE') {
      if (GREETINGS.test(texto)) {
        const produtos = await buscarCardapio()
        sessao._produtos = produtos
        sessao.carrinho = []
        sessao.estado = 'ESCOLHA_ITEM'
        const nomeStr = nome ? `, ${nome.split(' ')[0]}` : ''
        await reply(`Olá${nomeStr}! 😊 Bem-vindo ao *Quero Mais Delivery*!\n\n${formatarCardapio(produtos)}`)
      } else {
        await reply('Olá! 😊 Manda *oi* pra ver nosso cardápio e fazer seu pedido!')
      }
      return
    }

    // Ajuda em qualquer estado
    if (AJUDA.test(texto)) {
      await reply(
        '💬 *Como pedir:*\n\n' +
        '• Mande *oi* para ver o cardápio\n' +
        '• Responda com o *número* do item\n' +
        '• Diga a *quantidade*\n' +
        '• Confirme com *sim*\n\n' +
        'Para cancelar a qualquer momento: *cancelar*'
      )
      return
    }

    // Cancelar em qualquer estado
    if (CANCELAR.test(texto)) {
      sessoes.set(from, estadoInicial())
      await reply('Ok, pedido cancelado. 😊 Qualquer hora é só mandar *oi* pra recomeçar!')
      return
    }

    // ── ESCOLHA_ITEM ──────────────────────────────────────────────────────────
    if (sessao.estado === 'ESCOLHA_ITEM') {
      const produtos = sessao._produtos || (await buscarCardapio())
      sessao._produtos = produtos

      const num = parseInt(texto, 10)
      if (isNaN(num) || num < 1 || num > produtos.length) {
        // Tenta verificar se quer confirmar o carrinho atual
        if (sessao.carrinho.length > 0 && /^(confirmar|confirma|finali|ok|sim)$/i.test(texto)) {
          sessao.estado = 'CONFIRMAR'
          await reply(`${formatarCarrinho(sessao.carrinho)}\n\n✅ Confirma o pedido? Responda *sim* ou *não*`)
          return
        }
        await reply(`Por favor, responda com o *número* do item.\n\n${formatarCardapio(produtos)}`)
        return
      }

      sessao.item = produtos[num - 1]
      sessao.estado = 'QUANTIDADE'
      await reply(`Ótimo! *${sessao.item.nome}* (${brl(sessao.item.preco)}).\n\nQuantas unidades deseja? Responda apenas o número.`)
      return
    }

    // ── QUANTIDADE ────────────────────────────────────────────────────────────
    if (sessao.estado === 'QUANTIDADE') {
      const qtd = parseInt(texto, 10)
      if (isNaN(qtd) || qtd < 1 || qtd > 20) {
        await reply('Por favor, responda com a quantidade (número entre 1 e 20).')
        return
      }

      sessao.carrinho.push({ ...sessao.item, qtd })
      sessao.estado = 'ESCOLHA_ITEM'

      const subtotal = brl(sessao.item.preco * qtd)
      const produtos = sessao._produtos || (await buscarCardapio())
      await reply(
        `✅ *${qtd}x ${sessao.item.nome}* adicionado! (${subtotal})\n\n` +
        `Deseja mais algum item? Escolha abaixo ou responda *confirmar* para finalizar:\n\n${formatarCardapio(produtos)}`
      )
      return
    }

    // ── CONFIRMAR ─────────────────────────────────────────────────────────────
    if (sessao.estado === 'CONFIRMAR') {
      if (/^(sim|s|confirmar|ok|pode|yes)$/i.test(texto)) {
        await reply('⏳ Registrando seu pedido...')
        const pedido = await criarPedido(from, nome, sessao.carrinho)
        sessoes.set(from, estadoInicial())

        if (pedido) {
          await reply(
            `🎉 *Pedido #${pedido.numero || pedido.id?.slice(0, 6)} confirmado!*\n\n` +
            `${formatarCarrinho(sessao.carrinho || [])}\n\n` +
            `⏰ Aguarde! Em breve entraremos em contato. Obrigado! 😊`
          )
        } else {
          await reply('❌ Não foi possível registrar o pedido. Por favor, ligue para nós ou tente novamente.')
        }
      } else if (/^(não|nao|n|no|cancelar)$/i.test(texto)) {
        sessao.estado = 'ESCOLHA_ITEM'
        const produtos = sessao._produtos || (await buscarCardapio())
        await reply(`Ok! Veja o cardápio novamente:\n\n${formatarCardapio(produtos)}`)
      } else {
        await reply(`Responda *sim* para confirmar ou *não* para alterar o pedido.\n\n${formatarCarrinho(sessao.carrinho)}`)
      }
      return
    }
  },
}

module.exports = { botController }
