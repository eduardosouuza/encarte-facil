import { readFile, mkdir, writeFile } from "node:fs/promises";

const base = "https://api-v2.encartefacil.com";
const credentials = await readFile(new URL("../loginencartefacil.md", import.meta.url), "utf8");
const email = credentials.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
const password = credentials.split(/\r?\n/).find(line => /^senha\s+/i.test(line))?.replace(/^senha\s+/i, "").trim();
let token;
for (const candidate of [...new Set([password, password?.replace(/\s+/g, ""), password?.replace(/\s+[A-Za-z]$/, "")])]) {
  const response = await fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: candidate }), signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (response.ok && body.token) { token = body.token; break; }
  if (response.status !== 401) throw new Error(`Login HTTP ${response.status}`);
}
if (!token) throw new Error("Login recusado");
await mkdir(".work/product-images", { recursive: true });
for (const term of ["Arroz", "Leite", "Coca Cola 2l"]) {
  const response = await fetch(`${base}/products/search-images`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ term }), signal: AbortSignal.timeout(45000) });
  const body = await response.text();
  await writeFile(`.work/product-images/${term.replace(/ /g, "-")}.txt`, body);
  console.log(JSON.stringify({ term, status: response.status, type: response.headers.get("content-type"), sample: body.slice(0, 5500) }));
}
