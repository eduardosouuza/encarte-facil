# Contrato de API original — Encarte Fácil

**Aplicação:** https://editor.encartefacil.com
**Fonte:** 79 chunks JavaScript exportados do bundle em produção (Vite/Rollup), minificados
`C:\Users\eduar\AppData\Local\Temp\kilo\ef-investigation\exported-scripts\files\origins\3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f\assets\`
**Método:** leitura estática do bundle (varredura de classes de serviço, chamadas `this.get/post/put/patch/delete`, `fetch(...)` e literais de caminho) + 1 captura de rede real da tela de login (REA 6.7.0, `api-login.json`).
**Data da análise:** 2026-10-20

> Documento descritivo do contrato **observado no cliente**. Nenhum endpoint foi inferido por suposição: todo item listado abaixo tem um literal de caminho no bundle e/ou uma requisição observada na captura de rede. Nenhuma credencial, token ou cookie aparece neste documento.

---

## 1. Transporte

| Item | Valor observado | Evidência |
|---|---|---|
| Base URL da API | `https://api-v2.encartefacil.com` | constante `g1` + `JT()` em `index-KJ2_zNqK.js` (fallback: `window.location.origin + "/api"`, ou `"/api"`) |
| Montagem de URL | `Pt(path, base)` → remove `/` à esquerda, normaliza barra final, resolve relativo contra `window.location.origin` | `index-KJ2_zNqK.js` |
| Verbos | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `class Nc` (classe base do cliente HTTP) |
| Corpo da requisição | `JSON.stringify(body)`; `FormData` é enviado sem `Content-Type` | `class Nc.request` |
| Resposta normalizada | `{ data, status, headers }` — `data` é o JSON parseado | `class Nc.request` |
| Resposta vazia | `204` ou `content-length: 0` → `data = {}`; `DELETE` sem JSON → `data = {}` | `class Nc.request` |
| Erro | JSON com `error` ou `message` → `throw new Error(mensagem)`; JSON inválido em resposta 2xx → `Error("Invalid JSON response")` | `class Nc.request` |

Não há `baseUrl`/`prepareHeaders` de RTK Query no bundle: a camada de dados é **TanStack Query** (`useQuery`, `useMutation`, `useInfiniteQuery` em `useQuery-D12Y0UPZ.js`, `useMutation-BPirSAry.js`, `use-infinite-list-CMBvctj2.js`) sobre **serviços singleton** que chamam `fetch` diretamente.

## 2. Cabeçalhos enviados

Todos os cabeçalhos abaixo são montados pelo cliente em `class Nc.addBrowserMetadata()` e `class Nc.request()`.

| Cabeçalho | Valor | Origem |
|---|---|---|
| `Content-Type` | `application/json` | padrão do cliente (removido quando o corpo é `FormData`) |
| `Access-Control-Allow-Origin` / `-Methods` / `-Headers` | `*` / `GET, POST, PUT, DELETE, OPTIONS` / `Content-Type` | enviados **pelo cliente** (o bundle os define como cabeçalhos de requisição) |
| `Authorization` | `Bearer <localStorage["@encartefacil:token"]>` | ausente quando não há token |
| `x-session-id` | UUID gerado no 1º uso e mantido em `sessionStorage["@encartefacil:session-id"]` (`crypto.randomUUID()` ou fallback `sess_<rand>_<ts>`) | sempre presente no navegador |
| `x-platform` | `web` | fixo |
| `x-locale` | `localStorage["locale"] ?? "pt-br"` | sempre presente |
| `x-market` | `localStorage["market"]` (normalizado para maiúsculas; catálogo BR/ES/etc.) | opcional |
| `x-location-country-code` | derivado do locale: `pt-br → BR`, `es → ES` | opcional |
| `x-location-state-code` | `localStorage["@encartefacil:location-state-code"]` | opcional |
| `x-forwarded-host` | `window.location.hostname` (omitido em `localhost` e IPs) | opcional |
| `X-Timezone` | `Intl.DateTimeFormat().resolvedOptions().timeZone` | sempre presente |
| `X-Screen-Resolution` | `<screen.width>x<screen.height>` | sempre presente |

Observação: `localStorage["admin-selected-partner-id"]` é **lido** pelo cliente, mas o valor não é enviado em nenhum cabeçalho (leitura sem efeito no contrato de rede observado).

## 3. Autenticação e expiração de sessão

| Comportamento | Evidência |
|---|---|
| Token persistido em `localStorage["@encartefacil:token"]` | `class lo` (`AuthService`), `saveToken/getToken/removeToken` |
| Login: `POST /auth/login` → salva `data.token` e devolve o payload inteiro | `class lo.login` |
| Registro: `POST /auth/register` → salva `data.token` | `class lo.register` |
| Sessão: `GET /auth/me` → devolve `{ ...data.user, betas: data.betas }` | `class lo.getUser` |
| Verificação: `GET /auth/verify` → `status === 200` | `class lo.verifyToken` |
| Token expirado: quando a resposta traz `error === "Token inválido ou expirado"` ou `"Token expirado"`, o cliente **apaga** `@encartefacil:token`, `@encartefacil:admin-token` e `@encartefacil:impersonation`, redireciona para `/login` e lança `Error("Sessão expirada. Por favor, faça login novamente.")` | `class Nc.request` |
| Impersonação (admin) | `POST /admin/impersonation/{id}` (body `{reason}`), `POST /admin/impersonation/stop`; token original em `@encartefacil:admin-token`, contexto em `@encartefacil:impersonation` | `class lo` |

## 4. Armazenamento local (contrato de estado do cliente)

| Chave | Store | Finalidade observada |
|---|---|---|
| `@encartefacil:token` | localStorage | Bearer de autenticação |
| `@encartefacil:session-id` | sessionStorage | correlação de sessão (`x-session-id`) |
| `@encartefacil:admin-token` | localStorage | token original antes da impersonação |
| `@encartefacil:impersonation` | localStorage | JSON do contexto de impersonação |
| `@encartefacil:active-partner` | localStorage | parceiro ativo (`saveActivePartner/getActivePartner`) |
| `@encartefacil:theme` | localStorage | tema da interface (constante `lt.THEME`) |
| `locale` | localStorage | idioma (`pt-br`, `es`, `en`) |
| `market` | localStorage | mercado detectado |
| `@encartefacil:location-state-code` | localStorage | UF do cliente |
| `admin-selected-partner-id` | localStorage | lido, mas não enviado à API |
| `ef_lead_prefill` | localStorage | pré-preenche `name`/`phone` no formulário de cadastro (`index-BMGestSM.js`) |
| `ef_onboarding` | localStorage | estado do tour inicial do editor (`index-BLLrK9Mc.js`) |

---

## 5. Catálogo de endpoints (92 reconstruídos)

Legenda de origem: `KJ2` = `index-KJ2_zNqK.js`; `DQz` = `service-DQzaU991.js` (designs); `Cmu` = `service-CmufRMLl.js` (formats); `cCD` = `service-cCDUhbQQ.js` (brandkits); `Dc4` = `service-Dc47qpQA.js` (assets); `Chp` = `service-Chphq-AR.js` (affiliates); `D1Y` = `use-exports-stream-D1YJPQTk.js` (exports).
`{x}` = identificador dinâmico (id do recurso). A coluna "resposta" lista **apenas os campos efetivamente lidos pelo cliente** — não é o schema completo do servidor.

### 5.1 Autenticação e conta (origem `KJ2`)

| Método | Caminho | Parâmetros / corpo | Resposta lida |
|---|---|---|---|
| POST | `/auth/login` | `{email, password}` | `data.token` + payload completo |
| POST | `/auth/register` | `{market, locale, ...dados}` | `data.token` |
| GET | `/auth/me` | — | `data.user`, `data.betas` |
| GET | `/auth/verify` | — | apenas `status` |
| GET | `/auth/capabilities` | — | `data.capabilities.passwordRecovery` |
| POST | `/auth/forgot-password` | `{email}` | `data` |
| POST | `/auth/reset-password` | `{token, email, password}` | `data` |
| POST | `/admin/impersonation/{id}` | `{reason}` | `data` |
| POST | `/admin/impersonation/stop` | corpo livre | — |

### 5.2 Cliente (origem `KJ2`)

| Método | Caminho | Parâmetros / corpo | Resposta lida |
|---|---|---|---|
| GET | `/customers/me` | — | `data.customer` |
| PUT | `/customers/me` | objeto do cliente | `data.customer` |
| POST | `/customers/me/phone/send-code` | `{phone}` (ou `{}`) | `data` |
| POST | `/customers/me/phone/verify` | `{code}` | `data.customer` |

### 5.3 Parceiros / white-label (origem `KJ2`)

| Método | Caminho | Parâmetros / corpo | Resposta lida |
|---|---|---|---|
| GET | `/partners/current` | — | `data.partner` |
| GET | `/partners` | `term, type, active, archived, limit, offset` | `data.partners[]` |
| GET | `/partners/{id}` | — | `data.partner` |
| POST | `/partners` | objeto do parceiro | `data.partner` |
| PUT | `/partners/{id}` | objeto do parceiro | `data.partner` |
| DELETE | `/partners/{id}` | — | — |
| GET | `/partners/stats/active` | — | `data.count` |
| PUT | `/partners/{id}/domain` | `{customDomain}` | `data` |
| DELETE | `/partners/{id}/domain` | — | `data` |
| POST | `/partners/{id}/domain/validate` | `{}` | `data` |
| POST | `/partners/{id}/domain/retry-ssl` | `{}` | `data` |

### 5.4 Assinatura e cobrança (origem `KJ2`)

| Método | Caminho | Parâmetros / corpo | Resposta lida |
|---|---|---|---|
| GET | `/subscriptions/me` | — | `data` |
| GET | `/prices` | — | `data` |
| POST | `/billing/checkout` | `{priceId, clientMeta}` | `data` |
| GET | `/billing/overview` | — | `data` |
| POST | `/billing/card` | objeto do cartão | `data` |
| POST | `/billing/card/default` | `{cardId}` | `data` |
| POST | `/billing/card/remove` | `{cardId}` | `data` |
| POST | `/billing/fiscal` | dados fiscais | `data` |
| POST | `/billing/card/stripe/session` | `{}` | `data` |
| POST | `/billing/card/stripe/confirm` | `{sessionId}` | `data` |
| POST | `/subscriptions/cancel` | `{}` | `data` |
| POST | `/subscriptions/resume` | `{}` | `data` |
| POST | `/billing/pix-recurring/cancel` | `{}` | `data` |
| POST | `/stripe/portal` | `{}` | `data` |

### 5.5 Encartes — flyers (origem `KJ2`)

| Método | Caminho | Parâmetros / corpo | Resposta lida |
|---|---|---|---|
| GET | `/flyers` | `term, format, status, template, limit, offset` | `flyers[]` |
| GET | `/flyers/summary` | mesmos filtros | `flyers[]` |
| GET | `/flyers/{id}` | `locale` | `flyer` (`null` em 404) |
| POST | `/flyers` | payload do encarte | `flyer` |
| PUT | `/flyers/{id}` | payload do encarte | `flyer` |
| DELETE | `/flyers/{id}` | — | — |
| POST | `/flyers/{id}/duplicate` | — | `flyer` |
| POST | `/flyers/{id}/render` | query `format` (`jpeg`/`png`/`pdf`) | `{png, jpeg, pdf}` |
| POST | `/flyers/{id}/render-video` | objeto do vídeo | `{mp4}` |
| POST | `/flyers/{id}/whatsapp` | `{phone, remember}` | `data` |
| POST | `/flyers/{id}/email` | `{email}` | `data` |

### 5.6 Modelos — designs (origem `DQz`)

| Método | Caminho | Parâmetros / corpo | Resposta lida |
|---|---|---|---|
| GET | `/designs` | `limit, offset, term, locale, status, category, archived, themes, industries, namedByMe` | `designs[]` |
| GET | `/designs/{key}` | `locale` | `design` |
| GET | `/designs/by-theme` | `locale` | `data` (lista por tema) |
| POST | `/designs` | objeto de design | `design` |
| PUT | `/designs/{key}` | objeto de design | `design` |
| DELETE | `/designs/{key}` | — | — |
| POST | `/designs/{key}/approve` | — | `design` |
| POST | `/designs/{key}/reject` | `{message}` | `design` |
| POST | `/designs/{key}/render` | query `locale` | `data` |
| POST | `/designs/{key}/preview` | `{image, locale}` | `data` |
| POST | `/designs/{key}/metadata/generate` | objeto de metadados | `data` |
| GET | `/customer-designs` | — | `names[]` |
| PUT | `/customer-designs/{key}` | `{title}` | `name` |
| DELETE | `/customer-designs/{key}` | — | — |

### 5.7 Formatos, brandkits, assets, exports, afiliados

| Método | Caminho | Origem | Parâmetros / corpo | Resposta lida |
|---|---|---|---|---|
| GET | `/formats` | `Cmu` | `title, code, published, premium, locale, limit, offset` | `formats[]` |
| GET | `/formats/{id}` | `Cmu` | — | `format` |
| GET | `/brandkits/me` | `cCD` | — | `brandKit` |
| GET | `/brandkits/{id}` | `cCD` | — | `brandKit` |
| PUT | `/brandkits/{id}` | `cCD` | `{brandKit}` | `brandKit` |
| POST | `/assets` | `Dc4` | objeto do asset | `success` + `asset` |
| POST | `/assets/upload` | `Dc4` | `{image, skipTrim, rotate}` | `success` + `asset` |
| POST | `/assets/remove-background` | `Dc4` | `{imageUrl, tolerance=30, quality="default"}` | `{assetId, imageUrl}` |
| GET | `/assets` | `Dc4` | `contentType, processed, limit, offset` | `assets[]` |
| GET | `/assets/all` | `Dc4` | mesmos filtros | `assets[]` |
| GET | `/assets/{id}` | `Dc4` | — | `asset` (`null` em 404) |
| PUT | `/assets/{id}` | `Dc4` | objeto do asset | `success` + `asset` |
| DELETE | `/assets/{id}` | `Dc4` | — | — |
| POST | `/assets/batch` | `Dc4` | `{keys[]}` | `assets[]` |
| GET | `/assets/stats/count` | `Dc4` | — | `total` |
| GET | `/assets/stats/partner-count` | `Dc4` | — | `total` |
| POST | `/exports` | `D1Y` | payload do export (+`?locale`) | `{export:{id,status}}` |
| GET | `/exports` | `D1Y` | — | `exports[]` |
| POST | `/exports/{id}/cancel` | `D1Y` | — | — |
| POST | `/exports/{id}/retry` | `D1Y` | — | — |
| POST | `/exports/{id}/share` | `D1Y` | objeto de compartilhamento | `data` |
| GET | `/deliveries/{id}` | `D1Y` | — | `delivery` |
| GET | `/exports/stream` | `D1Y` | `?token=<JWT>` | stream SSE (URL montada por `streamUrl()`) |
| GET | `/affiliates/stats` | `Chp` | — | `data` |
| GET | `/affiliates/referrals` | `Chp` | `limit, offset` | `data` |
| POST | `/affiliates/claim-reward` | `Chp` | `{milestoneTarget}` | `data` |
| GET | `/admin/affiliates` | `Chp` | `limit, offset` | `data` |

### 5.8 Plataforma / tracking (origem `KJ2`)

| Método | Caminho | Parâmetros / corpo | Resposta lida |
|---|---|---|---|
| GET | `/public/market` | `locale` | `data.prompt` (`ask`, `reason`, `guess.market`, `guess.locale`) |
| GET | `/translations/{locale}` | — | JSON de traduções (carregado por `fetch` direto) |
| POST | `/marketing/track` | `{eventType, eventId, eventData, visitorId, sessionId, gaClientId, gaSessionId, pageUrl, referrer, attribution, clickIds}` | sem corpo lido (204) |

## 6. Integrações externas observadas nos bundles

| Host | Uso | Origem |
|---|---|---|
| `https://cdn.encartefacil.com/<arquivo>` | CDN dos assets (bucket "produção") | `service-Dc47qpQA.js` (`getUriFromAsset`) |
| `https://efacil-dev.s3.sa-east-1.amazonaws.com/<arquivo>` | CDN de desenvolvimento, usado quando `asset.bucket` contém "dev" | `service-Dc47qpQA.js` |
| `https://d1rde4gbc24xn7.cloudfront.net/...` | ilustrações de ramo de negócio (butcher, agribusiness, wholesale, pharmacy, produce, department_store) | `index-KJ2_zNqK.js` |
| `https://wa.me` | abertura do WhatsApp | `index-KJ2_zNqK.js` |
| `https://fonts.googleapis.com` / `fonts.gstatic.com` | fontes Oswald, Roboto, Montserrat | `login.html` |
| `https://www.googletagmanager.com` | Google Tag Manager / GA4 (`G-CZM9JW4K6G`) | `index-KJ2_zNqK.js` |
| `https://locize.com` | i18n (serviço externo de tradução) | `index-KJ2_zNqK.js` |

## 7. Evidência de execução (captura real da tela de login)

5 transações observadas contra `api-v2.encartefacil.com` (origem `https://editor.encartefacil.com`), com `sec-fetch-site: same-site`:

| # | Método | URL | Status | Corpo/retorno observado |
|---|---|---|---|---|
| 1 | POST | `/marketing/track` | 204 | corpo: `eventType:"landing.viewed"`, `eventData.path:"/login"`, `page_type:"auth"`, `visitorId`, `sessionId`, `attribution.first.lp`, `clickIds.fbp` |
| 2 | GET | `/translations/pt-br` | 200 | traduções (corpo não retido na captura) |
| 3 | GET | `/partners/current` | 200 | `{"success":true,"partner":{"_key","_id","_rev","name","active","type","email","feePercent","referralRewardCredits","stripeAccount","defaultCountryCode","products":[{"id","name","description","prices":[{"credits","amount"}]}],"config":{"product":{...},"app":{...}}}}` |
| 4 | GET | `/public/market` | 200 | `{"success":true,"ipCountry":"BR","prompt":{"ask":false,"reason":"signals_agree","guess":{"market":"BR","locale":"pt-br"}}}` |
| 5 | POST | `/auth/login` | 401 | corpo `{email, password}` (valores redigidos) → `{"success":false,"error":"Credenciais inválidas"}` |

Cabeçalhos observados na transação 5 confirmam o contrato da seção 2: `content-type: application/json`, `x-forwarded-host: editor.encartefacil.com`, `x-locale: pt-br`, `x-location-country-code: BR`, `x-market: BR`, `x-platform: web`, `x-screen-resolution: 1440x900`, `x-session-id: <uuid>`, `x-timezone: America/Sao_Paulo`.

> Observação: o `Authorization` **não** aparece na transação de login (não há token ainda) e, pela política de captura do REA, valores de `Authorization`/`Cookie` são redigidos quando presentes.

## 8. O que NÃO foi provado

1. **Cobertura de chunks incompleta:** dos 47 chunks referenciados por `import()`/`from` no bundle capturado, **43 não foram exportados** (o navegador só carregou o grafo da tela de login). Faltam, entre outros, `flyers-B4rLVYUf.js`, `admin-route-IOWFK9U3.js`, `chat-page-sXQLYrOf.js`, `checkout-page-Z5ZnzTs3.js`, `exports-page-CATFaBKl.js`, `inbox-page-BwfPJNci.js`, `logs-Bhi2Sf4U.js`, `online-users-dashboard-tG9x8Iwf.js`, `list-*.js` (14 arquivos), `comps-list-DiMn7nL6.js`, `bulk-nKorVO5W.js`, `generate-uGBXj2EA.js`, `pay-link-page-BKD6Wiyg.js`. **Os endpoints de produtos, elementos, tags, chat, blog, admin, logs, usuários online, inbox e checkouts NÃO são conhecidos** — eles vivem nesses chunks ausentes. Caminhos como `/products` e `/elements` que aparecem no bundle são **rotas do SPA (React Router)**, não endpoints de API.
2. **Sem execução autenticada:** a tentativa de login retornou 401 (`Credenciais inválidas`). Portanto **nenhum** endpoint protegido foi exercitado em runtime; só 5 requisição foram observadas, 4 delas sem autenticação.
3. **Sem schema do servidor:** a coluna "resposta lida" traz apenas os campos que o cliente consome. Não há OpenAPI/Swagger, e o bundle não contém tipos da API (o TypeScript foi compilado e removido). A existência de outros campos, tipos, paginação real, códigos de status e mensagens de erro do servidor **não** é verificável aqui.
4. **Sem provação de regra de autorização:** o bundle mostra *o que* o cliente envia, não *quem* pode chamar cada endpoint. Não é possível afirmar quais rotas exigem papel admin/parceiro.
5. **SSE não observada:** `/exports/stream` é montada com o token na query string (`streamUrl()`), mas nenhum evento ao vivo foi capturado.
6. **Backend não analisado:** nada aqui diz como o servidor valida, persiste ou autoriza; apenas o contrato llamado pelo cliente.

## 9. Reprodução da análise

Scripts de extração usados (somente leitura, em `C:\Users\eduar\AppData\Local\Temp\kilo\ef-investigation\`):

| Script | Saída |
|---|---|
| `api-services.mjs` / `api-all-classes.mjs` | classes de serviço e chamadas HTTP (`api-services.json`, `api-all-classes.json`) |
| `api-paths.mjs` | literais de caminho candidatos (`api-paths.json`) |
| `endpoints.mjs` | tabela método+caminho+parâmetros (`endpoints-final.json`) |
| `chunk-map.mjs` / `chunk-table.mjs` | mapa de chunks e lacunas de cobertura (`chunk-map.json`) |
| `show-api-login.mjs` | resumo redigido das transações de rede (`api-login.json`) |
