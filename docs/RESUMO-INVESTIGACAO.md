# Resumo da investigação — Encarte Fácil (arquivo de continuidade)

> **Arquivo atual de retomada:** consulte primeiro [`CONTEXTO-RETOMADA.md`](CONTEXTO-RETOMADA.md). Ele registra a segunda captura de 181 arquivos públicos, a análise REA completa do bundle e as funcionalidades implementadas depois deste resumo histórico.

**Última atualização:** 2026-10-20 · **Alvo:** https://editor.encartefacil.com · **Ferramenta:** REA 6.7.0 + leitura estática do bundle

> Este arquivo é o **ponto de retomada** do trabalho: resume o que já foi provado, onde estão as evidências e o que falta. Atualize-o a cada etapa para não perder contexto.

---

## 1. Estado atual

| Frente | Status | Evidência |
|---|---|---|
| Captura da tela de login (DOM, acessibilidade, rede, console) | ✅ concluído | `docs/evidencias/dados/api-login.json` (5 transações reais) |
| Exportação dos chunks JS do bundle | ✅ concluído | 79 arquivos em `%TEMP%\kilo\ef-investigation\exported-scripts\...` (origem `3d7e1848...`) |
| Contrato de API reconstruído | ✅ concluído | `docs/evidencias/API-CONTRATO-ORIGINAL.md` (83 endpoints) |
| Modelo de dados, rotas e módulos | ✅ concluído | `docs/evidencias/MODELO-DE-DADOS-E-ROTAS.md` |
| Análise estática REA (grafo semântico) | ✅ concluída (destilação do `rea-static.json`; o subagente dedicado entrou em erro e a entrega foi refeita aqui) | `docs/evidencias/REA-ANALISE-ESTATICA.md` |
| Relatório final de engenharia reversa | ✅ concluído | `docs/RELATORIO-ENGENHARIA-REVERSA.md` |
| Mapa de páginas e fluxos | ✅ concluído | `docs/MAPA-PAGINAS-E-FLUXOS.md` |
| Reimplementação (API + SPA + editor) | ✅ concluída | `server/`, `web/` |
| Testes automatizados | ✅ **94 testes** (65 servidor + 20 web + 9 E2E) | `npm test`, `npm run test:e2e` |
| Autenticação real (login com sucesso) | ⚠️ **bloqueada** — `POST /auth/login` devolveu **401 `Credenciais inválidas`** | `api-login.json`, transação 5 |
| Captura autenticada anterior do editor e suas sete seções | ✅ sanitizada, com 30 transações | `docs/evidencias/dados/autenticado/` |

## 2. Fatos já provados (com evidência)

1. **Base da API:** `https://api-v2.encartefacil.com` (`index-KJ2_zNqK.js`, constante `g1`).
2. **Cliente HTTP:** classe base própria (`class Nc`) sobre `fetch`, com `get/post/put/patch/delete`; resposta normalizada `{data, status, headers}`; erro por `error`/`message` no JSON.
3. **Cabeçalhos:** `Authorization: Bearer <@encartefacil:token>`, `x-session-id` (UUID, `sessionStorage`), `x-platform: web`, `x-locale`, `x-market`, `x-location-country-code`, `x-location-state-code`, `x-forwarded-host`, `X-Timezone`, `X-Screen-Resolution`, `Content-Type: application/json`.
4. **Expiração de sessão:** erro `"Token inválido ou expirado"`/`"Token expirado"` → limpa token/admin-token/impersonation → redireciona para `/login`.
5. **83 endpoints** mapeados por domínio: auth (9), clientes (4), parceiros (11), cobrança (14), flyers (11), designs (14), formatos (2), brandkits (3), assets (10), exports/SSE (7), afiliados (4), plataforma/tracking (3).
6. **Dados do cliente:** camada de dados = **TanStack Query** (não RTK Query) + 6 classes de serviço singleton.
7. **Estado do editor:** store de átomos com `sidebar`, `layout`, `selection`, `canvas`, `flyer`; autosave com debounce de 800 ms → `PUT /flyers/{_key}`.
8. **Payload do flyer** (serialização `Lt()`): `name, format, design, content, palette, logo, backgroundColor, startAt, endAt, status, template, public, preview, elements[], products[], footer, videoSettings, grid, gridHighlights, gridLayouts, defaultTagShape, defaultTagClipPath, settings, pageSettings, poster*, shelfLabel*, customPaperSize`.
9. **6 temas visuais embutidos:** `operacao-promo` (padrão), `hortifruti-fresh`, `satisfacao`, `black-friday`, `atacado-azul`, `padaria-artesanal`.
10. **41 rotas SPA** registradas no entry chunk (`/login`, `/register`, `/editor/$flyerKey`, `/admin`, `/products`, `/designs/*`, `/exports`, `/chat/$sessionId`, …).
11. **Stack do cliente:** React 18 + Vite/Rollup, React Router, TanStack Query, Radix UI, lucide-react 0.338.0, i18next/locize, Sonner (toasts), GTM/GA4 (`G-CZM9JW4K6G`), fontes Oswald/Roboto/Montserrat.
12. **Integrações:** CDN `cdn.encartefacil.com`, S3 dev `efacil-dev.s3.sa-east-1.amazonaws.com`, imagens em `d1rde4gbc24xn7.cloudfront.net`, Stripe (cartão/portal), WhatsApp (`wa.me`), PIX recorrente.

## 3. Lacunas conhecidas (importante para a implementação)

- **A análise estática do REA ficou parcial:** o worker estourou o heap ao analisar `index-KJ2_zNqK.js` (o entrypoint com a maioria das chamadas HTTP) e a cobertura sai como `partial`/`truncated`; por isso o REA deteccou 22 endpoints de rede, enquanto a leitura manual do mesmo bundle rendeu 92. Ver `docs/evidencias/REA-ANALISE-ESTATICA.md`.
- **Lacuna histórica resolvida parcialmente:** 181 arquivos públicos foram recuperados depois deste relatório; os chunks lazy de produtos, elementos, chat, blog, admin, checkout, flyers e exports estão em `docs/evidencias/public-bundle/`. Existe também uma captura autenticada anterior e sanitizada do editor.
- **Execução autenticada registrada:** a captura anterior percorreu Temas, Produtos, Elementos, Tags, Formatos, Marca e Encartes. Uma nova tentativa de login em 2026-10-20 foi recusada com HTTP 401.
- **Sem schema do servidor:** só os campos lidos pelo cliente estão documentados.
- **Sem regra de autorização observável:** não é possível afirmar quais rotas exigem papel admin/parceiro a partir do bundle.

> Consequência prática: a reimplementação deve tratar produtos/elementos/tags como **camada própria com persistência real**, explicitando a incompatibilidade, conforme a missão.

## 4. Inventário do projeto

```
encarte facil/
├─ loginencartefacil.md            (credencial da conta de teste — NÃO versionar, não cite valores)
├─ README.md                        (instalação, funcionalidades, testes)
├─ package.json                     (workspaces npm: server, web)
├─ kilo.json                        (REA registrado como servidor MCP do projeto)
├─ eslint.config.mjs  .env.example  .gitignore
├─ server/                          (API Express + SQLite)
│  └─ src/{config,app,index}.ts  db/  lib/  middleware/  modules/
├─ web/                             (SPA React 18 + Vite + Tailwind)
│  ├─ e2e/                          (Playwright)
│  └─ src/{lib,components,features,routes.tsx,main.tsx}
├─ docs/
│  ├─ RESUMO-INVESTIGACAO.md        (este arquivo)
│  ├─ RELATORIO-ENGENHARIA-REVERSA.md (relatório final: fatos, hipóteses, não verificados)
│  ├─ MAPA-PAGINAS-E-FLUXOS.md      (telas e fluxos reimplementados)
│  └─ evidencias/
│     ├─ API-CONTRATO-ORIGINAL.md   (contrato de rede reconstruído)
│     ├─ MODELO-DE-DADOS-E-ROTAS.md (modelo, rotas e módulos)
│     ├─ REA-ANALISE-ESTATICA.md    (análise estática REA: grafos, 39 nós endpoint, cobertura, limitações)
│     └─ dados/                     (9 JSON brutos + 1 tabela markdown)
│        ├─ api-login.json          (captura de rede real, sem valores de credencial)
│        ├─ api-paths.json          (literais de caminho candidatos)
│        ├─ endpoints-final.json    (tabela método+caminho+parâmetros)
│        ├─ api-all-classes.json    (classes de serviço e chamadas)
│        ├─ api-services.json       (serviços com métodos)
│        ├─ chunk-map.json          (mapa de chunks + lacunas)
│        ├─ chunk-table.md          (tabela de chunks por papel)
│        ├─ spa-routes.json         (rotas React Router)
│        ├─ api-scan.json           (hosts, chaves de storage, URLs)
│        └─ rea-distilled.json      (destilação do REA: grafos, kinds, endpoints, coverage, limitations)
└─ scripts/
   ├─ executar-rea.ps1              (orquestração REA do agente principal)
   └─ analise-bundle/               (scripts Node de extração, somente leitura)
      ├─ api-scan.mjs  api-services.mjs  api-all-classes.mjs  api-paths.mjs
      ├─ endpoints.mjs chunk-map.mjs chunk-table.mjs spa-routes.mjs
      ├─ show-api-login.mjs ctx.mjs slice.mjs find.mjs
      ├─ dump-base2.mjs dump-services.mjs themes.mjs
      └─ rea-final-local.mjs  (destilação do rea-static.json → docs/evidencias/dados/rea-distilled.json)
```

## 5. Artefatos de trabalho fora do projeto (temporários)

`%TEMP%\kilo\ef-investigation\`: `exported-scripts\` (79 chunks), `api-login.json`, `rea-static.json` (235 MB, UTF-16LE), `rea-static-summary.json`, `inspect-sources.json`, `capture-login.json`, `login.html`, `index-main.js`, `index-main.css`, `manifest.json` (scripts exportados).
**Cópia segura do que importa** está em `docs/evidencias/dados/`. Se a pasta temporária for limpa, o bundle de chunks pode ser re-obtido pela origem `3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f`.

## 6. Como reproduzir a análise do contrato

```powershell
node scripts\analise-bundle\api-all-classes.mjs   # classes de serviço + chamadas HTTP
node scripts\analise-bundle\endpoints.mjs         # tabela método+caminho+parâmetros
node scripts\analise-bundle\chunk-map.mjs         # mapa de chunks e chunks ausentes
node scripts\analise-bundle\spa-routes.mjs        # rotas React Router
node scripts\analise-bundle\show-api-login.mjs    # resumo redigido da captura de rede
```

Os scripts esperam os chunks em `%TEMP%\kilo\ef-investigation\exported-scripts\files\origins\3d7e1848.../assets` (caminho fixo no código, ajustável em 1 linha).

## 7. Estado da reimplementação

A reimplementação está **completa e executável**. Detalhes completos em
`docs/RELATORIO-ENGENHARIA-REVERSA.md` e `README.md`.

| Entrega | Situação |
|---|---|
| API Express + SQLite (`node:sqlite`), 46 rotas em 7 módulos | ✅ |
| Autenticação: registro, login, logout, `/me`, `/verify`, `/capabilities`, reset de senha | ✅ |
| Encartes: CRUD, duplicação, filtros, paginação, resumo, render SVG, rota pública, envios | ✅ |
| Editor web: sete seções originais, tags, formatos, arrastar/redimensionar, camadas, undo/redo, autosave, inspetor e zoom | ✅ |
| Produtos, modelos, exportações, planos, configurações, painel, página pública | ✅ |
| Testes: 65 (servidor) + 20 (frontend) + 9 (Playwright) | ✅ todos passando |
| Build de produção (`npm run build`) e execução com serviço estático do frontend | ✅ |
| REA registrado como MCP do projeto em `kilo.json` | ✅ |

### Comandos de verificação

```powershell
npm run typecheck      # servidor + frontend
npm test               # 65 servidor + 20 frontend
npm run test:e2e       # 9 testes Playwright (Chromium)
npm run build          # server/dist + web/dist
npm run dev            # API :3001 + frontend :5173
```

## 8. Próximos passos sugeridos

1. Se existir uma sessão válida no original, comparar as telas autenticadas e o tráfego com a
   implementação local, sem persistir cookies ou tokens.
2. Adicionar E2E para download PDF e criação/reutilização de modelos próprios.
3. Separar o bundle web por rota; o chunk principal atual tem cerca de 599 kB.
4. Planejar as migrações principais indicadas pelo `npm audit` e validar cada uma isoladamente.
5. Substituir o `node:sqlite` por PostgreSQL caso a persistência multiusuário passe a ser exigida.
