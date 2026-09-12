// contas-acoes.js — contas a pagar e a receber, em regra pura.
//
// Duas coisas: dar BAIXA numa conta (pagar/receber, inteira ou parcial) e lançar uma
// conta nova. Quem grava é o painel: POST /api/admin/contas/<id>/baixas registra cada
// baixa sem nunca alterar o valor original da obrigação, e POST /api/admin/contas
// cria a conta com quem lançou. O que se recusa aqui é o que o painel recusaria —
// com a mesma frase, para o lojista não precisar de duas explicações.

const { valorDigitado } = require('./caixa-acoes')

const FORMAS = ['dinheiro', 'pix', 'debito', 'credito', 'boleto', 'cheque', 'transferencia', 'debito_automatico']
const NOME_FORMA = {
  dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito', boleto: 'Boleto',
  cheque: 'Cheque', transferencia: 'Transferência', debito_automatico: 'Débito automático',
}

const arred = (v) => Math.round(v * 100) / 100
function hojeISO() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
/** "10/09/2026" → "2026-09-10"; "2026-09-10" fica. Outra coisa → ''. */
function dataISO(v) {
  const t = ('' + (v || '')).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? m[3] + '-' + m[2] + '-' + m[1] : ''
}
function saldoDe(c) {
  return arred(Math.max(0, (Number(c.valor) || 0) - (Number(c.valorPago) || 0)))
}

/** Baixa: pagamento (ou recebimento) de uma conta. `hoje` é parâmetro para o teste. */
function baixa(conta, { valor, data, forma, observacao } = {}, hoje) {
  const c = conta || {}
  hoje = hoje || hojeISO()
  if (!c.id) return { ok: false, motivo: 'Esta conta veio sem identificação — recarregue a tela.' }
  if (c.situacao === 'paga' || c.situacao === 'recebida') return { ok: false, motivo: 'Esta conta já está quitada.' }
  if (c.situacao === 'cancelada') return { ok: false, motivo: 'Conta cancelada não pode receber baixa.' }

  const saldo = saldoDe(c)
  const v = arred(valorDigitado(valor == null || valor === '' ? saldo : valor))
  if (!isFinite(v) || v <= 0) return { ok: false, motivo: 'Informe um valor maior que zero.' }
  if (v > saldo + 0.001) {
    return { ok: false, motivo: 'Valor acima do saldo devedor (' + saldo.toFixed(2).replace('.', ',') + ').' }
  }
  const d = data ? dataISO(data) : hoje
  if (!d) return { ok: false, motivo: 'Informe a data no formato dd/mm/aaaa.' }
  if (d > hoje) return { ok: false, motivo: 'A data do pagamento não pode ser futura.' }
  const f = ('' + (forma || '')).trim()
  if (f && FORMAS.indexOf(f) < 0) return { ok: false, motivo: 'Forma de pagamento desconhecida.' }

  const corpo = { valor: v, data: d }
  if (f) corpo.forma_pagamento = f
  const obs = ('' + (observacao || '')).trim()
  if (obs) corpo.observacao = obs.slice(0, 300)
  const quita = v >= saldo - 0.001
  const verbo = c.direcao === 'receber' ? 'Recebid' : 'Pag'
  return {
    ok: true, caminho: '/api/admin/contas/' + c.id + '/baixas', corpo,
    quita,
    resumo: (quita ? verbo + 'a por inteiro' : verbo + 'o ' + brl(v) + ' — restam ' + brl(arred(saldo - v)))
      + (f ? ' em ' + (NOME_FORMA[f] || f) : '') + '.',
  }
}

const DIA_MS = 86400000

/** Sábado/domingo anda para segunda — banco e fornecedor não compensam no fim de semana. */
function diaUtil(d) {
  const semana = d.getUTCDay()
  if (semana === 6) return new Date(d.getTime() + 2 * DIA_MS)
  if (semana === 0) return new Date(d.getTime() + DIA_MS)
  return d
}

/** Mesmo dia, N meses depois. Dia que não existe no mês de destino TRANSBORDA para o
 *  seguinte (31/01 + 1 mês cai em março, porque fevereiro não tem 31) — é a regra que o
 *  dono descreveu no painel. */
function somarMeses(baseISO, meses) {
  const [a, m, d] = ('' + baseISO).split('-').map(Number)
  const alvoMes = m - 1 + meses
  const ano = a + Math.floor(alvoMes / 12)
  const mes = ((alvoMes % 12) + 12) % 12
  return new Date(Date.UTC(ano, mes, d))
}

const isoDe = (d) => d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0')
  + '-' + String(d.getUTCDate()).padStart(2, '0')

/**
 * A grade de parcelas sugerida — porte de `parcelasSugeridas` do painel (09/09/2026).
 *
 * Quem tem a nota na mão sabe o TOTAL, não a divisão: o operador informa o valor do
 * lançamento e em quantas vezes, e o sistema divide e sugere as datas.
 *
 * ⚠️ A sobra dos centavos vai na ÚLTIMA parcela: a soma tem que fechar com o total da
 * nota, senão o fornecedor cobra um centavo que o sistema não tem.
 */
function parcelasSugeridas(valorTotal, parcelas, primeiroVencimento) {
  const n = Math.max(1, Math.floor(Number(parcelas) || 1))
  const centavos = Math.round((Number(valorTotal) || 0) * 100)
  const base = Math.floor(centavos / n)
  const out = []
  for (let i = 0; i < n; i++) {
    const cent = i === n - 1 ? centavos - base * (n - 1) : base
    out.push({ numero: i + 1, valor: cent / 100, vencimento: isoDe(diaUtil(somarMeses(primeiroVencimento, i))) })
  }
  return out
}

/** Conta nova, avulsa: uma obrigação, um vencimento. */
function nova({ direcao, descricao, valor, vencimento, forma, categoria, contraparte, documento, parcelas } = {}) {
  if (direcao !== 'pagar' && direcao !== 'receber') return { ok: false, motivo: 'Diga se é a pagar ou a receber.' }
  const desc = ('' + (descricao || '')).trim()
  if (!desc) return { ok: false, motivo: 'Diga do que é a conta.' }
  const v = arred(valorDigitado(valor))
  if (!isFinite(v) || v <= 0) return { ok: false, motivo: 'Informe um valor maior que zero.' }
  const venc = dataISO(vencimento)
  if (!venc) return { ok: false, motivo: 'Informe o vencimento no formato dd/mm/aaaa.' }
  const f = ('' + (forma || '')).trim()
  if (f && FORMAS.indexOf(f) < 0) return { ok: false, motivo: 'Forma de pagamento desconhecida.' }
  const corpo = { direcao, descricao: desc, valor: v, vencimento: venc }
  if (f) corpo.forma_pagamento = f
  if (categoria && ('' + categoria).trim()) corpo.categoria = ('' + categoria).trim()
  if (contraparte && ('' + contraparte).trim()) corpo.contraparte = ('' + contraparte).trim()
  // Documento de referência (o número da NF do fornecedor). Antes só existia solto
  // dentro da descrição, e ninguém achava pela busca.
  const doc = ('' + (documento || '')).trim()
  if (doc) corpo.documento = doc.slice(0, 60)

  // Parcelado: o valor digitado é o TOTAL da nota, e o painel recebe a grade pronta.
  const n = Math.max(1, Math.floor(Number(parcelas) || 1))
  if (n > 1) {
    if (n > 60) return { ok: false, motivo: 'No máximo 60 parcelas.' }
    const grade = parcelasSugeridas(v, n, venc)
    return {
      ok: true, caminho: '/api/admin/contas',
      corpo: { ...corpo, natureza: 'parcelada', parcelas: n, primeiro_vencimento: venc,
        valor_parcela: grade[0].valor, parcelas_detalhe: grade },
      parcelas: grade,
      resumo: 'Conta a ' + direcao + ' lançada em ' + n + 'x: ' + desc + ', ' + brl(v) + ' no total, '
        + 'a primeira de ' + brl(grade[0].valor) + ' em ' + grade[0].vencimento.split('-').reverse().join('/') + '.',
    }
  }
  return {
    ok: true, caminho: '/api/admin/contas', corpo,
    resumo: 'Conta a ' + direcao + ' lançada: ' + desc + ', ' + brl(v) + ' para ' + venc.split('-').reverse().join('/') + '.',
  }
}


// ── Lançamento avulso, editar e cancelar (Financeiro pelo app) ───────────────
// As categorias são as do plano gerencial do painel (lib/financeiro/plano.ts): a lista
// mora lá; aqui é cópia só para o select — o servidor é quem valida.
const CATEGORIAS_DESPESA = ['Insumos', 'Mercadorias para revenda', 'Embalagens', 'Salários', 'Pró-labore', 'Encargos e benefícios',
  'Taxa de serviço — repasse', 'Aluguel', 'Energia', 'Água', 'Gás', 'Internet', 'Entregadores', 'Combustível', 'Marketing', 'Comissões',
  'Taxa cartão', 'Taxa gateway', 'Taxa iFood', 'Tarifas bancárias', 'Manutenção', 'Contabilidade', 'Software e sistemas', 'Impostos', 'Outras']
const CATEGORIAS_RECEITA = ['Vendas', 'Taxa de serviço', 'Taxa de entrega', 'Outras receitas']
const CENTROS_CUSTO = [
  { v: 'administrativo', r: 'Administrativo' }, { v: 'cozinha', r: 'Cozinha' }, { v: 'bar', r: 'Bar' }, { v: 'salao', r: 'Salão' },
  { v: 'delivery', r: 'Delivery' }, { v: 'marketing', r: 'Marketing' }, { v: 'financeiro', r: 'Financeiro' }, { v: 'outros', r: 'Outros' },
]

/** Lançamento manual no extrato: uma receita ou uma despesa que já aconteceu. */
function lancamento({ tipo, categoria, descricao, valor, data, centroCusto, forma, contaFinanceiraId } = {}) {
  if (tipo !== 'receita' && tipo !== 'despesa') return { ok: false, motivo: 'Diga se é receita ou despesa.' }
  const cat = ('' + (categoria || '')).trim()
  if (!cat) return { ok: false, motivo: 'Escolha a categoria.' }
  const desc = ('' + (descricao || '')).trim()
  if (!desc) return { ok: false, motivo: 'Diga do que é o lançamento (descrição).' }
  const v = arred(valorDigitado(valor))
  if (!isFinite(v) || v <= 0) return { ok: false, motivo: 'Informe um valor maior que zero.' }
  const d = dataISO(data)
  if (!d) return { ok: false, motivo: 'Informe a data no formato dd/mm/aaaa.' }
  const corpo = { tipo, categoria: cat, descricao: desc, valor: v, data: d }
  const cc = ('' + (centroCusto || '')).trim()
  if (cc) corpo.centro_custo = cc
  const f = ('' + (forma || '')).trim()
  if (f) corpo.forma_pagamento = f
  const conta = ('' + (contaFinanceiraId || '')).trim()
  if (conta) corpo.conta_financeira_id = conta
  return {
    ok: true, caminho: '/api/admin/lancamentos', metodo: 'POST', corpo,
    resumo: (tipo === 'receita' ? 'Receita' : 'Despesa') + ' lançada: ' + desc + ', ' + brl(v) + ' em ' + d.split('-').reverse().join('/') + '.',
  }
}

/** Editar uma conta em aberto: descrição, valor, vencimento, categoria, contraparte, observação. */
function editar(conta, campos) {
  const c = conta || {}, k = campos || {}
  if (!c.id) return { ok: false, motivo: 'Esta conta veio sem identificação — recarregue a tela.' }
  if (c.situacao === 'paga' || c.situacao === 'recebida') return { ok: false, motivo: 'Conta quitada não se edita — estorne a baixa pelo painel antes.' }
  if (c.situacao === 'cancelada') return { ok: false, motivo: 'Conta cancelada não se edita.' }
  const corpo = {}
  if (k.descricao !== undefined) {
    const desc = ('' + k.descricao).trim()
    if (!desc) return { ok: false, motivo: 'A descrição não pode ficar em branco.' }
    if (desc !== ('' + (c.descricao || '')).trim()) corpo.descricao = desc
  }
  if (k.valor !== undefined && ('' + k.valor).trim() !== '') {
    const v = arred(valorDigitado(k.valor))
    if (!isFinite(v) || v <= 0) return { ok: false, motivo: 'Informe um valor maior que zero.' }
    if (Math.abs(v - (Number(c.valor) || 0)) > 0.001) corpo.valor = v
  }
  if (k.vencimento !== undefined && ('' + k.vencimento).trim() !== '') {
    const venc = dataISO(k.vencimento)
    if (!venc) return { ok: false, motivo: 'Informe o vencimento no formato dd/mm/aaaa.' }
    if (venc !== c.vencimento) corpo.vencimento = venc
  }
  if (k.categoria !== undefined && ('' + k.categoria).trim() !== ('' + (c.categoria || '')).trim()) corpo.categoria = ('' + k.categoria).trim() || null
  if (k.contraparte !== undefined && ('' + k.contraparte).trim() !== ('' + (c.contraparte || '')).trim()) corpo.contraparte = ('' + k.contraparte).trim() || null
  if (k.observacao !== undefined && ('' + k.observacao).trim() !== ('' + (c.observacao || '')).trim()) corpo.observacao = ('' + k.observacao).trim()
  if (!Object.keys(corpo).length) return { ok: false, motivo: 'Nada mudou.' }
  return { ok: true, caminho: '/api/admin/contas/' + c.id, metodo: 'PATCH', corpo, resumo: 'Conta "' + (corpo.descricao || c.descricao || '') + '" salva.' }
}

/** Cancelar: a conta some da régua (não é apagada). Parcelada pode cancelar a série. */
function cancelar(conta, escopo) {
  const c = conta || {}
  if (!c.id) return { ok: false, motivo: 'Esta conta veio sem identificação — recarregue a tela.' }
  if (c.situacao === 'paga' || c.situacao === 'recebida') return { ok: false, motivo: 'Conta quitada não se cancela — estorne a baixa pelo painel.' }
  if (c.situacao === 'cancelada') return { ok: false, motivo: 'Esta conta já está cancelada.' }
  const serie = escopo === 'serie' && c.serie
  const corpo = serie ? { acao: 'cancelar', escopo: 'serie' } : { acao: 'cancelar' }
  return { ok: true, caminho: '/api/admin/contas/' + c.id, metodo: 'PATCH', corpo,
    resumo: serie ? 'A série inteira foi cancelada.' : 'Conta "' + (c.descricao || '') + '" cancelada.' }
}

function brl(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

module.exports = { baixa, nova, lancamento, editar, cancelar, saldoDe, dataISO, hojeISO, FORMAS, NOME_FORMA, parcelasSugeridas,
  CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, CENTROS_CUSTO }
