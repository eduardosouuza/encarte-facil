# Modelo de dados, rotas e módulos — Encarte Fácil (cliente original)

**Fonte:** mesmos 79 chunks JavaScript exportados do bundle de produção de `https://editor.encartefacil.com`
(veja `docs/evidencias/API-CONTRATO-ORIGINAL.md` para o contrato de rede).
**Método:** leitura estática do bundle minificado; os campos abaixo são os que o **cliente grava, envia ou lê**, extraídos das funções de serialização do editor.
**Data da análise:** 2026-10-20

> Todos os campos listados foram lidos literalmente no código do cliente. Nenhum schema de servidor foi inferido: o backend só devolve os campos que aqui aparecem, e possivelmente outros.

---

## 1. Entidade principal: Flyer (encarte)

Serialização exata usada no `PUT /flyers/{id}` (função `Lt()` em `index-BLLrK9Mc.js`):

| Campo | Tipo observado | Observação |
|---|---|---|
| `name` | string | nome do encarte |
| `format` | string (`_key` do formato) | o cliente normaliza `format` (string ou objeto com `_key`) para `_key` |
| `design` | string (`_key` do design) | modelo/visual aplicado |
| `content` | string | `"flyer"` (há também `"poster"` e `"shelf_label"`) |
| `palette` | array | cores derivadas do tema |
| `logo` | objeto/`_key` | logo do parceiro |
| `backgroundColor` | string (hex) | |
| `startAt` / `endAt` | string (data) | janela de validade (dd/mm/aaaa no cliente) |
| `status` | string | `"draft"`, `"approved"`, `"published"`… |
| `template` | boolean/number | flag de template |
| `public` / `preview` | boolean | |
| `elements` | array de Element | ver 1.1 |
| `products` | array de Product | ver 1.2 |
| `footer` | objeto | `{ elements: string[], visible: boolean }` |
| `videoSettings` | objeto | usado no render de vídeo |
| `grid` | objeto | grade de layout (ex.: `"4x3"`) |
| `gridHighlights` | objeto | destaques por página |
| `gridLayouts` | array | layout por página |
| `defaultTagShape` | string | forma padrão da etiqueta de preço |
| `defaultTagClipPath` | string | `clip-path` padrão |
| `settings` | objeto | ver 1.3 |
| `pageSettings` | objeto | ver 1.3 |
| `posterTemplate` | objeto | template do conteúdo "poster" |
| `posterColorOverrides` | objeto | cores sobrescritas do pôster |
| `posterShowImage` | boolean | |
| `shelfLabelTemplate` | objeto | template do conteúdo "shelf_label" |
| `shelfLabelColorOverrides` | objeto | |
| `shelfLabelRows` | number | linhas da etiqueta de prateleira |
| `shelfLabelSize` | string/number | |
| `customPaperSize` | `{width, height}` ou `null` | papel personalizado |

Identificador do recurso: `_key` (ex.: `"B0n2ULZOeYjROsaXCQlse"`), com `_id`/`_rev` no formato CouchDB (`partners/<key>`), observados na resposta real de `/partners/current`.

### 1.1 Element

| Campo | Observação |
|---|---|
| `id` | id local do elemento |
| `x`, `y`, `width`, `height` | posição/tamanho em px no canvas |
| `rotation`, `scaleX`, `scaleY`, `skewX`, `skewY` | transformações |
| `offsetX`, `offsetY` | deslocamentos |
| `burRadius` | raio de desfoque ("blur") |
| `cropX`, `cropY`, `cropWidth`, `cropHeight`, `cropPos` | recorte da imagem |
| `zIndex` | ordem de empilhamento |
| `opacity` | |
| `category` | ex.: `logo`, `background`, `decorative`, `3d`, `photos`, `tag` |
| `type`, `subtype` | classificação do elemento |
| `asset` | `_key` do asset ou string de URL (resolvido por `hi()`) |
| `elementId` | id do elemento no catálogo |
| `palette` | paleta aplicada ao elemento |
| `logoBackground` | |
| `text`, `textStyle` | conteúdo textual e estilo |

### 1.2 Product (produto no encarte)

| Campo | Observação |
|---|---|
| `id`, `name`, `image` | identificação e imagem |
| `price`, `salePrice`, `strikePrice`, `showDiscount` | preços (`priceType` distingue "preço" de "preço promocional") |
| `priceTitle`, `saleTitle`, `unit`, `notes` | rótulos e observações |
| `tagShape`, `tagClipPath`, `tagColor`, `textColor`, `backgroundColor` | estilo da etiqueta |
| `x`, `y`, `width`, `height`, `rotation`, `scaleX` | posição/tamanho no grid |
| `isHighlighted` | marca o produto como destaque |
| `productId`, `assetId` | vínculos com o catálogo de produtos e o asset |
| `imageTransform`, `nameTransform`, `tagTransform` | transformações de imagem/nome/etiqueta |
| `nameFontScale`, `nameWidthScale` | escala de fonte e largura do nome |

Ao salvar, se `image` estiver preenchida, os campos `assetId`, `imageUrls`, `assetUrls`, `asset` e `assetData` são removidos (imagem embutida tem precedência).

### 1.3 Settings, pageSettings e tipografia

- `settings` agrega `colors` (cores do documento), com paletas geradas por regras de contraste/analogia: cada tema define ajustes `{background:{analogue, lightness}, product:{...}, footer:{...}, tag:{...}}`.
- `pageSettings` são as configurações por página do documento.
- Tipografia padrão (`Mj`): `{useGlobalFont:true, global:{family:"Oswald",weight:700}, productName:{...}, price:{family:"Anton",weight:400}, footer:{...}, description:{...}}`; cada estilo resolve para `{fontFamily, fontWeight, fontStyle, textDecoration}`.
- Formas de etiqueta (`Sk`): `rounded`, `circle`, `square`, `rectangle`, `pill`, `oval`, `rounded-square`, `slim`, `hexagon`, … com `clipPath` e `aspectRatio`; categorias: `basicos`, `poligonos`, `selos`, `fitas`.
- Grid de produtos por página: layouts gerados como `"<col>x<lin>-highlight-left"`, com `maxProducts` configurável.

### 1.4 Temas visuais embutidos (6)

| `id` | Nome |
|---|---|
| `operacao-promo` | Operação Promo (padrão) |
| `hortifruti-fresh` | Hortifruti Fresh |
| `satisfacao` | Satisfação |
| `black-friday` | Black Friday |
| `atacado-azul` | Atacado Azul |
| `padaria-artesanal` | Padaria Artesanal |

Cada tema define `segments` (segmentos de mercado), `occasions` (ocasiões), `tokens` (`base`, `baseSolid`, `accent`, `contrast`, `surface`, `onSurface`, `texture`), `fonts` (`{display:"Roboto Flex", body:"Roboto Condensed"}`), `shape` (`radius`, `priceVariant`, `hardShadow`, `textShadow`) e `layout` (`padding`, `gap`, `headerHeightRatio`, `highlights`).

## 2. Demais entidades

### 2.1 Formato (`GET /formats`)

Campos lidos: `_key`, `code`, `title`, `uses[]` (recursos suportados), `assetUrls{high, medium, low}` (imagem de capa), `premium` (boolean), `customPaperSize{width,height}`.
Códigos de formato reconhecidos pelo seletor: `tv`, `story`, `vertical`, `square`, `a4_horizontal`, `a4_vertical`, `a3_vertical`, `header`.

### 2.2 Design (modelo)

Campos lidos: `_key`, `elements[]` (mesmo formato de elemento), `category` (ex.: `"header"`), `status` (ex.: `"approved"`), `archived`, `title`/`name` traduzidos por locale. Fluxo de criação: `GET /designs?category=header&status=approved&archived=false&limit=1&locale=…` → `GET /designs/by-theme?locale=…` → `GET /designs/{_key}?locale=…`.

### 2.3 Parceiro (`GET /partners/current`, resposta real observada)

`{ _key, _id: "partners/<key>", _rev, name, active, type, email, feePercent, referralRewardCredits, stripeAccount, defaultCountryCode, products:[{ id, name, description, prices:[{ credits, amount }] }], config:{ product:{name,description,logo}, app:{name,description} } }`

### 2.4 Cliente / usuário

- `GET /auth/me` → `{ ...user, betas }` (o cliente mescla `data.user` com `data.betas`).
- `GET /customers/me` → `customer`; `PUT /customers/me` recebe o objeto do cliente.

### 2.5 Asset (imagem)

`{ _key, bucket, files: { high, medium, low, original } }` — a URL é derivada por `getUriFromAsset()`: `https://cdn.encartefacil.com/<files[size]>` (ou `https://efacil-dev.s3.sa-east-1.amazonaws.com/<arquivo>` quando `bucket` contém `"dev"`).

### 2.6 Export (geração de vídeo/arquivo)

`{ id, kind, format, flyerId, flyerName, status, progress, files[], createdAt }`; status observados no cliente: `queued`, `processing` (mais `optimistic-*` para itens criados localmente). O cliente também mantém `deliveries` (`GET /deliveries/{id}` → `delivery`).

### 2.7 BrandKit, Assinatura, Preços, Afiliados

- BrandKit: `data.brandKit` (`GET/PUT /brandkits/...`).
- Assinatura: `data` de `GET /subscriptions/me`; preços em `GET /prices`; checkout com `{priceId, clientMeta}`.
- Afiliados: `stats`, `referrals` e `claim-reward` com `{milestoneTarget}`.

## 3. Estado do cliente (store de átomos)

Store global do editor (`K0({...})` em `index-KJ2_zNqK.js`):

| Namespace | Campos |
|---|---|
| `sidebar` | `isOpen`, `activePanel` (padrão `"headers"`), `isHidden` |
| `layout` | `isMobile`, `toolbarCompact`, `sidebarWidth` (460), `navbarHeight` (48), `toolbarHeight` (48) |
| `selection` | `elementId`, `productId`, `productPart`, `type` |
| `canvas` | `zoom` (1), `panX`, `panY`, `focusedPage` |
| `flyer` | `format`, `content` (`"flyer"`), `posterTemplate`, `shelfLabelTemplate`, `shelfLabelRows` |
| raiz | `productEdit`, `isLoading`, `isSaving` |

Undo/redo do encarte: pilha em memória com `push`/`undo`/`redo`/`clear` e *deep clone* via `JSON.parse(JSON.stringify(...))`.

## 4. Rotas do cliente (SPA) registradas no entry chunk

41 rotas declaradas com `path` + `component` em `index-KJ2_zNqK.js`:

| Rota | Rota | Rota |
|---|---|---|
| `/login` | `/register` | `/esqueci-senha` |
| `/redefinir-senha` | `/pagar/$token` | `/editor/$flyerKey` |
| `/admin` | `/customers` | `/subscribers` |
| `/cortesias` | `/cobrancas` | `/checkouts` |
| `/campanhas` | `/headers` | `/products` |
| `/themes` | `/designs` | `/designs/new` |
| `/designs/$designId/edit` | `/partners` | `/formats` |
| `/prices` | `/elements` | `/industries` |
| `/promotions` | `/dashboard` | `/logs` |
| `/logs/list` | `/online-users` | `/affiliates` |
| `/events` | `/seo` | `/emails` |
| `/inbox` | `/blog` | `/blog/new` |
| `/blog/$id/edit` | `/affiliates` (2º registro) | `/exports` |
| `/chat` | `/chat/$sessionId` | |

Rotas adicionais (/flyers, /flyers/{id}, /checkout, /pagar, /templates…) são registradas **dentro dos chunks lazy não exportados** — não foram observadas.

## 5. Mapa de módulos (chunks exportados: 79 arquivos / ~1,24 MB)

| Grupo | Arquivos | Papel |
|---|---|---|
| Entrypoint | `index-KJ2_zNqK.js` (868 KB) | runtime React + React Router, cliente HTTP, serviços de auth/parceiros/billing/clientes/flyers, tracking, store de átomos, catálogo de temas, **todas as 41 rotas** |
| Feature do editor | `index-BLLrK9Mc.js` (204 KB) | canvas, grid, seleção, onboarding, serialização do flyer (`Lt()`), autosave |
| Página/feature | `index-VDyxRd0o.js` (57 KB), `index-BMGestSM.js` (19 KB, **formulário de cadastro**), `index-Dz0tekWN.js` (12,7 KB), `use-mobile-layout-B9xEXdHq.js` (22,9 KB) | telas e layout |
| Camada de dados | `useBaseQuery-DNtSj8JH.js`, `useQuery-D12Y0UPZ.js`, `useMutation-BPirSAry.js`, `use-simple-query-BIlIpFhF.js`, `use-infinite-list-CMBvctj2.js`, `query-keys-DamezY8H.js`, `query-constants-hqx0foTB.js`, `query-states-BBlai7xS.js` | TanStack Query + chaves de cache (`elements`, `products`, `flyers`, `formats`, `designsByTheme`, `designsGrid`, `myDesigns`, `customerDesignNames`, `brandkit`, `tags`) e `staleTime` (`formats` 10 min, `designs`/`brandkit`/default 5 min) |
| Serviços de API | `service-DQzaU991.js` (designs), `service-CmufRMLl.js` (formatos), `service-cCDUhbQQ.js` (brandkits), `service-Dc47qpQA.js` (assets), `service-Chphq-AR.js` (afiliados), `use-exports-stream-D1YJPQTk.js` (exports/SSE) | 6 classes singleton, padrão `getInstance()` |
| UI compartilhada | `shared-selection-controls`, `color-picker`, `slider`, `popover`, `progress`, `switch`, `tag-effects`, `price-types`, `currency`, `card`, `query-states` | componentes Radix/React |
| Ícones | 45 arquivos `*-<hash>.js` (lucide-react 0.338.0) | um por ícone |
| Domínio local | `initial-flyer-Cc6BwAmp.js`, `formats-list-RieW1rzz.js`, `entities-*.js`, `logo-Dr-8dK1w.js`, `palette-CyO5CJ0c.js`, `register-tracking-WT6OGiwx.js` | criação de encarte a partir de design, catálogo de formatos, tracking |

## 6. Fluxos reconstruídos a partir do código

1. **Login** → `AuthService.login(email, password)` → `POST /auth/login` → token em `@encartefacil:token` → redirecionamento para o app.
2. **Detecção de mercado** → `GET /public/market?locale=…` na entrada; o resultado (`prompt.guess.market/locale`) alimenta `localStorage["market"]`/`["locale"]` → cabeçalhos `x-market`/`x-locale`.
3. **Criação de encarte** → `GET /formats?code=…` + `GET /designs/by-theme` + `GET /designs/{key}` → monta `{name, content:"flyer", status:"draft", format, design, palette:[], elements, products:[]}` → `POST /flyers`.
4. **Edição e autosave** → alteração no store → debounce de 800 ms (`ci=300`, `di=800`) → `PUT /flyers/{_key}` com o payload da seção 1 → `isSaving` controlado.
5. **Render** → `POST /flyers/{id}/render?format=jpeg` → `{png, jpeg, pdf}`; render de vídeo → `POST /flyers/{id}/render-video` → `{mp4}`; fila assíncrona → `POST /exports` + `GET /exports/stream` (SSE) + `GET /deliveries/{id}`.
6. **Envio** → `POST /flyers/{id}/whatsapp` (`{phone, remember}`) e `POST /flyers/{id}/email` (`{email}`).
7. **Assinatura** → `GET /prices` → `POST /billing/checkout` (`{priceId, clientMeta}`) → cartão via `POST /billing/card/stripe/session` + `.../confirm` → `POST /stripe/portal` para gerenciar.
8. **Admin** → `POST /admin/impersonation/{id}` (com `reason`) preservando o token original em `@encartefacil:admin-token`; `GET /admin/affiliates`.

## 7. O que NÃO foi provado

1. **Chunks ausentes (43 de 47 referenciados):** as telas de produtos, elementos, tags, chat, blog, admin, logs, usuários online, inbox, checkouts e a página de flyers **não foram carregadas** na captura; seus endpoints, modelos e rotas são desconhecidos.
2. **Nenhuma execução autenticada:** o login retornou 401; os fluxos 3–8 acima são **reconstruídos a partir do código**, não observados em execução.
3. **Schema parcial:** só os campos lidos/enviados pelo cliente estão documentados; o servidor pode aceitar e devolver mais.
4. **Sem validação de servidor:** as regras de validação de preço, produto, telefone e código de confirmação são do lado do cliente; a validação real do backend não é observável aqui.
5. **Relação entre `category` de design e `elements`:** o mapeamento exato de "elementos de catálogo" para o encarte final depende de `entityId`/`elementId` e do arquivo de traduções por locale, parcialmente não capturado.
6. **Persistência do autosave:** intervalo de debounce e payload estão no código, mas o intervalo real de rede depende do backend e do comportamento do navegador.
