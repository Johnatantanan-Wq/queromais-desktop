#!/usr/bin/env node
/**
 * apply-brand.js — seleção de marca em build-time (multi-marca).
 * Uso: node scripts/apply-brand.js [queromais|pediu]
 *      (ou via env: APP_BRAND=pediu node scripts/apply-brand.js)
 * Padrão: queromais → reproduz o build atual byte a byte.
 *
 * O que faz:
 *  1. Copia os ícones da marca (brands/<slug>/icons/*) para assets/ — os
 *     caminhos que o electron-builder e o main.js (tray) já esperam.
 *  2. Escreve src-electron/brand.generated.json — lido em runtime por
 *     src-electron/brand.js (título, tray, URL do admin, bot, IPP, cor).
 *  3. Escreve electron-builder.brand.json — package.json "build" + overrides
 *     da marca (appId, productName, dmg.title, artifactName, publish.repo).
 *     Os builds de marca usam `electron-builder --config electron-builder.brand.json`;
 *     o `npm run release` original continua usando o "build" do package.json.
 *
 * Sem dependências npm. Não mexe no package.json.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const slug = (process.argv[2] || process.env.APP_BRAND || 'queromais').trim()

const brandDir = path.join(ROOT, 'brands', slug)
const brandJsonPath = path.join(brandDir, 'brand.json')
if (!fs.existsSync(brandJsonPath)) {
  const disponiveis = fs.readdirSync(path.join(ROOT, 'brands')).filter(d =>
    fs.existsSync(path.join(ROOT, 'brands', d, 'brand.json')))
  console.error(`Marca desconhecida: "${slug}". Disponíveis: ${disponiveis.join(', ')}`)
  process.exit(1)
}
const brand = JSON.parse(fs.readFileSync(brandJsonPath, 'utf8'))

const obrigatorios = ['plataforma_slug', 'nome_app', 'produto_name', 'app_id',
  'artifact_name', 'user_data_name', 'cor_primaria', 'dominio_admin',
  'dominio_cardapio', 'icons']
for (const campo of obrigatorios) {
  if (!brand[campo]) {
    console.error(`brand.json de "${slug}" sem o campo obrigatório: ${campo}`)
    process.exit(1)
  }
}

// ── 1. Ícones → assets/ ──────────────────────────────────────────────────────
const mapaIcones = {
  icns: 'icon.icns',
  ico: 'icon.ico',
  png256: 'icon-256.png',
  tray: 'tray-icon.png',
  tray2x: 'tray-icon@2x.png',
}
for (const [chave, destinoNome] of Object.entries(mapaIcones)) {
  const rel = brand.icons[chave]
  if (!rel) {
    console.error(`brand.json de "${slug}" sem icons.${chave}`)
    process.exit(1)
  }
  const src = path.resolve(brandDir, rel)
  const dest = path.join(ROOT, 'assets', destinoNome)
  if (!fs.existsSync(src)) {
    console.error(`Ícone ausente: ${src}\n(veja brands/${slug}/README.md para gerar)`)
    process.exit(1)
  }
  const igual = fs.existsSync(dest) &&
    fs.readFileSync(src).equals(fs.readFileSync(dest))
  if (!igual) {
    fs.copyFileSync(src, dest)
    console.log(`  assets/${destinoNome} ← brands/${slug}/${rel}`)
  }
}

// ── 2. Config de runtime → src-electron/brand.generated.json ────────────────
const runtime = { ...brand }
delete runtime.icons // caminhos de build não interessam em runtime
fs.writeFileSync(
  path.join(ROOT, 'src-electron', 'brand.generated.json'),
  JSON.stringify(runtime, null, 2) + '\n'
)

// ── 3. Config do electron-builder → electron-builder.brand.json ─────────────
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const cfg = JSON.parse(JSON.stringify(pkg.build)) // clone do build atual
cfg.appId = brand.app_id
cfg.productName = brand.produto_name
cfg.dmg = cfg.dmg || {}
cfg.dmg.title = brand.produto_name
cfg.dmg.artifactName = brand.artifact_name + '-${arch}.${ext}'
cfg.nsis = cfg.nsis || {}
cfg.nsis.artifactName = brand.artifact_name + '-win.${ext}'
if (brand.publish_repo && cfg.publish) cfg.publish.repo = brand.publish_repo

// Sanidade: p/ queromais o resultado TEM que ser idêntico ao "build" do
// package.json — se divergir, alguém editou um lado só (avisa, não quebra).
if (slug === 'queromais' &&
    JSON.stringify(cfg) !== JSON.stringify(pkg.build)) {
  console.warn('AVISO: config gerada p/ queromais difere do "build" do package.json —')
  console.warn('sincronize brands/queromais/brand.json com o package.json.')
}

fs.writeFileSync(
  path.join(ROOT, 'electron-builder.brand.json'),
  JSON.stringify(cfg, null, 2) + '\n'
)

console.log(`Marca aplicada: ${brand.nome_app} (${slug})`)
console.log(`  appId=${brand.app_id}  admin=${brand.dominio_admin}`)
