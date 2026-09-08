const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../src-electron/adaptadores')

const loja = { id: 'l1', nome: 'Du Pellegrini', aberta: true }

test('antes só Geral e Horários tinham dado real — agora Rotas, Usuário, Plano e App Gestor também', () => {
  const d = A.configuracoes({
    lojaResp: loja,
    bairrosResp: { bairros: ['Centro'], taxas_bairro: { Centro: { taxa: 7, ativo: true } }, taxa_padrao: 0, entrega_gratis_valor_min: null },
    usuariosResp: { usuarios: [{ nome: 'Ana', papel: 'garcom', cpf: '111' }] },
    planoResp: { plano: { nome: 'Pro', valorCentavos: 9900 }, assinatura: { existe: true, status: 'ativa' } },
  })
  for (const aba of ['config', 'horarios', 'rotas', 'usuario', 'plano', 'gestor']) {
    assert.ok((d.abas[aba] || []).length > 0, aba + ' tem de trazer conteúdo')
  }
})

test('bairro com taxa desligada NÃO cobra — e a tela diz isso', () => {
  const d = A.configuracoes({
    lojaResp: loja,
    bairrosResp: {
      bairros: ['Centro', 'Praia', 'Novo'],
      taxas_bairro: { Centro: { taxa: 7, ativo: true }, Praia: { taxa: 5, ativo: false } },
      taxa_padrao: 9, entrega_gratis_valor_min: 80,
    },
  })
  const porBairro = d.abas.rotas.find((s) => /Taxa por bairro/.test(s.titulo)).campos
  assert.deepStrictEqual(porBairro, [
    { rotulo: 'Centro', valor: 'R$ 7,00' },
    { rotulo: 'Praia', valor: 'sem taxa' },
    { rotulo: 'Novo', valor: 'usa a taxa padrão' },  // fora da lista de taxas
  ])
  const geral = d.abas.rotas[0].campos
  assert.strictEqual(geral[1].valor, 'R$ 80,00', 'entrega grátis acima de 80')
})

test('taxa por bairro em número puro (formato antigo) continua sendo lida', () => {
  const d = A.configuracoes({ lojaResp: loja, bairrosResp: { bairros: ['Centro'], taxas_bairro: { Centro: 6.5 }, taxa_padrao: 0 } })
  assert.strictEqual(d.abas.rotas[1].campos[0].valor, 'R$ 6,50')
})

test('o usuário aparece com a função e por onde entra', () => {
  const d = A.configuracoes({
    lojaResp: loja,
    usuariosResp: { usuarios: [
      { nome: 'Fabrício', papel: 'admin', email: 'f@x.com' },
      { nome: 'Ana', papel: 'garcom', cpf: '111' },
      { nome: 'Zé', papel: 'cozinheiro' },
    ] },
  })
  const campos = d.abas.usuario[0].campos
  assert.ok(/Quem tem acesso \(3\)/.test(d.abas.usuario[0].titulo))
  assert.strictEqual(campos[0].valor, 'Administrador · f@x.com')
  assert.strictEqual(campos[1].valor, 'Garçom · CPF 111')
  assert.strictEqual(campos[2].valor, 'Cozinheiro · sem acesso ao painel')
})

test('o plano mostra mensalidade em reais, não em centavos', () => {
  const d = A.configuracoes({
    lojaResp: loja,
    planoResp: {
      plano: { nome: 'Pro', valorCentavos: 9900, limites: { franquiaPedidos: 500 } },
      assinatura: { existe: true, status: 'ativa', proximoVenc: '2026-10-01T00:00:00Z' },
      uso: { pedidos: 312 }, proximaFatura: { mensalidade: 99, excedenteQtd: 0 },
    },
  })
  assert.strictEqual(d.abas.plano[0].campos[1].valor, 'R$ 99,00')
  assert.ok(/01\/10\/2026/.test(d.abas.plano[1].campos[0].valor), d.abas.plano[1].campos[0].valor)
  assert.strictEqual(d.abas.plano[2].campos[1].valor, '500 pedidos')
})

test('uma rota que falha não derruba as outras abas', () => {
  // buscarVarias devolve null para a rota que falhou; a tela continua de pé.
  const d = A.configuracoes({ lojaResp: loja, bairrosResp: null, usuariosResp: null, planoResp: null })
  assert.ok(d.abas.config.length > 0, 'Geral continua')
  assert.deepStrictEqual(d.abas.rotas, [])
  assert.deepStrictEqual(d.abas.usuario, [])
  assert.deepStrictEqual(d.abas.plano, [])
  assert.ok(d.abas.gestor.length > 0, 'App Gestor não depende de API nenhuma')
})

test('sem loja não inventa tela', () => {
  assert.strictEqual(A.configuracoes({ lojaResp: null }), null)
})

test('vencimento é DIA, não instante — não pode voltar um dia pelo fuso', () => {
  // '2026-10-01T00:00:00Z' vira 30/09 se passar por new Date() no fuso do Brasil.
  const d = A.configuracoes({
    lojaResp: loja,
    planoResp: { plano: { nome: 'Pro' }, assinatura: { existe: true, proximoVenc: '2026-10-01T00:00:00Z' } },
  })
  assert.strictEqual(d.abas.plano[1].campos[0].valor, '01/10/2026')
  const soData = A.configuracoes({
    lojaResp: loja,
    planoResp: { plano: { nome: 'Pro' }, assinatura: { existe: true, proximoVenc: '2026-01-05' } },
  })
  assert.strictEqual(soData.abas.plano[1].campos[0].valor, '05/01/2026')
})
