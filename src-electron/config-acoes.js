/**
 * config-acoes.js — Configurações pelo app: o que cada ficha manda ao painel.
 *
 * Regra pura, sem Electron e sem rede (mesmo espírito de caixa-acoes.js): aqui só se
 * decide PARA ONDE e O QUE mandar, com os MESMOS campos e rotas dos formulários do
 * painel. Quem grava é o painel. O que é recusado aqui é o que ele recusaria com 400 —
 * vale mais dizer na hora, com frase de gente.
 *
 * ⛔ Campo em branco NÃO é enviado: o PATCH da loja é parcial, e em produção o GET da
 * loja devolve só 10 colunas — mandar branco apagaria o que o app não vê.
 * ⛔ Sem taxa de serviço e sem taxa de entrega padrão aqui (regra do dono, 02/09/2026).
 */

const t = (v) => ('' + (v == null ? '' : v)).trim()
/** "12,50" → 12.5; vazio → NaN. */
function numero(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN
  const s = t(v).replace(/\s/g, '').replace(/\./g, (m, i, str) => (str.indexOf(',') >= 0 ? '' : m)).replace(',', '.')
  return s === '' ? NaN : Number(s)
}
const inteiro = (v) => { const n = numero(v); return isFinite(n) ? Math.round(n) : NaN }
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

// ── Dados da loja ────────────────────────────────────────────────────────────
const MODALIDADES = ['entrega', 'retirada', 'consumo_local']

function loja(campos) {
  const c = campos || {}
  const corpo = {}
  if (t(c.nome)) corpo.nome = t(c.nome)
  if (t(c.telefone)) corpo.telefone = t(c.telefone)
  if (t(c.mapsUrl)) {
    if (!/^https?:\/\//i.test(t(c.mapsUrl))) return { ok: false, motivo: 'O link do mapa precisa começar com https://.' }
    corpo.maps_url = t(c.mapsUrl)
  }
  const end = { rua: t(c.rua), numero: t(c.numero), complemento: t(c.complemento), bairro: t(c.bairro), cidade: t(c.cidade), uf: t(c.uf).toUpperCase(), cep: t(c.cep) }
  if (Object.values(end).some(Boolean)) {
    if (!(end.rua && end.numero && end.bairro && end.cidade && end.uf)) {
      return { ok: false, motivo: 'Para mudar o endereço, preencha rua, número, bairro, cidade e UF — o painel grava o endereço inteiro.' }
    }
    if (end.uf.length !== 2) return { ok: false, motivo: 'UF com 2 letras (ex.: BA).' }
    corpo.endereco = end
  }
  if (Array.isArray(c.modalidades)) {
    const m = c.modalidades.filter((x) => MODALIDADES.indexOf(x) >= 0)
    if (!m.length) return { ok: false, motivo: 'Escolha ao menos uma modalidade: entrega, retirada ou consumo no local.' }
    corpo.modalidades_pedido = m
  }
  const tempos = [['balcao', 'tempo_estimado_balcao'], ['delivery', 'tempo_estimado_delivery'], ['local', 'tempo_estimado_local']]
  for (const [chave, campo] of tempos) {
    if (t(c[chave]) === '') continue
    const n = inteiro(c[chave])
    if (!(n >= 1 && n <= 180)) return { ok: false, motivo: 'O tempo estimado fica entre 1 e 180 minutos.' }
    corpo[campo] = n
  }
  if (t(c.pixChave)) corpo.pix_chave = t(c.pixChave)
  if (typeof c.numeracaoDiaria === 'boolean') corpo.numeracao_diaria = c.numeracaoDiaria
  if (t(c.modoHorario)) {
    if (['manual', 'automatico'].indexOf(t(c.modoHorario)) < 0) return { ok: false, motivo: 'O horário é manual ou automático.' }
    corpo.modo_horario = t(c.modoHorario)
  }
  if (!Object.keys(corpo).length) return { ok: false, motivo: 'Nada para salvar — preencha o que quer mudar.' }
  return { ok: true, caminho: '/api/admin/loja', metodo: 'PATCH', corpo, resumo: 'Dados da loja salvos.' }
}

// ── Horários ─────────────────────────────────────────────────────────────────
const DIAS = [['dom', 'domingo'], ['seg', 'segunda'], ['ter', 'terça'], ['qua', 'quarta'], ['qui', 'quinta'], ['sex', 'sexta'], ['sab', 'sábado']]

function horarios(campos) {
  const c = campos || {}
  const dias = c.dias || {}
  const horariosCorpo = {}
  for (const [chave, nome] of DIAS) {
    const d = dias[chave] || {}
    const abre = t(d.abre), fecha = t(d.fecha)
    if (!abre && !fecha) { horariosCorpo[chave] = { abre: null, fecha: null }; continue }
    if (!abre || !fecha) return { ok: false, motivo: 'Na ' + nome + ' informe abre e fecha — ou deixe os dois em branco para fechado.' }
    if (!HORA.test(abre) || !HORA.test(fecha)) return { ok: false, motivo: 'Hora da ' + nome + ' no formato HH:MM (ex.: 18:00).' }
    horariosCorpo[chave] = { abre, fecha }
  }
  const corpo = { horarios: horariosCorpo }
  if (t(c.timezone)) corpo.timezone = t(c.timezone)
  return { ok: true, caminho: '/api/admin/horarios', metodo: 'PATCH', corpo, resumo: 'Horários salvos.' }
}

// ── Rotas: bairros e taxas ───────────────────────────────────────────────────
function bairros(campos) {
  const c = campos || {}
  const lista = (Array.isArray(c.bairros) ? c.bairros : []).map((b) => ({ ...b, nome: t(b && b.nome) })).filter((b) => b.nome)
  if (!lista.length) return { ok: false, motivo: 'Cadastre ao menos um bairro de entrega.' }
  const vistos = new Set()
  const nomes = []
  const taxas = {}
  for (const b of lista) {
    const chave = b.nome.toLowerCase()
    if (vistos.has(chave)) return { ok: false, motivo: 'Bairro repetido: ' + b.nome + '.' }
    vistos.add(chave)
    nomes.push(b.nome)
    const taxa = t(b.taxa) === '' ? 0 : numero(b.taxa)
    if (!(taxa >= 0)) return { ok: false, motivo: 'A taxa de ' + b.nome + ' precisa ser um valor (ex.: 5,00).' }
    taxas[b.nome] = { taxa: Math.round(taxa * 100) / 100, ativo: b.ativo !== false }
  }
  const corpo = { bairros: nomes, taxas_bairro: taxas }
  if (t(c.entregaGratisAcima) !== '') {
    const g = numero(c.entregaGratisAcima)
    if (!(g >= 0)) return { ok: false, motivo: 'O valor da entrega grátis precisa ser um número.' }
    corpo.entrega_gratis_valor_min = g
  }
  return { ok: true, caminho: '/api/admin/bairros', metodo: 'PATCH', corpo, resumo: nomes.length + (nomes.length === 1 ? ' bairro salvo.' : ' bairros salvos.') }
}

// ── Formas de pagamento ──────────────────────────────────────────────────────
const TIPOS_FORMA = ['delivery', 'retirada', 'balcao', 'consumo_local']
const NOME_METODO = { dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito', cartao: 'Cartão', cartao_entrega: 'Cartão na entrega', vale: 'Vale-refeição' }

/** Traduz os campos da ficha para o corpo do painel — só o que veio. */
function corpoDaForma(c) {
  const corpo = {}
  if (Array.isArray(c.tipos)) corpo.tipos = c.tipos.filter((x) => TIPOS_FORMA.indexOf(x) >= 0)
  if (typeof c.habilitado === 'boolean') corpo.habilitado = c.habilitado
  if (t(c.taxaExtra) !== '') { const n = numero(c.taxaExtra); if (!(n >= 0)) return { erro: 'Taxa extra precisa ser um número.' }; corpo.taxa_extra = n }
  if (t(c.taxaExtraTipo)) corpo.taxa_extra_tipo = t(c.taxaExtraTipo) === 'fixo' ? 'fixo' : 'percentual'
  if (c.observacao !== undefined) corpo.observacao = t(c.observacao) || null
  if (c.bandeiras !== undefined) corpo.bandeiras = t(c.bandeiras) || null
  if (typeof c.recebimentoImediato === 'boolean') corpo.recebimento_imediato = c.recebimentoImediato
  if (typeof c.geraReceber === 'boolean') corpo.gera_receber = c.geraReceber
  if (t(c.parcelas) !== '') { const n = inteiro(c.parcelas); if (!(n >= 1 && n <= 36)) return { erro: 'Parcelas entre 1 e 36.' }; corpo.parcelas = n }
  if (t(c.diasRecebimento) !== '') { const n = inteiro(c.diasRecebimento); if (!(n >= 0)) return { erro: 'Dias para receber precisa ser um número.' }; corpo.dias_recebimento = n }
  if (t(c.tipoVencimento)) corpo.tipo_vencimento = t(c.tipoVencimento) === 'dias_corridos' ? 'dias_corridos' : 'dias_uteis'
  if (c.contaFinanceiraId !== undefined) corpo.conta_financeira_id = t(c.contaFinanceiraId) || null
  if (t(c.taxaOperadoraPct) !== '') { const n = numero(c.taxaOperadoraPct); if (!(n >= 0 && n <= 30)) return { erro: 'Taxa da operadora entre 0 e 30%.' }; corpo.taxa_operadora_pct = n }
  if (t(c.taxaOperadoraFixa) !== '') { const n = numero(c.taxaOperadoraFixa); if (!(n >= 0)) return { erro: 'Taxa fixa da operadora precisa ser um número.' }; corpo.taxa_operadora_fixa = n }
  if (c.taxaObservacao !== undefined) corpo.taxa_observacao = t(c.taxaObservacao) || null
  return { corpo }
}

function formaNova(campos) {
  const c = campos || {}
  const metodo = t(c.metodo)
  if (!metodo) return { ok: false, motivo: 'Dê um nome à forma de pagamento (ex.: Vale-refeição).' }
  const r = corpoDaForma(c)
  if (r.erro) return { ok: false, motivo: r.erro }
  if (!r.corpo.tipos || !r.corpo.tipos.length) return { ok: false, motivo: 'Marque onde ela vale: delivery, retirada, balcão ou consumo local.' }
  return { ok: true, caminho: '/api/admin/formas-pagamento', metodo: 'POST', corpo: { metodo, ...r.corpo }, resumo: 'Forma "' + metodo + '" criada.' }
}

function formaEditar(forma, campos) {
  const f = forma || {}
  if (!f.id) return { ok: false, motivo: 'Esta forma veio sem identificação — recarregue a tela.' }
  const r = corpoDaForma(campos || {})
  if (r.erro) return { ok: false, motivo: r.erro }
  if (r.corpo.tipos && !r.corpo.tipos.length) return { ok: false, motivo: 'Marque onde ela vale: delivery, retirada, balcão ou consumo local.' }
  const nome = NOME_METODO[f.metodo] || f.metodo || 'forma'
  const resumo = r.corpo.habilitado === false ? nome + ' desligada.' : nome + ' salva.'
  return { ok: true, caminho: '/api/admin/formas-pagamento/' + f.id, metodo: 'PATCH', corpo: r.corpo, resumo }
}

// ── Contas financeiras ───────────────────────────────────────────────────────
const TIPOS_CONTA = [['banco', 'Banco'], ['carteira', 'Carteira / caixa'], ['gateway', 'Gateway / repasse'], ['cartao_credito', 'Cartão de crédito']]

function contaFinanceira(conta, campos) {
  const c = campos || {}
  const nome = t(c.nome)
  if (!nome) return { ok: false, motivo: 'Dê um nome à conta (ex.: Banco do Brasil — corrente).' }
  const tipo = t(c.tipo) || 'banco'
  if (!TIPOS_CONTA.some(([v]) => v === tipo)) return { ok: false, motivo: 'Tipo de conta desconhecido.' }
  const corpo = { nome, tipo }
  if (typeof c.ativo === 'boolean') corpo.ativo = c.ativo
  if (tipo === 'cartao_credito') {
    const f = inteiro(c.diaFechamento), v = inteiro(c.diaVencimento)
    if (!(f >= 1 && f <= 31 && v >= 1 && v <= 31)) return { ok: false, motivo: 'Cartão de crédito precisa do dia de fechamento e o vencimento da fatura (1 a 31).' }
    corpo.dia_fechamento = f; corpo.dia_vencimento = v
  }
  const editando = !!(conta && conta.id)
  return {
    ok: true,
    caminho: '/api/admin/contas-financeiras' + (editando ? '/' + conta.id : ''),
    metodo: editando ? 'PATCH' : 'POST',
    corpo,
    resumo: editando ? 'Conta "' + nome + '" salva.' : 'Conta "' + nome + '" criada.',
  }
}

function contaFinanceiraExcluir(conta) {
  const c = conta || {}
  if (!c.id) return { ok: false, motivo: 'Esta conta veio sem identificação — recarregue a tela.' }
  return { ok: true, caminho: '/api/admin/contas-financeiras/' + c.id, metodo: 'DELETE', corpo: {}, resumo: 'Conta "' + (c.nome || '') + '" excluída.' }
}

// ── Mesas ────────────────────────────────────────────────────────────────────
function mesasCriar(campos) {
  const c = campos || {}
  const tipo = t(c.tipo) || 'mesa'
  if (['mesa', 'comanda'].indexOf(tipo) < 0) return { ok: false, motivo: 'É mesa ou comanda.' }
  const quantidade = inteiro(c.quantidade)
  if (!(quantidade >= 1 && quantidade <= 200)) return { ok: false, motivo: 'Diga quantas criar (1 a 200).' }
  const numeroInicio = t(c.numeroInicio) === '' ? 1 : inteiro(c.numeroInicio)
  if (!(numeroInicio >= 1)) return { ok: false, motivo: 'O primeiro número precisa ser 1 ou mais.' }
  const capacidade = t(c.capacidade) === '' ? 4 : inteiro(c.capacidade)
  if (!(capacidade >= 1 && capacidade <= 50)) return { ok: false, motivo: 'Lugares por mesa entre 1 e 50.' }
  const fim = numeroInicio + quantidade - 1
  const nome = tipo === 'comanda' ? 'comanda' : 'mesa'
  return {
    ok: true, caminho: '/api/admin/mesas', metodo: 'POST',
    corpo: { tipo, quantidade, numeroInicio, capacidade },
    resumo: quantidade === 1 ? nome + ' ' + numeroInicio + ' criada.' : quantidade + ' ' + nome + 's criadas (' + numeroInicio + ' a ' + fim + ').',
  }
}

function mesaEditar(mesa, campos) {
  const m = mesa || {}, c = campos || {}
  if (!m.id) return { ok: false, motivo: 'Esta mesa veio sem identificação — recarregue a tela.' }
  const corpo = {}
  if (c.numero !== undefined) {
    if (!t(c.numero)) return { ok: false, motivo: 'A mesa precisa de um número ou nome.' }
    corpo.numero = t(c.numero)
  }
  if (t(c.capacidade) !== '') {
    const n = inteiro(c.capacidade)
    if (!(n >= 1 && n <= 99)) return { ok: false, motivo: 'Lugares entre 1 e 99.' }
    corpo.capacidade = n
  }
  if (typeof c.reservada === 'boolean') corpo.reservada = c.reservada
  if (!Object.keys(corpo).length) return { ok: false, motivo: 'Nada para salvar.' }
  return { ok: true, caminho: '/api/admin/mesas/' + m.id, metodo: 'PATCH', corpo, resumo: 'Mesa ' + (corpo.numero || m.numero || '') + ' salva.' }
}

function mesaExcluir(mesa) {
  const m = mesa || {}
  if (!m.id) return { ok: false, motivo: 'Esta mesa veio sem identificação — recarregue a tela.' }
  return { ok: true, caminho: '/api/admin/mesas/' + m.id, metodo: 'DELETE', corpo: {}, resumo: 'Mesa ' + (m.numero || '') + ' excluída.' }
}

// ── Colaborador novo ─────────────────────────────────────────────────────────
/** As funções do painel para quem entra por CPF (lib/colaboradores/auth.ts). */
const PAPEIS_COLABORADOR = [
  { v: 'garcom', r: 'Garçom' }, { v: 'atendente', r: 'Atendente' }, { v: 'cozinheiro', r: 'Cozinheiro' },
  { v: 'motoboy', r: 'Entregador' }, { v: 'caixa_operador', r: 'Caixa — operador' },
  { v: 'caixa_supervisor', r: 'Caixa — supervisor' }, { v: 'caixa_gestor', r: 'Caixa — gestor' },
]

function cpfValido(cpf) {
  const d = ('' + cpf).replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const dv = (fatia, peso) => { let s = 0; for (let i = 0; i < fatia.length; i++) s += Number(fatia[i]) * (peso - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10])
}

function colaboradorNovo(campos) {
  const c = campos || {}
  const nome = t(c.nome)
  if (!nome) return { ok: false, motivo: 'O nome não pode ficar em branco.' }
  const cpf = t(c.cpf).replace(/\D/g, '')
  if (!cpfValido(cpf)) return { ok: false, motivo: 'CPF inválido — confira os 11 dígitos.' }
  const senha = '' + (c.senha == null ? '' : c.senha)
  if (senha.length < 6) return { ok: false, motivo: 'A senha precisa de pelo menos 6 caracteres.' }
  const funcao = t(c.funcao)
  if (!PAPEIS_COLABORADOR.some((p) => p.v === funcao)) return { ok: false, motivo: 'Escolha a função.' }
  const corpo = { nome, cpf, senha, papeis: [funcao] }
  if (typeof c.podeUnirMesas === 'boolean') corpo.pode_unir_mesas = c.podeUnirMesas
  const rotulo = (PAPEIS_COLABORADOR.find((p) => p.v === funcao) || {}).r || funcao
  return { ok: true, caminho: '/api/admin/colaboradores', metodo: 'POST', corpo, resumo: nome + ' cadastrado(a) como ' + rotulo + ' — entra com CPF e senha.' }
}

// ── Comanda impressa ─────────────────────────────────────────────────────────
const MODELOS_COMANDA = [['atual', 'Atual'], ['compacto', 'Compacto'], ['completo', 'Completo'], ['cozinha', 'Cozinha'], ['entrega', 'Entrega'], ['personalizado', 'Personalizado']]
const FONTES_COMANDA = [['ibm-plex-mono', 'IBM Plex Mono'], ['roboto-mono', 'Roboto Mono'], ['courier', 'Courier'], ['arial', 'Arial']]
const PESOS_COMANDA = [['normal', 'Normal'], ['medio', 'Médio'], ['negrito', 'Negrito']]
const QR_COMANDA = [['nenhum', 'Nenhum'], ['cardapio', 'Cardápio'], ['google', 'Google'], ['instagram', 'Instagram'], ['whatsapp', 'WhatsApp'], ['outro', 'Outro']]
const MOSTRAR_COMANDA = ['mostrar_logo', 'mostrar_nome_loja', 'mostrar_telefone_loja', 'mostrar_endereco_loja', 'mostrar_nome_cliente',
  'mostrar_telefone_cliente', 'mostrar_endereco_cliente', 'mostrar_pagamento', 'mostrar_observacoes', 'mostrar_itens',
  'mostrar_subtotal', 'mostrar_taxa', 'mostrar_desconto', 'mostrar_cupom']
const BOOL_COMANDA = MOSTRAR_COMANDA.concat(['adicional_destaque', 'promo_cardapio_proprio', 'extra_ativa', 'extra_imprimir_auto'])
const TEXTO_COMANDA = ['texto_rodape', 'mensagem_final', 'extra_modelo', 'extra_titulo', 'extra_mensagem', 'extra_qr_url', 'extra_cupom']

function comanda(atual, campos) {
  if (!atual || typeof atual !== 'object' || !atual.modelo) {
    return { ok: false, motivo: 'Sem a configuração atual da comanda — o painel manda o objeto inteiro, então abra esta tela com internet e tente de novo.' }
  }
  const c = campos || {}
  const corpo = { ...atual }
  if (c.modelo !== undefined) { if (!MODELOS_COMANDA.some(([v]) => v === c.modelo)) return { ok: false, motivo: 'Modelo de comanda desconhecido.' }; corpo.modelo = c.modelo }
  if (c.fonte_familia !== undefined) { if (!FONTES_COMANDA.some(([v]) => v === c.fonte_familia)) return { ok: false, motivo: 'Fonte desconhecida.' }; corpo.fonte_familia = c.fonte_familia }
  if (c.fonte_peso !== undefined) { if (!PESOS_COMANDA.some(([v]) => v === c.fonte_peso)) return { ok: false, motivo: 'Peso da fonte desconhecido.' }; corpo.fonte_peso = c.fonte_peso }
  if (c.extra_qr_tipo !== undefined) { if (!QR_COMANDA.some(([v]) => v === c.extra_qr_tipo)) return { ok: false, motivo: 'Tipo de QR desconhecido.' }; corpo.extra_qr_tipo = c.extra_qr_tipo }
  if (t(c.fonte_escala) !== '') { const n = inteiro(c.fonte_escala); if (!(n >= 80 && n <= 140)) return { ok: false, motivo: 'Tamanho da fonte entre 80 e 140%.' }; corpo.fonte_escala = n }
  if (t(c.espacamento_linhas) !== '') { const n = numero(c.espacamento_linhas); if (!(n >= 1 && n <= 1.8)) return { ok: false, motivo: 'Espaçamento entre 1,0 e 1,8.' }; corpo.espacamento_linhas = n }
  if (t(c.extra_copias) !== '') { const n = inteiro(c.extra_copias); if (!(n >= 1 && n <= 5)) return { ok: false, motivo: 'Cópias do extra entre 1 e 5.' }; corpo.extra_copias = n }
  for (const k of BOOL_COMANDA) if (typeof c[k] === 'boolean') corpo[k] = c[k]
  for (const k of TEXTO_COMANDA) if (c[k] !== undefined) corpo[k] = t(c[k])
  return { ok: true, caminho: '/api/admin/comanda-config', metodo: 'PUT', corpo, resumo: 'Comanda salva.' }
}

module.exports = {
  loja, horarios, bairros, formaNova, formaEditar, contaFinanceira, contaFinanceiraExcluir,
  mesasCriar, mesaEditar, mesaExcluir, colaboradorNovo, comanda, numero, cpfValido,
  MODALIDADES, DIAS, TIPOS_FORMA, NOME_METODO, TIPOS_CONTA, PAPEIS_COLABORADOR,
  MODELOS_COMANDA, FONTES_COMANDA, PESOS_COMANDA, QR_COMANDA, MOSTRAR_COMANDA,
}
