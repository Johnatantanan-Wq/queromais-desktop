/**
 * config.js — fonte única de configuração do app.
 * Lê do electron-store (persistente por usuário) com fallback ao .env (dev).
 * Quando o login for implementado, só este arquivo muda.
 */
require('dotenv').config()
const Store = require('electron-store')
const brand = require('./brand')

const _store = new Store({ name: 'queromais-config' })

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
    supabaseUrl:    _store.get('supabase_url')      || process.env.SUPABASE_URL      || '',
    supabaseKey:    _store.get('supabase_anon_key') || process.env.SUPABASE_ANON_KEY || '',
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
  }
}

function setConfig(values) {
  Object.entries(values).forEach(([k, v]) => _store.set(k, v))
}

function hasConfig() {
  return !!(getConfig().lojaId && getConfig().supabaseUrl)
}

module.exports = { initConfig, getConfig, setConfig, hasConfig }
