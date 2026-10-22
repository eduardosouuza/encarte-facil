import { expect, test, type Page } from "@playwright/test";

const CREDENTIALS = {
  email: process.env.E2E_EMAIL ?? "demo@encartefacil.com",
  password: process.env.E2E_PASSWORD ?? "demo12345",
};

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(CREDENTIALS.email);
  await page.getByLabel("Senha").fill(CREDENTIALS.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/flyers");
}

async function abrirEditor(page: Page) {
  await login(page);
  await page.locator("a[href^='/editor/']").first().click();
  await expect(page.getByTestId("flyer-canvas")).toBeVisible();
}

async function lerDownload(page: Page, download: import("@playwright/test").Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test("exporta PDF real pelo editor", async ({ page }) => {
  await abrirEditor(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar" }).click();
  await page.getByRole("menuitem", { name: "PDF", exact: true }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const bytes = await lerDownload(page, download);
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
});

test("salva modelo próprio, reaproveita e exclui na página Modelos", async ({ page }) => {
  await abrirEditor(page);

  const navigation = page.locator('nav[aria-label="Seções do editor"]:visible');
  await navigation.getByRole("button", { name: "Encartes", exact: true }).click();
  await page.getByRole("button", { name: "Salvar modelo" }).click();
  await expect(page.getByText(/Modelo salvo/)).toBeVisible();

  await page.goto("/designs");
  await expect(page.getByRole("heading", { level: 2, name: "Modelos", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meus modelos", exact: true })).toBeVisible();

  const antes = await page.getByRole("button", { name: "Excluir modelo" }).count();
  expect(antes).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Usar meu modelo" }).first().click();
  await page.waitForURL("**/editor/**");
  await expect(page.getByTestId("flyer-canvas")).toBeVisible();

  await page.goto("/designs");
  await page.getByRole("button", { name: "Excluir modelo" }).first().click();
  await expect(page.getByRole("button", { name: "Excluir modelo" })).toHaveCount(antes - 1);
});
