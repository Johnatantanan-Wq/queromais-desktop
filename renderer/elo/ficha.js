// renderer/elo/ficha.js — o detalhe que abre ao clicar numa linha ou num cartão.
//
// Painel lateral, não página nova: no balcão, quem abre um pedido quer voltar para a
// lista em seguida — trocar de tela faria perder o lugar. É o mesmo padrão que o Elo usa
// para a ficha do cliente.

const esc = require('./tela-lista').esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const naoAchou = (o) => '<div class="evazio">' + o + ' não encontrado.</div>'

function bloco(titulo, conteudo) {
  return '<div style="margin-bottom:20px">'
    + '<div style="font-size:11px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px">' + esc(titulo) + '</div>'
    + conteudo + '</div>'
}
function linha(rotulo, valor, forte) {
  return '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #f4f5f7">'
    + '<span style="font-size:12.5px;color:#6b7280;font-weight:600">' + esc(rotulo) + '</span>'
    + '<span style="font-size:13px;color:#111;font-weight:' + (forte ? 800 : 600) + ';text-align:right">' + esc(valor) + '</span></div>'
}
function botao(acao, rotulo, primaria) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:36px;padding:0 14px;border-radius:10px;'
    + 'font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;white-space:nowrap;'
    + (primaria ? 'border:none;background:var(--acento);color:#fff' : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">'
    + esc(rotulo) + '</button>'
}

/** Moldura do painel: fundo escurecido + folha à direita. */
/**
 * POPUP — janela centralizada, no formato do Elo (print do dono, 08/09): fundo
 * escurecido, caixa branca no meio da tela, cantos arredondados e sombra funda.
 *
 * Quando usar cada um: o `painel` lateral é para CONSULTAR (ficha do pedido, do
 * cliente) — a tela por trás continua à vista e o lojista compara. O `popup` é para
 * FAZER: sangria, fechamento, abertura. A ação pede atenção inteira, e o fundo
 * escurecido é o que diz isso.
 */
function popup(titulo, conteudo, largura, fixo) {
  // `fixo`: o quadro não muda de tamanho com o que tem dentro — o corpo rola. Serve
  // para janela onde se DIGITA (a venda manual): conteúdo aparecendo não pode mexer
  // o quadro nem recentralizá-lo debaixo das mãos do operador.
  const altura = fixo ? 'height:88vh;' : 'max-height:88vh;'
  return '<div id="eloFicha" style="position:fixed;inset:0;z-index:900;display:flex;align-items:center;'
    + 'justify-content:center;padding:32px">'
    + '<div data-fechar-ficha="1" style="position:absolute;inset:0;background:rgba(17,17,17,.32)"></div>'
    + '<div style="position:relative;width:' + (largura || 520) + 'px;max-width:94vw;' + altura + 'background:#fff;'
    + 'border-radius:16px;box-shadow:0 24px 64px rgba(17,17,17,.24);display:flex;flex-direction:column;'
    + 'animation:eloFadeUp .2s ease both;overflow:hidden">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 24px;'
    + 'border-bottom:1px solid #eef0f3">'
    + '<div style="font-size:16px;font-weight:800;color:#111">' + esc(titulo) + '</div>'
    + '<button type="button" data-fechar-ficha="1" style="width:32px;height:32px;border:1px solid #e5e7eb;'
    + 'border-radius:9px;background:#fff;color:#6b7280;cursor:pointer;font-family:inherit;font-size:14px">✕</button></div>'
    + '<div data-corpo-popup="1" style="flex:1;overflow:auto;padding:22px 24px">' + conteudo + '</div></div></div>'
}

function painel(titulo, conteudo) {
  return '<div id="eloFicha" style="position:fixed;inset:0;z-index:900;display:flex;justify-content:flex-end">'
    + '<div data-fechar-ficha="1" style="position:absolute;inset:0;background:rgba(17,17,17,.28)"></div>'
    + '<div style="position:relative;width:460px;max-width:92vw;height:100%;background:#fff;border-left:1px solid #e8eaee;'
    + 'box-shadow:-8px 0 32px rgba(17,17,17,.10);display:flex;flex-direction:column;animation:eloFadeUp .25s ease both">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 24px;border-bottom:1px solid #e8eaee">'
    + '<div style="font-size:16px;font-weight:800;color:#111">' + esc(titulo) + '</div>'
    + '<button type="button" data-fechar-ficha="1" style="width:32px;height:32px;border:1px solid #e5e7eb;border-radius:9px;'
    + 'background:#fff;color:#6b7280;cursor:pointer;font-family:inherit;font-size:14px">✕</button></div>'
    + '<div style="flex:1;overflow:auto;padding:22px 24px">' + conteudo + '</div></div></div>'
}

/** Campo de formulário da ficha — rótulo em cima, caixa embaixo. */
function campo(rotulo, attr, valor, dica) {
  return '<label style="display:block;margin-bottom:14px">'
    + '<span style="display:block;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;'
    + 'letter-spacing:.06em;margin-bottom:6px">' + esc(rotulo) + '</span>'
    + '<input data-campo="' + esc(attr) + '" value="' + esc(valor || '') + '" autocomplete="off"'
    + ' style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:10px;padding:0 12px;'
    + 'font-family:inherit;font-size:14px;font-weight:600;color:#111;box-sizing:border-box">'
    + (dica ? '<span style="display:block;font-size:11.5px;color:#9ca3af;font-weight:500;margin-top:5px">'
      + esc(dica) + '</span>' : '')
    + '</label>'
}

const ESTILO_CAMPO = 'width:100%;height:40px;border:1px solid #e5e7eb;border-radius:10px;padding:0 12px;'
  + 'font-family:inherit;font-size:14px;font-weight:600;color:#111;box-sizing:border-box;background:#fff'
function rotuloCampo(rotulo) {
  return '<span style="display:block;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;'
    + 'letter-spacing:.06em;margin-bottom:6px">' + esc(rotulo) + '</span>'
}
function dicaCampo(dica) {
  return dica ? '<span style="display:block;font-size:11.5px;color:#9ca3af;font-weight:500;margin-top:5px">' + esc(dica) + '</span>' : ''
}
/** Uma escolha entre poucas: `opcoes` = [{ v, r }], `atual` marca a atual. */
function campoSelecao(rotulo, attr, opcoes, atual, dica) {
  return '<label style="display:block;margin-bottom:14px">' + rotuloCampo(rotulo)
    + '<select data-campo="' + esc(attr) + '" style="' + ESTILO_CAMPO + ';padding:0 10px">'
    + (opcoes || []).map((o) => '<option value="' + esc(o.v) + '"' + (String(o.v) === String(atual == null ? '' : atual) ? ' selected' : '') + '>'
      + esc(o.r) + '</option>').join('')
    + '</select>' + dicaCampo(dica) + '</label>'
}
/** Liga/desliga. O shell lê com `marcadoNaFicha`, não com o valor. */
function campoMarcar(rotulo, attr, marcado, dica) {
  return '<label style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;cursor:pointer">'
    + '<input type="checkbox" data-campo="' + esc(attr) + '"' + (marcado ? ' checked' : '')
    + ' style="width:18px;height:18px;margin-top:1px;accent-color:var(--acento)">'
    + '<span><span style="display:block;font-size:13px;font-weight:700;color:#111">' + esc(rotulo) + '</span>'
    + (dica ? '<span style="display:block;font-size:11.5px;color:#9ca3af;font-weight:500;margin-top:2px">' + esc(dica) + '</span>' : '')
    + '</span></label>'
}
/** Texto de várias linhas. */
function campoArea(rotulo, attr, valor, dica) {
  return '<label style="display:block;margin-bottom:14px">' + rotuloCampo(rotulo)
    + '<textarea data-campo="' + esc(attr) + '" rows="3" style="' + ESTILO_CAMPO + ';height:auto;padding:10px 12px;resize:vertical">'
    + esc(valor || '') + '</textarea>' + dicaCampo(dica) + '</label>'
}
/** Duas ou três colunas de campos. */
function colunas(campos, n) {
  return '<div style="display:grid;grid-template-columns:repeat(' + (n || 2) + ',minmax(0,1fr));gap:10px">' + campos.join('') + '</div>'
}
function tituloSecao(texto) {
  return '<div style="font-size:10.5px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.08em;margin:6px 0 10px">' + esc(texto) + '</div>'
}
function avisoFicha(texto, tom) {
  const cores = tom === 'erro' ? ['#fdeaea', '#b42318'] : ['#fff9e8', '#8a6508']
  return '<div style="font-size:12px;font-weight:700;color:' + cores[1] + ';background:' + cores[0] + ';border-radius:9px;padding:9px 12px;margin-bottom:14px;line-height:1.45">' + esc(texto) + '</div>'
}

function botaoFicha(acao, rotulo, primaria) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:40px;padding:0 18px;border-radius:10px;'
    + 'font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;' + (primaria
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}

/**
 * Sangria / suprimento. O valor é o único campo obrigatório — o motivo o painel usa
 * para decidir se a sangria vira despesa no financeiro, então vale oferecer os mesmos
 * motivos que ele conhece em vez de texto livre.
 */
function fichaMovimentacao(tipo, motivos) {
  const sangria = tipo === 'sangria'
  const opcoes = (motivos || []).map((m) =>
    '<button type="button" data-motivo-caixa="' + esc(m) + '" class="echip" style="cursor:pointer;height:30px;'
    + 'background:#eef0f3;color:#4b5563">' + esc(m) + '</button>').join('')
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:18px;line-height:1.5">'
    + (sangria
      ? 'Tirar dinheiro da gaveta. O lançamento entra nas movimentações do turno e, conforme o motivo, vira despesa no financeiro.'
      : 'Pôr dinheiro na gaveta — troco, reforço do caixa.') + '</div>'
    + campo('Valor', 'valor', '', 'Pode digitar 12,50 ou 12.50.')
    + (sangria && opcoes
      ? '<div style="margin-bottom:6px"><span style="display:block;font-size:10.5px;font-weight:800;color:#9ca3af;'
        + 'text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Motivo</span>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">' + opcoes + '</div></div>'
      : '')
    + campo('Observação (opcional)', 'descricao', '')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('caixa:mov:cancelar', 'Cancelar', false)
    + botaoFicha('caixa:mov:confirmar:' + tipo, sangria ? 'Lançar sangria' : 'Lançar suprimento', true)
    + '</div>'
}

function fichaTempos(tempos) {
  const t = tempos || {}
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'É o tempo que o cliente vê no cardápio e a meta do quadro. Minutos inteiros, de 1 a 180.</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + campo('Balcão / retirada (min)', 'balcao', t.balcao != null ? String(t.balcao) : '')
    + campo('Delivery (min)', 'delivery', t.delivery != null ? String(t.delivery) : '') + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('loja:cancelar', 'Cancelar', false) + botaoFicha('loja:tempos:confirmar', 'Salvar tempos', true) + '</div>'
}

function fichaPausar() {
  const opcao = (min, rotulo) => '<button type="button" data-acao="loja:pausar:confirmar:' + min + '" class="ecard ecard-vivo"'
    + ' style="padding:16px;cursor:pointer;font-family:inherit;text-align:center;border:1.5px solid #e8eaee;background:#fff">'
    + '<div style="font-size:18px;font-weight:800;color:#111">' + esc(rotulo) + '</div></button>'
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'Enquanto estiver pausado, ninguém consegue pedir pelo cardápio. Volta sozinho quando o tempo acaba, ou antes se você retomar.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">' + opcao(15, '15 min') + opcao(30, '30 min') + opcao(60, '1 hora') + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">' + botaoFicha('loja:cancelar', 'Cancelar', false) + '</div>'
}

function fichaNovoEntregador() {
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'O entregador entra no app dele com o telefone — o código de acesso aparece depois de cadastrar.</div>'
    + campo('Nome', 'nome', '') + campo('Telefone com DDD', 'telefone', '', 'Ex.: (75) 99999-0000')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('loja:cancelar', 'Cancelar', false) + botaoFicha('entregador:confirmar', 'Cadastrar', true) + '</div>'
}

function fichaFecharRota(rota) {
  const r = rota || {}
  const esperado = Number(r.esperadoDeVolta) || 0
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">'
    + 'O entregador voltou. Conte o dinheiro que ele trouxe — o esperado é o fundo que levou mais o que recebeu na rua.</div>'
    + '<div style="background:#f7f8fa;border-radius:12px;padding:12px 14px;margin-bottom:16px">'
    + '<div style="display:flex;justify-content:space-between"><span style="font-size:13px;font-weight:800;color:#111">' + esc(r.entregador || '') + '</span>'
    + '<span style="font-size:13px;font-weight:800;color:#111">esperado ' + esc(brl(esperado)) + '</span></div>'
    + '<div style="font-size:12.5px;color:#6b7280;font-weight:600;margin-top:3px">' + esc((r.entregas || 0) + (r.entregas === 1 ? ' entrega' : ' entregas'))
    + ' · a receber na rua ' + esc(brl(r.dinheiroAReceber)) + '</div></div>'
    + campo('Dinheiro que trouxe', 'contado', esperado.toFixed(2).replace('.', ','), 'Diferença vira acerto do entregador.')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('loja:cancelar', 'Cancelar', false) + botaoFicha('rota:confirmar:' + esc(r.rotaId || ''), 'Fechar rota', true) + '</div>'
}

function fichaNovoCliente() {
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'O telefone é a chave: é por ele que o pedido, a conversa e a fidelidade reconhecem o cliente.</div>'
    + campo('Nome', 'nome', '') + campo('Telefone com DDD', 'telefone', '')
    + campo('CPF ou CNPJ (opcional)', 'documento', '', 'Para nota fiscal com CPF.')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('loja:cancelar', 'Cancelar', false) + botaoFicha('cliente:confirmar', 'Cadastrar', true) + '</div>'
}

const UNIDADES_ESTOQUE = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct']
const NOME_GRUPO_ESTOQUE = { insumos: 'Insumos', producao: 'Produção própria', revenda: 'Revenda',
  uso_consumo: 'Uso e consumo' }

/** Novo insumo na Gestão: o grupo vem da aba; o resto é o mínimo que o painel exige. */
function fichaNovoInsumo(grupo) {
  const unidades = '<label style="display:block;margin-bottom:14px">'
    + '<span style="display:block;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Unidade</span>'
    + '<select data-campo="unidade" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:10px;padding:0 10px;font-family:inherit;font-size:14px;font-weight:600;color:#111;background:#fff">'
    + UNIDADES_ESTOQUE.map((u) => '<option value="' + u + '"' + (u === 'un' ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></label>'
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'Entra em <b style="color:#111">' + esc(NOME_GRUPO_ESTOQUE[grupo] || grupo) + '</b>. '
    + (grupo === 'uso_consumo'
      // Sacola, guardanapo, limpeza: é DESPESA da loja. Antes só cabia em "Embalagem",
      // que o sistema trata como insumo de produção, e o gasto se misturava com o
      // custo do prato.
      ? 'Material de uso e consumo não entra no estoque de produção e nunca vira item de ficha técnica.'
      : 'Ligar ao produto do cardápio e ficha técnica ainda são pelo painel.') + '</div>'
    + campo('Nome do item', 'nome', '', 'Ex.: Azeitona preta')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + unidades + campo('Custo unitário', 'custo', '', 'Pode ser zero.') + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + campo('Quantidade atual', 'qtd', '0') + campo('Estoque mínimo', 'minimo', '0', 'Abaixo disso entra na lista de Compras.') + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('estoque:cadastro:cancelar', 'Cancelar', false)
    + botaoFicha('estoque:insumo:confirmar:' + esc(grupo), 'Cadastrar', true) + '</div>'
}

function fichaNovaCategoriaEstoque() {
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'Uma categoria de topo da Gestão. Subcategoria e categoria de venda ainda são pelo painel.</div>'
    + campo('Nome', 'nome', '', 'Ex.: Descartáveis')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('estoque:cadastro:cancelar', 'Cancelar', false)
    + botaoFicha('estoque:categoria:confirmar', 'Criar categoria', true) + '</div>'
}

function fichaNovoFornecedor() {
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'Só o nome é obrigatório. CNPJ e telefone ajudam a casar a nota fiscal de compra depois.</div>'
    + campo('Nome', 'nome', '')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + campo('CNPJ ou CPF (opcional)', 'cnpj', '') + campo('Telefone (opcional)', 'telefone', '') + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('estoque:cadastro:cancelar', 'Cancelar', false)
    + botaoFicha('estoque:fornecedor:confirmar', 'Cadastrar', true) + '</div>'
}

const FORMAS_CAIXA_FICHA = [['dinheiro', 'Dinheiro'], ['pix', 'Pix'], ['cartao', 'Cartão'], ['credito', 'Crédito'], ['debito', 'Débito']]
function seletorFormaCaixa(escolhida, rotulo) {
  return '<label style="display:block;margin-bottom:14px">'
    + '<span style="display:block;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;'
    + 'letter-spacing:.06em;margin-bottom:6px">' + esc(rotulo || 'Como pagou') + '</span>'
    + '<select data-campo="forma" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:10px;padding:0 10px;'
    + 'font-family:inherit;font-size:14px;font-weight:600;color:#111;background:#fff">'
    + '<option value=""' + (escolhida ? '' : ' selected') + '>— escolha —</option>'
    + FORMAS_CAIXA_FICHA.map(([v, r]) => '<option value="' + v + '"' + (v === escolhida ? ' selected' : '') + '>' + esc(r) + '</option>').join('')
    + '</select></label>'
}
const FORMA_ENTREGA_PARA_CAIXA = { cartao_entrega: 'cartao', cartão: 'cartao' }

/**
 * Concluir entrega / retirada entregue / confirmar recebimento. O que muda entre os
 * três é só o que se diz e se o valor recebido entra — o pedido e a forma são os mesmos.
 */
function fichaEntrega(entrega, modo) {
  const e = entrega || {}
  const formaAtual = FORMA_ENTREGA_PARA_CAIXA[e.forma] || e.forma || ''
  const confirmar = modo === 'confirmar'
  const retirada = modo === 'retirada'
  const titulo = confirmar
    ? 'O motoboy voltou com o dinheiro deste pedido. Confirme como recebeu — é o que entra no caixa.'
    : retirada ? 'O cliente buscou no balcão. Marcar entregue lança a venda no caixa com a forma confirmada.'
    : 'O pedido chegou. Marcar entregue lança a venda no caixa com a forma confirmada.'
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">' + titulo + '</div>'
    + '<div style="background:#f7f8fa;border-radius:12px;padding:12px 14px;margin-bottom:16px">'
    + '<div style="display:flex;justify-content:space-between;gap:10px"><span style="font-size:13px;font-weight:800;color:#111">Pedido #'
    + esc(e.pedido || '') + '</span><span style="font-size:13px;font-weight:800;color:#111">' + esc(brl(e.valor)) + '</span></div>'
    + '<div style="font-size:12.5px;color:#6b7280;font-weight:600;margin-top:3px">' + esc(e.cliente || '')
    + (e.entregador ? ' · ' + esc(e.entregador) : '')
    + (e.trocoPara ? ' · troco para ' + esc(brl(e.trocoPara)) : '') + '</div></div>'
    + seletorFormaCaixa(formaAtual, confirmar ? 'Como o motoboy recebeu' : 'Como o cliente pagou')
    + (confirmar ? '' : campo('Valor recebido (opcional)', 'valor', '', 'Em branco usa o total do pedido.'))
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('caixa:entrega:cancelar', 'Cancelar', false)
    + botaoFicha('caixa:entrega:confirmar:' + modo + ':' + (e.pedido || ''),
      confirmar ? 'Confirmar recebimento' : 'Marcar entregue', true)
    + '</div>'
}

/** Fechar a conta da mesa: uma forma só — dividir é pelo painel, e a ficha diz isso. */
function fichaFecharMesa(mesa) {
  const m = mesa || {}
  const consumo = Number(m.consumo) || 0
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">'
    + 'Fecha a mesa, lança a venda no caixa e libera a mesa. Para dividir entre duas formas, use o painel.</div>'
    + '<div style="background:#f7f8fa;border-radius:12px;padding:12px 14px;margin-bottom:16px">'
    + '<div style="display:flex;justify-content:space-between;gap:10px"><span style="font-size:13px;font-weight:800;color:#111">Mesa '
    + esc(m.mesa || '') + '</span><span style="font-size:13px;font-weight:800;color:#111">' + esc(brl(consumo)) + '</span></div>'
    + '<div style="font-size:12.5px;color:#6b7280;font-weight:600;margin-top:3px">'
    + esc([m.cliente, m.garcom ? 'garçom ' + m.garcom : '', m.pedidos ? m.pedidos + (m.pedidos === 1 ? ' lançamento' : ' lançamentos') : ''].filter(Boolean).join(' · ')) + '</div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + campo('Gorjeta', 'gorjeta', '0', 'Pode ser zero.')
    + campo('Valor pago', 'valor', consumo.toFixed(2).replace('.', ','), 'Tem de fechar com consumo + gorjeta.') + '</div>'
    + seletorFormaCaixa('', 'Como a mesa pagou')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('caixa:mesa:cancelar', 'Cancelar', false)
    + botaoFicha('caixa:mesa:confirmar:' + (m.mesa || ''), 'Fechar conta', true)
    + '</div>'
}

const FORMAS_CONTA = [
  ['', '— forma —'], ['dinheiro', 'Dinheiro'], ['pix', 'Pix'], ['debito', 'Débito'], ['credito', 'Crédito'],
  ['boleto', 'Boleto'], ['cheque', 'Cheque'], ['transferencia', 'Transferência'], ['debito_automatico', 'Débito automático'],
]
function seletorForma(escolhida) {
  return '<label style="display:block;margin-bottom:14px">'
    + '<span style="display:block;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;'
    + 'letter-spacing:.06em;margin-bottom:6px">Forma de pagamento</span>'
    + '<select data-campo="forma" style="width:100%;height:40px;border:1px solid #e5e7eb;border-radius:10px;padding:0 10px;'
    + 'font-family:inherit;font-size:14px;font-weight:600;color:#111;background:#fff">'
    + FORMAS_CONTA.map(([v, r]) => '<option value="' + v + '"' + (v === (escolhida || '') ? ' selected' : '') + '>' + esc(r) + '</option>').join('')
    + '</select></label>'
}

/** Baixa: pagar ou receber uma conta, inteira ou em parte. O saldo já vem preenchido. */
function fichaBaixa(conta, hojeBR) {
  const c = conta || {}
  const saldo = Math.max(0, (Number(c.valor) || 0) - (Number(c.valorPago) || 0))
  const receber = c.direcao === 'receber'
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + '<b style="color:#111">' + esc(c.descricao || '') + '</b>'
    + (c.contraparte ? ' · ' + esc(c.contraparte) : '') + '<br>'
    + 'Saldo: <b style="color:#111">' + esc(brl(saldo)) + '</b> de ' + esc(brl(c.valor))
    + ' · vence ' + esc(('' + (c.vencimento || '')).split('-').reverse().join('/')) + '</div>'
    + campo('Valor ' + (receber ? 'recebido' : 'pago'), 'valor', saldo.toFixed(2).replace('.', ','), 'Menos que o saldo é baixa parcial.')
    + campo('Data', 'data', hojeBR || '', 'dd/mm/aaaa — não pode ser futura.')
    + seletorForma(c.forma)
    + campo('Observação (opcional)', 'observacao', '')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('conta:baixa:cancelar', 'Cancelar', false)
    + botaoFicha('conta:baixa:confirmar:' + (c.id || ''), receber ? 'Registrar recebimento' : 'Registrar pagamento', true)
    + '</div>'
}

/** Conta nova, avulsa. */
/** Nova conta. O operador digita o VALOR DO LANÇAMENTO (o total da nota, que é o que
 *  ele tem na mão) e em quantas vezes — o sistema divide e sugere as datas de mês em
 *  mês. A grade aparece assim que o número de parcelas passa de 1. */
function fichaNovaConta(direcao, parcelas) {
  const receber = direcao === 'receber'
  const grade = (parcelas || []).length > 1
    ? '<div style="background:#f7f8fa;border-radius:10px;padding:12px 14px;margin-bottom:14px">'
      + '<div style="font-size:10.5px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.08em;'
      + 'margin-bottom:8px">As ' + parcelas.length + ' parcelas</div>'
      + parcelas.map((p) => '<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;'
        + 'font-size:12.5px;font-weight:600;color:#6b7280">'
        + '<span>' + p.numero + ' de ' + parcelas.length + ' · '
        + esc(('' + p.vencimento).split('-').reverse().join('/')) + '</span>'
        + '<span style="color:#111;font-weight:700">' + esc(brl(p.valor)) + '</span></div>').join('')
      + '<div style="display:flex;justify-content:space-between;gap:12px;padding-top:8px;margin-top:6px;'
      + 'border-top:1px solid #e5e7eb;font-size:12.5px;font-weight:800;color:#111">'
      + '<span>Soma</span><span>' + esc(brl(parcelas.reduce((t, p) => t + p.valor, 0))) + '</span></div>'
      + '<div style="font-size:11px;color:#9ca3af;font-weight:600;margin-top:6px;line-height:1.45">'
      + 'Datas de mês em mês; fim de semana anda para o próximo dia útil. Ajustar data combinada '
      + 'com o fornecedor ainda é pelo painel.</div></div>'
    : ''
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + (receber ? 'Uma entrada que alguém deve à loja.' : 'Uma obrigação da loja, com vencimento.')
    + ' Conta fixa mensal ainda é pelo painel.</div>'
    + campo('Descrição', 'descricao', '', receber ? 'Ex.: Repasse iFood setembro' : 'Ex.: Aluguel de outubro')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + campo('Valor do lançamento', 'valor', '', 'o total da nota') + campo('Vencimento', 'vencimento', '', 'dd/mm/aaaa') + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + campo('Documento / NF (opcional)', 'documento', '', 'o número da nota do fornecedor')
    + campo('Parcelas', 'parcelas', '1', 'em quantas vezes') + '</div>'
    + grade
    + seletorForma('')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + campo(receber ? 'Quem paga (opcional)' : 'Fornecedor (opcional)', 'contraparte', '')
    + campo('Categoria (opcional)', 'categoria', '') + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('conta:nova:cancelar', 'Cancelar', false)
    + botaoFicha('conta:nova:parcelar:' + direcao, 'Ver parcelas', false)
    + botaoFicha('conta:nova:confirmar:' + direcao, 'Lançar conta', true)
    + '</div>'
}

/** Recebi: dá entrada no estoque. Quantidade sugerida (2× o mínimo − saldo) e custo à vista. */
function fichaRecebimento(item) {
  const i = item || {}
  const sugestao = Math.max(0, (Number(i.minimo) || 0) * 2 - (Number(i.saldo) || 0))
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'Saldo hoje: <b style="color:#111">' + esc((Number(i.saldo) || 0) + ' ' + (i.unidade || 'un')) + '</b> · mínimo '
    + esc(String(Number(i.minimo) || 0)) + '. O que entrar aqui soma no estoque e mexe no custo médio.</div>'
    + campo('Quantidade recebida (' + (i.unidade || 'un') + ')', 'qtd', String(sugestao || ''), 'Sugerido: repõe até 2× o mínimo.')
    + campo('Custo unitário (opcional)', 'custo', i.custo != null ? String(i.custo).replace('.', ',') : '', 'Em branco mantém o custo médio de hoje.')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('compras:recebi:cancelar', 'Cancelar', false)
    + botaoFicha('compras:recebi:confirmar:' + (i.nome || ''), 'Dar entrada', true)
    + '</div>'
}

/** Editar o preço de um produto: um campo, o preço atual à vista.
 *
 *  ⛔ O preço mora em DOIS lugares: `produtos.preco` e, quando o mesmo item é vendido
 *  como OPÇÃO dentro de outro produto (meia pizza, sabor de combo), `preco_adicional`
 *  da opção — e é esse segundo que o cliente paga ali. Mudar só o primeiro deixa o
 *  cliente pagando o valor velho. Por isso, quando o item é opção em algum lugar, a
 *  caixa pergunta antes de salvar. As opções que cobram OUTRO preço (a bebida inclusa
 *  a R$ 0, por exemplo) ficam de fora — e a tela diz quantas são. */
function fichaPreco(item, opcoes) {
  const p = item || {}
  const o = opcoes || null
  const deFora = o && o.lugares > o.comPrecoAntigo ? o.lugares - o.comPrecoAntigo : 0
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'Preço atual: <b style="color:#111">' + esc(brl(p.preco)) + '</b>. Vale a partir de agora, no cardápio e na venda manual.</div>'
    + campo('Novo preço', 'preco', '', 'Pode digitar 59,90 ou 59.90.')
    + (o && o.lugares
      ? '<label style="display:flex;gap:10px;align-items:flex-start;background:#fff9e8;border:1px solid #eed571;'
        + 'border-radius:10px;padding:11px 13px;margin-bottom:14px;cursor:pointer">'
        + '<input type="checkbox" data-campo="opcoes" ' + (o.comPrecoAntigo ? 'checked' : '')
        + (o.comPrecoAntigo ? '' : ' disabled') + ' style="margin-top:2px">'
        + '<span style="font-size:12.5px;color:#8a6508;font-weight:600;line-height:1.45">'
        + 'Este item também é vendido como <b>opção em ' + o.lugares
        + (o.lugares === 1 ? ' lugar' : ' lugares') + '</b>'
        + (o.comPrecoAntigo
          ? ', e em ' + o.comPrecoAntigo + (o.comPrecoAntigo === 1 ? ' dele' : ' deles')
            + ' pelo preço de agora (' + esc(brl(p.preco)) + '). Atualizar também?'
          : ', mas nenhum cobra o preço de agora — nada a atualizar lá.')
        + (deFora
          ? '<br><span style="font-size:11.5px;color:#9ca3af">' + deFora
            + (deFora === 1 ? ' opção fica' : ' opções ficam') + ' de fora: cobra' + (deFora === 1 ? '' : 'm')
            + ' outro valor (ex.: item incluso a R$ 0).</span>'
          : '')
        + '</span></label>'
      : '')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('cardapio:preco:cancelar', 'Cancelar', false)
    + botaoFicha('cardapio:preco:confirmar:' + (p.nome || ''), 'Salvar preço', true)
    + '</div>'
}

/** Editar quem tem acesso: nome sempre; função só para quem entra por CPF.
 *
 *  ⛔ Virar Administrador ou Contador mudaria a forma de ENTRAR (e-mail e senha no lugar
 *  do CPF) — não é troca de rótulo. A caixa explica isso em vez de oferecer um botão que
 *  quebraria o login de alguém. */
function fichaUsuario(u) {
  const user = u || {}
  const FUNCOES = require('../../src-electron/usuarios-acoes').FUNCOES_CPF
  const podeTrocar = user.tipo === 'colaborador'
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'Entra por <b style="color:#111">' + esc(user.email ? 'e-mail' : 'CPF ' + (user.cpf || '')) + '</b>. '
    + 'Senha e acessos por módulo continuam no painel.</div>'
    + campo('Nome', 'nome', user.nome || '')
    + (podeTrocar
      ? '<label style="display:block;margin-bottom:14px">'
        + '<span style="display:block;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;'
        + 'letter-spacing:.06em;margin-bottom:6px">Função</span>'
        + '<select data-campo-usuario="funcao" style="width:100%;height:40px;border:1px solid #e5e7eb;'
        + 'border-radius:10px;padding:0 10px;font-family:inherit;font-size:14px;font-weight:600;color:#111;'
        + 'background:#fff;box-sizing:border-box">'
        + FUNCOES.map((f) => '<option value="' + esc(f.chave) + '"' + (f.chave === user.papel ? ' selected' : '')
          + '>' + esc(f.rotulo) + '</option>').join('')
        + '</select></label>'
      : '<div style="background:#f7f8fa;border-radius:10px;padding:11px 13px;margin-bottom:14px;font-size:12.5px;'
        + 'color:#6b7280;font-weight:600;line-height:1.45">Função: <b style="color:#111">' + esc(user.funcao || '—')
        + '</b>. Trocar a função de quem entra por e-mail mudaria a forma de entrar no sistema — isso é pelo painel.</div>')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('usuario:cancelar', 'Cancelar', false)
    + botaoFicha('usuario:salvar', 'Salvar', true)
    + '</div>'
}

/** Abertura: o fundo de troco é o único campo, e zero é resposta válida. */
function fichaAbertura() {
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:18px;line-height:1.5">'
    + 'Quanto vai na gaveta para começar o turno. Pode ser zero — o caixa abre do mesmo jeito.</div>'
    + campo('Fundo de troco', 'fundo', '0', 'Pode digitar 100 ou 100,00.')
    + campo('Observação (opcional)', 'observacao', '')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('caixa:mov:cancelar', 'Cancelar', false)
    + botaoFicha('caixa:abrir:confirmar', 'Abrir caixa', true)
    + '</div>'
}

/** Fechamento: os três contados são obrigatórios — é o que o painel exige.
 *
 *  ⛔ O Pix do SITE fica fora da conferência (regra do dono no painel, 09/09/2026 —
 *  PainelCaixa.tsx `pixEsperado = resumo.vendaPixConferir`). Pedir o Pix total faz o
 *  operador contar só o que passou pela mão dele e o sistema acusar uma falta que não
 *  existe: no turno em que isso apareceu, R$ 1.122 de falta falsa. */
function fichaFechamento(caixa) {
  const r = (caixa && caixa.resumo) || {}
  const pixOnline = Number(r.vendaPixOnline) || 0
  const pixConferir = r.vendaPixConferir != null ? r.vendaPixConferir : (Number(r.vendaPix) || 0) - pixOnline
  const esperado = (rotulo, v) => '<div style="display:flex;justify-content:space-between;gap:12px;padding:5px 0">'
    + '<span style="font-size:12.5px;color:#6b7280;font-weight:600">' + esc(rotulo) + '</span>'
    + '<span style="font-size:12.5px;color:#111;font-weight:700">' + brl(v) + '</span></div>'
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:16px;line-height:1.5">'
    + 'Conte o que está na gaveta e na maquininha. A diferença contra o esperado aparece na conferência do painel.</div>'
    + '<div style="background:#f7f8fa;border-radius:12px;padding:12px 14px;margin-bottom:18px">'
    + '<div style="font-size:10.5px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.08em;'
    + 'margin-bottom:6px">Esperado pelo sistema</div>'
    + esperado('Dinheiro', caixa && caixa.esperadoDinheiro)
    + esperado(pixOnline > 0 ? 'Pix manual' : 'Pix', pixConferir)
    + esperado('Cartão', r.vendaCartao) + '</div>'
    + (pixOnline > 0
      ? '<div style="display:flex;align-items:center;gap:8px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;'
        + 'padding:10px 12px;margin-bottom:16px;font-size:12px;font-weight:600;color:#3730a3;line-height:1.45">'
        + '<span>Mais <strong>' + brl(pixOnline) + '</strong> em Pix do site já confirmado pelo banco — '
        + 'não entra na conferência.</span></div>'
      : '')
    + campo('Dinheiro contado', 'dinheiro', '')
    + campo(pixOnline > 0 ? 'Pix manual conferido' : 'Pix conferido', 'pix', '',
      pixOnline > 0 ? 'Só o Pix recebido por gente na entrega ou no balcão — o do site não entra aqui.' : '')
    + campo('Cartão conferido', 'cartao', '')
    + campo('Observação (opcional)', 'observacao', '')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('caixa:mov:cancelar', 'Cancelar', false)
    + botaoFicha('caixa:fechar:confirmar', 'Fechar caixa', true)
    + '</div>'
}

const ETAPAS = { aguardando: 'Em análise', producao: 'Em produção', pronto: 'Pronto', transito: 'Em trânsito', entregue: 'Entregue' }

function fichaPedido(p) {
  if (!p) return naoAchou('Pedido')
  const itens = (p.itens || []).map((i) =>
    '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #f4f5f7">'
    + '<span style="font-size:13px;color:#111;font-weight:600">' + esc(i) + '</span></div>').join('')
  const subtotal = Number(p.valor || 0) - Number(p.taxa || 0) + Number(p.desconto || 0)
  const conta = linha('Subtotal', brl(subtotal))
    + (p.taxa ? linha('Entrega', brl(p.taxa)) : '')
    + (p.desconto ? linha('Desconto', '- ' + brl(p.desconto)) : '')
    + linha('Total', brl(p.valor), true)

  return bloco('Situação',
      linha('Pedido', '#' + (p.numero || '—'), true)
      + linha('Etapa', ETAPAS[p.etapa] || '—')
      + linha('Entrou às', p.hora || '—')
      + linha('Esperando há', (p.entrouHaMin != null ? p.entrouHaMin + ' min' : '—'))
      + linha('Canal', p.canal || '—'))
    + bloco('Cliente',
      linha('Nome', p.cliente || '—')
      + (p.telefone ? linha('Telefone', p.telefone) : '')
      + (p.endereco ? linha('Endereço', p.endereco) : ''))
    + bloco('Itens', itens || '<div class="evazio">Sem itens.</div>')
    + bloco('Conta', conta + linha('Pagamento', p.pagamento || '—'))
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px">'
    + botao('ficha:imprimir:' + p.numero, '🖨 Imprimir comanda', true)
    + botao('ficha:whatsapp:' + p.numero, '💬 Falar com o cliente')
    + '</div>'
}

function fichaCliente(c) {
  if (!c) return naoAchou('Cliente')
  const ultimos = (c.ultimos || []).map((p) =>
    '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #f4f5f7">'
    + '<span style="font-size:13px;color:#111;font-weight:700">#' + esc(p.numero) + '</span>'
    + '<span style="font-size:12.5px;color:#6b7280;font-weight:600">' + esc(p.data) + '</span>'
    + '<span style="font-size:13px;color:#111;font-weight:800">' + brl(p.valor) + '</span></div>').join('')
  return bloco('Contato',
      linha('Nome', c.nome || '—') + linha('Telefone', c.telefone || '—') + linha('Bairro', c.bairro || '—'))
    + bloco('Resumo',
      linha('Pedidos', String(c.pedidos || 0))
      + linha('Último pedido', c.ultimo || '—')
      + linha('Total gasto', brl(c.total), true))
    + bloco('Últimos pedidos', ultimos || '<div class="evazio">Sem pedidos ainda.</div>')
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px">'
    + botao('ficha:whatsapp-cliente:' + (c.telefone || ''), '💬 Falar no WhatsApp', true)
    + botao('ficha:novo-pedido:' + (c.telefone || ''), '+ Novo pedido')
    + '</div>'
}

function fichaProduto(p) {
  if (!p) return naoAchou('Produto')
  const margem = p.custo && p.preco ? Math.round(((p.preco - p.custo) / p.preco) * 100) : null
  const insumos = (p.insumos || []).map((i) =>
    '<div style="padding:6px 0;border-bottom:1px solid #f4f5f7;font-size:13px;color:#111;font-weight:600">' + esc(i) + '</div>').join('')
  return bloco('Produto',
      linha('Nome', p.nome || '—') + linha('Categoria', p.categoria || '—') + linha('Situação', p.situacao || '—'))
    + bloco('Preço e custo',
      linha('Preço de venda', brl(p.preco), true)
      + (p.custo ? linha('Custo (ficha técnica)', brl(p.custo)) : '')
      + (margem != null ? linha('Margem', margem + '%') : ''))
    + bloco('Saída', linha('Vendas nos últimos 7 dias', String(p.vendas7d != null ? p.vendas7d : '—')))
    + (insumos ? bloco('Ficha técnica', insumos) : '')
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px">'
    + botao('ficha:esgotar:' + (p.nome || ''), p.situacao === 'Esgotado' ? '✓ Voltar a vender' : '⛔ Marcar esgotado')
    + '</div>'
}

/**
 * Acesso pela TV (KDS) — o painel gera um código de 6 dígitos que pareia a TV da cozinha
 * com a fila SEM login. O código em claro só aparece na hora de gerar (depois só o hash
 * fica guardado), então gerar é ação de escrita: aqui a ficha explica e manda ao painel.
 */
function fichaAcessoTv(estado) {
  estado = estado || {}
  const link = (estado.dominioCardapio || '') + '/kds'
  return '<p style="font-size:12.5px;color:#6b7280;font-weight:500;line-height:1.6;margin:0 0 18px">'
    + 'Deixe a fila de produção ligada sozinha numa TV ou tablet da cozinha, sem precisar logar. '
    + 'Abra <strong style="color:#111">' + esc(link) + '</strong> na tela e digite o código de 6 dígitos.</p>'
    + bloco('Como está agora',
      linha('Código de pareamento', estado.definido ? 'já existe' : 'ainda não gerado', true)
      + linha('Telas conectadas', String(estado.dispositivos != null ? estado.dispositivos : '—')))
    + bloco('Atenção',
      '<div style="font-size:12.5px;font-weight:700;color:#8a6508;background:#fff9e8;border-radius:8px;padding:10px 12px;line-height:1.5">'
      + 'O código aparece uma única vez, no momento em que é gerado. Se ele se perder, o jeito é gerar outro.</div>')
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px">'
    + botao('kds:gerar-codigo', 'Gerar código novo', true)
    + botao('kds:revogar-telas', 'Desconectar todas as telas')
    + '</div>'
}

// ── F3.4: a conferência do fechamento feito sem internet ─────────────────────
function horaDe(iso) {
  const d = new Date(iso)
  if (!isFinite(d.getTime())) return '—'
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
const NOME_TIPO = { venda: 'Venda', sangria: 'Sangria', suprimento: 'Suprimento', ajuste: 'Ajuste' }
const NOME_FORMA = { dinheiro: 'dinheiro', pix: 'Pix', cartao: 'cartão', credito: 'crédito', debito: 'débito', a_receber: 'crédito func' }

/**
 * O servidor achou movimentação que o app não viu enquanto estava sem internet (pedido
 * do site, venda pelo app do garçom). A ficha mostra O QUE ficou de fora, o esperado
 * novo e deixa o lojista confirmar a contagem — ou deixar para depois. Nunca fecha
 * calado com número errado.
 */
function fichaConferencia(conf) {
  const c = conf || {}
  const lista = c.naoVistas || []
  const e = c.esperado || {}
  const ct = c.contados || {}
  const linhas = lista.map((m) =>
    '<div style="display:grid;grid-template-columns:52px 90px 1fr 100px;gap:8px;padding:8px 0;border-bottom:1px solid #f4f5f7;font-size:12.5px;align-items:center">'
    + '<span style="color:#9ca3af;font-weight:600">' + esc(horaDe(m.criado_em)) + '</span>'
    + '<span style="font-weight:700;color:' + (m.tipo === 'sangria' ? '#b42318' : '#111') + '">' + esc(NOME_TIPO[m.tipo] || m.tipo || '') + '</span>'
    + '<span style="color:#4b5563;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.descricao || '')
    + (m.forma ? ' <span style="color:#9ca3af">· ' + esc(NOME_FORMA[m.forma] || m.forma) + '</span>' : '') + '</span>'
    + '<span style="text-align:right;font-weight:800;color:#111">' + brl(m.valor) + '</span></div>').join('')
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">'
    + 'Enquanto o app estava sem internet, o painel recebeu <b style="color:#111">' + lista.length + ' movimentaç' + (lista.length === 1 ? 'ão' : 'ões')
    + '</b> que o app não viu. O turno só fecha de vez depois que você conferir.</div>'
    + '<div style="border:1px solid #e5e7eb;border-radius:12px;padding:4px 14px;margin-bottom:16px">' + (linhas || '<div class="evazio">Nada a mostrar.</div>') + '</div>'
    + '<div style="background:#f7f8fa;border-radius:12px;padding:12px 14px;margin-bottom:16px">'
    + '<div style="font-size:10.5px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Esperado agora, com o que o app não viu</div>'
    + linha('Dinheiro', brl(e.dinheiro)) + linha('Pix', brl(e.pix)) + linha('Cartão', brl(e.cartao)) + '</div>'
    + campo('Dinheiro contado', 'dinheiro', ct.dinheiro != null ? String(ct.dinheiro) : '', 'O que você contou na gaveta na hora do fechamento. Corrija se for o caso.')
    + campo('Pix conferido', 'pix', ct.pix != null ? String(ct.pix) : '')
    + campo('Cartão conferido', 'cartao', ct.cartao != null ? String(ct.cartao) : '')
    + campo('Observação (opcional)', 'observacao', '')
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">'
    + botaoFicha('caixa:conferencia:depois', 'Deixar para depois', false)
    + botaoFicha('caixa:conferencia:confirmar', 'Confirmar e fechar de vez', true)
    + '</div>'
}

/** O que espera para subir — e o que travou, com o erro do painel e a saída. */
function fichaFila(estado) {
  const e = estado || {}
  const itens = e.itens || []
  const linhas = itens.map((i) => {
    const rotulo = i.tipo === 'venda' ? 'Venda ' + (i.provisorio || '') : i.tipo === 'movimentacao' ? 'Caixa' : 'Fechamento'
    return '<div style="padding:9px 0;border-bottom:1px solid #f4f5f7">'
      + '<div style="display:grid;grid-template-columns:52px 1fr 100px;gap:8px;align-items:center;font-size:12.5px">'
      + '<span style="color:#9ca3af;font-weight:600">' + esc(horaDe(i.criadoEm)) + '</span>'
      + '<span style="font-weight:700;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(rotulo) + ' — ' + esc(i.cliente || '') + '</span>'
      + '<span style="text-align:right;font-weight:800;color:#111">' + brl(i.valor) + '</span></div>'
      + (i.erro
        ? '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;font-weight:700;color:#b42318">'
          + '<span style="flex:1">✖ ' + esc(i.erro) + '</span>'
          + '<button type="button" data-acao="fila:remover:' + esc(i.id) + '" style="height:28px;padding:0 10px;border:1px solid #f3c0bb;border-radius:8px;'
          + 'background:#fff;color:#b42318;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer">Desistir</button></div>'
        : '<div style="margin-top:4px;font-size:11.5px;font-weight:600;color:#8a6508">⏳ esperando para subir</div>')
      + '</div>'
  }).join('')
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">'
    + (e.pendentes ? '<b style="color:#111">' + e.pendentes + '</b> esperando para subir' : 'Nada esperando')
    + (e.comErro ? ' · <b style="color:#b42318">' + e.comErro + '</b> com erro' : '')
    + '. Nada aqui foi apagado: o que não subir dá para exportar e lançar pelo painel.</div>'
    + '<div style="border:1px solid #e5e7eb;border-radius:12px;padding:4px 14px;margin-bottom:16px">' + (linhas || '<div class="evazio">A fila está vazia.</div>') + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">'
    + botaoFicha('fila:exportar', 'Exportar pendentes', false)
    + botaoFicha('fila:tentar', 'Tentar subir agora', true)
    + '</div>'
}


// ── CONFIGURAÇÕES: as fichas de edição (os formulários do painel, no app) ──────
// Cada uma vem preenchida com o `bruto` do adaptador e manda pelos botões
// `config:*:confirmar`. Campo em branco NÃO altera nada (o PATCH do painel é parcial).
const C = require('../../src-electron/config-acoes')
const numBR = (v) => (v == null || v === '' ? '' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2, useGrouping: false }))
const rodapeFicha = (cancelar, confirmar, rotulo, extra) =>
  '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap">' + (extra || '')
  + botaoFicha(cancelar, 'Cancelar', false) + botaoFicha(confirmar, rotulo, true) + '</div>'
const AVISO_BRANCO = 'Campo em branco não altera o que está gravado — preencha só o que quer mudar.'

function fichaLoja(loja) {
  const l = loja || {}
  const e = l.endereco || {}
  const t = l.tempos || {}
  const mods = l.modalidades || []
  return avisoFicha(AVISO_BRANCO)
    + colunas([campo('Nome da loja', 'nome', l.nome), campo('Telefone / WhatsApp', 'telefone', l.telefone)])
    + tituloSecao('Endereço')
    + colunas([campo('Rua / avenida', 'rua', e.rua), campo('Número', 'numero', e.numero), campo('Complemento', 'complemento', e.complemento)], 3)
    + colunas([campo('Bairro', 'bairro', e.bairro), campo('Cidade', 'cidade', e.cidade), campo('UF', 'uf', e.uf), campo('CEP', 'cep', e.cep)], 4)
    + campo('Link do Google Maps', 'mapsUrl', l.mapsUrl, 'começa com https://')
    + tituloSecao('Como o cliente pode receber o pedido')
    + colunas([
      campoMarcar('Entrega', 'mod:entrega', mods.indexOf('entrega') >= 0),
      campoMarcar('Retirada na loja', 'mod:retirada', mods.indexOf('retirada') >= 0),
      campoMarcar('Consumir no local', 'mod:consumo_local', mods.indexOf('consumo_local') >= 0)], 3)
    + tituloSecao('Tempos estimados (minutos)')
    + colunas([campo('Retirada', 'balcao', t.balcao || ''), campo('Delivery', 'delivery', t.delivery || ''), campo('Consumo local', 'local', t.local || '')], 3)
    + tituloSecao('Pix, numeração e horário')
    + campo('Chave Pix', 'pixChave', l.pixChave, 'a chave que aparece para o cliente pagar')
    + colunas([
      campoSelecao('Numeração dos pedidos', 'numeracaoDiaria', [{ v: 'true', r: 'Reinicia todo dia (#1, #2, #3…)' }, { v: 'false', r: 'Sequencial, sem reiniciar' }], l.numeracaoDiaria ? 'true' : 'false'),
      campoSelecao('Abrir e fechar', 'modoHorario', [{ v: 'manual', r: 'Manual (eu abro e fecho)' }, { v: 'automatico', r: 'Automático (pelos horários)' }], l.modoHorario || 'manual')])
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-bottom:10px">Logo, capa e dados fiscais continuam pelo painel.</div>'
    + rodapeFicha('config:cancelar', 'config:loja:confirmar', 'Salvar dados da loja')
}

function fichaHorarios(horarios, timezone, modoHorario) {
  const h = horarios || {}
  const linhas = C.DIAS.map(([chave, nome]) => {
    const d = h[chave] || {}
    return '<div style="display:grid;grid-template-columns:90px 1fr 1fr;gap:10px;align-items:center;margin-bottom:8px">'
      + '<span style="font-size:13px;font-weight:800;color:#111;text-transform:capitalize">' + esc(nome) + '</span>'
      + '<input data-campo="abre:' + chave + '" value="' + esc(d.abre || '') + '" placeholder="fechado" autocomplete="off" style="' + ESTILO_CAMPO + '">'
      + '<input data-campo="fecha:' + chave + '" value="' + esc(d.fecha || '') + '" placeholder="fechado" autocomplete="off" style="' + ESTILO_CAMPO + '">'
      + '</div>'
  }).join('')
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">Hora no formato HH:MM. '
    + 'Deixe os dois em branco para o dia ficar fechado. Passar da meia-noite é normal (ex.: 18:00 às 00:30).</div>'
    + '<div style="display:grid;grid-template-columns:90px 1fr 1fr;gap:10px;margin-bottom:6px;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em"><span></span><span>Abre</span><span>Fecha</span></div>'
    + linhas
    + colunas([
      campo('Fuso da loja', 'timezone', timezone || '', 'ex.: America/Bahia'),
      campoSelecao('Abrir e fechar', 'modoHorario', [{ v: 'manual', r: 'Manual (eu abro e fecho)' }, { v: 'automatico', r: 'Automático (pelos horários)' }], modoHorario || 'manual')])
    + rodapeFicha('config:cancelar', 'config:horarios:confirmar', 'Salvar horários')
}

function fichaBairros(bairros) {
  const b = bairros || {}
  const lista = (b.bairros || []).map((nome) => ({ nome, ...(b.taxas && b.taxas[nome] ? b.taxas[nome] : { taxa: '', ativo: true }) }))
  for (let i = 0; i < 3; i++) lista.push({ nome: '', taxa: '', ativo: true, nova: true })
  const linhas = lista.map((x, i) =>
    '<div style="display:grid;grid-template-columns:1fr 120px 90px;gap:10px;align-items:center;margin-bottom:8px">'
    + '<input data-campo="bairro-nome:' + i + '" value="' + esc(x.nome) + '" placeholder="' + (x.nova ? 'novo bairro' : '') + '" autocomplete="off" style="' + ESTILO_CAMPO + '">'
    + '<input data-campo="bairro-taxa:' + i + '" value="' + esc(numBR(x.taxa)) + '" placeholder="taxa" autocomplete="off" style="' + ESTILO_CAMPO + '">'
    + '<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#111;cursor:pointer">'
    + '<input type="checkbox" data-campo="bairro-ativo:' + i + '"' + (x.ativo !== false ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:var(--acento)">cobra</label>'
    + '</div>').join('')
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">Os bairros que a loja entrega e a taxa de cada um. '
    + 'Para remover um bairro, apague o nome. "Cobra" desligado = entrega sem taxa naquele bairro.</div>'
    + '<div style="display:grid;grid-template-columns:1fr 120px 90px;gap:10px;margin-bottom:6px;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em"><span>Bairro</span><span>Taxa (R$)</span><span></span></div>'
    + linhas
    + campo('Entrega grátis acima de (R$)', 'entregaGratisAcima', numBR(b.entregaGratisAcima), 'em branco = não usa')
    + rodapeFicha('config:cancelar', 'config:bairros:confirmar', 'Salvar bairros')
}

const TIPOS_FORMA_ROTULO = [['delivery', 'Delivery'], ['retirada', 'Retirada'], ['balcao', 'Balcão'], ['consumo_local', 'Consumo local']]
function fichaForma(forma, contas) {
  const f = forma || null
  const tipos = f ? (f.tipos || []) : ['delivery', 'retirada', 'balcao', 'consumo_local']
  const opcoesConta = [{ v: '', r: '— sem conta de destino —' }].concat((contas || []).map((c) => ({ v: c.id, r: c.nome })))
  const cabecalho = f
    ? '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:12px">' + esc(C.NOME_METODO[f.metodo] || f.metodo) + '</div>'
      + campoMarcar('Ligada no cardápio', 'habilitado', f.habilitado !== false, 'desligada não some da lista: aparece como desligada')
    : campo('Nome da forma', 'metodo', '', 'ex.: Vale-refeição, Cheque')
  return cabecalho
    + tituloSecao('Onde vale')
    + colunas(TIPOS_FORMA_ROTULO.map(([v, r]) => campoMarcar(r, 'tipo:' + v, tipos.indexOf(v) >= 0)), 4)
    + tituloSecao('Cobrança e recebimento')
    + colunas([campo('Taxa extra cobrada do cliente', 'taxaExtra', f ? numBR(f.taxa_extra) : ''),
      campoSelecao('Tipo da taxa extra', 'taxaExtraTipo', [{ v: 'percentual', r: '% do pedido' }, { v: 'fixo', r: 'valor fixo' }], f ? (f.taxa_extra_tipo || 'percentual') : 'percentual')])
    + colunas([campoMarcar('Recebimento imediato', 'recebimentoImediato', f ? f.recebimento_imediato !== false : true, 'o dinheiro entra na hora'),
      campoMarcar('Gera conta a receber', 'geraReceber', f ? !!f.gera_receber : false, 'a operadora deposita depois')])
    + colunas([campo('Parcelas', 'parcelas', f && f.parcelas != null ? String(f.parcelas) : ''),
      campo('Dias para receber', 'diasRecebimento', f && f.dias_recebimento != null ? String(f.dias_recebimento) : ''),
      campoSelecao('Contagem', 'tipoVencimento', [{ v: 'dias_uteis', r: 'dias úteis' }, { v: 'dias_corridos', r: 'dias corridos' }], f ? (f.tipo_vencimento || 'dias_uteis') : 'dias_uteis')], 3)
    + campoSelecao('Conta de destino', 'contaFinanceiraId', opcoesConta, f ? (f.conta_financeira_id || '') : '')
    + colunas([campo('Taxa da operadora (%)', 'taxaOperadoraPct', f ? numBR(f.taxa_operadora_pct) : ''),
      campo('Taxa fixa da operadora (R$)', 'taxaOperadoraFixa', f ? numBR(f.taxa_operadora_fixa) : '')])
    + colunas([campo('Bandeiras (opcional)', 'bandeiras', f ? (f.bandeiras || '') : ''), campo('Observação (opcional)', 'observacao', f ? (f.observacao || '') : '')])
    + rodapeFicha('config:cancelar', f ? 'config:forma:confirmar:' + f.id : 'config:forma-nova:confirmar', f ? 'Salvar forma' : 'Criar forma')
}

function fichaContaFinanceira(conta) {
  const c = conta || null
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">Onde o dinheiro cai (banco, carteira, gateway) ou de onde sai (cartão de crédito da loja).</div>'
    + campo('Nome', 'nome', c ? c.nome : '', 'ex.: Banco do Brasil — corrente')
    + campoSelecao('Tipo', 'tipo', C.TIPOS_CONTA.map(([v, r]) => ({ v, r })), c ? c.tipo : 'banco')
    + colunas([campo('Dia de fechamento (cartão)', 'diaFechamento', c && c.diaFechamento != null ? String(c.diaFechamento) : ''),
      campo('Dia de vencimento (cartão)', 'diaVencimento', c && c.diaVencimento != null ? String(c.diaVencimento) : '')])
    + (c ? campoMarcar('Ativa', 'ativo', c.ativo !== false, 'desativada some das escolhas, mas o histórico fica') : '')
    + rodapeFicha('config:cancelar', 'config:conta:confirmar:' + (c ? c.id : 'nova'), c ? 'Salvar conta' : 'Criar conta',
      c ? botaoFicha('config:conta:excluir:' + c.id, 'Excluir', false) : '')
}

function fichaMesasCriar(proximoNumero) {
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">Cria várias de uma vez, numeradas em sequência. O QR de cada mesa é impresso pelo painel.</div>'
    + colunas([campoSelecao('Tipo', 'tipo', [{ v: 'mesa', r: 'Mesa' }, { v: 'comanda', r: 'Comanda' }], 'mesa'), campo('Quantas', 'quantidade', '1')])
    + colunas([campo('Primeiro número', 'numeroInicio', String(proximoNumero || 1)), campo('Lugares por mesa', 'capacidade', '4')])
    + rodapeFicha('config:cancelar', 'config:mesas-criar:confirmar', 'Criar')
}

function fichaMesa(mesa) {
  const m = mesa || {}
  return colunas([campo('Número / nome', 'numero', m.numero), campo('Lugares', 'capacidade', m.capacidade != null ? String(m.capacidade) : '')])
    + campoMarcar('Reservada', 'reservada', !!m.reservada, 'fica marcada no salão como reservada')
    + rodapeFicha('config:cancelar', 'config:mesa:confirmar:' + m.id, 'Salvar mesa', botaoFicha('config:mesa:excluir:' + m.id, 'Excluir', false))
}

function fichaColaboradorNovo() {
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">Quem entra por <b style="color:#111">CPF e senha</b> no painel e nos apps (caixa, garçom, cozinha, entregador). '
    + 'Administrador e Contador entram por e-mail e são cadastrados pelo painel.</div>'
    + campo('Nome', 'nome', '')
    + colunas([campo('CPF', 'cpf', '', 'só os 11 números'), campo('Senha', 'senha', '', 'pelo menos 6 caracteres')])
    + campoSelecao('Função', 'funcao', C.PAPEIS_COLABORADOR, 'garcom')
    + campoMarcar('Pode unir mesas', 'podeUnirMesas', false, 'no app do garçom')
    + rodapeFicha('config:cancelar', 'config:colaborador:confirmar', 'Cadastrar')
}

const MOSTRAR_ROTULO = {
  mostrar_logo: 'Logo', mostrar_nome_loja: 'Nome da loja', mostrar_telefone_loja: 'Telefone da loja', mostrar_endereco_loja: 'Endereço da loja',
  mostrar_nome_cliente: 'Nome do cliente', mostrar_telefone_cliente: 'Telefone do cliente', mostrar_endereco_cliente: 'Endereço do cliente',
  mostrar_pagamento: 'Pagamento', mostrar_observacoes: 'Observações', mostrar_itens: 'Itens', mostrar_subtotal: 'Subtotal',
  mostrar_taxa: 'Taxa de entrega', mostrar_desconto: 'Desconto', mostrar_cupom: 'Cupom',
}
function fichaComanda(cfg) {
  if (!cfg || !cfg.modelo) {
    return avisoFicha('Sem a configuração atual da comanda: o painel grava o modelo inteiro, então esta ficha só abre com internet. Tente de novo conectado.', 'erro')
      + '<div style="display:flex;justify-content:flex-end">' + botaoFicha('config:cancelar', 'Fechar', false) + '</div>'
  }
  const sel = (lista) => lista.map(([v, r]) => ({ v, r }))
  return tituloSecao('Modelo e fonte')
    + colunas([campoSelecao('Modelo', 'modelo', sel(C.MODELOS_COMANDA), cfg.modelo), campoSelecao('Fonte', 'fonte_familia', sel(C.FONTES_COMANDA), cfg.fonte_familia)])
    + colunas([campo('Tamanho da fonte (%)', 'fonte_escala', String(cfg.fonte_escala || 100), '80 a 140'),
      campoSelecao('Peso', 'fonte_peso', sel(C.PESOS_COMANDA), cfg.fonte_peso),
      campo('Espaçamento', 'espacamento_linhas', numBR(cfg.espacamento_linhas), '1,0 a 1,8')], 3)
    + tituloSecao('O que aparece na comanda')
    + colunas(C.MOSTRAR_COMANDA.map((k) => campoMarcar(MOSTRAR_ROTULO[k] || k, k, cfg[k] !== false)), 3)
    + colunas([campoMarcar('Adicional em destaque', 'adicional_destaque', !!cfg.adicional_destaque, 'negrito e sublinhado no nome'),
      campoMarcar('Divulgar o cardápio próprio', 'promo_cardapio_proprio', !!cfg.promo_cardapio_proprio)])
    + colunas([campo('Texto do rodapé', 'texto_rodape', cfg.texto_rodape || ''), campo('Mensagem final', 'mensagem_final', cfg.mensagem_final || '')])
    + tituloSecao('Via extra (agradecimento, promoção)')
    + colunas([campoMarcar('Imprimir via extra', 'extra_ativa', !!cfg.extra_ativa), campoMarcar('Automática a cada pedido', 'extra_imprimir_auto', !!cfg.extra_imprimir_auto), campo('Cópias', 'extra_copias', String(cfg.extra_copias || 1))], 3)
    + colunas([campo('Título', 'extra_titulo', cfg.extra_titulo || ''), campoSelecao('QR na via', 'extra_qr_tipo', sel(C.QR_COMANDA), cfg.extra_qr_tipo || 'nenhum')])
    + campoArea('Mensagem', 'extra_mensagem', cfg.extra_mensagem || '')
    + colunas([campo('Link do QR (quando "outro")', 'extra_qr_url', cfg.extra_qr_url || ''), campo('Cupom na via', 'extra_cupom', cfg.extra_cupom || '')])
    + rodapeFicha('config:cancelar', 'config:comanda:confirmar', 'Salvar comanda')
}


/** Pergunta antes de uma ação que não volta (excluir): o botão que confirma leva a ação dada. */
function fichaConfirmar(texto, acaoSim, rotuloSim) {
  return '<div style="font-size:13.5px;color:#111;font-weight:600;line-height:1.55;margin-bottom:18px">' + esc(texto) + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + botaoFicha('config:cancelar', 'Cancelar', false)
    + '<button type="button" data-acao="' + esc(acaoSim) + '" style="height:40px;padding:0 18px;border-radius:10px;font-family:inherit;'
    + 'font-size:13px;font-weight:800;cursor:pointer;border:none;background:#b42318;color:#fff">' + esc(rotuloSim || 'Confirmar') + '</button></div>'
}


// ── FINANCEIRO: lançamento avulso, editar conta, cancelar conta ──────────────
const CA = require('../../src-electron/contas-acoes')
const dataBRde = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test('' + iso) ? ('' + iso).split('-').reverse().join('/') : ('' + (iso || '')))

/** Uma receita ou despesa que já aconteceu — entra direto no extrato (NovoLancamento do painel). */
function fichaLancamento(contas, hojeBR) {
  const opcoesConta = [{ v: '', r: '— sem conta (gaveta / não informar) —' }].concat((contas || []).filter((c) => c.ativo !== false).map((c) => ({ v: c.id, r: c.nome })))
  const categorias = CA.CATEGORIAS_DESPESA.map((c) => ({ v: c, r: c }))
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">Um gasto ou uma entrada avulsa, já paga ou já recebida. '
    + 'Conta com vencimento (a pagar / a receber) é outra ficha.</div>'
    + colunas([campoSelecao('Tipo', 'tipo', [{ v: 'despesa', r: 'Despesa (saiu)' }, { v: 'receita', r: 'Receita (entrou)' }], 'despesa', 'trocar o tipo troca as categorias'),
      campoSelecao('Categoria', 'categoria', categorias, 'Insumos')])
    + campo('Descrição', 'descricao', '', 'ex.: Conta de luz de setembro')
    + colunas([campo('Valor', 'valor', ''), campo('Data', 'data', hojeBR || '', 'dd/mm/aaaa')])
    + colunas([campoSelecao('Centro de custo', 'centroCusto', [{ v: '', r: '— não informar —' }].concat(CA.CENTROS_CUSTO), ''),
      campoSelecao('Forma', 'forma', [{ v: '', r: '— não informar —' }].concat(CA.FORMAS.map((f) => ({ v: f, r: CA.NOME_FORMA[f] || f }))), '')])
    + campoSelecao('Conta de destino / origem', 'contaFinanceiraId', opcoesConta, '')
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-bottom:10px">Receita: Vendas · Taxa de serviço · Taxa de entrega · Outras receitas. O select acima troca sozinho ao escolher "Receita".</div>'
    + rodapeFicha('config:cancelar', 'lancamento:confirmar', 'Lançar')
}

/** Editar uma conta em aberto. A baixa (pagar/receber) é a ficha de Liquidar. */
function fichaContaEditar(conta) {
  const c = conta || {}
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">Corrige o que foi lançado. Para pagar ou receber, use a baixa (Liquidar / Receber). '
    + 'Estornar uma baixa e anexar nota continuam pelo painel.</div>'
    + campo('Descrição', 'descricao', c.descricao)
    + colunas([campo('Valor', 'valor', c.valor != null ? numBR(c.valor) : ''), campo('Vencimento', 'vencimento', dataBRde(c.vencimento), 'dd/mm/aaaa')])
    + colunas([campo(c.direcao === 'receber' ? 'Quem paga' : 'Fornecedor', 'contraparte', c.contraparte || ''), campo('Categoria', 'categoria', c.categoria || '')])
    + campoArea('Observação', 'observacao', c.observacao || '')
    + rodapeFicha('config:cancelar', 'conta:editar:confirmar:' + c.id, 'Salvar conta')
}

/** Cancelar: some da régua, não é apagada. Parcelada oferece a série inteira. */
function fichaContaCancelar(conta) {
  const c = conta || {}
  return '<div style="font-size:13.5px;color:#111;font-weight:600;line-height:1.55;margin-bottom:8px">Cancelar a conta <b>' + esc(c.descricao || '') + '</b>'
    + (c.valor != null ? ' (' + brl(c.valor) + ')' : '') + '?</div>'
    + '<div style="font-size:12.5px;color:#6b7280;font-weight:500;line-height:1.5;margin-bottom:18px">Ela sai da régua de contas e deixa de prometer dinheiro. Não é apagada: fica no histórico como cancelada.'
    + (c.serie ? ' Esta conta faz parte de uma série parcelada — dá para cancelar só esta ou a série inteira.' : '') + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">'
    + botaoFicha('config:cancelar', 'Voltar', false)
    + (c.serie ? '<button type="button" data-acao="conta:cancelar:serie:' + esc(c.id) + '" style="height:40px;padding:0 18px;border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;border:1px solid #f3c0bb;background:#fff;color:#b42318">Cancelar a série inteira</button>' : '')
    + '<button type="button" data-acao="conta:cancelar:sim:' + esc(c.id) + '" style="height:40px;padding:0 18px;border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;border:none;background:#b42318;color:#fff">Cancelar esta conta</button>'
    + '</div>'
}


// ── GESTÃO: item, ajuste de saldo, entradas à mão, fornecedor, pendência, ficha técnica ──
const EA = require('../../src-electron/estoque-acoes')
const selOpcoes = (lista, rotulos) => lista.map((v) => ({ v, r: (rotulos && rotulos[v]) || v }))
const NOME_TIPO_ITEM = { ingrediente: 'Ingrediente', bebida: 'Bebida', embalagem: 'Embalagem', produto_pronto: 'Produto pronto', revenda: 'Revenda', uso_consumo: 'Uso e consumo' }
const NOME_GRUPO_ITEM = { producao: 'Produção própria', revenda: 'Revenda', insumo: 'Insumos', uso_consumo: 'Uso e consumo' }
const qtdBR = (v) => (v == null || v === '' ? '' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3, useGrouping: false }))

function fichaInsumo(item) {
  const i = item || {}
  return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px">'
    + '<div style="font-size:13px;color:#6b7280;font-weight:600">Saldo agora: <b style="color:#111">' + esc(qtdBR(i.saldo) + ' ' + (i.unidade || 'un')) + '</b>'
    + (i.codigo && i.codigo !== '—' ? ' · código ' + esc(i.codigo) : '') + '</div>'
    + botaoFicha('estoque:ajuste:' + i.id, '↕ Movimentar estoque', false) + '</div>'
    + campo('Nome', 'nome', i.nome)
    + colunas([campoSelecao('Unidade', 'unidade', selOpcoes(EA.UNIDADES), i.unidade || 'un'), campo('Estoque mínimo', 'minimo', qtdBR(i.minimo)), campo('Custo unitário (R$)', 'custo', numBR(i.custo))], 3)
    + colunas([campoSelecao('Tipo', 'tipo', selOpcoes(EA.TIPOS_ITEM, NOME_TIPO_ITEM), i.tipo || 'ingrediente'), campoSelecao('Grupo', 'grupo', selOpcoes(EA.GRUPOS_ITEM, NOME_GRUPO_ITEM), i.grupo || 'producao')])
    + colunas([campoMarcar('Ativo', 'ativo', i.ativo !== false, 'inativo some das listas, o histórico fica'),
      campoMarcar('Permite estoque negativo', 'permiteNegativo', !!i.permiteNegativo, 'a venda não trava quando o saldo zera')])
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-bottom:10px">Classificação fiscal (NCM, CFOP, CST) e vínculo com o cardápio continuam pelo painel.</div>'
    + rodapeFicha('config:cancelar', 'estoque:item:confirmar:' + i.id, 'Salvar item')
}

function fichaAjusteEstoque(item) {
  const i = item || {}
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5"><b style="color:#111">' + esc(i.nome || '') + '</b> — saldo agora '
    + '<b style="color:#111">' + esc(qtdBR(i.saldo) + ' ' + (i.unidade || 'un')) + '</b>. Entrada soma; saída, perda e consumo tiram; '
    + '<b>acerto de saldo</b> fixa o saldo no que foi contado. Cada movimento fica no histórico.</div>'
    + colunas([campoSelecao('Movimento', 'acao', Object.keys(EA.ACOES_MOV).map((v) => ({ v, r: EA.ACOES_MOV[v] })), 'entrada'),
      campo('Quantidade (' + (i.unidade || 'un') + ')', 'qtd', '', 'no acerto, o saldo contado')])
    + colunas([campo('Custo unitário (só entrada)', 'custo', '', 'atualiza o custo médio'), campo('Motivo', 'motivo', '', 'ex.: compra avulsa, venceu, contagem')])
    + campoArea('Observação', 'observacao', '')
    + rodapeFicha('config:cancelar', 'estoque:ajuste:confirmar:' + i.id, 'Lançar movimento')
}

function seletorFornecedor(fornecedores) {
  return campoSelecao('Fornecedor cadastrado', 'fornecedorId', [{ v: '', r: '— não cadastrado / informar o nome —' }]
    .concat((fornecedores || []).map((f) => ({ v: f.id, r: f.nome }))), '')
}

function fichaEntradaSemNota(insumos, fornecedores, hojeBR) {
  const opcoes = [{ v: '', r: '—' }].concat((insumos || []).map((i) => ({ v: i.id, r: i.nome + ' (' + (i.unidade || 'un') + ')' })))
  const linhas = [0, 1, 2, 3, 4].map((n) =>
    '<div style="display:grid;grid-template-columns:1fr 110px 130px;gap:10px;align-items:center;margin-bottom:8px">'
    + '<select data-campo="linha-insumo:' + n + '" style="' + ESTILO_CAMPO + ';padding:0 10px">' + opcoes.map((o) => '<option value="' + esc(o.v) + '">' + esc(o.r) + '</option>').join('') + '</select>'
    + '<input data-campo="linha-qtd:' + n + '" placeholder="qtd" autocomplete="off" style="' + ESTILO_CAMPO + '">'
    + '<input data-campo="linha-custo:' + n + '" placeholder="custo unit." autocomplete="off" style="' + ESTILO_CAMPO + '">'
    + '</div>').join('')
  return avisoFicha('Entra no estoque marcada como sem comprovante fiscal — compra no mercado, no vizinho, sem nota. Com nota, use "Lançar manualmente — com nota fiscal".')
    + colunas([seletorFornecedor(fornecedores), campo('Ou o nome de quem vendeu', 'fornecedorNome', '')])
    + colunas([campo('Documento (recibo, opcional)', 'documento', ''), campo('Data', 'data', hojeBR || '', 'dd/mm/aaaa'), campo('Motivo (opcional)', 'motivo', '')], 3)
    + tituloSecao('Itens')
    + '<div style="display:grid;grid-template-columns:1fr 110px 130px;gap:10px;margin-bottom:6px;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em"><span>Item do estoque</span><span>Qtd</span><span>Custo unit.</span></div>'
    + linhas
    + rodapeFicha('config:cancelar', 'entrada:sem-nota:confirmar', 'Dar entrada')
}

function fichaEntradaManual(fornecedores, hojeBR) {
  const linhas = [0, 1, 2, 3, 4, 5].map((n) =>
    '<div style="display:grid;grid-template-columns:1fr 80px 90px 120px;gap:10px;align-items:center;margin-bottom:8px">'
    + '<input data-campo="linha-descricao:' + n + '" placeholder="descrição do item na nota" autocomplete="off" style="' + ESTILO_CAMPO + '">'
    + '<input data-campo="linha-unidade:' + n + '" placeholder="UN" autocomplete="off" style="' + ESTILO_CAMPO + '">'
    + '<input data-campo="linha-quantidade:' + n + '" placeholder="qtd" autocomplete="off" style="' + ESTILO_CAMPO + '">'
    + '<input data-campo="linha-valor:' + n + '" placeholder="valor unit." autocomplete="off" style="' + ESTILO_CAMPO + '">'
    + '</div>').join('')
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5">A nota entra em <b style="color:#111">"A lançar"</b> e vai para a conferência normal: '
    + 'lá cada item é vinculado ao estoque (ou criado) antes de mexer no saldo. Digite como está no papel.</div>'
    + colunas([seletorFornecedor(fornecedores), campo('Nome do fornecedor', 'fornecedorNome', '', 'como está na nota'), campo('CNPJ', 'fornecedorCnpj', '')], 3)
    + colunas([campo('Número da nota', 'numero', ''), campo('Série', 'serie', ''), campo('Emissão', 'dataEmissao', hojeBR || '', 'dd/mm/aaaa')], 3)
    + tituloSecao('Itens da nota')
    + '<div style="display:grid;grid-template-columns:1fr 80px 90px 120px;gap:10px;margin-bottom:6px;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em"><span>Descrição</span><span>Un.</span><span>Qtd</span><span>Valor unit.</span></div>'
    + linhas
    + rodapeFicha('config:cancelar', 'entrada:manual:confirmar', 'Lançar nota')
}

function fichaFornecedorEditar(f) {
  const x = f || {}
  return campo('Nome', 'nome', x.nome)
    + colunas([campo('CNPJ / CPF', 'cnpj', x.cnpj && x.cnpj !== '—' ? x.cnpj : ''), campo('Telefone', 'telefone', x.telefone && x.telefone !== '—' ? x.telefone : ''), campo('E-mail', 'email', x.email || '')], 3)
    + colunas([campo('Endereço', 'endereco', x.endereco || ''), campo('Inscrição estadual', 'inscricao', x.inscricao || '')])
    + campoSelecao('Tipo', 'tipo', [{ v: 'fornecedor', r: 'Fornecedor' }, { v: 'prestador', r: 'Prestador de serviço' }, { v: 'transportadora', r: 'Transportadora' }], x.tipo || 'fornecedor')
    + campoArea('Observações', 'observacoes', x.observacoes || '')
    + campoMarcar('Ativo', 'ativo', x.ativo !== false, 'inativo some das escolhas; as notas antigas ficam')
    + rodapeFicha('config:cancelar', 'estoque:fornecedor:confirmar:' + x.id, 'Salvar fornecedor', botaoFicha('estoque:fornecedor:excluir:' + x.id, 'Excluir', false))
}

function fichaPendencia(p) {
  const x = p || {}
  return '<div style="background:#f7f8fa;border-radius:12px;padding:12px 14px;margin-bottom:16px">'
    + '<div style="font-size:13.5px;font-weight:800;color:#111">' + esc(x.problema || 'Pendência') + ' — ' + esc(x.produto || '') + '</div>'
    + '<div style="font-size:12.5px;color:#6b7280;font-weight:600;margin-top:4px">' + esc(qtdBR(x.qtd)) + (x.unidade ? ' ' + esc(x.unidade) : '') + (x.valor ? ' · ' + brl(x.valor) : '')
    + (x.nota ? ' · ' + esc(x.nota) : '') + (x.fornecedor ? ' · ' + esc(x.fornecedor) : '') + (x.registrada ? ' · registrada em ' + esc(x.registrada) : '') + '</div></div>'
    + campoArea('Como foi resolvida', 'resolucao', '', 'ex.: o fornecedor repôs os 6 no dia seguinte · foi abatido da nota · perda assumida')
    + rodapeFicha('config:cancelar', 'entrada:resolver:confirmar:' + x.id, 'Marcar como resolvida')
}

function fichaTecnicaEditar(ficha, insumos) {
  const f = ficha || {}
  const opcoes = [{ v: '', r: '—' }].concat((insumos || []).map((i) => ({ v: i.id, r: i.nome + ' (' + (i.unidade || 'un') + ')' })))
  const atuais = (f.insumos || []).map((x) => ({ id: x.id, qtd: x.qtdNum }))
  for (let i = 0; i < 3; i++) atuais.push({ id: '', qtd: '' })
  const linhas = atuais.map((l, n) =>
    '<div style="display:grid;grid-template-columns:1fr 140px;gap:10px;align-items:center;margin-bottom:8px">'
    + '<select data-campo="ficha-insumo:' + n + '" style="' + ESTILO_CAMPO + ';padding:0 10px">' + opcoes.map((o) => '<option value="' + esc(o.v) + '"' + (o.v && o.v === l.id ? ' selected' : '') + '>' + esc(o.r) + '</option>').join('') + '</select>'
    + '<input data-campo="ficha-qtd:' + n + '" value="' + esc(qtdBR(l.qtd)) + '" placeholder="qtd por unidade" autocomplete="off" style="' + ESTILO_CAMPO + '">'
    + '</div>').join('')
  return '<div style="font-size:13px;color:#6b7280;font-weight:500;margin-bottom:14px;line-height:1.5"><b style="color:#111">' + esc(f.produto || '') + '</b>'
    + (f.categoria ? ' · ' + esc(f.categoria) : '') + (f.preco ? ' · vende por ' + brl(f.preco) : '') + '. Quanto de cada insumo sai do estoque por unidade vendida. '
    + 'Para tirar um insumo, escolha "—" na linha. Salvar sem linhas deixa o produto sem ficha.</div>'
    + '<div style="display:grid;grid-template-columns:1fr 140px;gap:10px;margin-bottom:6px;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em"><span>Insumo</span><span>Quantidade</span></div>'
    + linhas
    + rodapeFicha('config:cancelar', 'estoque:ficha:confirmar:' + f.produtoId, 'Salvar ficha')
}

module.exports = { painel, popup, fichaMovimentacao, fichaFechamento, fichaAbertura, fichaPreco, fichaRecebimento, fichaBaixa, fichaNovaConta, fichaEntrega, fichaFecharMesa, fichaNovoInsumo, fichaNovaCategoriaEstoque, fichaNovoFornecedor, fichaTempos, fichaPausar, fichaUsuario, fichaNovoEntregador, fichaFecharRota, fichaNovoCliente, fichaPedido, fichaCliente, fichaProduto, fichaAcessoTv, fichaConferencia, fichaFila,
  fichaLoja, fichaHorarios, fichaBairros, fichaForma, fichaContaFinanceira, fichaMesasCriar, fichaMesa, fichaColaboradorNovo, fichaComanda, fichaConfirmar, fichaLancamento, fichaContaEditar, fichaContaCancelar,
  fichaInsumo, fichaAjusteEstoque, fichaEntradaSemNota, fichaEntradaManual, fichaFornecedorEditar, fichaPendencia, fichaTecnicaEditar,
  campo, campoSelecao, campoMarcar, campoArea, colunas, tituloSecao, avisoFicha, botaoFicha, brl }
