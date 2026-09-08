// renderer/elo/acoes.js — o que cada botão do app faz.
//
// Antes daqui, TODA ação de escrita caía num aviso genérico que nem existia
// (`window.mensagemTopo` nunca foi criado) — ou seja, 109 botões eram mudos: o
// lojista clicava e a tela não respondia nada. Agora cada ação tem um destino:
//
//   'app'    → o app faz sozinho (impressão, PDF, estado de tela).
//   rota     → o app ABRE a tela certa do painel, já no lugar da ação; é o que o
//              lojista faria à mão, sem procurar o menu.
//
// A regra para escolher: se depende de gravar no servidor, vai para o painel — mas
// vai PARA O LUGAR CERTO, não para um recado. Se é da máquina (impressora, PDF) ou
// só muda o que está na tela, o app faz.

/** Prefixo da ação (antes do primeiro ':') → para onde ela leva. */
const DESTINOS = {
  // ── Caixa ──
  // sangria, suprimento e fechar saíram do mapa: o app FAZ (shell.js → caixa-*).
  // Se ficassem aqui, o clique abriria o painel em vez de abrir a ficha.
  'mesa:fechar': { rota: '/admin/caixa', o: 'fechar a conta da mesa' },
  'mesa:imprimir': { app: 'comanda' },
  'entrega:confirmar': { rota: '/admin/caixa', o: 'confirmar o recebimento' },
  'entrega:concluir': { rota: '/admin/caixa', o: 'concluir a entrega' },
  'entrega:entregue': { rota: '/admin/caixa', o: 'marcar como entregue' },

  // ── Pedidos e despacho ──
  // 'avancar' saiu do mapa: o app FAZ (ver shell.js → pedido-avancar). Deixar aqui
  // faria o clique abrir o painel em vez de mexer no pedido.
  'novo-pedido': { app: 'venda' },
  'venda-manual': { app: 'venda' },
  'imprimir': { app: 'comanda' },
  'aceite-automatico': { rota: '/admin/configuracoes', o: 'ligar o aceite automático' },
  'editar-tempos': { rota: '/admin/configuracoes', o: 'editar os tempos de preparo' },
  'pausar-cardapio': { rota: '/admin/cardapio', o: 'pausar o cardápio' },
  'alternar-loja': { rota: '/admin/escolher-loja', o: 'trocar de loja' },
  'ver-transito': { rota: '/admin/despacho', o: 'ver quem está na rua' },
  'limpar-selecao': { app: 'limpar-selecao' },
  'rota:fechar': { rota: '/admin/despacho', o: 'fechar a rota e acertar' },
  'acerto-entregador': { rota: '/admin/motoboys', o: 'acertar com o entregador' },
  'novo-entregador': { rota: '/admin/motoboys', o: 'cadastrar entregador' },

  // ── Cozinha e bar ──
  'kds:gerar-codigo': { rota: '/admin/cozinha', o: 'gerar o código da TV' },
  'kds:revogar-telas': { rota: '/admin/cozinha', o: 'desconectar as telas' },

  // ── Cardápio ──
  'nova-categoria': { rota: '/admin/cardapio', o: 'criar categoria' },
  'novo-combo': { rota: '/admin/cardapio', o: 'criar combo' },
  'editar-preco': { rota: '/admin/cardapio', o: 'editar o preço' },
  'esgotar-item': { rota: '/admin/cardapio', o: 'marcar esgotado' },
  'esgotar-categoria': { rota: '/admin/cardapio', o: 'esgotar a categoria' },
  'acoes-item': { rota: '/admin/cardapio', o: 'editar o produto' },
  'acoes-categoria': { rota: '/admin/cardapio', o: 'editar a categoria' },
  'link-item': { rota: '/admin/cardapio', o: 'ver o produto' },
  'links-cardapio': { rota: '/admin/cardapio', o: 'ver os links do cardápio' },
  'melhorar-fotos': { rota: '/admin/cardapio', o: 'melhorar as fotos' },
  'melhorar-descricoes': { rota: '/admin/cardapio', o: 'melhorar as descrições' },
  'criar-promocoes': { rota: '/admin/cupons', o: 'criar promoção' },
  'ver-no-celular': { rota: '/admin/cardapio', o: 'ver o cardápio no celular' },

  // ── Clientes ──
  'novo-cliente': { rota: '/admin/clientes', o: 'cadastrar cliente' },
  'segmentos': { rota: '/admin/clientes', o: 'ver os segmentos' },
  'ordenar-clientes': { app: 'ordenar-clientes' },

  // ── Gestão / estoque ──
  'estoque:adicionar': { rota: '/admin/estoque', o: 'cadastrar produto' },
  'estoque:nova-categoria': { rota: '/admin/estoque', o: 'criar categoria de estoque' },
  'estoque:sincronizar-cardapio': { rota: '/admin/estoque', o: 'sincronizar com o cardápio' },
  'estoque:sincronizar-massas': { rota: '/admin/estoque', o: 'sincronizar as massas' },
  'estoque:menu': { rota: '/admin/estoque', o: 'abrir as ações do produto' },
  'entrada:nova': { app: 'entrada-menu' },
  'entrada:abrir': { app: 'entrada-abrir' },
  'entrada:fechar': { app: 'entrada-fechar' },
  'entrada:sefaz': { rota: '/admin/estoque', o: 'buscar as notas na SEFAZ' },
  'entrada:xml': { rota: '/admin/estoque', o: 'importar o XML' },
  'entrada:manual': { rota: '/admin/estoque', o: 'lançar a nota à mão' },
  'entrada:sem-nota': { rota: '/admin/estoque', o: 'lançar a entrada sem nota' },
  'entrada:confirmar': { rota: '/admin/estoque', o: 'confirmar as entradas' },
  'entrada:ajustar': { rota: '/admin/estoque', o: 'ajustar o item da nota' },
  'entrada:resolver': { rota: '/admin/estoque', o: 'resolver a pendência' },
  'entrada:buscar-notas': { rota: '/admin/estoque', o: 'buscar notas no período' },
  'estoque:nova-entrada': { rota: '/admin/estoque', o: 'lançar entrada' },
  'estoque:buscar-notas': { rota: '/admin/estoque', o: 'buscar notas' },
  'estoque:novo-fornecedor': { rota: '/admin/estoque', o: 'cadastrar fornecedor' },
  'nf:emitir-manual': { rota: '/admin/nf', o: 'emitir nota manualmente' },
  'nf:gerar': { rota: '/admin/nf', o: 'gerar a nota' },
  'nf:atualizar-status': { rota: '/admin/nf', o: 'atualizar o status fiscal' },
  'nf:limpar-filtros': { app: 'nf-limpar' },
  'mov:pdf': { app: 'pdf' },

  // ── Compras ──
  'compras:recebi': { rota: '/admin/compras', o: 'registrar o recebimento' },
  'compras:adicionar-avulso': { rota: '/admin/compras', o: 'anotar o item' },
  'compras:comprado': { rota: '/admin/compras', o: 'marcar como comprado' },
  'compras:excluir-avulso': { rota: '/admin/compras', o: 'excluir o item' },
  'compras:voltar-lista': { rota: '/admin/compras', o: 'voltar o item para a lista' },
  'compras:relatorio-reposicao': { app: 'pdf' },

  // ── Relatórios ──
  'relatorio:pdf': { app: 'pdf' },
  'relatorio:aplicar': { app: 'recarregar' },

  // ── Marketing ──
  'cupom:criar': { rota: '/admin/cupons', o: 'criar o cupom' },
  'campanha:continuar': { rota: '/admin/food-marketing/campanhas', o: 'escrever a campanha' },
  'push:enviar': { rota: '/admin/food-marketing/push', o: 'enviar a notificação' },
  'push:previsualizar': { rota: '/admin/food-marketing/push', o: 'pré-visualizar' },
  'push:como-funciona': { rota: '/admin/food-marketing/push', o: 'ver como funciona' },
  'parceiro:novo': { rota: '/admin/vendedores', o: 'cadastrar parceiro' },

  // ── Financeiro ──
  'novo-lancamento': { rota: '/admin/financeiro', o: 'lançar entrada ou saída' },
  'exportar': { app: 'pdf' },
  'portal-contabil': { rota: '/admin/contabil', o: 'abrir o Portal do Contador' },
  'fin:limpar-filtros': { app: 'limpar-filtros-fin' },
  'conta:nova': { rota: '/admin/financeiro', o: 'lançar a conta' },
  'conta:liquidar': { rota: '/admin/financeiro', o: 'liquidar a conta' },
  'conta:receber': { rota: '/admin/financeiro', o: 'registrar o recebimento' },
  'conta:receber-repasse': { rota: '/admin/financeiro', o: 'confirmar o repasse' },

  // ── Configurações ──
  'config:editar': { rota: '/admin/configuracoes', o: 'editar as configurações' },

  // ── Ficha (painel lateral) ──
  'ficha:imprimir': { app: 'comanda-ficha' },
  'ficha:whatsapp': { rota: '/admin/whatsapp', o: 'falar com o cliente' },
  'ficha:whatsapp-cliente': { rota: '/admin/whatsapp', o: 'falar com o cliente' },
  'ficha:novo-pedido': { app: 'venda-cliente' },
  'ficha:esgotar': { rota: '/admin/cardapio', o: 'marcar esgotado' },

  // ── Impressão (do app, não do painel) ──
  'impressao:procurar': { app: 'impressao' },
  'impressao:teste': { app: 'impressao' },
  'impressao:comanda': { app: 'impressao' },

  // ── Venda manual: o app FECHA a venda, não manda para o painel ──
  'venda:etapa': { app: 'venda-etapa' },
  'venda:fechar': { app: 'venda-fechar' },
  'venda:nova': { app: 'venda-nova' },
  'venda:cancelar': { app: 'venda-nova' },
  'venda:imprimir': { app: 'comanda' },

  // ── KDS: acesso pela TV (abre a ficha, não escreve nada) ──
  'kds:tv': { app: 'ficha-tv' },
}

/** A chave da ação: 'despachar:1042' → 'despachar'; 'kds:iniciar:c1' → 'kds:iniciar'. */
function chaveDe(acao) {
  const partes = ('' + (acao || '')).split(':')
  if (partes.length >= 2 && DESTINOS[partes[0] + ':' + partes[1]]) return partes[0] + ':' + partes[1]
  return partes[0]
}

function destinoDe(acao) {
  return DESTINOS[chaveDe(acao)] || null
}

module.exports = { DESTINOS, chaveDe, destinoDe }
