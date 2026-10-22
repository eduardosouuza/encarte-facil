import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const base = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins/3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f/assets";
const files = readdirSync(base).filter((f) => f.endsWith(".js"));

const rows = [];
for (const f of files) {
  const src = readFileSync(path.join(base, f), "utf8");
  const push = (verb, p, ctx, kind) => {
    const after = src.slice(ctx, ctx + 260);
    const respField = (after.match(/\.data\.([A-Za-z0-9_$]+)/) || [])[1] || (after.match(/\.data\b/) ? "(data)" : "");
    const rawField = (after.match(/\)\.([A-Za-z0-9_$]+)\b/) || [])[1] || "";
    const bodyKeys = [...after.matchAll(/JSON\.stringify\(\{([^}]{0,120})\}\)/g)].map((m) => m[1].trim());
    const query = [...src.slice(Math.max(0, ctx - 400), ctx).matchAll(/\.append\(\s*"([^"]+)"/g)].map((m) => m[1]);
    const params = [...after.matchAll(/params:\{([^}]{0,160})\}/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
    rows.push({ file: f, verb, path: p, kind, respField, rawField, bodyKeys, query, params });
  };
  for (const m of src.matchAll(/(?:this|super)\.(get|post|put|patch|delete)\s*\(\s*(`[^`]*`|"[^"]*")/g)) {
    push(m[1].toUpperCase(), m[2].replace(/^[`"']|[`"']$/g, ""), m.index + m[0].length, "client");
  }
  for (const m of src.matchAll(/fetch\(\s*[A-Za-z0-9_$]+\(\s*(`[^`]*`|"[^"]*")\s*\)\s*,\s*\{/g)) {
    const seg = src.slice(m.index, m.index + 200);
    const verb = (seg.match(/method:"([A-Z]+)"/) || [])[1] || "GET";
    push(verb, m[1].replace(/^[`"']|[`"']$/g, ""), m.index + m[0].length, "fetch");
  }
}

const uniq = new Map();
for (const r of rows) {
  const key = r.verb + " " + r.path;
  if (!uniq.has(key)) uniq.set(key, { ...r, occurrences: 0, query: [...new Set(r.query)], params: [...new Set(r.params)] });
  const u = uniq.get(key);
  u.occurrences++;
  u.query = [...new Set([...u.query, ...r.query])];
  u.params = [...new Set([...u.params, ...r.params])];
  if (!u.bodyKeys.length) u.bodyKeys = r.bodyKeys;
  if (!u.respField) u.respField = r.respField;
  if (!u.rawField) u.rawField = r.rawField;
}

const list = [...uniq.values()].sort((a, b) => (a.path + a.verb).localeCompare(b.path + b.verb));
writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/endpoints-final.json", JSON.stringify(list, null, 2));
console.log("unique endpoints:", list.length);
for (const e of list) {
  console.log(`${e.verb.padEnd(6)} ${e.path.padEnd(42)} file=${e.file} resp=${e.respField || e.rawField || "-"} q=[${e.query.join(",")}] p=[${e.params.join("|")}] body=[${e.bodyKeys.join("|")}]`);
}
