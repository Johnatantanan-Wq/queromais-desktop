# F3 Offline — F3.1 servidor · F3.3 fila de venda · F3.4 fechamento provisório

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** o balcão continua vendendo, imprimindo comanda e fechando o caixa sem internet; tudo sobe sozinho e sem duplicar quando a conexão volta; o fechamento feito sem rede nasce provisório e só vira definitivo com o servidor conferindo.

**Architecture:** no servidor (CardapioPro) três rotas ganham idempotência por `id_cliente_app` e o fechamento aceita um `retrato` do que o app viu, devolvendo o que ficou de fora (`aguardando_conferencia`). No desktop, uma **fila em disco cifrada** (`fila-escrita.js`) guarda venda, sangria/suprimento e fechamento feitos sem rede; a ponte **soma a fila por cima** do dado do servidor/cache nas telas de Caixa e Pedidos (marcando "não sincronizada"); o monitor de rede dispara a subida; a topbar diz quantas operações esperam.

**Tech Stack:** Next.js 15 (route handlers, zod, Supabase service-role) + vitest no servidor; Electron 31 (main/renderer, node:test, jsdom) no desktop. Spec: `docs/superpowers/specs/2026-09-07-pediu-desktop-f3-offline.md`.

**Repos e branches:**
- Servidor: worktree `~/dev/cardapiopro-worktrees/desktop-offline`, branch `feat/desktop-offline-f3` (criada de `origin/main` 7881d80e). ⛔ Nunca editar `~/dev/cardapiopro` (main sujo, outra sessão trabalha lá).
- Desktop: `~/dev/queromais-desktop`, branch `feat/presenca-desktop` (onde a F3.2 já está).

**Decisões fixadas (com o porquê):**
1. `id_cliente_app` é um UUID gerado no app no instante do fechamento da venda/movimentação/fechamento; índice único parcial `(loja_id, id_cliente_app)`. Reenviar devolve o registro existente com `repetida: true` — nunca 409, porque para a fila "já existe" é sucesso.
2. As colunas novas só entram no INSERT quando o app manda `id_cliente_app`: o painel continua funcionando antes da migration ser aplicada.
3. Sem internet só fecha em **dinheiro** (spec). O app não gera QR Pix; a regra vem da spec e pode ser relaxada depois — fica registrado no relatório.
4. O número provisório é `L-<n>` com contador persistido na própria fila; o prefixo é injetável (`L`) para permitir `L1-`/`L2-` por máquina depois.
5. Quem data a venda é o servidor; `criado_no_app_em` é só registro.
6. A fila é **FIFO estrita**: falha de rede/sessão/5xx PARA a fila (a ordem venda → fechamento importa). 4xx marca o item com erro e segue: um 400 não se cura sozinho, e travar a fila por ele seguraria o fechamento para sempre.
7. A tela do Caixa aprende "aguardando conferência" pela RESPOSTA do fechar (guardada na fila), não por rota de leitura: `/api/admin/caixa/resumo` só existe na branch `feat/api-menu-admin`, que ainda não foi para o main.

---

## Parte A — Servidor (F3.1)

### Task A1: migration 0262

**Files:**
- Create: `supabase/migrations/0262_desktop_offline_idempotencia.sql`

- [x] Escrever a migration (idempotente):

```sql
-- 0262 — Pediu! Desktop offline (F3.1): idempotência das escritas do app e fechamento provisório.
alter table pedidos add column if not exists id_cliente_app text;
alter table pedidos add column if not exists criado_no_app_em timestamptz;
create unique index if not exists uniq_pedidos_id_cliente_app
  on pedidos (loja_id, id_cliente_app) where id_cliente_app is not null;

alter table movimentacoes_caixa add column if not exists id_cliente_app text;
create unique index if not exists uniq_movimentacoes_caixa_id_cliente_app
  on movimentacoes_caixa (loja_id, id_cliente_app) where id_cliente_app is not null;

alter table caixas add column if not exists id_cliente_app text;
alter table caixas add column if not exists retrato jsonb;
alter table caixas add column if not exists divergencia jsonb;
alter table caixas add column if not exists fechamento_provisorio_em timestamptz;
create unique index if not exists uniq_caixas_id_cliente_app
  on caixas (loja_id, id_cliente_app) where id_cliente_app is not null;

-- status ganha 'aguardando_conferencia' (o índice uniq_caixa_aberto continua só em 'aberto')
do $$
declare con record;
begin
  for con in select conname from pg_constraint
    where conrelid = 'caixas'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%'
  loop execute format('alter table caixas drop constraint %I', con.conname); end loop;
end $$;
alter table caixas add constraint caixas_status_check
  check (status in ('aberto','fechado','aguardando_conferencia'));
```

- [x] Commit: `feat(caixa): migration 0262 — idempotência do app e fechamento provisório`

### Task A2: `lib/desktop/idempotencia.ts` (puro) + testes

**Files:**
- Create: `lib/desktop/idempotencia.ts`
- Test: `tests/unit/desktop/idempotencia.test.ts`

Interface:
```ts
export const idClienteAppSchema: z.ZodString            // trim, 8..80, [A-Za-z0-9_-]
export const retratoSchema: z.ZodObject<...>             // { movimentacoes: string[], vendas_app: string[], movimentacoes_app: string[] } (todas default [])
export type Retrato = z.infer<typeof retratoSchema>
export function ehViolacaoDeUnicidade(err: unknown): boolean   // code === '23505'
export function movimentacoesForaDoRetrato(movs: MovimentacaoCaixa[], retrato: Retrato, pedidosDoApp: ReadonlySet<string>): MovimentacaoCaixa[]
  // vivas (estornado_em null) e que o app NÃO viu: id ∉ movimentacoes, id_cliente_app ∉ movimentacoes_app, pedido_id ∉ pedidosDoApp
export function esperadoDoTurno(fundo: number, movs: MovimentacaoCaixa[], pixOnline?: ReadonlySet<string>): { dinheiro: number; pix: number; cartao: number }
  // dinheiro = esperadoDinheiro(); pix = resumoFormas().vendaPixConferir; cartao = vendaCartao
export function resumoDaMovimentacao(m: MovimentacaoCaixa): { id, tipo, forma, valor, descricao, criado_em }
```

- [x] Testes: schema aceita uuid e recusa vazio/curto/com espaço; `movimentacoesForaDoRetrato` ignora estornadas, casa por id, por id_cliente_app e por pedido do app, devolve o resto; `esperadoDoTurno` bate com `esperadoDinheiro`/`resumoFormas`.
- [x] Implementar; `npx vitest run tests/unit/desktop/idempotencia.test.ts` verde; commit.

### Task A3: `POST /api/admin/venda` idempotente

**Files:**
- Modify: `app/api/admin/venda/route.ts`
- Modify: `lib/supabase/types.ts` (Pedido += `id_cliente_app?`, `criado_no_app_em?`)
- Test: `tests/unit/desktop/venda-idempotente.test.ts` (dublê do Supabase + mocks dos efeitos)

- [x] schema += `id_cliente_app: idClienteAppSchema.optional()`, `criado_no_app_em: z.string().datetime({ offset: true }).optional()`.
- [x] Antes de `proximo_numero_pedido`: se `d.id_cliente_app`, `select id, numero, total, status, tipo, items` por `(loja_id, id_cliente_app)`; existindo → `200 { id, numero, total, cobrancaPix: null, items, tipo, status, repetida: true }`.
- [x] Insert leva `id_cliente_app`/`criado_no_app_em` só quando vieram. Se o insert falhar com 23505 e houver `id_cliente_app` → re-select e devolver `repetida: true` (duas tentativas correndo).
- [x] Resposta 201 ganha `id_cliente_app` ecoado.
- [x] Teste: (1) duas chamadas com o mesmo id → 1 rpc de número, 1 insert, 2ª resposta `repetida: true` e mesmo `numero`; (2) sem id → comportamento de hoje (insert sem as colunas novas); (3) 23505 no insert → re-select e `repetida: true`.
- [x] Commit.

### Task A4: `POST /api/admin/caixa/movimentacao` idempotente

**Files:**
- Modify: `app/api/admin/caixa/movimentacao/route.ts`
- Modify: `lib/supabase/types.ts` (MovimentacaoCaixa += `id_cliente_app?`)
- Test: `tests/unit/desktop/movimentacao-idempotente.test.ts`

- [x] Body aceita `id_cliente_app` (validado pelo schema; inválido → 400). Existindo movimentação com esse id na loja → `200 { ...linha, repetida: true }`. Insert leva o id só quando veio; 23505 → re-select.
- [x] Teste com dublê; commit.

### Task A5: `POST /api/admin/caixa/fechar` com retrato + conferência

**Files:**
- Modify: `app/api/admin/caixa/fechar/route.ts`
- Modify: `app/api/admin/caixa/route.ts` (GET devolve `aguardandoConferencia: Caixa[]`)
- Modify: `app/admin/caixa/page.tsx` (histórico inclui `aguardando_conferencia`) e `app/admin/caixa/PainelCaixa.tsx` (Histórico mostra o selo "aguardando conferência" no lugar das diferenças)
- Modify: `lib/supabase/types.ts` (`StatusCaixa` += `'aguardando_conferencia'`; Caixa += `retrato?`, `divergencia?`, `fechamento_provisorio_em?`, `id_cliente_app?`)
- Test: `tests/unit/desktop/fechar-conferencia.test.ts`

Corpo novo (tudo opcional): `retrato`, `id_cliente_app`, `fechado_no_app_em`, `confirmar`.

Fluxo:
1. contagem obrigatória (igual hoje).
2. `id_cliente_app` e já existe caixa `fechado` com ele → `200 { ok: true, definitivo: true, repetida: true }`.
3. caixa = `aberto`; se não há e `confirmar` → o mais recente `aguardando_conferencia`; nenhum → 422 "Nenhum caixa aberto".
4. movs, pixNaConta, `d = diferencas(...)` (igual hoje).
5. Se `retrato` e não `confirmar`: `pedidosDoApp` = ids de `pedidos` com `id_cliente_app in retrato.vendas_app`; `fora = movimentacoesForaDoRetrato(...)`. Se `fora.length`: UPDATE caixa `{ status: 'aguardando_conferencia', retrato, divergencia: { movimentacoes: fora.map(resumoDaMovimentacao), esperado: esperadoDoTurno(...), contado }, fechamento_provisorio_em: fechado_no_app_em ?? agora, id_cliente_app, dinheiro_contado, pix_contado, cartao_contado, fechado_por }`, auditoria `fechamento_provisorio`, resposta `200 { ok: true, definitivo: false, aguardandoConferencia: true, caixaId, naoVistas, esperado, diferencas: d }`. Sem `fora` → segue para 6 (bate → definitivo, sem intervenção).
6. Definitivo: regra de diferença máxima (igual hoje) → UPDATE `{ status: 'fechado', ..., retrato: retrato ?? caixa.retrato ?? null, divergencia: null, id_cliente_app: id_cliente_app ?? caixa.id_cliente_app ?? null }` → resposta de hoje + `definitivo: true`.

- [x] Testes: retrato completo → `definitivo: true`; retrato sem uma venda do site → `definitivo: false` com `naoVistas` de 1 e caixa `aguardando_conferencia`; `confirmar: true` num caixa aguardando → `fechado`; repetir `id_cliente_app` de caixa fechado → `repetida`; sem retrato → igual a hoje.
- [x] `npx tsc --noEmit` limpo nos arquivos tocados; `npx vitest run tests/unit/desktop` verde; commit.

---

## Parte B — Desktop (F3.3 + F3.4)

### Task B1: `src-electron/fila-escrita.js` + testes

**Files:**
- Create: `src-electron/fila-escrita.js`
- Test: `test/fila-escrita.test.js`

Interface:
```js
criarFila({ store, chave, prefixo = 'L', agora = Date.now, gerarId })
  // store: { get(chave) → {body}|null, set(chave, {status, body}) } (cache-store); chave = 'fila|<lojaId>'
  .enfileirar({ tipo: 'venda'|'movimentacao'|'fechamento', caminho, corpo, resumo }) → item
  //   item = { id: corpo.id_cliente_app, tipo, caminho, corpo, resumo, provisorio, criadoEm, tentativas: 0, erro: null }
  //   venda ganha provisorio = prefixo + '-' + contador++ (persistido)
  .pendentes() / .comErro() / .todos() / .tamanho()
  .remover(id)
  .subidas()                 // [{ provisorio, numero, id, em }] últimas 50
  .fechamentoPendente()      // item tipo 'fechamento' ainda na fila, ou null
  .conferencia() / .guardarConferencia(obj|null)   // resposta definitivo:false do fechar
  .estado() → { pendentes, comErro, total (R$ das vendas pendentes), ultimoErro, conferencia: bool, fechamentoProvisorio: {em, contados}|null }
  .exportar() → string JSON (todos os itens + subidas + conferencia)
  async .processar({ enviar, online, aoSubir, maxTentativas = 5 }) → { subiram, parou: null|'offline'|'rede'|'sessao'|'servidor' }
  //   enviar(caminho, corpo) → { status, body } (lança em falha de rede)
  //   single-flight; FIFO; 2xx → remover + subidas + aoSubir(item, body); 401/403 → parou 'sessao'
  //   5xx → tentativas++ e parou 'servidor' (com maxTentativas → erro + segue); 4xx → erro na hora e segue; rede → parou 'rede'
```
Persistência: cada mutação → `store.set(chave, { status: 200, body: { itens, subidas, contador, conferencia } })`; `criarFila` lê o que houver.

- [x] Testes (node:test, store em memória e também em disco via `makeStore` num tmpdir): sobrevive a recriar; FIFO; para na rede e mantém; 2xx remove e registra subida; 401 para; 500 conta tentativa e após 5 vira erro; 400 vira erro e o próximo item ainda sobe; single-flight; contador `L-1`, `L-2` persistido; `exportar` traz tudo; `estado` soma só vendas.
- [x] Implementar; `node --test test/fila-escrita.test.js`; commit.

### Task B2: `venda-envio.js` — vender sem internet

**Files:**
- Modify: `src-electron/venda-envio.js`
- Test: `test/venda-envio.test.js` (adicionar)

`registrar({ ipcMain, enviar, enviarComStatus, log, fila, online, gerarId, agora })`:
- corpo += `id_cliente_app: gerarId()`, `criado_no_app_em: new Date(agora()).toISOString()`.
- `fila && online && !online()` → offline: forma ≠ dinheiro → `{ ok: false, erro: 'Sem internet só dá para fechar em dinheiro — Pix e cartão precisam de conexão. Troque a forma e feche de novo.' }`; senão enfileira (`resumo` = { cliente, telefone, total, forma, tipo, itens, canal }) → `{ ok: true, provisorio: true, numero: 'L-1', id_cliente_app }`.
- online: `enviarComStatus` (se existir; senão `enviar` como hoje). Lançou/`status 0` → mesma regra do offline (dinheiro → fila; outra forma → erro pedindo para trocar). 401/403/5xx → fila (a venda já aconteceu; reenviar é seguro). 2xx → `{ ok, numero, id, total }` (com `repetida` passa igual). Outro 4xx → erro do painel.
- Sem `fila` (compat com os testes de hoje) → comportamento atual.

- [x] Testes: offline dinheiro → provisório `L-1` e item na fila com `id_cliente_app` e `criado_no_app_em`; offline pix → recusa e fila vazia; online com rede caindo (lança) → fila; 401 → fila; 200 → ok sem fila; 400 → erro sem fila.
- [x] Commit.

### Task B3: `fila-telas.js` — a fila somada nas telas

**Files:**
- Create: `src-electron/fila-telas.js` (puro)
- Test: `test/fila-telas.test.js`

```js
aplicarNoCaixa(dados, fila)   // dados do canal caixa-carregar (pode ser null → volta null)
  // vendas pendentes viram movimentacoes no topo { id: 'fila-'+id, tipo:'venda', forma, valor, descricao: 'Venda L-3 — Ana · não sincronizada', criadoEm, estornada:false, naoSincronizada:true }
  // resumo.vendaDinheiro / vendaPix / vendaCartao somam pela forma; esperadoDinheiro soma dinheiro
  // movimentações pendentes (sangria/suprimento) somam em resumo.sangrias/suprimentos e no esperadoDinheiro
  // dados.fila = estado() ; dados.fechamentoProvisorio = { em, contados } se houver fechamento na fila ; dados.conferencia = fila.conferencia()
aplicarNoQuadro(dados, fila)  // pedidos-carregar: itens.unshift(comoPedido) com numero = provisorio, etapa 'producao', naoSincronizada: true
```
- [x] Testes: soma certa por forma; esperado em dinheiro; `null` continua `null`; quadro recebe o cartão com `L-2` e `naoSincronizada`.
- [x] Commit.

### Task B4: caixa sem internet — sangria/suprimento na fila, fechamento provisório, conferência

**Files:**
- Modify: `src-electron/caixa-acoes.js` (`fechamento` aceita `retrato`, `idClienteApp`, `fechadoEm` e os põe no corpo; `movimentacao` aceita `idClienteApp`)
- Modify: `src-electron/caixa-envio.js` (`registrar({ ipcMain, enviar, enviarComStatus, log, fila, online, retratoAtual, gerarId })`)
- Test: `test/caixa-envio.test.js` (novo)

Regras:
- `caixa-movimentacao` offline (ou rede caindo) → fila tipo `movimentacao` → `{ ok: true, provisorio: true, resumo: 'Sangria de R$ 50,00 anotada — sobe quando a internet voltar.' }`.
- `caixa-fechar`: corpo += `retrato: retratoAtual()`, `id_cliente_app`, `fechado_no_app_em`. Offline → fila tipo `fechamento` → `{ ok: true, provisorio: true, resumo: 'Caixa fechado PROVISORIAMENTE — feito sem internet, sujeito a conferência quando a conexão voltar.' }`. Online e resposta `definitivo: false` → `fila.guardarConferencia(body)` → `{ ok: true, conferencia: body }`. Online e `definitivo: true` → `{ ok: true, resumo }` e limpa conferência.
- Canal novo `caixa-conferencia-confirmar` `{ dinheiro, pix, cartao, observacao }` → POST fechar `{ ...contados, confirmar: true, id_cliente_app: conferencia.idClienteApp }` → ok → limpa conferência.
- Os outros canais (abrir, entrega, mesa) ficam online-only como hoje.
- `retratoAtual` (main): `{ movimentacoes: ids do caixa no cache (cache.get('caixa|'+loja).body.movimentacoes, sem os 'fila-'), vendas_app: ids das vendas pendentes, movimentacoes_app: ids das movimentações pendentes }`.
- Quando a fila processa um `fechamento` e o body vem `definitivo: false` → `guardarConferencia(body)` (no `aoSubir` do main).

- [x] Testes: fechar offline → item com retrato e `fechado_no_app_em`; online `definitivo:false` → conferência guardada; confirmar → POST com `confirmar: true` e limpa; sangria offline → fila.
- [x] Commit.

### Task B5: main.js e ponte — ligar tudo

**Files:**
- Modify: `src-electron/main.js` (bloco SHELL_ELO, fora do DEMO)
- Modify: `src-electron/ponte.js` (`registrar` recebe `fila`; embrulha `caixa-carregar` e `pedidos-carregar` com `fila-telas`; canais `fila-estado`, `fila-processar`, `fila-exportar`)
- Test: `test/ponte-telas.test.js` (adicionar: com fila, o caixa vem somado; sem fila, igual)

- [x] `enviarComStatus` ao lado de `enviarAoPainel`: `fetch(...).then(r=>r.json().catch(()=>null).then(b=>({status:r.status,body:b}))).catch(()=>({status:0,body:null}))`; view morta → `{ status: 0, body: null }`.
- [x] `filaDisco = makeStore(userData/fila, safeStorage)`; `fila = criarFila({ store: filaDisco, chave: 'fila|' + lojaDaVez, gerarId: crypto.randomUUID })`. ⚠️ a chave por loja: usar `ponte.lojaDaVez(cacheDisco, getConfig().lojaId)` no boot.
- [x] `subirFila()` = `fila.processar({ enviar: enviarComStatus, online: () => monitorRede.online() && !_semSessao, aoSubir })` → depois manda `fila-mudou` (estado) e, por venda, `venda-subiu { provisorio, numero, id }`; log.
- [x] Gatilhos: `aoMudar(true)` do monitor; `did-finish-load` + 6 s; `setInterval` 60 s se `fila.tamanho()`.
- [x] `venda-envio`, `caixa-envio` recebem `fila`, `online`, `enviarComStatus`, `retratoAtual`, `gerarId`.
- [x] Canais: `fila-estado` → `fila.estado()`; `fila-processar` → `subirFila()` e devolve estado; `fila-exportar` → `dialog.showSaveDialog` em Downloads (`vendas-pendentes-<data>.json`) e grava `fila.exportar()`.
- [x] `npm test` verde; commit.

### Task B6: telas — Venda, Caixa, Quadro, topbar, comanda

**Files:**
- Modify: `renderer/elo/tela-venda.js` (Pix/crédito/débito esmaecidos quando `estado.online === false`, com motivo; recibo provisório com a frase da spec e "sobe quando a internet voltar"; após subir mostra "L-3 → #1051")
- Modify: `renderer/elo/tela-caixa.js` (faixa amarela com `dados.fila` "3 vendas feitas sem internet esperando para subir · R$ 120,00" + botões `fila:tentar`/`fila:exportar` quando há erro; movimentação `naoSincronizada` com selo; `dados.fechamentoProvisorio` → faixa âmbar "FECHAMENTO PROVISÓRIO — feito sem internet às 22:41, sujeito a conferência" e some o botão Fechar; `dados.conferencia` → faixa vermelha "Fechamento aguardando conferência: 2 vendas que o app não viu" + botão `caixa:conferencia:abrir`)
- Modify: `renderer/elo/tela-quadro.js` (cartão `naoSincronizada` ganha selo "não sincronizada"; sem botão Avançar)
- Modify: `renderer/elo/ficha.js` (`fichaConferencia(conf)`: lista `naoVistas`, esperado × contado, campos dos contados pré-preenchidos, botões `caixa:conferencia:confirmar` / `caixa:conferencia:depois`; `fichaFila(estado, itens)`: lista pendentes/erros + Tentar agora + Exportar)
- Modify: `renderer/elo/tela-impressao.js` (PEDIDO L-3 · PROVISÓRIO — sem internet)
- Modify: `renderer/elo/acoes.js` (destinos `fila:tentar`, `fila:exportar`, `caixa:conferencia:*` → app)
- Modify: `renderer/elo/shell.js` (estado `FILA`; `pintar()` no chip: offline+fila → "sem internet · 3 na fila"; online+pendentes → "conectado · subindo 3…"; erro → "1 não subiu" vermelho; clique no chip com fila → `fichaFila`; `fila-mudou` e `venda-subiu` atualizam `FILA` e o recibo; `fecharVenda` trata `r.provisorio`; `mandarAoCaixa` trata `r.conferencia` (abre a ficha) e `r.provisorio`; ações novas)
- Tests: `test/tela-venda.test.js`, `test/tela-caixa.test.js`, `test/ficha.test.js`, `test/simulacao-cliques.test.js` (fluxo: offline → fechar em dinheiro → recibo L-1 → chip com fila → `venda-subiu` → recibo #1051; offline → fechar caixa → faixa provisória; `definitivo:false` → ficha de conferência → confirmar), `test/varredura-telas.test.js` continua verde.

- [x] Commit por tela (venda; caixa+ficha; quadro; topbar/shell; comanda).

### Task B7: build, assinatura, instalação, prova

- [x] `df -h /` (≥ 2 GB livres; limpar `dist/` antigo se preciso). — 12/09 01:00: dist antigo (682 MB) removido; 2,3 GB livres.
- [x] `npm test` = tudo verde (contar). — 804/804.
- [x] build v1.1.30 arm64 → assinado → instalado em `/Applications` → re-assinado → asar conferido (`"shell": "elo"`, `com.pediu.desktop.beta`, `fila-escrita.js`, `fila-telas.js`, `caixa-envio.js`).
- [x] Abrir o app (`open -a` + `reopen`) e capturar a tela. — Visão geral desenhada em demonstração; boot conectado sem erro no log.
- [x] Commit final + atualizar memória.

---

## Self-review (spec × plano)

| spec | tarefa |
|---|---|
| id próprio + número provisório visível, comanda com ele | B1, B2, B6 (impressão) |
| fila em disco cifrada com itens, pagamento, carimbo | B1 (`makeStore` com safeStorage) |
| Caixa e Pedidos somam a venda marcada "não sincronizada" | B3, B5, B6 |
| número oficial substitui o provisório na tela e no histórico | B5 (`venda-subiu`), B1 (`subidas`), B6 |
| reenviar é seguro | A3, A4, A5 |
| Pix/cartão esmaecidos offline com motivo | B2, B6 |
| fechamento nasce provisório com retrato; a tela e o comprovante dizem | B4, B6 |
| servidor compara e devolve a diferença; conferência antes de fechar | A5, B4, B6 |
| turno "aguardando conferência" no app e no painel | A5 (GET + histórico do painel), B6 |
| app fechado com fila pendente: avisa e tenta | B5 (boot), B6 (aviso) |
| fila que nunca sobe: erro em português + exportar | B1, B5, B6 |
| relógio errado: servidor data a venda | A3 |
| duas máquinas: prefixo por máquina | B1 (`prefixo` injetável; padrão `L`) |
| pré-carga (F3.2) | já pronta |
