const { menuBase } = require('./menu-base')
const { TELAS, SEM_API } = require('./telas-ponte')

// A ponte entre o shell nativo e os dados. O renderer pede; aqui se decide entre
// servidor e cache. Na F3, é aqui que entra a fila de escrita offline.
//
// A chamada ao painel vai POR DENTRO da BrowserView já logada — mesmo caminho do
// ping de presença (main.js:509-514): sem token novo, sem sessão paralela.

/** A loja que manda na chave do cache. O `lojaId` do config só existe depois que a
 *  sessão do painel é lida (main.js descobrirLoja) — antes disso tudo caía em
 *  'sem-loja' e, quando o id aparecia no meio da sessão, a chave mudava e o dado
 *  guardado antes "sumia". O ponteiro segura a última loja conhecida para que a
 *  chave não mude embaixo do app. Ele nunca ganha do config: se o lojista trocou de
 *  loja, o id de lá é que vale, e cache de uma loja não vaza para a outra. */
function lojaDaVez(cache, lojaId) {
  if (lojaId) return lojaId
  const p = cache.get('ultima-loja')
  return (p && p.body && p.body.id) || 'sem-loja'
}

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
    // Ponteiro para a última loja que ESTE app viu. Sem ele o menu era GRAVADO em
    // 'menu|<id da loja>' e LIDO em 'menu|sem-loja' — chaves diferentes, cache que
    // nunca voltava. É o que fazia a barra sumir assim que o painel parava de
    // responder, mesmo com o menu guardado em disco (visto 07/09).
    cache.set('ultima-loja', { status: 200, body: { id } })
    return { dados: doServidor, offline: false, ts: Date.now() }
  }

  const guardado = cache.get('menu|' + lojaDaVez(cache, lojaId))
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

/**
 * PRÉ-CARGA (F3.2): o app baixa de propósito o que é preciso para VENDER sem internet.
 *
 * O cache que a ponte já mantém é oportunista — guarda o que o lojista abriu. Se ele
 * não abriu o Cardápio hoje, não há cardápio guardado, e é exatamente ele que falta
 * quando a rede cai. Aqui o app busca por conta própria: no boot e a cada 10 minutos,
 * respeitando a validade de cada coisa (cardápio 6 h, formas e bairros 12 h, clientes
 * 24 h; o caixa a cada rodada, porque muda a cada venda).
 *
 * ⚠️ Roda em silêncio e nunca derruba nada: resposta ruim não apaga o que estava
 * guardado, e a falha vai para o log, não para a tela.
 */
function iniciarPreCarga({ cache, lojaIdAtual, log, podeRodar, intervaloMs = 10 * 60 * 1000 }) {
  const preCarga = require('./pre-carga')
  // Os carregadores só existem depois que a ponte registra os canais — por isso a
  // pré-carga nasce desligada e é LIGADA de lá, com as mesmas funções.
  let carregarCanal = async () => null
  let chaveDoCanal = (c) => c
  // ⛔ A idade vem da chave que a TELA lê, não de uma chave própria: é o mesmo dado.
  const tsDe = (nome) => {
    const item = preCarga.ITENS.find((i) => i.chave === nome)
    if (!item) return 0
    const g = cache.meta ? cache.meta(chaveDoCanal(item.canal)) : null
    return g ? g.ts : 0
  }
  let rodando = false
  async function rodar() {
    if (rodando) return
    // Sem sessão o painel recusa tudo: insistir de 10 em 10 minutos só gasta chamada e
    // enche o log de falha que não é falha. Quando o lojista entrar, a rodada seguinte
    // pega tudo de uma vez.
    if (podeRodar && !podeRodar()) return
    rodando = true
    try {
      const r = await preCarga.rodada({ aquecer: carregarCanal, tsDe })
      if (log && (r.buscados.length || r.falhas.length)) {
        log.info('[PRE-CARGA] guardado: ' + (r.buscados.join(', ') || 'nada')
          + (r.falhas.length ? ' · sem resposta: ' + r.falhas.join(', ') : ''))
      }
    } catch (e) {
      if (log) log.warn('[PRE-CARGA] falhou:', e && e.message)
    } finally { rodando = false }
  }
  const timer = setInterval(rodar, intervaloMs)
  return {
    rodar, parar: () => clearInterval(timer), estado: () => preCarga.estado(tsDe),
    ligar: (fns) => { carregarCanal = fns.carregarCanal; chaveDoCanal = fns.chaveDoCanal },
  }
}

/** Registra os canais. Chamado uma vez, no boot do main. */
function registrar({ ipcMain, cache, monitorRede, pedirAoPainel, pedirTela, abrirRota, lojaIdAtual, semApi, preCarga }) {
  ipcMain.handle('menu-carregar', () => buscarMenu({ cache, pedirAoPainel, lojaId: lojaIdAtual() }))
  ipcMain.handle('rede-status', () => ({ online: monitorRede.online() }))
  ipcMain.handle('cache-get', (e, chave) => cache.get(chave))
  ipcMain.handle('cache-set', (e, a) => cache.set(a && a.chave, { status: 200, body: a && a.valor }))
  ipcMain.handle('abrir-rota', (e, href) => abrirRota(href))
  // O que está guardado para vender sem internet — a tela avisa o que falta ANTES de a
  // rede cair, em vez de o lojista descobrir na hora do aperto.
  ipcMain.handle('pre-carga-estado', () => (preCarga ? preCarga.estado() : null))
  // Link que NÃO é do painel (o ponto do entregador no mapa) abre no navegador do
  // sistema: mapa é da internet, e trazê-lo para dentro do app faria um app
  // offline-first exibir um quadrado branco quando a rede cai.
  ipcMain.handle('abrir-externo', (e, url) => {
    if (!/^https:\/\//.test('' + url)) return { ok: false }
    require('electron').shell.openExternal('' + url)
    return { ok: true }
  })
  // Telas nativas: cada uma tem sua chave no cache, sempre por loja — cache de uma
  // loja não pode vazar para outra quando o lojista troca de loja.
  // O Caixa junta três rotas: o resumo, as entregas (aba Delivery) e o salão (aba
  // Mesas). As duas abas só existiam na demonstração até 08/09.
  const carregarCaixa = () => buscarTela({
    cache,
    chave: 'caixa|' + lojaDaVez(cache, lojaIdAtual()),
    pedirAoPainel: async () => require('./adaptadores').caixaCompleto(await buscarVarias({
      rotas: {
        resumoResp: '/api/admin/caixa/resumo',
        entregasResp: '/api/admin/atendimento/entregas',
        salaoResp: '/api/admin/atendimento/salao',
        // Aba "NF pendentes" (painel, 09/09/2026): as vendas de hoje e de ontem sem
        // nota. Rota própria e já no ar; `ativo` diz se ESTA loja emite NFC-e manual.
        semNotaResp: '/api/admin/nf/sem-nota',
      },
      pedirTela,
    })),
    valida: (d) => d != null && Object.prototype.hasOwnProperty.call(d, 'aberto'),
  })
  ipcMain.handle('caixa-carregar', carregarCaixa)

  // As demais telas vêm do catálogo (telas-ponte.js): uma linha por tela, com as
  // rotas do painel, o adaptador e o que conta como resposta boa.
  // O carregamento de cada tela fica numa função nomeada porque DOIS caminhos a usam: o
  // canal que o renderer chama, e a pré-carga, que aquece a MESMA chave do cache. Sem
  // isso a pré-carga guardaria em chave própria e a tela não veria nada na queda.
  const carregadores = { 'caixa-carregar': carregarCaixa }
  const chaves = { 'caixa-carregar': () => 'caixa|' + lojaDaVez(cache, lojaIdAtual()) }
  for (const tela of TELAS) {
    const carregar = (evento, args) => {
      // Tela que muda com a escolha do lojista (o período da Visão geral) leva o
      // parâmetro na rota E na chave do cache — senão a semana ficaria mostrando o
      // dado do dia guardado antes.
      const sufixo = tela.comArgumentos ? tela.comArgumentos(args) : ''
      const rotas = {}
      for (const k of Object.keys(tela.rotas)) rotas[k] = tela.rotas[k] + sufixo
      return buscarTela({
        cache,
        chave: tela.cache + sufixo + '|' + lojaDaVez(cache, lojaIdAtual()),
        pedirAoPainel: async () => {
          const bruto = await buscarVarias({ rotas, pedirTela })
          if (tela.valida && !tela.valida(bruto)) return null
          return tela.adaptar(bruto)
        },
        // O adaptador já devolveu no formato da tela; aqui só se recusa o vazio.
        valida: (d) => d != null,
      })
    }
    carregadores[tela.canal] = carregar
    chaves[tela.canal] = () => tela.cache + '|' + lojaDaVez(cache, lojaIdAtual())
    ipcMain.handle(tela.canal, carregar)
  }
  // Entregues para quem mais precisa: a pré-carga aquece pelos MESMOS carregadores.
  if (preCarga && preCarga.ligar) preCarga.ligar({
    carregarCanal: (canal) => (carregadores[canal] ? carregadores[canal](null, undefined) : null),
    chaveDoCanal: (canal) => (chaves[canal] ? chaves[canal]() : canal),
  })

  // Telas que o painel ainda não expõe por rota de leitura: em vez de "No handler
  // registered" (que vira erro genérico na tela), o app diz o que falta.
  const faltando = semApi || SEM_API
  for (const canal of Object.keys(faltando)) {
    ipcMain.handle(canal, () => ({ dados: null, offline: false, ts: 0, semApi: faltando[canal] }))
  }
}

module.exports = {
  iniciarPreCarga,
  lojaDaVez, buscarMenu, buscarTela, buscarVarias, registrar }
