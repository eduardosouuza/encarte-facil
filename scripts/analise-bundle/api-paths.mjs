import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const assetsRoot = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins/3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f/assets";
const files = readdirSync(assetsRoot).filter((f) => f.endsWith(".js"));

const prefixes = ["auth","admin","customers","partners","subscriptions","prices","billing","stripe","public","brandkits","affiliates","formats","designs","customer-designs","assets","exports","deliveries","flyers","elements","products","tags","chat","blog","logs","users","online-users","subscribers","promotions","promotions","cortesias","cobrancas","events","industries","themes","translations","seo","checkout","checkouts","headers","pagar","inbox","emails","campanhas","recuperacao","recovery","magic","upload","image","ai","generate","metrics","stats","webhook","webhooks","notification","notifications"];

const found = new Map(); // path -> Set of files
const literalRe = /["'`]\/([A-Za-z0-9_\-/:.{}$]{1,80})["'`]/g;
for (const f of files) {
  const src = readFileSync(path.join(assetsRoot, f), "utf8");
  for (const m of src.matchAll(literalRe)) {
    const p = "/" + m[1];
    const first = p.split("/")[1];
    if (!prefixes.includes(first)) continue;
    if (!found.has(p)) found.set(p, new Set());
    found.get(p).add(f);
  }
}

const rows = [...found.entries()].map(([p, fs]) => ({ path: p, files: [...fs] })).sort((a, b) => a.path.localeCompare(b.path));
writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/api-paths.json", JSON.stringify(rows, null, 2));
console.log("distinct api-ish path literals:", rows.length);
for (const r of rows) console.log(r.path.padEnd(46), r.files.join(","));
