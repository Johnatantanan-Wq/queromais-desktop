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
    canal: 'configuracoes-carregar', cache: 'configuracoes',
    rotas: { lojaResp: '/api/admin/loja' },
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
]

/**
 * Telas cuja tela existe no app mas o painel ainda não tem rota de leitura. Ficam
 * declaradas para o app dizer POR QUE está vazio — e para a lista do que falta viver
 * no código, não numa conversa.
 */
const SEM_API = {
  'visao-geral-carregar': 'a visão geral precisa de uma rota de resumo no painel',
  'pedidos-carregar': 'o quadro de pedidos precisa de uma rota de leitura no painel',
  'carrinhos-carregar': 'os carrinhos abandonados precisam de uma rota de leitura no painel',
  'cardapio-carregar': 'o cardápio precisa de uma rota de leitura no painel',
  'despacho-carregar': 'o despacho precisa de uma rota de leitura no painel',
  'financeiro-abas-carregar': 'o financeiro precisa do painel aceitar o período por parâmetro',
  'compras-carregar': 'a lista de reposição precisa de uma rota de leitura no painel',
  'cupons-carregar': 'os cupons precisam de uma rota de leitura no painel',
  'push-carregar': 'o histórico de push precisa de uma rota de leitura no painel',
  'entregadores-carregar': 'os entregadores precisam de uma rota de leitura no painel',
  'insights-carregar': 'os insights precisam de uma rota de leitura no painel',
  'relatorios-carregar': 'os relatórios precisam de uma rota de leitura no painel',
  'venda-cardapio': 'a venda manual precisa do cardápio por uma rota de leitura',
}

module.exports = { TELAS, SEM_API }
