/**
 * Cliente IPP mínimo — envia um PDF pra uma fila IPP/CUPS via Print-Job (HTTP POST).
 * Sem dependências: monta o request IPP 1.1 na mão (validado contra o CUPS do Mac
 * em 2026-07-03; status 0x0000 successful-ok e job com raster real na impressora).
 */
const http = require('http')

function attr(valueTag, name, value) {
  const nameB = Buffer.from(name, 'utf8')
  const valueB = Buffer.from(value, 'utf8')
  return Buffer.concat([
    Buffer.from([valueTag]),
    Buffer.from([nameB.length >> 8, nameB.length & 0xff]), nameB,
    Buffer.from([valueB.length >> 8, valueB.length & 0xff]), valueB,
  ])
}

function montarPrintJob(printerUri, pdf, jobName) {
  const header = Buffer.from([
    0x01, 0x01,             // IPP 1.1
    0x00, 0x02,             // operation: Print-Job
    0x00, 0x00, 0x00, 0x01, // request-id
    0x01,                   // operation-attributes-tag
  ])
  const attrs = Buffer.concat([
    attr(0x47, 'attributes-charset', 'utf-8'),
    attr(0x48, 'attributes-natural-language', 'en'),
    attr(0x45, 'printer-uri', printerUri),
    attr(0x42, 'requesting-user-name', 'queromais'),
    attr(0x42, 'job-name', jobName || 'Comanda QueroMais'),
    attr(0x49, 'document-format', 'application/pdf'),
  ])
  return Buffer.concat([header, attrs, Buffer.from([0x03]), pdf])
}

// httpUrl: ex. "http://192.168.64.1:631/printers/POS80_ESCPOS"
function imprimirPdfViaIpp(httpUrl, pdf, jobName) {
  return new Promise((resolve, reject) => {
    let u
    try { u = new URL(httpUrl) } catch (e) { return reject(new Error(`URL IPP inválida: ${httpUrl}`)) }
    const printerUri = `ipp://${u.hostname}:${u.port || 631}${u.pathname}`
    const body = montarPrintJob(printerUri, pdf, jobName)

    const req = http.request({
      hostname: u.hostname, port: u.port || 631, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/ipp', 'Content-Length': body.length },
      timeout: 20000,
    }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const resp = Buffer.concat(chunks)
        const status = resp.length >= 4 ? resp.readUInt16BE(2) : -1
        if (res.statusCode === 200 && status >= 0 && status < 0x100) resolve(status)
        else reject(new Error(`IPP falhou: HTTP ${res.statusCode}, status-code 0x${status.toString(16)}`))
      })
    })
    req.on('timeout', () => { req.destroy(new Error('timeout no envio IPP')) })
    req.on('error', reject)
    req.end(body)
  })
}

module.exports = { imprimirPdfViaIpp }
