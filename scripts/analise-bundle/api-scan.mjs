import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins";
const assetsRoot = path.join(root, "3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f", "assets");

const files = readdirSync(assetsRoot).filter((f) => f.endsWith(".js"));
const contents = new Map();
for (const f of files) contents.set(f, readFileSync(path.join(assetsRoot, f), "utf8"));

const out = { baseUrls: new Set(), httpCalls: [], classDefs: [], storageKeys: new Set(), rtkEndpoints: [], externalHosts: new Set() };

const httpCallRe = /(?:this\.|\b)(get|post|put|patch|del|delete|head)\s*\(\s*(`[^`]*`|"[^"]*"|'[^']*')/g;
const fetchRe = /fetch\s*\(\s*([^,]{0,120}),/g;
const templateCallRe = /(?:this\.|\b)(get|post|put|patch|del|delete)\s*\(\s*`([^`]*)`/g;

for (const [f, src] of contents) {
  // base urls / hosts
  for (const m of src.matchAll(/https?:\/\/[a-zA-Z0-9._-]+(?::\d+)?/g)) out.externalHosts.add(m[0]);
  // storage keys
  for (const m of src.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*([`"'][^`"']*[`"'])/g)) out.storageKeys.add(m[1]);
  // http method calls with literal path
  for (const m of src.matchAll(httpCallRe)) {
    out.httpCalls.push({ file: f, method: m[1].toUpperCase(), path: m[2].replace(/^`|`$/g, "").replace(/^"|"$/g, "") });
  }
  // rtk query endpoints: url: t => `...`
  for (const m of src.matchAll(/url:\s*\(?[^)]*\)?\s*=>\s*(`[^`]*`|"[^"]*")/g)) {
    out.rtkEndpoints.push({ file: f, url: m[1] });
  }
  for (const m of src.matchAll(/\bquery:\s*\(?[^)]*\)?\s*=>\s*`([^`]*)`/g)) {
    out.rtkEndpoints.push({ file: f, query: m[1] });
  }
}

const seen = new Set();
out.httpCalls = out.httpCalls.filter((c) => {
  const k = c.method + " " + c.path + " " + c.file;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

out.baseUrls = [...out.externalHosts].sort();
out.storageKeys = [...out.storageKeys].sort();
writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/api-scan.json", JSON.stringify(out, null, 2));
console.log("files:", files.length);
console.log("httpCalls:", out.httpCalls.length);
console.log("rtkEndpoints:", out.rtkEndpoints.length);
console.log("hosts:", out.baseUrls.join(" | "));
console.log("storageKeys:", out.storageKeys.join(" | "));
