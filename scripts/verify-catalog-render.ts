import path from "node:path";

async function main() {
process.env.DATABASE_FILE = path.resolve("server/data/encarte-facil.sqlite");
const { getDb } = await import("../server/src/db/connection.js");
const { renderDocument } = await import("../server/src/modules/render.service.js");
const { listOriginalDesigns, listOriginalElements } = await import("../server/src/modules/original-designs.js");
for (const id of ["M43ZEZoAtUeKAeoZ4oHS", "hv6H78PeZ0UH6n8dW8DT", "dB04GNncBsGkxerFiJag", "lp65HBdGzirvqNhXvV1T", "qJE0braWpiyA37vceXdu"]) {
  const row = getDb().prepare("SELECT user_id FROM flyers WHERE id = ?").get(id) as { user_id: string } | undefined;
  if (!row) continue;
  const { svg } = await renderDocument(row.user_id, id);
  console.log(id, "OK", svg.length, "bytes");
}
console.log("Remote designs:", (await listOriginalDesigns({ limit: 2 }))?.length);
console.log("Remote backgrounds:", (await listOriginalElements({ category: "backgrounds", limit: 2 }))?.length);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
