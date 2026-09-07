# Pediu! Desktop v2 — a arquitetura do Elo aplicada ao Pediu

**Data:** 07/09/2026
**Repos:** `~/dev/queromais-desktop` (app Electron, marca `pediu`) e `~/dev/cardapiopro` (painel web + API)
**Referência de arquitetura e visual:** `~/dev/OVD-VENDAS/capa` (Elo Integrações v0.1.255)

## Objetivo

Nova versão do **Pediu! Desktop** com a **estrutura do Elo — fiel, não inspirada**: telas nativas no
Electron, shell próprio (sidebar 252px + topbar 74px), tipografia Plus Jakarta Sans, e a mesma
camada de dados que permite ao Elo **abrir e trabalhar sem internet**.

O offline não é uma fase distante: é o motivo da escolha arquitetural. Toda decisão aqui é tomada
para que o modo offline do Pediu caiba depois **sem reescrever nada**.

Acento: **verde `#14CE6B`** (`brands/pediu/brand.json`) no lugar do amarelo `#FFC107` do Elo.

## Isolamento: é um app beta, e nada do que existe muda (decidido 07/09)

O shell novo **não** substitui o app de ninguém. Cada marca ganha uma variante beta — um app
separado, que instala **ao lado** do de produção:

| | produção | beta |
|---|---|---|
| `app_id` | `com.pediu.desktop` | `com.pediu.desktop.beta` |
| dados e sessão | `pediu-desktop` | `pediu-desktop-beta` |
| instalador / releases | `Pediu-Desktop-*` | `Pediu-Desktop-Beta-*` |
| shell | o de hoje (ícones, 56px) | `"shell": "elo"` |

Mesma `plataforma_slug`, mesmo domínio, mesma conta: o beta conversa com o **mesmo painel**. O que
muda é só o app. Serve todas as marcas (`pediu-beta`, `queromais-beta`), cada uma com a sua cor — o
acento sai de `cor_primaria`, com os tons derivados.

O gatilho é o campo `shell` do `brand.json`. Sem ele, o `main.js` **não carrega nem executa** uma
linha do caminho novo: `posicionarViews` mantém o corpo original, e ponte, cache e monitor de rede
ficam dentro de `if (SHELL_ELO)`. No `cardapiopro`, mesma regra: o `AdminShell` fica idêntico ao
`main`, a rota `GET /api/admin/menu` é aditiva, e um teste trava a sincronia entre o menu do painel
e o servido ao app (verificado que ele falha quando as duas listas divergem).

## Por que a casca de hoje não serve

O Pediu! Desktop atual (v1.1.29) é uma casca: barra escura de 56px só com ícones
(`renderer/index.html:34-58`) e duas `BrowserView` — o painel `app-pediu.com.br/admin` e o WhatsApp
Web (`src-electron/main.js:325-425`).

**Sem internet, uma `BrowserView` não carrega — a tela fica branca.** Nenhum tema de CSS muda isso.
É por isso que o Elo não é uma casca: no Elo, as telas moram **dentro do app** (`capa/renderer/`,
25.6 mil linhas) e só os dados vêm de fora, passando por um cache em disco.

## A arquitetura do Elo, peça por peça

| peça do Elo | arquivo | o que faz | no Pediu |
|---|---|---|---|
| shell nativo | `capa/renderer/index.html:257-320` | sidebar 252/76px + topbar 74px + área de conteúdo | igual, verde no lugar do amarelo |
| telas nativas | `capa/renderer/*.js` | cada módulo desenha HTML local e lê dados pela ponte | mesmo padrão, módulo a módulo |
| ponte de dados | `capa/main.js` (~80 canais IPC) | o renderer nunca fala com a rede; pede ao main | igual, sobre a API REST do CardapioPro |
| cache cifrado | `capa/cache-store.js` | resposta guardada por chave, cifrada (`safeStorage`), com carimbo de tempo, escrita atômica | igual, mesmo módulo |
| fila offline | `capa/renderer/carrinho-offline.js` | rascunhos em disco, sobem sozinhos quando a rede volta; lock, timeout, idempotência dupla | igual, para venda/caixa |
| entrada offline | `capa/renderer/offline.js` | sem rede + cache válido → abre com selo; volta ao online sozinho ao **pingar de verdade** (não `navigator.onLine`) | igual |
| sync de fundo | `capa/renderer/sync-auto.js` | renova catálogo/preço em segundo plano, sem o usuário pedir | igual, para cardápio e configurações |
| registro em arquivo | `capa/main.js:50-90` | todo log em disco com rotação — é o que permite diagnosticar em campo | igual |

**Uma vantagem grande sobre o Elo:** a OVD não tem API, e por isso o Elo precisa de webviews
ocultos, grampo de XHR e sessão portadora. O CardapioPro **tem API própria** — 234 rotas em
`app/api/admin/` (ex.: `app/api/admin/caixa/route.ts`), autenticadas por sessão Supabase com RLS por
loja. O Pediu! Desktop fala direto com ela: sem grampo, sem raspagem, sem sessão portadora. A parte
mais frágil do Elo simplesmente não precisa existir aqui.

## Camadas

```
┌─ Electron: renderer nativo ───────────────────────────────────┐
│ titlebar 44px                                                 │
├──────────────┬────────────────────────────────────────────────┤
│ sidebar Elo  │ topbar 74px · título + data · selo OFFLINE     │
│ 252px ⇄ 76px ├────────────────────────────────────────────────┤
│ PRINCIPAL    │  tela NATIVA (HTML local do app)               │
│  Visão geral │  — ou, enquanto o módulo não foi portado,      │
│  Caixa    ●  │    a BrowserView do painel web (só online)     │
│  Pedidos  ⑤  │                                                │
├──────────────┤                                                │
│ loja · Sair  │                                                │
└──────────────┴────────────────────────────────────────────────┘
        │
┌───────▼─ processo principal (main) ───────────────────────────┐
│ ponte IPC · cache cifrado em disco · fila offline · sync      │
│ detector de rede (ping real) · impressão · log em arquivo     │
└───────┬───────────────────────────────────────────────────────┘
        │  HTTPS (sessão Supabase, cookies da partition)
┌───────▼─ CardapioPro ─────────────────────────────────────────┐
│ /api/admin/* (234 rotas) + Supabase (RLS por loja)            │
└───────────────────────────────────────────────────────────────┘
```

O ponto que faz o offline caber: **o renderer nunca chama a rede**. Ele pede ao main, e o main
decide — servidor, cache ou fila. É assim no Elo, e é o que permite a mesma tela funcionar online e
offline sem código duplicado.

### Nativização progressiva (o caminho que o Elo já percorreu)

O Elo não nasceu com 44 telas nativas: começou como capa e foi trazendo módulo a módulo, deixando o
webview atender o que ainda não tinha sido portado. O Pediu faz igual, mas com a ordem definida pelo
offline: **o módulo entra nativo quando precisa funcionar sem internet.** Enquanto isso, o item do
menu abre a `BrowserView` do painel — o app já tem a cara certa desde o primeiro dia, e nenhuma
funcionalidade se perde no caminho.

## O shell (fiel ao Elo)

Fonte: `capa/renderer/index.html:257-320` e `capa/renderer/elo-ui.js:409-490`.

| papel | Elo | Pediu! |
|---|---|---|
| acento | `#FFC107` | `#14CE6B` |
| acento escuro | — | `#0AA758` |
| fundo do item ativo | `#fff3cc` | `#E7FAF0` |
| texto do item ativo | `#8a6508` | `#0A7A3E` |
| linha do acento | `#eed571` | `#A8E9C6` |
| fundo / superfície / linhas | `#f6f6f4` / `#fff` / `#ebebe8` | iguais |
| textos | `#111111` / `#4b5563` / `#9ca3af` | iguais |

Tipografia **Plus Jakarta Sans** (500/600/700/800), escala do Elo: título 17/800 (`-.01em`), data
12/500, grupo do menu 10/800 caixa alta (`.12em`), item 13/500 (ativo 700), KPI rótulo 11.5/700 e
valor 22/800 (`-.02em`), cabeçalho de tabela 10.5/700 caixa alta (`.05em`), corpo 13/600.

Estrutura: sidebar 252px que recolhe para 76px, grupos rotulados, item com raio 10px e **faixa
lateral de 3px** quando ativo, badge pill, rodapé com avatar quadrado + nome da loja + documento +
Sair. Topbar de 74px com título da tela, data por extenso, chips, busca e sino. Conteúdo com respiro
26/32px. Card raio 16px com sombra `0 1px 2px rgba(17,17,17,.03)`. Caixa de texto 38px, raio 10px,
foco com anel do acento. Botão principal 36px, raio 10px, peso 800. Tabela com cabeçalho `#f6f6f4`,
zebra `#fafafa` e faixa na linha selecionada.

Os helpers do Elo são portados com os mesmos nomes, para que quem escreve tela nova não reinvente
lista: `eloGrade` (grade), `eloGradeCell`/`eloGradeBadge` (célula e etiqueta), `eloIcon` (ícone de
linha) e `eloLoadingHtml` (carregando).

## Menu: uma fonte de verdade

O menu do painel passa por cinco filtros em cascata (`cardapiopro/app/admin/AdminShell.tsx:326-338`):
modo de negócio, beta por marca, entitlement de plano, permissões do usuário e `temMesas`. Copiar
essas regras para o Electron as desincronizaria na primeira mudança.

1. A montagem sai para **`lib/admin/menu.ts`** — `SECOES` (ícones como string de `path`, não JSX) e
   `filtrarSecoes(ctx)` com os mesmos cinco filtros. O `AdminShell` passa a consumir a função:
   nenhuma regra muda de comportamento, só de lugar.
2. Novo **`GET /api/admin/menu`** devolve o menu já filtrado, mais loja, usuário, marca e badges.
3. O Electron busca esse JSON com a sessão da própria partition, guarda **no cache cifrado** (é o
   que permite desenhar o menu certo na abertura offline) e redesenha quando a resposta muda.

## Offline (o destino)

Cada módulo nativo declara o que precisa para viver sem rede:

| peça | regra (herdada do Elo) |
|---|---|
| **leitura** | toda resposta de leitura vai para o cache cifrado por chave; sem rede, a tela abre com o cache e mostra a idade do dado ("atualizado há 2 h"), nunca uma tela vazia |
| **escrita** | vai para a fila em disco com **id gerado no app**; a tela dá o retorno na hora e a fila sobe sozinha quando a rede volta |
| **idempotência** | o id do app viaja na requisição e o servidor deduplica — reenviar nunca duplica venda (requisito novo do lado do CardapioPro) |
| **conexão** | ping real na API, nunca `navigator.onLine` (mente em Wi-Fi de praça de alimentação) |
| **entrada** | sem rede + cache válido: o app abre no mesmo botão de sempre, com selo "offline" na topbar; volta ao online sozinho |
| **conflito** | o servidor é a verdade; divergência vira aviso na tela, nunca correção silenciosa |
| **prova** | operação só aparece como "sincronizada" com resposta do servidor — o padrão `sincronizado-so-com-prova` do Elo |

**Primeiro módulo offline: Caixa/PDV** — é o que dói quando a internet cai no balcão: vender,
imprimir a comanda (a impressão já é local no desktop) e registrar o dinheiro. Precisa de cardápio,
formas de pagamento e caixa aberto em cache, e da fila de vendas com id idempotente.

Requisito no CardapioPro: `POST /api/admin/venda` (e as escritas de caixa) passam a aceitar um
`id_cliente_app` e devolver a venda existente quando ele repetir.

## Fluxos

| fluxo | como fica |
|---|---|
| **login** | tela nativa no visual Elo; a sessão fica na partition (como hoje) e vale para API e BrowserView |
| **módulo não portado** | item do menu abre a `BrowserView` no lugar do conteúdo; sem rede, o item aparece esmaecido com "precisa de internet" |
| **rota ativa** | pelo item clicado; navegando dentro da BrowserView, o `did-navigate` corrige o item |
| **badges e sino** | do `/api/admin/menu`, com o último valor conhecido em cache |
| **WhatsApp** | item fixo no rodapé do menu; continua `BrowserView`, com `setTopBrowserView` |
| **impressão** | intocada (`src-electron`, spec de 02/07/2026) — e é o que faz o offline valer a pena |
| **atualização** | intocada (`electron-updater`, repo `pediu-desktop`) |

## Fora de escopo

- Mexer nos apps de produção: o shell novo vive só nas marcas beta (ver o isolamento acima).
- O painel no navegador não muda de visual.
- Portar todos os módulos de uma vez: só o Caixa/PDV nasce nativo; o resto entra por prioridade.

## Riscos

| risco | mitigação |
|---|---|
| tela nativa divergir da web e as duas se contradizerem | a nativa consome a **mesma API**, e o servidor continua sendo a verdade |
| venda duplicada ao reenviar a fila | id do app + deduplicação no servidor, testado antes de a fila entrar |
| `BrowserView` cobrir sidebar/topbar (já aconteceu — `main.js:553-572`) | manter o watchdog, ajustado a 252/76px e 74px |
| congelar no Windows ao trocar de view | manter `setTopBrowserView`, nunca add/remove em runtime |
| cache guardar dado de outra loja | chave do cache inclui `loja_id`; trocar de loja limpa o que é da loja anterior |
| esforço de nativizar 30+ módulos | não se nativiza tudo: só o que precisa de offline; o resto segue web |

## Testes

- **`lib/admin/menu.ts`**: os cinco filtros dão o mesmo resultado do `AdminShell` de hoje.
- **`/api/admin/menu`**: sem sessão → 401; com sessão → só o que o usuário enxerga.
- **cache**: escrita atômica, leitura cifrada, `PLAIN:` de fallback (portados com os testes do Elo).
- **fila**: reenvio não duplica; app fechado no meio não perde item; lock não roda duas vezes.
- **offline**: sem rede o app abre pelo cache e mostra a idade do dado; ao voltar, sobe sozinho e só
  marca "sincronizado" com resposta do servidor.
- **Electron**: item ativo acompanha a navegação; sidebar recolhida persiste; watchdog protege o chrome.

## Entrega em fases

1. **F1 — fundação**: shell nativo (sidebar/topbar/verde/tipografia), ponte IPC, cache cifrado,
   detector de rede, log em arquivo, menu vindo do servidor. Todo módulo ainda abre a BrowserView.
2. **F2 — Caixa/PDV nativo**: a primeira tela nativa de verdade, com leitura por cache.
3. **F3 — offline do Caixa/PDV**: fila de escrita com id idempotente (com o suporte no CardapioPro),
   selo offline, sincronização automática e "sincronizado só com prova".
4. **F4 — próximos módulos**, por prioridade de offline: Pedidos, Cardápio (consulta), Clientes.

---

## F1 — resultado (07/09/2026)

**Feito e verificado:**

| item | prova |
|---|---|
| menu como fonte única (`lib/admin/menu.ts` + `filtrarSecoes`) | 7 testes das cinco regras |
| `AdminShell` consumindo o módulo | comparação item a item com a versão anterior: 22 itens, mesmos ids, rotas, rótulos e desenho de ícone |
| `GET /api/admin/menu` | 3 testes de montagem; ao vivo responde 401 sem sessão (middleware) e o servidor sobe sem erro |
| cache cifrado, monitor de rede, bounds, ponte | 28 testes (`npm test` no desktop) |
| shell elo (sidebar 252/76, topbar 74, verde `#14CE6B`) | renderizado com o menu real: `~/Desktop/prit/pediu-desktop-shell-*.png` |
| Quero Mais sem regressão | posicionamento idêntico ao anterior em 12 combinações de tamanho e modo |

**Não verificado nesta máquina:** rodar o app Electron de verdade. O Gatekeeper apagou o
`Electron.app` de `node_modules/electron/dist` (ver memória `electron-dev-bloqueado-gatekeeper`) —
`npx electron .` sai com ENOENT. O visual foi conferido renderizando o shell real (mesmo CSS, mesmo
`shell.js`) no Chrome, com o menu real extraído de `lib/admin/menu.ts`. Falta, com o app instalado
e logado: o menu vindo do servidor de verdade, o clique navegando a `BrowserView`, e o selo de
conexão mudando ao desligar o Wi-Fi.

**Estado do repo:** a marca aplicada é a `pediu` (`npm run apply-brand pediu`). Para voltar ao
Quero Mais: `npm run apply-brand queromais`.
