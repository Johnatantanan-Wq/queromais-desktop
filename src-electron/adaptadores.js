/**
 * adaptadores.js — do formato do PAINEL para o formato de cada tela do app.
 *
 * As telas nativas foram desenhadas a partir do que o painel MOSTRA; as APIs devolvem
 * o que o banco GUARDA. Este arquivo é a tradução entre os dois, e mora fora do
 * Electron de propósito: é função pura, entra JSON e sai JSON, então dá para testar
 * cada conversão sem abrir janela nenhuma.
 *
 * Regra de todas: dado que falta vira ausência declarada (`null`, `[]`, `'—'`), nunca
 * `undefined` solto — a tela sabe desenhar "sem dado", mas não sabe desenhar lixo.
 */

const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0 }
const texto = (v) => (v == null ? '' : String(v))

/** '2026-09-07T20:14:00Z' → '20:14' no fuso de quem está olhando. */
function horaDe(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
/** '2026-09-07T20:14:00Z' → '2026-09-07'. */
function diaDe(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
/** Minutos desde então — é o que o KDS e o despacho mostram. */
function minutosDesde(iso) {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  if (isNaN(t)) return 0
  return Math.max(0, Math.round((Date.now() - t) / 60000))
}

// ── Cozinha e Bar ───────────────────────────────────────────────────────────
// A API devolve a fila achatada por ITEM (/api/admin/fila/dept/[dep]); a tela é
// agrupada por PEDIDO, porque a cozinha monta o pedido, não itens soltos.
function filaDeProducao(resposta) {
  const itens = (resposta && resposta.items) || []
  const porPedido = new Map()
  for (const i of itens) {
    const chave = i.pedido_id
    if (!porPedido.has(chave)) {
      porPedido.set(chave, {
        numero: num(i.pedido_numero),
        tipo: i.pedido_tipo === 'entrega' ? 'entrega'
          : i.pedido_tipo === 'consumo_local' ? 'consumo_local' : 'retirada',
        mesa: i.pedido_mesa != null ? texto(i.pedido_mesa) : null,
        cliente: texto(i.pedido_cliente) || 'Sem identificação',
        esperaMin: minutosDesde(i.pedido_criado_em),
        obs: i.pedido_obs || null,
        itens: [],
      })
    }
    porPedido.get(chave).itens.push({
      id: texto(i.id),
      qtd: num(i.qtd) || 1,
      nome: texto(i.produto_nome),
      sabores: (i.sabores || []).map((s) => ({ nome: texto(s.nome), grupo: s.grupo || undefined })),
      obs: i.item_obs || null,
      // O painel usa pendente/preparando/pronto; a tela desenha o botão de cada um.
      estado: i.status === 'pronto' ? 'pronto' : i.status === 'preparando' ? 'preparando' : 'pendente',
    })
  }
  // Mais velho primeiro: quem espera há mais tempo tem que aparecer antes.
  const pedidos = [...porPedido.values()].sort((a, b) => b.esperaMin - a.esperaMin)
  return { pedidos, acessoTv: null }
}

/** O código da TV vem de outra rota; junta-se ao dado da fila. */
function juntarAcessoTv(fila, statusKds) {
  if (!statusKds) return fila
  return { ...fila, acessoTv: { definido: !!statusKds.definido, dispositivos: num(statusKds.dispositivos) } }
}

// ── Salão / Atendimento ─────────────────────────────────────────────────────
const SITUACAO_MESA = { livre: 'Livre', ocupada: 'Ocupada', reservada: 'Reservada', conta: 'Conta pedida' }

function salao(resposta) {
  if (!resposta) return null
  const ind = resposta.indicadores || {}
  const sessoes = resposta.sessoes || []
  const porMesa = new Map()
  for (const s of sessoes) {
    const id = (s.sessao && s.sessao.mesa_id) || s.mesa_id
    if (id != null) porMesa.set(String(id), s)
  }
  const pediuConta = new Set((resposta.solicitacoes || [])
    .filter((x) => x.tipo === 'conta').map((x) => String(x.mesa_id)))

  const mesas = (resposta.mesas || []).map((m) => {
    const s = porMesa.get(String(m.id))
    const situacao = s
      ? (pediuConta.has(String(m.id)) ? SITUACAO_MESA.conta : SITUACAO_MESA.ocupada)
      : (m.reservada ? SITUACAO_MESA.reservada : SITUACAO_MESA.livre)
    return {
      numero: texto(m.numero),
      lugares: num(m.capacidade),
      situacao,
      desdeMin: s ? minutosDesde(s.sessao && s.sessao.aberta_em) : 0,
      consumo: s ? num(s.total_parcial) : 0,
      garcom: (s && s.sessao && s.sessao.garcom_nome) || null,
      cliente: (s && s.sessao && s.sessao.cliente_nome) || null,
      pessoas: s && s.sessao ? num(s.sessao.n_pessoas) : 0,
    }
  })

  return {
    mesas,
    kpis: {
      mesas: num(ind.ocupadas), mesasTotal: num(ind.mesasTotal),
      ocupacaoPct: num(ind.ocupacaoPct), lugaresOcupados: num(ind.pessoasNoSalao),
      lugaresTotal: num(ind.lugares), consumoAberto: num(ind.consumoAberto),
      ticketAtual: num(ind.ticketAtual), contasSolicitadas: num(ind.contasSolicitadas),
      pedidosProntos: num(ind.prontos),
    },
    qrAbreMesa: false,
  }
}

/** A tela do Atendimento tem sete abas; cada uma vem de uma rota diferente. */
function atendimento({ salaoResp, gorjetasResp, relatorioResp, configResp }) {
  const s = salao(salaoResp)
  const saldos = (gorjetasResp && gorjetasResp.saldos) || []
  return {
    salao: s ? { mesas: s.mesas } : { mesas: [] },
    salaoDetalhado: s,
    solicitacoes: ((salaoResp && salaoResp.solicitacoes) || []).map((x) => ({
      mesa: texto(x.mesa_numero || x.mesa_id),
      tipo: x.tipo === 'conta' ? 'Pediu a conta' : 'Chamou o garçom',
      hora: horaDe(x.criado_em),
      situacao: x.atendida_em ? 'Atendida' : 'Aberta',
    })),
    gorjetas: saldos.map((g) => ({
      nome: texto(g.nome), mesas: num(g.mesas), vendas: num(g.vendas), valor: num(g.saldo || g.valor),
    })),
    relatorios: ((relatorioResp && relatorioResp.itens) || []).map((r) => ({
      nome: texto(r.nome || r.indicador), desc: texto(r.descricao || r.valor),
    })),
    controle: campos(configResp, [
      ['Mesas cadastradas', (c) => (c.mesas_total != null ? c.mesas_total + ' mesas' : null)],
      ['Abertura automática', (c) => (c.abertura_automatica ? 'ao primeiro pedido' : 'manual')],
      ['Garçom pode fechar conta', (c) => (c.garcom_fecha_conta ? 'sim' : 'não')],
    ]),
    taxas: configResp && configResp.taxa_servico_pct != null
      ? [{ nome: 'Taxa de serviço', valor: num(configResp.taxa_servico_pct) + '%',
        aplicacao: configResp.taxa_destino === 'casa' ? 'fica com a casa' : 'dividida com a equipe',
        situacao: num(configResp.taxa_servico_pct) > 0 ? 'Ativa' : 'Inativa' }]
      : [],
    app: campos(configResp, [
      ['Pedido pelo celular', (c) => (c.app_garcom ? 'ativo' : 'desligado')],
      ['Fechar conta pelo app', (c) => (c.garcom_fecha_conta ? 'permitido' : 'só gerente')],
    ]),
  }
}

/** Monta uma lista rótulo/valor pulando o que a API não mandou. */
function campos(fonte, pares) {
  if (!fonte) return []
  return pares.map(([rotulo, ler]) => ({ rotulo, valor: ler(fonte) }))
    .filter((c) => c.valor != null && c.valor !== '')
}

// ── Configurações ───────────────────────────────────────────────────────────
/**
 * Estado do WhatsApp. O painel devolve o estado do Evolution; o modo "web" não tem
 * estado no servidor — quem sabe se a conversa está aberta é a própria janela.
 */
function whatsapp({ statusResp, configResp }) {
  if (!statusResp && !configResp) return null
  const s = statusResp || {}
  const c = configResp || {}
  return {
    estado: s.estado || 'indisponivel',
    // O provedor escolhido vem da CONFIG; o status só sabe do Evolution.
    provedor: c.provedor || s.provedor || 'desativado',
    ativo: c.ativo === true || s.ativo === true,
    numero: c.numero_envio || s.numero || null,
    // Credenciais: as que não são segredo vêm inteiras; das outras vem só se existem.
    evolution_url: c.evolution_url || '',
    evolution_instance: c.evolution_instance || '',
    zapi_instance_id: c.zapi_instance_id || '',
    phone_number_id: c.phone_number_id || '',
    tem_evolution_api_key: !!c.tem_evolution_api_key,
    tem_zapi_token: !!c.tem_zapi_token,
    tem_access_token: !!c.tem_access_token,
    // Servidor Evolution da própria plataforma: não se pede credencial, só o QR.
    evolution_gerenciada: !!c.evolution_gerenciada,
  }
}

function configuracoes({ lojaResp, horariosResp, bairrosResp, usuariosResp, planoResp, whatsappResp }) {
  if (!lojaResp) return null
  const l = lojaResp
  const endereco = l.endereco || {}
  return {
    abas: {
      config: [
        { titulo: '', colunas: 3, campos: [
          { rotulo: 'Nome fantasia / nome da loja', valor: texto(l.nome) },
          { rotulo: 'Razão social', valor: texto(l.empresa_razao_social || l.razao_social) },
          { rotulo: 'Responsável', valor: texto(l.empresa_responsavel || l.responsavel) },
        ] },
        { titulo: 'Documentos e contato', colunas: 3, campos: [
          { rotulo: 'CNPJ', valor: texto(l.empresa_cnpj || l.cnpj) },
          { rotulo: 'Inscrição estadual', valor: texto(l.empresa_ie || l.inscricao_estadual) },
          { rotulo: 'Telefone / WhatsApp', valor: texto(l.telefone || l.whatsapp) },
          { rotulo: 'E-mail', valor: texto(l.empresa_email || l.email) },
          { rotulo: 'Site', valor: texto(l.empresa_site || l.site) },
          { rotulo: 'Descrição', valor: texto(l.descricao) },
        ] },
        { titulo: 'Endereço', colunas: 3, campos: [
          { rotulo: 'Rua / avenida', valor: texto(endereco.rua || l.endereco_logradouro || l.endereco_rua) },
          { rotulo: 'Número', valor: texto(endereco.numero || l.endereco_numero) },
          { rotulo: 'CEP', valor: texto(endereco.cep || l.endereco_cep || l.cep) },
          { rotulo: 'Bairro', valor: texto(endereco.bairro || l.endereco_bairro) },
          { rotulo: 'Cidade', valor: texto(endereco.cidade || l.endereco_municipio || l.cidade) },
          { rotulo: 'UF', valor: texto(endereco.uf || l.endereco_uf || l.uf) },
          { rotulo: 'Complemento', valor: texto(endereco.complemento || l.endereco_complemento) },
          { rotulo: 'Link Google Maps', valor: texto(l.maps_url) },
        ] },
        { titulo: 'Como o cliente pode receber o pedido', colunas: 1, campos: [
          { rotulo: 'Modalidades', valor: modalidades(l) },
        ] },
        { titulo: 'Numeração dos pedidos', colunas: 1, campos: [
          { rotulo: 'Como numera', valor: l.numeracao_diaria === false
            ? 'Sequencial, sem reiniciar' : 'Reinicia todo dia (#1, #2, #3…)' },
        ] },
        { titulo: 'Pix e tempos de atendimento', colunas: 3, campos: [
          { rotulo: 'Chave Pix', valor: texto(l.pix_chave) },
          { rotulo: 'Nome do titular Pix', valor: texto(l.pix_nome || l.pix_titular) },
          { rotulo: 'Tempo retirada (min)', valor: numeroOuVazio(l.tempo_estimado_balcao, l.tempo_retirada) },
          { rotulo: 'Tempo delivery (min)', valor: numeroOuVazio(l.tempo_estimado_delivery, l.tempo_entrega) },
          { rotulo: 'Tempo consumo local (min)', valor: numeroOuVazio(l.tempo_estimado_local, l.tempo_local) },
        ] },
      ],
      horarios: [
        { titulo: 'Funcionamento', colunas: 2, campos: (horariosDaLoja(horariosResp || l.horarios)).concat([
          { rotulo: 'Situação agora', valor: l.aberta ? 'aberta' : 'fechada' },
          { rotulo: 'Fuso da loja', valor: texto(l.timezone) },
        ]) },
      ],
      rotas: rotasDeEntrega(bairrosResp),
      usuario: usuariosDaLoja(usuariosResp),
      plano: planoDaLoja(planoResp),
      gestor: appGestor(l),
      whatsapp: whatsappDaLoja(whatsappResp),
    },
  }
}

/** Rotas de entrega: os bairros atendidos, a taxa de cada um e a entrega grátis. */
function rotasDeEntrega(r) {
  if (!r || !Array.isArray(r.bairros)) return []
  const taxas = r.taxas_bairro || {}
  const daTaxa = (nome) => {
    const t = taxas[nome]
    if (t == null) return null
    return typeof t === 'object' ? t : { taxa: t, ativo: true }
  }
  const campos = r.bairros.map((nome) => {
    const t = daTaxa(nome)
    // Bairro com taxa desligada não cobra — é o que o painel diz no próprio texto.
    const valor = !t ? 'usa a taxa padrão'
      : (t.ativo === false ? 'sem taxa' : brl(t.taxa))
    return { rotulo: nome, valor }
  })
  const geral = [
    { rotulo: 'Taxa padrão', valor: brl(r.taxa_padrao) },
    { rotulo: 'Entrega grátis acima de',
      valor: r.entrega_gratis_valor_min != null ? brl(r.entrega_gratis_valor_min) : 'não usa' },
    { rotulo: 'Bairros atendidos', valor: String(r.bairros.length) },
  ]
  return [
    { titulo: 'Como a taxa é cobrada', colunas: 3, campos: geral },
  ].concat(campos.length ? [{ titulo: 'Taxa por bairro', colunas: 3, campos }] : [])
}

const PAPEL = {
  admin: 'Administrador', dono: 'Administrador', financeiro: 'Financeiro', ti: 'TI',
  contador: 'Contador', garcom: 'Garçom', caixa: 'Caixa', atendente: 'Atendente',
  cozinheiro: 'Cozinheiro', entregador: 'Entregador',
}

/** Quem tem acesso, com a função e por onde entra (e-mail ou CPF). */
function usuariosDaLoja(r) {
  const lista = (r && r.usuarios) || []
  if (!lista.length) return []
  const campos = lista.map((u) => ({
    rotulo: u.nome || 'Sem nome',
    valor: (PAPEL[u.papel] || u.papel || '—') + ' · ' + (u.email || (u.cpf ? 'CPF ' + u.cpf : 'sem acesso ao painel')),
  }))
  return [{ titulo: 'Quem tem acesso (' + lista.length + ')', colunas: 2, campos }]
}

/** Plano da loja: o que se paga, quando vence e quanto do pacote já foi usado. */
function planoDaLoja(r) {
  if (!r || !r.plano) return []
  const p = r.plano, a = r.assinatura || {}, uso = r.uso || {}, prox = r.proximaFatura || {}
  const centavos = (v) => (v == null ? '' : brl(Number(v) / 100))
  const franquia = p.limites && p.limites.franquiaPedidos
  return [
    { titulo: 'Plano', colunas: 3, campos: [
      { rotulo: 'Nome', valor: texto(p.nome) },
      { rotulo: 'Mensalidade', valor: centavos(p.valorCentavos) },
      { rotulo: 'Situação', valor: a.existe ? texto(a.status) : 'sem assinatura' },
    ] },
    { titulo: 'Cobrança', colunas: 3, campos: [
      { rotulo: 'Próximo vencimento', valor: dataBR(a.proximoVenc) },
      { rotulo: 'Em teste até', valor: dataBR(a.trialAte) },
      { rotulo: 'Próxima fatura', valor: prox.mensalidade != null ? brl(prox.mensalidade) : '' },
    ] },
    { titulo: 'Uso do ciclo', colunas: 3, campos: [
      { rotulo: 'Pedidos no ciclo', valor: uso.pedidos != null ? String(uso.pedidos) : '' },
      { rotulo: 'Franquia do plano', valor: franquia != null ? String(franquia) + ' pedidos' : 'sem limite' },
      { rotulo: 'Excedente', valor: prox.excedenteQtd != null ? String(prox.excedenteQtd) + ' pedidos' : '' },
    ] },
  ]
}

const ESTADO_WHATS = {
  open: 'conectado', connecting: 'conectando…', close: 'desconectado',
  sem_config: 'não configurado', indisponivel: 'desligado',
}
const PROVEDOR_WHATS = {
  evolution: 'Evolution (API da plataforma)', cloud_api: 'WhatsApp Cloud API',
  z_api: 'Z-API', wabot: 'WABOT', desativado: 'nenhum',
}

/** WhatsApp: qual caminho está em uso e como está a conexão. */
function whatsappDaLoja(r) {
  if (!r) return []
  // No painel, a aba Configurações › WhatsApp é um LINK para /admin/whatsapp: a
  // configuração e a tela são a mesma coisa. Aqui vale o mesmo — este resumo mostra
  // como está, e o menu WhatsApp é onde se mexe.
  return [{ titulo: 'Conexão', colunas: 3, campos: [
    { rotulo: 'Caminho', valor: PROVEDOR_WHATS[r.provedor] || texto(r.provedor) },
    { rotulo: 'Situação', valor: ESTADO_WHATS[r.estado] || texto(r.estado) },
    { rotulo: 'Envio automático', valor: r.ativo === true ? 'ligado' : 'desligado' },
    { rotulo: 'Onde se configura', valor: 'menu WhatsApp — os mesmos cinco caminhos do painel' },
  ] }]
}

/** App Gestor: não tem API — o endereço sai da marca, como no painel. */
function appGestor(l) {
  const dominio = (require('./brand').dominio_cardapio || '').replace(/^https?:\/\//, '')
  return [{ titulo: 'App Gestor (PWA)', colunas: 2, campos: [
    { rotulo: 'Endereço', valor: dominio ? dominio + '/gestor' : '' },
    { rotulo: 'Como entrar', valor: 'mesmo login e senha do painel' },
    { rotulo: 'Instalação', valor: 'não precisa de loja de aplicativos — salve na tela inicial' },
    { rotulo: 'O que mostra', valor: 'Financeiro, Venda do dia, Fechamento do mês, Estoque, Usuários e Mesas' },
  ] }]
}

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
/**
 * Data de vencimento é DIA, não instante. `new Date('2026-10-01T00:00:00Z')` no fuso
 * do Brasil vira 30/09 — o lojista leria o vencimento um dia antes do que é. Então a
 * parte da data é lida como texto, sem passar por fuso nenhum.
 */
function dataBR(iso) {
  if (!iso) return ''
  const m = ('' + iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return m[3] + '/' + m[2] + '/' + m[1]
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}
function numeroOuVazio() {
  for (const v of arguments) if (v != null && v !== '') return String(v)
  return ''
}

const NOME_MODALIDADE = {
  entrega: 'Entrega', retirada: 'Retirada na loja', balcao: 'Retirada na loja',
  consumo_local: 'Consumir no local', local: 'Consumir no local', mesa: 'Consumir no local',
}
/** A loja guarda as modalidades numa lista (`modalidades_pedido`), não em três flags. */
function modalidades(l) {
  const lista = l.modalidades_pedido
  if (Array.isArray(lista) && lista.length) {
    const vistos = []
    for (const m of lista) {
      const nome = NOME_MODALIDADE[m] || m
      if (nome && vistos.indexOf(nome) < 0) vistos.push(nome)
    }
    return vistos.join(' · ')
  }
  // Formato antigo (três flags), para não quebrar cache guardado nem a demonstração.
  const m = []
  if (l.aceita_entrega !== false) m.push('Entrega')
  if (l.aceita_retirada !== false) m.push('Retirada na loja')
  if (l.aceita_local) m.push('Consumir no local')
  return m.join(' · ')
}
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
function horariosDaLoja(horarios) {
  if (!horarios || typeof horarios !== 'object') return []
  return DIAS_SEMANA.map((nome, i) => {
    const h = horarios[i] || horarios[String(i)] || horarios[nome.toLowerCase()]
    if (!h) return null
    const faixa = h.abre && h.fecha ? h.abre + ' às ' + h.fecha : 'fechado'
    return { rotulo: nome, valor: faixa }
  }).filter(Boolean)
}

// ── Clientes ────────────────────────────────────────────────────────────────
function clientes(lista) {
  if (!Array.isArray(lista)) return null
  const itens = lista.map((c) => ({
    nome: texto(c.nome) || 'Sem nome',
    telefone: texto(c.telefone),
    bairro: texto(c.bairro) || '—',
    segmento: c.segmento || segmentoPor(c),
    pedidos: num(c.total_pedidos || c.pedidos),
    totalGasto: num(c.total_gasto || c.totalGasto),
    ticket: num(c.total_pedidos) ? num(c.total_gasto) / num(c.total_pedidos) : 0,
    freqMes: num(c.freq_mes),
    ultimo: c.ultimo_pedido_em ? rotuloUltimo(c.ultimo_pedido_em) : 'Sem pedido',
    diasSemComprar: c.ultimo_pedido_em ? Math.round(minutosDesde(c.ultimo_pedido_em) / 1440) : null,
    diaFavorito: texto(c.dia_favorito) || '—',
    pontos: num(c.pontos),
    ultimos: [],
  }))
  const comPedido = itens.filter((c) => c.pedidos > 0)
  return {
    itens,
    kpis: {
      unicos: itens.length,
      novos: itens.filter((c) => c.segmento === 'Novo').length,
      recorrentes: comPedido.filter((c) => c.pedidos > 1).length,
      ticketMedio: comPedido.length
        ? comPedido.reduce((s, c) => s + c.ticket, 0) / comPedido.length : 0,
    },
  }
}
function segmentoPor(c) {
  const pedidos = num(c.total_pedidos || c.pedidos)
  if (!pedidos) return 'Importado'
  const dias = c.ultimo_pedido_em ? Math.round(minutosDesde(c.ultimo_pedido_em) / 1440) : 999
  if (pedidos >= 10 && dias <= 30) return 'VIP'
  if (dias > 60) return 'Em risco'
  if (pedidos <= 2) return 'Novo'
  return 'Fiel'
}
function rotuloUltimo(iso) {
  const dias = Math.round(minutosDesde(iso) / 1440)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return 'há ' + dias + ' dias'
}

// ── Gestão / estoque ────────────────────────────────────────────────────────
const TIPO_CATEGORIA = {
  produto_pronto: { id: 'producao', nome: 'Produção Própria' },
  bebida: { id: 'revenda', nome: 'Revenda' },
  insumo: { id: 'insumos', nome: 'Insumos' },
}
function estoque({ ingredientesResp, pendenciasResp, fornecedoresResp }) {
  const itens = Array.isArray(ingredientesResp) ? ingredientesResp : []
  const porTipo = new Map()
  for (const i of itens) {
    const cat = TIPO_CATEGORIA[i.tipo] || TIPO_CATEGORIA.insumo
    if (!porTipo.has(cat.id)) {
      porTipo.set(cat.id, { id: cat.id, nome: cat.nome, mostraMassas: cat.id === 'producao', massas: [],
        subcategorias: [{ nome: cat.nome, itens: [] }] })
    }
    porTipo.get(cat.id).subcategorias[0].itens.push({
      codigo: texto(i.codigo) || '—',
      nome: texto(i.nome),
      cardapio: i.produto_id ? true : (i.tipo === 'bebida' || i.tipo === 'produto_pronto' ? false : undefined),
      fiscalPendente: !!i.fiscal_pendente,
      saldo: num(i.qtd_atual),
      unidade: texto(i.unidade) || 'un',
      minimo: num(i.qtd_minima),
      custo: num(i.custo_unitario || i.custo_medio),
      ativo: i.ativo !== false,
    })
  }
  return {
    categorias: [...porTipo.values()],
    nfEntrada: {
      notas: [],
      pendencias: (Array.isArray(pendenciasResp) ? pendenciasResp : []).map((p) => ({
        problema: rotuloPendencia(p.tipo),
        produto: texto(p.produto_nome || p.descricao),
        qtd: num(p.qtd),
        valor: num(p.valor),
        nota: p.nota_numero ? 'NF ' + p.nota_numero : '—',
        fornecedor: texto(p.fornecedor_nome),
        registrada: diaDe(p.criado_em).split('-').reverse().slice(0, 2).join('/'),
        resolvida: !!p.resolvida_em,
      })),
    },
    fornecedores: (Array.isArray(fornecedoresResp) ? fornecedoresResp : []).map((f) => ({
      nome: texto(f.nome), cnpj: texto(f.cnpj_cpf) || '—', telefone: texto(f.telefone) || '—',
      ultima: f.ultima_compra_em ? diaDe(f.ultima_compra_em).split('-').reverse().slice(0, 2).join('/') : '—',
      mes: num(f.compras_mes),
    })),
  }
}
const PENDENCIA = { falta: 'Falta', avaria: 'Avaria', vencimento: 'Vencimento', divergencia: 'Divergência' }
const rotuloPendencia = (t) => PENDENCIA[t] || 'Pendência'

// ── Parceiros ───────────────────────────────────────────────────────────────
function parceiros(pagamentos) {
  const lista = Array.isArray(pagamentos) ? pagamentos : []
  const porParceiro = new Map()
  for (const p of lista) {
    const nome = texto(p.vendedor_nome || p.parceiro_nome) || 'Sem nome'
    if (!porParceiro.has(nome)) {
      porParceiro.set(nome, { nome, tipo: texto(p.tipo) || 'Parceiro', codigo: texto(p.codigo) || '—',
        pedidos: 0, vendas: 0, comissao: 0, situacao: 'Ativo' })
    }
    const x = porParceiro.get(nome)
    x.pedidos += num(p.pedidos)
    x.vendas += num(p.base_calculo || p.vendas)
    x.comissao += num(p.valor)
  }
  return { itens: [...porParceiro.values()], comissaoPaga: lista.reduce((s, p) => s + num(p.valor), 0) }
}

// ── Campanhas ───────────────────────────────────────────────────────────────
function campanhas({ campanhasResp, configResp }) {
  const c = campanhasResp || {}
  return {
    totalContatos: num(c.totalContatos || c.total_contatos),
    audiencia: num(c.audiencia),
    perfis: c.perfis || {},
    contatos: (c.contatos || []).map((x) => ({
      nome: texto(x.nome), perfil: texto(x.perfil), gasto: num(x.total_gasto || x.gasto),
    })),
    historico: (c.campanhas || c.itens || []).map((x) => ({
      nome: texto(x.nome), perfil: texto(x.perfil) || '—',
      enviada: x.criado_em ? diaDe(x.criado_em).split('-').reverse().slice(0, 2).join('/') : '—',
      contatos: num(x.total), pedidos: num(x.pedidos),
    })),
    numeroEnvio: texto(configResp && configResp.numero) || 'não conectado',
    intervaloSegundos: num(configResp && configResp.intervalo_segundos) || 8,
    cota: num(configResp && configResp.cota),
    cotaUsada: num(configResp && configResp.cota_usada),
  }
}

// ── Fidelidade ──────────────────────────────────────────────────────────────
function fidelidade({ dashboardResp, atividadesResp, configResp }) {
  const d = dashboardResp || {}
  return {
    ativo: configResp ? configResp.ativo !== false : true,
    intervalo: texto(d.intervalo),
    pontosDistribuidos: num(d.pontosDistribuidos || d.pontos_distribuidos),
    pontosResgatados: num(d.pontosResgatados || d.pontos_resgatados),
    emDescontos: num(d.emDescontos || d.em_descontos),
    resgates: num(d.resgates),
    porDia: (d.porDia || d.por_dia || []).map((x) => ({
      dia: texto(x.dia).split('-').reverse().slice(0, 2).join('/'), pontos: num(x.pontos),
    })),
    topGanhos: (d.topGanhos || d.top_ganhos || []).map((x) => ({
      nome: texto(x.cliente_nome || x.nome), telefone: texto(x.cliente_telefone || x.telefone), pontos: num(x.pontos),
    })),
    topResgates: (d.topResgates || d.top_resgates || []).map((x) => ({
      nome: texto(x.cliente_nome || x.nome), telefone: texto(x.cliente_telefone || x.telefone), pontos: num(x.pontos),
    })),
    premios: (d.premios || []).map((x) => ({ nome: texto(x.nome), resgates: num(x.resgates), pontos: num(x.pontos) })),
    atividades: (Array.isArray(atividadesResp) ? atividadesResp : (atividadesResp && atividadesResp.itens) || [])
      .map((a) => ({
        quando: diaDe(a.criado_em).split('-').reverse().slice(0, 2).join('/') + ' ' + horaDe(a.criado_em),
        cliente: texto(a.cliente_nome) || texto(a.cliente_telefone),
        tipo: a.tipo === 'resgate' ? 'Resgate' : 'Ganho',
        pontos: Math.abs(num(a.pontos)),
        pedido: a.pedido_numero ? '#' + a.pedido_numero : '',
      })),
    regras: configResp
      ? { pontosPorReal: num(configResp.pontos_por_real), valorDoPonto: num(configResp.valor_ponto),
        minimoResgate: num(configResp.minimo_resgate), validade: texto(configResp.validade) || 'não expira' }
      : {},
    itens: (d.participantes || []).map((p) => ({
      nome: texto(p.nome), telefone: texto(p.telefone), pontos: num(p.pontos),
      pedidos: num(p.pedidos), proximo: texto(p.proximo) || '—',
    })),
  }
}

module.exports = {
  whatsapp,
  filaDeProducao, juntarAcessoTv, salao, atendimento, configuracoes, clientes,
  estoque, parceiros, campanhas, fidelidade,
  horaDe, diaDe, minutosDesde, campos, horariosDaLoja, segmentoPor, rotuloUltimo,
}
