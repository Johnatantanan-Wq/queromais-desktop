/**
 * relatorio-pdf.js — "Imprimir / Salvar PDF" das telas do app.
 *
 * O painel resolve isso com `window.print()` do navegador. Aqui não dá: a tela nativa
 * vive no renderer do Electron junto da sidebar e da topbar, e imprimir a janela
 * inteira sairia com o menu no meio do relatório.
 *
 * Então o renderer manda só o HTML da ÁREA DE CONTEÚDO, o main remonta esse pedaço numa
 * janela oculta em papel A4 (com o mesmo elo.css, senão o PDF sai sem estilo nenhum) e
 * usa printToPDF. É do app, não do servidor — funciona sem internet, que é o destino
 * deste desktop.
 */
const fs = require('fs')
const path = require('path')

const CSS_EXTRA = `
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: 'Plus Jakarta Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
         background: #fff; margin: 0; padding: 0; color: #111; }
  /* O PDF é papel: nada de animação, sombra ou cartão flutuando. */
  * { animation: none !important; transition: none !important; }
  .ecard { box-shadow: none !important; break-inside: avoid; }
  #eloFicha { display: none !important; }
  .epdf-cabecalho { display: flex; align-items: baseline; justify-content: space-between;
    gap: 12px; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 18px; }
  .epdf-titulo { font-size: 19px; font-weight: 800; letter-spacing: -.02em; }
  .epdf-sub { font-size: 11.5px; color: #6b7280; font-weight: 600; }
`

function escapar(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

/** Nome de arquivo previsível: relatorio-visao-geral-2026-09-07.pdf */
function nomeDoArquivo(titulo, agora) {
  const base = ('' + (titulo || 'relatorio')).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'relatorio'
  const d = agora || new Date()
  const dia = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
  return base + '-' + dia + '.pdf'
}

function montarDocumento(html, titulo, loja, css) {
  const agora = new Date()
  let quando = ''
  try { quando = agora.toLocaleString('pt-BR') } catch (e) { quando = agora.toISOString() }
  return '<!doctype html><meta charset="utf-8"><style>' + (css || '') + CSS_EXTRA + '</style>'
    + '<body><div class="epdf-cabecalho">'
    + '<div class="epdf-titulo">' + escapar(titulo || 'Relatório') + '</div>'
    + '<div class="epdf-sub">' + escapar(loja || '') + (loja ? ' · ' : '') + escapar(quando) + '</div>'
    + '</div>' + (html || '') + '</body>'
}

/**
 * Registra o canal. `deps` traz o que vem do Electron para o teste não precisar dele.
 * Devolve { ok, caminho } | { cancelado: true } | { ok: false, erro }.
 */
function registrar({ ipcMain, BrowserWindow, dialog, appDir, pastaPadrao, nomeLoja, log }) {
  const cssPath = path.join(appDir, 'renderer', 'elo', 'elo.css')
  let css = ''
  try { css = fs.readFileSync(cssPath, 'utf8') } catch (e) { css = '' }

  ipcMain.handle('relatorio-pdf', async (evento, args) => {
    const titulo = (args && args.titulo) || 'Relatório'
    const html = (args && args.html) || ''
    if (!html) return { ok: false, erro: 'a tela não mandou conteúdo para o PDF' }

    const sugerido = path.join(pastaPadrao, nomeDoArquivo(titulo))
    const escolha = await dialog.showSaveDialog({
      title: 'Salvar relatório em PDF',
      defaultPath: sugerido,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (escolha.canceled || !escolha.filePath) return { cancelado: true }

    const win = new BrowserWindow({ show: false, width: 1400, height: 1000 })
    try {
      await win.loadURL('data:text/html;charset=utf-8,'
        + encodeURIComponent(montarDocumento(html, titulo, nomeLoja && nomeLoja(), css)))
      const pdf = await win.webContents.printToPDF({
        printBackground: true, landscape: true, pageSize: 'A4',
        margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      })
      fs.writeFileSync(escolha.filePath, pdf)
      if (log) log.info('[PDF] salvo em ' + escolha.filePath)
      return { ok: true, caminho: escolha.filePath }
    } catch (e) {
      if (log) log.error('[PDF] falhou: ' + (e && e.message))
      return { ok: false, erro: String(e && e.message ? e.message : e) }
    } finally {
      try { if (!win.isDestroyed()) win.destroy() } catch (x) {}
    }
  })
}

module.exports = { registrar, nomeDoArquivo, montarDocumento, CSS_EXTRA }
