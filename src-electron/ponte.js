const { menuBase } = require('./menu-base')
const { TELAS, SEM_API } = require('./telas-ponte')

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
  if (guardado) return { dados: guardado.body, offline: true, ts: guardado.ts }

  // Nem servidor nem cache: o app ainda tem o menu DELE. Sem isto a barra lateral
  // subia vazia — nenhuma tela alcançável, nem as que o app desenha sozinho (visto
  // no beta 07/09, com a sessão do painel caída).
  return { dados: menuBase(), offline: true, ts: 0, base: true }
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

/**
 * Busca uma tela que junta VÁRIAS rotas do painel (Atendimento, Gestão, Fidelidade).
 * Uma rota que falha não derruba a tela: vem `null` no lugar dela e o adaptador decide
 * o que dá para mostrar — melhor meia tela verdadeira do que tela inteira vazia.
 */
async function buscarVarias({ rotas, pedirTela }) {
  const chaves = Object.keys(rotas)
  const respostas = await Promise.all(chaves.map(async (k) => {
    try { return await pedirTela(rotas[k]) } catch (e) { return null }
  }))
  const junto = {}
  chaves.forEach((k, i) => { junto[k] = respostas[i] })
  return junto
}

/** Registra os canais. Chamado uma vez, no boot do main. */
function registrar({ ipcMain, cache, monitorRede, pedirAoPainel, pedirTela, abrirRota, lojaIdAtual, semApi }) {
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

  // As demais telas vêm do catálogo (telas-ponte.js): uma linha por tela, com as
  // rotas do painel, o adaptador e o que conta como resposta boa.
  for (const tela of TELAS) {
    ipcMain.handle(tela.canal, (evento, args) => {
      // Tela que muda com a escolha do lojista (o período da Visão geral) leva o
      // parâmetro na rota E na chave do cache — senão a semana ficaria mostrando o
      // dado do dia guardado antes.
      const sufixo = tela.comArgumentos ? tela.comArgumentos(args) : ''
      const rotas = {}
      for (const k of Object.keys(tela.rotas)) rotas[k] = tela.rotas[k] + sufixo
      return buscarTela({
        cache,
        chave: tela.cache + sufixo + '|' + (lojaIdAtual() || 'sem-loja'),
        pedirAoPainel: async () => {
          const bruto = await buscarVarias({ rotas, pedirTela })
          if (tela.valida && !tela.valida(bruto)) return null
          return tela.adaptar(bruto)
        },
        // O adaptador já devolveu no formato da tela; aqui só se recusa o vazio.
        valida: (d) => d != null,
      })
    })
  }

  // Telas que o painel ainda não expõe por rota de leitura: em vez de "No handler
  // registered" (que vira erro genérico na tela), o app diz o que falta.
  const faltando = semApi || SEM_API
  for (const canal of Object.keys(faltando)) {
    ipcMain.handle(canal, () => ({ dados: null, offline: false, ts: 0, semApi: faltando[canal] }))
  }
}

module.exports = { buscarMenu, buscarTela, buscarVarias, registrar }
