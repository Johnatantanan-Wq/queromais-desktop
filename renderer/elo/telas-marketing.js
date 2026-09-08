// renderer/elo/telas-marketing.js — Cupons, Campanhas, Push, Parceiros e Fidelidade.
//
// Desenhadas olhando as telas reais do painel (Du Pellegrini, 07/09). São telas de
// marketing: cada uma tem um FORMULÁRIO em pé de igualdade com a lista, porque o dono
// entra aqui para criar (um cupom, um disparo), não para conferir número.
//
// No app elas são de leitura: criar e disparar continuam no painel — mas a tela mostra
// exatamente o que o painel mostra, inclusive os campos, para ninguém precisar
// adivinhar o que existe do outro lado.

const L = require('./tela-lista')
const esc = L.esc

function brl(v) {
  const n = Number(v)
  return 'R$ ' + (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const semDados = (o) => '<div class="ecard"><div class="evazio">Sem dados ' + o + ' ainda.<br>'
  + 'Quando o app falar com o painel, esta tela aparece aqui.</div></div>'

function botao(acao, rotulo, primaria, largo) {
  return '<button type="button" data-acao="' + esc(acao) + '" style="height:36px;padding:0 16px;border-radius:10px;'
    + 'font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;white-space:nowrap;'
    + (largo ? 'width:100%;' : '') + (primaria
      ? 'border:none;background:var(--acento);color:#fff'
      : 'border:1px solid #e5e7eb;background:#fff;color:#111') + '">' + esc(rotulo) + '</button>'
}
function topo(titulo, sub, direita, selo) {
  return '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;'
    + 'flex-wrap:wrap;margin-bottom:18px">'
    + '<div><div style="font-size:19px;font-weight:800;color:#111;letter-spacing:-.02em">' + esc(titulo)
    + (selo ? '<span style="margin-left:10px;font-size:11.5px;font-weight:800;color:var(--acento-texto);'
      + 'background:var(--acento-suave);border-radius:999px;padding:3px 10px;vertical-align:middle">' + esc(selo) + '</span>' : '')
    + '</div>'
    + (sub ? '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:4px;line-height:1.5">' + sub + '</div>' : '')
    + '</div>' + (direita || '') + '</div>'
}
function cartao(titulo, sub, corpo, atraso) {
  return '<div class="ecard" style="padding:0;overflow:hidden;animation:eloFadeUp .5s ease ' + (atraso || 0) + 's both">'
    + '<div style="padding:16px 20px;border-bottom:1px solid #eef0f3">'
    + '<div style="font-size:14.5px;font-weight:800;color:#111">' + esc(titulo) + '</div>'
    + (sub ? '<div style="font-size:11.5px;color:#9ca3af;font-weight:500;margin-top:2px">' + esc(sub) + '</div>' : '')
    + '</div>' + corpo + '</div>'
}
/** Campo do formulário do painel: rótulo em caixa alta, caixa desenhada, valor de exemplo. */
function campo(rotulo, exemplo, valor, largura) {
  return '<div style="min-width:0' + (largura ? ';width:' + largura : '') + '">'
    + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;'
    + 'margin-bottom:6px">' + esc(rotulo) + '</div>'
    + '<div style="min-height:36px;border:1px solid #e5e7eb;border-radius:9px;background:#fff;display:flex;'
    + 'align-items:center;padding:8px 11px;font-size:13px;font-weight:' + (valor ? '600;color:#111' : '500;color:#c4c8cf')
    + ';line-height:1.4">' + esc(valor || exemplo) + '</div></div>'
}
function marcador(rotulo, explicacao) {
  return '<div style="display:flex;gap:9px;align-items:flex-start;padding:7px 0">'
    + '<span style="width:15px;height:15px;border:1.5px solid #d0d4db;border-radius:4px;flex-shrink:0;margin-top:1px"></span>'
    + '<div><div style="font-size:13px;font-weight:700;color:#111">' + esc(rotulo) + '</div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:500;margin-top:1px">' + esc(explicacao) + '</div></div></div>'
}
function kpi(rotulo, valor, sub, cor) {
  return '<div class="ecard" style="padding:14px 18px;min-width:0">'
    + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px">'
    + esc(rotulo) + '</div>'
    + '<div style="font-size:24px;font-weight:800;color:' + (cor || '#111') + ';letter-spacing:-.03em;line-height:1">'
    + esc(valor) + '</div>'
    + (sub ? '<div style="font-size:11px;color:#9ca3af;font-weight:600;margin-top:6px">' + esc(sub) + '</div>' : '') + '</div>'
}
const faixaKpis = (lista) => '<div style="display:grid;grid-template-columns:repeat(' + lista.length
  + ',minmax(0,1fr));gap:14px;margin-bottom:18px">' + lista.map((k) => kpi(k.r, k.v, k.s, k.c)).join('') + '</div>'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const CORES_CUPOM = ['#14CE6B', '#d19b0e', '#ea6a20', '#e04343', '#2f7ff0', '#9b5de5']

// ── Cupons ──────────────────────────────────────────────────────────────────
function htmlCupons(dados, estado) {
  if (!dados) return semDados('de cupons')
  const itens = dados.itens || []
  const ativos = itens.filter((c) => c.situacao === 'Ativo').length

  const lista = itens.length
    ? itens.map((c) => '<div data-linha="' + esc(c.codigo) + '" style="display:flex;align-items:center;gap:12px;'
      + 'padding:13px 20px;border-bottom:1px solid #eef0f3;cursor:pointer">'
      + '<span style="width:8px;height:34px;border-radius:4px;background:' + esc(c.cor || CORES_CUPOM[0]) + ';flex-shrink:0"></span>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:14px;font-weight:800;color:#111;letter-spacing:.02em">' + esc(c.codigo) + '</div>'
      + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600;margin-top:2px">' + esc(c.desconto)
      + ' · vale até ' + esc(c.validade) + ' · ' + esc(c.usos) + ' uso(s)'
      + (c.primeiraCompra ? ' · só 1ª compra' : '') + (c.freteGratis ? ' · frete grátis' : '') + '</div></div>'
      + '<span style="font-size:10.5px;font-weight:800;border-radius:6px;padding:3px 9px;'
      + (c.situacao === 'Ativo' ? 'color:var(--acento-texto);background:var(--acento-suave)' : 'color:#6b7280;background:#eef0f3')
      + '">' + esc(c.situacao) + '</span></div>').join('')
    : '<div class="evazio">Nenhum cupom cadastrado.</div>'

  const formulario = '<div style="padding:20px;display:flex;flex-direction:column;gap:14px">'
    + campo('Código (sem espaços)', 'PEDIU10')
    + campo('Descrição (opcional)', '10% off na primeira compra')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + campo('Tipo', '% Percentual') + campo('Desconto (%)', '10') + '</div>'
    + campo('Pedido mínimo (R$ — opcional)', '0')
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + campo('Válido de', 'dd/mm/aaaa') + campo('Válido até', 'dd/mm/aaaa') + '</div>'
    + campo('Limite de usos (opcional)', 'Ex: 100')
    + '<div><div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;'
    + 'margin-bottom:7px">Dias da semana (opcional — em branco vale todo dia)</div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap">' + DIAS.map((d) =>
      '<span style="font-size:12px;font-weight:700;color:#4b5563;border:1px solid #e5e7eb;border-radius:8px;'
      + 'padding:5px 11px">' + d + '</span>').join('') + '</div></div>'
    + '<div>' + marcador('Cupom de primeira compra', 'Só vale pra quem nunca comprou nesta loja.')
    + marcador('Aparece no cardápio', 'Mostra este cupom em destaque na vitrine pública, acima das categorias.')
    + marcador('Frete grátis', 'Isenta a taxa de entrega inteira. Cupom passa a ser só de frete grátis, sem desconto no pedido.')
    + '</div>'
    + '<div><div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;'
    + 'margin-bottom:7px">Cor do cupom na vitrine</div>'
    + '<div style="display:flex;gap:8px">' + CORES_CUPOM.map((c, i) =>
      '<span style="width:26px;height:26px;border-radius:50%;background:' + c
      + (i === 0 ? ';box-shadow:0 0 0 2px #fff,0 0 0 4px ' + c : '') + '"></span>').join('') + '</div></div>'
    + botao('cupom:criar', '+ Criar cupom', true, true) + '</div>'

  return topo('Cupons', itens.length + ' cupom(ns) cadastrado(s) · ' + ativos + ' ativo(s)')
    + '<div style="display:grid;grid-template-columns:1fr minmax(320px,400px);gap:18px;align-items:start">'
    + cartao('Cadastrados', '', lista)
    + cartao('Novo cupom', '', formulario, 0.05) + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
    + 'criar e editar cupom ainda são pelo painel</div>'
}

// ── Campanhas via WhatsApp ──────────────────────────────────────────────────
const PERFIS = [
  { chave: 'vip', nome: 'VIP', desc: '10+ pedidos, ativo' },
  { chave: 'leal', nome: 'Leal', desc: '5+ pedidos, comprador regular' },
  { chave: 'novo', nome: 'Novo', desc: '1ª ou 2ª compra recente' },
  { chave: 'risco', nome: 'Em risco', desc: '30–60 dias sem comprar' },
  { chave: 'perdido', nome: 'Perdido', desc: 'Mais de 60 dias sumido' },
  { chave: 'regular', nome: 'Regular', desc: 'Sem padrão definido' },
  { chave: 'importado', nome: 'Importado', desc: 'Cadastro migrado — nunca recebeu mensagem, envie com cautela' },
]
const ABAS_CAMPANHA = [
  { chave: 'nova', rotulo: 'Nova campanha' }, { chave: 'historico', rotulo: 'Histórico' },
  { chave: 'config', rotulo: 'Configurações' },
]

function htmlCampanhas(dados, estado) {
  estado = estado || {}
  if (!dados) return semDados('de campanhas')
  const aba = ABAS_CAMPANHA.some((a) => a.chave === estado.abaCampanha) ? estado.abaCampanha : 'nova'
  const contagens = dados.perfis || {}
  const total = dados.totalContatos != null ? dados.totalContatos : (dados.contatos || []).length
  // Escolher um perfil MUDA a audiência: é a conta que o painel faz e o motivo de os
  // cartões terem contagem. Sem perfil escolhido, vale a audiência cheia.
  const perfil = estado.perfil && PERFIS.some((p) => p.chave === estado.perfil) ? estado.perfil : null
  const nomePerfil = perfil ? (PERFIS.find((p) => p.chave === perfil) || {}).nome : null
  const contatos = perfil
    ? (dados.contatos || []).filter((c) => c.perfil === nomePerfil)
    : (dados.contatos || [])
  const audiencia = perfil
    ? (Number(contagens[perfil]) || 0)
    : (dados.audiencia != null ? dados.audiencia : (dados.contatos || []).length)

  const barraAbas = '<div style="display:flex;gap:18px;border-bottom:1px solid #e8eaee;margin-bottom:18px">'
    + ABAS_CAMPANHA.map((a) => '<button type="button" data-aba-campanha="' + esc(a.chave) + '"'
      + ' style="border:none;background:none;font-family:inherit;cursor:pointer;padding:0 0 10px;font-size:13px;'
      + (a.chave === aba
        ? 'font-weight:800;color:var(--acento-texto);box-shadow:inset 0 -2px 0 var(--acento)'
        : 'font-weight:600;color:#6b7280') + '">' + esc(a.rotulo) + '</button>').join('') + '</div>'

  const comoFunciona = '<div style="background:var(--acento-suave);border-radius:10px;padding:12px 16px;margin-bottom:16px;'
    + 'font-size:12.5px;color:var(--acento-texto);font-weight:500;line-height:1.55">'
    + '<strong>Como funciona:</strong> escolha o perfil de clientes, escreva a mensagem com variáveis e dispare. '
    + 'A lista é sempre sincronizada com o banco — novos clientes que se cadastrarem já entram nos próximos disparos.</div>'

  const cabecalho = topo('Campanhas via WhatsApp', '', '', total + ' contatos') + comoFunciona + barraAbas

  if (aba === 'historico') {
    const envios = dados.historico || []
    return cabecalho + cartao('Disparos feitos', 'o que já saiu para os clientes',
      envios.length
        ? L.apenasGrade({ colunas: ['Campanha', 'Perfil', 'Enviada', 'Contatos', 'Pedidos'],
          grade: '1fr 150px 120px 110px 110px', direita: [3, 4] },
        envios.map((e) => ({ chave: e.nome, celulas: [{ texto: e.nome, forte: true, cor: '#111' },
          e.perfil, e.enviada, String(e.contatos), String(e.pedidos)] })))
        : '<div class="evazio">Nenhuma campanha disparada ainda.</div>')
  }
  if (aba === 'config') {
    return cabecalho + cartao('Configurações do disparo', 'como as mensagens saem',
      '<div style="padding:20px;display:flex;flex-direction:column;gap:14px">'
      + campo('Número que envia', '', dados.numeroEnvio || 'não conectado')
      + campo('Intervalo entre mensagens', '', (dados.intervaloSegundos || 8) + ' segundos')
      + campo('Cota do mês', '', (dados.cotaUsada || 0) + ' de ' + (dados.cota || 0) + ' disparos')
      + '</div>')
  }

  const passos = '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap">'
    + [['1', 'Audiência', true], ['2', 'Mensagem', false], ['3', 'Revisar e disparar', false]].map((p) =>
      '<span style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:'
      + (p[2] ? '800;color:var(--acento-texto)' : '600;color:#9ca3af') + '">'
      + '<span style="width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;'
      + 'font-size:11.5px;font-weight:800;' + (p[2] ? 'background:var(--acento);color:#fff' : 'background:#eef0f3;color:#9ca3af')
      + '">' + p[0] + '</span>' + esc(p[1]) + '</span>').join('<span style="flex:1;height:1px;background:#e8eaee;min-width:20px"></span>')
    + '</div>'

  const cartoesPerfil = '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">'
    + PERFIS.map((p) => {
      const n = Number(contagens[p.chave]) || 0
      const escolhido = p.chave === perfil
      return '<div data-perfil-campanha="' + esc(p.chave) + '" style="border:'
        + (escolhido ? '2px solid var(--acento)' : '1px solid #e5e7eb') + ';border-radius:12px;'
        + 'padding:' + (escolhido ? '12px 14px' : '13px 15px') + ';cursor:pointer;min-width:0;background:'
        + (escolhido ? 'var(--acento-suave)' : '#fff') + '">'
        + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">'
        + '<span style="font-size:13.5px;font-weight:800;color:#111">' + esc(p.nome) + '</span>'
        + '<span style="font-size:12.5px;font-weight:800;color:' + (n ? 'var(--acento-texto)' : '#c4c8cf') + '">' + n + '</span></div>'
        + '<div style="font-size:11.5px;color:#9ca3af;font-weight:500;margin-top:3px;line-height:1.4">' + esc(p.desc) + '</div></div>'
    }).join('') + '</div>'

  const filtrosAudiencia = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px">'
    + campo('Dias sem comprar (mín.)', '0 = qualquer') + campo('Gasto mínimo (R$)', '0 = qualquer') + '</div>'

  const painelAudiencia = '<div class="ecard" style="padding:0;overflow:hidden">'
    + '<div style="padding:16px 18px;border-bottom:1px solid #eef0f3">'
    + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em">Audiência atual</div>'
    + '<div style="font-size:30px;font-weight:800;color:#111;letter-spacing:-.03em;line-height:1.1;margin-top:6px">'
    + audiencia + '</div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600">de ' + total + ' contatos'
    + (nomePerfil ? ' · perfil ' + esc(nomePerfil) : '') + '</div></div>'
    + (contatos.length ? contatos.map((c) => '<div style="padding:11px 18px;border-bottom:1px solid #f4f5f7">'
      + '<div style="font-size:13px;font-weight:700;color:#111">' + esc(c.nome) + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px;margin-top:3px">'
      + '<span style="font-size:10.5px;font-weight:800;color:var(--acento-texto);background:var(--acento-suave);'
      + 'border-radius:5px;padding:2px 7px">' + esc(c.perfil) + '</span>'
      + '<span style="font-size:11.5px;color:#9ca3af;font-weight:600">' + esc(brl(c.gasto)) + '</span></div></div>').join('')
      : '<div class="evazio">Nenhum contato no perfil escolhido.</div>')
    + '</div>'

  return cabecalho + passos
    + '<div style="display:grid;grid-template-columns:1fr minmax(260px,320px);gap:18px;align-items:start">'
    + '<div class="ecard" style="padding:20px 22px">'
    + '<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:4px">1. Quem vai receber?</div>'
    + '<div style="font-size:10.5px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin:12px 0 8px">'
    + 'Perfil do cliente <span style="text-transform:none;letter-spacing:0;font-weight:500">(nenhum = todos)</span></div>'
    + cartoesPerfil + filtrosAudiencia
    + '<div style="margin-top:18px">' + botao('campanha:continuar', 'Continuar com ' + audiencia + ' contatos →', true, true) + '</div>'
    + '</div>' + painelAudiencia + '</div>'
    + '<div style="font-size:12px;color:#9ca3af;font-weight:600;padding-top:14px">'
    + 'escrever e disparar a campanha ainda são pelo painel</div>'
}

// ── Push ────────────────────────────────────────────────────────────────────
function htmlPush(dados, estado) {
  if (!dados) return semDados('de notificações')
  const envios = dados.itens || []

  const formulario = '<div style="padding:20px;display:flex;flex-direction:column;gap:14px">'
    + campo('Título da notificação *', 'Ex.: Promoção de quinta 🔥')
    + campo('Mensagem *', 'Ex.: Hoje tem 20% OFF em toda pizza grande. Só até meia-noite!')
    + campo('Link ao clicar *', 'Ex.: https://seudominio.com/cardapio')
    + '<div style="font-size:10.5px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;line-height:1.5">'
    + 'Pra onde o cliente vai ao tocar na notificação — link do cardápio, de um cupom, de uma promoção. '
    + 'Sai rastreado: cliques e vendas aparecem no histórico abaixo.</div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
    + botao('push:enviar', 'Enviar agora', true) + botao('push:previsualizar', 'Pré-visualizar', false) + '</div>'
    + (dados.inscritos ? '' : '<div style="font-size:12px;color:#9ca3af;font-weight:500">'
      + 'Nenhum cliente inscrito ainda — o sininho de notificações aparece no cardápio pra quem ainda não decidiu.</div>')
    + '</div>'

  const dicas = '<div class="ecard" style="padding:18px 20px;margin-bottom:14px">'
    + '<div style="font-size:14px;font-weight:800;color:#111;margin-bottom:12px">💡 Dicas para melhores resultados</div>'
    + ['Seja direto e destaque o benefício', 'Inclua um link ou cupom exclusivo',
      'Use urgência (prova social quando possível)', 'Evite mensagens muito longas'].map((t) =>
      '<div style="display:flex;gap:9px;align-items:flex-start;padding:4px 0;font-size:12.5px;color:#4b5563;font-weight:600">'
      + '<span style="color:var(--acento-texto);font-weight:800">✓</span>' + esc(t) + '</div>').join('')
    + '</div>'

  const previa = '<div class="ecard" style="padding:18px 20px">'
    + '<div style="font-size:14px;font-weight:800;color:#111;margin-bottom:12px">Pré-visualização</div>'
    + '<div style="border:1px solid #e8eaee;border-radius:12px;padding:12px 14px;background:#fff">'
    + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">'
    + '<span style="font-size:11.5px;color:#9ca3af;font-weight:700">' + esc(dados.loja || 'Sua loja') + '</span>'
    + '<span style="font-size:11px;color:#c4c8cf;font-weight:600">agora</span></div>'
    + '<div style="font-size:13.5px;font-weight:800;color:#111;margin-top:4px">Título da notificação</div>'
    + '<div style="font-size:12.5px;color:#6b7280;font-weight:500;margin-top:2px">A mensagem aparece aqui conforme você digita.</div>'
    + '<div style="font-size:11px;color:#c4c8cf;font-weight:600;margin-top:6px">' + esc(dados.dominio || '') + '</div></div>'
    + '<div style="font-size:11.5px;color:#9ca3af;font-weight:500;margin-top:10px">A aparência pode variar conforme o navegador.</div>'
    + '</div>'

  const kpis = faixaKpis([
    { r: 'Push enviados', v: String(dados.enviados || 0), s: 'Total de envios' },
    { r: 'Cliques', v: String(dados.cliques || 0), s: 'Total de cliques' },
    { r: 'Vendas convertidas', v: String(dados.vendas || 0), s: 'Total de vendas' },
    { r: 'Faturamento via push', v: brl(dados.faturamento), s: 'Total gerado', c: 'var(--acento-texto)' },
  ])

  const historico = cartao('Histórico de envios', '',
    envios.length
      ? L.apenasGrade({ colunas: ['Título', 'Enviada', 'Alcance', 'Cliques', 'Vendas'],
        grade: '1fr 130px 110px 110px 110px', direita: [2, 3, 4] },
      envios.map((e) => ({ chave: e.titulo, celulas: [{ texto: e.titulo, forte: true, cor: '#111' },
        e.enviada, String(e.alcance), String(e.cliques), String(e.vendas)] })))
      : '<div style="padding:50px 20px;text-align:center">'
        + '<div style="font-size:26px;margin-bottom:10px">📂</div>'
        + '<div style="font-size:14px;font-weight:800;color:#111">Nenhum envio ainda.</div>'
        + '<div style="font-size:12.5px;color:#9ca3af;font-weight:500;margin-top:4px">'
        + 'Quando você enviar sua primeira notificação, ela aparecerá aqui.</div></div>', 0.09)

  return topo('Push', 'Envie promoções, cupons e novidades diretamente no navegador do cliente.<br>'
    + 'Canal separado do WhatsApp, não conta na cota de disparo.', botao('push:como-funciona', 'ⓘ Como funciona?', false))
    + '<div style="display:grid;grid-template-columns:1fr minmax(280px,360px);gap:18px;align-items:start;margin-bottom:18px">'
    + cartao('Enviar notificação push', (dados.inscritos || 0) + ' clientes inscritos', formulario)
    + '<div>' + dicas + previa + '</div></div>'
    + kpis + historico
}

// ── Parceiros ───────────────────────────────────────────────────────────────
function htmlParceiros(dados, estado) {
  if (!dados) return semDados('de parceiros')
  const itens = dados.itens || []
  const ativos = itens.filter((p) => p.situacao !== 'Inativo').length
  const vendas = itens.reduce((s, p) => s + (Number(p.vendas) || 0), 0)
  const comissao = itens.reduce((s, p) => s + (Number(p.comissao) || 0), 0)
  const pedidos = itens.reduce((s, p) => s + (Number(p.pedidos) || 0), 0)
  const ticket = pedidos ? vendas / pedidos : 0

  const kpis = faixaKpis([
    { r: 'Parceiros ativos', v: String(ativos), s: 'de ' + itens.length + ' cadastrados' },
    { r: 'Vendas geradas', v: brl(vendas), s: 'no mês' },
    { r: 'Comissão total', v: brl(comissao), s: 'a pagar aos parceiros' },
    { r: 'Ticket médio', v: brl(ticket), s: 'por pedido indicado' },
  ])

  const tabela = itens.length
    ? L.apenasGrade({ colunas: ['Parceiro', 'Tipo', 'Código', 'Faturamento', 'Comissão', 'Pedidos', 'Situação'],
      grade: '1fr 130px 110px 150px 140px 100px 120px', direita: [3, 4, 5] },
    itens.map((p) => ({ chave: p.nome, celulas: [{ texto: p.nome, forte: true, cor: '#111' },
      p.tipo || 'Parceiro', p.codigo, { texto: brl(p.vendas), forte: true, cor: '#111' },
      { texto: brl(p.comissao), forte: true, cor: 'var(--acento-texto)' }, String(p.pedidos),
      { texto: p.situacao || 'Ativo', etiqueta: (p.situacao === 'Inativo' ? 'cinza' : 'verde') }] })))
    : '<div class="evazio">Nenhum parceiro encontrado.</div>'

  // Faturamento por tipo: quem indica mais — influenciador, vendedor ou parceiro fixo
  const porTipo = {}
  itens.forEach((p) => { const t = p.tipo || 'Parceiro'; porTipo[t] = (porTipo[t] || 0) + (Number(p.vendas) || 0) })
  const tipos = ['Influencer', 'Vendedor', 'Parceiro'].concat(Object.keys(porTipo).filter((t) =>
    ['Influencer', 'Vendedor', 'Parceiro'].indexOf(t) < 0))
  const totalTipos = vendas || 1
  const blocoTipos = '<div style="padding:18px 20px">' + tipos.map((t) => {
    const v = porTipo[t] || 0
    return '<div style="padding:6px 0">'
      + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:5px">'
      + '<span style="font-size:13px;font-weight:700;color:#111">' + esc(t) + '</span>'
      + '<span style="font-size:13px;font-weight:800;color:#111">' + esc(brl(v))
      + '<span style="font-size:11.5px;color:#9ca3af;font-weight:600"> (' + Math.round((v / totalTipos) * 100) + '%)</span></span></div>'
      + '<div style="height:7px;border-radius:4px;background:#eef0f3;overflow:hidden">'
      + '<div style="height:100%;width:' + ((v / totalTipos) * 100).toFixed(1) + '%;background:var(--acento);border-radius:4px"></div>'
      + '</div></div>'
  }).join('')
    + '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;text-align:center;'
    + 'border-top:1px solid #eef0f3;margin-top:14px;padding-top:14px">'
    + [[itens.length, 'Total cadastrados'], [ativos, 'Ativos'], [pedidos, 'Pedidos']].map((x) =>
      '<div><div style="font-size:18px;font-weight:800;color:var(--acento-texto)">' + x[0] + '</div>'
      + '<div style="font-size:11px;color:#9ca3af;font-weight:600;margin-top:2px">' + x[1] + '</div></div>').join('')
    + '</div></div>'

  const top = [...itens].sort((a, b) => (b.vendas || 0) - (a.vendas || 0)).slice(0, 5)
  const blocoTop = top.length
    ? '<div style="padding:18px 20px">' + top.map((p, i) =>
      '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f4f5f7">'
      + '<span style="font-size:12px;font-weight:800;color:' + (i < 3 ? 'var(--acento-texto)' : '#9ca3af') + '">' + (i + 1) + '</span>'
      + '<span style="flex:1;min-width:0;font-size:13px;font-weight:700;color:#111">' + esc(p.nome) + '</span>'
      + '<span style="font-size:13px;font-weight:800;color:#111">' + esc(brl(p.vendas)) + '</span></div>').join('') + '</div>'
    : '<div class="evazio">Nenhuma venda registrada ainda.</div>'

  // Comissões é OUTRA lista: quem tem quanto a receber, não quem vendeu mais.
  const porComissao = [...itens].sort((a2, b2) => (b2.comissao || 0) - (a2.comissao || 0))
  const blocoComissoes = porComissao.length
    ? '<div style="padding:18px 20px">' + porComissao.map((p2) =>
      '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f4f5f7">'
      + '<span style="flex:1;min-width:0;font-size:13px;font-weight:700;color:#111">' + esc(p2.nome)
      + '<span style="font-size:11.5px;color:#9ca3af;font-weight:600"> · ' + esc(p2.pedidos) + ' pedido(s)</span></span>'
      + '<span style="font-size:13px;font-weight:800;color:var(--acento-texto)">' + esc(brl(p2.comissao)) + '</span></div>').join('')
      + '</div>'
    : '<div class="evazio">Nenhum parceiro cadastrado.</div>'

  return topo('Parceiros', 'Gerencie parceiros, acompanhe vendas, cupons e comissões em tempo real.',
    botao('parceiro:novo', '+ Novo parceiro', true))
    + kpis
    + '<div class="ecard" style="padding:24px;margin-bottom:18px;animation:eloFadeUp .5s ease .05s both">' + tabela + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px">'
    + cartao('Top parceiros por faturamento', '', blocoTop, 0.09)
    + cartao('Faturamento por tipo', '', blocoTipos, 0.09) + '</div>'
    + '<div style="margin-top:18px">'
    + cartao('Comissões', 'Total pago a parceiros: ' + brl(dados.comissaoPaga), blocoComissoes, 0.12) + '</div>'
}

// ── Fidelidade ──────────────────────────────────────────────────────────────
const ABAS_FIDELIDADE = [
  { chave: 'visao', rotulo: 'Visão geral' }, { chave: 'config', rotulo: 'Configurações' },
  { chave: 'atividades', rotulo: 'Atividades' },
]
const PERIODOS_FID = [{ chave: '7dias', rotulo: '7 dias' }, { chave: '30dias', rotulo: '30 dias' }, { chave: '90dias', rotulo: '90 dias' }]

function htmlFidelidade(dados, estado) {
  estado = estado || {}
  if (!dados) return semDados('de fidelidade')
  const aba = ABAS_FIDELIDADE.some((a) => a.chave === estado.abaFidelidade) ? estado.abaFidelidade : 'visao'
  const periodo = PERIODOS_FID.some((p) => p.chave === estado.periodoFid) ? estado.periodoFid : '30dias'
  const itens = dados.itens || []

  const barraAbas = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">'
    + ABAS_FIDELIDADE.map((a) => '<button type="button" data-aba-fidelidade="' + esc(a.chave) + '"'
      + ' class="echip" style="cursor:pointer;height:32px;' + (a.chave === aba
        ? 'background:var(--acento);color:#fff;font-weight:800'
        : 'background:#eef0f3;color:#4b5563') + '">' + esc(a.rotulo) + '</button>').join('') + '</div>'

  const cabecalho = topo('Fidelidade',
    'O cliente acumula pontos a cada compra e troca por prêmios. '
    + '<strong style="color:var(--acento-texto)">' + (dados.ativo === false ? 'Programa desativado' : 'Programa ativado') + '</strong>')
    + barraAbas

  if (aba === 'config') {
    const c = dados.regras || {}
    return cabecalho + cartao('Como o programa funciona', 'as regras que valem para todo cliente',
      '<div style="padding:20px;display:flex;flex-direction:column;gap:14px">'
      + campo('Pontos por real gasto', '', String(c.pontosPorReal != null ? c.pontosPorReal : 1))
      + campo('Valor do ponto no resgate', '', brl(c.valorDoPonto))
      + campo('Mínimo para resgatar', '', (c.minimoResgate || 0) + ' pontos')
      + campo('Validade dos pontos', '', c.validade || 'não expira')
      + '</div>')
  }
  if (aba === 'atividades') {
    const ativ = dados.atividades || []
    return cabecalho + cartao('Atividades', 'ponto ganho e ponto gasto, na ordem em que aconteceu',
      ativ.length
        ? L.apenasGrade({ colunas: ['Quando', 'Cliente', 'Movimento', 'Pontos', 'Pedido'],
          grade: '130px 1fr 140px 110px 120px', direita: [3] },
        ativ.map((a) => ({ chave: a.quando + a.cliente, celulas: [a.quando, { texto: a.cliente, forte: true, cor: '#111' },
          { texto: a.tipo, etiqueta: a.tipo === 'Resgate' ? 'amarelo' : 'verde' },
          { texto: (a.tipo === 'Resgate' ? '- ' : '+ ') + a.pontos, forte: true,
            cor: a.tipo === 'Resgate' ? '#b42318' : 'var(--acento-texto)' }, a.pedido || '—'] })))
        : '<div class="evazio">Sem movimentação no período.</div>')
  }

  const chips = '<div class="ecard" style="padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    + '<span style="font-size:12.5px;font-weight:800;color:#111">Período</span>'
    + PERIODOS_FID.map((p) => '<button type="button" data-periodo-fid="' + esc(p.chave) + '" class="echip"'
      + ' style="cursor:pointer;height:30px;' + (p.chave === periodo
        ? 'background:var(--acento-suave);color:var(--acento-texto);font-weight:800'
        : 'background:#eef0f3;color:#4b5563') + '">' + esc(p.rotulo) + '</button>').join('')
    + '<span style="margin-left:auto;font-size:12px;color:#9ca3af;font-weight:600">' + esc(dados.intervalo || '') + '</span></div>'

  const kpis = faixaKpis([
    { r: 'Pontos distribuídos', v: String(dados.pontosDistribuidos || 0), s: 'no período' },
    { r: 'Pontos resgatados', v: String(dados.pontosResgatados || 0), s: 'no período' },
    { r: 'Em descontos', v: brl(dados.emDescontos), s: 'o que os pontos viraram', c: 'var(--acento-texto)' },
    { r: 'Resgates', v: String(dados.resgates || 0), s: 'trocas feitas' },
  ])

  const G = require('./graficos')
  const porDia = cartao('Pontos distribuídos por dia', '',
    (dados.porDia || []).length
      ? '<div style="padding:20px">' + G.colunas((dados.porDia || []).map((d) => ({ label: d.dia, value: d.pontos }))) + '</div>'
      : '<div class="evazio">Sem movimentação.</div>')

  const ranking = (titulo, lista, campo2) => cartao(titulo, '',
    (lista || []).length
      ? '<div style="padding:8px 0">' + lista.map((c, i) =>
        '<div style="display:flex;align-items:center;gap:12px;padding:9px 20px;border-bottom:1px solid #f4f5f7">'
        + '<span style="font-size:12px;font-weight:800;color:' + (i < 3 ? 'var(--acento-texto)' : '#9ca3af') + '">' + (i + 1) + '</span>'
        + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:#111">' + esc(c.nome) + '</div>'
        + '<div style="font-size:11.5px;color:#9ca3af;font-weight:600">' + esc(c.telefone || '') + '</div></div>'
        + '<span style="font-size:13px;font-weight:800;color:#111">' + esc(c[campo2]) + ' pts</span></div>').join('') + '</div>'
      : '<div class="evazio">Sem movimentação.</div>')

  const premios = cartao('Prêmios resgatados no período', '',
    (dados.premios || []).length
      ? L.apenasGrade({ colunas: ['Prêmio', 'Resgates', 'Pontos'], grade: '1fr 130px 130px', direita: [1, 2] },
        (dados.premios || []).map((p) => ({ chave: p.nome, celulas: [{ texto: p.nome, forte: true, cor: '#111' },
          String(p.resgates), String(p.pontos)] })))
      : '<div class="evazio">Nenhum prêmio resgatado.</div>')

  const participantes = itens.length
    ? '<div style="margin-top:18px">' + cartao('Participantes', itens.length + ' cliente(s) no programa',
      L.apenasGrade({ colunas: ['Cliente', 'Telefone', 'Pontos', 'Pedidos', 'Próximo prêmio'],
        grade: '1fr 170px 110px 100px 200px', direita: [2, 3] },
      itens.map((c) => ({ chave: c.nome, celulas: [{ texto: c.nome, forte: true, cor: '#111' },
        c.telefone, String(c.pontos), String(c.pedidos), c.proximo] })))) + '</div>'
    : ''

  return cabecalho + chips + kpis + porDia
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px;margin-top:18px">'
    + ranking('Top clientes por ganhos no período', dados.topGanhos, 'pontos')
    + ranking('Top clientes por resgates no período', dados.topResgates, 'pontos') + '</div>'
    + '<div style="margin-top:18px">' + premios + '</div>' + participantes
}

module.exports = { htmlCupons, htmlCampanhas, htmlPush, htmlParceiros, htmlFidelidade, PERFIS, ABAS_CAMPANHA, ABAS_FIDELIDADE }
