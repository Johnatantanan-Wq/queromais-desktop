// pre-carga.js — o que o app baixa DE PROPÓSITO para conseguir vender sem internet.
//
// F3.2 da spec de offline (docs/superpowers/specs/2026-09-07-pediu-desktop-f3-offline.md).
//
// O cache que já existe é OPORTUNISTA: guarda o que o lojista abriu. Se ele nunca abriu
// o Cardápio hoje, não há cardápio guardado — e é justamente o cardápio que falta na
// hora em que a internet cai e ele precisa vender. Por isso estas cinco coisas são
// buscadas por conta própria, no boot e de tempos em tempos, mesmo que ninguém abra a
// tela delas.
//
// ⛔ VALIDADE NÃO É PRAZO DE VALIDADE DE BLOQUEIO: dado vencido NÃO impede vender. Ele
// só passa a ser DITO na tela ("o cardápio é de ontem — o preço pode ter mudado").
// Bloquear a venda por cache velho seria parar o balcão para proteger um preço, que é
// exatamente o que o modo offline existe para evitar.

/**
 * O que se guarda, de quanto em quanto tempo, e POR QUAL CANAL.
 *
 * ⛔ `canal`, não `rota`. A primeira versão disto buscava rotas soltas e guardava em
 * chaves próprias (`precarga:cardapio`) — que NENHUMA tela lia. Era cache morto: o app
 * baixava tudo certinho e, na queda, a tela continuava vazia porque procurava o dado
 * em outra chave. Aquecer é chamar o MESMO canal que a tela chama, para o dado cair na
 * MESMA chave que ela lê.
 *
 * As validades são as que o dono fixou na spec: o cardápio muda o dia todo (6 h), as
 * formas e as taxas mudam pouco (12 h), o cliente entra a qualquer hora mas o cadastro
 * velho ainda atende (24 h). O caixa não tem prazo: revalida a cada ciclo, porque é a
 * base do fechamento e muda a cada venda.
 */
const ITENS = [
  { chave: 'cardapio', rotulo: 'cardápio', canal: 'venda-cardapio', validadeMin: 6 * 60,
    porque: 'sem ele não há venda' },
  // Formas e bairros vêm juntos na tela de Configurações, que é onde o app já os lê.
  { chave: 'formas', rotulo: 'formas de pagamento', canal: 'configuracoes-carregar', validadeMin: 12 * 60,
    porque: 'define o que pode ser cobrado' },
  { chave: 'caixa', rotulo: 'caixa do turno', canal: 'caixa-carregar', validadeMin: 0,
    porque: 'base do fechamento' },
  { chave: 'clientes', rotulo: 'clientes recentes', canal: 'clientes-carregar', validadeMin: 24 * 60,
    porque: 'atender por telefone' },
]

const MIN_MS = 60 * 1000

/** Está na hora de buscar de novo? Validade 0 = sempre (o caixa muda a cada venda). */
function precisaRevalidar(item, ts, agora) {
  if (!ts) return true
  if (!item.validadeMin) return true
  return (agora || Date.now()) - ts >= item.validadeMin * MIN_MS
}

/** "há 2 h", "há 3 dias" — a idade dita como gente fala. */
function idade(ts, agora) {
  if (!ts) return 'nunca'
  const min = Math.max(0, Math.floor(((agora || Date.now()) - ts) / MIN_MS))
  if (min < 2) return 'agora mesmo'
  if (min < 60) return 'há ' + min + ' min'
  const h = Math.floor(min / 60)
  if (h < 24) return 'há ' + h + ' h'
  const d = Math.floor(h / 24)
  return 'há ' + d + (d === 1 ? ' dia' : ' dias')
}

/**
 * O retrato do que está guardado: o que serve, o que está velho e o que nunca veio.
 * É com isso que a tela avisa o lojista ANTES de ele precisar — e na hora em que a
 * internet cai, sem ter que adivinhar o que vai faltar.
 */
function estado(lerTs, agora) {
  const hora = agora || Date.now()
  const itens = ITENS.map((i) => {
    const ts = lerTs(i.chave) || 0
    // O caixa revalida sempre, mas não fica "vencido" por isso: o que importa nele é
    // existir uma foto do turno. Marcar como velho a cada ciclo viraria alarme constante.
    const vencido = !!ts && i.validadeMin > 0 && hora - ts >= i.validadeMin * MIN_MS
    return { chave: i.chave, rotulo: i.rotulo, porque: i.porque, ts, vencido, falta: !ts, idade: idade(ts, hora) }
  })
  const falta = itens.filter((i) => i.falta)
  const velho = itens.filter((i) => i.vencido)
  return {
    itens,
    pronto: !falta.length,
    falta,
    velho,
    // A frase que a tela mostra. Uma só, curta, dizendo o que é — não "cache incompleto".
    aviso: falta.length
      ? 'Sem internet, falta ' + lista(falta.map((i) => i.rotulo)) + ' — ainda não foi baixado nenhuma vez.'
      : (velho.length
        ? 'O que está guardado tem tempo: ' + velho.map((i) => i.rotulo + ' ' + i.idade).join(', ')
          + '. Dá para vender, mas o preço pode ter mudado.'
        : ''),
  }
}

function lista(nomes) {
  if (nomes.length <= 1) return nomes[0] || ''
  return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1]
}

/**
 * Uma rodada de pré-carga. Busca só o que está na hora, e uma resposta ruim NÃO apaga o
 * que estava guardado — é a mesma regra da ponte: um 401 no meio do turno não pode
 * esvaziar o cardápio que já estava em disco.
 *
 * Devolve o que foi buscado e o que falhou, para o log dizer a verdade.
 */
async function rodada({ aquecer, tsDe, agora }) {
  const hora = agora || Date.now()
  const buscados = []
  const falhas = []
  for (const item of ITENS) {
    if (!precisaRevalidar(item, tsDe(item.chave), hora)) continue
    let r = null
    try { r = await aquecer(item.canal) } catch (e) { r = null }
    // Vale só o que veio do SERVIDOR agora: `offline: true` é o cache devolvendo o que
    // já tinha, e contar isso como sucesso faria a pré-carga achar que revalidou.
    if (r && r.dados && !r.offline) buscados.push(item.chave)
    else falhas.push(item.chave)
  }
  return { buscados, falhas }
}

module.exports = { ITENS, precisaRevalidar, idade, estado, rodada }
