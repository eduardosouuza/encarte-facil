import { readFileSync } from "node:fs";

const j = JSON.parse(readFileSync("C:/Users/eduar/AppData/Local/Temp/kilo/ef-investigation/api-login.json", "utf8"));
const redact = (s) =>
  s
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"')
    .replace(/"token"\s*:\s*"[^"]*"/gi, '"token":"[REDACTED]"')
    .replace(/"access_token"\s*:\s*"[^"]*"/gi, '"access_token":"[REDACTED]"');

for (const t of j) {
  const rb = redact((t.request_body && t.request_body.text) || "");
  const sb = redact((t.response_body && t.response_body.text) || "");
  console.log("---", t.method, t.url, "->", t.status);
  if (rb) console.log("  REQ:", rb.slice(0, 800));
  if (sb) console.log("  RES:", sb.slice(0, 900));
  const hdrs = (t.request_headers || []).filter((h) => h.name.startsWith("x-") || h.name === "authorization" || h.name === "content-type");
  console.log("  HDR:", hdrs.map((h) => `${h.name}=${h.value}${h.redacted ? " (redacted)" : ""}`).join(" | "));
}
