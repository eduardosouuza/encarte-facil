# Busca de fotos dos produtos

## Estado confirmado

Em 13/11/2026, o usuário confirmou que a busca de fotos funcionou.
Preservar a integração com o catálogo original, a autenticação somente no
servidor, o download local e a seleção de embalagens. Validação realizada:
31 testes de backend, build, typecheck e teste no navegador com persistência
após recarregar. O servidor de desenvolvimento precisa de acesso à rede;
iniciado em sandbox sem rede, retorna 502 mesmo com credenciais corretas.

Próxima etapa solicitada: importar templates originais com análise REA,
preservando a solução de fotos aprovada.

Análise em 13/11/2026: REA 6.7.0 via MCP stdio, ferramenta
`analyze_javascript_application`, sobre `index-MqiCARZ_.js` do bundle original.
Evidência: `ev_a29ddaf0017cfbb5a3b2b55d135a30a895f6f6dc01ccf19a3ea555ff738d29fe`.
O escopo estático é parcial; não contém a implementação do backend proprietário.

As consultas autenticadas ao original confirmaram `POST /products/search-images`,
corpo `{ "term": "Arroz" }`, resposta `text/event-stream` com objetos JSON
concatenados (sem separadores SSE). Eventos: `progress`, `database`, `image`,
`serp`, `end`. Cada imagem tem `imageUrl`, `thumbnailUrl`, `source` e,
quando presente, `productName`/`productId`. Arroz e leite retornaram 50 fotos
do catálogo mais 10 da internet; Coca Cola 2l retornou 49 mais 10.

O servidor local agora consulta essa busca quando há conta configurada. A sessão
fica apenas na memória do backend e é renovada em caso de 401. O frontend recebe
as imagens após a conclusão da consulta. A seleção baixa a foto para a biblioteca
local, sem criar produtos nem persistir referências na conta remota.

Use `ORIGINAL_CATALOG_EMAIL` e `ORIGINAL_CATALOG_PASSWORD` no ambiente do servidor.
Em desenvolvimento, o arquivo local ignorado `loginencartefacil.md` é usado como
alternativa. Produção e testes nunca leem esse arquivo automaticamente. Sem conta
configurada, permanece a busca anterior (amostra estática + Open Food Facts).
Falhas de autenticação ou serviço com conta configurada são exibidas ao usuário.

As fotos do catálogo usam os arquivos do S3 original. Resultados de internet com
origem fora dos hosts permitidos usam a miniatura Google retornada pelo próprio
serviço; sua resolução é menor. Downloads não seguem redirecionamentos nem
aceitam URLs arbitrárias enviadas pelo cliente.

No catálogo e no editor, **Escolher foto** permite pesquisar e selecionar outra
embalagem. **Buscar foto** e a importação no editor continuam automáticos, agora
usando o catálogo original. A escolha no editor atualiza os itens correspondentes.

Reproduzir a investigação: `node scripts/rea-image-analysis.mjs --analyze` e
`node scripts/inspect-original-images.mjs`. Saídas ficam em `.work/product-images/`.
Esses comandos precisam de acesso aos diretórios do REA e à rede, respectivamente.
