import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(
  "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/exported-scripts/files/origins/3d7e1848aff28af09a4619c8447b982f428e543b2003539e9e12fe47038c583f/assets/index-KJ2_zNqK.js",
  "utf8",
);

function block(needle, maxLen = 12000) {
  const i = src.indexOf(needle);
  if (i < 0) return `!! NOT FOUND: ${needle}`;
  let depth = 0, started = false, end = i;
  for (let j = i; j < src.length && j - i < maxLen; j++) {
    const c = src[j];
    if (c === "{") { depth++; started = true; }
    else if (c === "}") { depth--; if (started && depth === 0) { end = j + 1; break; } }
  }
  return src.slice(i, end);
}

function pretty(s) {
  return s.replace(/;/g, ";\n").replace(/\},/g, "},\n").replace(/\}\)/g, "})\n");
}

const parts = [];
parts.push("=========== class Nc (base HTTP client) ===========");
parts.push(pretty(block("class Nc{")));

for (const needle of ["const lt={", "lt={", "AUTH_TOKEN", "x-session-id"]) {
  const i = src.indexOf(needle);
  parts.push(`\n=========== context: ${needle} @${i} ===========`);
  if (i >= 0) parts.push(pretty(src.slice(Math.max(0, i - 700), i + 700)));
}

writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/base-client2.txt", parts.join("\n"));
console.log("ok");
