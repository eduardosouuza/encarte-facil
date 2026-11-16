import { expect, test } from "@playwright/test";

test("recolhe painéis, ajusta zoom e mantém o encarte acessível", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL ?? "demo@encartefacil.com");
  await page.getByLabel("Senha").fill(process.env.E2E_PASSWORD ?? "demo12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/flyers");
  const token = await page.evaluate(() => localStorage.getItem("@encartefacil:token"));
  const headers = { Authorization: `Bearer ${token}` };
  const response = await page.request.post("/api/flyers", { headers, data: { name: "QA zoom e painéis", format: "vertical" } });
  const { flyer } = await response.json();
  try {
    await page.goto(`/editor/${flyer._key}`);
    const viewport = page.getByTestId("canvas-viewport");
    const canvas = page.getByTestId("flyer-canvas");
    await expect(canvas).toBeVisible();
    await page.getByRole("button", { name: "Ocultar menu principal" }).click();
    await expect(page.getByRole("button", { name: "Mostrar menu principal" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Mostrar menu principal" })).toBeVisible();
    await page.getByRole("button", { name: "Mostrar menu principal" }).click();
    await expect(page.getByRole("button", { name: "Ocultar menu principal" })).toBeVisible();
    const initialWidth = (await viewport.boundingBox())!.width;
    await page.getByRole("button", { name: "Recolher painéis", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Propriedades do objeto" })).toHaveCount(0);
    await expect.poll(async () => (await viewport.boundingBox())!.width).toBeGreaterThan(initialWidth + 300);
    await page.getByRole("button", { name: "Zoom 100%", exact: true }).click();
    await expect(page.getByRole("slider", { name: "Nível de zoom" })).toHaveValue("100");
    await page.getByRole("button", { name: "Aumentar zoom", exact: true }).click();
    await expect(page.getByRole("slider", { name: "Nível de zoom" })).toHaveValue("110");
    await expect.poll(async () => {
      const box = (await canvas.boundingBox())!;
      const view = (await viewport.boundingBox())!;
      return box.x >= view.x;
    }).toBe(true);
    await page.getByRole("button", { name: "Ajustar", exact: true }).click();
    await expect.poll(async () => {
      const box = (await canvas.boundingBox())!;
      const view = (await viewport.boundingBox())!;
      return box.width <= view.width && box.height <= view.height;
    }).toBe(true);
    await page.screenshot({ path: "test-results/editor-workspace.png" });
    await page.getByRole("button", { name: "Expandir propriedades" }).click();
    await expect(page.getByRole("complementary", { name: "Propriedades do objeto" })).toBeVisible();
    await page.getByRole("button", { name: "Abrir biblioteca" }).click();
    await expect(page.getByRole("button", { name: "Fechar painel", exact: true })).toBeVisible();
  } finally { await page.request.delete(`/api/flyers/${flyer._key}`, { headers }); }
});
