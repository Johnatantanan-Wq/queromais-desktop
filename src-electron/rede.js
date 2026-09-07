// Estado da conexão pelo que a API responde, não pelo que o sistema operacional acha.
// navigator.onLine dá "online" em Wi-Fi de praça de alimentação que exige login —
// o Elo aprendeu isso em campo (OVD-VENDAS/capa/renderer/offline.js).
function criarMonitor({ pingar, aoMudar, intervaloMs = 20000 }) {
  let _online = false
  let timer = null

  async function checarAgora() {
    let ok = false
    try { ok = !!(await pingar()) } catch (e) { ok = false }
    if (ok !== _online) {
      _online = ok
      try { aoMudar && aoMudar(_online) } catch (e) {}
    }
    return _online
  }

  function iniciar() {
    if (timer) return
    checarAgora()
    timer = setInterval(checarAgora, intervaloMs)
  }

  function parar() { if (timer) { clearInterval(timer); timer = null } }

  return { online: () => _online, checarAgora, iniciar, parar }
}

module.exports = { criarMonitor }
