// pedido-acoes.js — o que acontece quando alguém clica no botão do cartão do quadro.
//
// Regra pura, sem Electron e sem rede: recebe o pedido e a etapa em que ele está,
// devolve para onde ir e o que mandar. O painel continua sendo quem faz o trabalho —
// POST /api/admin/pedidos/<id>/status já baixa estoque, lança no caixa, emite nota,
// pontua fidelidade e dispara o WhatsApp. O app não repete nada disso: só pede.

/** A etapa do quadro → o status que o painel entende. */
const PROXIMO = {
  analise: 'em_producao',
  producao: 'pronto',
  pronto: 'em_entrega',
  transito: 'entregue',
  entregue: null,
}

/** Consumo local não "sai para entrega": é servido na mesa. */
function ehLocal(p) {
  const canal = ('' + ((p && p.canal) || '')).toLowerCase()
  return (p && p.tipo === 'consumo_local') || canal.indexOf('mesa') >= 0 || canal.indexOf('local') >= 0
}

/**
 * O que o app deve fazer para avançar este pedido. Devolve sempre o mesmo formato:
 *  { ok: true, caminho, corpo, status }  → pode mandar
 *  { ok: false, motivo }                 → não dá, e o porquê vai para a tela
 */
function avanco(pedido, etapa) {
  const p = pedido || {}
  if (!p.id) {
    return { ok: false, motivo: 'Este pedido veio sem identificação — recarregue a tela.' }
  }
  const status = PROXIMO[etapa]
  if (!status) return { ok: false, motivo: 'O pedido já está na última etapa.' }

  // Mesa: "servir" tem rota própria no painel; despachar entrega não se aplica.
  if (status === 'em_entrega' && ehLocal(p)) {
    return { ok: true, caminho: '/api/admin/pedidos/' + p.id + '/servir', corpo: {}, status: 'servido' }
  }

  // Entrega sem entregador o painel recusa com 422. Avisar antes vale mais do que
  // mandar, tomar o erro e traduzir de volta.
  if (status === 'em_entrega' && p.tipo === 'entrega' && !p.motoboyId) {
    return { ok: false, motivo: 'Escolha o entregador antes de despachar — é pelo Despacho, no painel.' }
  }

  return { ok: true, caminho: '/api/admin/pedidos/' + p.id + '/status', corpo: { status }, status }
}

/** A etapa em que o pedido fica DEPOIS do avanço — o quadro se redesenha com ela. */
const ETAPA_DEPOIS = {
  analise: 'producao', producao: 'pronto', pronto: 'transito', transito: 'entregue',
}

/**
 * Correção de telefone e endereço num pedido já feito — o que se descobre falando com
 * o cliente. O painel recusa endereço pela metade: rua, número, bairro, cidade, UF e
 * CEP vão juntos ou não vai nada. Conferir aqui evita "Dados inválidos" sem dizer o quê.
 */
const OBRIGATORIOS = [
  { chave: 'rua', rotulo: 'rua' }, { chave: 'numero', rotulo: 'número' },
  { chave: 'bairro', rotulo: 'bairro' }, { chave: 'cidade', rotulo: 'cidade' },
  { chave: 'uf', rotulo: 'UF' }, { chave: 'cep', rotulo: 'CEP' },
]

function correcao(pedido, campos) {
  const p = pedido || {}
  const c = campos || {}
  if (!p.id) return { ok: false, motivo: 'Este pedido veio sem identificação — recarregue a tela.' }

  const corpo = {}
  const tel = ('' + (c.telefone || '')).trim()
  if (tel) {
    if (('' + tel).replace(/\D/g, '').length < 10) {
      return { ok: false, motivo: 'Telefone precisa ter DDD e número.' }
    }
    if (tel !== ('' + (p.telefone || '')).trim()) corpo.cliente_telefone = tel
  }

  // Endereço só entra se o pedido tem endereço (entrega) e alguma coisa mudou.
  if (p.enderecoCampos) {
    const novo = {}
    for (const k of ['rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep', 'referencia']) {
      novo[k] = ('' + (c[k] != null ? c[k] : (p.enderecoCampos[k] || ''))).trim()
    }
    const mudou = Object.keys(novo).some((k) => novo[k] !== ('' + (p.enderecoCampos[k] || '')).trim())
    if (mudou) {
      const faltando = OBRIGATORIOS.filter((o) => !novo[o.chave]).map((o) => o.rotulo)
      if (faltando.length) {
        return { ok: false, motivo: 'Falta preencher: ' + faltando.join(', ') + '.' }
      }
      if (novo.uf.length !== 2) return { ok: false, motivo: 'UF tem duas letras (ex.: BA).' }
      if (novo.cep.replace(/\D/g, '').length !== 8) return { ok: false, motivo: 'CEP precisa ter 8 dígitos.' }
      corpo.endereco = novo
    }
  }

  if (!Object.keys(corpo).length) return { ok: false, motivo: 'Nada mudou.' }
  return {
    ok: true,
    caminho: '/api/admin/pedidos/' + p.id + '/editar',
    corpo,
    // O bairro muda a taxa: quem corrigiu precisa saber que o total pode ter mudado.
    trocouBairro: !!(corpo.endereco && corpo.endereco.bairro !== ('' + (p.enderecoCampos.bairro || '')).trim()),
  }
}

module.exports = { avanco, correcao, PROXIMO, ETAPA_DEPOIS, ehLocal }
