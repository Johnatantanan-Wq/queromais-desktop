// modo.js — o app sobe em DEMONSTRAÇÃO ou CONECTADO?
//
// O beta (shell "elo") é o app em construção. Enquanto o v2 não fecha a ligação com o
// painel, abrir conectado só entrega tela vazia e a página de login do painel por trás —
// foi o que aconteceu em 07/09, e some com todo o trabalho que está montado. Então no
// beta a demonstração é o PADRÃO: abrir pelo Dock traz as telas cheias, sem login.
//
// Quem quiser o app falando com o painel de verdade pede: `--conectado` (ou PEDIU_DEMO=0).
// O app atual (sem shell elo) nunca entra em demonstração — nada muda para ele.
//
// A demonstração nunca se disfarça: a topbar mostra "DEMONSTRAÇÃO · dados fictícios" o
// tempo todo, e nenhuma escrita sai do app nesse modo.
function modoDemonstracao({ shellElo, argv, env }) {
  if (!shellElo) return false
  const args = argv || []
  const amb = (env || {}).PEDIU_DEMO
  if (args.includes('--conectado') || amb === '0') return false
  return true
}

module.exports = { modoDemonstracao }
