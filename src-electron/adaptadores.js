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
const { acharPorTelefone, mesmoTelefone } = require('./telefone')

/**
 * Reconhece quem está do outro lado da conversa pelo telefone.
 *
 * Devolve null quando não dá para afirmar — número sem DDD, cadastro sem telefone,
 * nada que bata. Vínculo errado numa conversa mostra o histórico de OUTRA pessoa, e
 * isso é pior do que conversa sem vínculo.
 */
function reconhecer(telefone, cadastro, pedidos) {
  const doCadastro = acharPorTelefone(cadastro, telefone)
  const dele = (pedidos || []).filter((p) => mesmoTelefone(p.telefone, telefone))
  if (!doCadastro && !dele.length) return null

  // O pedido mais recente é o primeiro da lista do painel (ela vem em ordem).
  const ultimo = dele[0] || null
  // ATIVO é o que ainda está andando: quem já foi entregue (ou cancelado, que nem
  // entra no quadro) não precisa ficar ocupando a tela ao lado da conversa.
  const ativo = dele.find((p) => p.etapa && p.etapa !== 'entregue') || null
  return {
    emAndamento: ativo ? {
      // O id é o que permite CORRIGIR o pedido pelo popup da conversa.
      id: ativo.id || null,
      enderecoCampos: ativo.enderecoCampos || null,
      numero: ativo.numero, etapa: ativo.etapa, status: ativo.status || '',
      valor: Number(ativo.valor) || 0, taxa: Number(ativo.taxa) || 0, desconto: Number(ativo.desconto) || 0,
      canal: ativo.canal || '', forma: ativo.forma || ativo.pagamento || '',
      endereco: ativo.endereco || '', hora: ativo.hora || '',
      esperaMin: Number(ativo.esperaMin || ativo.entrouHaMin) || 0,
      itens: ativo.itens || [],
    } : null,
    nome: (doCadastro && doCadastro.nome) || (ultimo && ultimo.cliente) || null,
    cadastrado: !!doCadastro,
    chave: (doCadastro && (doCadastro.chave || doCadastro.telefone)) || telefone,
    pedidos: dele.length,
    // Só conta como "gasto" o que já foi entregue: pedido em produção ainda pode cair.
    gasto: dele.filter((p) => p.etapa === 'entregue')
      .reduce((s, p) => s + (Number(p.valor) || 0), 0),
    ultimoPedido: ultimo ? { numero: ultimo.numero, etapa: ultimo.etapa, valor: Number(ultimo.valor) || 0 } : null,
    bairro: (doCadastro && doCadastro.bairro) || (ultimo && ultimo.bairro) || '',
  }
}

/**
 * O Caixa completo: o resumo (que já vinha) mais as duas abas que só existiam na
 * demonstração — Delivery (de /atendimento/entregas) e Mesas (de /atendimento/salao).
 * Uma rota que falhe não derruba o resumo: a aba fica vazia, o caixa continua.
 */
function caixaCompleto({ resumoResp, entregasResp, salaoResp, semNotaResp }) {
  if (!resumoResp || !Object.prototype.hasOwnProperty.call(resumoResp, 'aberto')) return null
  return { ...resumoResp, entregas: entregasDoCaixa(entregasResp), mesas: mesasDoCaixa(salaoResp),
    nfPendentes: nfPendentes(semNotaResp) }
}

/** As vendas sem nota, como a aba do Caixa precisa. A rota fora do ar não derruba o
 *  Caixa: vem `ativo: false` e a aba simplesmente não aparece — que é o mesmo que
 *  acontece na loja que não emite NFC-e manual. */
function nfPendentes(r) {
  if (!r || r.error || !r.ativo) return { ativo: false, vendas: [] }
  return {
    ativo: true,
    vendas: (Array.isArray(r.vendas) ? r.vendas : []).map((v) => ({
      tipo: v.tipo === 'sessao' ? 'sessao' : 'pedido',
      id: texto(v.id),
      rotulo: texto(v.rotulo) || '—',
      total: num(v.total),
      quando: v.quando,
      dia: v.dia || null,
      forma: v.forma || null,
      cartaoTipo: v.cartaoTipo || null,
      formasConta: Array.isArray(v.formasConta) ? v.formasConta : [],
    })),
  }
}

const ESTADO_ENTREGA = { em_entrega: 'transito', pronto: 'pronto', em_producao: 'preparo', pago: 'preparo' }
function entregasDoCaixa(r) {
  const lista = (r && r.pedidos) || []
  return lista.map((p) => ({
    id: p.id,
    pedido: String(p.numero == null ? '' : p.numero),
    cliente: p.cliente_nome || 'Sem identificação',
    telefone: p.cliente_telefone || '',
    entregador: p.motoboy_nome || '',
    forma: p.forma_pagamento || '',
    pago: !!p.pago_no_ato,
    valor: Number(p.total) || 0,
    trocoPara: p.troco_para == null ? null : Number(p.troco_para),
    tipo: p.tipo || 'entrega',
    // "fechamento" é o motoboy de volta com o dinheiro de um pedido já entregue.
    estado: p.pendente_confirmacao ? 'fechamento' : (ESTADO_ENTREGA[p.status] || 'preparo'),
    saiuHa: minutosDesde(p.saiu_entrega_em || p.criado_em),
    itens: Array.isArray(p.items) ? p.items.map((i) => (Number(i.qtd) || 1) + 'x ' + (i.nome || '')) : [],
  }))
}

function mesasDoCaixa(r) {
  if (!r) return []
  const pediuConta = new Set((r.solicitacoes || []).filter((x) => x.tipo === 'conta').map((x) => String(x.mesa_id)))
  const numeroDe = {}
  for (const m of (r.mesas || [])) numeroDe[String(m.id)] = m.numero
  // Só as mesas com sessão ABERTA: é o que o caixa fecha.
  return (r.sessoes || []).map((s) => {
    const sess = s.sessao || {}
    const situacao = pediuConta.has(String(sess.mesa_id)) ? 'Pediu a conta'
      : (s.prontos_nao_entregues > 0) ? 'Pedido pronto'
      : (s.itens_preparando > 0 || s.itens_pendentes > 0) ? 'Em preparo' : 'Aberta'
    const consumo = Math.round(((Number(s.total_parcial) || 0) - (Number(s.pagamentos_parciais) || 0)) * 100) / 100
    return {
      mesa: texto(numeroDe[String(sess.mesa_id)] != null ? numeroDe[String(sess.mesa_id)] : sess.mesa_id),
      sessaoId: sess.id,
      abertaHa: minutosDesde(sess.aberta_em),
      consumo,
      garcom: s.garcom_nome || null,
      pedidos: Number(s.lancamentos) || 0,
      pessoas: Number(sess.n_pessoas) || null,
      situacao,
      cliente: sess.cliente_nome || null,
    }
  }).sort((a, b) => String(a.mesa).localeCompare(String(b.mesa), 'pt-BR', { numeric: true }))
}

/** Conversas do WhatsApp. Aceita lista pura ou objeto com `conversas`. */
function conversas({ conversasResp, clientesResp, pedidosResp }) {
  if (!conversasResp) return null
  const lista = Array.isArray(conversasResp) ? conversasResp : (conversasResp.conversas || [])
  const cadastro = (clientesResp && (clientesResp.itens || clientesResp.clientes)) || clientesResp || []
  const pedidos = (pedidosResp && (pedidosResp.itens || pedidosResp)) || []
  return {
    agora: Date.now(),
    estado: conversasResp.estado || null,
    provedor: conversasResp.provedor || null,
    conversas: lista.map((c) => ({
      id: c.id || c.telefone || c.nome,
      nome: c.nome || c.cliente_nome || c.telefone || 'Sem nome',
      telefone: c.telefone || '',
      pedido: c.pedido || c.pedido_numero || null,
      // Quem está falando: o telefone da conversa cruzado com o cadastro e os pedidos.
      cliente: reconhecer(c.telefone, cadastro, pedidos),
      naoLidas: Number(c.nao_lidas || c.naoLidas) || 0,
      ultima: c.ultima || c.ultima_mensagem || '',
      ultimaEm: c.ultima_em || c.ultimaEm || null,
      mensagens: (c.mensagens || []).map((m) => ({
        de: m.de || (m.direcao === 'saida' ? 'loja' : 'cliente'),
        texto: m.texto || m.corpo || '',
        em: m.em || m.criado_em || null,
        automatica: !!(m.automatica || m.template),
      })),
    })),
  }
}

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

/** Os sete dias no formato do PATCH /api/admin/horarios — aceita índice (0..6) ou sigla. */
const DIAS_CHAVE = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const DIAS_LONGO = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
function horariosBrutos(src) {
  const h = src && typeof src === 'object' ? (src.horarios && typeof src.horarios === 'object' ? src.horarios : src) : {}
  const saida = {}
  DIAS_CHAVE.forEach((chave, i) => {
    const d = h[chave] || h[i] || h[String(i)] || h[DIAS_LONGO[i]] || null
    saida[chave] = { abre: d && d.abre ? d.abre : null, fecha: d && d.fecha ? d.fecha : null }
  })
  return saida
}

/**
 * O que as fichas de edição precisam — com ids e no formato que as rotas de escrita
 * aceitam. As seções de leitura (`abas`) resumem; aqui é o dado como veio.
 */
function brutoDeConfiguracoes({ lojaResp: l, horariosResp, bairrosResp, formasResp, contasResp, salaoResp, comandaResp, usuariosResp }) {
  const e = l.endereco || {}
  const b = bairrosResp && Array.isArray(bairrosResp.bairros) ? bairrosResp : null
  const taxas = {}
  if (b) {
    for (const nome of Object.keys(b.taxas_bairro || {})) {
      const t = b.taxas_bairro[nome]
      taxas[nome] = typeof t === 'object' && t ? { taxa: num(t.taxa), ativo: t.ativo !== false } : { taxa: num(t), ativo: true }
    }
  }
  const mesas = (salaoResp && (salaoResp.mesas || (salaoResp.salao && salaoResp.salao.mesas))) || []
  const CAMPOS_FORMA = ['id', 'metodo', 'habilitado', 'tipos', 'taxa_extra', 'taxa_extra_tipo', 'observacao', 'bandeiras',
    'recebimento_imediato', 'gera_receber', 'parcelas', 'dias_recebimento', 'tipo_vencimento', 'conta_financeira_id',
    'taxa_operadora_pct', 'taxa_operadora_fixa', 'taxa_observacao']
  return {
    loja: {
      id: texto(l.id), nome: texto(l.nome), telefone: texto(l.telefone || l.whatsapp), mapsUrl: texto(l.maps_url),
      endereco: {
        rua: texto(e.rua || l.endereco_rua), numero: texto(e.numero), complemento: texto(e.complemento),
        bairro: texto(e.bairro), cidade: texto(e.cidade), uf: texto(e.uf), cep: texto(e.cep),
      },
      modalidades: Array.isArray(l.modalidades_pedido) ? l.modalidades_pedido.slice() : [],
      tempos: { balcao: num(l.tempo_estimado_balcao), delivery: num(l.tempo_estimado_delivery), local: num(l.tempo_estimado_local) },
      pixChave: texto(l.pix_chave), modoHorario: texto(l.modo_horario) || 'manual',
      numeracaoDiaria: l.numeracao_diaria === true, aberta: !!l.aberta,
    },
    horarios: horariosBrutos(horariosResp || l.horarios),
    timezone: texto(l.timezone),
    bairros: {
      bairros: b ? b.bairros.map(texto) : [], taxas,
      taxaPadrao: b ? num(b.taxa_padrao) : 0,
      entregaGratisAcima: b && b.entrega_gratis_valor_min != null ? num(b.entrega_gratis_valor_min) : null,
    },
    formas: (Array.isArray(formasResp) ? formasResp : []).map((f) => {
      const o = {}
      for (const k of CAMPOS_FORMA) if (f[k] !== undefined) o[k] = f[k]
      return o
    }),
    contasFinanceiras: (Array.isArray(contasResp) ? contasResp : []).map((c) => ({
      id: texto(c.id), nome: texto(c.nome), tipo: texto(c.tipo) || 'banco', ativo: c.ativo !== false,
      diaFechamento: c.dia_fechamento == null ? null : num(c.dia_fechamento),
      diaVencimento: c.dia_vencimento == null ? null : num(c.dia_vencimento),
    })),
    mesas: mesas.map((m) => ({
      id: texto(m.id), numero: texto(m.numero), capacidade: num(m.capacidade || m.lugares),
      tipo: texto(m.tipo) || 'mesa', reservada: !!m.reservada,
    })),
    comanda: comandaResp && comandaResp.config && typeof comandaResp.config === 'object' ? comandaResp.config : null,
    usuarios: usuariosDaLoja(usuariosResp),
  }
}

function configuracoes({ lojaResp, horariosResp, bairrosResp, usuariosResp, planoResp, whatsappResp, formasResp, contasResp, salaoResp, restoResp, comandaResp }) {
  if (!lojaResp) return null
  const l = lojaResp
  const endereco = l.endereco || {}
  return {
    bruto: brutoDeConfiguracoes({ lojaResp, horariosResp, bairrosResp, formasResp, contasResp, salaoResp, comandaResp, usuariosResp }),
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
      pagamento: formasDePagamento(formasResp, contasResp),
      mesas: mesasDoSalao(salaoResp),
      cardapio: cardapioDaLoja(restoResp),
      fiscal: fiscalDaLoja(restoResp),
      integracoes: integracoesDaLoja(restoResp),
      backup: backupDaLoja(restoResp),
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
/** A equipe da loja. Vem de dois cadastros diferentes e isso IMPORTA na hora de editar:
 *  quem entra por e-mail está em `usuarios_admin`, quem entra por CPF+senha está em
 *  `colaboradores` — rotas diferentes, e mandar para a errada devolve 404 mudo.
 *
 *  ⚠️ Desativado NÃO some: sai da lista de cima e vai para o quadro "Desativados"
 *  (painel, 08/09/2026). Apagar perderia o histórico de quem fez o quê. */
function usuariosDaLoja(r) {
  const lista = (r && r.usuarios) || []
  return lista.map((u) => ({
    id: texto(u.id),
    nome: texto(u.nome) || 'Sem nome',
    papel: texto(u.papel),
    funcao: PAPEL[u.papel] || u.papel || '—',
    email: texto(u.email),
    cpf: texto(u.cpf),
    // Quem tem CPF entra pelo cadastro de colaborador; quem tem e-mail, pelo de admin.
    tipo: u.cpf ? 'colaborador' : 'admin',
    ativo: u.ativo !== false,
  }))
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

/**
 * Mesas do salão. Vem da mesma rota que a tela de Atendimento usa — não há endpoint
 * só de mesas, e criar um seria repetir a consulta.
 *
 * O que a aba mostra é o CADASTRO (quantas mesas, quantos lugares, quantas em uso),
 * não o mapa ao vivo: para acompanhar o salão existe a tela de Atendimento.
 */
const REGIME = {
  1: 'Simples Nacional', 2: 'Simples Nacional, excesso de sublimite', 3: 'Regime Normal',
}

/** Cardápio: as cores e as imagens do cardápio digital. */
function cardapioDaLoja(r) {
  const c = r && r.cardapio
  if (!c) return []
  return [{ titulo: 'Cardápio digital', colunas: 3, campos: [
    { rotulo: 'Cor principal', valor: texto(c.corPrincipal) },
    { rotulo: 'Imagem de capa', valor: c.temCapa ? 'enviada' : 'não enviada' },
    { rotulo: 'Logo', valor: c.temLogo ? 'enviado' : 'não enviado' },
    { rotulo: 'Cores personalizadas', valor: c.coresPersonalizadas
      ? c.coresPersonalizadas + (c.coresPersonalizadas === 1 ? ' cor trocada' : ' cores trocadas')
      : 'usando o padrão' },
    { rotulo: 'Modelo', valor: texto(c.modelo) },
    { rotulo: 'Trocar cores e imagens', valor: 'ainda é pelo painel' },
  ] }]
}

/** Fiscal: o que a SEFAZ exige. Faltando um campo, não sai nota. */
function fiscalDaLoja(r) {
  const f = r && r.fiscal
  if (!f) return []
  const secoes = [{ titulo: 'Dados da empresa', colunas: 3, campos: [
    { rotulo: 'Razão social', valor: texto(f.razaoSocial) },
    { rotulo: 'CNPJ', valor: texto(f.cnpj) },
    { rotulo: 'Inscrição estadual', valor: texto(f.inscricaoEstadual) },
    { rotulo: 'Regime tributário', valor: REGIME[f.regime] || texto(f.regime) },
    { rotulo: 'Município', valor: texto(f.municipio) },
    { rotulo: 'Código IBGE', valor: texto(f.codigoIbge) },
  ] }, { titulo: 'Emissão', colunas: 2, campos: [
    { rotulo: 'CSC da NFC-e', valor: f.temCsc ? 'preenchido' : 'não preenchido' },
    { rotulo: 'Portal do contador', valor: f.contabilConectado ? 'conectado' : 'não conectado' },
  ] }]

  // Dizer "pendente" não ajuda: a tela lista o que falta, um a um.
  if ((f.faltando || []).length) {
    secoes.push({ titulo: 'Falta preencher para emitir nota', colunas: 1, campos: [
      { rotulo: 'Campos', valor: f.faltando.join(' · ') },
    ] })
  }
  return secoes
}

function integracoesDaLoja(r) {
  const i = r && r.integracoes
  if (!i) return []
  return [{ titulo: 'Conectadas', colunas: 2, campos: [
    { rotulo: 'Pixel do Facebook', valor: i.pixelFacebook ? 'configurado' : 'não configurado' },
    { rotulo: 'Portal do contador', valor: i.contabil ? 'conectado' : 'não conectado' },
    { rotulo: 'Conectar outras', valor: 'ainda é pelo painel' },
  ] }]
}

const NOME_ENTIDADE = {
  pedidos: 'Pedidos', clientes: 'Clientes', produtos: 'Produtos', estoque: 'Estoque',
  financeiro: 'Financeiro', cupons: 'Cupons', motoboys: 'Entregadores',
}

function backupDaLoja(r) {
  const b = r && r.backup
  if (!b || !(b.entidades || []).length) return []
  return [{ titulo: 'O que dá para exportar', colunas: 1, campos: [
    { rotulo: 'Dados', valor: b.entidades.map((e) => NOME_ENTIDADE[e] || e).join(' · ') },
    { rotulo: 'Formatos', valor: 'CSV e JSON' },
    { rotulo: 'Baixar', valor: 'ainda é pelo painel' },
  ] }]
}

function mesasDoSalao(r) {
  const mesas = (r && (r.mesas || (r.salao && r.salao.mesas))) || []
  if (!mesas.length) return []
  const ocupadas = mesas.filter((m) => /ocupad|em preparo|pronto|conta/i.test('' + (m.situacao || ''))).length
  const lugares = mesas.reduce((s, m) => s + (Number(m.lugares) || 0), 0)
  const porLugares = {}
  for (const m of mesas) {
    const n = Number(m.lugares) || 0
    porLugares[n] = (porLugares[n] || 0) + 1
  }
  const distribuicao = Object.keys(porLugares).sort((a, b) => a - b)
    .map((n) => porLugares[n] + '× de ' + n + (Number(n) === 1 ? ' lugar' : ' lugares')).join(' · ')

  return [
    { titulo: 'Salão', colunas: 3, campos: [
      { rotulo: 'Mesas cadastradas', valor: String(mesas.length) },
      { rotulo: 'Em uso agora', valor: ocupadas + ' de ' + mesas.length },
      { rotulo: 'Lugares no total', valor: String(lugares) },
    ] },
    { titulo: 'Como as mesas estão montadas', colunas: 1, campos: [
      { rotulo: 'Distribuição', valor: distribuicao },
      { rotulo: 'Cadastrar e imprimir QR', valor: 'ainda é pelo painel' },
    ] },
  ]
}

const NOME_METODO = {
  dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito',
  cartao: 'Cartão', cartao_entrega: 'Cartão na entrega', vale: 'Vale-refeição',
}
const NOME_TIPO = { entrega: 'Delivery', retirada: 'Retirada', balcao: 'Balcão', consumo_local: 'Mesa', mesa: 'Mesa' }

/**
 * Formas de pagamento. O que importa nesta tela é o que muda o dinheiro: quando ele
 * entra (à vista ou em N dias), quanto a operadora leva, o que a loja cobra a mais e
 * para qual conta cai. Forma desligada aparece, mas dizendo que está desligada — não
 * some da lista, senão ninguém entende por que ela não apareceu no checkout.
 */
function formasDePagamento(formas, contas) {
  if (!Array.isArray(formas) || !formas.length) return []
  const nomeDaConta = {}
  for (const c of (Array.isArray(contas) ? contas : [])) nomeDaConta[c.id] = c.nome

  const campos = formas.map((f) => {
    const partes = []
    if (f.habilitado === false) partes.push('desligada')
    partes.push(recebimentoDe(f))
    const taxa = taxaOperadoraDe(f)
    if (taxa) partes.push('operadora ' + taxa)
    const extra = taxaExtraDe(f)
    if (extra) partes.push('taxa extra ' + extra)
    const onde = (f.tipos || []).map((t) => NOME_TIPO[t] || t).filter(Boolean)
    if (onde.length) partes.push(onde.join(' · '))
    const conta = f.conta_financeira_id && nomeDaConta[f.conta_financeira_id]
    if (conta) partes.push('cai em ' + conta)
    return { rotulo: NOME_METODO[f.metodo] || f.metodo, valor: partes.join(' · ') }
  })

  const ligadas = formas.filter((f) => f.habilitado !== false).length
  const secoes = [{ titulo: 'Aceitas no cardápio (' + ligadas + ' de ' + formas.length + ')', colunas: 1, campos }]

  if (Array.isArray(contas) && contas.length) {
    secoes.push({ titulo: 'Contas de destino', colunas: 3, campos: contas.map((c) => ({
      rotulo: c.nome || 'Sem nome', valor: TIPO_CONTA[c.tipo] || texto(c.tipo),
    })) })
  }
  return secoes
}
const TIPO_CONTA = { banco: 'Banco', carteira: 'Carteira/Caixa', gateway: 'Gateway/Repasse' }

/** "À vista" e "recebível em 2 dias úteis" mudam o fluxo de caixa — e a tela diz qual é. */
function recebimentoDe(f) {
  const dias = f.dias_recebimento
  if (f.tipo_vencimento === 'a_vista' || dias == null) return 'à vista'
  return dias === 0 ? 'no mesmo dia' : 'recebível em ' + dias + (dias === 1 ? ' dia útil' : ' dias úteis')
}
function taxaOperadoraDe(f) {
  const p = Number(f.taxa_operadora_pct) || 0
  const v = Number(f.taxa_operadora_fixa) || 0
  const partes = []
  if (p) partes.push(pct(p))
  if (v) partes.push(brl(v))
  return partes.join(' + ')
}
function taxaExtraDe(f) {
  const v = Number(f.taxa_extra) || 0
  if (!v) return ''
  return f.taxa_extra_tipo === 'percentual' ? pct(v) : brl(v)
}
function pct(v) {
  const n = Number(v) || 0
  return (Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')) + '%'
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
const SIGLA_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
function horariosDaLoja(horarios) {
  if (!horarios || typeof horarios !== 'object') return []
  return DIAS_SEMANA.map((nome, i) => {
    // O painel grava por SIGLA (dom, seg…, o formato do PATCH /api/admin/horarios);
    // índice e nome inteiro ficam por compatibilidade.
    const h = horarios[SIGLA_DIA[i]] || horarios[i] || horarios[String(i)] || horarios[nome.toLowerCase()]
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
// Os grupos do painel (lib/estoque/grupos.ts). Duas correções de 09/09/2026:
//  • REVENDA deixou de ser sinônimo de bebida — gelo, sorvete, salgadinho e doce são
//    revenda e caíam em Insumos;
//  • USO E CONSUMO virou grupo próprio: sacola, guardanapo e produto de limpeza só
//    cabiam em "Embalagem", que o sistema trata como insumo de produção — e a DESPESA
//    se misturava com o custo do prato.
const TIPO_CATEGORIA = {
  produto_pronto: { id: 'producao', nome: 'Produção Própria' },
  bebida: { id: 'revenda', nome: 'Revenda' },
  revenda: { id: 'revenda', nome: 'Revenda' },
  ingrediente: { id: 'insumos', nome: 'Insumos' },
  embalagem: { id: 'insumos', nome: 'Insumos' },
  uso_consumo: { id: 'uso_consumo', nome: 'Uso e consumo' },
  insumo: { id: 'insumos', nome: 'Insumos' },
}
const MOVIMENTO = { entrada: 'Entrada', saida: 'Saída', perda: 'Perda', ajuste: 'Ajuste', producao: 'Produção' }

/**
 * As três abas que vêm de /api/admin/desktop/estoque: Movimentações, Fichas técnicas
 * e Nota fiscal (saída). Sem essa rota elas ficavam desenhadas e sem fonte.
 */
function abasDaGestao(r) {
  if (!r) return {}
  const movs = r.movimentacoes || []
  const soma = (t) => movs.filter((m) => m.tipo === t).reduce((s, m) => s + Math.abs(Number(m.qtd) || 0), 0)
  const dias = new Set(movs.map((m) => m.dia).filter(Boolean))

  return {
    movimentacoes: {
      entradasValor: soma('entrada'),
      saidasValor: soma('saida'),
      perdasValor: soma('perda'),
      lancamentos: movs.length,
      produtosMovimentados: new Set(movs.map((m) => m.item)).size,
      diasNoPeriodo: dias.size,
      giro: [],
      itens: movs.map((m) => ({
        data: diaBR(m.dia),
        hora: m.quando || '',
        produto: m.item || '',
        movimento: MOVIMENTO[m.tipo] || m.tipo || '',
        qtd: (Number(m.qtd) || 0) + (m.unidade ? ' ' + m.unidade : ''),
        conversao: '—',
        // null é diferente de zero: "não sei o saldo" não é "saldo zerado".
        saldoApos: m.saldoDepois == null ? null : Number(m.saldoDepois),
        custo: null,
        operador: m.quem || '',
        observacao: m.motivo || '',
      })),
    },
    fichas: {
      itens: (r.fichas || []).map((f) => ({
        produto: f.produto,
        categoria: f.categoria || '',
        preco: Number(f.preco) || 0,
        custo: Number(f.custo) || 0,
        insumos: (f.itens || []).map((i) => ({
          nome: i.ingrediente,
          qtd: (Number(i.qtd) || 0) + (i.unidade ? ' ' + i.unidade : ''),
        })),
      })),
      // Produto que baixa por ficha e não tem ficha: some do estoque sem baixar nada.
      semFicha: r.semFicha || [],
    },
    nfSaida: notasDeSaida(r.notasSaida || []),
  }
}

function notasDeSaida(notas) {
  const ok = (n) => /autoriz/i.test('' + (n.status || ''))
  const falha = (n) => /rejeit|erro|falha|denegad/i.test('' + (n.status || ''))
  const hoje = new Date().toISOString().slice(0, 10)
  const doDia = notas.filter((n) => n.dia === hoje)
  const valor = (lista) => lista.reduce((s, n) => s + (Number(n.valor) || 0), 0)
  return {
    emitidasHoje: doDia.filter(ok).length,
    emitidasHojeValor: valor(doDia.filter(ok)),
    pendentes: notas.filter((n) => !ok(n) && !falha(n)).length,
    pendentesValor: valor(notas.filter((n) => !ok(n) && !falha(n))),
    comFalha: notas.filter(falha).length,
    periodo: notas.filter(ok).length,
    periodoValor: valor(notas.filter(ok)),
    itens: notas.map((n) => ({
      numero: n.numero, serie: n.serie, situacao: n.status,
      valor: Number(n.valor) || 0, quando: n.quando, dia: diaBR(n.dia),
      chave: n.chave, mensagem: n.mensagem,
    })),
  }
}

/** "2026-09-08" → "08/09/2026", sem passar por fuso (é dia, não instante). */
function diaBR(iso) {
  const m = ('' + (iso || '')).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? m[3] + '/' + m[2] + '/' + m[1] : ''
}

/** Quantidade como gente escreve: 0,25 · 1 · 12,5. */
function qtdTexto(v) {
  const n = num(v)
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

/**
 * Fichas técnicas pela rota própria (/api/admin/estoque/fichas): produto, os insumos
 * com id e quantidade, e o custo somado. Os ids são o que a ficha de edição precisa.
 */
function fichasTecnicas(r) {
  if (!r || !Array.isArray(r.produtos)) return null
  const insumoPorId = new Map((Array.isArray(r.insumos) ? r.insumos : []).map((i) => [i.id, i]))
  const catPorId = new Map((Array.isArray(r.categorias) ? r.categorias : []).map((c) => [c.id, texto(c.nome)]))
  const linhasPorProduto = new Map()
  for (const f of (Array.isArray(r.fichas) ? r.fichas : [])) {
    if (!linhasPorProduto.has(f.produto_id)) linhasPorProduto.set(f.produto_id, [])
    linhasPorProduto.get(f.produto_id).push(f)
  }
  const custoDe = (i) => num(i.custo_unitario || i.custo_medio)
  const fichas = r.produtos.map((p) => {
    const linhas = linhasPorProduto.get(p.id) || []
    const insumos = linhas.map((l) => {
      const i = insumoPorId.get(l.ingrediente_id) || {}
      return { id: texto(l.ingrediente_id), nome: texto(i.nome) || 'Insumo sem cadastro', qtdNum: num(l.qtd_consumida),
        unidade: texto(i.unidade) || 'un', qtd: qtdTexto(l.qtd_consumida) + ' ' + (texto(i.unidade) || 'un') }
    })
    const custo = linhas.reduce((s, l) => s + num(l.qtd_consumida) * custoDe(insumoPorId.get(l.ingrediente_id) || {}), 0)
    return { produtoId: texto(p.id), produto: texto(p.nome), categoria: catPorId.get(p.categoria_id) || '—',
      preco: num(p.preco), custo: Math.round(custo * 100) / 100, insumos }
  })
  const insumos = (Array.isArray(r.insumos) ? r.insumos : []).map((i) => ({
    id: texto(i.id), nome: texto(i.nome), unidade: texto(i.unidade) || 'un', custo: custoDe(i),
  }))
  return { fichas, insumos }
}

function estoque({ ingredientesResp, pendenciasResp, fornecedoresResp, gestaoResp, prestadoresResp, fichasResp }) {
  const itens = Array.isArray(ingredientesResp) ? ingredientesResp : []
  const porTipo = new Map()
  for (const i of itens) {
    const cat = TIPO_CATEGORIA[i.tipo] || TIPO_CATEGORIA.insumo
    if (!porTipo.has(cat.id)) {
      porTipo.set(cat.id, { id: cat.id, nome: cat.nome, mostraMassas: cat.id === 'producao', massas: [],
        subcategorias: [{ nome: cat.nome, itens: [] }] })
    }
    porTipo.get(cat.id).subcategorias[0].itens.push({
      // O id é o que a ficha de edição manda de volta; sem ele não há o que editar.
      id: texto(i.id),
      tipo: texto(i.tipo) || 'ingrediente',
      grupo: texto(i.grupo_estoque) || null,
      permiteNegativo: !!i.permite_estoque_negativo,
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
  const ft = fichasTecnicas(fichasResp)
  return {
    ...abasDaGestao(gestaoResp),
    // A rota própria de fichas (já no ar) manda; a da tela do desktop fica de reserva.
    ...(ft ? { fichas: ft.fichas, insumos: ft.insumos } : {}),
    prestadores: prestadoresDaSefaz(prestadoresResp),
    categorias: [...porTipo.values()],
    nfEntrada: {
      notas: [],
      pendencias: (Array.isArray(pendenciasResp) ? pendenciasResp : []).map((p) => ({
        id: texto(p.id),
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
      id: texto(f.id), email: texto(f.email), endereco: texto(f.endereco), observacoes: texto(f.observacoes),
      inscricao: texto(f.inscricao_estadual), tipo: texto(f.tipo) || 'fornecedor', ativo: f.ativo !== false,
      nome: texto(f.nome), cnpj: texto(f.cnpj_cpf) || '—', telefone: texto(f.telefone) || '—',
      ultima: f.ultima_compra_em ? diaDe(f.ultima_compra_em).split('-').reverse().slice(0, 2).join('/') : '—',
      mes: num(f.compras_mes),
    })),
  }
}
/** Gestão › Prestadores de Serviço: a rota devolve prestadores e transportadoras em
 *  duas listas; a tela desenha as duas seções a partir de uma lista só, com o tipo.
 *  Rota fora do ar não derruba a aba — vem lista vazia e a seção diz que não há
 *  documento sincronizado, que é a verdade. */
function prestadoresDaSefaz(resp) {
  if (!resp || resp.error) return []
  const linha = (x, tipo) => ({
    nome: texto(x.nome) || 'Sem nome',
    cnpj: texto(x.cnpj),
    tipo,
    documentos: num(x.documentos),
    valor: num(x.valor),
    ultimo: x.ultimo || null,
    cadastrado: !!x.cadastrado,
    entregador: texto(x.entregador) || null,
  })
  return (Array.isArray(resp.prestadores) ? resp.prestadores : []).map((x) => linha(x, 'prestador'))
    .concat((Array.isArray(resp.transportadoras) ? resp.transportadoras : []).map((x) => linha(x, 'transportadora')))
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

// ── Financeiro ──────────────────────────────────────────────────────────────
/**
 * O Financeiro é a tela do desktop com mais fontes: o grosso vem da rota do desktop
 * (mesma conta do painel) e duas abas têm rota PRÓPRIA no painel — Despesas e Contas
 * bancárias. Cada uma entra por fora, então uma que falhe não apaga as outras oito.
 */
function financeiro({ d, despesasResp, bancosResp }) {
  const base = d && !d.error ? d : {}
  return { ...base, ...despesasDeServico(despesasResp), ...contasBancarias(bancosResp, base) }
}

/** ⛔ Despesa é o GASTO (o que saiu, para quem, se a nota chegou) — não a obrigação.
 *  Sem data de vencimento e sem estado de pagamento aqui de propósito: isso é Contas a
 *  pagar, a aba vizinha. A data da despesa é quando o dinheiro SAIU (`liquidado_em`);
 *  enquanto não saiu, a prevista é o que se sabe. */
function despesasDeServico(resp) {
  if (!resp || resp.error || !Array.isArray(resp.despesas)) return { despesas: [], resumoDespesas: null }
  return {
    despesas: resp.despesas.map((x) => ({
      id: texto(x.id),
      data: diaDe(x.liquidado_em || x.vencimento),
      descricao: texto(x.descricao),
      prestador: texto(x.contraparte) || null,
      valor: num(x.valor),
      fiscal: x.fiscal === 'documentada' || x.fiscal === 'pendente' ? x.fiscal : 'nao_se_aplica',
    })),
    resumoDespesas: resp.resumo || null,
  }
}

/** As contas cadastradas e o que passou por cada uma no período. O movimento sai do
 *  MESMO extrato da aba Extrato (regime de caixa): não é saldo de banco. Extrato sem a
 *  conta na linha devolve movimento vazio — melhor a coluna zerada do que um número
 *  inventado que ninguém consegue conferir. */
function contasBancarias(resp, base) {
  const lista = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.contas) ? resp.contas : [])
  const bancos = lista.filter((c) => c.ativo !== false).map((c) => ({
    id: texto(c.id),
    nome: texto(c.nome) || 'Sem nome',
    tipo: texto(c.tipo) || 'banco',
    diaFechamento: c.dia_fechamento || null,
    diaVencimento: c.dia_vencimento || null,
  }))
  if (Array.isArray(base.movimentoPorConta)) return { bancos, movimentoPorConta: base.movimentoPorConta }
  const por = new Map()
  for (const m of (Array.isArray(base.extrato) ? base.extrato : [])) {
    const id = texto(m.contaId || m.conta_id)
    if (!id) continue
    if (!por.has(id)) por.set(id, { id, movimentos: 0, entradas: 0, saidas: 0 })
    const x = por.get(id)
    x.movimentos += 1
    if (m.direcao === 'saida') x.saidas += num(m.valor)
    else x.entradas += num(m.valor)
  }
  return { bancos, movimentoPorConta: [...por.values()] }
}

/** As posições que o board devolve. `ativo` só quando ALGUM entregador em rota veio na
 *  resposta: o rastreamento é beta por loja, e desenhar a seção vazia faria parecer que
 *  o recurso está quebrado na loja que não o tem. */
function rastreamentoDoBoard(r) {
  const lista = r && !r.error && Array.isArray(r.motoboys) ? r.motoboys : []
  if (!lista.length) return { ativo: false, entregadores: [] }
  return {
    ativo: true,
    entregadores: lista.map((m) => ({
      id: texto(m.id),
      nome: texto(m.nome) || 'Entregador',
      lat: m.rastreamento_lat == null ? null : Number(m.rastreamento_lat),
      lng: m.rastreamento_lng == null ? null : Number(m.rastreamento_lng),
      minutos: m.rastreamento_em ? minutosDesde(m.rastreamento_em) : null,
    })),
  }
}

// ── Entregadores ────────────────────────────────────────────────────────────
/**
 * As três abas da tela, cada uma da sua fonte. Uma fonte que falhe não derruba as
 * outras: sem a rota de entregas a aba Equipe continua de pé, e sem a tela do desktop
 * a prestação de contas continua.
 */
function entregadores({ d, entregasResp, fechamentosResp }) {
  const base = d && !d.error ? d : { itens: [], contadores: { rota: 0, livre: 0 }, entregasHoje: 0 }
  return {
    ...base,
    entregas: entregasDoRelatorio(entregasResp),
    periodo: entregasResp && entregasResp.periodo ? entregasResp.periodo : null,
    fechamentos: fechamentosDeEntrega(fechamentosResp),
  }
}

/** Entrega a entrega, como a prestação de contas precisa.
 *  ⚠️ `troco` e `aPrestar` vêm PRONTOS do servidor: o troco sai do caixa e volta na mão
 *  do entregador (pedido de 50 com troco para 100 volta com a nota de 100), e refazer
 *  essa conta aqui criaria um segundo acerto, diferente do que o painel paga. */
function entregasDoRelatorio(r) {
  if (!r || r.error || !Array.isArray(r.entregas)) return []
  return r.entregas.map((e) => ({
    id: texto(e.id),
    numero: num(e.numero),
    // ⚠️ `data` já vem no dia da LOJA (a rota resolve o fuso). Passá-la por diaDe()
    // reinterpreta como UTC e joga a entrega para o dia anterior — uma entrega das
    // 21h30 em GMT-3 viraria 00h30 do dia seguinte, e o acerto fecharia no dia errado.
    data: /^\d{4}-\d{2}-\d{2}/.test('' + (e.data || ''))
      ? ('' + e.data).slice(0, 10)
      : diaDe(e.data || e.entregue_em || e.criado_em),
    cliente: texto(e.cliente_nome) || 'Sem identificação',
    entregadorId: texto(e.motoboy_id),
    entregador: texto(e.motoboy_nome || e.entregador) || 'Sem entregador',
    produtos: num(e.produtos),
    taxaEntrega: num(e.taxa_entrega),
    total: num(e.total),
    troco: num(e.troco),
    aPrestar: num(e.aPrestar),
    forma: texto(e.forma),
    pagoAntes: !!e.pagoAntes,
    emRota: !!e.emRota,
    pagamentos: Array.isArray(e.pagamentos)
      ? e.pagamentos.map((p) => ({ forma: texto(p.forma), valor: num(p.valor) })) : [],
  }))
}

/** Os períodos já fechados. ⚠️ Na cobertura de folga quem cobriu recebe, mas a NOTA sai
 *  no nome do TITULAR — por isso os dois nomes viajam juntos. */
function fechamentosDeEntrega(r) {
  const lista = r && !r.error && Array.isArray(r.fechamentos) ? r.fechamentos : []
  return lista.map((f) => ({
    id: texto(f.id),
    entregadorId: texto(f.motoboy_id),
    entregador: texto(f.motoboy && f.motoboy.nome) || '—',
    titular: (f.titular && texto(f.titular.nome)) || null,
    periodoInicio: f.periodo_inicio || null,
    periodoFim: f.periodo_fim || null,
    entregas: num(f.entregas),
    valor: num(f.valor),
    vencimento: (f.conta && f.conta.vencimento) || f.vencimento || null,
    // Sem conta lançada não há situação: a tela diz "Não lançado", que é a verdade.
    situacao: f.conta ? texto(f.conta.status) : null,
  }))
}

module.exports = {
  // Formatadores das abas de Configurações: a demonstração redesenha com os mesmos.
  rotasDeEntrega, formasDePagamento, mesasDoSalao, horariosDaLoja, usuariosDaLoja, fichasTecnicas,
  caixaCompleto, entregasDoCaixa, mesasDoCaixa, nfPendentes,
  entregadores, entregasDoRelatorio, fechamentosDeEntrega, rastreamentoDoBoard,
  financeiro, despesasDeServico, contasBancarias, prestadoresDaSefaz,
  whatsapp,
  conversas,
  filaDeProducao, juntarAcessoTv, salao, atendimento, configuracoes, clientes,
  estoque, parceiros, campanhas, fidelidade,
  horaDe, diaDe, minutosDesde, campos, horariosDaLoja, segmentoPor, rotuloUltimo,
}
