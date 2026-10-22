# Mapa de páginas e fluxos — reimplementação

Comparação entre as **41 rotas SPA do original** (extraídas do bundle por `scripts/analise-bundle/spa-routes.mjs`)
e as telas implementadas nesta reimplementação.

> **Observação importante:** apenas o grupo público e a tela de login do original foram observados
> diretamente (o login falhou com 401 — ver `docs/RELATORIO-ENGENHARIA-REVERSA.md`, seção 3.7).
> As demais rotas são reconstruções baseadas nos literais de rota e nos módulos do bundle.

---

## 1. Rotas implementadas

| Rota | Tela | Equivalente no original | Estado |
|---|---|---|---|
| `/login` | `features/auth/pages/login-page.tsx` | `/login` | ✅ observado |
| `/register` | `features/auth/pages/register-page.tsx` | `/register` | ✅ observado |
| `/forgot-password` | `features/auth/pages/forgot-password-page.tsx` | rota de recuperação | ✅ inferido |
| `/reset-password` | `features/auth/pages/reset-password-page.tsx` | rota de reset | ✅ inferido |
| `/p/:id` | `features/public/pages/public-flyer-page.tsx` | link público de encarte | ✅ inferido |
| `/flyers` | `features/flyers/pages/flyers-page.tsx` | `/flyers` | ✅ inferido |
| `/editor/:id` | `features/flyers/pages/editor-page.tsx` | `/editor/$flyerKey` | ✅ inferido |
| `/products` | `features/products/pages/products-page.tsx` | `/products` | ✅ inferido |
| `/designs` | `features/designs/pages/designs-page.tsx` | `/designs/*` | ✅ inferido |
| `/assets` | `features/media/media-library.tsx` | `/assets*` | ✅ inferido |
| `/brandkit` | `features/media/brand-page.tsx` | `/brandkits*` | ✅ inferido |
| `/exports` | `features/exports/pages/exports-page.tsx` | `/exports` | ✅ inferido |
| `/billing` | `features/billing/pages/billing-page.tsx` | `/billing`, `/credits` | ✅ inferido |
| `/settings` | `features/settings/pages/settings-page.tsx` | `/settings`, `/account` | ✅ inferido |
| `/dashboard` | `features/dashboard/pages/dashboard-page.tsx` | `/dashboard` | ✅ inferido |

Rotas do original ainda sem tela própria local (administrativas, financeiras externas ou sem observabilidade autenticada):
`/admin*`, `/chat/:sessionId`, `/affiliates*`, `/logs*`, `/users*`, `/roles*`, `/tags*`,
`/blog*`, `/inbox*`, `/checkouts*` e `/online-users*`. O contrato `/elements*` já está implementado e integrado ao editor.

---

## 2. Fluxos

### 2.1 Autenticação

```
/login
 ├─ e-mail + senha ──► POST /api/auth/login
 │     ├─ 200 ──► token em localStorage["@encartefacil:token"] + cookie httpOnly ef_token
 │     │          └─► GET /api/auth/me ──► redirect /flyers
 │     └─ 401 ──► alerta "Credenciais invalidas"
 ├─ "Esqueci a senha" ──► /forgot-password ──► POST /api/auth/forgot-password
 │                          └─ (local) devolve resetToken ──► /reset-password?token=…&email=…
 │                                                              └─► POST /api/auth/reset-password
 └─ "Criar conta" ──► /register ──► POST /api/auth/register ──► redirect /flyers
```

### 2.2 Ciclo de vida de um encarte

```
/flyers
 ├─ "Novo encarte" ──► diálogo (nome + formato)
 │                     └─► POST /api/flyers ──► /editor/:id
 ├─ card ──► /editor/:id
 ├─ menu do card
 │     ├─ Duplicar ──► POST /api/flyers/:id/duplicate
 │     ├─ Publicar/Despublicar ──► PUT /api/flyers/:id
 │     └─ Excluir ──► DELETE /api/flyers/:id
```

### 2.3 Editor

```
/editor/:id
 ├─ painel esquerdo
 │     ├─ Elementos: texto · forma · catálogo pesquisável · imagens da biblioteca · cor de fundo
 │     ├─ Produtos: lista do catálogo ──► insere o produto no canvas
 │     └─ Camadas: elementos e produtos ordenados por z-index
 ├─ canvas
 │     ├─ arrastar (move) e redimensionar (canto inferior direito)
 │     └─ clique ──► seleciona ──► inspetor à direita
 ├─ inspetor: posição, tamanho, fonte, cor, alinhamento, rotação, opacidade, destaque
 ├─ atalhos: Ctrl+Z desfazer · Ctrl+Shift+Z refazer · Delete remover
 ├─ autosave (debounce 1,5 s) ──► PUT /api/flyers/:id
 ├─ "Salvar" ──► PUT /api/flyers/:id
 ├─ "Compartilhar" ──► POST /api/flyers/:id/whatsapp
 └─ "Exportar" ──► POST /api/flyers/:id/render
       ├─ PNG/JPEG reais via Sharp
       ├─ PDF real via PDFKit
       ├─ SVG determinístico
       └─ MP4 H.264 via FFmpeg
```

### 2.4 Produtos → encarte

```
/products
 ├─ "Novo produto" ──► POST /api/products
 ├─ editar ──► PUT /api/products/:id
 ├─ excluir ──► DELETE /api/products/:id
 └─ /editor/:id ──› aba "Produtos" ──› clique no item ──► inserido no canvas
```

### 2.5 Planos e créditos

```
/billing
 ├─ GET /api/billing/overview  (plano, créditos, totais)
 ├─ GET /api/billing/prices     (pacotes em centavos)
 └─ "Contratar" ──► registro local (sem cobrança real)
```

---

## 3. Layout

```
┌────────────┬──────────────────────────────────────────┐
│  Sidebar   │  Topbar (usuário, sair)                 │
│            ├──────────────────────────────────────────┤
│  Painel    │                                          │
│  Encartes  │              Conteúdo da rota            │
│  Produtos  │                                          │
│  Modelos   │                                          │
│  Export.   │                                          │
│  Plano     │                                          │
│  Config.   │                                          │
└────────────┴──────────────────────────────────────────┘
```

O editor troca o layout: sem topbar e sem padding, em grade de três colunas
`[painel 280px] [canvas fluido] [inspetor 300px]`.

---

## 4. Identidade visual

- Tipografia: **Oswald** (títulos), **Roboto** (interface), **Montserrat** (disponível).
- Cor primária: `hsl(345 82% 47%)` — vermelho/magenta da marca.
- Componentes no estilo shadcn/Radix em `web/src/components/ui`.
- Toasts via **Sonner** (canto superior direito), igual ao original.
