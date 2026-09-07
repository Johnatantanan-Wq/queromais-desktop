/**
 * impressao-canais.js — os canais de impressão, que valem NOS DOIS MODOS.
 *
 * Impressora é da máquina, não da nuvem: listar, escolher, imprimir teste e imprimir
 * comanda funcionam igual com ou sem servidor — e é justamente o que precisa continuar
 * de pé quando a internet cai. Estavam registrados só dentro do bloco de demonstração,
 * então o app conectado abria a tela de Impressão vazia e os botões não faziam nada.
 *
 * O que muda entre os modos é só de onde vêm o cabeçalho da comanda (a loja) e o pedido
 * de exemplo — por isso os dois entram como função, e não como dado.
 */

function registrar({ ipcMain, BrowserWindow, impressaoService, getConfig, setConfig, log, lojaAtual, pedidoDeExemplo }) {
  ipcMain.handle('impressao-info', async () => {
    let impressoras = []
    try { impressoras = await impressaoService.listarImpressoras() } catch (e) { impressoras = [] }
    let diag = {}
    try { diag = await impressaoService.diagnostico() } catch (e) {}
    const cfg = getConfig()
    return {
      dados: {
        impressoras,
        impressoraAtual: cfg.impressoraNome || '',
        ippUrl: cfg.impressoraIppUrl || '',
        automatica: true,
        vias: 1,
        caminho: diag.sumatra
          ? 'SumatraPDF (Windows)'
          : (process.platform === 'darwin' ? 'impressão do macOS' : 'padrão do sistema'),
        loja: lojaAtual(),
        exemplo: pedidoDeExemplo(),
      },
      offline: false, ts: Date.now(),
    }
  })

  ipcMain.handle('impressao-escolher', (e, a) => {
    setConfig({ impressora_nome: (a && a.nome) || '' })
    if (log) log.info('[IMPRESSAO] impressora escolhida: ' + ((a && a.nome) || 'padrão'))
    return { ok: true }
  })

  ipcMain.handle('impressao-teste', async () => {
    try {
      const r = await impressaoService.imprimirTeste(getConfig().impressoraNome || undefined)
      return { ok: true, resultado: r }
    } catch (e) {
      return { ok: false, erro: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('impressao-comanda', async (e, a) => {
    // Monta a comanda numa janela oculta e manda pela mesma rota da impressão real.
    const TelaImp = require('../renderer/elo/tela-impressao')
    const pedido = (a && a.pedido) || pedidoDeExemplo()
    if (!pedido) return { ok: false, erro: 'sem pedido para imprimir' }
    const html = '<!doctype html><html><body style="margin:0">'
      + TelaImp.htmlComanda(pedido, lojaAtual()) + '</body></html>'
    const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false } })
    try {
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
      const r = await impressaoService.imprimirJanela(win, getConfig().impressoraNome || undefined, 'comanda')
      return { ok: true, resultado: r }
    } catch (err) {
      return { ok: false, erro: String(err && err.message ? err.message : err) }
    } finally {
      try { if (!win.isDestroyed()) win.destroy() } catch (x) {}
    }
  })
}

module.exports = { registrar }
