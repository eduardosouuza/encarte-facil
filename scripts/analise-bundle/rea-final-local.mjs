import { readFileSync, writeFileSync } from "node:fs";

const p = "C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/rea-static.json";
const raw = readFileSync(p);
let text = raw.toString("utf16le");
if (text.charCodeAt(0) !== 0x7b) text = raw.toString("utf8");
const j = JSON.parse(text);
const n = j.normalized_result || j;
const g = n.graph || {};
const eg = n.semantic_graph || {};

const relKinds = {};
const relSamples = {};
for (const r of eg.relations || []) {
  const k = r.relation || "(desconhecido)";
  relKinds[k] = (relKinds[k] || 0) + 1;
  if (!relSamples[k]) relSamples[k] = [];
  if (relSamples[k].length < 3) relSamples[k].push(r);
}
const nodeKind = {};
for (const nd of g.nodes || []) nodeKind[nd.kind] = (nodeKind[nd.kind] || 0) + 1;

const endpoints = (g.nodes || [])
  .filter((x) => x.kind === "endpoint")
  .map((x) => {
    const o = x.observations?.[0]?.properties || {};
    const loc = x.observations?.[0]?.evidence?.location?.value?.source || "";
    const file = loc.split("/").pop();
    return { value: o.value, mechanism: o.mechanism, resolution: o.resolution, file };
  })
  .sort((a, b) => String(a.value).localeCompare(String(b.value)));

const storage = (g.nodes || [])
  .filter((x) => x.kind === "storage")
  .map((x) => {
    const o = x.observations?.[0]?.properties || {};
    const loc = x.observations?.[0]?.evidence?.location?.value?.source || "";
    return { value: o.value, mechanism: o.mechanism, file: loc.split("/").pop() };
  });

const out = {
  input_path: n.input_path,
  format: n.format,
  root_artifact_sha256: n.root_artifact_sha256,
  inventory_manifest_id: n.inventory_manifest_id,
  inventory_graph_sha256: n.inventory_graph_sha256,
  integrity_contradictions: n.integrity_contradictions,
  summary: n.summary,
  statistics: n.statistics,
  limitations_top: n.limitations,
  graph: {
    schema: g.schema,
    graph_id: g.graph_id,
    root_node_ids: g.root_node_ids,
    node_count: (g.nodes || []).length,
    edge_count: (g.edges || []).length,
    node_kinds: nodeKind,
    coverage: g.coverage,
    limitations: g.limitations,
  },
  semantic_graph: {
    schema: eg.schema,
    graph_id: eg.graph_id,
    application_graph_id: eg.application_graph_id,
    root_artifact_sha256: eg.root_artifact_sha256,
    root_node_ids: eg.root_node_ids,
    node_count: (eg.nodes || []).length,
    relation_count: (eg.relations || []).length,
    evidence_context_count: (eg.evidence_contexts || []).length,
    fingerprint_count: (eg.fingerprints || []).length,
    unknown_count: (eg.unknowns || []).length,
    relation_kinds: relKinds,
    coverage: eg.coverage,
    limitations: eg.limitations,
  },
  endpoints,
  storage,
};
writeFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/rea-distilled-local.json", JSON.stringify(out, null, 2));
console.log("graph_id:", g.graph_id);
console.log("semantic graph_id:", eg.graph_id);
console.log("node kinds:", JSON.stringify(nodeKind));
console.log("relation kinds:", JSON.stringify(relKinds));
console.log("endpoints:", endpoints.length);
console.log(endpoints.map((e) => `${e.file} | ${e.mechanism} | ${e.resolution} | ${e.value}`).join("\n"));
console.log("--- storage ---");
console.log(storage.map((e) => `${e.file} | ${e.mechanism} | ${e.value}`).join("\n"));
console.log("--- coverage graph ---");
console.log(JSON.stringify(g.coverage));
console.log("--- limitations graph ---");
console.log(JSON.stringify(g.limitations));
console.log("--- coverage semantic ---");
console.log(JSON.stringify(eg.coverage));
console.log("--- limitations semantic ---");
console.log(JSON.stringify(eg.limitations));
console.log("--- summary ---");
console.log(JSON.stringify(n.summary, null, 1).slice(0, 3000));
console.log("--- statistics ---");
console.log(JSON.stringify(n.statistics, null, 1).slice(0, 2000));
