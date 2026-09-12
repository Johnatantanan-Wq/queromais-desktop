const { test } = require('node:test')
const assert = require('node:assert')
const F = require('../renderer/elo/ficha')

const pedido = { numero: '1042', cliente: 'Maria Silva', canal: 'Delivery', hora: '20:12', valor: 89.9,
  pagamento: 'Pix', etapa: 'producao', entrouHaMin: 8, itens: ['1x Pizza Calabresa G', '1x Refrigerante 2L'],
  endereco: 'Rua das Flores, 120 — Centro', telefone: '(75) 98811-0001', taxa: 8, desconto: 5 }

test('a ficha do pedido traz cabeçalho, itens e a conta fechando', () => {
  const h = F.fichaPedido(pedido)
  assert.ok(h.includes('#1042') && h.includes('Maria Silva'))
  assert.ok(h.includes('Pizza Calabresa'))
  assert.ok(h.includes('Entrega') && h.includes('8,00'))
  assert.ok(h.includes('Desconto') && h.includes('5,00'))
  assert.ok(h.includes('89,90'))
})

test('a ficha do pedido tem os botões de ação, incluindo imprimir a comanda', () => {
  const h = F.fichaPedido(pedido)
  assert.ok(h.includes('data-acao="ficha:imprimir:1042"'))
  assert.ok(/imprimir comanda/i.test(h))
})

test('pedido de delivery mostra endereço; de balcão, não', () => {
  assert.ok(F.fichaPedido(pedido).includes('Rua das Flores'))
  const balcao = F.fichaPedido({ ...pedido, canal: 'Balcão', endereco: null })
  assert.ok(!balcao.includes('Rua das Flores'))
})

test('a ficha do cliente traz contato, resumo e últimos pedidos', () => {
  const h = F.fichaCliente({ nome: 'Maria Silva', telefone: '(75) 98811-0001', bairro: 'Centro',
    pedidos: 42, total: 2480.3, ultimo: 'hoje', ultimos: [{ numero: '1042', data: 'hoje', valor: 89.9 }] })
  assert.ok(h.includes('Maria Silva') && h.includes('(75) 98811-0001'))
  assert.ok(h.includes('42') && h.includes('2.480,30'))
  assert.ok(h.includes('#1042'))
})

test('a ficha do produto traz preço, vendas e ficha técnica', () => {
  const h = F.fichaProduto({ nome: 'Pizza Calabresa G', categoria: 'Pizzas salgadas', preco: 59.9,
    vendas7d: 128, situacao: 'Disponível', custo: 18.4, insumos: ['Muçarela 250g', 'Calabresa 120g'] })
  assert.ok(h.includes('Pizza Calabresa G') && h.includes('59,90'))
  assert.ok(h.includes('128'))
  assert.ok(h.includes('Muçarela'))
  assert.ok(/margem/i.test(h))
})

test('o painel embrulha a ficha com título e botão de fechar', () => {
  const h = F.painel('Pedido #1042', '<p>x</p>')
  assert.ok(h.includes('Pedido #1042'))
  assert.ok(h.includes('data-fechar-ficha'))
  assert.ok(h.includes('<p>x</p>'))
})

test('ficha de item que não existe não quebra', () => {
  assert.ok(/não encontrad/i.test(F.fichaPedido(null)))
  assert.ok(/não encontrad/i.test(F.fichaCliente(null)))
})

// ── F3.4: conferência do fechamento e a fila ───────────────────────────────
test('a ficha de conferência lista o que o app não viu, o esperado novo, e deixa confirmar ou deixar para depois', () => {
  const h = F.fichaConferencia({
    caixaId: 'cx1', em: '2026-09-12T01:30:00Z',
    naoVistas: [{ id: 'x', tipo: 'venda', forma: 'pix', valor: 55, descricao: 'Pedido #12', criado_em: '2026-09-12T01:10:00Z' }],
    esperado: { dinheiro: 255, pix: 0, cartao: 0 }, contados: { dinheiro: 200, pix: 0, cartao: 0 },
  })
  assert.ok(h.includes('Pedido #12') && h.includes('55,00'))
  assert.ok(h.includes('255,00'), 'o esperado depois do que o app não viu')
  assert.ok(/data-campo="dinheiro" value="200"/.test(h), 'o contado vem preenchido para conferir')
  assert.ok(h.includes('data-acao="caixa:conferencia:confirmar"') && h.includes('data-acao="caixa:conferencia:depois"'))
  assert.ok(/não viu/.test(h))
})

test('a ficha da fila mostra cada operação, o erro de quem não subiu, e as saídas: tentar, exportar, desistir', () => {
  const h = F.fichaFila({ pendentes: 1, comErro: 1, total: 30, ultimoErro: 'Caixa fechado', itens: [
    { id: 'a', tipo: 'venda', provisorio: 'L-1', cliente: 'Ana', valor: 30, erro: null, criadoEm: '2026-09-12T01:00:00Z' },
    { id: 'b', tipo: 'movimentacao', provisorio: null, cliente: 'Sangria', valor: 10, erro: 'Caixa fechado', criadoEm: '2026-09-12T01:05:00Z' },
  ] })
  assert.ok(h.includes('L-1') && h.includes('Ana') && h.includes('30,00'))
  assert.ok(h.includes('Caixa fechado'))
  assert.ok(h.includes('data-acao="fila:remover:b"'), 'desistir só do que deu erro')
  assert.ok(!h.includes('data-acao="fila:remover:a"'), 'o que ainda vai subir não se apaga')
  assert.ok(h.includes('data-acao="fila:tentar"') && h.includes('data-acao="fila:exportar"'))
})

// ── Fichas de Configurações/Financeiro/Gestão: os helpers de formulário ────
test('campoSelecao desenha um select com a opção atual marcada', () => {
  const h = F.campoSelecao('Tipo', 'tipo', [{ v: 'banco', r: 'Banco' }, { v: 'carteira', r: 'Carteira' }], 'carteira', 'onde cai')
  assert.ok(/<select data-campo="tipo"/.test(h))
  assert.ok(/value="carteira" selected/.test(h))
  assert.ok(!/value="banco" selected/.test(h))
  assert.ok(h.includes('onde cai'))
})

test('campoMarcar é uma caixa de marcar com o estado atual', () => {
  assert.ok(/<input type="checkbox" data-campo="ativo" checked/.test(F.campoMarcar('Ativo', 'ativo', true)))
  assert.ok(!/checked/.test(F.campoMarcar('Ativo', 'ativo', false)))
  assert.ok(F.campoMarcar('Ativo', 'ativo', false, 'liga ou desliga').includes('liga ou desliga'))
})

test('campoArea é um texto de várias linhas com o valor atual', () => {
  const h = F.campoArea('Observações', 'obs', 'linha 1')
  assert.ok(/<textarea data-campo="obs"/.test(h) && h.includes('linha 1'))
})

// ── Fichas de CONFIGURAÇÕES: vêm preenchidas com o bruto e mandam pelos botões ──
const bruto = require('../src-electron/demo-dados').apoioFinal().configuracoes.bruto
const temCampo = (h, nome) => new RegExp('data-campo="' + nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"').test(h)
const valorDe = (h, nome) => { const m = h.match(new RegExp('data-campo="' + nome + '" value="([^"]*)"')); return m ? m[1] : null }

test('ficha da loja: vem preenchida, avisa que branco não altera, e não tem taxa de serviço nem de entrega', () => {
  const h = F.fichaLoja(bruto.loja)
  for (const c of ['nome', 'telefone', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep', 'mapsUrl', 'balcao', 'delivery', 'local', 'pixChave', 'numeracaoDiaria', 'modoHorario']) assert.ok(temCampo(h, c), 'campo ' + c)
  assert.strictEqual(valorDe(h, 'nome'), 'Pizzaria Demonstração')
  assert.strictEqual(valorDe(h, 'rua'), 'Avenida Beira Mar')
  assert.strictEqual(valorDe(h, 'delivery'), '45')
  assert.ok(/data-campo="mod:entrega" checked/.test(h) && /data-campo="mod:consumo_local" checked/.test(h))
  assert.ok(/em branco/i.test(h), 'avisa que campo em branco não altera')
  assert.ok(!/taxa de serviço/i.test(h) && !/taxa de entrega/i.test(h))
  assert.ok(h.includes('data-acao="config:loja:confirmar"') && h.includes('data-acao="config:cancelar"'))
})

test('ficha de horários: os sete dias com abre/fecha, o fuso e o modo', () => {
  const h = F.fichaHorarios(bruto.horarios, bruto.timezone, bruto.loja.modoHorario)
  for (const d of ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']) assert.ok(temCampo(h, 'abre:' + d) && temCampo(h, 'fecha:' + d), d)
  assert.strictEqual(valorDe(h, 'abre:seg'), '10:00')
  assert.strictEqual(valorDe(h, 'fecha:sab'), '00:30')
  assert.strictEqual(valorDe(h, 'timezone'), 'America/Bahia')
  assert.ok(temCampo(h, 'modoHorario'))
  assert.ok(h.includes('data-acao="config:horarios:confirmar"'))
})

test('ficha de bairros: uma linha por bairro com taxa e ligado, mais linhas em branco para novos', () => {
  const h = F.fichaBairros(bruto.bairros)
  assert.strictEqual(valorDe(h, 'bairro-nome:0'), 'Praia de Guaibim')
  assert.strictEqual(valorDe(h, 'bairro-taxa:0'), '5')
  assert.ok(/data-campo="bairro-ativo:0" checked/.test(h))
  assert.ok(temCampo(h, 'bairro-nome:4') && temCampo(h, 'bairro-nome:6'), 'três linhas em branco para novos')
  assert.strictEqual(valorDe(h, 'entregaGratisAcima'), '120')
  assert.ok(/apague o nome/i.test(h), 'diz como remover um bairro')
  assert.ok(h.includes('data-acao="config:bairros:confirmar"'))
})

test('ficha da forma de pagamento: editar vem com tudo preenchido; nova pede o nome', () => {
  const credito = bruto.formas.find((f) => f.metodo === 'credito')
  const h = F.fichaForma(credito, bruto.contasFinanceiras)
  assert.ok(/Cartão de crédito/.test(h))
  assert.ok(/data-campo="habilitado" checked/.test(h))
  assert.ok(/data-campo="tipo:retirada" checked/.test(h) && !/data-campo="tipo:delivery" checked/.test(h))
  assert.strictEqual(valorDe(h, 'diasRecebimento'), '30')
  assert.strictEqual(valorDe(h, 'taxaOperadoraPct'), '3,2')
  assert.ok(/data-campo="contaFinanceiraId"/.test(h) && /value="b1" selected/.test(h))
  assert.ok(/data-campo="geraReceber" checked/.test(h))
  assert.ok(h.includes('data-acao="config:forma:confirmar:f-credito"'))
  const nova = F.fichaForma(null, bruto.contasFinanceiras)
  assert.ok(temCampo(nova, 'metodo'))
  assert.ok(!temCampo(nova, 'habilitado'), 'nova nasce ligada — sem a caixa')
  assert.ok(nova.includes('data-acao="config:forma-nova:confirmar"'))
})

test('ficha da conta financeira: nova e editar; cartão mostra o ciclo', () => {
  const h = F.fichaContaFinanceira(bruto.contasFinanceiras[2])
  assert.strictEqual(valorDe(h, 'nome'), 'Cartão Itaú Empresas')
  assert.ok(/value="cartao_credito" selected/.test(h))
  assert.strictEqual(valorDe(h, 'diaFechamento'), '28')
  assert.ok(/data-campo="ativo" checked/.test(h))
  assert.ok(h.includes('data-acao="config:conta:confirmar:b3"') && h.includes('data-acao="config:conta:excluir:b3"'))
  const nova = F.fichaContaFinanceira(null)
  assert.ok(nova.includes('data-acao="config:conta:confirmar:nova"') && !nova.includes('excluir'))
})

test('fichas de mesas: criar em lote (com o próximo número sugerido) e editar uma', () => {
  const lote = F.fichaMesasCriar(11)
  assert.strictEqual(valorDe(lote, 'numeroInicio'), '11')
  assert.ok(temCampo(lote, 'quantidade') && temCampo(lote, 'capacidade') && temCampo(lote, 'tipo'))
  assert.ok(lote.includes('data-acao="config:mesas-criar:confirmar"'))
  const uma = F.fichaMesa(bruto.mesas[6])
  assert.strictEqual(valorDe(uma, 'numero'), '7')
  assert.strictEqual(valorDe(uma, 'capacidade'), '6')
  assert.ok(temCampo(uma, 'reservada'))
  assert.ok(uma.includes('data-acao="config:mesa:confirmar:m7"') && uma.includes('data-acao="config:mesa:excluir:m7"'))
})

test('ficha do colaborador novo: nome, CPF, senha e a função do painel', () => {
  const h = F.fichaColaboradorNovo()
  for (const c of ['nome', 'cpf', 'senha', 'funcao', 'podeUnirMesas']) assert.ok(temCampo(h, c), c)
  assert.ok(/value="caixa_operador"/.test(h) && /Garçom/.test(h))
  assert.ok(/CPF e senha/.test(h), 'diz como essa pessoa vai entrar')
  assert.ok(h.includes('data-acao="config:colaborador:confirmar"'))
})

test('ficha da comanda: modelo, fonte, o que mostrar e os textos — e sem a configuração atual, avisa', () => {
  const h = F.fichaComanda(bruto.comanda)
  assert.ok(/data-campo="modelo"/.test(h) && /value="atual" selected/.test(h))
  assert.strictEqual(valorDe(h, 'fonte_escala'), '100')
  assert.ok(/data-campo="mostrar_logo" checked/.test(h) && !/data-campo="mostrar_endereco_loja" checked/.test(h))
  assert.ok(temCampo(h, 'texto_rodape') && temCampo(h, 'mensagem_final') && temCampo(h, 'extra_ativa') && temCampo(h, 'extra_qr_tipo'))
  assert.ok(h.includes('data-acao="config:comanda:confirmar"'))
  const sem = F.fichaComanda(null)
  assert.ok(/internet/.test(sem) && !sem.includes('config:comanda:confirmar'))
})

test('fichaConfirmar: a pergunta, o botão que confirma com a ação dada e o que cancela', () => {
  const h = F.fichaConfirmar('Excluir a conta "BB"? O histórico fica.', 'config:conta:excluir-sim:b1', 'Excluir')
  assert.ok(h.includes('Excluir a conta'))
  assert.ok(h.includes('data-acao="config:conta:excluir-sim:b1"') && h.includes('data-acao="config:cancelar"'))
})

// ── Fichas do FINANCEIRO: lançamento avulso, editar conta, cancelar conta ──
test('ficha de lançamento: receita/despesa, categoria do plano, data de hoje sugerida e a conta de destino', () => {
  const h = F.fichaLancamento([{ id: 'b1', nome: 'Banco do Brasil — corrente', tipo: 'banco', ativo: true }], '12/09/2026')
  assert.ok(/data-campo="tipo"/.test(h) && /value="despesa" selected/.test(h))
  assert.ok(/data-campo="categoria"/.test(h) && /Energia/.test(h) && /Insumos/.test(h))
  assert.ok(temCampo(h, 'descricao') && temCampo(h, 'valor') && temCampo(h, 'centroCusto') && temCampo(h, 'forma') && temCampo(h, 'contaFinanceiraId'))
  assert.strictEqual(valorDe(h, 'data'), '12/09/2026')
  assert.ok(/Banco do Brasil/.test(h))
  assert.ok(h.includes('data-acao="lancamento:confirmar"') && h.includes('data-acao="config:cancelar"'))
})

test('ficha de editar conta: vem preenchida e diz o que não se mexe aqui', () => {
  const h = F.fichaContaEditar({ id: 'c1', direcao: 'pagar', descricao: 'Aluguel', valor: 1400, vencimento: '2026-09-10', categoria: 'Aluguel', contraparte: 'Imobiliária', observacao: '' })
  assert.strictEqual(valorDe(h, 'descricao'), 'Aluguel')
  assert.strictEqual(valorDe(h, 'valor'), '1400')
  assert.strictEqual(valorDe(h, 'vencimento'), '10/09/2026')
  assert.strictEqual(valorDe(h, 'contraparte'), 'Imobiliária')
  assert.ok(temCampo(h, 'categoria') && temCampo(h, 'observacao'))
  assert.ok(h.includes('data-acao="conta:editar:confirmar:c1"'))
  assert.ok(/baixa/i.test(h), 'lembra que a baixa é outra ficha')
})

test('ficha de cancelar conta: pergunta, e a parcelada oferece cancelar a série', () => {
  const uma = F.fichaContaCancelar({ id: 'c1', descricao: 'Aluguel', valor: 1400 })
  assert.ok(/Aluguel/.test(uma) && uma.includes('data-acao="conta:cancelar:sim:c1"') && !uma.includes('serie'))
  const serie = F.fichaContaCancelar({ id: 'c4', descricao: 'NF 8821 — parcela 1/3', valor: 1400, serie: 's1' })
  assert.ok(serie.includes('data-acao="conta:cancelar:sim:c4"') && serie.includes('data-acao="conta:cancelar:serie:c4"'))
  assert.ok(/série/.test(serie))
})
