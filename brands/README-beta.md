# Marcas beta (`shell: "elo"`)

Cada marca pode ter uma variante **beta**: o mesmo produto, no app novo, instalado **ao lado** do
que já existe. O que separa os dois é o `brand.json`:

| campo | app atual | app beta |
|---|---|---|
| `shell` | ausente (barra de ícones de 56px) | `"elo"` (sidebar 252px + topbar 74px) |
| `app_id` | `com.<marca>.desktop` | `com.<marca>.desktop.beta` |
| `user_data_name` | `<marca>-desktop` | `<marca>-desktop-beta` |
| `artifact_name` | `<Marca>-Desktop` | `<Marca>-Desktop-Beta` |
| `publish_repo` | `<marca>-desktop` | `<marca>-desktop-beta` |

`plataforma_slug`, domínios e cor continuam **iguais aos da marca**: o beta conversa com o mesmo
painel, com a mesma conta, e usa a cor da própria marca (verde no Pediu!, laranja no Quero Mais) —
o shell é o mesmo, o acento vem de `cor_primaria` (ou de `acento`, se a marca quiser fixar tons).

**Nada do app atual muda.** O `main.js` carrega os módulos do shell novo apenas quando
`shell === "elo"`; sem isso, o boot não passa por uma linha nova sequer.

Hoje existem: `pediu-beta`, `queromais-beta`.

Rodar: `npm run apply-brand pediu-beta && npm start`
Buildar: `npm run apply-brand pediu-beta && npx electron-builder --config electron-builder.brand.json`
