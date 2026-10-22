import { readFile } from "node:fs/promises";

const files = ["index-BWsW9flj.js", "index-BLLrK9Mc.js", "index-MqiCARZ_.js"];
const needles = ["Chat", "Temas", "Produtos", "Elementos", "Tags", "Formatos", "Marca", "Encartes"];
for (const file of files) {
  const source = await readFile(new URL(`../docs/evidencias/public-bundle/${file}`, import.meta.url), "utf8");
  for (const needle of needles) {
    const offset = source.indexOf(needle);
    if (offset < 0) continue;
    console.log(`\n### ${file} ${needle} @${offset}\n${source.slice(Math.max(0, offset - 1000), offset + 1800)}`);
  }
}
