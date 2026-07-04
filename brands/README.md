# Multi-marca (white-label)

O mesmo código empacota como **Quero Mais Desktop** ou **Pediu! Desktop**.
A marca é escolhida em build-time por `scripts/apply-brand.js` (padrão: `queromais`
— reproduz o build de hoje byte a byte).

## Como buildar

```bash
npm run build:queromais:win   # ou :mac
npm run build:pediu:win       # ou :mac
npm run release               # fluxo atual (Quero Mais, mac+win, publish)
npm run release:pediu         # idem para Pediu! (exige repo GitHub pediu-desktop)
```

`npm run apply-brand -- pediu` só aplica a marca (ícones em `assets/`,
`src-electron/brand.generated.json`, `electron-builder.brand.json`) sem buildar —
útil pra rodar `npm start` com a cara do Pediu!.

## Estrutura

```
brands/<slug>/brand.json    identidade (nomes, appId, cores, domínios, ícones)
brands/<slug>/icons/        icon.icns, icon.ico, icon-256.png, tray-icon.png, tray-icon@2x.png
brands/pediu/src/           SVGs originais da identidade Pediu!
```

Campos do brand.json: `plataforma_slug`, `nome_app`, `produto_name`,
`nome_delivery` (saudação do bot), `app_id`, `artifact_name` (prefixo dos
instaladores), `user_data_name` (pasta de config/sessão — separa o WhatsApp de
cada marca), `publish_repo`, `cor_primaria`, `cor_primaria_rgb`,
`dominio_admin`, `dominio_cardapio`, `ipp_user`, `nome_comanda`, `icons`.

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

## Ícones (regenerar)

```bash
node scripts/svg-to-icons.js brands/pediu/src/pediu-app-icon.svg brands/pediu/icons
```

Só roda no macOS (usa qlmanage/sips/iconutil nativos; o .ico é PNG-in-ICO
montado pelo próprio script — mesmo formato do icon.ico do Quero Mais).
