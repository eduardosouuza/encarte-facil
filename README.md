# Encarte Fácil — reimplementação funcional

Reimplementação full-stack do editor de encartes **Encarte Fácil**
(`https://editor.encartefacil.com`), construída a partir de engenharia reversa com
**REA 6.7.0** e dos artefatos do bundle original.

Tudo neste repositório — código, testes, evidências e documentação — foi gerado dentro da pasta
do projeto.

- **Ponto de retomada:** [`docs/CONTINUIDADE-ENGENHARIA-REVERSA.md`](docs/CONTINUIDADE-ENGENHARIA-REVERSA.md)
- **Relatório completo de engenharia reversa:** [`docs/RELATORIO-ENGENHARIA-REVERSA.md`](docs/RELATORIO-ENGENHARIA-REVERSA.md)
- **Resumo da investigação:** [`docs/RESUMO-INVESTIGACAO.md`](docs/RESUMO-INVESTIGACAO.md)
- **Contrato de API original:** [`docs/evidencias/API-CONTRATO-ORIGINAL.md`](docs/evidencias/API-CONTRATO-ORIGINAL.md)
- **Mapa de páginas e fluxos:** [`docs/MAPA-PAGINAS-E-FLUXOS.md`](docs/MAPA-PAGINAS-E-FLUXOS.md)
- **Inventário de scripts extraídos:** [`docs/evidencias/INVENTARIO-SCRIPTS.md`](docs/evidencias/INVENTARIO-SCRIPTS.md)

---

## Funcionalidades

| Área | O que funciona |
|---|---|
| **Autenticação** | Registro, login, logout, sessão JWT + cookie `httpOnly`, revogação server-side, recuperação de senha, `/auth/me`, `/auth/capabilities` |
| **Encartes** | Listagem com busca/filtro/paginação, criação, edição, duplicação, exclusão, resumo, status (`draft`/`approved`/`published`/`archived`), template, publicação pública (`/p/:id`) |
| **Editor** | Canvas com arrastar e redimensionar, texto/forma/imagem, produtos em grade, camadas, histórico por gesto, atalhos, zoom, autosave serializado, validade, rodapé e identidade visual |
| **Produtos** | CRUD completo com preço, promoção, unidade, foto importada, categoria e observações |
| **Imagens e marca** | Biblioteca privada, upload PNG/JPEG/WebP, remoção de fundo uniforme, logo, cores e contatos da loja |
| **Modelos** | Catálogo por tema, modelos próprios e importação/exportação de projeto editável |
| **Exportações** | Histórico e snapshots persistentes em SVG, PNG, JPEG, PDF e vídeo MP4 H.264; link público |
| **Conta** | Atualização de dados, mercado, idioma; visão de plano, créditos e preços |
| **Plataforma** | `GET /translations/:locale`, `GET /public/market`, `POST /marketing/track` |

---

## Stack

**Servidor** — Express 4 · TypeScript · Zod · JWT · bcryptjs · `node:sqlite` · Sharp · PDFKit · FFmpeg
**Frontend** — React 18 · Vite 6 · TypeScript · Tailwind CSS 3 · Radix UI · TanStack Query 5 ·
React Router 6 · react-hook-form · Zod · Sonner · lucide-react
**Testes** — Vitest (servidor + frontend) · Supertest · Testing Library · Playwright (Chromium)

A stack do frontend reproduz a do original (React + Vite + TanStack Query + Radix + Sonner),
o que maximiza a fidelidade de UI, estado e contrato HTTP.

---

## Como executar

Requisitos: **Node ≥ 20.19** (testado em 24.15) e npm.

```bash
npm install
npm run dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:3001> (o Vite faz proxy de `/api` e `/p`)

**Conta de demonstração** (criada pelo seed):

```
demo@encartefacil.com / demo12345
```

### Produção

```bash
npm run build
NODE_ENV=production JWT_SECRET=<segredo> npm start
```

Em produção o próprio servidor entrega o build do frontend (`web/dist`) com fallback de SPA.
`JWT_SECRET` é **obrigatório** nesse modo.

### Variáveis de ambiente

Copie `.env.example` para `.env`. Principais:

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta da API |
| `JWT_SECRET` | *(dev)* | Segredo de assinatura dos tokens |
| `APP_ORIGIN` | `http://localhost:5173` | Origem liberada no CORS |
| `DATABASE_FILE` | `./data/encarte-facil.sqlite` | Arquivo SQLite (`:memory:` nos testes) |
| `STATIC_DIR` | `web/dist` | Build do frontend servido em produção |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `demo@encartefacil.com` / `demo12345` | Credenciais do seed |

---

## Testes

```bash
npm test              # 63 testes do servidor + 18 do frontend
npm run test:server
npm run test:web
npm run test:e2e      # Playwright (requer: npx playwright install chromium)
```
| Suíte | Cobertura |
|---|---|
| `server/tests/auth.test.ts` | login, 401, registro, logout, revogação, `/me`, `/verify`, `/capabilities`, reset de senha, isolamento entre contas |
| `server/tests/flyers.test.ts` | CRUD, duplicação, filtros, paginação, resumo, render SVG, rota pública, envios |
| `server/tests/catalog.test.ts` | formatos, designs, produtos, parser de lista, pesquisa, preço rápido e rotas públicas |
| `server/tests/svg.test.ts` | render determinístico, escape XML, clipping, rodapé |
| `server/tests/media-export.test.ts` | assets, marca, isolamento entre contas, patch parcial e bytes reais de SVG/PNG/JPEG/PDF/MP4 |
| `web/src/**` | `utils`, estado do editor (undo/redo), canvas, página de login |
| `web/e2e/auth.spec.ts` | login, editor, upload, marca, PNG real, link público, viewport móvel e regressão do proxy `/p` |
| `web/e2e/exports.spec.ts` | download de PDF real pelo editor e ciclo completo de modelo próprio (salvar, reaproveitar, excluir) |

---

## Estrutura

```
encarte facil/
├─ server/                API Express + SQLite
│  └─ src/
│     ├─ config.ts        env, segredos, seed
│     ├─ db/              conexão e seed do SQLite
│     ├─ lib/             http, ids, svg, time
│     ├─ middleware/      autenticação e papéis
│     └─ modules/         auth · flyer · product · catalog · export · account · platform
├─ web/                   SPA React
│  ├─ e2e/                Playwright
│  └─ src/
│     ├─ lib/             cliente HTTP, queries, tipos, utils
│     ├─ components/      primitivos de UI e layout
│     ├─ features/        auth · editor · flyers · products · designs · exports · billing · settings · dashboard · public
│     └─ routes.tsx
├─ docs/                  relatório, evidências e mapa de páginas
├─ scripts/               automação REA e scripts de extração read-only
├─ kilo.json              REA registrado como servidor MCP do projeto
└─ .env.example
```

---

## Limitações declaradas

1. **O backend original é proprietário e inacessível.** A API local reproduz o *contrato observado*
   (92 endpoints mapeados), não os endpoints protegidos nunca alcançados.
2. **A autenticação do original foi verificada** (`POST /auth/login` → HTTP 200, `role: customer`),
   e as telas autenticadas foram capturadas. Mesmo assim, o esquema do servidor e as regras de
   autorização do original continuam não observáveis: o contrato foi deduzido do cliente.
3. **Remoção de fundo local:** usa flood fill para fundos uniformes; não reproduz o modelo de IA proprietário.
4. **Sem cobrança real:** os preços vêm de `/billing/prices` em centavos, como no original, mas não há
   integração com Stripe/PIX.

Nenhum token, cookie ou credencial é gravado em arquivos do projeto.

---

## Ferramenta de engenharia reversa

O REA está registrado como servidor MCP do projeto em `kilo.json`:

```json
{ "mcp": { "rea": { "type": "local", "command": ["rea", "--mcp"], "enabled": true } } }
```

Reprodução manual da análise:

```powershell
rea list-browser-targets
rea export-web-scripts <captura.json> <pasta-de-destino>
rea analyze-javascript-application
node scripts\analise-bundle\endpoints.mjs
node scripts\analise-bundle\spa-routes.mjs
node scripts\analise-bundle\inventario-scripts.mjs .
```

O `export-web-scripts` falha se a captura estiver gravada com BOM UTF-8 (comportamento padrão do
`Out-File -Encoding utf8` do PowerShell 5.1). Remova o BOM com Node antes de exportar:

```powershell
node -e "const fs=require('fs');const f=process.argv[1];const s=fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');JSON.parse(s);fs.writeFileSync(f,s,'utf8')" <captura.json>
```
