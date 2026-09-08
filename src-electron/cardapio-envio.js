// cardapio-envio.js — mexer no cardápio pela view logada. PATCH, não POST.
const A = require('./cardapio-acoes')

async function mandar(enviar, log, caminho, corpo) {
  let r = null
  try { r = await enviar(caminho, corpo, 'PATCH') } catch (e) {
    if (log) log.warn('[CARDAPIO] falhou:', e && e.message)
    return { ok: false, erro: 'Não deu para falar com o painel agora.' }
  }
  if (!r) return { ok: false, erro: 'Sem resposta do painel.' }
  if (r.error) return { ok: false, erro: String(r.error) }
  return { ok: true }
}

function registrar({ ipcMain, enviar, log }) {
  ipcMain.handle('cardapio-esgotar-item', async (e, args) => {
    const d = A.esgotarItem(args && args.item, args && args.esgotar)
    if (!d.ok) return { ok: false, erro: d.motivo }
    const r = await mandar(enviar, log, d.caminho, d.corpo)
    return r.ok ? { ok: true, resumo: d.resumo } : { ok: false, erro: r.erro + ' Nada mudou.' }
  })
  ipcMain.handle('cardapio-editar-preco', async (e, args) => {
    const d = A.editarPreco(args && args.item, args && args.preco)
    if (!d.ok) return { ok: false, erro: d.motivo }
    const r = await mandar(enviar, log, d.caminho, d.corpo)
    return r.ok ? { ok: true, resumo: d.resumo } : { ok: false, erro: r.erro + ' O preço não mudou.' }
  })
  ipcMain.handle('cardapio-esgotar-categoria', async (e, args) => {
    const d = A.esgotarCategoria(args && args.categoria, args && args.esgotar)
    if (!d.ok) return { ok: false, erro: d.motivo }
    // Um PATCH por produto, como o painel. Se um falhar, os anteriores FICARAM —
    // a tela recebe quantos foram, sem prometer a categoria inteira.
    let feitos = 0, erro = null
    for (const c of d.chamadas) {
      const r = await mandar(enviar, log, c.caminho, c.corpo)
      if (!r.ok) { erro = r.erro; break }
      feitos++
    }
    if (!feitos) return { ok: false, erro: (erro || 'Não deu.') + ' Nada mudou.' }
    if (feitos < d.chamadas.length) return { ok: true, parcial: true, resumo: feitos + ' de ' + d.chamadas.length + ' produtos — ' + erro }
    return { ok: true, resumo: d.resumo }
  })
}

module.exports = { registrar }
