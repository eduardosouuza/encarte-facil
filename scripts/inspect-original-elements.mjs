import { readFile, mkdir, writeFile } from "node:fs/promises";
const base = "https://api-v2.encartefacil.com";
const text = await readFile(new URL("../loginencartefacil.md", import.meta.url), "utf8");
const email = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
const password = text.split(/\r?\n/).find(line => /^senha\s+/i.test(line))?.replace(/^senha\s+/i, "").trim();
let token;
for (const candidate of [...new Set([password, password?.replace(/\s+/g, ""), password?.replace(/\s+[A-Za-z]$/, "")])]) {
  const response = await fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: candidate }) });
  const body = await response.json();
  if (response.ok && body.token) { token = body.token; break; }
}
if (!token) throw new Error("Login recusado");
await mkdir(".work/original-elements", { recursive: true });
for (const endpoint of ["/elements?limit=100", "/elements?category=3d&limit=100", "/elements?category=background&limit=100", "/elements?category=photos&limit=100", "/elements?category=decorative&limit=100", "/elements?category=tags&limit=100"]) {
  const response = await fetch(`${base}${endpoint}`, { headers: { authorization: `Bearer ${token}` } });
  const body = await response.text();
  const name = endpoint.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  await writeFile(`.work/original-elements/${name}.txt`, body);
  console.log(JSON.stringify({ endpoint, status: response.status, type: response.headers.get("content-type"), sample: body.slice(0, 900) }));
}
