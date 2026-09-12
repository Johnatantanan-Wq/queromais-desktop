// usuarios-acoes.js — Configurações › Usuário: corrigir o nome, trocar a função e
// desativar quem saiu. Regra pura; quem grava é o painel.
//
// ⛔ DOIS CADASTROS, DUAS ROTAS: quem entra por e-mail vive em `usuarios_admin`
// (PATCH /api/admin/usuarios) e quem entra por CPF+senha vive em `colaboradores`
// (PATCH /api/admin/colaboradores/<id>). Mandar para a rota errada volta 404 mudo,
// e o lojista fica achando que salvou.
//
// ⛔ VIRAR ADMINISTRADOR NÃO É TROCA DE RÓTULO: muda a forma de ENTRAR (e-mail e senha
// no lugar do CPF). Por isso a troca de função só vale entre as funções de CPF — o
// resto a tela explica, em vez de oferecer um botão que quebraria o login de alguém.

/** As funções que entram por CPF — as únicas que trocam entre si. */
const FUNCOES_CPF = [
  { chave: 'caixa', rotulo: 'Caixa' },
  { chave: 'garcom', rotulo: 'Garçom' },
  { chave: 'motoboy', rotulo: 'Entregador' },
  { chave: 'cozinha', rotulo: 'Cozinha' },
  { chave: 'gerente', rotulo: 'Gerente' },
]

function rotaDe(u) {
  return u.tipo === 'colaborador'
    ? { caminho: '/api/admin/colaboradores/' + u.id, metodo: 'PATCH', porId: true }
    : { caminho: '/api/admin/usuarios', metodo: 'PATCH', porId: false }
}

function editar(usuario, campos) {
  const u = usuario || {}
  const c = campos || {}
  if (!u.id) return { ok: false, motivo: 'Este usuário veio sem identificação — recarregue a tela.' }
  const nome = ('' + (c.nome || '')).trim()
  if (!nome) return { ok: false, motivo: 'O nome não pode ficar em branco.' }
  if (nome.length > 80) return { ok: false, motivo: 'Nome muito longo (até 80 letras).' }

  const corpo = {}
  if (nome !== ('' + (u.nome || '')).trim()) corpo.nome = nome

  const funcao = ('' + (c.funcao || '')).trim()
  if (funcao && funcao !== u.papel) {
    if (u.tipo !== 'colaborador') {
      return { ok: false, motivo: 'Quem entra por e-mail não troca de função aqui — isso muda a forma de entrar no sistema.' }
    }
    if (!FUNCOES_CPF.some((f) => f.chave === funcao)) {
      return { ok: false, motivo: 'Função desconhecida.' }
    }
    corpo.papeis = [funcao]
  }
  if (!Object.keys(corpo).length) return { ok: false, motivo: 'Nada mudou.' }

  const r = rotaDe(u)
  return {
    ok: true, caminho: r.caminho, metodo: r.metodo,
    corpo: r.porId ? corpo : { id: u.id, ...corpo },
    resumo: (corpo.nome ? 'Nome corrigido para ' + nome : nome)
      + (corpo.papeis ? ' · função agora é ' + (FUNCOES_CPF.find((f) => f.chave === funcao) || {}).rotulo : '') + '.',
  }
}

/** Desativar NÃO apaga: o usuário sai do sistema e fica no quadro "Desativados".
 *  Apagar levaria junto o histórico de quem fez o quê. */
function ativar(usuario, ligado) {
  const u = usuario || {}
  if (!u.id) return { ok: false, motivo: 'Este usuário veio sem identificação — recarregue a tela.' }
  if (u.tipo !== 'colaborador') {
    return { ok: false, motivo: 'Quem entra por e-mail é desativado pelo painel — lá o acesso ao Supabase sai junto.' }
  }
  return {
    ok: true, caminho: '/api/admin/colaboradores/' + u.id, metodo: 'PATCH',
    corpo: { ativo: !!ligado },
    resumo: ligado
      ? (u.nome || 'Usuário') + ' voltou a ter acesso.'
      : (u.nome || 'Usuário') + ' foi desativado — sai do sistema e fica em "Desativados".',
  }
}

module.exports = { editar, ativar, FUNCOES_CPF, rotaDe }
