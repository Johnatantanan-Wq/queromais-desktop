/**
 * Controller de impressão — recebe pedidos de impressão vindos da view do
 * cardápio (via preload/cardapio.preload.js) e imprime SILENCIOSAMENTE
 * (sem diálogo do SO), usando uma janela oculta + webContents.print.
 *
 * A janela oculta usa a MESMA sessão (persist:cardapio) da view do cardápio,
 * senão a página da comanda cai na tela de login (ela exige sessão admin).
 */
const { app, BrowserWindow, ipcMain, session } = require('electron')
const { URL } = require('url')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const { getConfig } = require('../config')
const { imprimirPdfViaIpp } = require('./ipp')

// SumatraPDF embutido no instalador Windows (extraResources) — imprime o PDF
// pelo MESMO caminho GDI do diálogo nativo (que sempre funcionou, em qualquer
// driver), só que sem diálogo. É o caminho padrão no Windows.
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
    const proc = spawn(sumatra, args, { windowsHide: true })
    const timeout = setTimeout(() => { try { proc.kill() } catch (_) {} ; done(new Error('timeout no SumatraPDF')) }, 60000)
    let finalizado = false
    const done = (err) => {
      if (finalizado) return
      finalizado = true
      clearTimeout(timeout)
      try { fs.unlinkSync(tmp) } catch (_) {}
      err ? reject(err) : resolve()
    }
    proc.on('error', done)
    proc.on('exit', (code) => done(code === 0 ? null : new Error(`SumatraPDF saiu com código ${code}`)))
  })
}

function resolverUrl(relOuAbs) {
  try {
    return new URL(relOuAbs, getConfig().cardapioUrl).toString()
  } catch (e) {
    log.error('[IMPRESSAO] URL inválida:', relOuAbs, e.message)
    return null
  }
}

const MICRONS_POR_PX = 25400 / 96 // 96 CSS px/polegada
const FOLGA_ALTURA_MICRONS = 8000 // ~8mm de folga (evita cortar a última linha por arredondamento)
const ALTURA_PADRAO_MICRONS = 400000 // fallback (~400mm) se a medição falhar
// 72mm, não os 80mm do papel: a cabeça de impressão térmica só imprime ~72mm
// dos 80mm da bobina — com 80mm o fim das linhas (ex.: centavos do preço)
// saía cortado à direita. Bate com o `@page { size: 72mm auto }` do CSS.
const LARGURA_IMPRESSAO_MICRONS = 72000

// Mede a altura real da comanda renderizada (.ticket). Sem isso, o print
// silencioso usa o tamanho de página PADRÃO da impressora (não o
// `@page { size: 72mm auto }` do CSS) — numa bobina, o padrão do driver costuma
// ser mais curto que um pedido com vários itens, cortando o resto da comanda.
async function medirPageSize(win) {
  try {
    const alturaPx = await win.webContents.executeJavaScript(
      "(function(){ var el = document.querySelector('.ticket'); return el ? el.scrollHeight : document.body.scrollHeight })()"
    )
    if (typeof alturaPx === 'number' && alturaPx > 0) {
      return { width: LARGURA_IMPRESSAO_MICRONS, height: Math.round(alturaPx * MICRONS_POR_PX) + FOLGA_ALTURA_MICRONS }
    }
  } catch (e) {
    log.warn('[IMPRESSAO] Falha ao medir altura da comanda, usando fallback:', e.message)
  }
  return { width: LARGURA_IMPRESSAO_MICRONS, height: ALTURA_PADRAO_MICRONS }
}

function imprimirUrl(url, impressoraNome) {
  return new Promise((resolve) => {
    const absUrl = resolverUrl(url)
    if (!absUrl) return resolve(false)

    const printSession = session.fromPartition('persist:cardapio')
    const win = new BrowserWindow({
      show: false,
      x: -10000, y: -10000, // fora da tela — mas PRECISA ficar "shown" (ver showInactive abaixo)
      width: 400,
      height: 700,
      webPreferences: {
        session: printSession,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    // Janela nunca mostrada (show:false) nunca é pintada pelo Chromium no Windows —
    // o print silencioso saía em branco mesmo com o conteúdo certo no DOM (o diálogo
    // manual funcionava porque cai no win.show() do fallback, abaixo). showInactive()
    // pinta a janela sem roubar foco nem aparecer (fica fora da tela).
    try { win.showInactive() } catch (_) {}

    // DEBUG TEMPORÁRIO — investigando comanda saindo em branco: confirma se a
    // janela de print enxerga a sessão logada (cookie sb-*-auth-token) ou não.
    try {
      const dominio = new URL(getConfig().cardapioUrl).hostname
      printSession.cookies.get({ domain: dominio }).then((cookies) => {
        const authCookies = cookies.filter(c => c.name.startsWith('sb-') && c.name.includes('auth-token'))
        log.info('[IMPRESSAO][DEBUG] storagePath=', printSession.getStoragePath && printSession.getStoragePath())
        log.info('[IMPRESSAO][DEBUG] cookies domínio', dominio, '=', cookies.length, '| auth cookies =', authCookies.length)
      }).catch((e) => log.warn('[IMPRESSAO][DEBUG] falha lendo cookies:', e.message))
    } catch (e) {
      log.warn('[IMPRESSAO][DEBUG] falha no setup do debug de cookies:', e.message)
    }
    win.webContents.on('did-navigate', (_e, u) => log.info('[IMPRESSAO][DEBUG] did-navigate:', u))
    win.webContents.on('did-redirect-navigation', (_e, u) => log.info('[IMPRESSAO][DEBUG] REDIRECT:', u))
    win.webContents.on('did-finish-load', () => log.info('[IMPRESSAO][DEBUG] finish-load, url atual:', win.webContents.getURL()))

    let resolvido = false
    let timeoutAtivo = null
    const armarTimeout = (ms, rotulo) => {
      clearTimeout(timeoutAtivo)
      timeoutAtivo = setTimeout(() => {
        log.warn(`[IMPRESSAO] Timeout ${rotulo}:`, absUrl)
        finalizar(false)
      }, ms)
    }
    const finalizar = (ok) => {
      if (resolvido) return
      resolvido = true
      clearTimeout(timeoutAtivo)
      try { if (!win.isDestroyed()) win.close() } catch (_) {}
      resolve(ok)
    }

    // Prazo pro CARREGAMENTO da página. Numa VM/máquina lenta a comanda pode levar
    // 12s+ só pra carregar — e este timeout NÃO pode continuar valendo depois do
    // did-finish-load, senão ele fecha a janela NO MEIO da impressão e o job sai
    // truncado (papel em branco). Causa raiz do bug "imprime 5mm em branco" no Windows.
    armarTimeout(30000, 'carregando comanda')

    win.webContents.once('did-finish-load', () => {
      // página carregou: troca pro prazo da fase de impressão (medir + spoolar)
      armarTimeout(60000, 'imprimindo comanda')
      // pequena espera pra garantir que o layout/CSS da comanda assentou antes de imprimir
      setTimeout(async () => {
        if (resolvido) return
        const pageSize = await medirPageSize(win)
        if (resolvido) return

        // O silent print do Electron no Windows gera PDF EM BRANCO com drivers IPP
        // Class (callback ainda diz sucesso) — causa do "sai 5mm de papel em branco"
        // que os fixes de timeout/pageSize não curaram. Então o PDF é gerado pelo
        // printToPDF (pipeline headless, confiável em janela oculta) e impresso por
        // fora do webContents.print:
        //   1. impressora_ipp_url configurada → IPP direto pra fila (opt-in, redes CUPS)
        //   2. Windows → SumatraPDF embutido (padrão; qualquer impressora/driver local)
        //   3. senão → silent print de sempre (Mac funciona bem com ele)
        const ippUrl = getConfig().impressoraIppUrl
        const usarSumatra = process.platform === 'win32' && acharSumatra()
        if (ippUrl || usarSumatra) {
          try {
            const pdf = await win.webContents.printToPDF({
              printBackground: true,
              pageSize: { width: pageSize.width / 25400, height: pageSize.height / 25400 }, // polegadas
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
            })
            if (ippUrl) {
              await imprimirPdfViaIpp(ippUrl, pdf, `Comanda ${absUrl.split('/').pop()}`)
              log.info('[IMPRESSAO] Comanda impressa via IPP direto:', absUrl, `(${ippUrl})`)
            } else {
              await imprimirPdfViaSumatra(pdf, impressoraNome)
              log.info('[IMPRESSAO] Comanda impressa via PDF/Sumatra:', absUrl, impressoraNome ? `(${impressoraNome})` : '(padrão)')
            }
            finalizar(true)
            return
          } catch (e) {
            log.error('[IMPRESSAO] Falha no caminho PDF, tentando print silencioso:', e.message)
            if (resolvido) return
          }
        }

        win.webContents.print(
          { silent: true, printBackground: true, deviceName: impressoraNome || undefined, pageSize },
          (success, errorType) => {
            if (success) {
              log.info('[IMPRESSAO] Comanda impressa:', absUrl, impressoraNome ? `(${impressoraNome})` : '(padrão)')
              finalizar(true)
              return
            }
            // Impressão silenciosa falhou (impressora offline, sem impressora padrão definida, etc.)
            // — cai pro diálogo do SO em vez de sumir com o pedido sem imprimir e sem ninguém saber.
            log.error('[IMPRESSAO] Falha na impressão silenciosa, caindo pro diálogo:', errorType, absUrl)
            if (resolvido) return
            // dá mais tempo (o usuário precisa ver e confirmar o diálogo manualmente)
            armarTimeout(120000, 'aguardando diálogo de impressão')
            // volta a janela pra tela — o usuário precisa ver e interagir com o diálogo
            try { win.setPosition(100, 100); win.show() } catch (_) {}
            win.webContents.print({ silent: false, printBackground: true, pageSize }, (success2, errorType2) => {
              if (!success2) log.error('[IMPRESSAO] Falha também no diálogo de impressão:', errorType2, absUrl)
              else log.info('[IMPRESSAO] Comanda impressa via diálogo (fallback):', absUrl)
              finalizar(success2)
            })
          }
        )
      }, 300)
    })

    win.webContents.once('did-fail-load', (_event, code, desc) => {
      log.error('[IMPRESSAO] Falha ao carregar comanda:', code, desc, absUrl)
      finalizar(false)
    })

    win.loadURL(absUrl)
  })
}

// Fila serial: impressora térmica processa um trabalho por vez — evita
// sobrepor janelas/print jobs quando vários pedidos chegam juntos.
const fila = []
let processando = false

async function processarFila() {
  if (processando || fila.length === 0) return
  processando = true
  const { url, impressoraNome } = fila.shift()
  try {
    await imprimirUrl(url, impressoraNome)
  } catch (e) {
    log.error('[IMPRESSAO] Erro inesperado:', e)
  }
  processando = false
  processarFila()
}

function init() {
  ipcMain.on('imprimir-comanda', (_event, { url, impressoraNome } = {}) => {
    if (!url) return
    fila.push({ url, impressoraNome })
    processarFila()
  })

  ipcMain.handle('listar-impressoras', async () => {
    try {
      const win = global.cardapioView
      if (!win || win.webContents.isDestroyed()) return []
      const impressoras = await win.webContents.getPrintersAsync()
      return impressoras.map(p => ({ name: p.name, displayName: p.displayName || p.name }))
    } catch (e) {
      log.error('[IMPRESSAO] Falha ao listar impressoras:', e)
      return []
    }
  })
}

module.exports = { impressaoController: { init } }
