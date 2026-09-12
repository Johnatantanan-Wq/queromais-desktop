# Fichas nativas — Configurações, Financeiro e Gestão

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o que hoje manda o lojista "ao painel" nas três áreas passa a ser feito no app, em popup (ficha), com os MESMOS campos e as MESMAS rotas que os formulários e modais do painel usam.

**Architecture:** cada formulário do painel vira (1) uma **ficha** em `renderer/elo/ficha.js` (HTML puro, campos `data-campo`), (2) uma **decisão pura** em `*-acoes.js` (valida com frase de gente e devolve `{ caminho, metodo, corpo, resumo }`), (3) um **canal** em `*-envio.js` (fala com o painel pela view logada) e o equivalente em demonstração (`*-local.js`, que aplica a mudança por cima do dado fictício), (4) o **gancho no shell** (abre a ficha, lê os campos, chama o canal, recarrega). O adaptador passa a expor os dados **brutos** (`bruto`) de que as fichas precisam para vir preenchidas.

**Tech Stack:** Electron 31, node:test + jsdom. Rotas do painel: as de `origin/main` do CardapioPro (levantadas em 12/09).

**Regras fixadas:**
1. Campo em branco na ficha NÃO é enviado (o PATCH do painel é parcial): hoje `GET /api/admin/loja` em produção devolve só 10 colunas, e mandar branco apagaria o que o app não vê. A ficha diz isso.
2. ⛔ Sem taxa de serviço e sem taxa de entrega padrão na ficha da loja (regra do dono, 02/09). Taxa por bairro fica: é o formulário de Rotas do próprio painel.
3. Sem upload de imagem (logo, capa) — não há como no app; a ficha diz que isso é pelo painel.
4. Fiscal, Integrações (token), Backup, Plano e Cardápio (cores/imagens) continuam pelo painel — e o rodapé da aba diz isso só nessas.
5. Toda ficha nova entra na varredura de botões (acoes.js / shell) e tem teste de renderização + teste da decisão.

---

## Parte A — Infra

### Task A1: helpers de ficha e leitura no shell
- `ficha.js`: `campoSelecao(rotulo, attr, opcoes[{v,r}], atual, dica)`, `campoMarcar(rotulo, attr, marcado, dica)` (checkbox), `campoArea(rotulo, attr, valor, dica)` (textarea), `campoNumero` = `campo` com `inputmode`.
- `shell.js`: `marcadoNaFicha(nome)` (`.checked`), `camposDaFicha(prefixo)` → `{ resto: valor }` para listas (`data-campo="taxa:Centro"`).
- Testes em `test/ficha.test.js` (helpers) e `test/simulacao-cliques.test.js` (leitura).

### Task A2: dados brutos no adaptador
- `adaptadores.configuracoes()` devolve `bruto: { loja, horarios, bairros, formas, contasFinanceiras, mesas, comanda, usuarios }` com ids; o loader `configuracoes-carregar` ganha `comandaResp: '/api/admin/comanda-config'` e `mesasResp` (já vem em `salaoResp.mesas`).
- `adaptadores.estoque()`: item leva `id`; fornecedor leva `id`, `email`, `endereco`, `observacoes`, `tipo`; pendência leva `id`; `fichas` ganha ids (`fichasResp: '/api/admin/estoque/fichas'` no loader: produtos, insumos e linhas).
- Testes em `test/adaptadores.test.js`.

## Parte B — Configurações

### Task B1: `config-acoes.js` (puro) + testes
```
loja(campos)                → PATCH /api/admin/loja           (só campos preenchidos; endereco só se algum campo veio)
horarios(campos)            → PATCH /api/admin/horarios       ({dom..sab:{abre,fecha}}, timezone)
bairros(campos)             → PATCH /api/admin/bairros        ({bairros[], taxas_bairro{nome:{taxa,ativo}}, entrega_gratis_valor_min})
formaNova(campos)           → POST  /api/admin/formas-pagamento
formaEditar(forma, campos)  → PATCH /api/admin/formas-pagamento/<id>
contaFinanceira(conta|null, campos) → POST/PATCH /api/admin/contas-financeiras[/<id>]
contaFinanceiraExcluir(c)   → DELETE /api/admin/contas-financeiras/<id>
mesasCriar(campos)          → POST  /api/admin/mesas          ({tipo, quantidade, numeroInicio, capacidade})
mesaEditar(mesa, campos)    → PATCH /api/admin/mesas/<id>     ({numero, capacidade, reservada})
mesaExcluir(mesa)           → DELETE /api/admin/mesas/<id>
colaboradorNovo(campos)     → POST  /api/admin/colaboradores  ({nome, cpf, senha, papeis[], pode_unir_mesas})
comanda(atual, campos)      → PUT   /api/admin/comanda-config (objeto inteiro: atual + campos)
```
### Task B2: `config-envio.js` (canais `config-*`) + `config-local.js` (demonstração) + registro no main
### Task B3: fichas (`fichaLoja`, `fichaHorarios`, `fichaBairros`, `fichaForma`, `fichaContaFinanceira`, `fichaMesasCriar`, `fichaMesa`, `fichaColaboradorNovo`, `fichaComanda`) + testes
### Task B4: `telas-finais.js` — botão por aba (`config:editar:<aba>`), abas Pagamento e Mesas com lista e botões por item, Usuário com "+ Novo colaborador", Impressora com "Comanda impressa"; rodapé "pelo painel" só onde ainda é
### Task B5: shell — ganchos + simulação por clique (loja, horários, bairros, forma, conta financeira, mesas, colaborador, comanda)

## Parte C — Financeiro

### Task C1: `contas-acoes.js` += `lancamento(campos)` (POST /api/admin/lancamentos), `editar(conta, campos)` (PATCH /api/admin/contas/<id>), `cancelar(conta, escopo)` (PATCH acao:'cancelar'); constantes `CATEGORIAS_DESPESA/RECEITA`, `CENTROS_CUSTO` copiadas do painel (lib/financeiro/plano.ts) — a lista mora no servidor, aqui é só para o select.
### Task C2: `contas-envio.js` += canais `lancamento-novo`, `conta-editar`, `conta-cancelar`; `contas-local.js` += editar/cancelar/lançamento no extrato
### Task C3: fichas `fichaLancamento(contasFinanceiras)`, `fichaContaEditar(conta)`, `fichaContaCancelar(conta)`
### Task C4: `tela-financeiro.js` — linha da conta ganha Editar/Cancelar; Contas bancárias ganha "+ Nova conta" e Editar/Desativar por conta; `novo-lancamento` nativo; shell + simulação

## Parte D — Gestão

### Task D1: `estoque-acoes.js` += `editarInsumo(item, campos)`, `ajusteEstoque(item, campos)` (PATCH /api/admin/ingredientes/<id> com acao/qtd/motivo), `entradaSemNota(campos)`, `entradaManual(campos)`, `editarFornecedor(f, campos)`, `excluirFornecedor(f)`, `resolverPendencia(p, campos)`, `fichaTecnica(produto, linhas)` (PUT /api/admin/estoque/fichas)
### Task D2: `estoque-envio.js` += canais; `estoque-local.js` += efeitos em demonstração
### Task D3: fichas `fichaInsumo(item)`, `fichaAjusteEstoque(item)`, `fichaEntradaSemNota(insumos, fornecedores)`, `fichaEntradaManual(fornecedores)`, `fichaFornecedorEditar(f)`, `fichaPendencia(p)`, `fichaTecnicaEditar(produto, insumos)`
### Task D4: `telas-abas.js` — `estoque:menu` abre a ficha do insumo; menu "Nova entrada" abre as fichas (à mão / sem nota); Resolver abre a ficha; Fornecedores com Editar; Fichas técnicas com Editar; shell + simulação

## Parte E — Fechar
- `npm test` verde; build v1.1.31, assinar, instalar, abrir; memória; relatório com o que ficou pelo painel (Lançar NF item a item, SEFAZ/XML, NF de saída, Fiscal, Integrações, Backup, Plano, Cardápio cores/imagens).

---

## Resultado (12/09/2026, madrugada — executado inline, TDD, 810 → 894 testes)

**Feito (tudo em `feat/presenca-desktop`, build v1.1.31):**
- A1/A2 infra: helpers de ficha (select, checkbox, textarea, confirmar), `bruto` no adaptador de Configurações, ids na Gestão, fichas técnicas pela rota própria, horários lidos por SIGLA (achado: nunca apareciam).
- B Configurações: loja, horários (+ modo para a loja), bairros/taxas, forma de pagamento (nova/editar), conta financeira (nova/editar/excluir), mesas (lote/editar/excluir), colaborador novo, comanda impressa. Lista com botão por item em Formas, Contas e Mesas.
- C Financeiro: novo lançamento (categorias do plano, centro de custo, forma, conta), editar e cancelar conta (série), contas bancárias (mesma ficha).
- D Gestão: ficha do item + movimentar estoque, entrada sem nota, entrada manual com nota, fornecedor (editar/excluir), pendência (resolver), ficha técnica (editar).
- Demonstração reflete tudo (registros locais); 20 fluxos por clique no shell real.

**Continua pelo painel (e a tela diz isso):** Lançar NF item a item (vincular/criar/ignorar), SEFAZ e XML, NF de saída/emissão fiscal, Fiscal (regime, certificado, produtos), Integrações (Mercado Pago), Backup, Plano, Cardápio (cores/imagens), acessos por módulo do colaborador, Administrador/Contador (entram por e-mail), estornar baixa, anexar nota à conta, conta fixa mensal, receber repasse.
