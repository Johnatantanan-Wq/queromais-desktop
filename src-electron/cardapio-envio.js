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
  // Antes de mudar o preço: este item também é vendido como OPÇÃO em algum lugar? A
  // consulta é só leitura e roda ao abrir a caixa do preço — abrir o produto para outra
  // coisa não paga essa ida.
  ipcMain.handle('cardapio-opcoes-do-preco', async (e, args) => {
    const item = (args && args.item) || {}
    if (!item.id) return { ok: false, erro: 'Produto sem identificação.' }
    let r = null
    try { r = await enviar('/api/admin/estoque/preco-venda/' + item.id, null, 'GET') } catch (err) {
      if (log) log.warn('[CARDAPIO] consulta de opções falhou:', err && err.message)
      return { ok: false, erro: 'Não deu para conferir as opções agora.' }
    }
    if (!r || r.error) return { ok: false, erro: (r && r.error) ? String(r.error) : 'Sem resposta do painel.' }
    return { ok: true, ...A.opcoesParaAtualizar(r, item.preco) }
  })

  ipcMain.handle('cardapio-editar-preco', async (e, args) => {
    const item = (args && args.item) || {}
    const d = A.editarPreco(item, args && args.preco)
    if (!d.ok) return { ok: false, erro: d.motivo }
    const r = await mandar(enviar, log, d.caminho, d.corpo)
    if (!r.ok) return { ok: false, erro: r.erro + ' O preço não mudou.' }

    // O preço do produto já foi. Agora as OPÇÕES — é lá que o cliente paga quando
    // escolhe este item dentro de outro produto. Falhar aqui NÃO desfaz o de cima: o
    // preço do produto está certo, e a tela precisa dizer o que ficou pela metade em
    // vez de fingir que deu tudo errado.
    const sabores = (args && args.sabores) || []
    const extra = A.propagarPreco(item.id, A.precoDigitado(args && args.preco), sabores)
    if (!extra) return { ok: true, resumo: d.resumo }
    const r2 = await mandar(enviar, log, extra.caminho, extra.corpo)
    if (!r2.ok) {
      return { ok: true, parcial: true,
        resumo: d.resumo + ' ⚠️ As ' + sabores.length + ' opções NÃO foram atualizadas — ' + r2.erro }
    }
    return { ok: true, resumo: d.resumo + ' As ' + sabores.length
      + (sabores.length === 1 ? ' opção foi atualizada' : ' opções foram atualizadas') + ' junto.' }
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
