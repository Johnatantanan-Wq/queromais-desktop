// renderer/elo/tela-venda.js — Venda manual (PDV de balcão e entrega).
//
// Esta é a primeira tela do app que ESCREVE: as outras leem e mandam a ação para o
// painel. Aqui a venda é fechada aqui dentro — é o que o dono pediu ("venda manual,
// quero que funcione") e é também o ensaio do modo offline: se o app sabe fechar uma
// venda sozinho, sabe fechar sem internet.
//
// Três etapas, como no painel (PainelVenda.tsx): 1. cliente · 2. produtos · 3. pagamento.
// O que muda de lá para cá: sem seletor de sabores (o cardápio do app é leitura) e sem
// Pix online — o resto é o mesmo fluxo, inclusive troco e taxa de entrega por bairro.

const L = require('./tela-lista')
const esc = L.esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TIPOS = [
  { chave: 'entrega', rotulo: 'Entrega' },
  { chave: 'retirada', rotulo: 'Retirada' },
  { chave: 'consumo_local', rotulo: 'Consumo local' },
]
const FORMAS = [
  { chave: 'dinheiro', rotulo: 'Dinheiro' }, { chave: 'pix', rotulo: 'Pix' },
  { chave: 'credito', rotulo: 'Crédito' }, { chave: 'debito', rotulo: 'Débito' },
]
const ETAPAS = [
  { chave: 'cliente', rotulo: 'cliente' }, { chave: 'produtos', rotulo: 'produtos' },
  { chave: 'pagamento', rotulo: 'pagamento' },
]

/** Estado limpo de uma venda — o mesmo formato que o shell guarda. */
function vendaVazia() {
  return {
    etapa: 'cliente', tipo: 'entrega', telefone: '', nome: '', bairro: '', endereco: '',
    itens: [], busca: '', forma: 'dinheiro', trocoPara: 0, observacao: '', numero: null,
  }
}

/** Soma dos itens; a taxa de entrega só existe quando o pedido é de entrega. */
function totais(venda, taxasBairro) {
  const produtos = (venda.itens || []).reduce((s, i) => s + (Number(i.preco) || 0) * (Number(i.qtd) || 0), 0)
  const entrega = venda.tipo === 'entrega' ? Number((taxasBairro || {})[venda.bairro] || 0) : 0
  const total = produtos + entrega
  const troco = venda.forma === 'dinheiro' && Number(venda.trocoPara) > total
    ? Number(venda.trocoPara) - total : 0
  return { produtos, entrega, total, troco }
}

// Sem internet só dinheiro fecha (spec F3): o app não gera QR de Pix, e a decisão é do
// dono. A frase diz o que fazer, não só que não dá.
const SEM_INTERNET = 'Sem internet só dá para fechar em dinheiro — Pix e cartão precisam de conexão.'

/** O que ainda falta para poder fechar — a mensagem é a mesma que o painel dá. */
function oQueFalta(venda, taxasBairro, semInternet) {
  if (!(venda.itens || []).length) return 'Adicione ao menos um item ao pedido.'
  if (semInternet && (venda.forma || 'dinheiro') !== 'dinheiro') return SEM_INTERNET
  if (venda.tipo === 'entrega') {
    if (!venda.nome.trim()) return 'Entrega precisa do nome do cliente.'
    if (!venda.bairro) return 'Escolha o bairro da entrega.'
    if (!venda.endereco.trim()) return 'Entrega precisa do endereço.'
  }
  if (venda.forma === 'dinheiro' && Number(venda.trocoPara) > 0) {
    const t = totais(venda, taxasBairro)
    if (Number(venda.trocoPara) < t.total) return 'O troco não pode ser menor que o total.'
  }
  return null
}

// ── peças ───────────────────────────────────────────────────────────────────
function campo(rotulo, dentro) {
  return '<label style="display:block;margin-bottom:12px">'
    + '<span style="display:block;font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;'
    + 'letter-spacing:.07em;margin-bottom:6px">' + esc(rotulo) + '</span>' + dentro + '</label>'
}
function entrada(attr, valor, placeholder) {
  return '<input ' + attr + ' value="' + esc(valor || '') + '" placeholder="' + esc(placeholder || '') + '"'
    + ' autocomplete="off" style="width:100%;height:38px;border:1px solid #e5e7eb;border-radius:10px;'
    + 'padding:0 12px;font-family:inherit;font-size:13.5px;color:#111;background:#fff">'
}
/** `desligadas` = { chave: motivo }: a opção aparece esmaecida, com o motivo no título. */
function escolha(attr, opcoes, atual, desligadas) {
  const off = desligadas || {}
  return '<div style="display:flex;gap:8px;flex-wrap:wrap">' + opcoes.map((o) => {
    const motivo = off[o.chave]
    if (motivo) {
      return '<button type="button" ' + attr + '="' + esc(o.chave) + '" disabled title="' + esc(motivo) + '"'
        + ' style="flex:1;min-width:96px;height:38px;border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;'
        + 'border:1px dashed #e5e7eb;background:#f7f8fa;color:#b3b8c2;cursor:not-allowed">' + esc(o.rotulo) + '</button>'
    }
    return '<button type="button" ' + attr + '="' + esc(o.chave) + '" style="flex:1;min-width:96px;height:38px;'
    + 'border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;' + (o.chave === atual
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(o.rotulo) + '</button>'
  }).join('') + '</div>'
}
function botao(acao, rotulo, primaria, largo) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:40px;padding:0 18px;border-radius:10px;'
    + 'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;white-space:nowrap;'
    + (largo ? 'width:100%;' : '') + (primaria
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}
function cartao(titulo, corpo, direita) {
  return '<div class="ecard" style="padding:0;overflow:hidden">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;'
    + 'border-bottom:1px solid #eef0f3"><div style="font-size:14.5px;font-weight:800;color:#111">' + esc(titulo) + '</div>'
    + (direita || '') + '</div><div style="padding:18px">' + corpo + '</div></div>'
}

function trilhaEtapas(atual) {
  return '<div style="display:flex;gap:6px;flex-wrap:wrap">' + ETAPAS.map((e, i) =>
    '<span style="font-size:11.5px;font-weight:800;padding:5px 12px;border-radius:20px;'
    + (e.chave === atual ? 'background:var(--acento);color:#fff' : 'background:#eef0f3;color:#9ca3af')
    + '">' + (i + 1) + '. ' + esc(e.rotulo) + '</span>').join('') + '</div>'
}

// ── teclado de tela ─────────────────────────────────────────────────────────
//
// O balcão é operado em tela sensível: teclado físico nem sempre existe, e quando
// existe está ocupado. São dois, como no painel — 123 digita no TELEFONE, ABC digita
// no NOME. O modo escolhido diz para onde a tecla vai, e a tela mostra isso escrito:
// sem essa linha, o operador digita o nome no telefone e só descobre depois.

const TECLAS_NUMERICAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '(', '0', ')']
const TECLAS_LETRAS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

function tecla(rotulo, valor, opcoes) {
  const o = opcoes || {}
  return '<button type="button" data-tecla="' + esc(valor) + '"'
    + ' style="height:' + (o.baixa ? 40 : 46) + 'px;' + (o.largura ? 'flex:' + o.largura + ';' : '')
    + 'border-radius:10px;font-family:inherit;font-size:' + (o.baixa ? 14 : 17) + 'px;font-weight:800;'
    + 'cursor:pointer;user-select:none;' + (o.apagar
      ? 'border:none;background:#fdeaea;color:#b42318'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}

function tecladoDeTela(modo) {
  const numerico = modo !== 'texto'
  const aba = (chave, rotulo) => '<button type="button" data-modo-teclado="' + chave + '"'
    + ' style="flex:1;height:36px;border-radius:9px;font-family:inherit;font-size:14px;font-weight:800;'
    + 'cursor:pointer;' + ((numerico ? 'numerico' : 'texto') === chave
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#4b5563') + '">' + rotulo + '</button>'

  const corpo = numerico
    ? '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'
      + TECLAS_NUMERICAS.map((d) => tecla(d, d)).join('')
      + tecla('+', '+') + tecla('⌫', '\u0008', { apagar: true }) + tecla('—', '-')
      + '</div>'
    : '<div style="display:flex;flex-direction:column;gap:6px">'
      + TECLAS_LETRAS.map((linha) => '<div style="display:flex;gap:5px;justify-content:center">'
        + linha.map((l) => tecla(l, l, { baixa: true })).join('') + '</div>').join('')
      + '<div style="display:flex;gap:6px;margin-top:4px">'
      + tecla('espaço', ' ', { baixa: true, largura: 3 })
      + tecla('⌫', '\u0008', { baixa: true, apagar: true, largura: 1 })
      + '</div></div>'

  return '<div style="display:flex;gap:8px;margin-bottom:10px">' + aba('numerico', '123') + aba('texto', 'ABC') + '</div>'
    + '<div style="font-size:11.5px;font-weight:700;color:var(--acento-texto);margin-bottom:10px">'
    + (numerico ? '→ digitando telefone' : '→ digitando nome') + '</div>'
    + corpo
}

const MIN_DIGITOS_BUSCA = 8
const MIN_LETRAS_BUSCA = 3

/** Quem bate com o telefone ou o nome — e só quando há o bastante para buscar. */
function clientesQueBatem(lista, telefone, nome) {
  const t = ('' + (telefone || '')).replace(/\D/g, '')
  const n = ('' + (nome || '')).trim().toLowerCase()
  const porTel = t.length >= MIN_DIGITOS_BUSCA
  const porNome = n.length >= MIN_LETRAS_BUSCA
  if (!porTel && !porNome) return []
  return (lista || []).filter((c) =>
    (porTel && ('' + (c.telefone || '')).replace(/\D/g, '').indexOf(t) >= 0)
    || (porNome && ('' + (c.nome || '')).toLowerCase().indexOf(n) >= 0)).slice(0, 5)
}

// ── etapa 1: cliente ────────────────────────────────────────────────────────
function etapaCliente(venda, dados) {
  const bairros = Object.keys(dados.taxasBairro || {})
  const semBairro = bairros.length === 0
  const formulario = escolha('data-venda-tipo', TIPOS.map((t) =>
    (t.chave === 'entrega' && semBairro ? { ...t, rotulo: 'Entrega (sem bairro)' } : t)), venda.tipo)
    + '<div style="height:16px"></div>'
    + campo('Telefone do cliente', entrada('data-venda-campo="telefone"', venda.telefone, '(75) 99999-9999'))
    + campo('Nome do cliente', entrada('data-venda-campo="nome"', venda.nome,
      venda.tipo === 'entrega' ? 'Obrigatório' : 'Opcional'))
    + (venda.tipo === 'entrega'
      ? campo('Bairro', '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (semBairro
        ? '<span style="font-size:12.5px;color:#8a6508;font-weight:600">Nenhum bairro cadastrado — '
          + 'a entrega fica sem taxa até configurar em Rotas.</span>'
        : bairros.map((b) => '<button type="button" data-venda-bairro="' + esc(b) + '"'
          + ' style="height:34px;padding:0 12px;border-radius:9px;font-family:inherit;font-size:12.5px;'
          + 'font-weight:700;cursor:pointer;' + (b === venda.bairro
            ? 'border:none;background:var(--acento-suave);color:var(--acento-texto)'
            : 'border:1px solid #e5e7eb;background:#fff;color:#4b5563') + '">' + esc(b)
          + ' <span style="color:#9ca3af;font-weight:600">' + esc(brl(dados.taxasBairro[b])) + '</span></button>').join(''))
        + '</div>')
        + campo('Endereço', entrada('data-venda-campo="endereco"', venda.endereco, 'Rua, número e referência'))
      : '')
    + campo('Observação do pedido', entrada('data-venda-campo="observacao"', venda.observacao, 'Ex.: sem cebola'))

  // A busca só começa com o número quase inteiro (8 dígitos — o que sobra tirando o
  // DDD) ou com três letras do nome. Um dígito só casa com o DDD de todo mundo, e a
  // lista aparecendo a cada tecla mexia a tela inteira (print do dono, 08/09).
  const clientes = clientesQueBatem(dados.clientes, venda.telefone, venda.nome)

  // O cartão tem SEMPRE a mesma altura: com resultado a lista rola por dentro, sem
  // resultado a dica ocupa o mesmo espaço. É o que mantém a tela parada enquanto se digita.
  const ALTURA_SUGESTOES = 'min-height:196px;max-height:196px;overflow:auto'
  const sugestoes = clientes.length
    ? cartao('Clientes que batem', '<div style="' + ALTURA_SUGESTOES + '">' + clientes.map((c) =>
      '<div data-venda-cliente="' + esc(c.telefone || c.nome) + '" style="display:flex;align-items:center;gap:10px;'
      + 'padding:10px 0;border-bottom:1px solid #f4f5f7;cursor:pointer">'
      + '<span style="flex:1;min-width:0;font-size:13.5px;font-weight:700;color:#111">' + esc(c.nome) + '</span>'
      + '<span style="font-size:12px;color:#9ca3af;font-weight:600">' + esc(c.bairro || '') + ' · '
      + esc(c.telefone || '') + '</span></div>').join('') + '</div>')
    : cartao('Cliente', '<div style="' + ALTURA_SUGESTOES + ';font-size:12.5px;color:#9ca3af;font-weight:500;line-height:1.6">'
      + 'Digite o telefone inteiro (ou três letras do nome) e o app procura no cadastro. '
      + 'Sem achar, a venda entra como cliente novo — o que o balcão faz o dia todo.</div>')

  return '<div style="display:grid;grid-template-columns:minmax(300px,1fr) minmax(240px,300px);gap:18px;'
    + 'align-items:start">'
    + '<div>' + cartao('Quem está comprando', formulario) + '<div style="height:16px"></div>' + sugestoes + '</div>'
    + cartao('Teclado', tecladoDeTela(venda.modoTeclado)) + '</div>'
}

// ── etapa 2: produtos ───────────────────────────────────────────────────────
function etapaProdutos(venda, dados) {
  const termo = (venda.busca || '').trim().toLowerCase()
  const categorias = (dados.categorias || []).map((c) => ({
    nome: c.nome,
    itens: (c.itens || []).filter((i) => !i.esgotado && (!termo || (i.nome || '').toLowerCase().indexOf(termo) >= 0)),
  })).filter((c) => c.itens.length)

  const catalogo = categorias.length
    ? categorias.map((c) => '<div style="margin-bottom:18px">'
      + '<div style="font-size:11px;font-weight:800;color:#a9aeb8;text-transform:uppercase;letter-spacing:.1em;'
      + 'margin-bottom:10px">' + esc(c.nome) + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px">'
      + c.itens.map((i) => '<button type="button" data-venda-add="' + esc(i.nome) + '"'
        + ' style="text-align:left;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;background:#fff;'
        + 'cursor:pointer;font-family:inherit;min-width:0">'
        + '<div style="font-size:13.5px;font-weight:700;color:#111;line-height:1.3">' + esc(i.nome) + '</div>'
        + '<div style="font-size:14px;font-weight:800;color:var(--acento-texto);margin-top:6px">'
        + esc(brl(i.preco)) + '</div></button>').join('') + '</div></div>').join('')
    : '<div class="evazio">Nenhum produto encontrado' + (termo ? ' para “' + esc(venda.busca) + '”.' : '.') + '</div>'

  const t = totais(venda, dados.taxasBairro)
  const carrinho = (venda.itens || []).length
    ? (venda.itens || []).map((i) => '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;'
      + 'border-bottom:1px solid #f4f5f7">'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:700;color:#111;overflow:hidden;text-overflow:ellipsis;'
      + 'white-space:nowrap">' + esc(i.nome) + '</div>'
      + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600">' + esc(brl(i.preco)) + ' cada</div></div>'
      + '<div style="display:flex;align-items:center;gap:6px">'
      + '<button type="button" data-venda-menos="' + esc(i.nome) + '" style="width:26px;height:26px;'
      + 'border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;'
      + 'font-size:14px;font-weight:800;color:#111">−</button>'
      + '<span style="min-width:22px;text-align:center;font-size:13px;font-weight:800;color:#111">' + i.qtd + '</span>'
      + '<button type="button" data-venda-add="' + esc(i.nome) + '" style="width:26px;height:26px;'
      + 'border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;'
      + 'font-size:14px;font-weight:800;color:#111">+</button></div>'
      + '<span style="min-width:84px;text-align:right;font-size:13.5px;font-weight:800;color:#111">'
      + esc(brl(i.preco * i.qtd)) + '</span></div>').join('')
      + '<div style="display:flex;justify-content:space-between;gap:10px;padding-top:14px;font-size:15px;'
      + 'font-weight:800;color:#111"><span>Subtotal</span><span>' + esc(brl(t.produtos)) + '</span></div>'
    : '<div style="padding:26px 0;text-align:center;font-size:12.5px;color:#9ca3af;font-weight:500">'
      + 'Toque num produto para começar o pedido.</div>'

  return '<div style="display:grid;grid-template-columns:1fr minmax(300px,380px);gap:18px;align-items:start">'
    + cartao('Cardápio',
      entrada('data-venda-campo="busca"', venda.busca, 'Buscar produto…') + '<div style="height:14px"></div>' + catalogo)
    + cartao('Pedido', carrinho,
      '<span style="font-size:12px;color:#9ca3af;font-weight:700">' + (venda.itens || []).length + ' item(ns)</span>')
    + '</div>'
}

// ── etapa 3: pagamento ──────────────────────────────────────────────────────
function etapaPagamento(venda, dados, estado) {
  const semInternet = !!(estado && estado.semInternet)
  const t = totais(venda, dados.taxasBairro)
  const falta = oQueFalta(venda, dados.taxasBairro, semInternet)

  const linha = (rotulo, valor, forte, cor) => '<div style="display:flex;justify-content:space-between;gap:12px;'
    + 'padding:7px 0;font-size:' + (forte ? 16 : 13) + 'px;font-weight:' + (forte ? 800 : 600) + ';color:'
    + (cor || (forte ? '#111' : '#6b7280')) + '"><span>' + esc(rotulo) + '</span><span>' + esc(valor) + '</span></div>'

  const resumo = linha('Produtos', brl(t.produtos))
    + (venda.tipo === 'entrega' ? linha('Taxa de entrega', brl(t.entrega)) : '')
    + '<div style="height:1px;background:#eef0f3;margin:6px 0"></div>'
    + linha('Total', brl(t.total), true, 'var(--acento-texto)')
    + (t.troco > 0 ? linha('Troco a separar', brl(t.troco), false, '#8a6508') : '')

  const motivo = 'precisa de internet'
  const desligadas = semInternet ? { pix: motivo, credito: motivo, debito: motivo } : {}
  const pagamento = escolha('data-venda-forma', FORMAS, venda.forma, desligadas)
    + (semInternet
      ? '<div style="font-size:12px;font-weight:700;color:#8a6508;background:#fff9e8;border-radius:9px;padding:9px 12px;margin-top:12px">'
        + '⚠ ' + esc(SEM_INTERNET) + '</div>'
      : '')
    + (venda.forma === 'dinheiro'
      ? '<div style="height:14px"></div>'
        + campo('Troco para quanto?', entrada('data-venda-campo="trocoPara"',
          venda.trocoPara ? String(venda.trocoPara) : '', 'Ex.: 100,00'))
      : '')

  const conferencia = '<div style="font-size:12.5px;color:#6b7280;font-weight:600;line-height:1.8">'
    + '<div>' + esc((TIPOS.find((x) => x.chave === venda.tipo) || {}).rotulo || '') + '</div>'
    + '<div>' + esc(venda.nome || 'Consumidor') + (venda.telefone ? ' · ' + esc(venda.telefone) : '') + '</div>'
    + (venda.tipo === 'entrega' ? '<div>' + esc(venda.bairro || '—') + ' · ' + esc(venda.endereco || '—') + '</div>' : '')
    + (venda.observacao ? '<div style="color:#8a6508">✎ ' + esc(venda.observacao) + '</div>' : '')
    + '<div>' + (venda.itens || []).length + ' item(ns) · ' + esc(brl(t.total)) + '</div></div>'

  const acao = falta
    ? '<div style="font-size:12.5px;font-weight:700;color:#8a6508;background:#fff9e8;border-radius:9px;'
      + 'padding:10px 12px;margin-bottom:12px">⚠ ' + esc(falta) + '</div>'
      + '<button type="button" disabled style="width:100%;height:44px;border-radius:10px;border:none;'
      + 'background:#eef0f3;color:#9ca3af;font-family:inherit;font-size:14px;font-weight:800">Fechar venda</button>'
    : '<button type="button" data-acao="venda:fechar" style="width:100%;height:44px;border-radius:10px;border:none;'
      + 'background:var(--acento);color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">'
      + 'Fechar venda · ' + esc(brl(t.total)) + '</button>'

  return '<div style="display:grid;grid-template-columns:minmax(320px,440px) 1fr;gap:18px;align-items:start">'
    + cartao('Pagamento', pagamento)
    + cartao('Conferência', conferencia + '<div style="height:12px"></div>' + resumo
      + '<div style="height:14px"></div>' + acao)
    + '</div>'
}

// ── recibo: o que aparece depois de fechar ──────────────────────────────────
function recibo(venda, dados) {
  const t = totais(venda, dados.taxasBairro)
  // A venda feita sem internet tem número PROVISÓRIO (L-3): aparece como é, sem zero à
  // esquerda, e o recibo diz que ela sobe sozinha. Quando sobe, mostra o oficial.
  const provisorio = !!venda.provisorio
  const subiu = provisorio && venda.numeroOficial
  const numeroTxt = provisorio ? String(venda.numero) : '#' + String(venda.numero).padStart(4, '0')
  const situacao = subiu
    ? '<div style="font-size:12.5px;font-weight:700;color:var(--acento-texto);background:var(--acento-suave);border-radius:9px;'
      + 'padding:9px 12px;margin-top:14px">A venda subiu para o painel: ' + esc(String(venda.numero)) + ' virou o pedido #'
      + esc(String(venda.numeroOficial)) + '.</div>'
    : provisorio
      ? '<div style="font-size:12.5px;font-weight:700;color:#8a6508;background:#fff9e8;border-radius:9px;padding:9px 12px;margin-top:14px">'
        + 'Feita sem internet — provisória. Sobe sozinha quando a conexão voltar e ganha o número do painel.</div>'
      : ''
  const rodape = subiu
    ? 'A venda entrou na Gestão de pedido, no Caixa e no Extrato com o número do painel.'
    : provisorio
      ? 'Enquanto não sobe, ela já conta no Caixa e no quadro de pedidos, marcada como não sincronizada.'
      : 'A venda entrou na Gestão de pedido, no Caixa e no Extrato.'
  return '<div class="ecard" style="padding:40px 24px;text-align:center;animation:eloFadeUp .4s ease both">'
    + '<div style="font-size:34px;line-height:1;margin-bottom:12px">' + (provisorio && !subiu ? '⏳' : '✅') + '</div>'
    + '<div style="font-size:20px;font-weight:800;color:#111;letter-spacing:-.02em">Venda '
    + esc(numeroTxt) + ' registrada</div>'
    + '<div style="font-size:13px;color:#9ca3af;font-weight:600;margin-top:6px">'
    + esc(venda.nome || 'Consumidor') + ' · ' + esc(brl(t.total)) + ' · '
    + esc((FORMAS.find((f) => f.chave === venda.forma) || {}).rotulo || '') + '</div>'
    + (t.troco > 0 ? '<div style="font-size:13px;font-weight:800;color:#8a6508;margin-top:8px">Troco: '
      + esc(brl(t.troco)) + '</div>' : '')
    + situacao
    + '<div style="display:flex;gap:10px;justify-content:center;margin-top:22px;flex-wrap:wrap">'
    + botao('venda:imprimir:' + venda.numero, '🖨 Imprimir comanda', false)
    + botao('venda:nova', '+ Nova venda', true) + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;margin-top:18px">' + esc(rodape) + '</div></div>'
}

function htmlVenda(dados, estado) {
  estado = estado || {}
  if (!dados) {
    return '<div class="ecard"><div class="evazio">Sem o cardápio ainda.<br>'
      + 'Quando o app falar com o painel, a venda manual abre aqui.</div></div>'
  }
  const venda = estado.venda || vendaVazia()
  if (venda.numero) return recibo(venda, dados)

  const t = totais(venda, dados.taxasBairro)
  const topo = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;'
    + 'flex-wrap:wrap;margin-bottom:18px">'
    + '<div><div style="font-size:19px;font-weight:800;color:#111;letter-spacing:-.02em">Venda manual</div>'
    + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:4px">PDV de balcão e entrega</div></div>'
    + trilhaEtapas(venda.etapa) + '</div>'

  const corpo = venda.etapa === 'produtos' ? etapaProdutos(venda, dados)
    : venda.etapa === 'pagamento' ? etapaPagamento(venda, dados, estado)
      : etapaCliente(venda, dados)

  // A barra de baixo é o que faz o PDV andar sem tirar a mão do balcão.
  const anterior = venda.etapa === 'produtos' ? 'cliente' : venda.etapa === 'pagamento' ? 'produtos' : null
  const proxima = venda.etapa === 'cliente' ? 'produtos' : venda.etapa === 'produtos' ? 'pagamento' : null
  const barra = '<div class="ecard" style="margin-top:18px;padding:12px 18px;display:flex;align-items:center;'
    + 'gap:12px;flex-wrap:wrap">'
    + (anterior ? botao('venda:etapa:' + anterior, '‹ Voltar', false) : '')
    + '<span style="font-size:13px;font-weight:700;color:#6b7280">'
    + (venda.itens || []).length + ' item(ns) · <strong style="color:#111">' + esc(brl(t.total)) + '</strong></span>'
    + '<span style="margin-left:auto;display:flex;gap:10px">'
    + botao('venda:cancelar', 'Cancelar venda', false)
    + (proxima
      ? botao('venda:etapa:' + proxima, (proxima === 'produtos' ? 'Escolher produtos' : 'Ir para o pagamento') + ' ›', true)
      : '')
    + '</span></div>'

  return topo + corpo + barra
}

module.exports = {
  clientesQueBatem, MIN_DIGITOS_BUSCA, MIN_LETRAS_BUSCA,
  tecladoDeTela, TECLAS_NUMERICAS, TECLAS_LETRAS, htmlVenda, vendaVazia, totais, oQueFalta, TIPOS, FORMAS, ETAPAS, SEM_INTERNET }
