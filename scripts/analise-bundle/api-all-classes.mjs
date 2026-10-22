import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const assetsRoot = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins/3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f/assets";
const files = readdirSync(assetsRoot).filter((f) => f.endsWith(".js"));

function blockEnd(src, from) {
  let i = src.indexOf("{", from);
  if (i < 0) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "{") { depth++; started = true; }
    else if (c === "}") { depth--; if (started && depth === 0) return j + 1; }
  }
  return null;
}

const groups = [];
for (const f of files) {
  const src = readFileSync(path.join(assetsRoot, f), "utf8");
  for (const m of src.matchAll(/class\s+([A-Za-z0-9_$]+)\s+extends\s+([A-Za-z0-9_$]+)\s*\{/g)) {
    const end = blockEnd(src, m.index);
    if (!end) continue;
    const body = src.slice(m.index, end);
    const calls = [];
    for (const c of body.matchAll(/(?:this|super)\.(get|post|put|patch|delete)\s*\(\s*(`[^`]*`|"[^"]*"|'[^']*')([^;]{0,200})/g)) {
      calls.push({ verb: c[1].toUpperCase(), path: c[2].replace(/^[`"']|[`"']$/g, ""), args: c[3].replace(/\s+/g, " ").slice(0, 200) });
    }
    for (const c of body.matchAll(/fetch\s*\(\s*([A-Za-z0-9_$]+)\s*\(\s*(`[^`]*`|"[^"]*")\s*\)\s*,\s*\{([^}]{0,300})\}/g)) {
      calls.push({ verb: (c[3].match(/method:"([A-Z]+)"/) || [])[1] || "POST?", path: c[2].replace(/^[`"']|[`"']$/g, ""), args: c[3].replace(/\s+/g, " ").slice(0, 200) });
    }
    if (calls.length) {
      groups.push({ file: f, className: m[1], base: m[2], calls });
    }
  }
}

writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/api-all-classes.json", JSON.stringify(groups, null, 2));
console.log("groups with http calls:", groups.length);
let total = 0;
for (const g of groups) { console.log(`\n### ${g.file} :: class ${g.className} extends ${g.base}`); total += g.calls.length; for (const c of g.calls) console.log(`   ${c.verb.padEnd(6)} ${c.path}   || ${c.args.slice(0, 120)}`); }
console.log("\ntotal calls:", total);
