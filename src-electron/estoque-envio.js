// estoque-envio.js — os cadastros da Gestão, pela view logada. Todos POST.
const A = require('./estoque-acoes')
const CANAIS = {
  'estoque-sincronizar': () => A.sincronizar(),
  'estoque-nova-categoria': (a) => A.novaCategoria(a || {}),
  'estoque-novo-fornecedor': (a) => A.novoFornecedor(a || {}),
  'estoque-novo-insumo': (a) => A.novoInsumo(a || {}),
  // Gestão pelo app: editar item, ajuste de saldo, entradas à mão, fornecedor, pendência, ficha.
  'estoque-editar-insumo': (a) => A.editarInsumo((a || {}).item, a || {}),
  'estoque-ajuste': (a) => A.ajusteEstoque((a || {}).item, a || {}),
  'estoque-entrada-sem-nota': (a) => A.entradaSemNota(a || {}),
  'estoque-entrada-manual': (a) => A.entradaManual(a || {}),
  'estoque-editar-fornecedor': (a) => A.editarFornecedor((a || {}).fornecedor, a || {}),
  'estoque-excluir-fornecedor': (a) => A.excluirFornecedor((a || {}).fornecedor),
  'estoque-resolver-pendencia': (a) => A.resolverPendencia((a || {}).pendencia, a || {}),
  'estoque-ficha-tecnica': (a) => A.fichaTecnica((a || {}).produto, (a || {}).linhas),
}
function registrar({ ipcMain, enviar, log }) {
  // Reabrir a nota lançada (o "Ajustar" da lista). Confirmação vem da tela: o estorno
  // mexe no estoque de todos os itens da nota.
  ipcMain.handle('estoque-reabrir-nota', async (e, args) => {
    const d = A.reabrirNota(args && args.nota)
    if (!d.ok) return { ok: false, erro: d.motivo }
    let r = null
    try { r = await enviar(d.caminho, d.corpo) } catch (err) {
      if (log) log.warn('[ESTOQUE] reabrir falhou:', err && err.message)
      return { ok: false, erro: 'Não deu para falar com o painel agora. A nota não foi reaberta.' }
    }
    if (!r) return { ok: false, erro: 'Sem resposta do painel. A nota não foi reaberta.' }
    if (r.error) return { ok: false, erro: String(r.error) }
    return { ok: true, resumo: d.resumo }
  })
  for (const canal of Object.keys(CANAIS)) {
    ipcMain.handle(canal, async (e, args) => {
      const d = CANAIS[canal](args)
      if (!d.ok) return { ok: false, erro: d.motivo }
      let r = null
      // O método é o da decisão (PATCH por id, PUT da ficha, DELETE); sem ele, POST.
      try { r = await enviar(d.caminho, d.corpo, d.metodo) } catch (err) {
        if (log) log.warn('[ESTOQUE] ' + canal + ' falhou:', err && err.message)
        return { ok: false, erro: 'Não deu para falar com o painel agora. Nada foi gravado.' }
      }
      if (!r) return { ok: false, erro: 'Sem resposta do painel. Nada foi gravado.' }
      if (r.error) return { ok: false, erro: String(r.error) }
      // A sincronização devolve o que fez: contar é melhor do que dizer "pronto".
      const partes = []
      if (r.criados != null) partes.push(r.criados + ' criado(s)')
      if (r.vinculados != null) partes.push(r.vinculados + ' vinculado(s)')
      return { ok: true, resumo: partes.length ? 'Sincronizado: ' + partes.join(', ') + '.' : d.resumo }
    })
  }
}
module.exports = { registrar, CANAIS }
