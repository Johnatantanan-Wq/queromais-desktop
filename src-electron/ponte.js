// A ponte entre o shell nativo e os dados. O renderer pede; aqui se decide entre
// servidor e cache. Na F3, é aqui que entra a fila de escrita offline.
//
// A chamada ao painel vai POR DENTRO da BrowserView já logada — mesmo caminho do
// ping de presença (main.js:509-514): sem token novo, sem sessão paralela.

/** Busca o menu no painel; caindo a rede, devolve o último bom do cache. */
async function buscarMenu({ cache, pedirAoPainel, lojaId }) {
  let doServidor = null
  try { doServidor = await pedirAoPainel() } catch (e) { doServidor = null }

  // Só resposta COM seções conta como boa: um 401 devolvendo {error} não pode
  // apagar o menu que já estava guardado (é o que faria a barra sumir quando a
  // sessão expira por um instante).
  if (doServidor && Array.isArray(doServidor.secoes)) {
    const id = (doServidor.loja && doServidor.loja.id) || lojaId || 'sem-loja'
    cache.set('menu|' + id, { status: 200, body: doServidor })
    return { dados: doServidor, offline: false, ts: Date.now() }
  }

  const guardado = cache.get('menu|' + (lojaId || 'sem-loja'))
  return { dados: guardado ? guardado.body : null, offline: true, ts: guardado ? guardado.ts : 0 }
}

/** Busca uma tela de leitura no painel; sem rede, devolve o último bom do cache.
 *  `valida` diz o que conta como resposta boa — um 401 devolvendo {error} não pode
 *  apagar o que já estava guardado. */
async function buscarTela({ cache, chave, pedirAoPainel, valida }) {
  let doServidor = null
  try { doServidor = await pedirAoPainel() } catch (e) { doServidor = null }

  if (doServidor && (!valida || valida(doServidor))) {
    cache.set(chave, { status: 200, body: doServidor })
    return { dados: doServidor, offline: false, ts: Date.now() }
  }
  const guardado = cache.get(chave)
  return { dados: guardado ? guardado.body : null, offline: true, ts: guardado ? guardado.ts : 0 }
}

/** Registra os canais. Chamado uma vez, no boot do main. */
function registrar({ ipcMain, cache, monitorRede, pedirAoPainel, pedirTela, abrirRota, lojaIdAtual }) {
  ipcMain.handle('menu-carregar', () => buscarMenu({ cache, pedirAoPainel, lojaId: lojaIdAtual() }))
  ipcMain.handle('rede-status', () => ({ online: monitorRede.online() }))
  ipcMain.handle('cache-get', (e, chave) => cache.get(chave))
  ipcMain.handle('cache-set', (e, a) => cache.set(a && a.chave, { status: 200, body: a && a.valor }))
  ipcMain.handle('abrir-rota', (e, href) => abrirRota(href))
  // Telas nativas: cada uma tem sua chave no cache, sempre por loja — cache de uma
  // loja não pode vazar para outra quando o lojista troca de loja.
  ipcMain.handle('caixa-carregar', () => buscarTela({
    cache,
    chave: 'caixa|' + (lojaIdAtual() || 'sem-loja'),
    pedirAoPainel: () => pedirTela('/api/admin/caixa/resumo'),
    valida: (d) => Object.prototype.hasOwnProperty.call(d, 'aberto'),
  }))
}

module.exports = { buscarMenu, buscarTela, registrar }
