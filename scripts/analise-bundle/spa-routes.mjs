import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const base = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins/3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f/assets";
const files = ["index-KJ2_zNqK.js"];
const routes = [];
for (const f of files) {
  const src = readFileSync(path.join(base, f), "utf8");
  // React Router: Z({getParentRoute:()=>ge,path:"/x",component:Y})
  for (const m of src.matchAll(/path:\s*"([^"]+)"\s*,\s*component:\s*([A-Za-z0-9_$]+)/g)) {
    routes.push({ path: m[1], component: m[2], index: m.index });
  }
}
writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/spa-routes.json", JSON.stringify({ routes }, null, 2));
console.log("routes with component:", routes.length);
for (const r of routes) console.log(r.path.padEnd(30), r.component);
