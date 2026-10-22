import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const assetsRoot = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins/3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f/assets";
const files = readdirSync(assetsRoot).filter((f) => f.endsWith(".js"));

function classBody(src, startIdx) {
  // startIdx points at "class"
  let i = src.indexOf("{", startIdx);
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "{") { depth++; started = true; }
    else if (c === "}") { depth--; if (started && depth === 0) return { body: src.slice(startIdx, j + 1), end: j + 1 }; }
  }
  return null;
}

const services = [];
const plainFetches = [];

for (const f of files) {
  const src = readFileSync(path.join(assetsRoot, f), "utf8");
  // local alias for base client: import{K as X} from "./index-KJ2_zNqK.js"
  const aliases = new Set(["Nc"]);
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.\/index-KJ2_zNqK\.js"/g)) {
    for (const part of m[1].split(",")) {
      const mm = part.trim().match(/^K\s+as\s+([A-Za-z0-9_$]+)$/);
      if (mm) aliases.add(mm[1]);
      const mm2 = part.trim().match(/^([A-Za-z0-9_$]+)\s+as\s+K$/);
      if (mm2) aliases.add(mm2[1]);
    }
  }
  for (const m of src.matchAll(/class\s+([A-Za-z0-9_$]+)\s+extends\s+([A-Za-z0-9_$]+)/g)) {
    if (!aliases.has(m[2])) continue;
    const cb = classBody(src, m.index);
    if (!cb) continue;
    services.push({ file: f, className: m[1], base: m[2], body: cb.body });
  }
  // direct fetch( calls
  for (const m of src.matchAll(/fetch\s*\(/g)) {
    const seg = src.slice(m.index, m.index + 260);
    plainFetches.push({ file: f, index: m.index, snippet: seg });
  }
}

// Extract per-method HTTP calls inside service bodies
const endpoints = [];
for (const s of services) {
  const methods = [];
  for (const m of s.body.matchAll(/async\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/g)) {
    // capture the method body
    const cb = classBody(s.body, m.index + m[0].length - 1);
    if (!cb) continue;
    const body = cb.body;
    const calls = [];
    for (const c of body.matchAll(/(?:this|super)\.(get|post|put|patch|delete)\s*\(\s*(`[^`]*`|"[^"]*"|'[^']*')([^;]*)/g)) {
      calls.push({
        verb: c[1].toUpperCase(),
        path: c[2].replace(/^[`"']|[`"']$/g, ""),
        rest: c[3].replace(/\s+/g, " ").slice(0, 220),
      });
    }
    for (const c of body.matchAll(/fetch\s*\(\s*([A-Za-z0-9_$]+)\s*\(\s*(`[^`]*`|"[^"]*")\s*\)\s*,\s*\{([^}]*)\}/g)) {
      calls.push({ verb: (c[3].match(/method:"([A-Z]+)"/) || [])[1] || "?", path: c[2].replace(/^[`"']|[`"']$/g, ""), rest: c[3].replace(/\s+/g, " ").slice(0, 220) });
    }
    methods.push({ name: m[1], params: m[2], calls });
  }
  endpoints.push({ file: s.file, className: s.className, base: s.base, methods });
}

writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/api-services.json", JSON.stringify(endpoints, null, 2));
writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/plain-fetches.json", JSON.stringify(plainFetches, null, 2));
console.log("services:", services.length, "endpoints-groups:", endpoints.length, "plainFetches:", plainFetches.length);
for (const s of services) console.log(" -", s.file, s.className, "extends", s.base, "len", s.body.length);
