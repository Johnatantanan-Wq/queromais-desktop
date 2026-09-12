/**
 * fila-escrita.js — o que o app fez SEM internet, esperando para subir (F3.3/F3.4).
 *
 * Spec: docs/superpowers/specs/2026-09-07-pediu-desktop-f3-offline.md
 *
 * Enquanto não há rede, a fila É a verdade da operação: a venda fechada aqui já vale
 * para o balcão (número provisório, comanda impressa, soma no Caixa e no quadro), e
 * sobe sozinha quando a conexão volta. Cada item viaja com `id_cliente_app` — o
 * servidor reconhece o id (F3.1) e devolve o que já existe; por isso reenviar é seguro
 * e, para a fila, "já existe" (repetida) É sucesso.
 *
 * Regras que doem quando erram:
 *  • FIFO estrito: a ordem venda → sangria → fechamento importa. Falha de REDE, de
 *    SESSÃO (401) ou do SERVIDOR (5xx) PARA a fila e mantém tudo — o próximo espera a vez.
 *  • 4xx marca o item com erro e a fila SEGUE: um 400 não se cura sozinho, e travar a
 *    fila por ele seguraria o fechamento para sempre. O item continua guardado (e
 *    exportável) — a tela diz o erro em português; ninguém apaga venda em silêncio.
 *  • 5xx conta tentativa; depois de N, vira erro e a fila segue.
 *  • Tudo em disco (cifrado pelo store injetado), a cada mudança: o app pode fechar no
 *    meio e a fila continua de onde parou, inclusive o contador do número provisório.
 */

const MAX_SUBIDAS = 50

function criarFila({ store, chave, prefixo, agora, gerarId }) {
  prefixo = prefixo || 'L'
  agora = agora || Date.now
  let disco = { itens: [], subidas: [], contador: 0, conferencia: null }
  const guardado = store.get(chave)
  if (guardado && guardado.body && Array.isArray(guardado.body.itens)) disco = { ...disco, ...guardado.body }

  const salvar = () => { try { store.set(chave, { status: 200, body: disco }) } catch (e) {} }
  const iso = () => new Date(agora()).toISOString()

  function enfileirar({ tipo, caminho, corpo, resumo }) {
    const c = corpo || {}
    const item = {
      id: c.id_cliente_app || (gerarId ? gerarId() : String(agora())),
      tipo, caminho, corpo: c, resumo: resumo || null,
      provisorio: null, criadoEm: iso(), tentativas: 0, erro: null,
    }
    // O número provisório é visível: sai na comanda e no recibo. Continua de onde
    // parou mesmo depois de fechar o app, senão duas vendas teriam o mesmo L-1.
    if (tipo === 'venda') { disco.contador += 1; item.provisorio = prefixo + '-' + disco.contador }
    disco.itens.push(item)
    salvar()
    return item
  }

  const pendentes = () => disco.itens.filter((i) => !i.erro)
  const comErro = () => disco.itens.filter((i) => !!i.erro)
  const todos = () => disco.itens.slice()
  const tamanho = () => disco.itens.length
  const subidas = () => disco.subidas.slice()
  const fechamentoPendente = () => pendentes().find((i) => i.tipo === 'fechamento') || null
  const conferencia = () => disco.conferencia || null

  function remover(id) {
    disco.itens = disco.itens.filter((i) => i.id !== id)
    salvar()
  }

  /** A resposta `definitivo: false` do fechar — o turno espera o lojista conferir. */
  function guardarConferencia(c) {
    disco.conferencia = c || null
    salvar()
  }

  function registrarSubida(item, body) {
    disco.subidas.push({ provisorio: item.provisorio, numero: body && body.numero, id: body && body.id, em: iso() })
    if (disco.subidas.length > MAX_SUBIDAS) disco.subidas = disco.subidas.slice(-MAX_SUBIDAS)
  }

  let emAndamento = null
  /**
   * Sobe o que dá, em ordem. `enviar(caminho, corpo)` devolve `{ status, body }` (ou
   * lança, em falha de rede). Devolve quantos subiram e POR QUE parou, se parou.
   */
  function processar({ enviar, online, aoSubir, maxTentativas }) {
    // Single-flight: o monitor de rede, o relógio e o botão "tentar agora" podem
    // chamar ao mesmo tempo — a mesma venda não pode sair duas vezes em paralelo.
    if (emAndamento) return emAndamento
    emAndamento = rodada({ enviar, online, aoSubir, maxTentativas }).finally(() => { emAndamento = null })
    return emAndamento
  }

  async function rodada({ enviar, online, aoSubir, maxTentativas }) {
    const max = maxTentativas || 5
    let subiram = 0
    for (const item of pendentes()) {
      if (online && !online()) return { subiram, parou: 'offline' }
      let r = null
      try { r = await enviar(item.caminho, item.corpo) } catch (e) { r = null }
      const status = r ? (Number(r.status) || 0) : 0
      const body = r ? r.body : null
      if (status === 0) return { subiram, parou: 'rede' }
      if (status >= 200 && status < 300) {
        remover(item.id)
        if (item.tipo === 'venda') registrarSubida(item, body)
        salvar()
        subiram += 1
        try { if (aoSubir) await aoSubir(item, body) } catch (e) {}
        continue
      }
      if (status === 401 || status === 403) return { subiram, parou: 'sessao' }
      const doPainel = body && body.error ? String(body.error) : null
      if (status >= 500) {
        item.tentativas += 1
        if (item.tentativas >= max) {
          item.erro = doPainel || ('O servidor não conseguiu receber (' + status + ') depois de ' + max + ' tentativas.')
          salvar()
          continue
        }
        salvar()
        return { subiram, parou: 'servidor' }
      }
      item.erro = doPainel || ('O painel recusou (' + status + ').')
      salvar()
    }
    return { subiram, parou: null }
  }

  /** O que a topbar e a tela do Caixa precisam saber, numa olhada. */
  function estado() {
    const p = pendentes()
    const e = comErro()
    const total = p.filter((i) => i.tipo === 'venda')
      .reduce((s, i) => s + (Number(i.resumo && i.resumo.total) || 0), 0)
    const fp = fechamentoPendente()
    return {
      pendentes: p.length,
      comErro: e.length,
      total: Math.round(total * 100) / 100,
      ultimoErro: e.length ? e[e.length - 1].erro : null,
      conferencia: !!disco.conferencia,
      // A lista resumida, para a ficha da fila: o lojista vê o que espera e o que travou.
      itens: disco.itens.map((i) => {
        const r = i.resumo || {}
        const c = i.corpo || {}
        const cliente = i.tipo === 'venda' ? (r.cliente || 'Consumidor')
          : i.tipo === 'movimentacao' ? (c.motivo || (c.tipo === 'suprimento' ? 'Suprimento' : 'Sangria'))
          : 'Fechamento do caixa'
        const valor = i.tipo === 'venda' ? (Number(r.total) || 0) : i.tipo === 'movimentacao' ? (Number(c.valor) || 0) : (Number(c.dinheiro_contado) || 0)
        return { id: i.id, tipo: i.tipo, provisorio: i.provisorio, cliente, valor, erro: i.erro, criadoEm: i.criadoEm }
      }),
      fechamentoProvisorio: fp ? {
        em: fp.corpo.fechado_no_app_em || fp.criadoEm,
        contados: { dinheiro: fp.corpo.dinheiro_contado, pix: fp.corpo.pix_contado, cartao: fp.corpo.cartao_contado },
      } : null,
    }
  }

  /** Tudo que está guardado, para o lojista não perder venda se a fila nunca subir. */
  function exportar() {
    return JSON.stringify({ exportadoEm: iso(), chave, itens: todos(), subidas: subidas(), conferencia: conferencia() }, null, 2)
  }

  return {
    enfileirar, pendentes, comErro, todos, tamanho, remover, subidas,
    fechamentoPendente, conferencia, guardarConferencia, processar, estado, exportar,
  }
}

module.exports = { criarFila, MAX_SUBIDAS }
