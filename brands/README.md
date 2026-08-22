# Multi-marca (white-label)

O mesmo código empacota como **Quero Mais Desktop**, **Pediu! Desktop** ou
**Pizzas do Jasson Desktop**.
A marca é escolhida em build-time por `scripts/apply-brand.js` (padrão: `queromais`
— reproduz o build de hoje byte a byte).

## Como buildar

```bash
npm run build:queromais:win   # ou :mac
npm run build:pediu:win       # ou :mac
npm run build:jasson:win      # ou :mac
npm run release               # fluxo atual (Quero Mais, mac+win, publish)
npm run release:pediu         # idem para Pediu! (exige repo GitHub pediu-desktop)
npm run release:jasson        # idem para Pizzas do Jasson (repo jasson-desktop)
```

`npm run apply-brand -- pediu` só aplica a marca (ícones em `assets/`,
`src-electron/brand.generated.json`, `electron-builder.brand.json`) sem buildar —
útil pra rodar `npm start` com a cara do Pediu!.

## Estrutura

```
brands/<slug>/brand.json    identidade (nomes, appId, cores, domínios, ícones)
brands/<slug>/icons/        icon.icns, icon.ico, icon-256.png, tray-icon.png, tray-icon@2x.png
brands/pediu/src/           SVGs originais da identidade Pediu!
brands/pizzariadojasson/src/  PNGs originais da identidade Pizzas do Jasson
```

Campos do brand.json: `plataforma_slug`, `nome_app`, `produto_name`,
`nome_delivery` (saudação do bot), `app_id`, `artifact_name` (prefixo dos
instaladores), `user_data_name` (pasta de config/sessão — separa o WhatsApp de
cada marca), `publish_repo`, `cor_primaria`, `cor_primaria_rgb`,
`dominio_admin`, `dominio_cardapio`, `ipp_user`, `nome_comanda`, `icons`.
Opcionais da barra lateral: `logo_imagem` (arquivo em `assets/`, ex.:
`icon-256.png` — vira a logo quadrada) ou `logo_sigla` (letra; padrão `Q`).

Em runtime o app lê tudo via `src-electron/brand.js`; sem o arquivo gerado, o
fallback são os padrões Quero Mais (checkout limpo continua funcionando igual).

## Regras

- **Nunca** editar `assets/icon.*`/`tray-icon*` na mão — são sobrescritos pelo
  apply-brand. A fonte canônica é `brands/<slug>/icons/`.
- `electron-builder.brand.json` e `src-electron/brand.generated.json` são
  GERADOS (estão no .gitignore) — não commitar nem editar.
- Se mudar o bloco `"build"` do package.json, espelhar em
  `brands/queromais/brand.json` (o apply-brand avisa se divergirem).
- Auto-update: cada marca publica no seu repo GitHub (`publish_repo`). Para o
  Pediu! é preciso criar o repo **Johnatantanan-Wq/pediu-desktop** antes do
  primeiro `release:pediu`.

## Assinatura de código (Windows)

Os `.exe` saem **assinados** com o certificado Certum Cloud Code Signing
(SimplySign) via Jsign, direto do Mac — `build.win.sign` →
`scripts/sign-windows.js`, herdado por todas as marcas.

Pré-requisito: o app **SimplySign Desktop** aberto e conectado
(ícone na barra do topo → *Connect with cloud* → Allow no celular; sessão ~2h).
Conferir o cartão: `pkcs11-tool --module /usr/local/lib/libSimplySignPKCS.dylib -T`
(tem que aparecer `Slot 0 … Code Signing … CERTUM`). Sem sessão o build **não
quebra** — o hook avisa e o instalador sai SEM assinatura, então confira depois
com `osslsigncode verify <arquivo>.exe`.

⚠️ Só vale pro Windows. Os `.dmg` do Mac continuam sem assinatura Apple
(exigiria conta Apple Developer paga) — no primeiro uso, abrir com
botão direito → Abrir.

## Ícones (regenerar)

```bash
node scripts/svg-to-icons.js brands/pediu/src/pediu-app-icon.svg brands/pediu/icons
node scripts/svg-to-icons.js brands/pizzariadojasson/src/jasson-app-icon.png brands/pizzariadojasson/icons
```

O script também aceita PNG de entrada (foi assim que saiu o kit do Jasson, a
partir do favicon 512×512 da marca no site).

Só roda no macOS (usa qlmanage/sips/iconutil nativos; o .ico é PNG-in-ICO
montado pelo próprio script — mesmo formato do icon.ico do Quero Mais).
