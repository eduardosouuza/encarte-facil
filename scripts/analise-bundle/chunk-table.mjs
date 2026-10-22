import { readFileSync, writeFileSync } from "node:fs";

const d = JSON.parse(readFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/chunk-map.json", "utf8"));
const rows = d.chunks
  .slice()
  .sort((a, b) => b.bytes - a.bytes)
  .map((c) => {
    const role = c.apiPaths.length
      ? "serviço/contrato de API"
      : c.hasReactVendor
      ? "vendor (React runtime)"
      : c.lucide
      ? "ícones lucide-react"
      : c.hasRouter
      ? "rotas SPA"
      : "componente/feature";
    return `| \`${c.file}\` | ${c.bytes.toLocaleString("pt-BR")} | ${role} | ${c.apiPaths.length || ""} | ${c.imports.length} |`;
  });
const md = rows.join("\n");
writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/chunk-table.md", md);
console.log(md);
