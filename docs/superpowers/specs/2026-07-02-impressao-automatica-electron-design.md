# Impressão automática de comandas via Electron — Design

**Data:** 2026-07-02
**Repos afetados:** `QUEROMAIS-DESKTOP` (Electron, principal) + `cardapiopro` (site, mudança pequena)

## Problema

Hoje, quando um pedido novo chega, `SinoPedidos.tsx` (no site, dentro da `cardapioView` do Electron) detecta via Realtime e chama `dispararImpressao()`, que abre um iframe oculto e chama `iframe.contentWindow.print()`. Isso **sempre** abre o diálogo de impressão do navegador — não existe forma de contornar isso em JS de página comum, por razão de segurança do browser. O usuário precisa confirmar manualmente toda comanda, o que anula o propósito de "impressão automática".

## Objetivo

Quando rodando dentro do app desktop (Electron), a comanda deve imprimir sozinha, sem diálogo, na impressora padrão do sistema operacional. Fora do Electron (navegador comum), o comportamento atual (com diálogo) é mantido.

## Arquitetura / fluxo de dados

A lógica de **o quê** imprimir (quais comandas, quantas vias, quando disparar) já existe, funciona e não muda. Só troca **como** a impressão acontece:

```
Pedido chega (Realtime, já existe em SinoPedidos.tsx)
  → dispararImpressao() monta as mesmas URLs de sempre
    (/admin/pedidos/[id]/imprimir?comanda=...&via=...)
  → detecta se está rodando dentro do Electron (window.electronAPI existe?)
      SIM → chama window.electronAPI.imprimirComanda(url), uma vez por URL
              → Electron (processo main) abre uma BrowserWindow invisível,
                usando a MESMA sessão logada do admin (partition persist:cardapio,
                a mesma que a cardapioView já usa — evita cair numa tela de login)
              → carrega a URL da comanda
              → espera did-finish-load
              → webContents.print({ silent: true }, callback)
              → destrói a janela
      NÃO → cai no comportamento atual (iframe + window.print(), com diálogo)
```

Reaproveita 100% do layout/CSS de impressão térmica já existente em `ComandaTermica.tsx` — não precisa reescrever nada em texto puro nem falar com a impressora via IP/ESC-POS.

## Componentes

**No Electron (`QUEROMAIS-DESKTOP`):**

- `src-electron/controllers/impressao.controller.js` *(novo)*
  Expõe `ipcMain.handle('imprimir-comanda', async (event, url) => {...})`. Abre `new BrowserWindow({show: false, webPreferences: {session: cardapioSes}})`, carrega `url`, espera `did-finish-load`, chama `webContents.print({silent: true}, callback)`, fecha a janela ao terminar (sucesso ou erro), resolve `{ok: true}` ou `{ok: false, erro}`. Timeout de segurança (ex. 15s) para nunca deixar uma janela invisível pendurada se a página não carregar.
  Segue o mesmo padrão de `outbox.controller.js`: `init(...)` chamado do `main.js`, usa `electron-log`.

- `src-electron/preload/cardapio.preload.js` *(novo)*
  A `cardapioView` hoje não tem preload (`contextIsolation: true`, `nodeIntegration: false`, sem `preload:`). Cria o preload com:
  ```js
  const { contextBridge, ipcRenderer } = require('electron')
  contextBridge.exposeInMainWorld('electronAPI', {
    imprimirComanda: (url) => ipcRenderer.invoke('imprimir-comanda', url),
  })
  ```

- `src-electron/main.js`
  Adiciona `preload: path.join(__dirname, 'preload/cardapio.preload.js')` no `webPreferences` da `cardapioView`, e chama `impressaoController.init()`.

**No site (`cardapiopro`):**

- `lib/impressao/auto.ts`
  Adiciona:
  - `rodandoNoElectron()` — checa `typeof window !== 'undefined' && !!(window as any).electronAPI?.imprimirComanda`
  - `imprimirViaElectron(url)` — chama `window.electronAPI.imprimirComanda(url)`
  Ambas chamadas dentro de `dispararImpressao()`, antes do fallback de iframe — mesmo formato do rascunho abandonado do Tauri (`rodandoNoTauri()` / `imprimirViaTauri()`), só trocando a ponte de IPC.
  Nenhuma mudança em `SinoPedidos.tsx`, `PainelImpressao.tsx` ou `ComandaTermica.tsx`.

## Tratamento de erro

- Falha na impressão silenciosa (impressora offline, sem impressora padrão, timeout) → fallback para o fluxo atual (abre a janela de impressão com diálogo) em vez de falhar silenciosamente. O pedido nunca fica "sem imprimir e sem ninguém saber".
- Todo erro fica logado via `electron-log` (mesmo log já usado no resto do app).
- Fora do Electron, nada muda — mesmo comportamento de hoje.

## Rollout

Essa mudança só chega no computador da loja depois de um novo release do Electron publicado no GitHub Releases (o app já tem auto-update, instala sozinho depois de publicado — mesmo processo já usado hoje).

## Testes

Sem impressora térmica emulável em dev: testar no Mac/PC real com uma impressora física, ou com "Salvar como PDF"/impressora virtual como padrão do sistema, para confirmar que a impressão sai **sem** diálogo aparecer.

## Fora de escopo (YAGNI por agora)

- Selecionar impressora específica por nome (`impressoraNome` continua sendo só referência, como hoje) — sempre usa a impressora padrão do SO.
- Impressão via texto cru / ESC-POS direto na impressora por IP.
