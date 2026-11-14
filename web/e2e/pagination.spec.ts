import { expect, test } from "@playwright/test";

test("pagina o encarte e preserva folhas ao salvar e exportar", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL ?? "demo@encartefacil.com");
  await page.getByLabel("Senha").fill(process.env.E2E_PASSWORD ?? "demo12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/flyers");
  const token = await page.evaluate(() => localStorage.getItem("@encartefacil:token"));
  const headers = { Authorization: `Bearer ${token}` };
  const response = await page.request.post("/api/flyers", { headers, data: {
    name: "QA folhas", format: "vertical",
    products: Array.from({ length: 14 }, (_, index) => ({ id: `qa${index}`, name: `Produto ${index}`, price: 19.99, salePrice: 9.99, unit: "un", x: 0, y: 0, width: 100, height: 100 })),
  } });
  const { flyer } = await response.json();
  await page.goto(`/editor/${flyer._key}`);
  await page.getByRole("button", { name: "Configurar grade", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Quantidade máxima por página" })).toHaveValue("16");
  await page.getByRole("button", { name: "Grade 4 × 5 destaque featured-right", exact: true }).click();
  await expect(page.getByRole("button", { name: "Grade 4 × 5 destaque featured-right", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Grade 4 × 4 regular", exact: true }).click();
  await page.screenshot({ path: "test-results/grid-reference.png" });
  await page.getByLabel("Produtos por folha").fill("6");
  await expect(page.getByText("Folha 1 de 3", { exact: true })).toBeVisible();
  await expect(page.getByTestId("flyer-canvas").locator('[data-testid^="product-"]')).toHaveCount(6);
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.getByTestId("flyer-canvas").locator('[data-testid^="product-"]')).toHaveCount(2);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Salvo$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Folha 1 de 3", { exact: true })).toBeVisible();
  const saved = await (await page.request.get(`/api/flyers/${flyer._key}`, { headers })).json();
  expect(saved.flyer.grid.productsPerPage).toBe(6);
  expect(saved.flyer.products[0].width).toBe(saved.flyer.products[12].width);
  saved.flyer.products[0].x += 7;
  await page.request.put(`/api/flyers/${flyer._key}`, { headers, data: { products: saved.flyer.products } });
  await page.reload();
  await expect(page.getByTestId("product-qa0")).toHaveCSS("left", `${saved.flyer.products[0].x}px`);
  const exported = await (await page.request.post(`/api/flyers/${flyer._key}/render`, { headers, data: { format: "svg" } })).json();
  expect(exported.export.files).toHaveLength(3);
  const last = await (await page.request.get(exported.export.files[2], { headers })).text();
  expect(last).toContain("Produto 12");
  expect(last).not.toContain("Produto 0");
  for (const format of ["png", "jpeg"]) {
    const result = await page.request.post(`/api/flyers/${flyer._key}/render`, { headers, data: { format } });
    expect(result.ok()).toBeTruthy();
    expect((await result.json()).export.files).toHaveLength(3);
  }
  const pdf = await (await page.request.post(`/api/flyers/${flyer._key}/render`, { headers, data: { format: "pdf" } })).json();
  const bytes = await (await page.request.get(pdf.export.fileUrl, { headers })).body();
  expect(bytes.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(3);
  await page.getByRole("button", { name: "Configurar grade", exact: true }).click();
  await page.screenshot({ path: "test-results/pagination.png" });
  await page.request.delete(`/api/flyers/${flyer._key}`, { headers });
});
