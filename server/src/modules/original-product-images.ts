import { readFile } from "node:fs/promises";
import { ApiError } from "../lib/http.js";

const API_ORIGIN = "https://api-v2.encartefacil.com";
const IMAGE_HOSTS = new Set(["images.openfoodfacts.org", "images.openfoodfacts.net", "efacil-public.s3.sa-east-1.amazonaws.com", "cdn.encartefacil.com", "encrypted-tbn0.gstatic.com", "encrypted-tbn1.gstatic.com", "encrypted-tbn2.gstatic.com", "encrypted-tbn3.gstatic.com"]);

export function allowedProductImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && IMAGE_HOSTS.has(url.hostname);
  } catch { return false; }
}

interface ImageEvent {
  type?: string;
  data?: { imageUrl?: string; thumbnailUrl?: string; productName?: string; productId?: string; source?: string };
}

export function parseImageEvents(text: string): ImageEvent[] {
  const events: ImageEvent[] = [];
  let start = -1;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (start < 0) {
      if (character !== "{") continue;
      start = index;
      depth = 1;
      continue;
    }
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === "{") depth++;
    else if (character === "}" && --depth === 0) {
      events.push(JSON.parse(text.slice(start, index + 1)) as ImageEvent);
      start = -1;
    }
  }
  if (start >= 0) throw new Error("Incomplete image event");
  return events;
}

async function credentials() {
  const email = process.env.ORIGINAL_CATALOG_EMAIL;
  const password = process.env.ORIGINAL_CATALOG_PASSWORD;
  if (email && password) return { email, passwords: [password] };
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "production") return null;
  let text: string;
  try { text = await readFile(new URL("../../../loginencartefacil.md", import.meta.url), "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const localEmail = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
  const localPassword = text.split(/\r?\n/).find(line => /^senha\s+/i.test(line))?.replace(/^senha\s+/i, "").trim();
  if (!localEmail || !localPassword) return null;
  return { email: localEmail, passwords: [...new Set([localPassword, localPassword.replace(/\s+/g, ""), localPassword.replace(/\s+[A-Za-z]$/, "")])] };
}

let session: { token: string; expiresAt: number; email: string } | undefined;
let loginPending: Promise<string> | undefined;

async function authenticate(account: NonNullable<Awaited<ReturnType<typeof credentials>>>) {
  if (session && session.email === account.email && session.expiresAt > Date.now()) return session.token;
  if (loginPending) return loginPending;
  loginPending = (async () => {
    for (const password of account.passwords) {
      const response = await fetch(`${API_ORIGIN}/auth/login`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: account.email, password }), signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 401) continue;
      if (!response.ok) throw new Error("Catalog login unavailable");
      const body = await response.json() as { token?: string };
      if (!body.token) throw new Error("Missing catalog token");
      session = { token: body.token, email: account.email, expiresAt: Date.now() + 30 * 60_000 };
      return body.token;
    }
    throw new ApiError(502, "A conta do catálogo Encarte Fácil precisa ser reconectada. Verifique as credenciais configuradas no servidor.");
  })();
  try { return await loginPending; }
  finally { loginPending = undefined; }
}

export async function searchOriginalProductImages(term: string) {
  try {
    const account = await credentials();
    if (!account) return null;
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await authenticate(account);
      response = await fetch(`${API_ORIGIN}/products/search-images`, {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ term }), signal: AbortSignal.timeout(30_000),
      });
      if (response.status !== 401) break;
      session = undefined;
      await response.body?.cancel();
    }
    if (!response?.ok || !response.body) throw new Error("Catalog search unavailable");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 2_000_000) throw new Error("Catalog response too large");
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally { await reader.cancel(); }
    const events = parseImageEvents(text);
    if (events.some(event => event.type === "error") || !events.some(event => event.type === "end")) throw new Error("Catalog search incomplete");
    const seen = new Set<string>();
    return events.flatMap(event => {
      const item = event.data;
      if (event.type !== "image" || !item?.imageUrl) return [];
      const imageUrl = allowedProductImageUrl(item.imageUrl) ? item.imageUrl : item.thumbnailUrl && allowedProductImageUrl(item.thumbnailUrl) ? item.thumbnailUrl : null;
      if (!imageUrl || seen.has(imageUrl)) return [];
      seen.add(imageUrl);
      return [{
        id: item.productId ?? item.imageUrl,
        title: item.productName || term,
        imageUrl,
        thumbnailUrl: item.thumbnailUrl && allowedProductImageUrl(item.thumbnailUrl) ? item.thumbnailUrl : imageUrl,
        source: item.source === "serp" ? "Internet — Encarte Fácil" : "Catálogo Encarte Fácil",
      }];
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, "O catálogo Encarte Fácil está indisponível. Tente buscar a foto novamente.");
  }
}
