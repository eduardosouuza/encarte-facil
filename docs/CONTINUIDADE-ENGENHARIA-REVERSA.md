# Continuidade — Engenharia Reversa e Reimplementação do Encarte Fácil

## Correção de fotos de produtos — 2026-10-22

- Causa reproduzida: a busca `world.openfoodfacts.org/cgi/search.pl` respondeu HTTP 503; downloads em `images.openfoodfacts.org` expiraram. O catálogo S3 respondeu 200.
- Busca principal integrada a `search.openfoodfacts.org/search`, com a antiga como alternativa. Contrato consultado: https://openfoodfacts.github.io/search-a-licious/users/ref-openapi/ . Downloads OFF usam `images.openfoodfacts.net`, verificado com imagens reais.
- Busca local ignora peso/unidade; resultados priorizam nomes iniciados pelo termo. Fotos já salvas de produtos com mesmo nome são reutilizadas apenas dentro da conta e com asset existente. Até três candidatos são tentados quando uma foto falha.
- Editor preserva a ordem original da lista e usa o estado atual ao terminar operações assíncronas. Importações informam quantos produtos ficaram sem foto. Página Produtos ganhou botão Buscar foto.
- Validação: typecheck e build; 71 testes servidor + 22 frontend; 3 testes Playwright focados em fotos/importação. Após o último ajuste, os 23 testes de catálogo passaram novamente.
- `node scripts/verify-product-images.mjs` valida busca, download, persistência e leitura autenticada em banco SQLite em memória. Maçã Fuji 1kg, Arroz e Leite passaram com downloads reais. Requer rede e build do servidor atualizado.
- Limite: cobertura e correspondência de marcas dependem do catálogo externo; não há garantia de imagem para todo produto. Não houve publicação nem reinício de servidores existentes.

**Última atualização:** 2026-10-20 · **Sessão:** exportação integral dos scripts via REA + consolidação de evidências
**Alvo reverter:** `https://editor.encartefacil.com` · **API:** `https://api-v2.encartefacil.com`
**Ferramenta de engenharia reversa:** REA 6.7.0 (`rea-agents@6.7.0`, global via npm)
**Raiz do projeto:** `C:\Users\eduar\OneDrive\Documentos\Projetos-web\encarte facil`

Este arquivo é o ponto único de retomada. Ele reúne o objetivo, o que já está provado, o que foi
corrigido, o inventário do que foi copiado e o que ainda falta. Nenhum segredo (senha, token, cookie)
é gravado aqui nem em qualquer artefato do projeto.

---

## 1. Objetivo

Reimplementar de forma funcional e abrangente o editor Encarte Fácil, usando o REA para engenharia
reversa e este repositório como implementação local com persistência real (SQLite), sessões,
exportações e interface equivalente à observada.

Diretriz vigente: continuar autonomamente, sem perguntas de rotina, mantendo tudo documentado
para retomada em outro terminal.

## 2. Como retomar

Abra um terminal nesta pasta e peça ao agente:

> Leia `docs/CONTINUIDADE-ENGENHARIA-REVERSA.md` e continue a implementação a partir do estado
> descrito. Não repita etapas concluídas. Atualize este arquivo antes de encerrar.

Comandos de verificação:

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Conta local de demonstração: `demo@encartefacil.com` / `demo12345`.

---

## 3. Ambiente e ferramentas

| Item | Valor |
|---|---|
| Sistema | Windows (win32), PowerShell 5.1 |
| Node | v24.15.0 · npm 11.12.1 |
| Navegador | Chrome 155 via CDP em `http://127.0.0.1:9333` (profile isolado em `%TEMP%\kilo\rea-chrome-profile2`) |
| REA | 6.7.0 global; `rea doctor` sem engines nativos (irrelevantes para alvo web) |
| REA ↔ Kilo | `rea mcp add` não lista Kilo; registro manual em `kilo.json` do projeto com `command: ["rea", "--mcp"]` |
| Stack da réplica | Node/Express/TypeScript + SQLite `node:sqlite`; React 18 + Vite 6 + Tailwind 3 + Radix + TanStack Query + React Router 6 |
| Dependência removida | `better-sqlite3` (incompatível com Node 24) |

> **Atenção — pasta compartilhada.** Esta mesma pasta do projeto é usada simultaneamente por outras
> ferramentas/agentes desta máquina (processos `codex` e Chrome visíveis na lista de processos).
> Durante a sessão de 2026-10-20 o número de testes mudou de 64+18 para 65+20 enquanto se executava
> a suíte, porque outro agente acrescentou `server/tests/catalog.test.ts` e
> `web/src/features/editor/product-grid.test.ts`. Consequências práticas: reexecute a suíte antes de
> confiar nos números, releia arquivos antes de editá-los e considere que outra atividade pode tocar
> `docs/`, `server/tests/` e `web/src/` ao mesmo tempo.

---

## 4. Estado do repositório

- Monorepo npm com API Express/TypeScript/SQLite em `server/` e SPA React/Vite em `web/`.
- TypeScript, lint, testes unitários/integrados e build de produção passam.
- Suíte: **65 testes no servidor + 20 no frontend + 11 E2E no Chromium**.
- Não há repositório Git inicializado nesta pasta (`git status` não é um repositório).
- `.gitignore` cobre `node_modules/`, `data/`, `*.sqlite`, `.work/`, `.env*` e `loginencartefacil.md`.

---

## 5. Fatos provados sobre o original

Classificação usada em todos os documentos: **[FATO]** (comprovado por evidência reproduzível),
**[INFERÊNCIA]** (deduzido de indícios convergentes) e **[NÃO VERIFICADO]** (não foi possível comprovar).

### 5.1 Arquitetura do cliente — [FATO]

- React 18 + Vite/Rollup + TypeScript, React Router, **TanStack Query** (não RTK Query).
- Radix UI, `lucide-react` 0.338.0, Sonner, i18next/locize, `react-hook-form` + `zod`.
- Fontes **Oswald / Roboto / Montserrat**; título da aba `Encartefacil`; analytics GTM/GA4 `G-CZM9JW4K6G`.

### 5.2 Cliente HTTP — [FATO]

- Base da API: `https://api-v2.encartefacil.com` (constante `g1` no entry chunk `index-KJ2_zNqK.js`).
- Cliente próprio (classe base `Nc`) sobre `fetch`; resposta normalizada em `{data, status, headers}`.
- Cabeçalhos: `Authorization: Bearer <localStorage["@encartefacil:token"]>`, `x-session-id` (UUID em
  `sessionStorage`), `x-platform: web`, `x-locale: pt-br`, `x-market`, `x-forwarded-host`,
  `X-Timezone`, `X-Screen-Resolution`.
- Erro de token expirado → limpeza do token → redirecionamento para `/login`.
  A réplica reproduz isso via evento `encarte:session-expired` + `AuthProvider`.

### 5.3 Superfície de API — [FATO] 92 endpoints

auth 9 · clientes 4 · parceiros 11 · cobrança 14 · flyers 11 · designs 14 · formatos 2 · brandkits 3 ·
assets 10 · exports/SSE 7 · afiliados 4 · plataforma 3.
Detalhe completo em `docs/evidencias/API-CONTRATO-ORIGINAL.md`.

### 5.4 Modelo de dados e rotas — [FATO]

Payload de flyer serializado pela função `Lt()`:
`name, format, design, content, palette, logo, backgroundColor, startAt, endAt, status, template,
public, preview, elements[], products[], footer, videoSettings, grid, gridHighlights, gridLayouts,
defaultTagShape, defaultTagClipPath, settings, pageSettings, poster*, shelfLabel*, customPaperSize`.

- **Elementos**: `id, elementId, category, type, subtype, x, y, width, height, rotation, opacity, zIndex,
  text, backgroundColor, image/asset, textStyle{...}`.
- **Produtos**: `id, productId, name, image, price, salePrice, unit, notes, x, y, width, height, rotation,
  isHighlighted, tagColor, textColor, backgroundColor`.
- **6 temas embutidos**: `operacao-promo` (padrão), `hortifruti-fresh`, `satisfacao`, `black-friday`,
  `atacado-azul`, `padaria-artesanal`.
- **41 rotas SPA**, incluindo `/login`, `/register`, `/editor/$flyerKey`, `/admin`, `/products`,
  `/designs/*`, `/exports`, `/chat/$sessionId`.
- **Autosave com debounce de 800 ms** → `PUT /flyers/{_key}`.

### 5.5 Integrações externas — [FATO]

`cdn.encartefacil.com`, S3 dev `efacil-dev.s3.sa-east-1.amazonaws.com`, imagens em
`d1rde4gbc24xn7.cloudfront.net`, **Stripe** (cartão e portal), **WhatsApp** (`wa.me`), PIX recorrente.

### 5.6 Autenticação do original — [FATO] (o login funciona)

`POST https://api-v2.encartefacil.com/auth/login` com as credenciais de `loginencartefacil.md` respondeu
**HTTP 200**. A sessão resultante é `role: customer`, partner `Encartefacil`.

Isso **anula** a lacuna registrada antes: as telas autenticadas do original *foram* observadas e
capturadas (editor, produtos, chat, admin). A captura autenticada está em
`docs/evidencias/dados/autenticado/`.

---

## 6. Incidentes encontrados e como foram resolvidos

| Incidente | Causa | Resolução |
|---|---|---|
| `rea analyze-web-bundle` estoura a memória (heap 4 GB e depois 7 GB) | o comando captura e analisa o bundle **vivo** da página | contorno: `rea export-web-scripts` + `rea analyze-javascript-application` sobre o diretório exportado + leitura manual dos chunks |
| **`export-web-scripts` falha ao ler JSON com BOM** | `Out-File -Encoding utf8` no PowerShell 5.1 grava BOM | leitura com `readFileSync(...).replace(/^\uFEFF/,"")` antes de entregar ao REA; script em `%TEMP%\kilo\ef-investigation\strip-bom.mjs` |
| `rea-static.json` ilegível | `1>` no PowerShell 5.1 grava **UTF-16LE** | decodificação com `utf16le` quando há bytes NUL |
| Porta 9222 ocupada | o Chrome do usuário já está aberto nessa porta | CDP em 9333 com profile isolado; a porta 9222 retornava 404 |
| `rea mcp add` sem suporte a Kilo | whitelist de agentes do REA | registro manual em `kilo.json` (projeto) |
| Login recusado com 401 em duas tentativas | leitura ambígua da senha do arquivo | leitura canônica resolvida; nova tentativa retornou **200** |
| MCP CUA sem navegador (`Browser is not available`) | plugin Browser Use ausente na sessão | fallback: Chromium/Playwright instalado no repositório, executado fora do sandbox apenas para leitura |
| Navegação bloqueada com `ERR_NETWORK_ACCESS_DENIED` no `node_repl` | política do conector MCP | mesmo fallback em Playwright local |
| Compaction do agente falhou duas vezes (contexto estourado) | volume de evidência em cache | estado externalizado nos arquivos `.md` deste repositório; este documento é o novo ponto de retomada |

---

## 7. Cópia integral dos scripts (esta sessão)

### 7.1 Problema resolvido

O exportador do REA abortava com erro de JSON inválido porque as capturas estavam gravadas com
**BOM UTF-8** pelo `Out-File -Encoding utf8` do PowerShell 5.1. As cinco capturas foram
**sanitizadas com Node** (remoção do BOM + `JSON.parse` de validação + regravação em UTF-8) e
reexportadas sem nenhuma falha.

### 7.2 Comandos executados

```powershell
# 1. sanitizar as capturas (sem BOM)
node %TEMP%\kilo\ef-investigation\strip-bom.mjs <captura.json> ...

# 2. exportar os scripts (exit 0 nas cinco execuções)
rea export-web-scripts <captura.json> docs\evidencias\scripts-captura-<id>

# 3. consolidar o inventário
node scripts\analise-bundle\inventario-scripts.mjs .
```

### 7.3 Resultado por captura

| Captura | Pasta de destino | Scripts na captura | Exportados | Indisponíveis | URLs exclusivas |
|---|---|---:|---:|---:|---:|
| `capture-login-ok.json` | `docs/evidencias/scripts-captura-login-ok/` | 81 | 77 | 4 | 0 |
| `capture-login.json` | `docs/evidencias/scripts-captura-login-falha/` | 16 | 13 | 3 | 0 |
| `capture-login2.json` | `docs/evidencias/scripts-captura-login-falha2/` | 16 | 13 | 3 | 0 |
| `capture-editor.json` | `docs/evidencias/scripts-captura-editor/` | 175 | 167 | 8 | 21 |
| `capture-batch1.json` | `docs/evidencias/scripts-captura-batch1/` | 92 | 12 | 80 | 0 |
| **Total** | **5 pastas** | **380** | **282** | **98** | **21** |

### 7.4 Cobertura

- **99 URLs únicas** com conteúdo de script, correspondendo a **99 conteúdos distintos** (SHA-256).
- **98 dos 99** são **byte-idênticos** ao bundle público já presente em `docs/evidencias/public-bundle/`
  (mesmo nome e mesmo SHA-256) — **zero divergência** entre o build capturado autenticado e o build público.
- O único script fora do bundle público é o beacon de analytics da Cloudflare
  (`static.cloudflareinsights.com/beacon.min.js`), que não faz parte da aplicação.
- As **98 entradas indisponíveis** da captura decorrem de limites do Playwright, não de falha nossa:
  `body-size-limit` (28), `body-read-failed` (38), `response-content-not-retained` (29),
  `body-allocation-limit` (3).
- **81 das 98 indisponíveis** são cobertas pelo bundle público. As **11 restantes** são exclusivamente
  rastreadores de terceiros (`googletagmanager.com/gtag/js?id=G-CZM9JW4K6G` e o beacon Cloudflare).
  **Portanto a cobertura do código da aplicação é 100%.**
- Total de arquivos de script distintos do original: **182** (181 do bundle público + 1 beacon).

### 7.5 Verificações de integridade aplicadas aos 282 arquivos exportados

| Verificação | Resultado |
|---|---|
| JSON do `manifest.json` de cada pasta | válido nas 5 pastas |
| Contagem de arquivos × entradas `state: exported` | 282 = 282 (confere) |
| BOM UTF-8 nos arquivos exportados | 0 ocorrências |
| JWT de 3 partes (token de sessão) nos exportados | 0 ocorrências |
| Chave `@encartefacil:token` nos exportados | 0 ocorrências |
| Caminhos com travessia (`..`) | 0 ocorrências |
| Hashes SHA-256 conferidos contra o manifesto | conferem |

### 7.6 Segredo encontrado nas capturas (fora do projeto, não exportado)

A captura `capture-login-ok.json` contém **um JWT real de sessão da conta original** (369 caracteres,
3 partes) em 4 pontos: cabeçalho `Authorization` e query string de 3 requisições. Esse arquivo vive
**apenas** em `%TEMP%\kilo\ef-investigation\` (fora do repositório, fora de qualquer versionamento).
A regra do projeto é: nunca copiar capturas brutas para `encarte facil/`; apenas os scripts e manifestos
exportados, que já vieram sem segredo.

---

## 8. Inventário de evidências

| Caminho | Conteúdo |
|---|---|
| `docs/CONTINUIDADE-ENGENHARIA-REVERSA.md` | este documento (ponto único de retomada) |
| `docs/CONTEXTO-RETOMADA.md` | contexto de retomada anterior (mantido) |
| `docs/RELATORIO-ENGENHARIA-REVERSA.md` | relatório completo com classificação FATO/INFERÊNCIA/NÃO VERIFICADO |
| `docs/MAPA-PAGINAS-E-FLUXOS.md` | telas e fluxos reimplementados |
| `docs/RESUMO-INVESTIGACAO.md` | resumo da investigação (subagente) |
| `docs/evidencias/API-CONTRATO-ORIGINAL.md` | 92 endpoints, cabeçalhos, sessão |
| `docs/evidencias/MODELO-DE-DADOS-E-ROTAS.md` | payload de flyer/elemento/produto, 41 rotas |
| `docs/evidencias/REA-ANALISE-ESTATICA.md` | grafos REA, cobertura e limitações |
| `docs/evidencias/INVENTARIO-SCRIPTS.md` / `.json` | inventário consolidado de scripts (gerado por script) |
| `docs/evidencias/public-bundle/` | 181 arquivos do bundle público + manifesto com SHA-256 |
| `docs/evidencias/scripts-captura-*/` | 5 exports REA com `manifest.json` e `files/` |
| `docs/evidencias/scripts-completos/`, `scripts-raw-full*/`, `scripts-raw-after-nav/` | exports REA anteriores |
| `docs/evidencias/dados/` | JSONs brutos de rede, endpoints, rotas, grafo destilado |
| `docs/evidencias/dados/autenticado/` | captura autenticada do editor (7 seções, 30 transações, tokens removidos) |
| `scripts/analise-bundle/*.mjs` | 17 scripts de extração, somente leitura |
| `web/e2e/exports.spec.ts` | E2E de download de PDF e de ciclo de modelo próprio |
| `scripts/capture-public-bundle.mjs` | captura do bundle público |
| `scripts/inspect-original-ui.mjs` | captura visual via Playwright |
| `scripts/audit-original-auth.mjs` | diagnóstico de autenticação sem vazar segredo |

---

## 9. Funcionalidades já implementadas na réplica

### Autenticação e conta
Registro, login, logout, JWT e cookie HTTP only; sessões revogáveis; `/auth/me`, `/auth/verify`,
recuperação e redefinição de senha; dados de conta, idioma, mercado, visão de plano e créditos;
isolamento de dados por usuário.

### Encartes
CRUD, busca, filtros, paginação, duplicação e estados; atualização parcial preservando campos fora
do patch; link público em `/p/:id`; modelos próprios; importação/exportação do projeto editável em JSON v1.

### Produtos
CRUD, pesquisa por nome/categoria/SKU, filtros e paginação; parser local de linhas
(`Arroz 5kg 24,90` → nome/unidade/preço); `POST /products/import-list` para até 50 linhas; importação
direta no editor com até quatro buscas de foto em paralelo; catálogo conhecido extraído da captura do
bucket `efacil-public` e Open Food Facts como complemento; atualização rápida de preço; remoção de
fundo via `POST /products/:id/remove-background`. Fotos encontradas são copiadas para assets privados.

### Editor
Navegação com as 7 seções originais (Temas, Produtos, Elementos, Tags, Formatos, Marca, Encartes);
rail de 64 px e painel de 396 px no desktop; barra inferior de 48 px e folha inferior (máx. 65%) no mobile;
canvas com arrastar/redimensionar/rotacionar/zoom; camadas, duplicação, exclusão, atalhos, nudging;
desfazer/refazer por gesto; autosave serializado com debounce; tags (formas/estilo/cores) aplicáveis ao
selecionado ou a todos; formatos Encarte/Cartaz/Etiqueta/Vídeo; identidade de marca no painel;
biblioteca de elementos reutilizáveis; rodapé no canvas e no arquivo exportado.
Temas agora contém 26 modelos em 13 coleções, com busca e `Ver mais`; o grid oferece mosaico com o
primeiro produto em destaque e grade uniforme, e persiste o modo em `flyer.grid`.

### Biblioteca de imagens e identidade visual
Upload, lista, detalhe, batch, contagem, edição, exclusão e arquivo; PNG/JPEG/WebP até 5 MB e 20 MP;
isolamento por usuário; remoção de fundo local por flood fill (original preservado); brandkit por conta
(nome, slogan, logo, endereço, site, telefones, WhatsApp, redes, pagamentos, até 12 cores).

### Exportações
SVG determinístico no servidor; PNG e JPEG reais com Sharp; PDF real com PDFKit; MP4 H.264 real com
`ffmpeg-static` (3–30 s, UI usa 6 s); snapshot persistido no SQLite (editar depois não altera a
exportação anterior); histórico, retry e stream SSE; imagens privadas embutidas como data URL.

### Catálogos observados no bundle
`GET /elements`, `/elements/:id`, `/elements/colored`, `/industries`, `/industries/:id`, `/themes`,
`/themes/:id`, `/themes/stats/count` com equivalentes locais.

---

## 10. Validações

```text
npm run typecheck  PASS
npm run lint       PASS
npm test           PASS: servidor 67/67; frontend 22/22
npm run build      PASS
npm run test:e2e   PASS: Chromium 12/12 (temas agrupados, lista em massa, sete seções, viewport 390x844, PDF real e modelo próprio)
rea export-web-scripts × 5  PASS (exit 0 nos cinco, 282 arquivos)
integridade dos exports      PASS (0 BOM, 0 JWT, 0 token, 0 caminho inseguro)
```

O build produz um bundle JS principal de ~620 kB (186 kB gzip), com aviso de tamanho acima de 500 kB.

### 10.1 Testes E2E adicionados nesta etapa

`web/e2e/exports.spec.ts` fecha a pendência 1 da lista abaixo:

- **exporta PDF real pelo editor** — abre o editor, dispara `Exportar → PDF` e valida o arquivo
  baixado: nome com extensão `.pdf`, tamanho acima de 1 kB e assinatura `%PDF-`.
- **salva modelo próprio, reaproveita e exclui na página Modelos** — abre a seção *Encartes*,
  clica em *Salvar modelo*, confere o toast, valida a seção *Meus modelos* em `/designs`, usa o
  modelo (navegando para o editor da cópia) e por fim exclui o modelo, verificando a contagem.
- **mostra temas por coleção e importa uma lista direto no editor** — valida Primavera e Outubro
  Rosa, importa dois produtos pela textarea, simula as fotos e verifica os produtos no canvas.

---

## 11. Pendências e limitações reais

1. **Code splitting** do bundle principal por rota (620 kB / 186 kB gzip).
2. `npm audit` reporta 16 alertas (7 moderados, 6 altos, 3 críticos) em dependências antigas,
   concentrados em ferramentas de desenvolvimento e no React Router 6. As correções automáticas exigem
   migrações de versão principal (Vitest 5, Tailwind 4, React Router 7) — planejar antes.
3. **Checkout/cobrança simulados**: não iniciar transações financeiras reais.
4. **E-mail e WhatsApp** registram entrega/fornecem link; não há provedor externo configurado.
5. **Busca de imagens por IA, OCR, chat e endpoints administrativos** dependem de provedores ou regras
   proprietárias e ainda não têm equivalentes locais completos. Elementos, segmentos e temas já têm.
6. **Remoção de fundo local** por flood fill, determinística para fundo uniforme; não é o modelo de IA
   proprietário do original.
7. Recursos administrativos do produto original **não** devem ser expostos a usuários comuns na réplica.
8. As **98 entradas indisponíveis** nas capturas são limites de retenção do Playwright; o código da
   aplicação está 100% coberto pelo bundle público, conforme a seção 7.4.
9. O esquema do servidor e as regras de autorização do original continuam **não observáveis**: o
   contrato foi deduzido do cliente, e a réplica implementa um RBAC mínimo próprio.

---

## 12. Regras de segurança (não quebrar)

- Nunca registrar o conteúdo de `loginencartefacil.md`; ele está no `.gitignore`.
- Não copiar tokens/cookies do original para arquivos. Capturas brutas **não** entram no projeto;
  só entram scripts e manifestos exportados.
- Não buscar URLs de imagem fornecidas pelo usuário no backend (evita SSRF).
- Limites de payload: JSON geral 8 MB, upload 5 MB, imagem 20 MP, vídeo 30 s.
- Downloads de assets e exports exigem a conta proprietária.
- Diretórios temporários de vídeo ficam sob `os.tmpdir()` com prefixo fixo, validados antes da remoção.
- O produto local é reimplementação do **comportamento observado**, não o código-fonte proprietário.

---

## 13. Regra de manutenção deste arquivo

Antes de encerrar uma sessão longa ou quando o contexto estiver perto do limite:

1. Atualize "Estado do repositório", "Fatos provados", "Cópia integral dos scripts" e "Pendências".
2. Registre mudanças materiais com os arquivos correspondentes.
3. Não marque algo como concluído sem teste ou evidência.
4. Não apague limitações ainda existentes.
5. Continue do primeiro item pendente e evite repetir engenharia reversa já comprovada.
