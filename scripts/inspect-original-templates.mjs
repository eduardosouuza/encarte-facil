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
const output = ".work/original-templates";
await mkdir(output, { recursive: true });
async function get(endpoint, name) {
  const response = await fetch(`${base}${endpoint}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
  const data = await response.json();
  await writeFile(`${output}/${name}.json`, JSON.stringify(data, null, 2));
  console.log(JSON.stringify({ endpoint, count: data.designs?.length ?? (Array.isArray(data) ? data.length : undefined), keys: Object.keys(data).slice(0, 15) }));
  return data;
}
const listing = await get("/designs?limit=100&offset=0&locale=pt-br&status=approved&archived=false", "designs");
await get("/designs/by-theme?locale=pt-br", "by-theme");
for (const design of (listing.designs ?? []).slice(0, 3)) await get(`/designs/${encodeURIComponent(design._key)}?locale=pt-br`, `design-${design._key}`);
if (process.argv.includes("--inventory")) {
  const all = [...listing.designs];
  for (let offset = 100; offset < 10000; offset += 100) {
    const page = await get(`/designs?limit=100&offset=${offset}&locale=pt-br&status=approved&archived=false`, `page-${offset}`);
    all.push(...page.designs);
    if (page.designs.length < 100) break;
  }
  await writeFile(`${output}/inventory.json`, JSON.stringify(all, null, 2));
  const categories = {};
  for (const design of all) categories[design.category] = (categories[design.category] ?? 0) + 1;
  console.log(JSON.stringify({ total: all.length, categories }));
}
