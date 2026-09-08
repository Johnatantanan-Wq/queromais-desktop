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

test('a ficha da loja lê os nomes REAIS das colunas do painel', () => {
  // O adaptador lia razao_social, inscricao_estadual, endereco_rua, pix_titular,
  // tempo_entrega… nomes que não existem na tabela. Conectado, a tela inteira dizia
  // "Não informado" em campos que o lojista tinha preenchido.
  const d = A.configuracoes({ lojaResp: {
    id: 'l1', nome: 'Du Pellegrini',
    empresa_razao_social: 'DU PELLEGRINI LTDA', empresa_cnpj: '00.000.000/0001-00',
    empresa_ie: '123', empresa_email: 'x@y.com', empresa_responsavel: 'Fabrício',
    endereco_logradouro: 'Av João Clímaco', endereco_municipio: 'Valença', endereco_uf: 'BA',
    endereco_cep: '45400-000', pix_nome: 'Fabrício',
    tempo_estimado_balcao: 30, tempo_estimado_delivery: 45, tempo_estimado_local: 20,
  } })
  const campos = {}
  for (const s of d.abas.config) for (const c of s.campos) campos[c.rotulo] = c.valor
  assert.strictEqual(campos['Razão social'], 'DU PELLEGRINI LTDA')
  assert.strictEqual(campos['Responsável'], 'Fabrício')
  assert.strictEqual(campos['Inscrição estadual'], '123')
  assert.strictEqual(campos['E-mail'], 'x@y.com')
  assert.strictEqual(campos['Rua / avenida'], 'Av João Clímaco')
  assert.strictEqual(campos['CEP'], '45400-000')
  assert.strictEqual(campos['Cidade'], 'Valença')
  assert.strictEqual(campos['Nome do titular Pix'], 'Fabrício')
  assert.strictEqual(campos['Tempo delivery (min)'], '45')
  assert.strictEqual(campos['Tempo consumo local (min)'], '20')
})

test('as modalidades vêm da lista da loja, não de três flags', () => {
  const d = A.configuracoes({ lojaResp: { id: 'l1', modalidades_pedido: ['entrega', 'consumo_local'] } })
  assert.strictEqual(d.abas.config[3].campos[0].valor, 'Entrega · Consumir no local')
  // balcao e retirada dizem a mesma coisa: não pode sair repetido
  const d2 = A.configuracoes({ lojaResp: { id: 'l1', modalidades_pedido: ['retirada', 'balcao'] } })
  assert.strictEqual(d2.abas.config[3].campos[0].valor, 'Retirada na loja')
  // formato antigo continua lido (cache guardado, demonstração)
  const d3 = A.configuracoes({ lojaResp: { id: 'l1', aceita_entrega: true, aceita_retirada: false, aceita_local: true } })
  assert.ok(/Consumir no local/.test(d3.abas.config[3].campos[0].valor))
})

test('numeração e tempo zero não somem da tela', () => {
  const d = A.configuracoes({ lojaResp: { id: 'l1', numeracao_diaria: false, tempo_estimado_delivery: 0 } })
  const numeracao = d.abas.config.find((s) => /Numeração/.test(s.titulo)).campos[0].valor
  assert.strictEqual(numeracao, 'Sequencial, sem reiniciar')
  const tempos = d.abas.config.find((s) => /Pix e tempos/.test(s.titulo)).campos
  assert.strictEqual(tempos.find((c) => /delivery/.test(c.rotulo)).valor, '0', 'zero é resposta, não vazio')
})

// ── Formas de pagamento ──
const formasBase = [
  { metodo: 'dinheiro', habilitado: true, tipo_vencimento: 'a_vista', tipos: ['entrega', 'retirada', 'balcao'] },
  { metodo: 'debito', habilitado: true, tipo_vencimento: 'recebivel', dias_recebimento: 1,
    taxa_operadora_pct: 1.99, taxa_extra: 1.98, tipos: ['entrega'], conta_financeira_id: 'c1' },
  { metodo: 'pix', habilitado: false, tipo_vencimento: 'a_vista', taxa_extra: 1, taxa_extra_tipo: 'percentual' },
]
const contasBase = [{ id: 'c1', nome: 'Banco Inter', tipo: 'banco' }]

test('cada forma diz quando o dinheiro entra — é o que muda o caixa', () => {
  const d = A.configuracoes({ lojaResp: loja, formasResp: formasBase, contasResp: contasBase })
  const campos = d.abas.pagamento[0].campos
  assert.ok(/à vista/.test(campos[0].valor), 'dinheiro é à vista')
  assert.ok(/recebível em 1 dia útil/.test(campos[1].valor), 'débito em D+1: ' + campos[1].valor)
})

test('forma desligada continua na lista, dizendo que está desligada', () => {
  // Sumir da lista deixaria o lojista sem entender por que o Pix não aparece no checkout.
  const d = A.configuracoes({ lojaResp: loja, formasResp: formasBase, contasResp: contasBase })
  const pix = d.abas.pagamento[0].campos.find((c) => c.rotulo === 'Pix')
  assert.ok(pix, 'o Pix não pode sumir')
  assert.ok(/^desligada/.test(pix.valor), pix.valor)
  assert.ok(/Aceitas no cardápio \(2 de 3\)/.test(d.abas.pagamento[0].titulo))
})

test('taxa da operadora e taxa extra são coisas diferentes e aparecem separadas', () => {
  const d = A.configuracoes({ lojaResp: loja, formasResp: formasBase, contasResp: contasBase })
  const debito = d.abas.pagamento[0].campos[1].valor
  assert.ok(/operadora 1,99%/.test(debito), 'o que a operadora leva: ' + debito)
  assert.ok(/taxa extra R\$ 1,98/.test(debito), 'o que a loja cobra a mais: ' + debito)
})

test('taxa extra em percentual não é lida como reais', () => {
  const d = A.configuracoes({ lojaResp: loja, formasResp: formasBase })
  const pix = d.abas.pagamento[0].campos.find((c) => c.rotulo === 'Pix')
  assert.ok(/taxa extra 1%/.test(pix.valor), pix.valor)
  assert.ok(!/R\$/.test(pix.valor), 'percentual não vira reais')
})

test('a conta de destino aparece pelo nome, não pelo id', () => {
  const d = A.configuracoes({ lojaResp: loja, formasResp: formasBase, contasResp: contasBase })
  assert.ok(/cai em Banco Inter/.test(d.abas.pagamento[0].campos[1].valor))
  assert.ok(!/c1/.test(d.abas.pagamento[0].campos[1].valor), 'o id não vaza para a tela')
  assert.strictEqual(d.abas.pagamento[1].campos[0].valor, 'Banco')
})

test('sem formas cadastradas a aba fica vazia, sem inventar linha', () => {
  assert.deepStrictEqual(A.configuracoes({ lojaResp: loja, formasResp: [] }).abas.pagamento, [])
  assert.deepStrictEqual(A.configuracoes({ lojaResp: loja, formasResp: null }).abas.pagamento, [])
})
