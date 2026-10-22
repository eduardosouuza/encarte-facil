import { readdir, readFile, writeFile } from "node:fs/promises";
const root = new URL("../docs/evidencias/public-bundle/", import.meta.url);
const records = [];
for (const file of await readdir(root)) {
  if (!file.endsWith(".js")) continue;
  const source = await readFile(new URL(file, root), "utf8");
  const endpoints = [...source.matchAll(/this\.(get|post|put|patch|delete)\((["'`])([^"'`]+)\2/g)]
    .map(m => ({ method: m[1].toUpperCase(), path: m[3], offset: m.index }));
  const labels = [...new Set([...source.matchAll(/(?:label|title|placeholder):"([^"]{3,150})"/g)].map(m => m[1]))];
  if (endpoints.length || labels.length) records.push({ file, endpoints, labels });
}
await writeFile(new URL("../public-bundle-inventory.json", root), JSON.stringify(records, null, 2));
console.log(JSON.stringify(records.filter(x => x.endpoints.length), null, 2));
