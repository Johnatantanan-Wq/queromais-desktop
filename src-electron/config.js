/**
 * config.js — fonte única de configuração do app.
 * Lê do electron-store (persistente por usuário) com fallback ao .env (dev).
 * Quando o login for implementado, só este arquivo muda.
 */
require('dotenv').config()
const Store = require('electron-store')

const _store = new Store({ name: 'queromais-config' })

// Na primeira execução, semeia o store com os valores do .env
function initConfig() {
  if (!_store.get('supabase_url') && process.env.SUPABASE_URL) {
    _store.set('supabase_url',       process.env.SUPABASE_URL)
    _store.set('supabase_anon_key',  process.env.SUPABASE_ANON_KEY)
    _store.set('loja_id',            process.env.LOJA_ID)
    _store.set('cardapio_admin_url',
      process.env.CARDAPIO_ADMIN_URL || 'https://cardapio.prosistas.com.br/admin')
  }
}

function getConfig() {
  return {
    supabaseUrl:    _store.get('supabase_url')      || process.env.SUPABASE_URL      || '',
    supabaseKey:    _store.get('supabase_anon_key') || process.env.SUPABASE_ANON_KEY || '',
    lojaId:         _store.get('loja_id')           || process.env.LOJA_ID           || '',
    cardapioUrl:    _store.get('cardapio_admin_url')|| process.env.CARDAPIO_ADMIN_URL || 'https://cardapio.prosistas.com.br/admin',
  }
}

function setConfig(values) {
  Object.entries(values).forEach(([k, v]) => _store.set(k, v))
}

function hasConfig() {
  return !!(getConfig().lojaId && getConfig().supabaseUrl)
}

module.exports = { initConfig, getConfig, setConfig, hasConfig }
