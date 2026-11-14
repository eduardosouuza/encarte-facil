import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL ?? "demo@encartefacil.com");
  await page.getByLabel("Senha").fill(process.env.E2E_PASSWORD ?? "demo12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/flyers");
});

test("temas e elementos mantêm formas após salvar e reabrir", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const token = await page.evaluate(() => localStorage.getItem("@encartefacil:token"));
  const headers = { Authorization: `Bearer ${token}` };
  const result = await page.request.post("/api/flyers", { headers, data: { name: "QA catálogo", format: "vertical" } });
  expect(result.ok()).toBeTruthy();
  const { flyer } = await result.json();
  await page.goto(`/editor/${flyer._key}`);
  await page.getByRole("textbox", { name: "Buscar temas" }).fill("pascoa");
  await page.getByTitle("Páscoa Doce", { exact: true }).click();
  await expect(page.getByTestId("flyer-canvas").getByText("UMA PÁSCOA MAIS DOCE")).toBeVisible();
  const circles = await page.getByTestId("flyer-canvas").locator("ellipse").count();
  await page.locator('nav[aria-label="Seções do editor"]:visible').getByRole("button", { name: "Elementos", exact: true }).click();
  await page.getByRole("textbox", { name: "Buscar elementos" }).fill("circulo");
  await page.getByRole("button", { name: "Círculo Formas" }).click();
  await expect(page.getByTestId("flyer-canvas").locator("ellipse")).toHaveCount(circles + 1);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Salvo$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("flyer-canvas").locator("ellipse")).toHaveCount(circles + 1);
  await page.screenshot({ path: "test-results/catalog-editor.png", fullPage: true });
  await page.request.delete(`/api/flyers/${flyer._key}`, { headers });
});

test("cadastro aceita preço brasileiro e impede promoção inválida", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("button", { name: "Novo produto" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Café QA com acento");
  await page.getByLabel("Preco (R$)", { exact: true }).fill("1.234,56");
  await page.getByLabel("Preco promocional", { exact: true }).fill("inválido");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Informe um preço promocional válido", { exact: true })).toBeVisible();
  await page.getByLabel("Preco promocional", { exact: true }).fill("999,90");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Buscar produtos" }).fill("cafe qa");
  const row = page.getByRole("row").filter({ hasText: "Café QA com acento" }).last();
  await expect(row).toContainText("1.234,56");
  await expect(row).toContainText("999,90");
  await row.getByRole("button", { name: "Excluir", exact: true }).click();
});
