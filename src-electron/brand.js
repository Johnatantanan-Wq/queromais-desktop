/**
 * brand.js — identidade da marca em runtime (multi-marca).
 * Lê src-electron/brand.generated.json (escrito por scripts/apply-brand.js).
 * Sem o arquivo (checkout limpo, nunca rodou apply-brand), cai nos padrões
 * Quero Mais — comportamento IDÊNTICO ao app de hoje.
 */
const PADRAO_QUEROMAIS = {
  plataforma_slug: 'queromais',
  nome_app: 'Quero Mais Desktop',
  produto_name: 'Quero Mais Desktop',
  nome_delivery: 'Quero Mais Delivery',
  app_id: 'com.queromais.desktop',
  artifact_name: 'QueroMais-Desktop',
  user_data_name: 'queromais-desktop',
  publish_repo: 'queromais-desktop',
  cor_primaria: '#F97316',
  cor_primaria_rgb: '249,115,22',
  dominio_admin: 'https://cardapio.prosistas.com.br/admin',
  dominio_cardapio: 'https://cardapio.prosistas.com.br',
  ipp_user: 'queromais',
  nome_comanda: 'Comanda QueroMais',
}

let gerado = {}
try {
  gerado = require('./brand.generated.json')
} catch (_) { /* arquivo ausente → padrões Quero Mais */ }

module.exports = { ...PADRAO_QUEROMAIS, ...gerado }
