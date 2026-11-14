import { expect, test } from "@playwright/test";

test("busca fotos do catálogo original, permite escolher e mantém após recarregar", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL ?? "demo@encartefacil.com");
  await page.getByLabel("Senha").fill(process.env.E2E_PASSWORD ?? "demo12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/flyers");
  const token = await page.evaluate(() => localStorage.getItem("@encartefacil:token"));
  const headers = { Authorization: `Bearer ${token}` };
  const name = `Arroz QA foto ${Date.now()}`;
  const created = await page.request.post("/api/products", { headers, data: { name, price: 12.9 } });
  expect(created.ok()).toBeTruthy();
  const { product } = await created.json();
  try {
    await page.goto("/products");
    await page.getByRole("textbox", { name: "Buscar produtos" }).fill(name);
    await page.getByRole("button", { name: `Escolher foto de ${name}`, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome ou marca para buscar foto").fill("Arroz");
    await dialog.getByRole("button", { name: "Buscar imagens" }).click();
    const candidate = dialog.getByRole("button", { name: /^Usar foto:/ }).first();
    await expect(candidate).toBeVisible({ timeout: 40_000 });
    await expect(candidate).toContainText("Catálogo Encarte Fácil");
    await expect.poll(() => candidate.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: "test-results/product-image-catalog.png", fullPage: true });
    await candidate.click();
    await expect(dialog).toHaveCount(0);
    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row.locator("img")).toHaveAttribute("src", /^\/api\/assets\//);
    const savedUrl = await row.locator("img").getAttribute("src");
    await page.reload();
    await page.getByRole("textbox", { name: "Buscar produtos" }).fill(name);
    await expect(row.locator("img")).toHaveAttribute("src", savedUrl!);
    await expect.poll(() => row.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  } finally { await page.request.delete(`/api/products/${product._key}`, { headers }); }
});
