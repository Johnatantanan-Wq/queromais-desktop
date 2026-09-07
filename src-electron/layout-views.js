// Onde cada BrowserView fica na janela. Puro de propósito: o defeito de a view
// cobrir a barra lateral (e congelar os controles HTML) é de conta, não de Electron.
function calcularBounds({ largura, altura, sidebarW, topoH, modo, splitRatio = 0.7, handleW = 6 }) {
  const cw = largura - sidebarW
  const ch = altura - topoH
  const cheio = { x: sidebarW, y: topoH, width: cw, height: ch }

  if (modo !== 'split') return { cardapio: { ...cheio }, whatsapp: { ...cheio } }

  const cardW = Math.max(200, Math.floor(cw * splitRatio) - handleW)
  const waX = sidebarW + cardW + handleW
  const waW = Math.max(200, largura - waX)
  return {
    cardapio: { x: sidebarW, y: topoH, width: cardW, height: ch },
    whatsapp: { x: waX, y: topoH, width: waW, height: ch },
  }
}

module.exports = { calcularBounds }
