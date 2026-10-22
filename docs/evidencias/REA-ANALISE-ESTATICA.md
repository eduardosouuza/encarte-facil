# Análise estática do bundle — Encarte Fácil (REA 6.7.0)

**Proveniência:** este documento foi produzido por uma **re-execução limitada da destilação** do JSON já gerado pelo REA (`rea-static.json`, 235 MB, UTF-16LE), feita para não deixar a entrega de evidência em branco. Todos os números abaixo vêm literalmente do arquivo de saída do REA; a interpretação está nas tabelas.

## 1. Ferramenta, comando e identificadores

| Item | Valor |
|---|---|
| Ferramenta | REA 6.7.0 — `analyze-javascript-application` (provedor `rea-javascript-application`, versão 1) |
| Comando | `rea analyze-javascript-application --json` |
| Entrada | diretório `C:\Users\eduar\AppData\Local\Temp\kilo\ef-investigation\exported-scripts` (`format: "directory"`) |
| `graph_id` | `jag_bcc6189e9f8b689420104abcc3c5530e6a3a23dab5d130f68185e77e850ac7bf` |
| `semantic_graph.graph_id` | `jsrg_056006435218352d8a2ceb4e246e9d1395f8bff1b0024afc56729828555e69af` |
| `root_artifact_sha256` | `1c3215ab5ab0f30784b0b94416330874dc379bdd5d82672f3b7f36d981786293` |
| `inventory_manifest_id` | `agm_af1d020f78d8671c04ece423af582f557c789aa4f4ab05392ae489657af35436` |
| `inventory_graph_sha256` | `49db8f994d34917abdf7247374de272926357ed48250eef63184cb9bb603491b` |
| `integrity_contradictions` | `[]` (vazio) |

Dimensões dos grafos:

| Grafo | Nós | Arestas/ Relações | Outros |
|---|---|---|---|
| `graph` (`JavaScriptApplicationGraph`) | 453 | 1.329 arestas | — |
| `semantic_graph` | 52.687 | 63.524 relações | 1.750 contextos de evidência, 1.387 fingerprints, 18.574 unknowns |

## 2. Inventário de módulos (79 chunks / 1.303.981 bytes ≈ 1,27 MB)

| Grupo (prefixo do arquivo) | Nº | Bytes | Arquivos |
|---|---|---|---|
| Entrypoint e chunks `index-*` | 7 | 1.161.916 | `index-KJ2_zNqK.js` (868 KB, entrypoint: React, Router, cliente HTTP, 6 serviços, tracking, store), `index-BLLrK9Mc.js` (204 KB, editor/canvas), `index-VDyxRd0o.js` (57 KB), `index-BMGestSM.js` (19 KB, cadastro), `index-Dz0tekWN.js` (12,7 KB), `index-CEpZmkWp.js`, `index-vqte5ySJ.js` |
| Serviços de API `service-*` | 5 | 12.104 | `service-DQzaU991.js` (designs), `service-CmufRMLl.js` (formatos), `service-cCDUhbQQ.js` (brandkits), `service-Dc47qpQA.js` (assets), `service-Chphq-AR.js` (afiliados) |
| Hooks e camada de dados (`use*`, `query-*`) | 11 | 47.681 | `use-exports-stream-D1YJPQTk.js` (exports/SSE), `useBaseQuery-DNtSj8JH.js`, `useQuery-D12Y0UPZ.js`, `useMutation-BPirSAry.js`, `use-infinite-list-CMBvctj2.js`, `use-simple-query-BIlIpFhF.js`, `use-mobile-layout-B9xEXdHq.js`, `query-keys`, `query-constants`, `query-states`, `users-CBE3qzDq.js` |
| Componentes de UI compartilhada | 12 | 61.131 | `shared-selection-controls`, `color-picker`, `slider`, `popover`, `progress`, `switch`, `card`, `currency`, `price-types`, `tag-effects`, `formats-list`, `infinite-scroll` |
| Domínio local do cliente | 8 | 4.486 | `initial-flyer-Cc6BwAmp.js`, `entities-*.js` (3), `logo`, `palette`, `register-tracking`, `password` |
| Ícones lucide-react (1 arquivo por ícone) | 34 | 15.274 | `alert-*`, `arrow-left`, `ban`, `calendar-days`, `check-circle-2`, `chevron-down`, `clock`, `copy`, `download`, `eye`/`eye-off`, `file-text`, `globe`, `image`, `map-pin`, `maximize-2`, `minus`, `monitor`, `package`, `pencil`, `phone`, `plus`, `rotate-ccw`, `search`, `send`, `share-2`, `shield`, `shopping-cart`, `smartphone`, `sparkles`, `sun`, `trash-2`, `users`, `zoom-in`, … |
| Não classificados | 2 | 1.389 | `settings-DWdAwwLJ.js`, `tag-B-yBwrYx.js` (lucide) |
| **Total** | **79** | **1.303.981** | — |

Contagem por tipo de nó do grafo do REA: `javascript-asset` 79, `javascript-module` 324, `endpoint` 39, `storage` 8, `artifact` 2, `unknown` 1.

**Cobertura do inventário:** os 79 chunks capturados **não cobrem a aplicação inteira**. O bundle referencia 47 chunks por `import()`/`from`; **43 deles não foram exportados** (o navegador só carregou o grafo da tela de login): `flyers-B4rLVYUf.js`, `admin-route-IOWFK9U3.js`, `chat-page-sXQLYrOf.js`, `checkout-page-Z5ZnzTs3.js`, `exports-page-CATFaBKl.js`, `inbox-page-BwfPJNci.js`, `logs-Bhi2Sf4U.js`, `online-users-dashboard-tG9x8Iwf.js`, `pay-link-page-BKD6Wiyg.js`, `comps-list-DiMn7nL6.js`, `bulk-nKorVO5W.js`, `generate-uGBXj2EA.js`, `editor-C_G0UypU.js`, `layout-rgrbKY06.js`, `plans-dialog-BO1TRfJi.js`, `color-thief-D_PhdqOd.js`, `page-B6i9_e-4.js`, 14 arquivos `list-*.js` e 12 `index-*.js` (incluindo `index-CKGpbnMo.js`, usado para a tradução `en`).

## 3. Endpoints detectados pelo REA (39 nós `endpoint`)

| Arquivo | Mecanismo | Valor detectado | Interpretação |
|---|---|---|---|
| `service-Chphq-AR.js` | `call:get/post` | `/admin/affiliates`, `/affiliates/claim-reward`, `/affiliates/referrals`, `/affiliates/stats` | endpoints reais |
| `service-cCDUhbQQ.js` | `call:get` | `/brandkits/me` | endpoint real |
| `service-DQzaU991.js` | `call:get/post` | `/customer-designs`, `/designs`, `/designs/by-theme` | endpoints reais |
| `service-CmufRMLl.js` | `call:get` | `/formats` | endpoint real |
| `service-Dc47qpQA.js` | `call:fetch` | `a("/assets")`, `a("/assets/batch")`, `a("/assets/remove-background")`, `a("/assets/stats/count")`, `a("/assets/stats/partner-count")`, `a("/assets/upload")`, `a(\`/assets/${r}\`)` ×3 | endpoints reais (a função `a` é o montador de URL) |
| `use-exports-stream-D1YJPQTk.js` | `call:fetch` / `call:EventSource` | `f("/exports")`, `f(\`/exports${r}\`)`, `f(\`/exports/${e}/cancel\`)`, `f(\`/exports/${e}/retry\`)`, `f(\`/exports/${e}/share\`)`, `f(\`/deliveries/${e}\`)`, `s.streamUrl()` (SSE) | endpoints reais |
| `service-cCDUhbQQ.js` | `property:path` | `name`, `slogan`, `validity`, `address`, `website`, `cards`, `contact.landline`, `contact.whatsapp`, `social.instagram`, `social.facebook` | **não são endpoints**: são os caminhos de campo do mapa de campos do BrandKit (`[{label,code,path}]`) |
| `service-Dc47qpQA.js`, `use-exports-stream-D1YJPQTk.js` | `call:fetch` | `t`, `a.url` | chamadas com URL em variável (resolução parcial) |

**Leitura:** o REA detectou 22 chamadas de rede inequívocas. A leitura manual do bundle (ver `docs/evidencias/API-CONTRATO-ORIGINAL.md`) ampliou para **92 endpoints**, porque o REA classifica como `endpoint` apenas literais resolvidos e — segundo as próprias `limitations` — esvaziou o heap ao analisar `index-KJ2_zNqK.js` (o arquivo que concentra a maioria das chamadas). **O grafo do REA, portanto, subestima a API do aplicativo.**

Nós `storage` (8): `localStorage.setItem` / `localStorage.getItem` / `window.sessionStorage.getItem|setItem` em `index-BLLrK9Mc.js`, `index-BMGestSM.js`, `use-mobile-layout-B9xEXdHq.js`, `service-Dc47qpQA.js`, `use-exports-stream-D1YJPQTk.js`.

## 4. Relações semânticas (63.524 relações, 24 tipos)

| Relação | Nº | Significado |
|---|---|---|
| `aliases` | 23.002 | vínculo de nomes/imports entre módulos |
| `reads` | 16.062 | leitura de propriedade/identificador |
| `defines` | 8.878 | definição de símbolo |
| `captures` | 6.684 | closure captura valor externo |
| `writes-property` | 3.496 | escrita em propriedade de objeto |
| `reads-property` | 2.276 | leitura de propriedade de objeto |
| `argument-to-parameter` | 782 | argumento ligado a parâmetro de função |
| `returns-to-call` | 754 | retorno de função que alimenta uma chamada |
| `calls` | 735 | chamada de função |
| `writes` | 426 | escrita em identificador |
| `destructures` | 101 | desestruturação |
| `awaits` | 77 | `await` |
| `spreads` | 77 | spread (`...`) |
| `coerces` | 40 | coerção de tipo |
| `supplies-request-field` | 39 | valor que preenche um campo de requisição HTTP (1:1 com os 39 nós `endpoint`) |
| `creates-promise` | 26 | criação de Promise |
| `constructs-request` | 18 | construção de requisição HTTP |
| `consumed-by` | 21 | valor consumido por outro símbolo |
| `returns-task` | 11 | retorno de tarefa assíncrona |
| `detaches-task` | 7 | tarefa desacoplada (`void`/fire-and-forget) |
| `schedules-timer` | 5 | `setTimeout`/`setInterval` |
| `owns` | 1 | posse de recurso |
| `parses` | 3 | parsing de payload |
| `cancels-timer` | 1 | cancelamento de timer |
| `chains` | 2 | encadeamento de chamadas |

## 5. Cobertura e limitações (verbatim do REA)

`graph.coverage`:

```json
{ "status": "partial", "truncated": false, "omitted_count": null,
  "limits": [
    { "name": "javascript_analysis_worker_heap_limit_bytes", "value": 1098907648, "unit": "bytes" },
    { "name": "javascript_analysis_worker_timeout_ms", "value": 300000, "unit": "milliseconds" } ] }
```

`graph.limitations`:

```
- CommonJS and ESM binding relationships were recovered from inert syntax and resolved only within the inventoried artifact container.
- Graph coverage is incomplete; unavailable facts remain explicit and must not be read as absence.
- JavaScript and HTML were parsed as inert text; bundle bootstrap code was never executed.
- Static imports, entrypoints, workers, endpoints, and storage relationships do not prove runtime execution.
- Static paths and relationships may remain unresolved when expressions are dynamic or obfuscated.
- Webpack/Rspack factories were recovered from AST literals; REA did not invoke push handlers or bundle bootstrap code.
- files/origins/3d7e1848.../assets/index-KJ2_zNqK.js: Resource constraint during analyze_javascript_application: Owned JavaScript worker exhausted its heap while analyzing .../assets/index-KJ2_zNqK.js during static
```

`semantic_graph.coverage`: `status: "partial"`, `truncated: true`, com os limites
`javascript_analysis_worker_heap_limit_bytes` 1.098.907.648, `javascript_analysis_worker_timeout_ms` 300.000,
`semantic_graph_file_node_ceiling` 20.000 itens e `semantic_graph_node_ceiling` 100.000 itens; a família `call-flow`
retém 2.271 relações e a família `boundary` 43, ambas com `status: "partial"` e `unknown_ids` pendentes.

> Interpretação: são os **limites declarados pela própria ferramenta**. O ponto crítico é o sétimo item: a análise de
> `index-KJ2_zNqK.js` (868 KB, o entrypoint com a maioria das chamadas HTTP) **interrompeu por falta de heap**, o que
> explica a subestimação de endpoints e deixa a cobertura `partial`.

## 6. O que esta análise estática NÃO estabelece

1. **Não executa o aplicativo:** o bundle foi lido como texto inerte; nenhum código rodou, nenhum hook foi disparado.
2. **Não prova comportamento de servidor:** os endpoints são *chamadas do cliente*, não o contrato real do backend; não há schema, validação, código de status nem regra de autorização.
3. **Não prova o que é executado em runtime:** importações estáticas, endpoints e armazenamento **não** provam que foram chamados.
4. **Não cobre o bundle inteiro:** 43 chunks lazy não foram exportados e o entrypoint teve a análise interrompida por heap.
5. **Não resolve expressões dinâmicas:** caminhos montados por template/concatenações aparecem como `partial` (ex.: `t`, `a.url`).
6. **Não distingue rota SPA de endpoint de API:** `/products`, `/elements`, `/blog` etc. que aparecem no grafo são rotas do React Router; só os nós com `mechanism: call:get|post|fetch|EventSource` são chamadas de rede.
7. **Não valida o comportamento do SSE** (`/exports/stream`) nem o tracking (`/marketing/track`), que aparecem como chamadas resolvidas, nunca observadas.
