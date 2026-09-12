// Os adaptadores traduzem o que o PAINEL devolve para o que a TELA espera. É onde um
// campo renomeado no servidor vira tela vazia sem ninguém perceber — por isso cada
// conversão tem teste com a resposta no formato real da API.
const { test } = require('node:test')
const assert = require('node:assert')
const A = require('../src-electron/adaptadores')

// ── Cozinha / Bar ──
const respostaFila = { items: [
  { id: 'i1', pedido_id: 'p1', produto_nome: 'Cerveja (600 ml)', qtd: 1, status: 'pendente',
    sabores: [{ nome: 'Skol' }], item_obs: null, pedido_numero: 28, pedido_cliente: 'Mesa 27',
    pedido_tipo: 'consumo_local', pedido_criado_em: new Date(Date.now() - 62 * 60000).toISOString(),
    pedido_obs: null, pedido_mesa: '27' },
  { id: 'i2', pedido_id: 'p1', produto_nome: 'Batata Frita', qtd: 2, status: 'preparando',
    sabores: [], item_obs: 'sem sal', pedido_numero: 28, pedido_cliente: 'Mesa 27',
    pedido_tipo: 'consumo_local', pedido_criado_em: new Date(Date.now() - 62 * 60000).toISOString(),
    pedido_obs: null, pedido_mesa: '27' },
  { id: 'i3', pedido_id: 'p2', produto_nome: 'Pizza G', qtd: 1, status: 'pronto',
    sabores: [{ nome: 'Calabresa' }], item_obs: null, pedido_numero: 153, pedido_cliente: 'Johnatan',
    pedido_tipo: 'entrega', pedido_criado_em: new Date(Date.now() - 10 * 60000).toISOString(),
    pedido_obs: 'portaria', pedido_mesa: null },
] }

test('KDS: a fila achatada por item vira um cartão por PEDIDO', () => {
  const d = A.filaDeProducao(respostaFila)
  assert.strictEqual(d.pedidos.length, 2)
  const mesa = d.pedidos.find((p) => p.numero === 28)
  assert.strictEqual(mesa.itens.length, 2, 'os dois itens do mesmo pedido ficam juntos')
  assert.strictEqual(mesa.mesa, '27')
  assert.strictEqual(mesa.tipo, 'consumo_local')
})

test('KDS: quem espera há mais tempo vem primeiro', () => {
  const d = A.filaDeProducao(respostaFila)
  assert.strictEqual(d.pedidos[0].numero, 28, 'o de 62 min vem antes do de 10 min')
  assert.ok(d.pedidos[0].esperaMin >= 60)
})

test('KDS: o estado do item vira o botão certo', () => {
  const d = A.filaDeProducao(respostaFila)
  const itens = d.pedidos.find((p) => p.numero === 28).itens
  assert.strictEqual(itens[0].estado, 'pendente')
  assert.strictEqual(itens[1].estado, 'preparando')
  assert.strictEqual(itens[1].obs, 'sem sal', 'a observação do item não pode sumir')
  assert.strictEqual(A.filaDeProducao(respostaFila).pedidos.find((p) => p.numero === 153).itens[0].estado, 'pronto')
})

test('KDS: fila vazia não quebra, e o acesso pela TV entra depois', () => {
  const vazia = A.filaDeProducao({ items: [] })
  assert.deepStrictEqual(vazia.pedidos, [])
  const comTv = A.juntarAcessoTv(vazia, { definido: true, dispositivos: 2 })
  assert.deepStrictEqual(comTv.acessoTv, { definido: true, dispositivos: 2 })
  assert.strictEqual(A.juntarAcessoTv(vazia, null).acessoTv, null, 'sem a rota da TV, segue sem ela')
})

// ── Salão ──
const respostaSalao = {
  mesas: [{ id: 'm1', numero: '7', capacidade: 6 }, { id: 'm2', numero: '9', capacidade: 2 }],
  sessoes: [{ sessao: { mesa_id: 'm1', aberta_em: new Date(Date.now() - 48 * 60000).toISOString(),
    garcom_nome: 'Ana', n_pessoas: 4 }, total_parcial: 128.5, prontos_nao_entregues: 0 }],
  solicitacoes: [{ mesa_id: 'm2', tipo: 'conta', criado_em: new Date().toISOString() }],
  indicadores: { mesasTotal: 2, ocupadas: 1, consumoAberto: 128.5, ticketAtual: 128.5,
    lugares: 8, pessoasNoSalao: 4, ocupacaoPct: 50, contasSolicitadas: 1, prontos: 0 },
}

test('Salão: mesa com sessão fica ocupada, com garçom, tempo e consumo', () => {
  const d = A.salao(respostaSalao)
  const m7 = d.mesas.find((m) => m.numero === '7')
  assert.strictEqual(m7.situacao, 'Ocupada')
  assert.strictEqual(m7.garcom, 'Ana')
  assert.strictEqual(m7.consumo, 128.5)
  assert.ok(m7.desdeMin >= 47 && m7.desdeMin <= 49)
})

test('Salão: mesa que pediu a conta é "Conta pedida", e a livre não mostra consumo', () => {
  const d = A.salao(respostaSalao)
  assert.strictEqual(d.mesas.find((m) => m.numero === '9').situacao, 'Livre',
    'mesa sem sessão fica livre mesmo com solicitação pendente')
  const comSessao = A.salao({ ...respostaSalao,
    sessoes: respostaSalao.sessoes.concat([{ sessao: { mesa_id: 'm2', aberta_em: new Date().toISOString() }, total_parcial: 40 }]) })
  assert.strictEqual(comSessao.mesas.find((m) => m.numero === '9').situacao, 'Conta pedida')
})

test('Salão: a ocupação por LUGARES vem dos indicadores, não é recalculada', () => {
  const d = A.salao(respostaSalao)
  assert.strictEqual(d.kpis.ocupacaoPct, 50)
  assert.strictEqual(d.kpis.lugaresTotal, 8)
  assert.strictEqual(d.kpis.contasSolicitadas, 1)
})

// ── Clientes ──
test('Clientes: segmento sai do comportamento quando o painel não manda', () => {
  const hoje = new Date().toISOString()
  const antigo = new Date(Date.now() - 90 * 86400000).toISOString()
  const d = A.clientes([
    { nome: 'Maria', telefone: '111', total_pedidos: 12, total_gasto: 2400, ultimo_pedido_em: hoje },
    { nome: 'João', telefone: '222', total_pedidos: 3, total_gasto: 300, ultimo_pedido_em: antigo },
    { nome: 'Novo', telefone: '333', total_pedidos: 1, total_gasto: 50, ultimo_pedido_em: hoje },
    { nome: 'Migrado', telefone: '444', total_pedidos: 0, total_gasto: 0, ultimo_pedido_em: null },
  ])
  const por = (n) => d.itens.find((c) => c.nome === n)
  assert.strictEqual(por('Maria').segmento, 'VIP')
  assert.strictEqual(por('João').segmento, 'Em risco')
  assert.strictEqual(por('Novo').segmento, 'Novo')
  assert.strictEqual(por('Migrado').segmento, 'Importado')
  assert.strictEqual(por('Migrado').ultimo, 'Sem pedido')
})

test('Clientes: o ticket médio ignora quem nunca comprou', () => {
  const d = A.clientes([
    { nome: 'A', telefone: '1', total_pedidos: 2, total_gasto: 200, ultimo_pedido_em: new Date().toISOString() },
    { nome: 'B', telefone: '2', total_pedidos: 0, total_gasto: 0 },
  ])
  assert.strictEqual(d.kpis.ticketMedio, 100, 'quem tem 0 pedido não puxa a média para baixo')
  assert.strictEqual(d.kpis.unicos, 2)
})

test('Clientes: resposta que não é lista devolve null, e a tela avisa', () => {
  assert.strictEqual(A.clientes({ error: 'Não autorizado' }), null)
  assert.strictEqual(A.clientes(null), null)
})

// ── Configurações ──
test('Configurações: campo que a loja não preencheu vira vazio, não "undefined"', () => {
  const d = A.configuracoes({ lojaResp: { id: 'l1', nome: 'Pizzaria', timezone: 'America/Sao_Paulo', aberta: true } })
  const geral = d.abas.config
  const nome = geral[0].campos.find((c) => c.rotulo.indexOf('Nome fantasia') === 0)
  assert.strictEqual(nome.valor, 'Pizzaria')
  const cnpj = geral[1].campos.find((c) => c.rotulo === 'CNPJ')
  assert.strictEqual(cnpj.valor, '', 'sem CNPJ, valor vazio — a tela escreve "Não informado"')
  assert.ok(!JSON.stringify(d).includes('undefined'))
})

test('Configurações: as modalidades saem do que a loja aceita', () => {
  const d = A.configuracoes({ lojaResp: { id: 'l1', aceita_entrega: false, aceita_retirada: true, aceita_local: true } })
  const m = d.abas.config[3].campos[0].valor
  assert.ok(!/Entrega/.test(m) && /Retirada/.test(m) && /local/.test(m))
})

test('Configurações: sem a loja, devolve null em vez de tela meia-boca', () => {
  assert.strictEqual(A.configuracoes({ lojaResp: null }), null)
})

test('os horários viram uma linha por dia, pulando o que não veio', () => {
  const linhas = A.horariosDaLoja({ 0: { abre: '10:00', fecha: '23:00' }, 6: { abre: '10:00', fecha: '00:30' } })
  assert.strictEqual(linhas.length, 2)
  assert.strictEqual(linhas[0].rotulo, 'Domingo')
  assert.strictEqual(linhas[0].valor, '10:00 às 23:00')
  assert.deepStrictEqual(A.horariosDaLoja(null), [])
})

// ── Gestão / estoque ──
test('Gestão: os itens se separam nas três categorias do painel', () => {
  const d = A.estoque({ ingredientesResp: [
    { id: '1', nome: 'Pizza Calabresa', tipo: 'produto_pronto', qtd_atual: 4, unidade: 'un', custo_unitario: 18, produto_id: 'p1' },
    { id: '2', nome: 'Refrigerante', tipo: 'bebida', qtd_atual: 0, unidade: 'un', custo_unitario: 6 },
    { id: '3', nome: 'Muçarela', tipo: 'insumo', qtd_atual: 42, unidade: 'kg', custo_medio: 38.9 },
  ] })
  assert.deepStrictEqual(d.categorias.map((c) => c.id), ['producao', 'revenda', 'insumos'])
  assert.strictEqual(d.categorias[0].mostraMassas, true, 'só a produção própria tem massas')
  assert.strictEqual(d.categorias[0].subcategorias[0].itens[0].cardapio, true, 'vinculado ao cardápio')
  assert.strictEqual(d.categorias[1].subcategorias[0].itens[0].cardapio, false, 'bebida sem vínculo grita')
  assert.strictEqual(d.categorias[2].subcategorias[0].itens[0].custo, 38.9, 'sem custo unitário, usa o médio')
})

test('Gestão: pendência da nota traz problema, nota e se já foi resolvida', () => {
  const d = A.estoque({ ingredientesResp: [], pendenciasResp: [
    { tipo: 'falta', produto_nome: 'Energético', qtd: 6, valor: 41.4, nota_numero: '4410',
      fornecedor_nome: 'Bebidas SA', criado_em: '2026-09-04T10:00:00Z', resolvida_em: null },
    { tipo: 'avaria', produto_nome: 'Tomate', qtd: 1, valor: 98, criado_em: '2026-09-03T10:00:00Z', resolvida_em: '2026-09-05T10:00:00Z' },
  ] })
  const p = d.nfEntrada.pendencias
  assert.strictEqual(p[0].problema, 'Falta')
  assert.strictEqual(p[0].nota, 'NF 4410')
  assert.strictEqual(p[0].resolvida, false)
  assert.strictEqual(p[1].problema, 'Avaria')
  assert.strictEqual(p[1].resolvida, true)
  assert.strictEqual(p[1].nota, '—', 'pendência sem nota não inventa número')
})

// ── Parceiros ──
test('Parceiros: os pagamentos viram um parceiro por nome, somados', () => {
  const d = A.parceiros([
    { vendedor_nome: 'Hotel', tipo: 'Parceiro', codigo: 'HPB', pedidos: 40, base_calculo: 5000, valor: 500 },
    { vendedor_nome: 'Hotel', tipo: 'Parceiro', codigo: 'HPB', pedidos: 22, base_calculo: 2800, valor: 280 },
    { vendedor_nome: 'Bia', tipo: 'Influencer', codigo: 'BIA', pedidos: 14, base_calculo: 980, valor: 98 },
  ])
  assert.strictEqual(d.itens.length, 2)
  const hotel = d.itens.find((p) => p.nome === 'Hotel')
  assert.strictEqual(hotel.pedidos, 62)
  assert.strictEqual(hotel.comissao, 780)
  assert.strictEqual(d.comissaoPaga, 878)
})

// ── Fidelidade ──
test('Fidelidade: aceita o dashboard em camelCase ou snake_case', () => {
  const camel = A.fidelidade({ dashboardResp: { pontosDistribuidos: 100, emDescontos: 10 } })
  const snake = A.fidelidade({ dashboardResp: { pontos_distribuidos: 100, em_descontos: 10 } })
  assert.strictEqual(camel.pontosDistribuidos, 100)
  assert.strictEqual(snake.pontosDistribuidos, 100)
  assert.strictEqual(snake.emDescontos, 10)
})

test('Fidelidade: resgate sai como Resgate e o ganho como Ganho', () => {
  const d = A.fidelidade({ dashboardResp: {}, atividadesResp: [
    { tipo: 'resgate', pontos: -200, cliente_nome: 'João', criado_em: '2026-09-07T19:02:00Z', pedido_numero: 1041 },
    { tipo: 'ganho', pontos: 62, cliente_nome: 'Maria', criado_em: '2026-09-07T20:14:00Z' },
  ] })
  assert.strictEqual(d.atividades[0].tipo, 'Resgate')
  assert.strictEqual(d.atividades[0].pontos, 200, 'o sinal fica na coluna, não no número')
  assert.strictEqual(d.atividades[0].pedido, '#1041')
  assert.strictEqual(d.atividades[1].tipo, 'Ganho')
})

// ── o que vale para todos ──
test('nenhum adaptador deixa passar "undefined" para a tela', () => {
  const saidas = [
    A.filaDeProducao({ items: [] }),
    A.salao(respostaSalao),
    A.clientes([{ nome: 'X', telefone: '1' }]),
    A.configuracoes({ lojaResp: { id: 'l1' } }),
    A.estoque({ ingredientesResp: [{ id: '1', nome: 'Y', tipo: 'insumo' }] }),
    A.parceiros([{ vendedor_nome: 'Z', valor: 10 }]),
    A.campanhas({ campanhasResp: {} }),
    A.fidelidade({ dashboardResp: {} }),
  ]
  for (const s of saidas) assert.ok(!JSON.stringify(s).includes('undefined'), JSON.stringify(s).slice(0, 120))
})

test('resposta de erro do painel não vira tela com dado inventado', () => {
  // Um 401 devolve {error}. O adaptador não pode transformar isso em lista vazia
  // silenciosa — quem decide é o `valida` do catálogo, mas o adaptador não quebra.
  assert.doesNotThrow(() => A.filaDeProducao({ error: 'Não autorizado' }))
  assert.doesNotThrow(() => A.salao({ error: 'Não autorizado' }))
  assert.doesNotThrow(() => A.estoque({ ingredientesResp: { error: 'x' } }))
})

// ── Dados BRUTOS para as fichas de Configurações (o que a tela edita) ──────
test('configuracoes expõe o bruto com ids: é o que as fichas de edição precisam', () => {
  const d = A.configuracoes({
    lojaResp: { id: 'l1', nome: 'Pizzaria', telefone: '75 9', endereco: { rua: 'A', numero: '1', bairro: 'Centro', cidade: 'X', uf: 'BA', cep: '4' },
      pix_chave: 'chave', modalidades_pedido: ['entrega'], tempo_estimado_balcao: 20, tempo_estimado_delivery: 45, tempo_estimado_local: 30,
      modo_horario: 'automatico', timezone: 'America/Bahia', numeracao_diaria: true, maps_url: 'https://m',
      horarios: { seg: { abre: '18:00', fecha: '23:00' }, dom: { abre: null, fecha: null } } },
    bairrosResp: { bairros: ['Centro', 'Praia'], taxas_bairro: { Centro: { taxa: 5, ativo: true } }, taxa_padrao: 7, entrega_gratis_valor_min: 80 },
    formasResp: [{ id: 'f1', metodo: 'pix', habilitado: true, tipos: ['delivery'], dias_recebimento: 0 }],
    contasResp: [{ id: 'cf1', nome: 'BB', tipo: 'banco', ativo: true }],
    salaoResp: { mesas: [{ id: 'm1', numero: '7', capacidade: 4, tipo: 'mesa', reservada: false }] },
    comandaResp: { config: { modelo: 'compacto', fonte_escala: 100 }, existe: true },
  })
  const b = d.bruto
  assert.strictEqual(b.loja.nome, 'Pizzaria')
  assert.strictEqual(b.loja.endereco.bairro, 'Centro')
  assert.deepStrictEqual(b.loja.modalidades, ['entrega'])
  assert.deepStrictEqual(b.loja.tempos, { balcao: 20, delivery: 45, local: 30 })
  assert.strictEqual(b.loja.numeracaoDiaria, true)
  assert.deepStrictEqual(b.horarios.seg, { abre: '18:00', fecha: '23:00' })
  assert.deepStrictEqual(b.horarios.dom, { abre: null, fecha: null })
  assert.strictEqual(b.horarios.qua.abre, null, 'dia sem registro vem fechado, não some')
  assert.strictEqual(b.timezone, 'America/Bahia')
  assert.deepStrictEqual(b.bairros.bairros, ['Centro', 'Praia'])
  assert.deepStrictEqual(b.bairros.taxas.Centro, { taxa: 5, ativo: true })
  assert.strictEqual(b.bairros.entregaGratisAcima, 80)
  assert.strictEqual(b.formas[0].id, 'f1')
  assert.strictEqual(b.contasFinanceiras[0].id, 'cf1')
  assert.deepStrictEqual(b.mesas[0], { id: 'm1', numero: '7', capacidade: 4, tipo: 'mesa', reservada: false })
  assert.strictEqual(b.comanda.modelo, 'compacto')
})

test('o bruto não inventa: sem bairros, sem formas, sem comanda vem vazio — e a loja sem endereço vem com endereço vazio', () => {
  const d = A.configuracoes({ lojaResp: { id: 'l1', nome: 'X' } })
  assert.deepStrictEqual(d.bruto.bairros, { bairros: [], taxas: {}, taxaPadrao: 0, entregaGratisAcima: null })
  assert.deepStrictEqual(d.bruto.formas, [])
  assert.deepStrictEqual(d.bruto.contasFinanceiras, [])
  assert.deepStrictEqual(d.bruto.mesas, [])
  assert.strictEqual(d.bruto.comanda, null)
  assert.deepStrictEqual(d.bruto.loja.endereco, { rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' })
})

test('estoque: item, fornecedor e pendência levam o id — sem ele não há o que editar', () => {
  const d = A.estoque({
    ingredientesResp: [{ id: 'i1', nome: 'Muçarela', tipo: 'ingrediente', unidade: 'kg', qtd_atual: 4, qtd_minima: 2, custo_unitario: 30 }],
    fornecedoresResp: [{ id: 'fo1', nome: 'Vale Verde', cnpj_cpf: '1', telefone: '2', email: 'a@b.c', endereco: 'Rua', observacoes: 'obs', tipo: 'fornecedor', ativo: true }],
    pendenciasResp: [{ id: 'p1', tipo: 'falta', produto_nome: 'Queijo', qtd: 2, valor: 10, criado_em: '2026-09-10T10:00:00Z' }],
    fichasResp: {
      produtos: [{ id: 'pr1', nome: 'Pizza Calabresa G', preco: 59.9, categoria_id: 'c1' }],
      insumos: [{ id: 'i1', nome: 'Muçarela', unidade: 'kg', custo_unitario: 30 }, { id: 'i2', nome: 'Calabresa', unidade: 'kg', custo_unitario: 40 }],
      categorias: [{ id: 'c1', nome: 'Pizzas' }],
      fichas: [{ produto_id: 'pr1', ingrediente_id: 'i1', qtd_consumida: 0.25 }, { produto_id: 'pr1', ingrediente_id: 'i2', qtd_consumida: 0.18 }],
    },
  })
  assert.strictEqual(d.categorias[0].subcategorias[0].itens[0].id, 'i1')
  assert.strictEqual(d.categorias[0].subcategorias[0].itens[0].tipo, 'ingrediente')
  assert.strictEqual(d.fornecedores[0].id, 'fo1')
  assert.strictEqual(d.fornecedores[0].email, 'a@b.c')
  assert.strictEqual(d.nfEntrada.pendencias[0].id, 'p1')
  // A tela lê `fichas.itens` (mesmo formato da demonstração).
  assert.strictEqual(d.fichas.itens[0].produtoId, 'pr1')
  assert.strictEqual(d.fichas.itens[0].produto, 'Pizza Calabresa G')
  assert.strictEqual(d.fichas.itens[0].categoria, 'Pizzas')
  assert.deepStrictEqual(d.fichas.itens[0].insumos.map((x) => [x.id, x.nome, x.qtd]), [['i1', 'Muçarela', '0,25 kg'], ['i2', 'Calabresa', '0,18 kg']])
  assert.strictEqual(d.fichas.itens[0].custo, 14.7, 'custo = soma qtd × custo do insumo')
  assert.deepStrictEqual(d.insumos.map((x) => x.id), ['i1', 'i2'], 'a lista de insumos serve aos selects das fichas')
})
