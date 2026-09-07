# Pediu! Desktop Beta

App **separado** do Pediu! Desktop de produção — instala e roda ao lado dele:

| | produção | beta |
|---|---|---|
| appId | `com.pediu.desktop` | `com.pediu.desktop.beta` |
| dados/sessão (userData) | `pediu-desktop` | `pediu-desktop-beta` |
| instalador | `Pediu-Desktop-*` | `Pediu-Desktop-Beta-*` |
| releases | `pediu-desktop` | `pediu-desktop-beta` |
| shell | o de hoje (barra de ícones 56px) | `"shell": "elo"` — sidebar 252px, topbar 74px |

Mesma `plataforma_slug` (`pediu`) e mesmo domínio: o beta conversa com o **mesmo painel**, com a
mesma loja e a mesma conta. O que muda é só o app.

Rodar/buildar: `npm run apply-brand pediu-beta` e depois `npm start` / `electron-builder --config electron-builder.brand.json`.

Enquanto `shell` não for `"elo"`, nenhuma marca vê nada do shell novo — o `main.js` condiciona
todo o caminho novo a esse campo.
