/**
 * printerService — toda a execução de impressão vive no processo MAIN.
 *
 * Caminhos de impressão, na ordem (decidido com base em diagnóstico real feito
 * em 2026-07-03 nos logs do CUPS):
 *   1. Windows: printToPDF (headless, sempre renderiza) + SumatraPDF embutido
 *      (-print-to ... -silent) — mesmo caminho GDI do diálogo nativo, que
 *      funciona em qualquer driver. O webContents.print({silent:true}) gera
 *      PDF EM BRANCO com o Microsoft IPP Class Driver (e reporta sucesso!).
 *   2. impressora_ipp_url configurada: PDF direto pra fila IPP/CUPS via rede.
 *   3. Fallback: webContents.print silencioso (funciona bem no macOS).
 *
 * Logs: além do main.log, TUDO de impressão vai pra userData/logs/print.log.
 */
const { app, BrowserWindow, session } = require('electron')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const { getConfig } = require('../config')
const { imprimirPdfViaIpp } = require('./ipp')
const brand = require('../brand')

// ── log dedicado de impressão ────────────────────────────────────────────────
const printLog = log.create({ logId: 'print' })
try {
  printLog.transports.file.resolvePathFn = () =>
    path.join(app.getPath('userData'), 'logs', 'print.log')
} catch (_) { /* em testes fora do Electron */ }
function plog(nivel, ...args) {
  printLog[nivel](...args)
  log[nivel]('[IMPRESSAO]', ...args)
}

// ── medidas (72mm úteis da bobina de 80mm; ver memória do projeto) ──────────
const MICRONS_POR_PX = 25400 / 96
const FOLGA_ALTURA_MICRONS = 8000
const ALTURA_PADRAO_MICRONS = 400000
const LARGURA_IMPRESSAO_MICRONS = 72000

async function medirPageSize(win) {
  try {
    const alturaPx = await win.webContents.executeJavaScript(
      "(function(){ var el = document.querySelector('.ticket'); return el ? el.scrollHeight : document.body.scrollHeight })()"
    )
    if (typeof alturaPx === 'number' && alturaPx > 0) {
      return { width: LARGURA_IMPRESSAO_MICRONS, height: Math.round(alturaPx * MICRONS_POR_PX) + FOLGA_ALTURA_MICRONS }
    }
  } catch (e) {
    plog('warn', 'Falha ao medir altura da comanda, usando fallback:', e.message)
  }
  return { width: LARGURA_IMPRESSAO_MICRONS, height: ALTURA_PADRAO_MICRONS }
}

// ── SumatraPDF embutido (extraResources no build Windows) ────────────────────
function acharSumatra() {
  const candidatos = [
    path.join(process.resourcesPath || '', 'SumatraPDF.exe'),
    path.join(__dirname, '..', '..', 'node_modules', 'pdf-to-printer', 'dist', 'SumatraPDF-3.4.6-32.exe'), // dev
  ]
  return candidatos.find(p => { try { return fs.existsSync(p) } catch (_) { return false } }) || null
}

function imprimirPdfViaSumatra(pdfBuffer, impressoraNome) {
  return new Promise((resolve, reject) => {
    const sumatra = acharSumatra()
    if (!sumatra) return reject(new Error('SumatraPDF.exe não encontrado nos resources'))
    const tmp = path.join(app.getPath('temp'), `comanda-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`)
    fs.writeFileSync(tmp, pdfBuffer)
    const args = impressoraNome ? ['-print-to', impressoraNome] : ['-print-to-default']
    args.push('-print-settings', 'noscale', '-silent', tmp)
    plog('info', 'Sumatra:', sumatra, args.join(' '))
    const proc = spawn(sumatra, args, { windowsHide: true })
    let finalizado = false
    const done = (err) => {
      if (finalizado) return
      finalizado = true
      clearTimeout(timeout)
      try { fs.unlinkSync(tmp) } catch (_) {}
      err ? reject(err) : resolve()
    }
    const timeout = setTimeout(() => { try { proc.kill() } catch (_) {} ; done(new Error('timeout no SumatraPDF')) }, 60000)
    proc.on('error', done)
    proc.on('exit', (code) => done(code === 0 ? null : new Error(`SumatraPDF saiu com código ${code}`)))
  })
}

// ── impressoras: listar / resolver nome configurado ─────────────────────────
async function listarImpressoras() {
  const wc = global.cardapioView && !global.cardapioView.webContents.isDestroyed()
    ? global.cardapioView.webContents
    : BrowserWindow.getAllWindows().find(w => !w.isDestroyed())?.webContents
  if (!wc) return []
  try { return await wc.getPrintersAsync() } catch (e) {
    plog('error', 'Falha ao listar impressoras:', e.message)
    return []
  }
}

// Nunca assume nome fixo: valida contra a lista real; se a configurada sumiu,
// avisa e cai pra padrão do Windows. Retorna { nome, aviso, disponiveis }.
async function resolverImpressora(nomePedido) {
  const impressoras = await listarImpressoras()
  const nomes = impressoras.map(p => p.name)
  const padrao = impressoras.find(p => p.isDefault)?.name || ''
  const configurada = nomePedido || getConfig().impressoraNome || ''
  if (configurada && nomes.includes(configurada)) return { nome: configurada, aviso: null, disponiveis: nomes, padrao }
  if (configurada) {
    const aviso = `Impressora configurada "${configurada}" não existe mais. Disponíveis: ${nomes.join(', ') || '(nenhuma)'}. Usando a padrão${padrao ? ` (${padrao})` : ''}.`
    plog('warn', aviso)
    return { nome: '', aviso, disponiveis: nomes, padrao }
  }
  return { nome: '', aviso: null, disponiveis: nomes, padrao }
}

// ── diagnóstico completo (spec §2) ───────────────────────────────────────────
async function diagnostico() {
  const impressoras = await listarImpressoras()
  const diag = {
    isPackaged: app.isPackaged,
    versao: app.getVersion(),
    plataforma: process.platform,
    sumatra: acharSumatra(),
    impressoras: impressoras.map(p => ({ nome: p.name, padrao: !!p.isDefault })),
    ippUrl: getConfig().impressoraIppUrl || null,
  }
  plog('info', 'DIAGNOSTICO:', JSON.stringify(diag))
  return diag
}

// ── impressão de um documento já carregado numa janela ──────────────────────
// Estratégia única usada por comandas remotas E teste local.
async function imprimirJanela(win, impressoraNome, rotulo) {
  const pageSize = await medirPageSize(win)
  const { nome, aviso } = await resolverImpressora(impressoraNome)
  const ippUrl = getConfig().impressoraIppUrl
  const usarSumatra = process.platform === 'win32' && acharSumatra()

  if (ippUrl || usarSumatra) {
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: { width: pageSize.width / 25400, height: pageSize.height / 25400 }, // polegadas
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    })
    plog('info', `PDF gerado (${pdf.length} bytes) p/ ${rotulo}`)
    if (ippUrl) {
      await imprimirPdfViaIpp(ippUrl, pdf, rotulo)
      plog('info', `Impresso via IPP direto: ${rotulo} (${ippUrl})`)
    } else {
      await imprimirPdfViaSumatra(pdf, nome || undefined)
      plog('info', `Impresso via PDF/Sumatra: ${rotulo} (${nome || 'padrão'})`)
    }
    return { ok: true, caminho: ippUrl ? 'ipp' : 'sumatra', impressora: nome || 'padrão', aviso }
  }

  // Fallback: silent print (macOS ok; no Windows só se o Sumatra sumir)
  return new Promise((resolve, reject) => {
    win.webContents.print(
      { silent: true, printBackground: true, deviceName: nome || undefined, margins: { marginType: 'none' }, pageSize },
      (success, failureReason) => {
        if (success) {
          plog('info', `Impresso via silent print: ${rotulo} (${nome || 'padrão'})`)
          resolve({ ok: true, caminho: 'silent', impressora: nome || 'padrão', aviso })
        } else {
          plog('error', `silent print falhou p/ ${rotulo}: ${failureReason}`)
          reject(new Error(failureReason || 'silent print falhou'))
        }
      }
    )
  })
}

// ── cupom de teste LOCAL (data URL — SEM rede; spec §6) ──────────────────────
function htmlComandaTeste(extra) {
  const agora = new Date().toLocaleString('pt-BR')
  const modo = app.isPackaged ? 'PACKAGED' : 'DEV'
  return `<!doctype html><html><body style="margin:0">
    <div class="ticket" style="width:72mm;padding:2mm;font-family:'Courier New',monospace;font-size:12px;color:#000">
      <div style="text-align:center;font-weight:800;font-size:14px">${brand.nome_app.toUpperCase()}</div>
      <div style="border-top:1px dashed #000;margin:4px 0"></div>
      <div>TESTE DE IMPRESSAO</div>
      <div>Data/hora: ${agora}</div>
      <div>Versao: ${app.getVersion()} (${modo})</div>
      <div>Impressora: ${extra.impressora || 'padrao do Windows'}</div>
      <div>Largura: 72mm (bobina 80mm)</div>
      <div>Caminho: ${extra.caminho || '-'}</div>
      <div style="border-top:1px dashed #000;margin:4px 0"></div>
      <div style="text-align:center">STATUS: OK — se voce le isto,<br>a IMPRESSAO em si funciona.</div>
      <div style="height:16px"></div>
    </div></body></html>`
}

// Imprime o cupom de teste local. Não depende de rede/sessão/login — se ISTO
// imprime e a comanda real não, o problema é o CARREGAMENTO da página remota.
async function imprimirTeste(impressoraNome) {
  const diag = await diagnostico()
  const win = new BrowserWindow({
    show: false,
    x: -10000, y: -10000,
    width: 400, height: 700,
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  })
  try { win.showInactive() } catch (_) {}
  try {
    const html = htmlComandaTeste({ impressora: impressoraNome, caminho: process.platform === 'win32' ? 'sumatra' : 'silent' })
    const carregou = new Promise((res, rej) => {
      win.webContents.once('did-finish-load', res)
      win.webContents.once('did-fail-load', (_e, c, d) => rej(new Error(`load falhou: ${c} ${d}`)))
      setTimeout(() => rej(new Error('timeout carregando teste local')), 15000)
    })
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    await carregou
    try { await win.webContents.executeJavaScript('document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>1) : 1') } catch (_) {}
    await new Promise(r => setTimeout(r, 400))
    const resultado = await imprimirJanela(win, impressoraNome, 'comanda-teste-local')
    return { ...resultado, diagnostico: diag }
  } catch (e) {
    plog('error', 'Teste local falhou:', e.message)
    return { ok: false, erro: e.message, diagnostico: diag }
  } finally {
    try { if (!win.isDestroyed()) win.close() } catch (_) {}
  }
}

module.exports = {
  impressaoService: {
    plog, medirPageSize, acharSumatra, imprimirPdfViaSumatra,
    listarImpressoras, resolverImpressora, diagnostico,
    imprimirJanela, imprimirTeste,
  },
}
