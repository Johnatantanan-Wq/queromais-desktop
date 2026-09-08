// telefone.js — comparar dois telefones e dizer se são a MESMA pessoa.
//
// Precisa existir porque o mesmo número chega de jeitos diferentes: o WhatsApp manda
// "5575988110001", o cadastro guarda "(75) 98811-0001", e um pedido antigo pode ter
// "75 8811-0001" — sem o nono dígito, que a Anatel acrescentou aos celulares.
//
// A regra é comparar DDD + os OITO últimos dígitos:
//   · os oito últimos ignoram o nono dígito, que às vezes está e às vezes não;
//   · o DDD entra porque 8811-0001 em Salvador e em São Paulo são pessoas diferentes.
//
// Casar errado aqui mostra a conversa de um cliente com o histórico de outro. Na
// dúvida, é melhor não casar: a tela simplesmente não mostra vínculo.

/** Só os dígitos, sem DDI do Brasil. Devolve '' quando não dá para confiar. */
function digitos(t) {
  let d = ('' + (t == null ? '' : t)).replace(/\D/g, '')
  // 55 na frente de um número com DDD (12 ou 13 dígitos) é o código do Brasil.
  if ((d.length === 12 || d.length === 13) && d.indexOf('55') === 0) d = d.slice(2)
  return d
}

/**
 * A chave de comparação: DDD + 8 últimos dígitos. Sem DDD não há chave — número
 * curto demais casaria com muita gente.
 */
function chaveTelefone(t) {
  const d = digitos(t)
  if (d.length < 10) return ''          // 10 = DDD + 8 (fixo antigo); menos que isso, não dá
  const ddd = d.slice(0, 2)
  const oito = d.slice(-8)
  return ddd + oito
}

/** São a mesma pessoa? Sem chave dos dois lados, a resposta é não. */
function mesmoTelefone(a, b) {
  const ka = chaveTelefone(a)
  const kb = chaveTelefone(b)
  return !!ka && ka === kb
}

/** Procura numa lista de cadastros o que bate com o telefone. */
function acharPorTelefone(lista, telefone) {
  const chave = chaveTelefone(telefone)
  if (!chave) return null
  for (const c of (lista || [])) {
    if (chaveTelefone(c && (c.telefone || c.whatsapp || c.celular)) === chave) return c
  }
  return null
}

/** "(75) 98811-0001" — como o lojista lê e disca. */
function formatar(t) {
  const d = digitos(t)
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7)
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6)
  return ('' + (t == null ? '' : t)).trim()
}

module.exports = { digitos, chaveTelefone, mesmoTelefone, acharPorTelefone, formatar }
