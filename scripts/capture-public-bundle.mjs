import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Download only public, same-origin JavaScript references; never execute the bundle.
const origin = "https://editor.encartefacil.com";
const root = new URL("../docs/evidencias/public-bundle/", import.meta.url);
await mkdir(root, { recursive: true });
const queue = ["/editor"];
const seen = new Set();
const manifest = [];
while (queue.length && seen.size < 500) {
  const pathname = queue.shift();
  if (seen.has(pathname)) continue;
  seen.add(pathname);
  const response = await fetch(origin + pathname);
  const source = await response.text();
  const isScript = pathname.endsWith(".js");
  if (!response.ok || (isScript && !/javascript/.test(response.headers.get("content-type") ?? ""))) {
    manifest.push({ path: pathname, status: response.status, retained: false });
    continue;
  }
  const file = isScript ? pathname.split("/").pop() : "editor.html";
  await writeFile(new URL(file, root), source);
  manifest.push({ path: pathname, status: response.status, file, bytes: Buffer.byteLength(source), sha256: createHash("sha256").update(source).digest("hex") });
  for (const match of source.matchAll(/["'`]((?:\.\/|\/?assets\/)?[A-Za-z0-9_-]+\.js)["'`]/g)) {
    const name = match[1].replace(/^\.?\//, "").replace(/^assets\//, "");
    queue.push("/assets/" + name);
  }
}
await writeFile(new URL("manifest.json", root), JSON.stringify({ origin, capturedAt: new Date().toISOString(), files: manifest }, null, 2));
console.log(JSON.stringify({ retained: manifest.filter(x => x.file).length, failed: manifest.filter(x => !x.file), directory: root.pathname }));
