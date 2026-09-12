// CONFIGURAÇÕES pelo app: o que cada ficha manda ao painel. Regra pura — valida com
// frase de gente e devolve caminho, método e corpo iguais aos dos formulários do painel.
//
// ⛔ Campo em branco NÃO é enviado: o PATCH do painel é parcial, e em produção o GET da
// loja devolve só 10 colunas — mandar branco apagaria o que o app não vê.
const { test } = require('node:test')
const assert = require('node:assert')
const C = require('../src-electron/config-acoes')

// ── Dados da loja ──
test('loja: só o que foi preenchido viaja; endereço só inteiro', () => {
  const r = C.loja({ nome: ' Pizzaria ', telefone: '(75) 98811-0001', pixChave: '', balcao: '20', delivery: '', modalidades: ['entrega', 'retirada'] })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.caminho, '/api/admin/loja')
  assert.strictEqual(r.metodo, 'PATCH')
  assert.deepStrictEqual(r.corpo, { nome: 'Pizzaria', telefone: '(75) 98811-0001', tempo_estimado_balcao: 20, modalidades_pedido: ['entrega', 'retirada'] })
  assert.ok(!('endereco' in r.corpo) && !('pix_chave' in r.corpo))
})

test('loja: endereço pela metade é recusado — o painel gravaria o resto em branco', () => {
  const r = C.loja({ rua: 'Rua A', numero: '10' })
  assert.strictEqual(r.ok, false)
  assert.match(r.motivo, /rua, número, bairro, cidade e UF/)
  const ok = C.loja({ rua: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Valença', uf: 'ba', cep: '' })
  assert.deepStrictEqual(ok.corpo.endereco, { rua: 'Rua A', numero: '10', complemento: '', bairro: 'Centro', cidade: 'Valença', uf: 'BA', cep: '' })
})

test('loja: UF com 3 letras, tempo fora de 1–180, link sem https e nada preenchido', () => {
  assert.match(C.loja({ rua: 'A', numero: '1', bairro: 'B', cidade: 'C', uf: 'BAH' }).motivo, /UF/)
  assert.match(C.loja({ delivery: '500' }).motivo, /entre 1 e 180/)
  assert.match(C.loja({ mapsUrl: 'maps.google.com/x' }).motivo, /https/)
  assert.match(C.loja({}).motivo, /Nada para salvar/)
  assert.match(C.loja({ modalidades: [] }).motivo, /ao menos uma modalidade/)
})

test('loja: numeração diária e modo de horário viajam como o painel espera', () => {
  const r = C.loja({ numeracaoDiaria: true, modoHorario: 'automatico' })
  assert.deepStrictEqual(r.corpo, { numeracao_diaria: true, modo_horario: 'automatico' })
  assert.match(C.loja({ modoHorario: 'x' }).motivo, /manual ou automático/)
})

// ── Horários ──
test('horários: os sete dias, fechado quando não tem hora, e a hora precisa de HH:MM', () => {
  const r = C.horarios({ dias: { seg: { abre: '18:00', fecha: '23:30' }, dom: { abre: '', fecha: '' } }, timezone: 'America/Bahia' })
  assert.strictEqual(r.caminho, '/api/admin/horarios')
  assert.strictEqual(r.metodo, 'PATCH')
  assert.deepStrictEqual(r.corpo.horarios.seg, { abre: '18:00', fecha: '23:30' })
  assert.deepStrictEqual(r.corpo.horarios.dom, { abre: null, fecha: null })
  assert.deepStrictEqual(r.corpo.horarios.qua, { abre: null, fecha: null }, 'dia não informado = fechado, não some')
  assert.strictEqual(r.corpo.timezone, 'America/Bahia')
  assert.match(C.horarios({ dias: { seg: { abre: '18h', fecha: '23:00' } } }).motivo, /segunda/i)
  assert.match(C.horarios({ dias: { seg: { abre: '18:00', fecha: '' } } }).motivo, /abre e fecha/)
})

// ── Rotas: bairros e taxas ──
test('bairros: nomes limpos e únicos, taxa por bairro e entrega grátis', () => {
  const r = C.bairros({ bairros: [{ nome: ' Centro ', taxa: '5,00', ativo: true }, { nome: 'Praia', taxa: '', ativo: false }, { nome: '', taxa: '1' }], entregaGratisAcima: '80' })
  assert.strictEqual(r.caminho, '/api/admin/bairros')
  assert.deepStrictEqual(r.corpo.bairros, ['Centro', 'Praia'])
  assert.deepStrictEqual(r.corpo.taxas_bairro, { Centro: { taxa: 5, ativo: true }, Praia: { taxa: 0, ativo: false } })
  assert.strictEqual(r.corpo.entrega_gratis_valor_min, 80)
  assert.match(r.resumo, /2 bairros/)
  assert.match(C.bairros({ bairros: [{ nome: 'A', taxa: 'x' }] }).motivo, /taxa de A/i)
  assert.match(C.bairros({ bairros: [{ nome: 'A' }, { nome: 'a' }] }).motivo, /repetido/)
  assert.match(C.bairros({ bairros: [] }).motivo, /ao menos um bairro/)
})

// ── Formas de pagamento ──
test('forma nova: método e onde vale são obrigatórios; taxas e prazo viajam como número', () => {
  const r = C.formaNova({ metodo: 'Vale-refeição', tipos: ['delivery', 'balcao'], taxaExtra: '2,5', taxaExtraTipo: 'percentual', diasRecebimento: '2', tipoVencimento: 'dias_uteis', parcelas: '1', recebimentoImediato: false, geraReceber: true, taxaOperadoraPct: '3,2' })
  assert.strictEqual(r.caminho, '/api/admin/formas-pagamento')
  assert.strictEqual(r.metodo, 'POST')
  assert.deepStrictEqual(r.corpo, { metodo: 'Vale-refeição', tipos: ['delivery', 'balcao'], taxa_extra: 2.5, taxa_extra_tipo: 'percentual', dias_recebimento: 2, tipo_vencimento: 'dias_uteis', parcelas: 1, recebimento_imediato: false, gera_receber: true, taxa_operadora_pct: 3.2 })
  assert.match(C.formaNova({ tipos: ['delivery'] }).motivo, /nome/i)
  assert.match(C.formaNova({ metodo: 'X', tipos: [] }).motivo, /onde ela vale/)
})

test('forma editar: vai por id, com ligar/desligar e a conta de destino', () => {
  const r = C.formaEditar({ id: 'f1', metodo: 'pix' }, { habilitado: false, contaFinanceiraId: 'cf1', observacao: 'só à noite', tipos: ['delivery'] })
  assert.strictEqual(r.caminho, '/api/admin/formas-pagamento/f1')
  assert.strictEqual(r.metodo, 'PATCH')
  assert.deepStrictEqual(r.corpo, { habilitado: false, conta_financeira_id: 'cf1', observacao: 'só à noite', tipos: ['delivery'] })
  assert.match(r.resumo, /Pix/)
  assert.match(C.formaEditar({}, {}).motivo, /identificação/)
  assert.strictEqual(C.formaEditar({ id: 'f1' }, { contaFinanceiraId: '' }).corpo.conta_financeira_id, null, 'limpar a conta manda null')
})

// ── Contas financeiras ──
test('conta financeira: nova é POST, editar é PATCH por id, cartão exige o ciclo', () => {
  const nova = C.contaFinanceira(null, { nome: 'Nubank', tipo: 'banco' })
  assert.deepStrictEqual({ c: nova.caminho, m: nova.metodo, b: nova.corpo }, { c: '/api/admin/contas-financeiras', m: 'POST', b: { nome: 'Nubank', tipo: 'banco' } })
  const edita = C.contaFinanceira({ id: 'cf1' }, { nome: 'BB', tipo: 'banco', ativo: false })
  assert.deepStrictEqual({ c: edita.caminho, m: edita.metodo, b: edita.corpo }, { c: '/api/admin/contas-financeiras/cf1', m: 'PATCH', b: { nome: 'BB', tipo: 'banco', ativo: false } })
  const cartao = C.contaFinanceira(null, { nome: 'Cartão', tipo: 'cartao_credito', diaFechamento: '5', diaVencimento: '15' })
  assert.deepStrictEqual(cartao.corpo, { nome: 'Cartão', tipo: 'cartao_credito', dia_fechamento: 5, dia_vencimento: 15 })
  assert.match(C.contaFinanceira(null, { nome: 'Cartão', tipo: 'cartao_credito' }).motivo, /fechamento e o vencimento/)
  assert.match(C.contaFinanceira(null, { tipo: 'banco' }).motivo, /nome/)
  assert.match(C.contaFinanceira(null, { nome: 'X', tipo: 'bitcoin' }).motivo, /tipo/i)
  const del = C.contaFinanceiraExcluir({ id: 'cf1', nome: 'BB' })
  assert.deepStrictEqual({ c: del.caminho, m: del.metodo }, { c: '/api/admin/contas-financeiras/cf1', m: 'DELETE' })
})

// ── Mesas ──
test('mesas: criar em lote, editar uma e excluir', () => {
  const lote = C.mesasCriar({ tipo: 'mesa', quantidade: '4', numeroInicio: '7', capacidade: '4' })
  assert.deepStrictEqual({ c: lote.caminho, m: lote.metodo, b: lote.corpo }, { c: '/api/admin/mesas', m: 'POST', b: { tipo: 'mesa', quantidade: 4, numeroInicio: 7, capacidade: 4 } })
  assert.match(lote.resumo, /4 mesas.*7 a 10/)
  assert.match(C.mesasCriar({ tipo: 'mesa', quantidade: '0' }).motivo, /quantas/i)
  assert.match(C.mesasCriar({ tipo: 'cadeira', quantidade: '1' }).motivo, /mesa ou comanda/)
  const ed = C.mesaEditar({ id: 'm1', numero: '7' }, { numero: '7A', capacidade: '6', reservada: true })
  assert.deepStrictEqual({ c: ed.caminho, m: ed.metodo, b: ed.corpo }, { c: '/api/admin/mesas/m1', m: 'PATCH', b: { numero: '7A', capacidade: 6, reservada: true } })
  assert.match(C.mesaEditar({ id: 'm1' }, { numero: '' }).motivo, /número/i)
  const del = C.mesaExcluir({ id: 'm1', numero: '7' })
  assert.deepStrictEqual({ c: del.caminho, m: del.metodo }, { c: '/api/admin/mesas/m1', m: 'DELETE' })
})

// ── Colaborador novo ──
test('colaborador: nome, CPF válido, senha de 6 e a função — como o painel cadastra', () => {
  const r = C.colaboradorNovo({ nome: 'Thaís Santana', cpf: '529.982.247-25', senha: '123456', funcao: 'caixa_operador', podeUnirMesas: true })
  assert.strictEqual(r.caminho, '/api/admin/colaboradores')
  assert.strictEqual(r.metodo, 'POST')
  assert.deepStrictEqual(r.corpo, { nome: 'Thaís Santana', cpf: '52998224725', senha: '123456', papeis: ['caixa_operador'], pode_unir_mesas: true })
  assert.match(C.colaboradorNovo({ nome: 'X', cpf: '111.111.111-11', senha: '123456', funcao: 'garcom' }).motivo, /CPF/)
  assert.match(C.colaboradorNovo({ nome: 'X', cpf: '529.982.247-25', senha: '123', funcao: 'garcom' }).motivo, /6/)
  assert.match(C.colaboradorNovo({ nome: 'X', cpf: '529.982.247-25', senha: '123456', funcao: 'presidente' }).motivo, /função/i)
  assert.ok(C.PAPEIS_COLABORADOR.some((p) => p.v === 'garcom') && C.PAPEIS_COLABORADOR.some((p) => p.v === 'caixa_operador'))
})

// ── Comanda impressa ──
test('comanda: o PUT é completo — a ficha manda a configuração atual com o que mudou', () => {
  const atual = { modelo: 'atual', fonte_familia: 'ibm-plex-mono', fonte_escala: 100, fonte_peso: 'medio', espacamento_linhas: 1.15,
    mostrar_logo: true, mostrar_nome_loja: true, mostrar_telefone_loja: true, mostrar_endereco_loja: true, mostrar_nome_cliente: true,
    mostrar_telefone_cliente: true, mostrar_endereco_cliente: true, mostrar_pagamento: true, mostrar_observacoes: true, mostrar_itens: true,
    mostrar_subtotal: true, mostrar_taxa: true, mostrar_desconto: true, mostrar_cupom: true, texto_rodape: '', mensagem_final: 'Obrigado',
    extra_ativa: false, extra_imprimir_auto: false, extra_copias: 1, extra_modelo: 'agradecimento', extra_titulo: 'x', extra_mensagem: 'y', extra_qr_tipo: 'cardapio', extra_qr_url: '', extra_cupom: '' }
  const r = C.comanda(atual, { modelo: 'compacto', fonte_escala: '90', mostrar_logo: false, texto_rodape: 'Volte sempre', adicional_destaque: true })
  assert.strictEqual(r.caminho, '/api/admin/comanda-config')
  assert.strictEqual(r.metodo, 'PUT')
  assert.strictEqual(r.corpo.modelo, 'compacto')
  assert.strictEqual(r.corpo.fonte_escala, 90)
  assert.strictEqual(r.corpo.mostrar_logo, false)
  assert.strictEqual(r.corpo.mostrar_itens, true, 'o que não mudou vai como estava')
  assert.strictEqual(r.corpo.texto_rodape, 'Volte sempre')
  assert.strictEqual(r.corpo.adicional_destaque, true)
  assert.match(C.comanda(atual, { fonte_escala: '300' }).motivo, /80 e 140/)
  assert.match(C.comanda(atual, { modelo: 'gigante' }).motivo, /modelo/i)
  assert.match(C.comanda(null, { modelo: 'compacto' }).motivo, /configuração atual/)
})
