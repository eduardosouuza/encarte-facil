import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const assetsRoot = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins/3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f/assets";

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
function pretty(s) {
  return s.replace(/;/g, ";\n").replace(/\},/g, "},\n").replace(/\}\)/g, "})\n").replace(/\}\{/g, "}\n{");
}

const jobs = [
  ["index-KJ2_zNqK.js", "class lo extends Nc", "auth-service.txt"],
  ["index-KJ2_zNqK.js", "class uo extends Nc", "partners-service.txt"],
  ["index-KJ2_zNqK.js", "class fo extends Nc", "billing-service.txt"],
  ["index-KJ2_zNqK.js", "class ho extends Nc", "customers-service.txt"],
  ["index-KJ2_zNqK.js", "class po extends Nc", "market-service.txt"],
];

const outDir = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/";
for (const [file, needle, out] of jobs) {
  const src = readFileSync(path.join(assetsRoot, file), "utf8");
  const i = src.indexOf(needle);
  if (i < 0) { console.log("NOT FOUND", needle); continue; }
  const end = blockEnd(src, i);
  writeFileSync(outDir + out, pretty(src.slice(i, end)));
  console.log("wrote", out, end - i, "chars @", i);
}
