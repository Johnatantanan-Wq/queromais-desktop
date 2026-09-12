// loja-acoes.js — o que se muda na LOJA no meio do movimento, em regra pura.
//
// Aceitar pedidos sozinho, os tempos que o cliente vê, abrir/fechar a loja e pausar
// o cardápio — tudo PATCH em /api/admin/loja. Mais a TV da cozinha (código de acesso),
// o entregador novo, o acerto da rota e o cliente novo. Cada um numa rota que já
// está na main. Quem grava é o painel; aqui se confere o que ele recusaria.

const { valorDigitado } = require('./caixa-acoes')
const { chaveTelefone, digitos } = require('./telefone')

function aceiteAutomatico(ligado) {
  return { ok: true, caminho: '/api/admin/loja', metodo: 'PATCH', corpo: { aceitar_pedidos_auto: !!ligado },
    resumo: ligado ? 'Pedidos passam a ser aceitos automaticamente.' : 'Pedidos voltam a esperar o aceite.' }
}

function lojaAberta(aberta) {
  return { ok: true, caminho: '/api/admin/loja', metodo: 'PATCH', corpo: { aberta: !!aberta },
    resumo: aberta ? 'Loja aberta — o cardápio volta a receber pedidos.' : 'Loja fechada — o cardápio para de receber pedidos.' }
}

/** Tempos em minutos, inteiros, de 1 a 180 — os limites do painel. */
function tempos({ balcao, delivery } = {}) {
  const corpo = {}
  for (const [chave, campo, rotulo] of [[balcao, 'tempo_estimado_balcao', 'Balcão'], [delivery, 'tempo_estimado_delivery', 'Delivery']]) {
    if (chave == null || chave === '') continue
    const n = valorDigitado(chave)
    if (!Number.isInteger(n) || n < 1 || n > 180) return { ok: false, motivo: rotulo + ': minutos inteiros, de 1 a 180.' }
    corpo[campo] = n
  }
  if (!Object.keys(corpo).length) return { ok: false, motivo: 'Informe pelo menos um tempo.' }
  return { ok: true, caminho: '/api/admin/loja', metodo: 'PATCH', corpo,
    resumo: 'Tempos atualizados' + (corpo.tempo_estimado_balcao ? ' · balcão ' + corpo.tempo_estimado_balcao + ' min' : '')
      + (corpo.tempo_estimado_delivery ? ' · delivery ' + corpo.tempo_estimado_delivery + ' min' : '') + '.' }
}

/** Pausar por N minutos, ou retomar (minutos = null). `agora` é parâmetro para o teste. */
function pausar(minutos, agora) {
  if (minutos == null) {
    return { ok: true, caminho: '/api/admin/loja', metodo: 'PATCH', corpo: { pausado_ate: null }, resumo: 'Cardápio de volta ao ar.' }
  }
  const n = Number(minutos)
  if (!Number.isInteger(n) || n < 5 || n > 24 * 60) return { ok: false, motivo: 'Pausa de 5 minutos a 24 horas.' }
  const ate = new Date((agora || Date.now()) + n * 60000).toISOString()
  return { ok: true, caminho: '/api/admin/loja', metodo: 'PATCH', corpo: { pausado_ate: ate },
    resumo: 'Cardápio pausado por ' + (n >= 60 ? (n / 60) + ' h' : n + ' min') + ' — ninguém consegue pedir até lá.' }
}

const gerarCodigoKds = () => ({ ok: true, caminho: '/api/admin/kds/codigo', metodo: 'POST', corpo: {}, resumo: 'Código novo gerado.' })
const revogarTelasKds = () => ({ ok: true, caminho: '/api/admin/kds/revogar', metodo: 'POST', corpo: {},
  resumo: 'Todas as telas foram desconectadas — gere um código novo para ligar de novo.' })

function novoEntregador({ nome, telefone } = {}) {
  const n = ('' + (nome || '')).trim()
  if (n.length < 2) return { ok: false, motivo: 'Diga o nome do entregador (pelo menos duas letras).' }
  const t = digitos(telefone)
  if (t.length < 10) return { ok: false, motivo: 'Telefone com DDD — é por ele que o entregador entra no app.' }
  return { ok: true, caminho: '/api/admin/motoboys', metodo: 'POST', corpo: { nome: n, telefone: t },
    resumo: n + ' cadastrado como entregador.' }
}

function fecharRota(rota, { contado } = {}) {
  const r = rota || {}
  if (!r.rotaId) return { ok: false, motivo: 'Esta rota veio sem identificação — recarregue a tela.' }
  const c = valorDigitado(contado == null || contado === '' ? r.esperadoDeVolta : contado)
  if (!isFinite(c) || c < 0) return { ok: false, motivo: 'Informe quanto o entregador trouxe (pode ser zero).' }
  const esperado = Number(r.esperadoDeVolta) || 0
  const dif = Math.round((c - esperado) * 100) / 100
  return { ok: true, caminho: '/api/admin/rotas/' + r.rotaId + '/fechar', metodo: 'POST', corpo: { dinheiro_contado: c },
    resumo: 'Rota de ' + (r.entregador || '') + ' fechada — trouxe ' + brl(c)
      + (dif === 0 ? ', fechou certo.' : dif > 0 ? ', ' + brl(dif) + ' a mais.' : ', faltaram ' + brl(-dif) + '.') }
}

function novoCliente({ nome, telefone, documento } = {}) {
  const n = ('' + (nome || '')).trim()
  if (n.length < 2) return { ok: false, motivo: 'Diga o nome do cliente (pelo menos duas letras).' }
  if (n.length > 80) return { ok: false, motivo: 'Nome muito longo (até 80 letras).' }
  const t = digitos(telefone)
  if (!chaveTelefone(t)) return { ok: false, motivo: 'Telefone com DDD — é por ele que o cliente é reconhecido.' }
  const corpo = { nome: n, telefone: t }
  const d = ('' + (documento || '')).trim()
  if (d) corpo.documento = d.slice(0, 30)
  return { ok: true, caminho: '/api/admin/clientes', metodo: 'POST', corpo, resumo: n + ' cadastrado.' }
}

function brl(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

module.exports = { aceiteAutomatico, lojaAberta, tempos, pausar, gerarCodigoKds, revogarTelasKds, novoEntregador, fecharRota, novoCliente }
