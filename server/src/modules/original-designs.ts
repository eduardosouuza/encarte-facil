import { readFile } from "node:fs/promises";

const API_ORIGIN = "https://api-v2.encartefacil.com";
const ASSET_HOST = "efacil-public.s3.sa-east-1.amazonaws.com";

type RemoteAsset = { urls?: Record<string, string>; original?: string; high?: string; medium?: string; low?: string };
type RemoteElement = Record<string, unknown> & { assetUrls?: Record<string, string>; asset?: RemoteAsset | string; category?: string; x?: number; y?: number; width?: number; height?: number; rotation?: number; zIndex?: number };
type RemoteDesign = Record<string, any> & { _key?: string; name?: string | Record<string, string>; elements?: RemoteElement[] };

function imageUrl(element: RemoteElement): string | undefined {
  const urls = element.assetUrls ?? (typeof element.asset === "object" && element.asset ? element.asset.urls : undefined);
  const value = urls?.high ?? urls?.original ?? urls?.medium ?? urls?.low;
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === ASSET_HOST ? value : undefined; }
  catch { return undefined; }
}

function titleOf(value: RemoteDesign["name"]): string {
  if (typeof value === "string") return value;
  return value?.["pt-br"] ?? value?.pt ?? value?.en ?? "Modelo Encarte Fácil";
}

export function normalizeRemoteDesign(remote: RemoteDesign) {
  const elements = (remote.elements ?? []).map((element, index) => {
    const image = imageUrl(element);
    return {
      id: String(element.id ?? `remote_${index}`),
      category: String(element.category ?? "decorative"),
      type: image ? "image" : "shape",
      x: Number(element.x ?? 0), y: Number(element.y ?? 0),
      width: Number(element.width ?? 240), height: Number(element.height ?? 80),
      rotation: Number(element.rotation ?? 0), opacity: 1, zIndex: Number(element.zIndex ?? index),
      image,
      imageFit: "contain",
      subtype: "image",
    };
  });
  const theme = Array.isArray(remote.themes) ? remote.themes[0] : undefined;
  const palette = elements.map(element => element.image).filter(Boolean).length ? [] : [];
  const preview = remote.previewUrls?.medium ?? remote.previewUrls?.high ?? remote.previewUrls?.original ?? (typeof remote.preview === "string" ? `https://${ASSET_HOST}/${remote.preview}` : undefined);
  return {
    _key: String(remote._key ?? remote.id), _id: `designs/${String(remote._key ?? remote.id)}`,
    title: titleOf(remote.name), category: String(remote.category ?? "header"), theme: typeof theme === "object" ? String(typeof theme.title === "object" ? theme.title["pt-br"] : theme.title ?? theme._key ?? "original") : String(theme ?? "original"),
    status: String(remote.status ?? "approved"), archived: false, thumbnail: preview ?? null,
    description: typeof remote.description === "string" ? remote.description : remote.description?.["pt-br"] ?? null,
    backgroundColor: "#ffffff", palette, elements, createdAt: String(remote.createdAt ?? new Date().toISOString()),
  };
}

async function account() {
  const email = process.env.ORIGINAL_CATALOG_EMAIL;
  const password = process.env.ORIGINAL_CATALOG_PASSWORD;
  if (email && password) return { email, passwords: [password] };
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "production") return null;
  try {
    const text = await readFile(new URL("../../../loginencartefacil.md", import.meta.url), "utf8");
    const localEmail = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
    const localPassword = text.split(/\r?\n/).find(line => /^senha\s+/i.test(line))?.replace(/^senha\s+/i, "").trim();
    if (!localEmail || !localPassword) return null;
    return { email: localEmail, passwords: [...new Set([localPassword, localPassword.replace(/\s+/g, ""), localPassword.replace(/\s+[A-Za-z]$/, "")])] };
  } catch { return null; }
}

let token: { value: string; email: string; expiresAt: number } | undefined;
async function auth(): Promise<string | null> {
  const credentials = await account();
  if (!credentials) return null;
  if (token?.email === credentials.email && token.expiresAt > Date.now()) return token.value;
  for (const password of credentials.passwords) {
    const response = await fetch(`${API_ORIGIN}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: credentials.email, password }), signal: AbortSignal.timeout(15000) });
    if (response.status === 401) continue;
    if (!response.ok) throw new Error("Original design login failed");
    const body = await response.json() as { token?: string };
    if (!body.token) throw new Error("Original design token missing");
    token = { value: body.token, email: credentials.email, expiresAt: Date.now() + 30 * 60_000 };
    return body.token;
  }
  throw new Error("Original design login rejected");
}

export async function listOriginalDesigns(query: { term?: string; theme?: string; limit?: number; offset?: number } = {}) {
  const bearer = await auth();
  if (!bearer) return null;
  const params = new URLSearchParams({ limit: String(Math.min(query.limit ?? 100, 100)), offset: String(query.offset ?? 0), locale: "pt-br", status: "approved", archived: "false" });
  if (query.term) params.set("term", query.term);
  if (query.theme) params.set("themes", query.theme);
  const response = await fetch(`${API_ORIGIN}/designs?${params}`, { headers: { authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("Original designs unavailable");
  const body = await response.json() as { designs?: RemoteDesign[] };
  return (body.designs ?? []).map(normalizeRemoteDesign);
}

export async function getOriginalDesign(id: string) {
  const bearer = await auth();
  if (!bearer) return null;
  const response = await fetch(`${API_ORIGIN}/designs/${encodeURIComponent(id)}?locale=pt-br`, { headers: { authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) return null;
  const body = await response.json() as { design?: RemoteDesign };
  return body.design ? normalizeRemoteDesign(body.design) : null;
}

export async function listOriginalElements(query: { category?: string; term?: string; limit?: number } = {}) {
  const bearer = await auth();
  if (!bearer) return null;
  const params = new URLSearchParams({ limit: String(Math.min(query.limit ?? 100, 100)), locale: "pt-br" });
  if (query.category && query.category !== "all") {
    params.set("category", query.category === "seal" ? "3d" : query.category === "backgrounds" ? "background" : query.category);
  }
  if (query.term) params.set("term", query.term);
  const response = await fetch(`${API_ORIGIN}/elements?${params}`, { headers: { authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("Original elements unavailable");
  const body = await response.json() as { elements?: Array<Record<string, any>> };
  return (body.elements ?? []).flatMap(element => {
    const urls = element.assetUrls as Record<string, string> | undefined;
    const image = urls?.high ?? urls?.original ?? urls?.medium ?? urls?.low;
    if (!image) return [];
    return [{
      _key: String(element._key), title: String(element.name || element.description || "Elemento"), category: element.category === "3d" ? "seal" : element.category === "background" ? "backgrounds" : String(element.category ?? "decorative"),
      payload: { category: "image", type: "image", width: Number(element.width ?? 320), height: Number(element.height ?? 240), image },
    }];
  });
}
