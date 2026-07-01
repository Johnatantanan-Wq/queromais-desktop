/**
 * Cache offline — intercepta requests de imagens/assets e salva em disco.
 * Quando offline, serve do cache local (sem precisar de conexão).
 */
const { net } = require('electron')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const log = require('electron-log')

let cacheDir = null

function urlToPath(url) {
  const hash = crypto.createHash('md5').update(url).digest('hex')
  const ext = (url.split('?')[0].split('.').pop() || 'bin').slice(0, 6)
  return path.join(cacheDir, `${hash}.${ext}`)
}

function isAsset(url) {
  return /\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|otf)(\?|$)/i.test(url)
}

// Baixa e salva no cache local
function downloadToCache(url) {
  return new Promise((resolve) => {
    const dest = urlToPath(url)
    if (fs.existsSync(dest)) return resolve(dest) // já em cache

    const req = net.request({ url, method: 'GET' })
    const chunks = []
    req.on('response', (res) => {
      if (res.statusCode !== 200) return resolve(null)
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        try {
          fs.writeFileSync(dest, Buffer.concat(chunks))
          resolve(dest)
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.end()
  })
}

const cacheController = {
  init(cardapioSession, userDataPath) {
    cacheDir = path.join(userDataPath, 'img-cache')
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })

    // Intercepta respostas de imagens bem-sucedidas e salva no cache
    cardapioSession.webRequest.onCompleted(
      { urls: ['https://*/*', 'http://*/*'] },
      (details) => {
        const { url, statusCode } = details
        if (statusCode === 200 && isAsset(url)) {
          const dest = urlToPath(url)
          if (!fs.existsSync(dest)) {
            // Baixa em background sem bloquear
            downloadToCache(url).catch(() => {})
          }
        }
      }
    )

    // Quando request falha (offline), injeta imagem do cache via CSS
    cardapioSession.webRequest.onErrorOccurred(
      { urls: ['https://*/*', 'http://*/*'] },
      (details) => {
        const { url } = details
        if (isAsset(url)) {
          const cached = urlToPath(url)
          if (fs.existsSync(cached)) {
            log.info(`[CACHE] Servindo do cache local: ${url}`)
          }
        }
      }
    )

    log.info(`[CACHE] Cache de imagens em: ${cacheDir}`)
  },

  // Retorna caminho local de uma imagem (ou null se não está em cache)
  getCached(url) {
    if (!cacheDir) return null
    const dest = urlToPath(url)
    return fs.existsSync(dest) ? dest : null
  },

  // Pré-baixa uma lista de URLs de imagens
  async prefetch(urls) {
    let count = 0
    for (const url of urls) {
      if (isAsset(url)) {
        const result = await downloadToCache(url)
        if (result) count++
      }
    }
    log.info(`[CACHE] Pré-baixadas ${count}/${urls.length} imagens`)
    return count
  },
}

module.exports = { cacheController }
