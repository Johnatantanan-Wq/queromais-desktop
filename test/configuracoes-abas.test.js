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
  // A aba virou a EQUIPE (painel, 08/09/2026): lista com editar/desativar, não ficha.
  const equipe = d.abas.usuario
  assert.strictEqual(equipe.length, 3)
  assert.strictEqual(equipe[0].funcao, 'Administrador')
  assert.strictEqual(equipe[0].email, 'f@x.com')
  assert.strictEqual(equipe[1].funcao, 'Garçom')
  assert.strictEqual(equipe[1].cpf, '111')
  // ⛔ O TIPO é o que decide a rota de edição: CPF vai para colaboradores, e-mail vai
  // para usuarios_admin. Mandar para a errada volta 404 mudo.
  assert.strictEqual(equipe[0].tipo, 'admin')
  assert.strictEqual(equipe[1].tipo, 'colaborador')
  assert.strictEqual(equipe[2].tipo, 'admin', 'sem CPF e sem e-mail, é cadastro de admin')
  assert.ok(equipe.every((u) => u.ativo), 'sem `ativo: false` no dado, todo mundo está ativo')
})

test('a Equipe separa quem tem acesso de quem foi desativado', () => {
  const Finais = require('../renderer/elo/telas-finais')
  const h = Finais.equipeDaLoja([
    { id: 'a', nome: 'Ana', funcao: 'Caixa', cpf: '1', tipo: 'colaborador', ativo: true },
    { id: 'c', nome: 'Carla', funcao: 'Caixa', cpf: '2', tipo: 'colaborador', ativo: false },
  ])
  assert.match(h, /Com acesso \(1\)/)
  assert.match(h, /Desativados \(1\)/)
  // ⚠️ Desativado NÃO some: apagar levaria junto o histórico de quem fez o quê.
  assert.match(h, /usuario:reativar:c/)
  assert.match(h, /usuario:desativar:a/)
})

test('⛔ quem entra por e-mail não troca de função pelo app', () => {
  const U = require('../src-electron/usuarios-acoes')
  // Virar Administrador muda a forma de ENTRAR (e-mail e senha no lugar do CPF) — não
  // é troca de rótulo, e o app explica em vez de quebrar o login de alguém.
  const r = U.editar({ id: 'a1', nome: 'Bruno', tipo: 'admin' }, { nome: 'Bruno', funcao: 'caixa' })
  assert.strictEqual(r.ok, false)
  assert.match(r.motivo, /forma de entrar/)
  // Mas corrigir o NOME vale para os dois cadastros.
  const nome = U.editar({ id: 'a1', nome: 'Bruno', tipo: 'admin' }, { nome: 'Bruno Alves' })
  assert.strictEqual(nome.ok, true)
  assert.strictEqual(nome.caminho, '/api/admin/usuarios')
  assert.strictEqual(nome.corpo.id, 'a1', 'esta rota identifica o usuário no corpo')
})

test('a rota da edição segue o cadastro de origem', () => {
  const U = require('../src-electron/usuarios-acoes')
  const colab = U.editar({ id: 'c1', nome: 'Ana', papel: 'caixa', tipo: 'colaborador' },
    { nome: 'Ana', funcao: 'garcom' })
  assert.strictEqual(colab.caminho, '/api/admin/colaboradores/c1')
  assert.deepStrictEqual(colab.corpo.papeis, ['garcom'])
  assert.strictEqual(colab.corpo.id, undefined, 'aqui o id vai na URL, não no corpo')
})

test('desativar não apaga — e quem entra por e-mail sai pelo painel', () => {
  const U = require('../src-electron/usuarios-acoes')
  const off = U.ativar({ id: 'c1', nome: 'Ana', tipo: 'colaborador' }, false)
  assert.strictEqual(off.ok, true)
  assert.deepStrictEqual(off.corpo, { ativo: false })
  assert.match(off.resumo, /Desativados/)
  const admin = U.ativar({ id: 'a1', nome: 'Bruno', tipo: 'admin' }, false)
  assert.strictEqual(admin.ok, false, 'o acesso ao Supabase sai junto — isso é pelo painel')
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

// ── Mesas ──
const salaoBase = { mesas: [
  { numero: '1', lugares: 4, situacao: 'Livre' },
  { numero: '2', lugares: 4, situacao: 'Ocupada' },
  { numero: '3', lugares: 2, situacao: 'Em preparo' },
  { numero: '4', lugares: 6, situacao: 'Livre' },
] }

test('a aba Mesas conta o cadastro e o que está em uso', () => {
  const d = A.configuracoes({ lojaResp: loja, salaoResp: salaoBase })
  const campos = {}
  for (const s of d.abas.mesas) for (const c of s.campos) campos[c.rotulo] = c.valor
  assert.strictEqual(campos['Mesas cadastradas'], '4')
  assert.strictEqual(campos['Em uso agora'], '2 de 4', 'Ocupada e Em preparo contam como em uso')
  assert.strictEqual(campos['Lugares no total'], '16')
})

test('a distribuição agrupa por lugares, no singular e no plural certos', () => {
  const d = A.configuracoes({ lojaResp: loja, salaoResp: salaoBase })
  const dist = d.abas.mesas[1].campos[0].valor
  assert.strictEqual(dist, '1× de 2 lugares · 2× de 4 lugares · 1× de 6 lugares')
  const umLugar = A.configuracoes({ lojaResp: loja, salaoResp: { mesas: [{ numero: '1', lugares: 1 }] } })
  assert.ok(/1× de 1 lugar$/.test(umLugar.abas.mesas[1].campos[0].valor), 'singular')
})

test('a aba Mesas aceita o salão embrulhado, como a rota devolve', () => {
  const d = A.configuracoes({ lojaResp: loja, salaoResp: { salao: salaoBase } })
  assert.strictEqual(d.abas.mesas[0].campos[0].valor, '4')
})

test('sem mesas cadastradas a aba fica vazia, sem inventar salão', () => {
  assert.deepStrictEqual(A.configuracoes({ lojaResp: loja, salaoResp: { mesas: [] } }).abas.mesas, [])
  assert.deepStrictEqual(A.configuracoes({ lojaResp: loja, salaoResp: null }).abas.mesas, [])
})

// ── as quatro últimas abas ──
const restoBase = {
  cardapio: { corPrincipal: '#000000', temCapa: true, temLogo: false, coresPersonalizadas: 2, modelo: '' },
  fiscal: { razaoSocial: 'DU PELLEGRINI LTDA', cnpj: '00.000.000/0001-00', inscricaoEstadual: '',
    regime: 1, municipio: 'Valença / BA', codigoIbge: '2932903', temCsc: false,
    faltando: ['Inscrição estadual'], contabilConectado: true },
  integracoes: { pixelFacebook: true, contabil: true },
  backup: { entidades: ['pedidos', 'clientes', 'produtos', 'estoque', 'financeiro', 'cupons', 'motoboys'] },
}

test('as 15 abas de Configurações passam a ter conteúdo', () => {
  const d = A.configuracoes({
    lojaResp: loja, bairrosResp: { bairros: ['Centro'], taxas_bairro: {}, taxa_padrao: 0 },
    usuariosResp: { usuarios: [{ nome: 'Ana', papel: 'garcom' }] },
    planoResp: { plano: { nome: 'Pro' }, assinatura: { existe: true } },
    whatsappResp: { estado: 'open', provedor: 'evolution' },
    formasResp: [{ metodo: 'pix', habilitado: true }],
    salaoResp: { mesas: [{ numero: '1', lugares: 4 }] },
    restoResp: restoBase,
  })
  const abas = ['config', 'horarios', 'rotas', 'usuario', 'gestor', 'plano',
    'cardapio', 'mesas', 'pagamento', 'fiscal', 'impressora', 'integracoes', 'whatsapp', 'backup']
  const vazias = abas.filter((a) => a !== 'impressora' && !(d.abas[a] || []).length)
  assert.deepStrictEqual(vazias, [], 'abas sem conteúdo: ' + vazias.join(', '))
})

test('o fiscal LISTA o que falta — "pendente" sozinho não resolve nada', () => {
  const d = A.configuracoes({ lojaResp: loja, restoResp: restoBase })
  const falta = d.abas.fiscal.find((s) => /Falta preencher/.test(s.titulo))
  assert.ok(falta, 'a seção do que falta precisa aparecer')
  assert.strictEqual(falta.campos[0].valor, 'Inscrição estadual')
})

test('com tudo preenchido, a seção de pendência some', () => {
  const completo = { ...restoBase, fiscal: { ...restoBase.fiscal, faltando: [], inscricaoEstadual: '123', temCsc: true } }
  const d = A.configuracoes({ lojaResp: loja, restoResp: completo })
  assert.ok(!d.abas.fiscal.some((s) => /Falta preencher/.test(s.titulo)))
  assert.strictEqual(d.abas.fiscal[1].campos[0].valor, 'preenchido', 'o CSC aparece como preenchido')
})

test('o regime tributário aparece por extenso, não como número', () => {
  const d = A.configuracoes({ lojaResp: loja, restoResp: restoBase })
  assert.strictEqual(d.abas.fiscal[0].campos[3].valor, 'Simples Nacional')
  const normal = A.configuracoes({ lojaResp: loja, restoResp: { ...restoBase, fiscal: { ...restoBase.fiscal, regime: 3 } } })
  assert.strictEqual(normal.abas.fiscal[0].campos[3].valor, 'Regime Normal')
})

test('o cardápio diz quantas cores foram trocadas, no singular e plural', () => {
  const d = A.configuracoes({ lojaResp: loja, restoResp: restoBase })
  assert.strictEqual(d.abas.cardapio[0].campos[3].valor, '2 cores trocadas')
  const uma = A.configuracoes({ lojaResp: loja, restoResp: { ...restoBase, cardapio: { ...restoBase.cardapio, coresPersonalizadas: 1 } } })
  assert.strictEqual(uma.abas.cardapio[0].campos[3].valor, '1 cor trocada')
  const zero = A.configuracoes({ lojaResp: loja, restoResp: { ...restoBase, cardapio: { ...restoBase.cardapio, coresPersonalizadas: 0 } } })
  assert.strictEqual(zero.abas.cardapio[0].campos[3].valor, 'usando o padrão')
})

test('o backup mostra os dados pelo nome que o lojista conhece', () => {
  const d = A.configuracoes({ lojaResp: loja, restoResp: restoBase })
  const dados = d.abas.backup[0].campos[0].valor
  assert.ok(/Entregadores/.test(dados), 'motoboys vira Entregadores')
  assert.ok(!/motoboys/.test(dados), 'o nome da tabela não vaza para a tela')
})

test('sem a rota nova, as quatro abas ficam vazias em vez de inventar', () => {
  const d = A.configuracoes({ lojaResp: loja })
  for (const a of ['cardapio', 'fiscal', 'integracoes', 'backup']) {
    assert.deepStrictEqual(d.abas[a], [], a + ' deveria vir vazia')
  }
})
