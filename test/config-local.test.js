// Demonstração de Configurações: o que foi salvo pelo app aparece na tela, por cima do
// dado fictício — como no app conectado depois de recarregar.
const { test } = require('node:test')
const assert = require('node:assert')
const { criarRegistro } = require('../src-electron/config-local')
const C = require('../src-electron/config-acoes')

const base = () => ({
  bruto: {
    loja: { nome: 'Pizzaria', telefone: '', endereco: { rua: 'A', numero: '1', complemento: '', bairro: 'B', cidade: 'C', uf: 'BA', cep: '' }, modalidades: ['entrega'], tempos: { balcao: 30, delivery: 45, local: 20 }, pixChave: '', numeracaoDiaria: true, modoHorario: 'manual' },
    horarios: { dom: { abre: null, fecha: null }, seg: { abre: '18:00', fecha: '23:00' } }, timezone: 'America/Bahia',
    bairros: { bairros: ['Centro'], taxas: { Centro: { taxa: 5, ativo: true } }, taxaPadrao: 7, entregaGratisAcima: null },
    formas: [{ id: 'f1', metodo: 'pix', habilitado: true, tipos: ['delivery'] }],
    contasFinanceiras: [{ id: 'cf1', nome: 'BB', tipo: 'banco', ativo: true }],
    mesas: [{ id: 'm1', numero: '1', capacidade: 4, tipo: 'mesa', reservada: false }],
    comanda: { modelo: 'atual', fonte_escala: 100 },
    usuarios: [],
  },
  abas: { config: [], horarios: [], rotas: [], pagamento: [], mesas: [], usuario: [] },
})
const decidir = (fn, ...a) => { const d = fn(...a); assert.ok(d.ok, d.motivo); return d }

test('horários, bairros e comanda substituem o bruto e redesenham a aba', () => {
  const r = criarRegistro()
  r.aplicarDecisao('config-horarios', decidir(C.horarios, { dias: { seg: { abre: '17:00', fecha: '22:00' } }, timezone: 'America/Sao_Paulo' }))
  r.aplicarDecisao('config-bairros', decidir(C.bairros, { bairros: [{ nome: 'Centro', taxa: '6' }, { nome: 'Praia', taxa: '9' }], entregaGratisAcima: '100' }))
  r.aplicarDecisao('config-comanda', decidir(C.comanda, base().bruto.comanda, { modelo: 'compacto' }))
  const d = r.aplicar(base())
  assert.deepStrictEqual(d.bruto.horarios.seg, { abre: '17:00', fecha: '22:00' })
  assert.strictEqual(d.bruto.timezone, 'America/Sao_Paulo')
  assert.deepStrictEqual(d.bruto.bairros.bairros, ['Centro', 'Praia'])
  assert.strictEqual(d.bruto.bairros.taxas.Praia.taxa, 9)
  assert.strictEqual(d.bruto.bairros.entregaGratisAcima, 100)
  assert.strictEqual(d.bruto.comanda.modelo, 'compacto')
  assert.ok(d.abas.horarios.length && d.abas.rotas.length, 'as abas de leitura foram redesenhadas')
  assert.ok(JSON.stringify(d.abas.rotas).includes('Praia'))
})

test('forma, conta financeira e mesa: nova entra, editada muda, excluída some', () => {
  const r = criarRegistro()
  r.aplicarDecisao('config-forma-nova', decidir(C.formaNova, { metodo: 'Vale', tipos: ['balcao'] }))
  r.aplicarDecisao('config-forma-editar', decidir(C.formaEditar, { id: 'f1', metodo: 'pix' }, { habilitado: false }))
  r.aplicarDecisao('config-conta-financeira', decidir(C.contaFinanceira, null, { nome: 'Nubank', tipo: 'banco' }))
  r.aplicarDecisao('config-conta-financeira', decidir(C.contaFinanceira, { id: 'cf1' }, { nome: 'BB corrente', tipo: 'banco' }))
  r.aplicarDecisao('config-mesas-criar', decidir(C.mesasCriar, { tipo: 'mesa', quantidade: '2', numeroInicio: '2', capacidade: '2' }))
  r.aplicarDecisao('config-mesa-editar', decidir(C.mesaEditar, { id: 'm1' }, { numero: '1A', capacidade: '6' }))
  r.aplicarDecisao('config-mesa-excluir', decidir(C.mesaExcluir, { id: 'm1' }))
  r.aplicarDecisao('config-colaborador-novo', decidir(C.colaboradorNovo, { nome: 'Thaís', cpf: '529.982.247-25', senha: '123456', funcao: 'garcom' }))
  const d = r.aplicar(base())
  assert.strictEqual(d.bruto.formas.length, 2)
  assert.strictEqual(d.bruto.formas[0].habilitado, false)
  assert.strictEqual(d.bruto.formas[1].metodo, 'Vale')
  assert.ok(d.bruto.formas[1].id, 'a forma nova ganha id local')
  assert.deepStrictEqual(d.bruto.contasFinanceiras.map((c) => c.nome), ['BB corrente', 'Nubank'])
  assert.deepStrictEqual(d.bruto.mesas.map((m) => m.numero), ['2', '3'], 'a 1 foi excluída, 2 e 3 criadas')
  assert.strictEqual(d.bruto.mesas[0].capacidade, 2)
  assert.strictEqual(d.bruto.usuarios.length, 1)
  assert.strictEqual(d.bruto.usuarios[0].tipo, 'colaborador')
  assert.strictEqual(d.abas.usuario.length, 1)
  assert.ok(JSON.stringify(d.abas.pagamento).includes('Vale'))
})

test('sem nada aplicado, os dados voltam iguais', () => {
  const r = criarRegistro()
  const b = base()
  assert.deepStrictEqual(r.aplicar(b), b)
})

test('as contas financeiras salvas também aparecem na aba Contas bancárias do Financeiro', () => {
  const r = criarRegistro()
  r.aplicarDecisao('config-conta-financeira', decidir(C.contaFinanceira, null, { nome: 'Inter PJ', tipo: 'banco' }))
  r.aplicarDecisao('config-conta-financeira', decidir(C.contaFinanceira, { id: 'b1' }, { nome: 'BB corrente', tipo: 'banco' }))
  r.aplicarDecisao('config-conta-financeira-excluir', decidir(C.contaFinanceiraExcluir, { id: 'b2' }))
  const d = r.aplicarBancos({ bancos: [{ id: 'b1', nome: 'BB', tipo: 'banco' }, { id: 'b2', nome: 'Nubank', tipo: 'banco' }], movimentoPorConta: [] })
  assert.deepStrictEqual(d.bancos.map((b) => b.nome), ['BB corrente', 'Inter PJ'])
  assert.strictEqual(d.bancos[1].tipo, 'banco')
  const nada = criarRegistro()
  const b = { bancos: [{ id: 'b1', nome: 'BB', tipo: 'banco' }] }
  assert.deepStrictEqual(nada.aplicarBancos(b), b)
})
