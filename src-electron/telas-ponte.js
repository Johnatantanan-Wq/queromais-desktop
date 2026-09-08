/**
 * telas-ponte.js — o catálogo de telas: de onde cada uma tira o dado no painel.
 *
 * Até aqui a ponte servia DUAS telas (menu e caixa) e todo o resto só existia no modo
 * demonstração — o app conectado abria "Não deu para carregar esta tela agora" em 20
 * telas prontas. Este arquivo é o mapa que faltava.
 *
 * Cada entrada declara:
 *   canal    — o que o renderer pede (o mesmo nome do modo demonstração)
 *   rotas    — uma ou mais rotas de leitura do painel; várias quando a tela junta
 *              coisas que no painel vivem em lugares diferentes (Atendimento, Gestão)
 *   adaptar  — traduz a resposta para o formato da tela (adaptadores.js)
 *   valida   — o que conta como resposta BOA; sem isso um 401 devolvendo {error}
 *              apagaria o cache e a tela ficaria vazia justo quando a sessão pisca
 *   cache    — prefixo da chave; a chave final leva a loja, para o dado de uma loja
 *              nunca vazar para outra quando o lojista troca
 *
 * `semApi` marca as telas que o painel ainda NÃO expõe por rota de leitura: elas
 * continuam avisando honestamente em vez de fingir. Estão listadas aqui de propósito,
 * para o buraco ficar visível no código e não na cabeça de alguém.
 */
const A = require('./adaptadores')

/** Telas que já têm de onde buscar. */
const TELAS = [
  {
    canal: 'cozinha-carregar', cache: 'cozinha',
    rotas: { fila: '/api/admin/fila/dept/cozinha', tv: '/api/admin/kds/codigo' },
    adaptar: (r) => A.juntarAcessoTv(A.filaDeProducao(r.fila), r.tv),
    valida: (r) => r.fila && Array.isArray(r.fila.items),
  },
  {
    canal: 'bar-carregar', cache: 'bar',
    rotas: { fila: '/api/admin/fila/dept/bar', tv: '/api/admin/kds/codigo' },
    adaptar: (r) => A.juntarAcessoTv(A.filaDeProducao(r.fila), r.tv),
    valida: (r) => r.fila && Array.isArray(r.fila.items),
  },
  {
    canal: 'salao-carregar', cache: 'salao',
    rotas: { salao: '/api/admin/atendimento/salao' },
    adaptar: (r) => A.salao(r.salao),
    valida: (r) => r.salao && Array.isArray(r.salao.mesas),
  },
  {
    canal: 'atendimento-abas-carregar', cache: 'atendimento',
    rotas: {
      salaoResp: '/api/admin/atendimento/salao',
      gorjetasResp: '/api/admin/atendimento/gorjetas',
      relatorioResp: '/api/admin/atendimento/relatorio',
      configResp: '/api/admin/atendimento/config',
    },
    adaptar: (r) => A.atendimento(r),
    valida: (r) => r.salaoResp && Array.isArray(r.salaoResp.mesas),
  },
  {
    canal: 'clientes-carregar', cache: 'clientes',
    rotas: { lista: '/api/admin/clientes' },
    adaptar: (r) => A.clientes(r.lista),
    valida: (r) => Array.isArray(r.lista),
  },
  {
    canal: 'conversas-carregar', cache: 'conversas',
    // As conversas ainda não têm rota no painel: o app pede a que houver e, sem ela,
    // a tela diz que não há conversa — nunca inventa uma.
    rotas: { conversasResp: '/api/admin/whatsapp/conversas' },
    adaptar: (r) => A.conversas(r),
    valida: (r) => r.conversasResp && Array.isArray(r.conversasResp.conversas || r.conversasResp),
  },
  {
    canal: 'whatsapp-carregar', cache: 'whatsapp',
    rotas: {
      statusResp: '/api/admin/whatsapp/status',
      configResp: '/api/admin/whatsapp/config',
    },
    adaptar: (r) => A.whatsapp(r),
    valida: (r) => r.statusResp && r.statusResp.estado,
  },
  {
    canal: 'configuracoes-carregar', cache: 'configuracoes',
    // Uma rota por aba. `buscarVarias` já garante que uma que falhe (permissão,
    // rota fora do ar) não derruba a tela inteira — as outras abas continuam.
    rotas: {
      lojaResp: '/api/admin/loja',
      bairrosResp: '/api/admin/bairros',
      usuariosResp: '/api/admin/usuarios',
      planoResp: '/api/admin/plano',
      whatsappResp: '/api/admin/whatsapp/status',
      formasResp: '/api/admin/formas-pagamento',
      contasResp: '/api/admin/contas-financeiras',
    },
    adaptar: (r) => A.configuracoes(r),
    valida: (r) => r.lojaResp && r.lojaResp.id,
  },
  {
    canal: 'estoque-abas-carregar', cache: 'estoque',
    rotas: {
      ingredientesResp: '/api/admin/ingredientes',
      pendenciasResp: '/api/admin/estoque/pendencias',
      fornecedoresResp: '/api/admin/fornecedores',
    },
    adaptar: (r) => A.estoque(r),
    valida: (r) => Array.isArray(r.ingredientesResp),
  },
  {
    canal: 'parceiros-carregar', cache: 'parceiros',
    rotas: { pagamentos: '/api/admin/comissoes' },
    adaptar: (r) => A.parceiros(r.pagamentos),
    valida: (r) => Array.isArray(r.pagamentos),
  },
  {
    canal: 'campanhas-carregar', cache: 'campanhas',
    rotas: { campanhasResp: '/api/admin/campanhas', configResp: '/api/admin/campanhas/config' },
    adaptar: (r) => A.campanhas(r),
    valida: (r) => !!r.campanhasResp,
  },
  {
    canal: 'fidelidade-carregar', cache: 'fidelidade',
    rotas: {
      dashboardResp: '/api/admin/fidelidade/dashboard',
      atividadesResp: '/api/admin/fidelidade/atividades',
      configResp: '/api/admin/fidelidade/config',
    },
    adaptar: (r) => A.fidelidade(r),
    valida: (r) => !!r.dashboardResp,
  },
  // ── Telas servidas por /api/admin/desktop/[tela] ──
  // O painel devolve o dado JÁ no formato da tela: a tradução mora do lado do
  // servidor, junto das regras (o que é "hoje" no fuso da loja, o que entra no
  // quadro, o que conta como pago). Duplicar isso aqui criaria uma segunda verdade.
  ...['pedidos', 'despacho', 'cardapio', 'carrinhos', 'cupons', 'entregadores', 'compras']
    .map((tela) => ({
      canal: tela === 'entregadores' ? 'entregadores-carregar' : tela + '-carregar',
      cache: tela,
      rotas: { d: '/api/admin/desktop/' + tela },
      adaptar: (r) => r.d,
      valida: (r) => !!r.d && !r.d.error,
    })),
  {
    // Insights e Relatórios saem das MESMAS contas do painel (lib/insights/agregacoes),
    // que a tela dele também usa.
    canal: 'insights-carregar', cache: 'insights',
    rotas: { d: '/api/admin/desktop/insights' },
    adaptar: (r) => r.d,
    valida: (r) => !!r.d && !r.d.error && !!r.d.geral,
  },
  {
    canal: 'relatorios-carregar', cache: 'relatorios',
    rotas: { d: '/api/admin/desktop/relatorios' },
    adaptar: (r) => r.d,
    valida: (r) => !!r.d && !r.d.error && !!r.d.vendas,
  },
  {
    canal: 'push-carregar', cache: 'push',
    rotas: { d: '/api/admin/desktop/push' },
    adaptar: (r) => r.d,
    valida: (r) => !!r.d && !r.d.error,
  },
  {
    // O Financeiro muda com o período; o painel aceita o preset por parâmetro e devolve
    // DRE, extrato e livro caixa da MESMA conta que ele mostra.
    canal: 'financeiro-abas-carregar', cache: 'financeiro',
    rotas: { d: '/api/admin/desktop/financeiro' },
    adaptar: (r) => r.d,
    valida: (r) => !!r.d && !r.d.error && Array.isArray(r.d.extrato),
    comArgumentos: (args) => '?preset=' + encodeURIComponent((args && args.preset) || 'mes'),
  },
  {
    // O PDV precisa do cardápio, dos clientes (busca por telefone) e da taxa de cada
    // bairro — é ela que muda o total antes de fechar a venda.
    canal: 'venda-cardapio', cache: 'venda',
    rotas: { d: '/api/admin/desktop/venda' },
    adaptar: (r) => r.d,
    valida: (r) => !!r.d && !r.d.error && Array.isArray(r.d.categorias),
  },
  {
    canal: 'visao-geral-carregar', cache: 'visao-geral',
    rotas: { d: '/api/admin/desktop/visao-geral' },
    adaptar: (r) => r.d,
    valida: (r) => !!r.d && !r.d.error && !!r.d.kpis,
    // A Visão geral muda com o período escolhido na tela.
    comArgumentos: (args) => '?periodo=' + encodeURIComponent((args && args.periodo) || 'semana'),
  },
]

/**
 * Telas cuja tela existe no app mas o painel ainda não tem rota de leitura. Ficam
 * declaradas para o app dizer POR QUE está vazio — e para a lista do que falta viver
 * no código, não numa conversa.
 */
// Nenhuma tela ficou sem rota: quando alguma nova entrar antes do painel expor a
// leitura dela, é aqui que se declara — a tela passa a dizer O QUE falta ligar, em
// vez de "não deu para carregar", que faz o lojista procurar problema na internet.
const SEM_API = {}

module.exports = { TELAS, SEM_API }
