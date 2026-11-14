import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const executable = path.join(process.env.APPDATA, "npm/node_modules/rea-agents/scripts/rea.mjs");
const child = spawn(process.execPath, [executable, "--mcp"], { stdio: ["pipe", "pipe", "inherit"], env: { ...process.env, REA_ALLOW_AUTONOMOUS_EXECUTION: "true" } });
let buffer = "";
let sequence = 0;
const pending = new Map();
child.stdout.on("data", chunk => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    try {
      const message = JSON.parse(line);
      if (pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    } catch {}
  }
});
function call(method, params) {
  return new Promise(resolve => {
    const id = ++sequence;
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}
const timeout = setTimeout(() => { child.kill(); process.exitCode = 1; }, 180_000);
try {
  const initialized = await call("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "image-investigation", version: "1.0.0" } });
  if (initialized.error) throw new Error(JSON.stringify(initialized.error));
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const listed = await call("tools/list", {});
  const selected = listed.result.tools.find(tool => /analyze.*javascript.*application/i.test(tool.name));
  console.log(JSON.stringify({ name: selected.name, inputSchema: selected.inputSchema }));
  if (process.argv.includes("--analyze")) {
    const templates = process.argv.includes("--templates");
    const output = templates ? ".work/original-templates" : ".work/product-images";
    const sourcePaths = templates ? ["service-DQzaU991.js", "index-MqiCARZ_.js"] : ["index-MqiCARZ_.js"];
    const result = await call("tools/call", { name: selected.name, arguments: { input_path: path.resolve("docs/evidencias/public-bundle"), source_paths: sourcePaths, max_semantic_nodes: 20000, max_semantic_nodes_per_file: 10000, detail: "summary" } });
    await mkdir(output, { recursive: true });
    await writeFile(`${output}/rea-mcp.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ output: `${output}/rea-mcp.json`, error: result.error ?? result.result?.isError ?? false }));
  }
} finally {
  clearTimeout(timeout);
  child.kill();
}
