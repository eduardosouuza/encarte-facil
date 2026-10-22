import { chromium } from "playwright";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = new URL("../.work/original-ui/", import.meta.url);
const rootPath = fileURLToPath(root);
await mkdir(root, { recursive: true });
const credentialText = await readFile(new URL("../loginencartefacil.md", import.meta.url), "utf8");
const email = credentialText.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
const rawPassword = credentialText.split(/\r?\n/).find((line) => /^senha\s+/i.test(line))?.replace(/^senha\s+/i, "").trim();
if (!email || !rawPassword) throw new Error("Credenciais locais não encontradas.");
const candidates = [...new Set([rawPassword, rawPassword.replace(/\s+/g, ""), rawPassword.replace(/\s+[A-Za-z]$/, "")])];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "pt-BR" });
const page = await context.newPage();
const endpoints = new Set();
page.on("response", (response) => {
  const url = new URL(response.url());
  if (url.hostname === "api-v2.encartefacil.com") endpoints.add(`${response.request().method()} ${url.pathname} ${response.status()}`);
});

await page.goto("https://editor.encartefacil.com/login", { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(rootPath, "login.png"), fullPage: true });
const loginStyles = await page.evaluate(() => {
  const form = document.querySelector("form");
  const button = document.querySelector("button");
  const body = getComputedStyle(document.body);
  const buttonStyle = button ? getComputedStyle(button) : null;
  const rect = form?.getBoundingClientRect();
  return {
    title: document.title,
    headings: [...document.querySelectorAll("h1,h2,h3")].map((node) => node.textContent?.trim()).filter(Boolean),
    labels: [...document.querySelectorAll("label")].map((node) => node.textContent?.trim()).filter(Boolean),
    body: { background: body.background, color: body.color, fontFamily: body.fontFamily },
    form: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
    button: buttonStyle ? { background: buttonStyle.background, color: buttonStyle.color, borderRadius: buttonStyle.borderRadius, height: buttonStyle.height } : null,
  };
});

let authenticated = false;
for (const password of candidates) {
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.getByRole("button", { name: /entrar|login|acessar/i }).click();
  await page.waitForTimeout(700);
  if (!/\/login(?:$|[?#])/.test(new URL(page.url()).pathname)) { authenticated = true; break; }
}

const report = { authenticated, currentUrl: page.url(), loginStyles, endpoints: [...endpoints], pages: [] };
if (authenticated) {
  const links = await page.locator('a[href^="/"]').evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute("href")).filter(Boolean))]);
  for (const href of links.filter((href) => !href.startsWith("/admin")).slice(0, 40)) {
    await page.goto(new URL(href, "https://editor.encartefacil.com").href, { waitUntil: "networkidle" });
    const slug = href.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-") || "home";
    await page.screenshot({ path: path.join(rootPath, `${slug}.png`), fullPage: true });
    report.pages.push({ href, title: await page.title(), headings: await page.locator("h1,h2,h3").allTextContents(), buttons: await page.getByRole("button").allTextContents() });
  }
}
await writeFile(new URL("report.json", root), JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify({ authenticated, currentUrl: report.currentUrl, pageCount: report.pages.length, endpointCount: report.endpoints.length, output: ".work/original-ui" }));
