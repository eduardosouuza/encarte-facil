import { expect, test } from "@playwright/test";

const CREDENTIALS = {
  email: process.env.E2E_EMAIL ?? "demo@encartefacil.com",
  password: process.env.E2E_PASSWORD ?? "demo12345",
};
const PIXEL_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4z8DwH4QZYAwAR8oH+Xm0fdIAAAAASUVORK5CYII=";

test("reproduz a identidade visual observada na tela de login original", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("img", { name: "Encartefacil" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Logar" })).toBeVisible();
  await expect(page.getByLabel("E-mail *")).toHaveAttribute("placeholder", "seu@email.com");
  const submit = page.getByRole("button", { name: "Entrar" });
  await expect(submit).toHaveCSS("border-radius", "9999px");
  await expect(submit).toHaveCSS("background-color", "rgb(41, 209, 156)");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(CREDENTIALS.email);
  await page.getByLabel("Senha").fill(CREDENTIALS.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/flyers");
}

test("faz login, abre o editor e adiciona um elemento", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("E-mail").fill(CREDENTIALS.email);
  await page.getByLabel("Senha").fill(CREDENTIALS.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: "Meus encartes" })).toBeVisible();

  await page.goto("/flyers");
  const firstCard = page.locator("a[href^='/editor/']").first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();

  await expect(page.getByTestId("flyer-canvas")).toBeVisible();

  const before = await page.getByTestId("flyer-canvas").locator("[data-testid^='element-']").count();
  await page.getByRole("button", { name: "Elementos" }).click();
  await page.getByRole("button", { name: "Texto", exact: true }).click();
  const after = await page.getByTestId("flyer-canvas").locator("[data-testid^='element-']").count();

  expect(after).toBeGreaterThan(before);
});

test("rejeita credenciais invalidas", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("E-mail").fill("inexistente@encartefacil.com");
  await page.getByLabel("Senha").fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toContainText("Credenciais invalidas");
});

test("carrega as rotas da SPA sem colidir com o proxy /p da API", async ({ page }) => {
  const erros: string[] = [];
  page.on("response", (res) => {
    if (res.status() >= 400) erros.push(`${res.status()} ${res.url()}`);
  });

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(CREDENTIALS.email);
  await page.getByLabel("Senha").fill(CREDENTIALS.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/flyers");

  // "/products" comeca com "/p": sem o bypass do proxy cairia na API.
  await page.goto("/products");
  await expect(page.getByRole("heading", { level: 2, name: "Produtos" })).toBeVisible();

  await page.goto("/flyers");
  await expect(page.getByRole("heading", { level: 2, name: "Meus encartes" })).toBeVisible();

  expect(erros).toEqual([]);
});

test("importa imagem e salva identidade visual", async ({ page }) => {
  await login(page);
  await page.goto("/assets");
  await expect(page.getByRole("heading", { name: "Biblioteca de imagens" })).toBeVisible();
  const imageName = `pixel-e2e-${Date.now()}.png`;
  const uploadResponse = page.waitForResponse(response => response.url().includes("/api/assets/upload"));
  await page.getByLabel("Enviar imagens").setInputFiles({
    name: imageName,
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4z8DwH4QZYAwAR8oH+Xm0fdIAAAAASUVORK5CYII=", "base64"),
  });
  const uploaded = await uploadResponse;
  expect(uploaded.status(), await uploaded.text()).toBe(201);
  await expect(page.getByText("Imagens importadas")).toBeVisible();
  await expect(page.getByRole("button", { name: `Inserir ${imageName}` })).toBeVisible();

  await page.goto("/brandkit");
  await expect(page.getByRole("heading", { name: "Identidade visual da loja" })).toBeVisible();
  await page.getByLabel("Nome da loja").fill("Mercado E2E");
  await page.getByRole("button", { name: "Salvar identidade visual" }).click();
  await expect(page.getByText("Identidade visual salva")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome da loja")).toHaveValue("Mercado E2E");
});

test("exporta PNG real pelo editor e abre link público", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await login(page);
  const firstCard = page.locator("a[href^='/editor/']").first();
  await firstCard.click();
  await page.getByRole("button", { name: "Elementos" }).click();
  await page.getByRole("button", { name: "Texto", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar" }).click();
  await page.getByRole("menuitem", { name: "PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).subarray(1, 4).toString()).toBe("PNG");

  await page.getByRole("button", { name: "Copiar link público" }).click();
  await expect(page.getByText(/Link público copiado/)).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto(url);
  await expect(page.locator("img")).toBeVisible();
});

test("mantém navegação e editor utilizáveis em viewport estreita", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("menuitem", { name: /Imagens/ }).click();
  await expect(page.getByRole("heading", { name: "Biblioteca de imagens" })).toBeVisible();
  await page.goto("/flyers");
  await page.locator("a[href^='/editor/']").first().click();
  await page.getByRole("button", { name: "Elementos" }).click();
  await expect(page.getByRole("button", { name: "Texto", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Texto", exact: true }).click();
  await expect(page.getByTestId("flyer-canvas")).toBeVisible();
});

test("expõe e abre as sete seções do editor original", async ({ page }) => {
  await login(page);
  await page.locator("a[href^='/editor/']").first().click();
  await expect(page.getByRole("heading", { name: "Temas", exact: true })).toBeVisible();
  const navigation = page.locator('nav[aria-label="Seções do editor"]:visible');
  for (const section of ["Produtos", "Elementos", "Tags", "Formatos", "Marca", "Encartes"]) {
    await navigation.getByRole("button", { name: section, exact: true }).click();
    await expect(page.getByRole("heading", { name: section, exact: true })).toBeVisible();
  }
});

test("busca foto e organiza produtos automaticamente no grid", async ({ page }) => {
  await login(page);
  await page.route("**/api/products/*/find-image", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, product: { image: PIXEL_IMAGE }, asset: { imageUrl: PIXEL_IMAGE } }) });
  });
  await page.locator("a[href^='/editor/']").first().click();
  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  await page.getByRole("button", { name: "Catálogo", exact: true }).click();
  const catalogItems = page.getByText("Clique para adicionar", { exact: true });
  const amount = Math.min(4, await catalogItems.count());
  expect(amount).toBeGreaterThan(1);
  for (let index = 0; index < amount; index++) await catalogItems.nth(index).click();
  const cards = page.getByTestId("flyer-canvas").locator("[data-testid^='product-']");
  await expect(cards).toHaveCount(amount);
  await expect(cards.first().locator("img")).toBeVisible();
  const positions = await cards.evaluateAll(nodes => nodes.map(node => ({ left: (node as HTMLElement).style.left, top: (node as HTMLElement).style.top, width: (node as HTMLElement).style.width, height: (node as HTMLElement).style.height })));
  expect(new Set(positions.map(position => `${position.left}:${position.top}`)).size).toBe(amount);
  expect(positions.every(position => Number.parseFloat(position.width) > 90 && Number.parseFloat(position.height) > 120)).toBe(true);
  if (amount >= 3) {
    expect(Number.parseFloat(positions[0]!.width)).toBeGreaterThan(Number.parseFloat(positions[1]!.width));
    expect(Number.parseFloat(positions[0]!.height)).toBeGreaterThan(Number.parseFloat(positions[1]!.height));
  }
});

test("mostra temas por coleção e importa uma lista direto no editor", async ({ page }) => {
  await login(page);
  await page.locator("a[href^='/editor/']").first().click();
  await expect(page.getByText("Escolha o melhor tema para o seu encarte")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Primavera", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Outubro Rosa", exact: true })).toBeVisible();

  await page.route("**/api/products/*/find-image", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, product: { image: PIXEL_IMAGE } }) });
  });
  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  await page.getByLabel("Lista de produtos").fill("Pão francês 9,90 kg\nPão de queijo 21,90 kg");
  await page.getByRole("button", { name: "Buscar fotos" }).click();
  await expect(page.getByText(/2 produtos adicionados/)).toBeVisible();
  await expect(page.getByTestId("flyer-canvas").getByText("Pão francês")).toBeVisible();
  await expect(page.getByTestId("flyer-canvas").getByText("Pão de queijo")).toBeVisible();
});

test("preserva ordem da lista quando fotos chegam fora de ordem e uma falha", async ({ page }) => {
  await login(page);
  await page.locator("a[href^='/editor/']").first().click();
  let requestIndex = 0;
  await page.route("**/api/products/*/find-image", async route => {
    const index = requestIndex++;
    if (index === 0) await new Promise(resolve => setTimeout(resolve, 500));
    await route.fulfill({ status: index === 1 ? 502 : 200, contentType: "application/json", body: JSON.stringify(index === 1
      ? { error: "Catálogo temporariamente indisponível" }
      : { success: true, product: { image: PIXEL_IMAGE } }) });
  });
  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  await page.getByLabel("Lista de produtos").fill("Primeiro item 9,90\nSegundo item 5,90\nTerceiro item 3,90");
  await page.getByRole("button", { name: "Buscar fotos" }).click();
  await expect(page.getByText(/3 produtos adicionados/)).toBeVisible();
  await expect(page.getByText(/1 produto\(s\) sem foto/)).toBeVisible();
  const cards = page.getByTestId("flyer-canvas").locator("[data-testid^='product-']");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Primeiro item");
  await expect(cards.nth(1)).toContainText("Segundo item");
  await expect(cards.nth(2)).toContainText("Terceiro item");
});
