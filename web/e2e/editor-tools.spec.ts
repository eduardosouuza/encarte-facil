import { expect, test } from "@playwright/test";

test("ferramentas editam texto e miniaturas navegam entre páginas", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL ?? "demo@encartefacil.com");
  await page.getByLabel("Senha").fill(process.env.E2E_PASSWORD ?? "demo12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/flyers");
  const token = await page.evaluate(() => localStorage.getItem("@encartefacil:token"));
  const headers = { Authorization: `Bearer ${token}` };
  const response = await page.request.post("/api/flyers", { headers, data: {
    name: "QA ferramentas", format: "vertical",
    products: Array.from({ length: 17 }, (_, index) => ({ id: `tool-${index}`, name: `Produto ${index}`, price: 9.99, x: 0, y: 0, width: 100, height: 100 })),
  } });
  const { flyer } = await response.json();
  try {
    await page.goto(`/editor/${flyer._key}`);
    const toolbar = page.getByRole("toolbar", { name: "Ferramentas do encarte" });
    await toolbar.getByRole("button", { name: "Texto", exact: true }).click();
    await page.getByRole("button", { name: "Adicionar texto", exact: true }).click();
    await page.getByLabel("Texto", { exact: true }).first().fill("Oferta da semana");
    await toolbar.getByRole("button", { name: "Fontes", exact: true }).click();
    await page.getByLabel("Fonte", { exact: true }).first().selectOption("Georgia");
    await toolbar.getByRole("button", { name: "Cores", exact: true }).click();
    await page.getByRole("button", { name: "Fundo Amarelo", exact: true }).click();
    await expect(page.getByTestId("flyer-canvas")).toHaveCSS("background-color", "rgb(234, 179, 8)");
    await page.getByRole("button", { name: "Visualizar página 2", exact: true }).click();
    await expect(page.getByText("Folha 2 de 2", { exact: true })).toBeVisible();
    await expect(page.getByTestId("product-tool-16")).toBeVisible();
    await expect(page.getByTestId("product-tool-0")).toHaveCount(0);
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /^Salvo$/ })).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("flyer-canvas").getByText("Oferta da semana")).toHaveCSS("font-family", "Georgia");
    await page.screenshot({ path: "test-results/editor-tools-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Fechar painel", exact: true }).click();
    await page.getByRole("button", { name: "Visualizar página 2", exact: true }).click();
    await expect(page.getByTestId("product-tool-16")).toBeVisible();
    await page.screenshot({ path: "test-results/editor-tools-mobile.png" });
  } finally { await page.request.delete(`/api/flyers/${flyer._key}`, { headers }); }
});
