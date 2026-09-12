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
  'mesa:imprimir': { app: 'comanda' },

  // ── Pedidos e despacho ──
  // 'avancar' saiu do mapa: o app FAZ (ver shell.js → pedido-avancar). Deixar aqui
  // faria o clique abrir o painel em vez de mexer no pedido.
  'novo-pedido': { app: 'venda' },
  'venda-manual': { app: 'venda' },
  'imprimir': { app: 'comanda' },
  'ver-transito': { rota: '/admin/despacho', o: 'ver quem está na rua' },
  // O ponto do entregador abre no NAVEGADOR, fora do app: mapa é da internet, e o app
  // não finge ter mapa offline.
  'rastreio:mapa': { app: 'mapa' },
  'limpar-selecao': { app: 'limpar-selecao' },
  'acerto-entregador': { rota: '/admin/motoboys', o: 'acertar com o entregador' },
  // Fechar o período gera o repasse e pode lançá-lo no contas a pagar. Vai para o
  // painel de propósito: fechamento SOBREPOSTO paga o entregador duas vezes, e a tela
  // de lá é a única que sabe o que já foi fechado antes de deixar fechar de novo.
  'entregador:fechar-periodo': { rota: '/admin/motoboys', o: 'fechar o período deste entregador' },

  // ── Cozinha e bar ──

  // ── Cardápio ──
  'nova-categoria': { rota: '/admin/cardapio', o: 'criar categoria' },
  'novo-combo': { rota: '/admin/cardapio', o: 'criar combo' },
  'acoes-item': { rota: '/admin/cardapio', o: 'editar o produto' },
  'acoes-categoria': { rota: '/admin/cardapio', o: 'editar a categoria' },
  'link-item': { rota: '/admin/cardapio', o: 'ver o produto' },
  'links-cardapio': { rota: '/admin/cardapio', o: 'ver os links do cardápio' },
  'melhorar-fotos': { rota: '/admin/cardapio', o: 'melhorar as fotos' },
  'melhorar-descricoes': { rota: '/admin/cardapio', o: 'melhorar as descrições' },
  'criar-promocoes': { rota: '/admin/cupons', o: 'criar promoção' },
  'ver-no-celular': { rota: '/admin/cardapio', o: 'ver o cardápio no celular' },

  // ── Clientes ──
  'segmentos': { rota: '/admin/clientes', o: 'ver os segmentos' },
  'ordenar-clientes': { app: 'ordenar-clientes' },

  // ── Gestão / estoque ──
  'estoque:sincronizar-massas': { rota: '/admin/estoque', o: 'sincronizar as massas' },
  // Editar o item, movimentar o estoque, fornecedor e ficha técnica: o app FAZ (shell.js → estoque-*).
  'estoque:menu': { app: 'estoque-item' },
  'estoque:item': { app: 'estoque-item' },
  'estoque:ajuste': { app: 'estoque-ajuste' },
  'estoque:fornecedor': { app: 'estoque-fornecedor' },
  'estoque:ficha': { app: 'estoque-ficha' },
  'entrada:nova': { app: 'entrada-menu' },
  'entrada:abrir': { app: 'entrada-abrir' },
  'entrada:fechar': { app: 'entrada-fechar' },
  'entrada:sefaz': { rota: '/admin/estoque', o: 'buscar as notas na SEFAZ' },
  'entrada:xml': { rota: '/admin/estoque', o: 'importar o XML' },
  // Lançar à mão (com ou sem nota) é ficha do app; SEFAZ e XML continuam pelo painel.
  'entrada:manual': { app: 'entrada-manual' },
  'entrada:sem-nota': { app: 'entrada-sem-nota' },
  'entrada:confirmar': { rota: '/admin/estoque', o: 'confirmar as entradas' },
  'entrada:ajustar': { rota: '/admin/estoque', o: 'ajustar o item da nota' },
  // "Ajustar" da nota JÁ LANÇADA: o app faz — abre a nota e oferece reabrir, que estorna
  // o estoque e devolve a nota para "A lançar".
  'entrada:ajustar-nota': { app: 'entrada-ajustar' },
  'entrada:danfe': { app: 'entrada-danfe' },
  'entrada:reabrir': { app: 'entrada-reabrir' },
  'entrada:resolver': { app: 'entrada-resolver' },
  'entrada:buscar-notas': { rota: '/admin/estoque', o: 'buscar notas no período' },
  'estoque:nova-entrada': { rota: '/admin/estoque', o: 'lançar entrada' },
  'estoque:buscar-notas': { rota: '/admin/estoque', o: 'buscar notas' },
  // NF pendentes (aba do Caixa): emitir NFC-e é ato FISCAL e irreversível — o app leva
  // para o Caixa do painel, onde está o popup completo com a prévia da nota. Fazer a
  // emissão daqui exigiria repetir a montagem da nota, e uma nota errada não se apaga.
  'nf:emitir-venda': { rota: '/admin/caixa', o: 'emitir a nota desta venda' },
  'nf:emitir-coluna': { rota: '/admin/caixa', o: 'emitir as notas desta forma de pagamento' },
  'nf:emitir-manual': { rota: '/admin/nf', o: 'emitir nota manualmente' },
  'nf:gerar': { rota: '/admin/nf', o: 'gerar a nota' },
  'nf:atualizar-status': { rota: '/admin/nf', o: 'atualizar o status fiscal' },
  'nf:limpar-filtros': { app: 'nf-limpar' },
  'mov:pdf': { app: 'pdf' },

  // ── Compras ──
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
  // Lançamento avulso, editar e cancelar conta: o app FAZ (shell.js → contas-*).
  'novo-lancamento': { app: 'lancamento' },
  'lancamento:confirmar': { app: 'lancamento' },
  'exportar': { app: 'pdf' },
  'portal-contabil': { rota: '/admin/contabil', o: 'abrir o Portal do Contador' },
  'fin:limpar-filtros': { app: 'limpar-filtros-fin' },
  'conta:receber-repasse': { rota: '/admin/financeiro', o: 'confirmar o repasse' },

  // ── Configurações ──
  // Configurações: as fichas são do app (shell.js → config-*). Só o que não tem ficha
  // (fiscal, integrações, backup) continua sendo do painel — e a tela diz isso.
  'config': { app: 'configuracoes' },

  // Entrar de novo: leva à tela de login do painel. A senha é digitada pelo lojista,
  // no painel — o app nunca guarda nem pede senha.
  'sessao:entrar': { app: 'sessao-entrar' },

  // ── Ficha (painel lateral) ──
  'ficha:imprimir': { app: 'comanda-ficha' },
  'ficha:whatsapp': { rota: '/admin/whatsapp', o: 'falar com o cliente' },
  'ficha:whatsapp-cliente': { rota: '/admin/whatsapp', o: 'falar com o cliente' },
  'ficha:novo-pedido': { app: 'venda-cliente' },

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

  // ── Fila offline (F3.3) e conferência do fechamento (F3.4): o app FAZ (shell.js) ──
  'fila:ver': { app: 'fila-ver' },
  'fila:tentar': { app: 'fila-tentar' },
  'fila:exportar': { app: 'fila-exportar' },
  'fila:remover': { app: 'fila-remover' },
  'caixa:conferencia': { app: 'conferencia' },
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
