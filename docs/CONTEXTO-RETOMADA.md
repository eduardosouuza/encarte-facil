# Contexto de retomada — Encarte Fácil

**Atualizado em:** 2026-10-20  
**Objetivo do usuário:** concluir uma reimplementação funcional e abrangente do editor em `https://editor.encartefacil.com/editor`, usando o REA (`morluto/rea`) para engenharia reversa e este repositório como implementação local.  
**Diretriz do usuário:** continuar autonomamente, sem perguntas de rotina. O trabalho deve ficar documentado para retomada em outro terminal.

## Como retomar

Abra um terminal nesta pasta e peça ao agente:

> Leia `docs/CONTINUIDADE-ENGENHARIA-REVERSA.md` e continue a implementação e validação do Encarte Fácil a partir do estado descrito. Não repita etapas concluídas. Atualize o arquivo antes de encerrar.

O arquivo `docs/CONTINUIDADE-ENGENHARIA-REVERSA.md` é o ponto único de retomada e substitui este
documento, que é mantido como histórico do contexto anterior.

Comandos iniciais recomendados:

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Conta local de demonstração: `demo@encartefacil.com` / `demo12345`.

## Estado atual

- A aplicação é um monorepo npm com API Express/TypeScript/SQLite em `server/` e SPA React/Vite em `web/`.
- TypeScript, lint, testes unitários/integrados e build de produção passam no estado atual.
- A suíte contém 67 testes no servidor, 22 no frontend e 12 E2E no Chromium; todos passam (101 no total).
- Não há repositório Git inicializado nesta pasta (`git status` devolve que não é um repositório).
- Existe uma captura autenticada anterior do editor em `docs/evidencias/dados/autenticado/`. Ela percorreu as sete seções pedidas e registrou as chamadas de rede com tokens removidos. A autenticação no original foi destravada em 2026-10-20 (ver `docs/CONTINUIDADE-ENGENHARIA-REVERSA.md`, seção 5.6): `POST https://api-v2.encartefacil.com/auth/login` responde HTTP 200 com `role: customer` e partner `Encartefacil`.
- As cinco capturas REA foram exportadas sem erros após a remoção do BOM UTF-8; os scripts estão em `docs/evidencias/scripts-captura-*/` e o inventário consolidado em `docs/evidencias/INVENTARIO-SCRIPTS.md`.

### Plano atual: seções do editor original

O bundle e a captura autenticada confirmam a ordem e a estrutura: barra fixa de 64 px no desktop, painel de 396 px ao lado; no celular, barra inferior de 48 px e painel em folha inferior com até 65% da altura.

| Ordem | Seção | Comportamento observado | Estado local |
|---:|---|---|---|
| 1 | Temas | Pesquisa e modelos agrupados por tema; aplica um visual ao encarte | 26 modelos em 13 coleções, busca, expansão por grupo e aplicação do layout |
| 2 | Produtos | Pesquisa, inclusão, lista/grade, preços e organização dos produtos | Lista em massa no editor, fotos automáticas e grid com destaque ou uniforme |
| 3 | Elementos | Categorias, busca, texto, formas, imagens e elementos reutilizáveis | Painel funcional com 12 grupos e biblioteca de imagens |
| 4 | Tags | Presets e efeitos visuais aplicados aos cards/etiquetas de produto | Painel com Formas, Estilo e Cores; aplica no selecionado ou em todos |
| 5 | Formatos | Tipo de material e tamanho, incluindo encarte, cartaz, etiqueta e vídeo | Painel funcional com quatro tipos e oito tamanhos |
| 6 | Marca | Logo, cores, dados comerciais e aplicação da identidade visual | Painel funcional para aplicar cores, logo e rodapé da marca |
| 7 | Encartes | Encartes recentes, configurações, validade, rodapé, modelos e projeto | Painel funcional com recentes, validade, projeto e camadas |

Implementação concluída nesta etapa: as quatro abas genéricas foram substituídas pela navegação original de sete seções. O desktop usa rail de 64 px e painel de 396 px; o celular usa barra inferior de 48 px e folha inferior limitada a 65% da tela.

### Iteração visual e de produtos de 2026-10-20

- As referências locais `Captura de tela 2026-10-20 105943.png` e `Captura de tela 2026-10-20 192546.png` foram inspecionadas. Elas confirmaram coleções de temas em faixas com “Ver mais”, importação por textarea e um mosaico com o primeiro produto em destaque.
- `server/src/db/seed.ts` agora semeia 26 modelos em 13 coleções: Super Ofertas, Primavera, Outubro Rosa, Dia das Bruxas, Outubro, Segunda-Feira, Terça-Feira, Hortifruti, Black Friday, Natal, Fim de Semana, Atacado e Padaria.
- O painel Temas agrupa os modelos, oferece busca, `Ver mais/Ver menos` e previews visuais individuais. Aplicar um modelo altera os elementos, a paleta e o fundo no canvas.
- O painel Produtos inicia em `Buscar`, aceita até 50 linhas, executa com Ctrl+Enter, informa progresso, cria os cadastros, busca até quatro fotos em paralelo e insere o lote no encarte.
- A captura autenticada `editor-023-GET_flyers_257336010_locale_pt_br.json` confirmou que imagens reais do original usam `https://efacil-public.s3.sa-east-1.amazonaws.com/`, inclusive o prefixo `/products/`. Nove itens observados foram incluídos como catálogo conhecido; para os demais, o Open Food Facts continua como complemento.
- Todas as fotos remotas encontradas são baixadas, validadas, normalizadas e salvas como assets privados locais antes de entrarem no produto.
- O grid agora persiste `mode: featured|balanced`. `featured` reproduz o mosaico observado: primeiro item ocupa duas colunas e duas linhas, dois menores ficam à direita e os demais seguem em três colunas.

### Autenticação no original em 2026-10-20 (estado atual)

- O navegador integrado não está disponível nesta sessão (`cua.getState()` não retorna navegadores e `iab` não pode ser criado).
- A leitura correta do arquivo de credenciais resolveu as tentativas de 401: `POST https://api-v2.encartefacil.com/auth/login` responde **HTTP 200**, com `role: customer` e partner `Encartefacil`. A senha e o token ficam apenas na memória do processo.
- Script seguro de diagnóstico: `scripts/audit-original-auth.mjs`. Ele lê `loginencartefacil.md`, nunca imprime a senha e omite o token da saída.
- Consequência: as telas autenticadas do original foram observadas e capturadas. Os fluxos que antes eram inferidos passaram a ter evidência direta.
- A captura bruta `capture-login-ok.json` contém um JWT real de sessão em 4 pontos e **não deve entrar no repositório**; dela só foram copiados os scripts e o manifesto, já sem segredo.

### Tentativas com skill e MCP de navegador

- O skill `computer-use` foi aplicado conforme solicitado.
- O MCP CUA não oferece navegador nesta sessão: `chrome`, `edge` e `iab` retornaram `Browser is not available`; `dot` retornou que o plugin Browser Use não está disponível.
- Foi tentado o MCP `node_repl` persistente com Playwright. O navegador carregou corretamente, mas a navegação para o original foi bloqueada pelo conector com `ERR_NETWORK_ACCESS_DENIED`.
- Próximo fallback autorizado: Chromium/Playwright instalado no próprio repositório, executado fora do sandbox somente para leitura e captura visual. Não salvar credenciais, tokens ou cookies.

### Captura visual real pelo Chromium

- O fallback Playwright conseguiu abrir o original. Script: `scripts/inspect-original-ui.mjs`.
- Evidência temporária: `.work/original-ui/login.png` e `.work/original-ui/report.json`. A pasta não contém senha, token ou cookie.
- A tentativa de login pela interface permaneceu na rota `/login` enquanto a API devolvia 401; depois da correção da leitura das credenciais o login original passou a funcionar.
- Medidas observadas em viewport 1440x1000: formulário interno com 446 px de largura; fundo `rgb(10,10,10)`; texto `rgb(250,250,250)`; verde do botão `rgb(41,209,156)`; botão com raio 9999 px.
- Textos observados: `Logar`, `E-mail *`, `Senha *`, `Entrar`, `Criar conta` e `Esqueci minha senha`.
- A réplica agora usa o logotipo oficial baixado em `web/public/encartefacil-logo.png`, tema escuro padrão, verde `#29d19c`, botão pill, seletor de tema e estrutura equivalente na tela de login.
- Um novo E2E verifica identidade visual, logotipo, textos, tema, cor e raio do botão contra os valores observados.

## Engenharia reversa executada

Ferramenta instalada: REA 6.7.0. Configuração do projeto em `kilo.json`.

### Captura original anterior

- Captura real da tela de login e 5 transações de rede em `docs/evidencias/dados/api-login.json`.
- Contrato inicial de 92 endpoints em `docs/evidencias/API-CONTRATO-ORIGINAL.md`.
- Relatório em `docs/RELATORIO-ENGENHARIA-REVERSA.md`.
- Rotas e modelo em `docs/MAPA-PAGINAS-E-FLUXOS.md` e `docs/evidencias/MODELO-DE-DADOS-E-ROTAS.md`.

### Ampliação realizada nesta etapa

O conjunto público completo do bundle foi recuperado sem executar seu código:

- Script: `scripts/capture-public-bundle.mjs`.
- Artefatos: `docs/evidencias/public-bundle/`.
- Manifesto com SHA-256, tamanho e URL de 181 arquivos retidos: `docs/evidencias/public-bundle/manifest.json`.
- A análise REA examinou 182 arquivos, leu 2.543.743 bytes, parseou 179 arquivos JavaScript sem falhas de parse, visitou 375.909 nós AST e produziu 4.383 achados.
- Evidência integral: `docs/evidencias/rea-complete-bundle.json`.
- Inventário de chamadas e rótulos: `docs/evidencias/public-bundle-inventory.json`.
- Script de inventário: `scripts/summarize-public-bundle.mjs`.
- Foram identificadas 206 chamadas de serviço pelo inventário ampliado, incluindo os chunks lazy que faltavam anteriormente.

Novos contratos confirmados no bundle incluem `/elements`, `/industries`, chat, checkout público, recursos administrativos e os módulos completos de assets, brandkits, designs e exports. Recursos administrativos do produto original não devem ser expostos a usuários comuns na réplica local.

### Exportação integral dos scripts das capturas (2026-10-20)

O `rea export-web-scripts` falhava ao ler as capturas por causa do BOM UTF-8 gerado pelo `Out-File -Encoding utf8` do PowerShell 5.1. As cinco capturas foram sanitizadas com Node e reexportadas sem erro:

- Pastas: `docs/evidencias/scripts-captura-login-ok/`, `scripts-captura-login-falha/`, `scripts-captura-login-falha2/`, `scripts-captura-editor/`, `scripts-captura-batch1/`.
- Resultado: 380 entradas de script, **282 arquivos exportados** e 98 indisponíveis por limites de retenção do Playwright (`body-size-limit`, `body-read-failed`, `response-content-not-retained`, `body-allocation-limit`).
- **99 URLs únicas** com conteúdo; 98 são byte-idênticos ao bundle público (SHA-256 igual, zero divergência). O único extra é o beacon de analytics da Cloudflare.
- As 98 indisponíveis: 81 cobertas pelo bundle público e 11 que são apenas rastreadores de terceiros (gtag/GA4 e beacon). Cobertura do código da aplicação: 100%.
- Integridade verificada nos 282 arquivos: 0 BOM, 0 JWT, 0 referência a `@encartefacil:token`, 0 caminhos inseguros.
- Inventário consolidado: `docs/evidencias/INVENTARIO-SCRIPTS.md` e `.json`, gerados por `scripts/analise-bundle/inventario-scripts.mjs`.
- Detalhes completos em `docs/CONTINUIDADE-ENGENHARIA-REVERSA.md`, seção 7.

## Funcionalidades locais implementadas

### Autenticação e conta

- Registro, login, logout, JWT e cookie HTTP only.
- Sessões revogáveis, `/auth/me`, `/auth/verify`, recuperação e redefinição de senha.
- Dados de conta, idioma, mercado, visão de plano e créditos.
- Isolamento dos dados por usuário.

### Encartes

- CRUD, busca, filtros, paginação, duplicação e estados.
- Atualizações parciais preservam campos que não fazem parte do patch. Isso corrigiu um defeito em que publicar ou renomear podia apagar conteúdo/configurações.
- Link público ativável/desativável em `/p/:id`.
- A rota pública renderiza imagens pertencentes à conta sem expor o endpoint privado do asset.
- Templates próprios: o editor salva um encarte como modelo e a página Modelos permite reutilizá-lo e excluí-lo.
- Importação/exportação do projeto editável em JSON, versão 1.

### Produtos

- CRUD, pesquisa por nome/categoria/SKU, filtros e paginação.
- Parser local de linhas como `Arroz 5kg 24,90`, com extração de nome, unidade e preço.
- Importação em lote, uma linha por produto, com revisão automática de linhas sem preço.
- `POST /products/import-list` cria até 50 produtos de uma só vez e devolve separadamente as linhas ignoradas.
- Atualização rápida de preço e seleção de imagens da biblioteca.
- Remoção de fundo diretamente no produto por `POST /products/:id/remove-background`; cria um novo asset processado, preserva o original e atualiza a foto do produto.
- Busca automática de foto por `POST /products/:id/find-image`, além dos contratos `/products/search-images` e `/products/search-images/persist` observados no original.
- A integração prioriza correspondências conhecidas do bucket público observado no original e usa o Open Food Facts como complemento. Aceita somente os hosts fixos `efacil-public.s3.sa-east-1.amazonaws.com`, `cdn.encartefacil.com` e `images.openfoodfacts.org`, limita tempo e tamanho, normaliza a imagem para PNG e salva uma cópia na biblioteca privada antes de associá-la ao produto.
- Ao adicionar um produto sem foto ao editor, a foto é procurada automaticamente; também existe o botão `Buscar foto` no catálogo.

### Editor

- Navegação igualada à estrutura observada no original: Temas, Produtos, Elementos, Tags, Formatos, Marca e Encartes.
- Desktop com rail vertical de 64 px e painel lateral de 396 px; mobile com barra inferior de 48 px e painel em folha inferior.
- Temas possuem 26 modelos em 13 coleções, busca, preview, expansão por grupo e aplicação do layout ao canvas.
- Tags possuem as subabas Formas, Estilo e Cores; formas círculo, pílula, ingresso, explosão e quadrada; estilos sólido, contorno, gradiente e sombra; oito sugestões de cor e seis presets completos.
- Tags podem ser aplicadas ao produto selecionado ou a todos, persistem no encarte e aparecem no canvas e nos arquivos exportados.
- Formatos distinguem Encarte, Cartaz, Etiqueta e Vídeo. Etiqueta explica a organização em A4 e Vídeo permanece exportável em MP4.
- Elementos foram alinhados aos grupos observados: Adesivos, Decorativos, Selos 3D, Fitas, Splash, Tags, Molduras, Backgrounds, Fotos, Ícones e Formas, além de Textos.
- Produtos possui Buscar, Catálogo e No encarte, importação direta de lista, busca automática de fotos, inclusão, seleção, remoção e limpeza completa.
- O grid oferece `Com destaque` e `Uniforme`, reserva cabeçalho e rodapé e recalcula posições ao adicionar produto, mudar colunas, formato, tipo de material ou tema. Colunas e modo ficam persistidos em `flyer.grid`.
- Templates agora expõem paleta e cor de fundo, mostram preview visual e são escalados do formato-base 1080×1350 para o formato atual antes de serem aplicados.
- Marca permite aplicar a identidade imediatamente e também editar, no próprio painel, nome, slogan, endereço, site, logo, telefones, redes, pagamentos e cores.
- Canvas com arrastar, redimensionar, rotação, zoom, ajuste à tela e seleção.
- Texto, formas, imagens, produtos e rodapé.
- Camadas, duplicação, exclusão, atalhos de teclado, nudging por setas e Shift+setas.
- Desfazer/refazer corrigido: um arraste ou uma alteração contínua agora desfaz o gesto inteiro.
- Autosave serializado com debounce, indicação de erro, prevenção de perda ao fechar e salvamento antes de exportar/compartilhar.
- Busca de produtos e organização automática em grade configurável.
- Período de validade, formato do encarte, cor de fundo e aplicação da identidade visual.
- Fontes, tamanho, peso, itálico, sublinhado, caixa alta, alinhamento e cor.
- Produto editável dentro do encarte: nome, preço, promoção, unidade, cores e destaque.
- Preview do rodapé no canvas e inclusão no arquivo exportado.
- Biblioteca pesquisável de elementos reutilizáveis dentro do painel: títulos, selos, faixas, cartões, barras e avisos de validade.

### Catálogos observados no bundle

- Compatibilidade local com `GET /elements`, `/elements/:id`, `/elements/colored`, `/industries`, `/industries/:id`, `/themes`, `/themes/:id` e `/themes/stats/count`.
- Segmentos iniciais: supermercado, padaria, farmácia, pet shop, material de construção e moda/variedades.
- Temas sazonais usam os mesmos tokens e fontes dos 26 modelos locais.

### Biblioteca de imagens

- Rotas de assets implementadas conforme o contrato observado: upload, lista, detalhe, batch, contagem, edição, exclusão e arquivo.
- Aceita PNG, JPEG e WebP; limite de 5 MB e 20 megapixels; normaliza para PNG.
- Arquivos são guardados no SQLite e isolados por usuário.
- Remoção de fundo local por flood fill a partir das bordas, indicada para fundo uniforme. O original fica preservado e uma cópia processada é criada.
- URLs externas não são buscadas pelo backend; isso evita SSRF. Imagens usadas em exportações precisam estar na biblioteca ou ser data URLs válidas.
- Imagens podem ser inseridas no editor e escolhidas como foto do produto.

### Identidade visual

- Brandkit persistente por conta: nome, slogan, logo, endereço, site, telefone, WhatsApp, redes sociais, formas de pagamento e até 12 cores.
- Aplicação da marca ao fundo/rodapé e inserção de logo no canvas.

### Exportações

- SVG determinístico no servidor.
- PNG e JPEG reais gerados com Sharp.
- PDF real gerado com PDFKit a partir do raster final.
- MP4 H.264 real gerado com `ffmpeg-static`, com fade e duração configurável de 3 a 30 segundos. A UI usa 6 segundos.
- Cada arquivo fica persistido como snapshot no SQLite. Editar o encarte depois não altera uma exportação anterior.
- Downloads exigem autenticação e pertencimento à conta.
- Histórico, retry e stream SSE de exportações.
- Imagens privadas são embutidas como data URL durante a renderização.

## Principais arquivos alterados/criados

- `server/src/db/connection.ts`: tabelas `assets`, `brandkits`, `export_files`.
- `server/src/modules/media.routes.ts`: biblioteca e identidade visual.
- `server/src/modules/render.service.ts`: pipeline SVG/PNG/JPEG/PDF/MP4 e snapshots.
- `server/src/lib/video.ts`: execução limitada do FFmpeg e limpeza segura da pasta temporária.
- `server/src/modules/export.routes.ts`: arquivos, retry e SSE.
- `server/src/modules/flyer.routes.ts`: patch parcial, render real, vídeo e rota pública.
- `server/src/lib/svg.ts`: texto multilinha, imagens `meet`, cores de preço e consistência com o canvas.
- `web/src/features/flyers/pages/editor-page.tsx`: integração completa do editor.
- `web/src/features/editor/use-editor-state.ts`: histórico de gestos.
- `web/src/features/editor/flyer-canvas.tsx`: preview melhorado e rodapé.
- `web/src/features/editor/inspector-panel.tsx`: propriedades ampliadas.
- `web/src/features/media/media-library.tsx`: biblioteca.
- `web/src/features/media/brand-page.tsx`: identidade visual.
- `web/src/features/designs/pages/designs-page.tsx`: modelos próprios, busca e tema.
- `server/src/modules/product.routes.ts`: pesquisa, parser de linha e atualização rápida de preço.
- `server/src/modules/editor-catalog.data.ts`: biblioteca de elementos e segmentos.
- `server/src/modules/catalog.routes.ts`: contratos de elementos, segmentos e temas.
- `web/src/features/products/pages/products-page.tsx`: foto pela biblioteca e importação de lista.
- `web/src/lib/download.ts`: download autenticado.
- `server/tests/media-export.test.ts`: imagens, marca, isolamento e formatos reais.
- `server/tests/catalog.test.ts`: catálogo, pesquisa, parser e atualização de preço.
- `web/e2e/exports.spec.ts`: download de PDF real e ciclo de modelo próprio.
- `scripts/analise-bundle/inventario-scripts.mjs`: inventário consolidado dos scripts extraídos.
- `docs/evidencias/scripts-captura-*/` + `docs/evidencias/INVENTARIO-SCRIPTS.md`: cópia integral dos scripts.

## Validações já concluídas

```text
npm run typecheck  PASS
npm run lint       PASS
npm test           PASS: servidor 67/67; frontend 22/22
npm run build      PASS
npm run test:e2e   PASS: Chromium 12/12, incluindo coleções de temas, lista em massa, foto de produto, grid, sete seções, viewport 390x844, PDF real e modelo próprio
```

O build produz atualmente um bundle JS principal de aproximadamente 620 kB (186 kB gzip), com aviso de tamanho acima de 500 kB. Isso não impede a execução, mas code splitting é uma melhoria indicada.

Testes novos verificam:

- isolamento de imagens e arquivos exportados entre contas;
- rejeição de URL externa nas rotas de imagem;
- remoção de fundo sem alterar o original;
- brandkit por conta;
- atualização parcial sem apagar publicação, status ou elementos;
- bytes reais de PNG, JPEG, PDF, SVG e MP4;
- persistência do snapshot exportado depois que o encarte é alterado;
- desfazer/refazer de um gesto contínuo;
- parser de lista de produtos, pesquisa por categoria e atualização rápida de preço;
- importação em lote no editor, catálogo S3 observado e mosaico com produto em destaque;
- upload, identidade visual, exportação PNG, link público e uso móvel no navegador real;
- download de PDF real pelo editor (assinatura `%PDF-`) e ciclo completo de modelo próprio no navegador real.

## Pendências e limitações reais

1. ~~Adicionar E2E específico para download PDF e modelos próprios.~~ **Concluído em 2026-10-20**: `web/e2e/exports.spec.ts` valida o download de PDF real (`%PDF-`) e o ciclo de modelo próprio (salvar, reaproveitar, excluir).
2. O bundle principal merece code splitting por rota.
3. `npm audit` reporta 16 alertas (7 moderados, 6 altos e 3 críticos) em dependências antigas, concentrados nas ferramentas de desenvolvimento e no React Router 6. As correções automáticas oferecidas exigem migrações de versão principal (Vitest 5, Tailwind 4 e React Router 7). Planejar e testar essas migrações antes de atualizar; o runtime do servidor não aparece como fonte direta dos alertas listados.
4. O checkout/cobrança da réplica continua simulado, sem cobrança real. Não iniciar transações financeiras para copiar o original.
5. E-mail e WhatsApp registram entregas/fornecem link; não existe provedor externo configurado.
6. OCR de lista por imagem, chat e endpoints administrativos vistos no bundle original dependem de provedores ou regras proprietárias e ainda não têm equivalentes locais completos. A busca por nome já usa o catálogo conhecido do original e o Open Food Facts.
7. A remoção de fundo é local e determinística para fundos uniformes; não equivale ao modelo de IA proprietário do serviço original.
8. Há captura autenticada do editor em `docs/evidencias/dados/autenticado/`, com as sete abas e 30 transações. O login no original passou a funcionar em 2026-10-20; use a captura sanitizada, as exportações em `docs/evidencias/scripts-captura-*/` e o bundle para continuar comparações sem persistir tokens.

## Segurança e decisões relevantes

- Nunca registrar o conteúdo de `loginencartefacil.md`; ele está no `.gitignore`.
- Não copiar tokens/cookies do original para arquivos.
- URLs arbitrárias fornecidas pelo usuário continuam bloqueadas no fluxo automático. A busca aceita somente três hosts HTTPS fixos: `images.openfoodfacts.org`, `efacil-public.s3.sa-east-1.amazonaws.com` e `cdn.encartefacil.com`, com timeout de 8 segundos, limite de 5 MB e validação pelo Sharp.
- Limites de payload: JSON geral 8 MB, upload 5 MB, imagem 20 MP e vídeo máximo 30 segundos.
- Downloads de assets e exports exigem a conta proprietária.
- Diretórios temporários do vídeo são criados sob `os.tmpdir()` com prefixo fixo e validados antes da remoção recursiva.
- O produto local é uma reimplementação do comportamento observado, não o código-fonte proprietário original.

## Comandos REA usados

```powershell
rea --help
rea analyze-javascript-application docs/evidencias/public-bundle `
  --max-semantic-nodes 10000 `
  --max-semantic-nodes-per-file 1000 `
  --max-semantic-unknowns 1000 `
  --max-semantic-unknowns-per-file 100 `
  --format json > docs/evidencias/rea-complete-bundle.json
node scripts/capture-public-bundle.mjs
node scripts/summarize-public-bundle.mjs

# exportação dos scripts das capturas (exige remover o BOM antes)
node %TEMP%\kilo\ef-investigation\strip-bom.mjs <captura.json>
rea export-web-scripts <captura.json> docs\evidencias\scripts-captura-<id>
node scripts/analise-bundle/inventario-scripts.mjs .
```

No sandbox do ambiente, REA/esbuild às vezes falham com `Access is denied` ao abrir componentes do caminho do usuário. Nesses casos os mesmos comandos funcionam com execução aprovada fora do sandbox.

## Regra de manutenção deste arquivo

Antes de encerrar uma sessão longa ou quando o contexto estiver perto do limite:

1. Atualize “Estado atual”, “Validações” e “Pendências”.
2. Registre mudanças materiais com seus arquivos.
3. Não marque algo como concluído sem teste ou evidência.
4. Não apague limitações ainda existentes.
5. Continue do primeiro item pendente e evite repetir engenharia reversa já comprovada.
