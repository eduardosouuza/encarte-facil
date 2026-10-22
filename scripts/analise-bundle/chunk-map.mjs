import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const base = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins/3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f/assets";
const files = readdirSync(base).filter((f) => f.endsWith(".js"));

// 1) dynamic imports referenced by every chunk
const referenced = new Map(); // chunk name -> Set of imported chunk names
const allRefs = new Set();
for (const f of files) {
  const src = readFileSync(path.join(base, f), "utf8");
  const set = new Set();
  for (const m of src.matchAll(/import\(\s*"\.\/([^"]+\.js)"\s*\)/g)) {
    set.add(m[1]);
    allRefs.add(m[1]);
  }
  for (const m of src.matchAll(/from"\.\/([^"]+\.js)"/g)) set.add(m[1]);
  referenced.set(f, set);
}

const exported = new Set(files);
const missing = [...allRefs].filter((r) => !exported.has(r)).sort();

console.log("exported chunks:", exported.size);
console.log("distinct chunk refs:", allRefs.size);
console.log("referenced but NOT exported:", missing.length);
for (const m of missing) console.log("  -", m);

// 2) per-chunk characterization
const char = [];
for (const f of files) {
  const src = readFileSync(path.join(base, f), "utf8");
  const imports = [...referenced.get(f)].filter((x) => x !== f);
  const apiPaths = new Set();
  for (const m of src.matchAll(/(?:this|super)\.(?:get|post|put|patch|delete)\(\s*[`"'](\/[^`'"]+)/g)) apiPaths.add(m[1]);
  for (const m of src.matchAll(/fetch\(\s*[A-Za-z0-9_$]+\(\s*[`"'](\/[^`'"]+)/g)) apiPaths.add(m[1]);
  const isVendor = /lucide-react|react-dom|@license|createElement\(/.test(src) && src.length < 50000 && apiPaths.size === 0;
  char.push({
    file: f,
    bytes: Buffer.byteLength(src),
    imports,
    apiPaths: [...apiPaths],
    hasRouter: /createBrowserRouter|createRoutesFromElements|path:"\//.test(src),
    hasTracking: /marketing\/track|eventType/.test(src),
    hasReactVendor: /react\.production\.min\.js|react-dom\.production|scheduler\.production/.test(src),
    lucide: /lucide-react/.test(src),
  });
}
writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/chunk-map.json", JSON.stringify({ missing, chunks: char }, null, 2));
console.log("\nchunks with api paths:");
for (const c of char) if (c.apiPaths.length) console.log(" ", c.file, c.apiPaths.length, "paths");
