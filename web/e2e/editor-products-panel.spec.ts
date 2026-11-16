import { expect, test } from "@playwright/test";

test("edita produtos nos cartões do painel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL ?? "demo@encartefacil.com");
  await page.getByLabel("Senha").fill(process.env.E2E_PASSWORD ?? "demo12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/flyers");
  const token = await page.evaluate(() => localStorage.getItem("@encartefacil:token"));
  const headers = { Authorization: `Bearer ${token}` };
  const response = await page.request.post("/api/flyers", { headers, data: { name: "QA painel produtos", format: "vertical", products: ["Alface Lisa e Crespa", "Batata Branca pacote", "Batata Doce Branca pacote", "Couve Verde"].map((name, index) => ({ id: `qa${index}`, name, price: 4.95, unit: "un", x: 0, y: 0, width: 150, height: 200 })) } });
  const { flyer } = await response.json();
  try {
    await page.goto(`/editor/${flyer._key}`);
    await page.getByRole("button", { name: "Produtos", exact: true }).first().click();
    const panel = page.getByTestId("editor-products-panel");
    await expect(panel.getByRole("tab", { name: "Buscar" })).toHaveAttribute("aria-selected", "true");
    await expect(panel.locator('[data-testid^="product-card-"]')).toHaveCount(4);
    await panel.getByLabel("Preço de Alface Lisa e Crespa", { exact: true }).fill("1,45");
    await panel.getByLabel("Unidade de Alface Lisa e Crespa").selectOption("kg");
    await panel.getByRole("button", { name: "Reordenar Batata Branca pacote" }).press("ArrowUp");
    await expect(panel.locator('[data-testid^="product-card-"]').first()).toHaveAttribute("data-testid", "product-card-qa1");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Salvo$/ })).toBeVisible();
    const saved = await (await page.request.get(`/api/flyers/${flyer._key}`, { headers })).json();
    expect(saved.flyer.products.find((product: { id: string }) => product.id === "qa0")).toMatchObject({ price: 1.45, unit: "kg" });
    await panel.screenshot({ path: "test-results/products-reference-layout.png" });
    await panel.getByRole("button", { name: "Ações de Couve Verde" }).click();
    await page.getByRole("menuitem", { name: "Remover produto" }).click();
    await expect(panel.locator('[data-testid^="product-card-"]')).toHaveCount(3);
  } finally { await page.request.delete(`/api/flyers/${flyer._key}`, { headers }); }
});
