# Templates originais

O usuário confirmou a solução de fotos e solicitou a mesma integração para os
templates. A investigação foi executada em 13/11/2026 com REA 6.7.0 via MCP,
usando análise estática dos módulos `service-DQzaU991.js` e
`index-MqiCARZ_.js`. A análise identificou:

- `GET /designs?limit&offset&locale&status&archived&term&themes`;
- `GET /designs/by-theme?locale`;
- `GET /designs/{key}?locale`;
- lista de 1.960 designs aprovados, em 13 temas;
- cada design com preview, nome, descrição, formato, tema e elementos;
- cada elemento com `category`, `x`, `y`, `width`, `height`, `rotation`,
  `zIndex`, `scaleX`, `scaleY`, `skewX`, `skewY`, `clipPath` e asset;
- assets originais, médios e baixos em `efacil-public.s3.sa-east-1.amazonaws.com`.

O projeto agora consulta esses endpoints no servidor quando a conta do catálogo
está configurada. O catálogo local continua como fallback para testes e quando
não há conta. A tela Modelos recebe os templates reais, incluindo previews e
camadas posicionadas. Ao aplicar um modelo, as imagens dos assets originais são
convertidas para elementos de imagem do editor, mantendo posição, tamanho,
rotação, ordem e proporção do template. O endpoint detalhado também é consultado
quando necessário.

Correção registrada: a listagem resumida retorna apenas IDs de assets, enquanto
as URLs aparecem no detalhe. Os cards usam o preview oficial e a aplicação
consulta `GET /designs/{key}` antes de converter as camadas; isso evita cards
brancos e mantém os assets dentro do editor.

## Elementos da biblioteca

A captura também confirmou quatro bibliotecas no editor: Selos, Fotos,
Decorativo e Fundos. A rota original `GET /elements?category=...` retorna
`assetUrls`, nome, descrição, categoria, largura e altura. O endpoint local agora
consulta essas categorias e converte cada asset em um elemento de imagem que pode
ser inserido diretamente no canvas. A aba existente de Elementos passa a exibir
as imagens reais do catálogo, com busca, filtro por categoria e preservação de
proporção.

Credenciais permanecem somente no servidor em `ORIGINAL_CATALOG_EMAIL` e
`ORIGINAL_CATALOG_PASSWORD`; no desenvolvimento, o arquivo local ignorado
`loginencartefacil.md` continua sendo a alternativa. O token fica em memória.

Comandos de evidência:

```text
node scripts/rea-image-analysis.mjs --analyze --templates
node scripts/inspect-original-templates.mjs --inventory
```

As respostas e o inventário ficam em `.work/original-templates/`, que não entra
no versionamento. A integração busca sob demanda para evitar copiar 1.960
templates e seus assets para o banco local.
