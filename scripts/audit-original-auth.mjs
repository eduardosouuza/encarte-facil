import { readFile } from "node:fs/promises";

const API = "https://api-v2.encartefacil.com";
const credentialText = await readFile(new URL("../loginencartefacil.md", import.meta.url), "utf8");
const email = credentialText.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
const passwordLine = credentialText.split(/\r?\n/).find((line) => /^senha\s+/i.test(line));
const configuredPassword = passwordLine?.replace(/^senha\s+/i, "").trim();

if (!email || !configuredPassword) throw new Error("Credenciais não encontradas no arquivo local.");

const passwordCandidates = [configuredPassword];
const compactPassword = configuredPassword.replace(/\s+/g, "");
if (compactPassword !== configuredPassword) passwordCandidates.push(compactPassword);
if (/\s+[A-Za-z]$/.test(configuredPassword)) {
  passwordCandidates.push(configuredPassword.replace(/\s+[A-Za-z]$/, ""));
}

let authenticated;
for (const password of passwordCandidates) {
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://editor.encartefacil.com" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.ok && body?.token) {
    authenticated = body;
    break;
  }
  if (response.status !== 401) throw new Error(`Login falhou com HTTP ${response.status}.`);
}

if (!authenticated) {
  console.log(JSON.stringify({ authenticated: false, status: 401 }));
  process.exitCode = 2;
} else {
  const user = authenticated.user ?? authenticated.customer ?? authenticated.data?.user ?? null;
  console.log(JSON.stringify({
    authenticated: true,
    responseKeys: Object.keys(authenticated).filter((key) => key !== "token"),
    userKeys: user && typeof user === "object" ? Object.keys(user) : [],
    role: user?.role ?? user?.group ?? null,
  }, null, 2));
}
