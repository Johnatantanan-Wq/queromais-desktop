// Os canais de Configurações: cada um decide (config-acoes) e fala com o painel pela
// view logada — método certo, corpo certo. Em demonstração o mesmo canal aplica a
// mudança por cima do dado fictício, sem rede.
const { test } = require('node:test')
const assert = require('node:assert')
const E = require('../src-electron/config-envio')
const { criarRegistro } = require('../src-electron/config-local')

function montar({ enviar, local }) {
  const canais = new Map()
  E.registrar({ ipcMain: { handle: (c, fn) => canais.set(c, fn) }, enviar, log: null, local })
  return { canais, chamar: (c, a) => canais.get(c)(null, a) }
}

test('todos os canais de Configurações existem', () => {
  const { canais } = montar({ enviar: async () => ({}) })
  for (const c of ['config-loja', 'config-horarios', 'config-bairros', 'config-forma-nova', 'config-forma-editar',
    'config-conta-financeira', 'config-conta-financeira-excluir', 'config-mesas-criar', 'config-mesa-editar',
    'config-mesa-excluir', 'config-colaborador-novo', 'config-comanda']) {
    assert.ok(canais.has(c), 'faltou ' + c)
  }
})

test('conectado: manda com o método da decisão e devolve o resumo', async () => {
  const idas = []
  const { chamar } = montar({ enviar: async (caminho, corpo, metodo) => { idas.push({ caminho, corpo, metodo }); return { ok: true } } })
  const r = await chamar('config-mesa-excluir', { mesa: { id: 'm1', numero: '7' } })
  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(idas[0], { caminho: '/api/admin/mesas/m1', corpo: {}, metodo: 'DELETE' })
  const r2 = await chamar('config-forma-editar', { forma: { id: 'f1', metodo: 'pix' }, habilitado: false })
  assert.strictEqual(idas[1].metodo, 'PATCH')
  assert.match(r2.resumo, /Pix desligada/)
})

test('conectado: recusa da decisão não vai à rede; recusa do painel chega à tela; sem rede nada é gravado', async () => {
  let idas = 0
  const { chamar } = montar({ enviar: async () => { idas++; return { error: 'CPF já cadastrado' } } })
  const r = await chamar('config-colaborador-novo', { nome: '', cpf: '1', senha: '1', funcao: 'garcom' })
  assert.strictEqual(r.ok, false)
  assert.strictEqual(idas, 0)
  const r2 = await chamar('config-colaborador-novo', { nome: 'A', cpf: '529.982.247-25', senha: '123456', funcao: 'garcom' })
  assert.strictEqual(r2.erro, 'CPF já cadastrado')
  const { chamar: c3 } = montar({ enviar: async () => { throw new Error('rede') } })
  const r3 = await c3('config-loja', { nome: 'X' })
  assert.match(r3.erro, /Nada foi gravado/)
})

test('demonstração: aplica no registro local e responde sem rede', async () => {
  const local = criarRegistro()
  const { chamar } = montar({ enviar: async () => { throw new Error('não deveria ir à rede') }, local })
  const r = await chamar('config-loja', { nome: 'Nova Pizzaria', telefone: '(75) 90000-0000' })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.demo, true)
  const d = local.aplicar({ bruto: { loja: { nome: 'Velha', endereco: {} }, formas: [], contasFinanceiras: [], mesas: [], bairros: { bairros: [], taxas: {} } },
    abas: { config: [{ titulo: '', colunas: 3, campos: [{ rotulo: 'Nome fantasia / nome da loja', valor: 'Velha' }, { rotulo: 'Telefone / WhatsApp', valor: '' }] }] } })
  assert.strictEqual(d.bruto.loja.nome, 'Nova Pizzaria')
  assert.strictEqual(d.abas.config[0].campos[0].valor, 'Nova Pizzaria', 'a tela de leitura também muda')
  assert.strictEqual(d.abas.config[0].campos[1].valor, '(75) 90000-0000')
})
