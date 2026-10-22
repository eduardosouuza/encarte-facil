import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(process.argv[2] ?? ".");
const ev = path.join(raiz, "docs", "evidencias");

const CAPTURAS = [
  { id: "login-ok", dir: "scripts-captura-login-ok" },
  { id: "login-falha", dir: "scripts-captura-login-falha" },
  { id: "login-falha2", dir: "scripts-captura-login-falha2" },
  { id: "editor", dir: "scripts-captura-editor" },
  { id: "batch1", dir: "scripts-captura-batch1" },
];

function lerJson(p) {
  return JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
}

const publico = existsSync(path.join(ev, "public-bundle", "manifest.json"))
  ? lerJson(path.join(ev, "public-bundle", "manifest.json"))
  : null;

const publicoPorNome = new Map();
if (publico) {
  for (const f of publico.files ?? []) {
    publicoPorNome.set(f.file, { path: f.path, bytes: f.bytes, sha256: f.sha256 });
  }
}

const porUrl = new Map();
const entradas = [];
let foraDoPublico = 0;

for (const cap of CAPTURAS) {
  const dir = path.join(ev, cap.dir);
  const manifest = lerJson(path.join(dir, "manifest.json"));
  for (const s of manifest.scripts) {
    const url = s.url ?? "";
    const nome = url.split("/").pop()?.split("?")[0] ?? "";
    const estado = s.content?.state ?? "desconhecido";
    const registro = {
      captura: cap.id,
      url,
      arquivo: nome,
      status: estado,
      motivo: s.content?.reason ?? null,
      sha256: s.content?.sha256 ?? null,
      bytes: s.content?.bytes ?? null,
      caminho: estado === "exported" ? path.join(cap.dir, s.content.relative_path) : null,
      layout: s.content?.layout ?? null,
      redigido: s.content?.redacted ?? null,
      http: s.source?.status ?? null,
      transacao: s.source?.transaction_id ?? null,
    };
    entradas.push(registro);

    if (estado === "exported") {
      if (!porUrl.has(url)) porUrl.set(url, []);
      porUrl.get(url).push(registro);
    } else {
      const pub = publicoPorNome.get(nome);
      if (pub) foraDoPublico++;
    }
  }
}

const unicos = new Map();
for (const e of entradas) {
  if (e.status !== "exported") continue;
  if (!unicos.has(e.url)) unicos.set(e.url, { ...e, capturas: new Set() });
  const u = unicos.get(e.url);
  u.capturas.add(e.captura);
  if (!u.sha256) u.sha256 = e.sha256;
}

const indisponiveis = entradas.filter((e) => e.status !== "exported");
const porCaptura = {};
for (const cap of CAPTURAS) {
  const lista = entradas.filter((e) => e.captura === cap.id);
  porCaptura[cap.id] = {
    scripts: lista.length,
    exportados: lista.filter((e) => e.status === "exported").length,
    indisponiveis: lista.filter((e) => e.status !== "exported").length,
    urls_exclusivas: new Set(
      lista.filter((e) => e.status === "exported" && unicos.get(e.url).capturas.size === 1).map((e) => e.url),
    ).size,
  };
}

const motivos = {};
for (const e of indisponiveis) motivos[e.motivo ?? "?"] = (motivos[e.motivo ?? "?"] ?? 0) + 1;

const naoPublico = [...unicos.values()].filter((u) => !publicoPorNome.has(u.arquivo));
const soPublico = [...publicoPorNome.keys()].filter((n) => ![...unicos.values()].some((u) => u.arquivo === n));

const resumo = {
  gerado_em: new Date().toISOString(),
  capturas: porCaptura,
  urls_unicas_com_script: unicos.size,
  entradas_exportadas: entradas.filter((e) => e.status === "exported").length,
  entradas_indisponiveis: indisponiveis.length,
  motivos_indisponivel: motivos,
  bundle_publico: publico ? publico.files.length : 0,
  urls_com_script_fora_do_bundle_publico: naoPublico.length,
  arquivos_do_bundle_publico_sem_captura: soPublico.length,
  total_de_arquivos_unicos: unicos.size + soPublico.length,
};

writeFileSync(
  path.join(ev, "INVENTARIO-SCRIPTS.json"),
  JSON.stringify(
    {
      resumo,
      scripts: [...unicos.values()].map((u) => ({ ...u, capturas: [...u.capturas] })),
      indisponiveis: indisponiveis.map((e) => ({
        captura: e.captura,
        url: e.url,
        motivo: e.motivo,
        coberto_pelo_bundle_publico: publicoPorNome.has(e.arquivo),
      })),
    },
    null,
    2,
  ),
  "utf8",
);

const linhas = [];
linhas.push("# Inventário de scripts extraídos do Encarte Fácil");
linhas.push("");
linhas.push(`**Gerado em:** ${resumo.gerado_em}`);
linhas.push("**Origem:** exports REA `export-web-scripts` sobre as capturas autenticadas + bundle público.");
linhas.push("");
linhas.push("## Resumo");
linhas.push("");
linhas.push("| Métrica | Valor |");
linhas.push("|---|---:|");
linhas.push(`| URLs únicas com script exportado | ${resumo.urls_unicas_com_script} |`);
linhas.push(`| Entradas de script exportadas | ${resumo.entradas_exportadas} |`);
linhas.push(`| Entradas indisponíveis na captura | ${resumo.entradas_indisponiveis} |`);
linhas.push(`| Arquivos no bundle público | ${resumo.bundle_publico} |`);
linhas.push(`| Scripts das capturas fora do bundle público | ${resumo.urls_com_script_fora_do_bundle_publico} |`);
linhas.push(`| Arquivos do bundle público sem captura equivalente | ${resumo.arquivos_do_bundle_publico_sem_captura} |`);
linhas.push(`| Total de arquivos distintos | ${resumo.total_de_arquivos_unicos} |`);
linhas.push("");
linhas.push("## Por captura");
linhas.push("");
linhas.push("| Captura | Scripts | Exportados | Indisponíveis | URLs exclusivas |");
linhas.push("|---|---:|---:|---:|---:|");
for (const [id, c] of Object.entries(porCaptura)) {
  linhas.push(`| ${id} | ${c.scripts} | ${c.exportados} | ${c.indisponiveis} | ${c.urls_exclusivas} |`);
}
linhas.push("");
linhas.push("## Motivos das entradas indisponíveis");
linhas.push("");
linhas.push("| Motivo | Quantidade |");
linhas.push("|---|---:|");
for (const [k, v] of Object.entries(motivos)) linhas.push(`| ${k} | ${v} |`);
linhas.push("");
linhas.push("## Scripts únicos por captura");
linhas.push("");
linhas.push("| URL | SHA-256 (12) | Bytes | Capturas |");
linhas.push("|---|---|---:|---|");
for (const u of [...unicos.values()].sort((a, b) => a.url.localeCompare(b.url))) {
  linhas.push(
    `| ${u.url.replace(/\|/g, "\\|")} | \`${(u.sha256 ?? "").slice(0, 12)}\` | ${u.bytes ?? "?"} | ${[...u.capturas].join(", ")} |`,
  );
}
linhas.push("");
linhas.push("## Entradas indisponíveis (cobertura pelo bundle público)");
linhas.push("");
linhas.push("| Captura | URL | Motivo | Coberto pelo bundle público |");
linhas.push("|---|---|---|---|");
for (const e of indisponiveis.sort((a, b) => a.url.localeCompare(b.url))) {
  linhas.push(
    `| ${e.captura} | ${e.url.replace(/\|/g, "\\|")} | ${e.motivo} | ${e.coberto_pelo_bundle_publico ? "sim" : "não"} |`,
  );
}
linhas.push("");

writeFileSync(path.join(ev, "INVENTARIO-SCRIPTS.md"), `${linhas.join("\n")}\n`, "utf8");

console.log(JSON.stringify(resumo, null, 2));
