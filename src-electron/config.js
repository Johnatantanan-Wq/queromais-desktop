/**
 * config.js — fonte única de configuração do app.
 * Lê do electron-store (persistente por usuário) com fallback ao .env (dev).
 * Quando o login for implementado, só este arquivo muda.
 */
require('dotenv').config()
const Store = require('electron-store')
const brand = require('./brand')

const _store = new Store({ name: 'queromais-config' })

// Projeto Supabase do cardápio — valores PÚBLICOS (os mesmos embutidos em
// toda página do site). Fallback pra máquina nova sem .env: com eles + a
// loja autodescoberta (main.js), outbox e bot funcionam sem configurar nada.
const SUPABASE_URL_PADRAO = 'https://ztsotpvtlfdtblyornrd.supabase.co'
const SUPABASE_ANON_PADRAO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0c290cHZ0bGZkdGJseW9ybnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTYyODksImV4cCI6MjA5NTY5MjI4OX0.zEmzYl3Kxo-bRip1137AAkGB7JRcvOZ-kyTYgzCnHm0'

// Na primeira execução, semeia o store com os valores do .env
function initConfig() {
  if (!_store.get('supabase_url') && process.env.SUPABASE_URL) {
    _store.set('supabase_url',       process.env.SUPABASE_URL)
    _store.set('supabase_anon_key',  process.env.SUPABASE_ANON_KEY)
    _store.set('loja_id',            process.env.LOJA_ID)
    _store.set('cardapio_admin_url',
      process.env.CARDAPIO_ADMIN_URL || brand.dominio_admin)
  }
}

function getConfig() {
  return {
    supabaseUrl:    _store.get('supabase_url')      || process.env.SUPABASE_URL      || SUPABASE_URL_PADRAO,
    supabaseKey:    _store.get('supabase_anon_key') || process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_PADRAO,
    lojaId:         _store.get('loja_id')           || process.env.LOJA_ID           || '',
    cardapioUrl:    _store.get('cardapio_admin_url')|| process.env.CARDAPIO_ADMIN_URL || brand.dominio_admin,
    // URL HTTP de uma fila IPP/CUPS (ex.: http://192.168.64.1:631/printers/POS80_ESCPOS).
    // Quando definida, a comanda vira PDF (printToPDF) e vai DIRETO pra fila via IPP,
    // sem passar pelo spooler/driver do Windows — o silent print do Electron gera
    // PDF em branco com o Microsoft IPP Class Driver.
    impressoraIppUrl: _store.get('impressora_ipp_url') || process.env.IMPRESSORA_IPP_URL || '',
    // Última impressora usada com sucesso — fallback quando o pedido de
    // impressão chega SEM nome (senão cai na padrão do Windows, ex.: HP).
    impressoraNome: _store.get('impressora_nome') || '',
    // Sessão real do admin (capturada da view autenticada — main.js), usada
    // por outbox/bot pra autenticar como o usuário de verdade em vez da chave
    // anon compartilhada. Sem isto, RLS (is_admin_da_loja) bloqueia leitura/
    // escrita em whatsapp_envios/whatsapp_config/whatsapp_bot_envios.
    waAccessToken: _store.get('wa_access_token') || '',
    waRefreshToken: _store.get('wa_refresh_token') || '',
  }
}

function setConfig(values) {
  Object.entries(values).forEach(([k, v]) => _store.set(k, v))
}

function hasConfig() {
  return !!(getConfig().lojaId && getConfig().supabaseUrl)
}

module.exports = { initConfig, getConfig, setConfig, hasConfig }
