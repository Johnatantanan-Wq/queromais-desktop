#!/usr/bin/env node
/**
 * svg-to-icons.js — gera o kit de ícones de uma marca a partir de um SVG.
 * Uso: node scripts/svg-to-icons.js <entrada.svg> <pasta-saida>
 * Ex.: node scripts/svg-to-icons.js brands/pediu/src/pediu-app-icon.svg brands/pediu/icons
 *
 * Sai com: icon.icns, icon.ico, icon-256.png, tray-icon.png (22px), tray-icon@2x.png (44px)
 *
 * SÓ RODA NO macOS (usa qlmanage p/ rasterizar o SVG, sips p/ redimensionar e
 * iconutil p/ o .icns). O .ico é montado à mão (PNG-in-ICO, 256x256 — mesmo
 * formato do icon.ico atual do Quero Mais). Sem dependências npm.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const [svgIn, outDir] = process.argv.slice(2)
if (!svgIn || !outDir) {
  console.error('Uso: node scripts/svg-to-icons.js <entrada.svg> <pasta-saida>')
  process.exit(1)
}
if (process.platform !== 'darwin') {
  console.error('Este script depende de qlmanage/sips/iconutil — rode no macOS.')
  process.exit(1)
}
const svg = path.resolve(svgIn)
const out = path.resolve(outDir)
fs.mkdirSync(out, { recursive: true })
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'svg-icons-'))

// 1) SVG → PNG 1024 (qlmanage rasteriza via Quick Look)
execFileSync('qlmanage', ['-t', '-s', '1024', '-o', tmp, svg], { stdio: 'pipe' })
const base = path.join(tmp, path.basename(svg) + '.png')
if (!fs.existsSync(base)) {
  console.error('qlmanage não gerou o PNG — confira o SVG:', svg)
  process.exit(1)
}

function resize(size, dest) {
  execFileSync('sips', ['-z', String(size), String(size), base, '--out', dest], { stdio: 'pipe' })
}

// 2) .icns via iconset + iconutil
const iconset = path.join(tmp, 'icon.iconset')
fs.mkdirSync(iconset)
const pares = [
  ['icon_16x16.png', 16], ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32], ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128], ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256], ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512], ['icon_512x512@2x.png', 1024],
]
for (const [nome, tam] of pares) resize(tam, path.join(iconset, nome))
execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(out, 'icon.icns')], { stdio: 'pipe' })

// 3) PNGs avulsos
resize(256, path.join(out, 'icon-256.png'))
resize(22, path.join(out, 'tray-icon.png'))
resize(44, path.join(out, 'tray-icon@2x.png'))

// 4) .ico — container ICO com 1 entrada PNG 256x256 (Vista+; igual ao atual)
const png256 = fs.readFileSync(path.join(out, 'icon-256.png'))
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)  // reserved
header.writeUInt16LE(1, 2)  // type: icon
header.writeUInt16LE(1, 4)  // count
const entry = Buffer.alloc(16)
entry.writeUInt8(0, 0)      // width 256 → 0
entry.writeUInt8(0, 1)      // height 256 → 0
entry.writeUInt8(0, 2)      // palette
entry.writeUInt8(0, 3)      // reserved
entry.writeUInt16LE(1, 4)   // planes
entry.writeUInt16LE(32, 6)  // bpp
entry.writeUInt32LE(png256.length, 8)   // bytes
entry.writeUInt32LE(6 + 16, 12)         // offset
fs.writeFileSync(path.join(out, 'icon.ico'), Buffer.concat([header, entry, png256]))

fs.rmSync(tmp, { recursive: true, force: true })
console.log('Ícones gerados em', out)
