# Pediu! Desktop v2 — F1 (fundação) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Pediu! Desktop o shell nativo do Elo (sidebar 252px, topbar 74px, Plus Jakarta Sans, acento verde `#14CE6B`), com o menu vindo do servidor e a fundação de dados (ponte IPC, cache cifrado, detector de rede) sobre a qual o offline será construído na F3.

**Architecture:** O renderer do Electron desenha o chrome; o conteúdo continua na `BrowserView` do painel enquanto os módulos não são nativizados. O renderer nunca chama a rede: pede ao processo principal, que decide entre servidor e cache. O menu não é copiado para o app — vem de `GET /api/admin/menu`, filtrado pelas mesmas regras do painel.

**Registro em arquivo:** já existe — o desktop usa `electron-log` (`log.info`/`log.warn`), e as peças novas registram por ele. Não é preciso portar o log do Elo.

**Tech Stack:** Electron 33 (`nodeIntegration: true`, `contextIsolation: false` no renderer principal), `node --test` para os módulos puros do desktop; Next 16 + Supabase + Vitest no `cardapiopro`.

**Spec:** `docs/superpowers/specs/2026-09-07-pediu-desktop-shell-elo-design.md`

---

## Repos

| apelido | caminho | papel na F1 |
|---|---|---|
| **desktop** | `~/dev/queromais-desktop` | shell nativo, ponte, cache, rede |
| **web** | `~/dev/cardapiopro` | `lib/admin/menu.ts` + `GET /api/admin/menu` |

Branches novas (o desktop está em `feat/presenca-desktop` com ícones sem commit — não misturar):

```bash
cd ~/dev/queromais-desktop && git checkout -b feat/shell-elo-pediu
cd ~/dev/cardapiopro      && git checkout -b feat/api-menu-admin
```

## Estrutura de arquivos

**web (`~/dev/cardapiopro`)**

| arquivo | responsabilidade |
|---|---|
| `lib/admin/menu.ts` (criar) | `SECOES` (ícones como string) + `filtrarSecoes(ctx)` — as cinco regras, em um lugar só |
| `lib/admin/contextoMenu.ts` (criar) | monta o `CtxMenu` a partir do Supabase (consultas), só para a rota |
| `app/api/admin/menu/route.ts` (criar) | responde menu filtrado + loja + usuário + marca + badges |
| `app/admin/AdminShell.tsx` (modificar) | passa a consumir `lib/admin/menu` em vez da constante local |
| `tests/unit/admin/menu.test.ts` (criar) | trava as cinco regras |

**desktop (`~/dev/queromais-desktop`)**

| arquivo | responsabilidade |
|---|---|
| `src-electron/cache-store.js` (criar) | cache cifrado em disco por chave, com carimbo de tempo |
| `src-electron/rede.js` (criar) | estado da conexão por ping real na API |
| `src-electron/layout-views.js` (criar) | cálculo puro dos bounds da `BrowserView` |
| `src-electron/ponte.js` (criar) | canais IPC: `menu-carregar`, `rede-status`, `cache-get/set` |
| `renderer/elo/elo.css` (criar) | tokens e componentes do visual Elo em verde |
| `renderer/elo/shell.js` (criar) | desenha sidebar/topbar a partir do menu; navegação e selo offline |
| `renderer/elo/index.html` (criar) | esqueleto do shell |
| `src-electron/main.js` (modificar) | carrega o shell novo na marca `pediu`; largura da sidebar; watchdog |
| `test/*.test.js` (criar) | testes dos módulos puros com `node --test` |

---

## Task 1: `lib/admin/menu.ts` — o menu e suas regras num lugar só

**Files:**
- Create: `~/dev/cardapiopro/lib/admin/menu.ts`
- Test: `~/dev/cardapiopro/tests/unit/admin/menu.test.ts`
- Reference: `~/dev/cardapiopro/app/admin/AdminShell.tsx:94-131` (SECOES) e `:326-338` (filtros)

- [ ] **Step 1: Escrever o teste que falha**

```ts
// tests/unit/admin/menu.test.ts
import { describe, it, expect } from 'vitest'
import { filtrarSecoes, SECOES, type CtxMenu } from '@/lib/admin/menu'

const base: CtxMenu = {
  modo: 'delivery',
  marcaSlug: 'pediu',
  lojaId: 'loja-1',
  temMesas: true,
  papel: 'dono',
  modulos: null,
  modulosBloqueadosPlano: null,
}
const ids = (ctx: CtxMenu) => filtrarSecoes(ctx).flatMap(s => s.itens.map(i => i.id))

describe('filtrarSecoes', () => {
  it('dono vê o menu inteiro', () => {
    const lista = ids(base)
    expect(lista).toContain('dashboard')
    expect(lista).toContain('caixa')
    expect(lista).toContain('financeiro')
    expect(lista).toContain('config')
  })

  it('modo presencial não mostra Entregadores (motoboys fora do MENU_POR_MODO)', () => {
    expect(ids({ ...base, modo: 'presencial' })).not.toContain('motoboys')
  })

  it('loja sem mesa não mostra Atendimento', () => {
    expect(ids({ ...base, temMesas: false })).not.toContain('atendimento')
  })

  it('módulo bloqueado pelo plano some do menu', () => {
    expect(ids({ ...base, modulosBloqueadosPlano: ['fidelidade'] })).not.toContain('fidelidade')
  })

  it('colaborador só vê dashboard e os módulos liberados', () => {
    const lista = ids({ ...base, papel: 'gerente', modulos: ['caixa'] })
    expect(lista).toEqual(expect.arrayContaining(['dashboard', 'caixa']))
    expect(lista).not.toContain('financeiro')
  })

  it('seção sem item nenhum não aparece', () => {
    const secoes = filtrarSecoes({ ...base, papel: 'gerente', modulos: ['caixa'] })
    expect(secoes.every(s => s.itens.length > 0)).toBe(true)
  })

  it('todo item tem ícone desenhável', () => {
    for (const s of SECOES) for (const i of s.itens) expect(i.icone).toMatch(/^<(path|rect|circle|line|polyline)/)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ~/dev/cardapiopro && npx vitest run tests/unit/admin/menu.test.ts`
Expected: FAIL — `Cannot find module '@/lib/admin/menu'`

- [ ] **Step 3: Criar `lib/admin/menu.ts`**

Os `icone` são exatamente o conteúdo interno de cada `<Ico>` do `AdminShell.tsx:95-131`, como string.

```ts
// lib/admin/menu.ts
// Menu do painel: definição + as cinco regras de filtro, num lugar só.
// Consumido pelo AdminShell (web) e por GET /api/admin/menu (Pediu! Desktop).
// Regras portadas de app/admin/AdminShell.tsx:326-338 — nenhuma mudança de
// comportamento, só de lugar: o desktop não pode ter cópia própria dessas regras.
import { menuLiberado } from '@/lib/modoNegocio'
import { recursoLiberado } from '@/lib/brand/beta'
import { acessoTotal } from '@/lib/loja/permissoes'
import type { ModoNegocio } from '@/lib/supabase/types'

export type NavItemDef = {
  id: string
  href: string
  label: string
  /** conteúdo interno do <svg> (viewBox 0 0 24 24, stroke currentColor) */
  icone: string
  badge?: 'pedidos' | 'carrinhos'
}
export type NavSecaoDef = { titulo: string; itens: NavItemDef[] }

export const SECOES: NavSecaoDef[] = [
  { titulo: 'Principal', itens: [
    { id: 'dashboard', href: '/admin', label: 'Visão geral', icone: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' },
    { id: 'caixa', href: '/admin/caixa', label: 'Caixa', icone: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>' },
    { id: 'pedidos', href: '/admin/pedidos', label: 'Gestão de pedido', badge: 'pedidos', icone: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>' },
    { id: 'despacho', href: '/admin/despacho', label: 'Despacho', icone: '<circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17" cy="17.5" r="2.5"/><path d="M7.5 17.5h7M14 17.5V5h3l3 5v7.5M3 5h11v8"/>' },
    { id: 'carrinhos', href: '/admin/carrinhos', label: 'Carrinhos', badge: 'carrinhos', icone: '<path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>' },
    { id: 'clientes', href: '/admin/clientes', label: 'Clientes', icone: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>' },
  ] },
  { titulo: 'Operação', itens: [
    { id: 'cardapio', href: '/admin/cardapio', label: 'Cardápio', icone: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>' },
    { id: 'cozinha', href: '/admin/cozinha', label: 'Cozinha (KDS)', icone: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>' },
    { id: 'bar', href: '/admin/bar', label: 'Bar', icone: '<path d="M5 4h14l-7 8zM12 12v6M8 20h8"/>' },
    { id: 'atendimento', href: '/admin/atendimento', label: 'Atendimento', icone: '<path d="M3 18h18M5 18a7 7 0 0114 0M12 11V8.5"/><circle cx="12" cy="8" r="0.5"/>' },
    { id: 'estoque', href: '/admin/estoque', label: 'Gestão', icone: '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>' },
    { id: 'compras', href: '/admin/compras', label: 'Compras', icone: '<path d="M9 2h6l1 4H8zM4 6h16l-1.5 12a2 2 0 01-2 1.7H7.5a2 2 0 01-2-1.7zM9 11h6"/>' },
    { id: 'financeiro', href: '/admin/financeiro', label: 'Financeiro', icone: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>' },
    { id: 'motoboys', href: '/admin/motoboys', label: 'Entregadores', icone: '<circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M8 18h8l-3-7h-3M13 11l2-4h3"/>' },
    { id: 'relatorios', href: '/admin/relatorios', label: 'Relatórios', icone: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>' },
  ] },
  { titulo: 'Marketing', itens: [
    { id: 'insights', href: '/admin/insights', label: 'Insights', icone: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
    { id: 'campanhas', href: '/admin/food-marketing/campanhas', label: 'Campanhas', icone: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>' },
    { id: 'push', href: '/admin/food-marketing/push', label: 'Push', icone: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>' },
    { id: 'cupons', href: '/admin/cupons', label: 'Cupons', icone: '<path d="M16 8l-8 8M21 12a3 3 0 010-6V4a2 2 0 00-2-2H5a2 2 0 00-2 2v2a3 3 0 010 6 3 3 0 010 6v2a2 2 0 002 2h14a2 2 0 002-2v-2a3 3 0 010-6z"/>' },
    { id: 'vendedores', href: '/admin/vendedores', label: 'Parceiros', icone: '<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>' },
    { id: 'fidelidade', href: '/admin/fidelidade', label: 'Fidelidade', icone: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14.2L7 22l5-2.8L17 22l-1.5-7.8"/>' },
  ] },
  { titulo: 'Sistema', itens: [
    { id: 'config', href: '/admin/configuracoes', label: 'Configurações', icone: '<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>' },
  ] },
]

/** Itens que aparecem sempre; os demais respeitam o modo de negócio. */
export const SEMPRE = ['dashboard', 'caixa', 'pedidos', 'despacho', 'carrinhos', 'clientes', 'app', 'cardapio', 'cozinha', 'bar', 'atendimento', 'estoque', 'compras', 'financeiro', 'nf', 'relatorio', 'relatorios', 'cupons', 'vendedores', 'fidelidade', 'insights', 'campanhas', 'push', 'integracoes', 'backup', 'config']

export type CtxMenu = {
  modo: ModoNegocio
  marcaSlug: string
  lojaId: string | null
  /** false = loja delivery sem mesa cadastrada */
  temMesas: boolean
  papel: string | null
  modulos: string[] | null
  modulosBloqueadosPlano: string[] | null
}

export function filtrarSecoes(ctx: CtxMenu): NavSecaoDef[] {
  const temAcessoTotal = acessoTotal(ctx.papel, ctx.modulos)
  const modulosSet = new Set(ctx.modulos ?? [])
  const bloqueadosPlanoSet = new Set(ctx.modulosBloqueadosPlano ?? [])
  return SECOES.map(s => ({
    titulo: s.titulo,
    itens: s.itens
      .filter(it => SEMPRE.includes(it.id) || menuLiberado(ctx.modo, it.id))
      .filter(it => it.id !== 'atendimento' || (recursoLiberado('atendimento', ctx.marcaSlug, ctx.lojaId) && ctx.temMesas))
      .filter(it => it.id !== 'fidelidade' || recursoLiberado('fidelidade', ctx.marcaSlug, ctx.lojaId))
      .filter(it => !bloqueadosPlanoSet.has(it.id))
      .filter(it => temAcessoTotal || it.id === 'dashboard' || modulosSet.has(it.id)),
  })).filter(s => s.itens.length > 0)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ~/dev/cardapiopro && npx vitest run tests/unit/admin/menu.test.ts`
Expected: PASS — 7 testes

- [ ] **Step 5: Commit**

```bash
cd ~/dev/cardapiopro
git add lib/admin/menu.ts tests/unit/admin/menu.test.ts
git commit -m "feat(admin): extrai definição e filtros do menu para lib/admin/menu"
```

---

## Task 2: `AdminShell` passa a consumir `lib/admin/menu`

O painel web precisa continuar **idêntico**. A prova é o teste da Task 1 mais a conferência visual do Step 4.

**Files:**
- Modify: `~/dev/cardapiopro/app/admin/AdminShell.tsx:94-131` (remover `SECOES` local), `:326-338` (usar `filtrarSecoes`)

- [ ] **Step 1: Trocar a definição local pelo import**

Apagar de `AdminShell.tsx` o `type NavItem`, o `type NavSecao`, a constante `SECOES` (linhas 91-131) e a constante `SEMPRE` (linha 133), e no topo do arquivo adicionar:

```tsx
import { filtrarSecoes, type NavItemDef, type CtxMenu } from '@/lib/admin/menu'
```

- [ ] **Step 2: Desenhar o ícone a partir da string**

Adicionar, logo abaixo do componente `Ico` já existente:

```tsx
// Ícone do menu vindo de lib/admin/menu (string com o conteúdo do <svg>).
// Conteúdo estático nosso — não há entrada de usuário aqui.
function IcoMenu({ icone }: { icone: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.85 }}
      dangerouslySetInnerHTML={{ __html: icone }} />
  )
}
```

- [ ] **Step 3: Trocar a montagem da lista**

Substituir o bloco `const SECOES_FILTRADAS = SECOES.map(...)` (linhas 326-338) por:

```tsx
  const SECOES_FILTRADAS = filtrarSecoes({
    modo, marcaSlug, lojaId, temMesas,
    papel, modulos, modulosBloqueadosPlano,
  } as CtxMenu)
```

E, dentro do `map` dos itens, trocar `{item.icon}` por `<IcoMenu icone={item.icone} />`. O `secao.items` vira `secao.itens` nas duas ocorrências (`AdminShell.tsx:340` e `:566`).

- [ ] **Step 4: Conferir que o painel não mudou**

Run: `cd ~/dev/cardapiopro && npx tsc --noEmit && npx vitest run tests/unit/admin/menu.test.ts && npm run dev`
Expected: sem erro de tipo; abrir `http://localhost:3000/admin` e conferir que a barra lateral tem **os mesmos itens, na mesma ordem, com os mesmos ícones** de antes.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/cardapiopro
git add app/admin/AdminShell.tsx
git commit -m "refactor(admin): AdminShell usa lib/admin/menu como fonte do menu"
```

---

## Task 3: `GET /api/admin/menu`

**Files:**
- Create: `~/dev/cardapiopro/lib/admin/contextoMenu.ts`
- Create: `~/dev/cardapiopro/app/api/admin/menu/route.ts`
- Test: `~/dev/cardapiopro/tests/unit/admin/menu-resposta.test.ts`
- Reference: `app/api/admin/caixa/route.ts` (padrão de rota) e `app/admin/layout.tsx:50-130` (de onde vêm os dados)

- [ ] **Step 1: Escrever o teste da forma da resposta**

```ts
// tests/unit/admin/menu-resposta.test.ts
import { describe, it, expect } from 'vitest'
import { montarResposta } from '@/lib/admin/contextoMenu'

describe('montarResposta', () => {
  const ctx = {
    modo: 'delivery' as const, marcaSlug: 'pediu', lojaId: 'loja-1', temMesas: true,
    papel: 'dono' as string | null, modulos: null, modulosBloqueadosPlano: null,
  }
  const extras = {
    loja: { id: 'loja-1', nome: 'Pizzaria Teste', documento: '12.345.678/0001-90', logo: null },
    usuario: { email: 'dono@teste.com', papel: 'dono' },
    marca: { slug: 'pediu', nome: 'Pediu!', cor: '#14CE6B' },
    badges: { pedidos: 5, carrinhos: 2 },
  }

  it('devolve seções não vazias com id, href, label e ícone', () => {
    const r = montarResposta(ctx, extras)
    expect(r.secoes.length).toBeGreaterThan(0)
    for (const s of r.secoes) {
      expect(s.itens.length).toBeGreaterThan(0)
      for (const i of s.itens) {
        expect(i.id).toBeTruthy()
        expect(i.href.startsWith('/admin')).toBe(true)
        expect(i.label).toBeTruthy()
        expect(i.icone).toBeTruthy()
      }
    }
  })

  it('carrega loja, usuário, marca e badges', () => {
    const r = montarResposta(ctx, extras)
    expect(r.loja.nome).toBe('Pizzaria Teste')
    expect(r.marca.cor).toBe('#14CE6B')
    expect(r.badges.pedidos).toBe(5)
    expect(r.usuario.papel).toBe('dono')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ~/dev/cardapiopro && npx vitest run tests/unit/admin/menu-resposta.test.ts`
Expected: FAIL — `Cannot find module '@/lib/admin/contextoMenu'`

- [ ] **Step 3: Criar `lib/admin/contextoMenu.ts`**

```ts
// lib/admin/contextoMenu.ts
// Monta a resposta de GET /api/admin/menu. A montagem (pura) fica separada das
// consultas para poder ser testada sem banco.
import { filtrarSecoes, type CtxMenu, type NavSecaoDef } from '@/lib/admin/menu'

export type ExtrasMenu = {
  loja: { id: string | null; nome: string | null; documento: string | null; logo: string | null }
  usuario: { email: string | null; papel: string | null }
  marca: { slug: string; nome: string; cor: string }
  badges: { pedidos: number; carrinhos: number }
}

export type RespostaMenu = ExtrasMenu & { secoes: NavSecaoDef[] }

export function montarResposta(ctx: CtxMenu, extras: ExtrasMenu): RespostaMenu {
  return { secoes: filtrarSecoes(ctx), ...extras }
}
```

- [ ] **Step 4: Criar a rota**

```ts
// app/api/admin/menu/route.ts
// Menu do painel para o Pediu! Desktop — as mesmas regras do AdminShell.
// O app desenha; quem decide o que aparece continua sendo o servidor.
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { pegarLojaIdAdmin, pegarUsuarioDaSessao, papelEfetivo } from '@/lib/admin'
import { resolverPlataforma } from '@/lib/brand/resolver'
import { modulosEfetivos } from '@/lib/delivery/entitlements'
import { montarResposta } from '@/lib/admin/contextoMenu'
import type { ModoNegocio } from '@/lib/supabase/types'

export async function GET() {
  const supabase = await createClient()
  const user = await pegarUsuarioDaSessao()
  const lojaId = await pegarLojaIdAdmin(supabase)
  if (!user || !lojaId) return NextResponse.json({ error: 'sem sessão' }, { status: 401 })

  const marca = await resolverPlataforma()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const [lojaRow, adminRow, superRow, assinatura, pedidos, carrinhos, mesas] = await Promise.all([
    admin.from('lojas').select('nome, logo_url, documento, modo_negocio').eq('id', lojaId).maybeSingle().then((r: any) => r.data),
    admin.from('usuarios_admin').select('papel, modulos').eq('id', user.id).eq('loja_id', lojaId).maybeSingle().then((r: any) => r.data),
    admin.from('usuarios_admin').select('id').eq('id', user.id).eq('papel', 'superadmin').maybeSingle().then((r: any) => r.data),
    admin.from('assinaturas').select('plan_id, overrides').eq('loja_id', lojaId).maybeSingle().then((r: any) => r.data),
    supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('loja_id', lojaId)
      .in('status', ['pago', 'em_producao', 'pronto', 'em_entrega']).then(r => r.count ?? 0),
    supabase.from('v_carrinhos_abertos').select('id', { count: 'exact', head: true }).eq('loja_id', lojaId).then(r => r.count ?? 0),
    admin.from('mesas').select('id', { count: 'exact', head: true }).eq('loja_id', lojaId).eq('ativa', true).then((r: any) => r.count ?? 0),
  ])

  const efetivo = papelEfetivo(adminRow?.papel, !!superRow)
  const limites = assinatura?.plan_id
    ? (await admin.from('plans').select('limites').eq('id', assinatura.plan_id).maybeSingle()).data?.limites ?? null
    : null
  const bloqueados = efetivo.ehSuper ? [] : modulosEfetivos(limites, assinatura?.overrides).bloqueados
  const modo = (lojaRow?.modo_negocio ?? 'delivery') as ModoNegocio

  return NextResponse.json(montarResposta(
    {
      modo,
      marcaSlug: marca?.slug ?? 'quero-mais',
      lojaId,
      temMesas: modo !== 'delivery' || Number(mesas) > 0,
      papel: efetivo.papel,
      modulos: adminRow?.modulos ?? null,
      modulosBloqueadosPlano: bloqueados,
    },
    {
      loja: { id: lojaId, nome: lojaRow?.nome ?? null, documento: lojaRow?.documento ?? null, logo: lojaRow?.logo_url ?? null },
      usuario: { email: user.email ?? null, papel: efetivo.papel },
      marca: { slug: marca?.slug ?? 'quero-mais', nome: marca?.nome ?? '', cor: marca?.cor_primaria ?? '#F97316' },
      badges: { pedidos: Number(pedidos), carrinhos: Number(carrinhos) },
    },
  ))
}
```

- [ ] **Step 5: Rodar o teste e conferir a rota ao vivo**

Run: `cd ~/dev/cardapiopro && npx vitest run tests/unit/admin/menu-resposta.test.ts && npx tsc --noEmit`
Expected: PASS, sem erro de tipo.

Depois, com `npm run dev` e o navegador logado no painel, abrir `http://localhost:3000/api/admin/menu` — deve responder o JSON com as seções; numa janela anônima, deve responder 401.

⚠️ Se `lojas` não tiver a coluna `documento`, trocar por `cnpj` na consulta e no `loja.documento` — conferir com:
`grep -n "documento\|cnpj" ~/dev/cardapiopro/lib/supabase/types.ts | head`

- [ ] **Step 6: Commit**

```bash
cd ~/dev/cardapiopro
git add lib/admin/contextoMenu.ts app/api/admin/menu/route.ts tests/unit/admin/menu-resposta.test.ts
git commit -m "feat(api): GET /api/admin/menu para o Pediu! Desktop"
```

---

## Task 4: `src-electron/cache-store.js` — cache cifrado em disco

Portado de `~/dev/OVD-VENDAS/capa/cache-store.js`: é a peça que, na F3, deixa a tela abrir sem internet. A cifra vem de um adapter injetado (`safeStorage` no app, adapter falso no teste), então o módulo roda em node puro.

**Files:**
- Create: `~/dev/queromais-desktop/src-electron/cache-store.js`
- Test: `~/dev/queromais-desktop/test/cache-store.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// test/cache-store.test.js
const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { makeStore } = require('../src-electron/cache-store')

const dirTemp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pediu-cache-'))
// adapter de teste: "cifra" invertendo os bytes — prova que a leitura decifra
const storageFake = {
  available: () => true,
  encrypt: (s) => Buffer.from(s, 'utf8').map(b => 255 - b),
  decrypt: (b) => Buffer.from(Buffer.from(b).map(x => 255 - x)).toString('utf8'),
}

test('grava e lê pela chave', () => {
  const store = makeStore(dirTemp(), storageFake)
  store.set('menu|loja-1', { status: 200, body: { secoes: [1, 2] } })
  const lido = store.get('menu|loja-1')
  assert.deepStrictEqual(lido.body, { secoes: [1, 2] })
  assert.strictEqual(lido.status, 200)
  assert.ok(lido.ts > 0)
})

test('chave inexistente devolve null', () => {
  assert.strictEqual(makeStore(dirTemp(), storageFake).get('nao-existe'), null)
})

test('o arquivo em disco não guarda o conteúdo em texto claro', () => {
  const dir = dirTemp()
  makeStore(dir, storageFake).set('k', { status: 200, body: { segredo: 'pizza' } })
  const arquivo = path.join(dir, fs.readdirSync(dir)[0])
  assert.ok(!fs.readFileSync(arquivo, 'utf8').includes('pizza'))
})

test('sem cifra disponível grava com marca PLAIN: e ainda lê', () => {
  const dir = dirTemp()
  const semCifra = { available: () => false }
  const store = makeStore(dir, semCifra)
  store.set('k', { status: 200, body: { a: 1 } })
  const arquivo = path.join(dir, fs.readdirSync(dir)[0])
  assert.ok(fs.readFileSync(arquivo, 'utf8').startsWith('PLAIN:'))
  assert.deepStrictEqual(store.get('k').body, { a: 1 })
})

test('meta devolve só o carimbo de tempo', () => {
  const store = makeStore(dirTemp(), storageFake)
  store.set('k', { status: 200, body: {} })
  const m = store.meta('k')
  assert.ok(m.ts > 0)
  assert.strictEqual(m.body, undefined)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ~/dev/queromais-desktop && node --test test/cache-store.test.js`
Expected: FAIL — `Cannot find module '../src-electron/cache-store'`

- [ ] **Step 3: Criar o módulo**

```js
// src-electron/cache-store.js
// Cache de leitura cifrado em disco, por chave (portado de OVD-VENDAS/capa/cache-store.js).
// É o que permite a tela abrir sem internet: a resposta boa fica guardada com carimbo
// de tempo, e a tela mostra a idade do dado em vez de uma tela vazia.
// A cifra vem de um adapter injetado (safeStorage no app) — mantém o módulo testável
// em node puro. Escrita atômica: arquivo temporário + rename, para nunca ler pela metade.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function keyToFile(dir, key) {
  return path.join(dir, crypto.createHash('sha1').update('' + key).digest('hex') + '.bin')
}

// storage = { available():bool, encrypt(str):Buffer, decrypt(buf):str }
function makeStore(dir, storage) {
  try { fs.mkdirSync(dir, { recursive: true }) } catch (e) {}

  function writeAtomic(file, buf) {
    const tmp = file + '.tmp-' + process.pid + '-' + Date.now()
    fs.writeFileSync(tmp, buf)
    fs.renameSync(tmp, file)
  }

  function set(key, value) {
    try {
      const json = JSON.stringify({ body: value && value.body, status: value && value.status, ts: Date.now() })
      const buf = (storage && storage.available())
        ? Buffer.from(storage.encrypt(json))
        : Buffer.from('PLAIN:' + json, 'utf8')
      writeAtomic(keyToFile(dir, key), buf)
      return { ok: true }
    } catch (e) { return { ok: false, erro: String(e) } }
  }

  function get(key) {
    try {
      const f = keyToFile(dir, key)
      if (!fs.existsSync(f)) return null
      const buf = fs.readFileSync(f)
      let json
      if (buf.slice(0, 6).toString('utf8') === 'PLAIN:') json = buf.slice(6).toString('utf8')
      else if (storage && storage.available()) json = storage.decrypt(buf)
      else return null
      return JSON.parse(json)
    } catch (e) { return null }
  }

  function meta(key) { const v = get(key); return v ? { ts: v.ts } : null }

  return { set, get, meta }
}

module.exports = { makeStore, keyToFile }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ~/dev/queromais-desktop && node --test test/cache-store.test.js`
Expected: PASS — 5 testes

- [ ] **Step 5: Adicionar o script de teste ao `package.json`**

Em `scripts`, acrescentar: `"test": "node --test test/*.test.js"`

- [ ] **Step 6: Commit**

```bash
cd ~/dev/queromais-desktop
git add src-electron/cache-store.js test/cache-store.test.js package.json
git commit -m "feat(desktop): cache cifrado em disco (base do modo offline)"
```

---

## Task 5: `src-electron/rede.js` — estado da conexão por ping real

`navigator.onLine` mente em Wi-Fi que exige login (praça de alimentação, hotel). O Elo aprendeu isso em campo: só vale o ping que a API responde.

**Files:**
- Create: `~/dev/queromais-desktop/src-electron/rede.js`
- Test: `~/dev/queromais-desktop/test/rede.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// test/rede.test.js
const { test } = require('node:test')
const assert = require('node:assert')
const { criarMonitor } = require('../src-electron/rede')

test('começa offline e vira online quando o ping responde', async () => {
  const mudancas = []
  const m = criarMonitor({ pingar: async () => true, aoMudar: (v) => mudancas.push(v) })
  assert.strictEqual(m.online(), false)
  await m.checarAgora()
  assert.strictEqual(m.online(), true)
  assert.deepStrictEqual(mudancas, [true])
})

test('não avisa duas vezes o mesmo estado', async () => {
  const mudancas = []
  const m = criarMonitor({ pingar: async () => true, aoMudar: (v) => mudancas.push(v) })
  await m.checarAgora()
  await m.checarAgora()
  assert.deepStrictEqual(mudancas, [true])
})

test('ping que estoura vira offline, sem derrubar o app', async () => {
  const mudancas = []
  const m = criarMonitor({ pingar: async () => { throw new Error('sem rota') }, aoMudar: (v) => mudancas.push(v) })
  await m.checarAgora()
  assert.strictEqual(m.online(), false)
  assert.deepStrictEqual(mudancas, [])
})

test('cai de online para offline quando o ping para de responder', async () => {
  let responde = true
  const mudancas = []
  const m = criarMonitor({ pingar: async () => responde, aoMudar: (v) => mudancas.push(v) })
  await m.checarAgora()
  responde = false
  await m.checarAgora()
  assert.strictEqual(m.online(), false)
  assert.deepStrictEqual(mudancas, [true, false])
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ~/dev/queromais-desktop && node --test test/rede.test.js`
Expected: FAIL — `Cannot find module '../src-electron/rede'`

- [ ] **Step 3: Criar o módulo**

```js
// src-electron/rede.js
// Estado da conexão pelo que a API responde, não pelo que o sistema operacional acha.
// navigator.onLine dá "online" em Wi-Fi de praça de alimentação que exige login —
// o Elo aprendeu isso em campo (capa/renderer/offline.js).
function criarMonitor({ pingar, aoMudar, intervaloMs = 20000 }) {
  let _online = false
  let timer = null

  async function checarAgora() {
    let ok = false
    try { ok = !!(await pingar()) } catch (e) { ok = false }
    if (ok !== _online) {
      _online = ok
      try { aoMudar && aoMudar(_online) } catch (e) {}
    }
    return _online
  }

  function iniciar() {
    if (timer) return
    checarAgora()
    timer = setInterval(checarAgora, intervaloMs)
  }

  function parar() { if (timer) { clearInterval(timer); timer = null } }

  return { online: () => _online, checarAgora, iniciar, parar }
}

module.exports = { criarMonitor }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ~/dev/queromais-desktop && node --test test/rede.test.js`
Expected: PASS — 4 testes

- [ ] **Step 5: Commit**

```bash
cd ~/dev/queromais-desktop
git add src-electron/rede.js test/rede.test.js
git commit -m "feat(desktop): monitor de conexão por ping real"
```

---

## Task 6: `src-electron/layout-views.js` — bounds da BrowserView

O shell novo é mais alto (titlebar 44 + topbar 74 = 118) e mais largo (252 ou 76). O cálculo sai de `main.js:259-289` para um módulo puro, com teste — é o que impede a `BrowserView` de cobrir o menu (defeito que já apareceu e motivou o watchdog em `main.js:553-572`).

**Files:**
- Create: `~/dev/queromais-desktop/src-electron/layout-views.js`
- Test: `~/dev/queromais-desktop/test/layout-views.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// test/layout-views.test.js
const { test } = require('node:test')
const assert = require('node:assert')
const { calcularBounds } = require('../src-electron/layout-views')

const janela = { largura: 1400, altura: 900 }

test('a view nunca invade a sidebar nem o topo', () => {
  const b = calcularBounds({ ...janela, sidebarW: 252, topoH: 118, modo: 'cardapio' })
  assert.strictEqual(b.cardapio.x, 252)
  assert.strictEqual(b.cardapio.y, 118)
  assert.strictEqual(b.cardapio.width, 1400 - 252)
  assert.strictEqual(b.cardapio.height, 900 - 118)
})

test('sidebar recolhida devolve a largura ao conteúdo', () => {
  const b = calcularBounds({ ...janela, sidebarW: 76, topoH: 118, modo: 'cardapio' })
  assert.strictEqual(b.cardapio.x, 76)
  assert.strictEqual(b.cardapio.width, 1400 - 76)
})

test('tela dividida não sobrepõe as duas views', () => {
  const b = calcularBounds({ ...janela, sidebarW: 252, topoH: 118, modo: 'split', splitRatio: 0.7, handleW: 6 })
  assert.ok(b.cardapio.x + b.cardapio.width <= b.whatsapp.x)
  assert.strictEqual(b.whatsapp.x + b.whatsapp.width, 1400)
})

test('janela estreita não gera largura negativa', () => {
  const b = calcularBounds({ largura: 300, altura: 200, sidebarW: 252, topoH: 118, modo: 'split', splitRatio: 0.7, handleW: 6 })
  assert.ok(b.cardapio.width >= 200)
  assert.ok(b.whatsapp.width >= 200)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ~/dev/queromais-desktop && node --test test/layout-views.test.js`
Expected: FAIL — `Cannot find module '../src-electron/layout-views'`

- [ ] **Step 3: Criar o módulo**

```js
// src-electron/layout-views.js
// Onde cada BrowserView fica na janela. Puro de propósito: o defeito de a view
// cobrir a barra lateral (e congelar os controles HTML) é de conta, não de Electron.
function calcularBounds({ largura, altura, sidebarW, topoH, modo, splitRatio = 0.7, handleW = 6 }) {
  const cw = largura - sidebarW
  const ch = altura - topoH
  const cheio = { x: sidebarW, y: topoH, width: cw, height: ch }

  if (modo !== 'split') return { cardapio: { ...cheio }, whatsapp: { ...cheio } }

  const cardW = Math.max(200, Math.floor(cw * splitRatio) - handleW)
  const waX = sidebarW + cardW + handleW
  const waW = Math.max(200, largura - waX)
  return {
    cardapio: { x: sidebarW, y: topoH, width: cardW, height: ch },
    whatsapp: { x: waX, y: topoH, width: waW, height: ch },
  }
}

module.exports = { calcularBounds }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ~/dev/queromais-desktop && node --test test/layout-views.test.js`
Expected: PASS — 4 testes

⚠️ O quarto teste falha se `whatsapp.x + width` for calculado sem o piso de 200: é intencional, prova que janela estreita não quebra o layout.

- [ ] **Step 5: Commit**

```bash
cd ~/dev/queromais-desktop
git add src-electron/layout-views.js test/layout-views.test.js
git commit -m "feat(desktop): cálculo puro dos bounds das views"
```

---

## Task 7: `src-electron/ponte.js` — os canais IPC

O renderer nunca chama a rede: pede aqui. É esta separação que faz a mesma tela funcionar online e offline na F3.

**Files:**
- Create: `~/dev/queromais-desktop/src-electron/ponte.js`
- Test: `~/dev/queromais-desktop/test/ponte-menu.test.js`

- [ ] **Step 1: Escrever o teste da decisão servidor-ou-cache**

```js
// test/ponte-menu.test.js
const { test } = require('node:test')
const assert = require('node:assert')
const { buscarMenu } = require('../src-electron/ponte')

const cacheFalso = () => {
  const dados = new Map()
  return {
    set: (k, v) => { dados.set(k, { ...v, ts: 1 }); return { ok: true } },
    get: (k) => dados.get(k) ?? null,
    meta: (k) => (dados.has(k) ? { ts: 1 } : null),
  }
}

test('resposta boa do servidor é devolvida e guardada no cache', async () => {
  const cache = cacheFalso()
  const r = await buscarMenu({ cache, pedirAoPainel: async () => ({ secoes: [{ titulo: 'Principal', itens: [] }], loja: { id: 'l1' } }) })
  assert.strictEqual(r.offline, false)
  assert.strictEqual(r.dados.secoes.length, 1)
  assert.ok(cache.get('menu|l1'))
})

test('servidor mudo devolve o cache marcado como offline', async () => {
  const cache = cacheFalso()
  cache.set('menu|l1', { status: 200, body: { secoes: [{ titulo: 'Principal', itens: [] }], loja: { id: 'l1' } } })
  const r = await buscarMenu({ cache, pedirAoPainel: async () => null, lojaId: 'l1' })
  assert.strictEqual(r.offline, true)
  assert.strictEqual(r.dados.secoes.length, 1)
  assert.strictEqual(r.ts, 1)
})

test('sem servidor e sem cache devolve vazio, não quebra', async () => {
  const r = await buscarMenu({ cache: cacheFalso(), pedirAoPainel: async () => null, lojaId: 'l1' })
  assert.strictEqual(r.offline, true)
  assert.strictEqual(r.dados, null)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ~/dev/queromais-desktop && node --test test/ponte-menu.test.js`
Expected: FAIL — `Cannot find module '../src-electron/ponte'`

- [ ] **Step 3: Criar o módulo**

```js
// src-electron/ponte.js
// A ponte entre o shell nativo e os dados. O renderer pede; aqui se decide entre
// servidor e cache. Na F3, é aqui que entra a fila de escrita offline.
//
// A chamada ao painel vai POR DENTRO da BrowserView já logada — mesmo caminho do
// ping de presença (main.js:509-514): sem token novo, sem sessão paralela.

/** Busca o menu no painel; caindo a rede, devolve o último bom do cache. */
async function buscarMenu({ cache, pedirAoPainel, lojaId }) {
  let doServidor = null
  try { doServidor = await pedirAoPainel() } catch (e) { doServidor = null }

  if (doServidor && Array.isArray(doServidor.secoes)) {
    const id = (doServidor.loja && doServidor.loja.id) || lojaId || 'sem-loja'
    cache.set('menu|' + id, { status: 200, body: doServidor })
    return { dados: doServidor, offline: false, ts: Date.now() }
  }

  const guardado = cache.get('menu|' + (lojaId || 'sem-loja'))
  return { dados: guardado ? guardado.body : null, offline: true, ts: guardado ? guardado.ts : 0 }
}

/** Registra os canais. Chamado uma vez, no boot do main. */
function registrar({ ipcMain, cache, monitorRede, pedirAoPainel, abrirRota, lojaIdAtual }) {
  ipcMain.handle('menu-carregar', () => buscarMenu({ cache, pedirAoPainel, lojaId: lojaIdAtual() }))
  ipcMain.handle('rede-status', () => ({ online: monitorRede.online() }))
  ipcMain.handle('cache-get', (e, chave) => cache.get(chave))
  ipcMain.handle('cache-set', (e, a) => cache.set(a && a.chave, { status: 200, body: a && a.valor }))
  ipcMain.handle('abrir-rota', (e, href) => abrirRota(href))
}

module.exports = { buscarMenu, registrar }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ~/dev/queromais-desktop && node --test test/ponte-menu.test.js`
Expected: PASS — 3 testes

- [ ] **Step 5: Commit**

```bash
cd ~/dev/queromais-desktop
git add src-electron/ponte.js test/ponte-menu.test.js
git commit -m "feat(desktop): ponte IPC (menu, rede, cache) entre shell e dados"
```

---

## Task 8: `renderer/elo/elo.css` — o visual do Elo em verde

Fiel a `~/dev/OVD-VENDAS/capa/renderer/index.html:257-320`, com o amarelo trocado pelo verde do Pediu!. Sem tocar em `renderer/index.html` (o shell do Quero Mais continua intacto).

**Files:**
- Create: `~/dev/queromais-desktop/renderer/elo/elo.css`

- [ ] **Step 1: Criar o arquivo**

```css
/* renderer/elo/elo.css — shell "elo" do Pediu! Desktop.
   Porte fiel de OVD-VENDAS/capa/renderer/index.html:257-320; onde o Elo é amarelo
   (#FFC107 / #fff3cc / #8a6508), aqui é o verde da marca (brands/pediu/brand.json). */
:root{
  --acento:#14CE6B; --acento-escuro:#0AA758; --acento-suave:#E7FAF0;
  --acento-texto:#0A7A3E; --acento-linha:#A8E9C6;
  --bg:#f6f6f4; --painel:#ffffff; --linha:#ebebe8; --linha-2:#e5e7eb;
  --tinta:#111111; --tinta-2:#4b5563; --apagado:#9ca3af; --grupo:#b3b2ac;
  --sans:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;background:var(--bg);color:var(--tinta);
  font-family:var(--sans);-webkit-font-smoothing:antialiased;user-select:none}
::-webkit-scrollbar{width:0;height:0;display:none}
*{scrollbar-width:none}

/* ── titlebar (44px, arrastável) ── */
#titlebar{height:44px;background:var(--painel);border-bottom:1px solid var(--linha);
  display:flex;align-items:center;justify-content:space-between;padding:0 12px;
  -webkit-app-region:drag;position:relative;z-index:800}
#titlebar .janela{display:flex;gap:6px;-webkit-app-region:no-drag}
#titlebar .jb{width:28px;height:28px;border:none;background:none;border-radius:8px;
  color:var(--tinta-2);cursor:pointer;font-size:14px;line-height:1}
#titlebar .jb:hover{background:var(--bg)}

/* ── sidebar 252px ⇄ 76px ── */
#erail{position:fixed;top:44px;left:0;bottom:0;width:252px;background:var(--painel);
  border-right:1px solid var(--linha);display:flex;flex-direction:column;
  padding:28px 14px 20px;overflow-y:auto;overflow-x:hidden;transition:width .25s ease;z-index:700}
#erail.recolhido{width:76px}
.erailtop{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 10px;margin-bottom:28px}
#erail.recolhido .erailtop{flex-direction:column;align-items:center}
.erailbrand{display:flex;flex-direction:column;gap:5px;min-width:0}
.erailbrand img{width:136px;height:auto;display:block;transition:width .25s ease}
#erail.recolhido .erailbrand img{width:42px}
.eraillabel{font-size:10.5px;letter-spacing:.36em;font-weight:700;color:var(--apagado);text-transform:uppercase}
.erailtoggle{width:30px;height:30px;border:1px solid var(--linha-2);border-radius:9px;background:var(--painel);
  color:#6b7280;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.erailtoggle:hover{background:var(--bg);color:var(--tinta)}
.erailnav{display:flex;flex-direction:column;gap:2px;flex:1}
.erailgrp{font-size:10px;font-weight:800;color:var(--grupo);text-transform:uppercase;
  letter-spacing:.12em;padding:16px 12px 6px}
.erailgrpdiv{display:none;height:1px;background:#f0f0ee;margin:12px 8px}
#erail.recolhido .erailgrpdiv{display:block}
.erailitem{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:10px;cursor:pointer;
  font-size:13px;font-weight:500;color:var(--tinta-2);border-left:3px solid transparent;
  transition:background .15s,color .15s}
#erail.recolhido .erailitem{justify-content:center}
.erailitem:hover{background:var(--bg)}
.erailitem.on{background:var(--acento-suave);border-left-color:var(--acento);color:var(--acento-texto);font-weight:700}
.erailitem.off{opacity:.45;cursor:not-allowed}
#erail.recolhido .eraillabel,#erail.recolhido .erailgrp,#erail.recolhido .lbl,#erail.recolhido .erailuinfo{display:none}
.eranbadge{margin-left:auto;background:var(--acento-texto);color:#fff;font-size:10px;font-weight:800;
  line-height:1;padding:3px 7px;border-radius:20px;flex:none}
.erailitem.on .eranbadge{background:var(--tinta)}
#erail.recolhido .eranbadge{display:none}
.erailfoot{border-top:1px solid #f0f0ee;padding-top:16px;display:flex;flex-direction:column;gap:12px;margin-top:16px}
.erailuser{display:flex;align-items:center;gap:11px;padding:0 10px}
#erail.recolhido .erailuser{justify-content:center}
.erailavatar{width:36px;height:36px;border-radius:10px;background:var(--acento);color:#fff;
  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0}
.erailuinfo{min-width:0}
.erailuname{font-size:12.5px;font-weight:700;color:var(--tinta);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.erailudoc{font-size:11px;color:var(--apagado);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.erailsair{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;font-size:13px;
  font-weight:600;color:#6b7280;background:none;border:none;cursor:pointer;font-family:inherit;width:100%;text-align:left}
.erailsair:hover{background:var(--bg);color:var(--tinta)}

/* ── topbar 74px ── */
#etopbar{position:fixed;top:44px;left:252px;right:0;height:74px;background:var(--painel);
  border-bottom:1px solid var(--linha);display:flex;align-items:center;justify-content:space-between;
  padding:0 32px;gap:16px;transition:left .25s ease;z-index:690}
#erail.recolhido ~ #etopbar{left:76px}
.etitle{font-size:17px;font-weight:800;color:var(--tinta);letter-spacing:-.01em;white-space:nowrap}
.edate{font-size:12px;color:var(--apagado);font-weight:500;white-space:nowrap}
.etopright{display:flex;align-items:center;gap:10px}
.echip{font-size:11.5px;font-weight:700;padding:6px 12px;border-radius:999px;background:#f0f0ee;
  color:var(--tinta-2);white-space:nowrap;display:inline-flex;align-items:center;gap:6px;border:none;
  font-family:inherit;cursor:pointer}
.echip:hover{filter:brightness(.97)}
.echip.offline{background:#fdeaea;color:#b42318}
.eiconbtn{width:38px;height:38px;border:1px solid var(--linha-2);border-radius:10px;background:var(--painel);
  color:var(--tinta-2);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.eiconbtn:hover{background:#fafafa}

/* ── área do conteúdo (a BrowserView fica por cima deste retângulo) ── */
#econtent{position:fixed;top:118px;left:252px;right:0;bottom:0;background:var(--bg);
  transition:left .25s ease;overflow:auto;padding:26px 32px 20px}
#erail.recolhido ~ #econtent{left:76px}
.ecard{background:var(--painel);border:1px solid var(--linha);border-radius:16px;
  box-shadow:0 1px 2px rgba(17,17,17,.03);padding:24px}
.evazio{padding:34px 20px;text-align:center;color:var(--apagado);font-size:13px}
```

- [ ] **Step 2: Conferir que o CSS carrega sem erro**

Run: `cd ~/dev/queromais-desktop && node -e "const c=require('fs').readFileSync('renderer/elo/elo.css','utf8'); const a=(c.match(/{/g)||[]).length, f=(c.match(/}/g)||[]).length; if(a!==f) throw new Error('chaves desbalanceadas: '+a+' vs '+f); console.log('ok,', a, 'blocos')"`
Expected: `ok, <n> blocos`

- [ ] **Step 3: Commit**

```bash
cd ~/dev/queromais-desktop
git add renderer/elo/elo.css
git commit -m "feat(desktop): CSS do shell elo em verde Pediu!"
```

---

## Task 9: `renderer/elo/` — o shell que desenha o menu

**Files:**
- Create: `~/dev/queromais-desktop/renderer/elo/index.html`
- Create: `~/dev/queromais-desktop/renderer/elo/shell.js`
- Test: `~/dev/queromais-desktop/test/shell-render.test.js`

- [ ] **Step 1: Escrever o teste das funções puras do shell**

```js
// test/shell-render.test.js
const { test } = require('node:test')
const assert = require('node:assert')
const { htmlDoMenu, iniciaisDe, tituloDaRota, dataPorExtenso } = require('../renderer/elo/shell')

const menu = {
  secoes: [
    { titulo: 'Principal', itens: [
      { id: 'dashboard', href: '/admin', label: 'Visão geral', icone: '<rect x="3" y="3" width="7" height="7"/>' },
      { id: 'pedidos', href: '/admin/pedidos', label: 'Gestão de pedido', icone: '<path d="M9 5H7"/>', badge: 'pedidos' },
    ] },
  ],
  badges: { pedidos: 5, carrinhos: 0 },
}

test('desenha grupo e itens', () => {
  const h = htmlDoMenu(menu, '/admin', true)
  assert.ok(h.includes('PRINCIPAL') || h.includes('Principal'))
  assert.ok(h.includes('Visão geral'))
  assert.ok(h.includes('data-href="/admin/pedidos"'))
})

test('marca como ativo só o item da rota atual', () => {
  const h = htmlDoMenu(menu, '/admin/pedidos', true)
  const ativo = h.split('<div').find(p => p.includes('data-href="/admin/pedidos"'))
  assert.ok(ativo.includes('erailitem on'))
  const outro = h.split('<div').find(p => p.includes('data-href="/admin"') && !p.includes('/admin/pedidos'))
  assert.ok(!outro.includes(' on'))
})

test('badge zerado não aparece', () => {
  const h = htmlDoMenu({ ...menu, badges: { pedidos: 0, carrinhos: 0 } }, '/admin', true)
  assert.ok(!h.includes('eranbadge'))
})

test('offline esmaece os itens (nenhum módulo é nativo ainda na F1)', () => {
  const h = htmlDoMenu(menu, '/admin', false)
  assert.ok(h.includes('erailitem off'))
})

test('iniciais da loja para o avatar', () => {
  assert.strictEqual(iniciaisDe('Pizzaria do Jasson'), 'PJ')
  assert.strictEqual(iniciaisDe('Pediu'), 'PE')
  assert.strictEqual(iniciaisDe(''), '—')
})

test('título vem do item da rota', () => {
  assert.strictEqual(tituloDaRota(menu, '/admin/pedidos'), 'Gestão de pedido')
  assert.strictEqual(tituloDaRota(menu, '/admin/desconhecido'), 'Painel')
})

test('data por extenso em pt-BR', () => {
  assert.match(dataPorExtenso(new Date('2026-09-07T12:00:00')), /setembro/)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ~/dev/queromais-desktop && node --test test/shell-render.test.js`
Expected: FAIL — `Cannot find module '../renderer/elo/shell'`

- [ ] **Step 3: Criar `renderer/elo/shell.js`**

```js
// renderer/elo/shell.js — desenha a sidebar e a topbar do visual elo a partir do
// menu que o servidor mandou. As funções de montagem são puras (testadas em node);
// só a parte de baixo, guardada por `typeof document`, toca a tela.

function esc(s) {
  return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function iconeSvg(interno) {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
    + ' stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' + interno + '</svg>'
}

function ehAtivo(href, rota) {
  return href === '/admin' ? rota === '/admin' : rota.indexOf(href) === 0
}

/** online=false esmaece todo item que depende da web (na F1, todos). */
function htmlDoMenu(menu, rota, online) {
  const badges = (menu && menu.badges) || {}
  return (menu && menu.secoes ? menu.secoes : []).map((secao) => {
    const itens = secao.itens.map((it) => {
      const classes = ['erailitem']
      if (ehAtivo(it.href, rota)) classes.push('on')
      if (!online) classes.push('off')
      const n = it.badge ? Number(badges[it.badge] || 0) : 0
      const badge = n > 0 ? '<span class="eranbadge">' + n + '</span>' : ''
      return '<div class="' + classes.join(' ') + '" data-href="' + esc(it.href) + '" data-id="' + esc(it.id) + '"'
        + ' title="' + esc(it.label) + '">' + iconeSvg(it.icone)
        + '<span class="lbl">' + esc(it.label) + '</span>' + badge + '</div>'
    }).join('')
    const titulo = secao.titulo ? '<div class="erailgrp">' + esc(secao.titulo) + '</div><div class="erailgrpdiv"></div>' : ''
    return titulo + itens
  }).join('')
}

function iniciaisDe(nome) {
  const partes = ('' + (nome || '')).trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return '—'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function tituloDaRota(menu, rota) {
  const todos = (menu && menu.secoes ? menu.secoes : []).reduce((acc, s) => acc.concat(s.itens), [])
  const achado = todos.filter((i) => ehAtivo(i.href, rota)).sort((a, b) => b.href.length - a.href.length)[0]
  return achado ? achado.label : 'Painel'
}

function dataPorExtenso(d) {
  try {
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  } catch (e) { return '' }
}

module.exports = { htmlDoMenu, iniciaisDe, tituloDaRota, dataPorExtenso, esc, ehAtivo }

// ── daqui pra baixo, só roda dentro da janela ────────────────────────────────
if (typeof document !== 'undefined') {
  const { ipcRenderer } = require('electron')
  const brand = require('../../src-electron/brand')

  let MENU = null
  let ROTA = '/admin'
  let ONLINE = false

  const $ = (id) => document.getElementById(id)

  function pintar() {
    $('erailNav').innerHTML = htmlDoMenu(MENU, ROTA, ONLINE)
    $('etitle').textContent = tituloDaRota(MENU, ROTA)
    $('edate').textContent = dataPorExtenso(new Date())
    const loja = (MENU && MENU.loja) || {}
    $('erailAvatar').textContent = iniciaisDe(loja.nome)
    $('erailNome').textContent = loja.nome || brand.nome_delivery
    $('erailDoc').textContent = loja.documento || ''
    $('chipRede').className = 'echip' + (ONLINE ? '' : ' offline')
    $('chipRede').textContent = ONLINE ? 'conectado' : 'sem internet'
  }

  async function carregarMenu() {
    const r = await ipcRenderer.invoke('menu-carregar')
    if (r && r.dados) { MENU = r.dados; pintar() }
  }

  document.addEventListener('click', (e) => {
    const item = e.target.closest ? e.target.closest('.erailitem') : null
    if (item && !item.classList.contains('off')) {
      ROTA = item.getAttribute('data-href')
      pintar()
      ipcRenderer.invoke('abrir-rota', ROTA)
    }
  })

  $('erailToggle').addEventListener('click', () => {
    const recolhido = $('erail').classList.toggle('recolhido')
    ipcRenderer.send('sidebar-largura', recolhido ? 76 : 252)
  })

  ipcRenderer.on('rota-mudou', (e, rota) => { ROTA = rota; pintar() })
  ipcRenderer.on('rede-mudou', (e, online) => { ONLINE = online; pintar(); if (online) carregarMenu() })

  ipcRenderer.invoke('rede-status').then((r) => { ONLINE = !!(r && r.online) })
  carregarMenu()
  setInterval(carregarMenu, 30000)
}
```

- [ ] **Step 4: Criar `renderer/elo/index.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Pediu! Desktop</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="elo.css">
</head>
<body>
  <div id="titlebar">
    <span style="font-size:12.5px;font-weight:700;color:#4b5563" id="tbNome">Pediu! Desktop</span>
    <span class="janela">
      <button class="jb" id="jbMin" title="Minimizar">—</button>
      <button class="jb" id="jbMax" title="Maximizar">▢</button>
      <button class="jb" id="jbFechar" title="Fechar">✕</button>
    </span>
  </div>

  <nav id="erail">
    <div class="erailtop">
      <div class="erailbrand">
        <img id="erailLogo" src="../../brands/pediu/src/pediu-logo-principal.svg" alt="Pediu!">
        <div class="eraillabel">Gestão</div>
      </div>
      <button type="button" class="erailtoggle" id="erailToggle" title="Recolher menu">‹</button>
    </div>
    <div class="erailnav" id="erailNav"></div>
    <div class="erailfoot">
      <div class="erailuser">
        <div class="erailavatar" id="erailAvatar">—</div>
        <div class="erailuinfo">
          <div class="erailuname" id="erailNome">—</div>
          <div class="erailudoc" id="erailDoc"></div>
        </div>
      </div>
      <button type="button" class="erailsair" id="erailSair"><span class="lbl">Sair</span></button>
    </div>
  </nav>

  <div id="etopbar">
    <div>
      <div class="etitle" id="etitle">Painel</div>
      <div class="edate" id="edate"></div>
    </div>
    <div class="etopright">
      <button class="echip" id="chipRede">verificando…</button>
      <button class="echip" id="chipSplit">tela dividida</button>
      <button class="eiconbtn" id="btnWhats" title="WhatsApp">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.5 8.5 0 01-3.9-.9L3 21l2-4.9A8.4 8.4 0 1121 11.5z"/></svg>
      </button>
    </div>
  </div>

  <div id="econtent"></div>

  <script src="shell.js"></script>
</body>
</html>
```

- [ ] **Step 5: Rodar os testes**

Run: `cd ~/dev/queromais-desktop && node --test test/shell-render.test.js`
Expected: PASS — 7 testes

- [ ] **Step 6: Commit**

```bash
cd ~/dev/queromais-desktop
git add renderer/elo/index.html renderer/elo/shell.js test/shell-render.test.js
git commit -m "feat(desktop): shell elo desenha menu, topbar e selo de conexão"
```

---

## Task 10: `main.js` — ligar o shell na marca Pediu!

**Files:**
- Modify: `~/dev/queromais-desktop/src-electron/main.js:252-289` (posicionamento), `:295-317` (janela), `:553-572` (watchdog)

- [ ] **Step 1: Trocar o posicionamento pelo módulo puro**

No topo do arquivo, junto dos outros `require`:

```js
const { calcularBounds } = require('./layout-views')
const { makeStore } = require('./cache-store')
const { criarMonitor } = require('./rede')
const ponte = require('./ponte')
const { safeStorage } = require('electron')
```

Trocar o bloco `global.sidebarW = 56 … function posicionarViews() { … }` (linhas 254-290) por:

```js
// Marca Pediu! usa o shell "elo" (sidebar 252px + topbar 74px sob a titlebar de 44px).
// As demais marcas seguem com a barrinha de ícones de 56px e só a titlebar.
const EH_PEDIU = brand.plataforma_slug === 'pediu'
global.sidebarW   = EH_PEDIU ? 252 : 56
global.splitRatio = 0.7
const HANDLE_W    = 6
const HEADER      = EH_PEDIU ? 118 : 44   // 44 titlebar + 74 topbar

function posicionarViews() {
  const win = global.mainWindow
  if (!win || !global.cardapioView || !global.whatsappView) return
  const b = win.getContentBounds()
  const modo = global.activeView === 'split' ? 'split' : 'cardapio'
  const bounds = calcularBounds({
    largura: b.width, altura: b.height,
    sidebarW: global.sidebarW, topoH: HEADER,
    modo, splitRatio: global.splitRatio, handleW: HANDLE_W,
  })
  global.cardapioView.setBounds(bounds.cardapio)
  global.whatsappView.setBounds(bounds.whatsapp)
  if (modo !== 'split') {
    win.setTopBrowserView(global.activeView === 'whatsapp' ? global.whatsappView : global.cardapioView)
  }
}
global.posicionarViews = posicionarViews
```

- [ ] **Step 2: Carregar o shell certo**

Trocar o `loadURL` de `createWindow` (linha 313) por:

```js
  await global.mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, EH_PEDIU ? '../renderer/elo/index.html' : '../renderer/index.html'),
    protocol: 'file:',
    slashes: true,
  }))
```

- [ ] **Step 3: Registrar a ponte no boot**

Logo depois de `global.mainWindow.addBrowserView(global.whatsappView)` (linha ~423), acrescentar:

```js
  // ── Ponte do shell nativo: menu, rede e cache ────────────────────────────
  const cache = makeStore(path.join(app.getPath('userData'), 'cache'), {
    available: () => safeStorage.isEncryptionAvailable(),
    encrypt: (s) => safeStorage.encryptString(s),
    decrypt: (b) => safeStorage.decryptString(Buffer.from(b)),
  })

  const pedirMenuAoPainel = async () => {
    const wc = global.cardapioView?.webContents
    if (!wc || wc.isDestroyed()) return null
    return wc.executeJavaScript(
      "fetch('/api/admin/menu',{credentials:'include'}).then(r=>r.ok?r.json():null).catch(()=>null)", true)
  }

  const monitorRede = criarMonitor({
    pingar: async () => {
      const wc = global.cardapioView?.webContents
      if (!wc || wc.isDestroyed()) return false
      return wc.executeJavaScript(
        "fetch('/api/admin/menu',{method:'HEAD',credentials:'include'}).then(r=>r.status<500).catch(()=>false)", true)
    },
    aoMudar: (online) => {
      try { global.mainWindow?.webContents.send('rede-mudou', online) } catch (e) {}
      log.info('[REDE] ' + (online ? 'conectado' : 'sem internet'))
    },
  })
  monitorRede.iniciar()

  ponte.registrar({
    ipcMain, cache, monitorRede,
    pedirAoPainel: pedirMenuAoPainel,
    lojaIdAtual: () => getConfig().lojaId,
    abrirRota: (href) => {
      const base = getConfig().cardapioUrl.replace(/\/admin\/?$/, '')
      global.activeView = 'cardapio'
      posicionarViews()
      global.cardapioView.webContents.loadURL(base + href)
      return { ok: true }
    },
  })

  // Largura da sidebar mudou (recolher/expandir): reposiciona as views.
  ipcMain.on('sidebar-largura', (e, largura) => {
    global.sidebarW = Number(largura) || global.sidebarW
    posicionarViews()
  })

  // Navegou por dentro do painel: o menu acompanha.
  global.cardapioView.webContents.on('did-navigate', (e, urlAtual) => {
    try {
      const rota = new URL(urlAtual).pathname
      global.mainWindow?.webContents.send('rota-mudou', rota)
    } catch (x) {}
  })
  global.cardapioView.webContents.on('did-navigate-in-page', (e, urlAtual) => {
    try {
      const rota = new URL(urlAtual).pathname
      global.mainWindow?.webContents.send('rota-mudou', rota)
    } catch (x) {}
  })
```

- [ ] **Step 4: Conferir que o watchdog acompanha as novas medidas**

O watchdog (`main.js:556-576`) já compara com `global.sidebarW` e `HEADER` — as duas passaram a valer 252/76 e 118 no Step 1, então ele protege o chrome novo **sem nenhuma alteração**. Só confirmar que continua assim:

Run: `grep -n "b.x < SB || b.y < HEADER" ~/dev/queromais-desktop/src-electron/main.js`
Expected: uma ocorrência. Se aparecer `56` ou `44` escrito na mão nesse bloco, trocar por `SB` e `HEADER`.

- [ ] **Step 5: Rodar a suíte**

Run: `cd ~/dev/queromais-desktop && npm test`
Expected: PASS — todos os arquivos de `test/`

- [ ] **Step 6: Commit**

```bash
cd ~/dev/queromais-desktop
git add src-electron/main.js
git commit -m "feat(desktop): marca pediu abre no shell elo, com ponte e monitor de rede"
```

---

## Task 11: Fumaça — rodar o app de verdade

**Files:** nenhum

- [ ] **Step 1: Gerar a marca Pediu! e abrir**

```bash
cd ~/dev/queromais-desktop
npm run apply-brand pediu
npm run dev
```

- [ ] **Step 2: Conferir, com a janela aberta**

- [ ] a sidebar branca de 252px aparece com os grupos **Principal / Operação / Marketing / Sistema**
- [ ] o item ativo tem fundo verde claro e faixa verde à esquerda
- [ ] o botão de recolher deixa a barra com 76px **e o conteúdo acompanha** (sem faixa branca sobrando)
- [ ] a topbar mostra o nome da tela e a data por extenso
- [ ] clicar num item navega o painel e o item acompanha
- [ ] navegar por dentro do painel (um link interno) acerta o item da barra
- [ ] o rodapé mostra o nome da loja e as iniciais no avatar
- [ ] desligar o Wi-Fi: o chip vira **sem internet** em até 20s e os itens esmaecem
- [ ] religar: o chip volta a **conectado** e o menu recarrega sozinho
- [ ] `npm run apply-brand queromais && npm run dev` → o Quero Mais abre **exatamente como antes**

- [ ] **Step 3: Registrar o resultado**

Anotar no fim da spec, em "F1 — resultado", o que passou e o que ficou pendente.

- [ ] **Step 4: Commit**

```bash
cd ~/dev/queromais-desktop
git add docs/superpowers/specs/2026-09-07-pediu-desktop-shell-elo-design.md
git commit -m "docs: resultado da fumaça da F1"
```

---

## Depois da F1

A F2 (Caixa/PDV nativo) começa com a ponte já pronta: a tela nativa lê por `cache-get`/`cache-set` e o item do menu deixa de abrir a `BrowserView`. A F3 acrescenta a fila de escrita — e é aí que o `POST /api/admin/venda` precisa aceitar o id gerado pelo app.
