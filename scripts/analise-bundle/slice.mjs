import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const assetsRoot = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins/3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f/assets";
const [file, startS, lenS, outFile] = process.argv.slice(2);
const src = readFileSync(path.join(assetsRoot, file), "utf8");
const start = Number(startS);
const len = Number(lenS);
let s = src.slice(start, start + len);
s = s.replace(/;/g, ";\n").replace(/\},/g, "},\n").replace(/\}\)/g, "})\n").replace(/\},\{/g, "},\n{");
writeFileSync(outFile, s);
console.log("written", outFile, s.length);
