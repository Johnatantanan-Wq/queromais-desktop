/**
 * Preload da view do cardápio admin — expõe uma ponte mínima (contextBridge,
 * já que essa view roda com contextIsolation:true) pra página web pedir
 * impressão silenciosa (sem diálogo do SO) via main process.
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // url: caminho da comanda (ex.: /admin/pedidos/123/imprimir?d=cliente&modo=eletron)
  // impressoraNome: nome exato da impressora no SO, ou undefined pra usar a padrão
  imprimirComanda: (url, impressoraNome) => {
    ipcRenderer.send('imprimir-comanda', { url, impressoraNome })
  },

  listarImpressoras: () => ipcRenderer.invoke('listar-impressoras'),

  // printerService (spec 2026-07-03): teste LOCAL (sem rede) + diagnóstico
  imprimirTeste: (impressoraNome) => ipcRenderer.invoke('printer:test', { impressoraNome }),
  diagnosticoImpressao: () => ipcRenderer.invoke('printer:diagnostico'),
})
