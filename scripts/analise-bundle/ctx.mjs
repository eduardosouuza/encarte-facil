import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const assetsRoot = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins/3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f/assets";
const files = readdirSync(assetsRoot).filter((f) => f.endsWith(".js"));
const needles = process.argv.slice(2);
for (const f of files) {
  const src = readFileSync(path.join(assetsRoot, f), "utf8");
  for (const n of needles) {
    let i = -1;
    while ((i = src.indexOf(n, i + 1)) !== -1) {
      console.log(`### ${f} @${i} [${n}]`);
      console.log(src.slice(Math.max(0, i - 260), i + 320).replace(/\s+/g, " "));
      console.log();
    }
  }
}
