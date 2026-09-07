# F3 — Operar sem internet: vender, fechar venda e fechar caixa

**Data:** 07/09/2026
**Repos:** `~/dev/queromais-desktop` (app beta) e `~/dev/cardapiopro` (API)
**Depende de:** F1 (ponte, cache, monitor de rede) e F2 (telas nativas) — prontas

## O que o dono pediu

Que o sistema **não pare** num pico de rede: durante a queda o balcão continua vendendo,
fechando a venda e, se for a hora, **fechando o caixa** — e tudo se acerta quando a conexão
volta.

O alvo é queda de minutos a poucas horas, não operação de dias. Isso mantém a decisão de
não trazer um banco espelhado (SQLite): o cache cifrado e a fila em disco que já existem
dão conta do volume de um turno.

## A virada de conceito

Na F1 a fila era um buffer de envio. Aqui ela vira a **verdade da operação enquanto não há
rede**: a tela mostra *servidor + fila*, marcando o que ainda não subiu. Sem isso, o
operador vende três pedidos, olha o Caixa e vê menos dinheiro do que tem na gaveta — e
para de confiar no sistema, que é pior do que o sistema parar.

## O que precisa estar guardado ANTES da queda

Cache oportunista não basta: o app tem que baixar de propósito, e revalidar de tempos em
tempos, o que é necessário para vender.

| dado | por que | validade |
|---|---|---|
| cardápio (produtos, preços, adicionais) | sem ele não há venda | 6 h |
| formas de pagamento e taxas | define o que pode ser cobrado | 12 h |
| taxa por bairro | fecha a conta do delivery | 12 h |
| caixa aberto do turno | base do fechamento | a cada abertura |
| clientes recentes | atender por telefone | 24 h |

Se algum estiver vencido no momento da queda, a tela diz **o que** está velho — não bloqueia
a venda, mas avisa que o preço pode estar desatualizado.

## Vender e fechar a venda

1. A venda nasce no app com um **id próprio** (uuid) e um **número provisório visível**
   (`L-12`, "local 12") — a comanda imprime com ele.
2. Entra na fila em disco (cifrada), com todos os itens, pagamento e o carimbo de tempo.
3. A tela do Caixa e a de Pedidos passam a somá-la, marcada como **"não sincronizada"**.
4. Quando a rede volta, sobe com o id. O servidor responde com o **número oficial**, que
   substitui o provisório na tela e no histórico.
5. Reenviar é seguro: o servidor reconhece o id e devolve a venda existente.

**Pagamento offline:** dinheiro e "a receber" funcionam. Pix e cartão **dependem da rede** —
o app mostra os dois esmaecidos com o motivo ("precisa de internet para gerar o QR"), em vez
de aceitar e falhar depois.

## Fechar o caixa sem internet

É a parte delicada: fechar é conferir o que o sistema diz contra o que está na gaveta, e
offline o app só conhece **o que passou por ele**. Uma venda feita no app do garçom ou no
cardápio digital durante a queda não está no cálculo.

A saída é o fechamento **nascer provisório**:

1. O app fecha com o que conhece: caixa em cache + fila local, e grava um **retrato** do que
   sabia (lista de movimentações consideradas, com seus ids).
2. A tela e o comprovante impresso dizem, em letras claras: **"fechamento provisório — feito
   sem internet, sujeito a conferência"**.
3. Quando a rede volta, o app envia o fechamento com o retrato. O servidor compara com o que
   ele tem:
   - **bate** → o fechamento vira definitivo, sem intervenção;
   - **não bate** → o servidor devolve a diferença (o que o app não viu) e a tela abre a
     **conferência**: lista as movimentações novas, o novo esperado e pede a confirmação do
     lojista antes de fechar em definitivo.
4. Enquanto não reconcilia, o turno aparece como **"aguardando conferência"** no app e no
   painel — nunca como fechado e certo.

Isso não elimina a divergência (nada elimina, com duas fontes escrevendo ao mesmo tempo);
elimina a **mentira**: o número que o lojista vê nunca é apresentado como verdade final até
o servidor confirmar.

## O que o CardapioPro precisa ganhar

| mudança | por quê |
|---|---|
| `POST /api/admin/venda` aceita `id_cliente_app` e devolve a venda existente se repetir | sem isso, reenviar a fila duplica venda |
| a resposta traz o **número oficial** do pedido | para substituir o provisório |
| `POST /api/admin/caixa/fechar` aceita `retrato` (ids considerados) e devolve o que ficou de fora | é o que permite a conferência |
| status de caixa `aguardando_conferencia` | o turno não pode aparecer fechado e certo antes de reconciliar |
| as escritas de caixa (sangria, suprimento) também aceitam id do app | mesma proteção contra duplicidade |

Tudo aditivo: o painel continua funcionando sem enxergar nada disso.

## Riscos, e o que se faz com eles

| risco | o que fazemos |
|---|---|
| **estoque** — dois caixas offline vendem a última pizza | o servidor aceita as duas e sinaliza o estouro; bloquear a venda pararia o balcão, que é o que se quer evitar |
| **fechamento divergente** | conferência obrigatória antes de virar definitivo |
| **duas máquinas offline ao mesmo tempo** | cada uma tem prefixo próprio no número provisório (`L1-12`, `L2-12`); a reconciliação junta as duas |
| **app fechado com fila pendente** | a fila é em disco; ao abrir, o app avisa quantas operações estão esperando e tenta subir |
| **fila que nunca sobe** (erro do servidor) | depois de N tentativas, a tela mostra o erro em português e oferece exportar as vendas pendentes |
| **relógio da máquina errado** | o carimbo do app é registrado, mas quem data a venda é o servidor |

## Testes

- reenviar a mesma venda não duplica (id idempotente) — servidor e app
- venda offline aparece no Caixa somada e marcada como não sincronizada
- ao voltar a rede, o número provisório vira o oficial na tela
- fechamento offline nasce provisório e só vira definitivo com resposta do servidor
- fechamento com divergência abre a conferência em vez de fechar calado
- Pix e cartão ficam indisponíveis offline, com o motivo na tela
- app fechado no meio: a fila sobrevive e sobe na abertura seguinte
- cache vencido não bloqueia a venda, mas avisa o que está velho

## Fases

1. **F3.1 — servidor**: idempotência na venda e nas escritas de caixa, número oficial na
   resposta, `retrato` no fechamento, status `aguardando_conferencia`.
2. **F3.2 — pré-carregamento**: o app baixa e revalida cardápio, pagamentos, taxas e caixa.
3. **F3.3 — fila de venda**: vender e fechar venda offline, com número provisório, comanda
   impressa e soma na tela.
4. **F3.4 — fechamento provisório + conferência**.
