import { Router } from "express";
import sharp from "sharp";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { asyncHandler, ApiError, parseWith } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { newId } from "../lib/ids.js";
import { nowIso } from "../lib/time.js";

interface AssetRow {
  id: string; user_id: string; name: string; content_type: string;
  data: Uint8Array; width: number; height: number; processed: number; created_at: string;
}
export function assetDto(row: AssetRow) {
  return { _key: row.id, _id: `assets/${row.id}`, name: row.name, contentType: row.content_type,
    width: row.width, height: row.height, processed: Boolean(row.processed),
    imageUrl: `/api/assets/${row.id}/file`, url: `/api/assets/${row.id}/file`, createdAt: row.created_at };
}
function owned(id: string, userId: string) {
  const row = getDb().prepare("SELECT * FROM assets WHERE id = ? AND user_id = ?").get(id, userId) as unknown as AssetRow | undefined;
  if (!row) throw ApiError.notFound("Imagem não encontrada");
  return row;
}
export async function saveImage(userId: string, name: string, bytes: Buffer, processed = false) {
  let result;
  try {
    result = await sharp(bytes, { limitInputPixels: 20_000_000 }).rotate().resize(4096, 4096, { fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
  } catch { throw ApiError.badRequest("Imagem inválida. Envie PNG, JPEG ou WebP de até 20 megapixels."); }
  const id = newId();
  getDb().prepare("INSERT INTO assets (id,user_id,name,content_type,data,width,height,processed,created_at) VALUES (?,?,?,'image/png',?,?,?,?,?)")
    .run(id, userId, name, result.data, result.info.width, result.info.height, processed ? 1 : 0, nowIso());
  return assetDto(owned(id, userId));
}

export async function removeAssetBackground(userId: string, imageUrl: string, tolerance = 30) {
  const match = /^\/api\/assets\/([^/]+)\/file$/.exec(imageUrl);
  if (!match) throw ApiError.badRequest("Importe a imagem na biblioteca primeiro.");
  const row = owned(match[1]!, userId);
  const { data, info } = await sharp(Buffer.from(row.data)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const visited = new Uint8Array(info.width * info.height);
  const queue: number[] = [];
  const background = [data[0]!, data[1]!, data[2]!];
  const visit = (p: number) => {
    if (visited[p]) return;
    visited[p] = 1;
    if (background.some((value, channel) => Math.abs(data[p * 4 + channel]! - value) > tolerance)) return;
    data[p * 4 + 3] = 0;
    queue.push(p);
  };
  for (let x = 0; x < info.width; x++) { visit(x); visit((info.height - 1) * info.width + x); }
  for (let y = 0; y < info.height; y++) { visit(y * info.width); visit(y * info.width + info.width - 1); }
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!, x = p % info.width;
    if (x) visit(p - 1);
    if (x < info.width - 1) visit(p + 1);
    if (p >= info.width) visit(p - info.width);
    if (p < info.width * (info.height - 1)) visit(p + info.width);
  }
  const bytes = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  return saveImage(userId, `${row.name} sem fundo`, bytes, true);
}

export const mediaRouter = Router();
mediaRouter.use(["/assets", "/brandkits"], requireAuth);
const paging = z.object({ limit: z.coerce.number().int().min(1).max(200).default(100), offset: z.coerce.number().int().min(0).default(0), term: z.string().max(120).default("") });
mediaRouter.get(["/assets", "/assets/all"], asyncHandler(async (req, res) => {
  const q = parseWith(paging, "query", req.query);
  const params = [req.user!.id, `%${q.term}%`];
  const rows = getDb().prepare("SELECT * FROM assets WHERE user_id = ? AND name LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?").all(...params, q.limit, q.offset) as unknown as AssetRow[];
  const count = getDb().prepare("SELECT COUNT(*) AS total FROM assets WHERE user_id = ? AND name LIKE ?").get(...params) as { total: number };
  res.json({ success: true, assets: rows.map(assetDto), ...count, limit: q.limit, offset: q.offset });
}));
mediaRouter.get(["/assets/stats/count", "/assets/stats/partner-count"], asyncHandler(async (req, res) => {
  res.json({ success: true, ...getDb().prepare("SELECT COUNT(*) AS total FROM assets WHERE user_id = ?").get(req.user!.id) });
}));
mediaRouter.post(["/assets", "/assets/upload"], asyncHandler(async (req, res) => {
  const body = parseWith(z.object({ image: z.string().max(8_000_000), name: z.string().trim().min(1).max(160).default("Imagem"), rotate: z.number().min(-360).max(360).default(0), skipTrim: z.boolean().default(true) }), "body", req.body);
  const match = /^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(body.image);
  if (!match) throw ApiError.badRequest("Envie uma imagem PNG, JPEG ou WebP em base64.");
  let bytes: Buffer = Buffer.from(match[1]!, "base64");
  if (bytes.length > 5_000_000) throw ApiError.badRequest("O limite por imagem é 5 MB.");
  if (body.rotate || !body.skipTrim) {
    try {
      let pipeline = sharp(bytes, { limitInputPixels: 20_000_000 }).rotate(body.rotate);
      if (!body.skipTrim) pipeline = pipeline.trim();
      bytes = await pipeline.png().toBuffer();
    } catch { throw ApiError.badRequest("Não foi possível processar a imagem."); }
  }
  res.status(201).json({ success: true, asset: await saveImage(req.user!.id, body.name, bytes) });
}));
mediaRouter.post("/assets/batch", asyncHandler(async (req, res) => {
  const { keys } = parseWith(z.object({ keys: z.array(z.string().max(120)).max(200) }), "body", req.body);
  const assets = keys.map(id => getDb().prepare("SELECT * FROM assets WHERE id = ? AND user_id = ?").get(id, req.user!.id) as unknown as AssetRow | undefined).filter((r): r is AssetRow => Boolean(r)).map(assetDto);
  res.json({ success: true, assets });
}));
mediaRouter.post("/assets/remove-background", asyncHandler(async (req, res) => {
  const body = parseWith(z.object({ imageUrl: z.string().max(2000), tolerance: z.number().min(0).max(255).default(30) }), "body", req.body);
  const asset = await removeAssetBackground(req.user!.id, body.imageUrl, body.tolerance);
  res.json({ success: true, asset, assetId: asset._key, imageUrl: asset.imageUrl });
}));
mediaRouter.get("/assets/:id/file", asyncHandler(async (req, res) => {
  const row = owned(req.params.id!, req.user!.id);
  res.set({ "Content-Type": row.content_type, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" }).send(Buffer.from(row.data));
}));
mediaRouter.get("/assets/:id", asyncHandler(async (req, res) => res.json({ success: true, asset: assetDto(owned(req.params.id!, req.user!.id)) })));
mediaRouter.put("/assets/:id", asyncHandler(async (req, res) => {
  owned(req.params.id!, req.user!.id);
  const { name } = parseWith(z.object({ name: z.string().trim().min(1).max(160) }), "body", req.body);
  getDb().prepare("UPDATE assets SET name = ? WHERE id = ?").run(name, req.params.id!);
  res.json({ success: true, asset: assetDto(owned(req.params.id!, req.user!.id)) });
}));
mediaRouter.delete("/assets/:id", asyncHandler(async (req, res) => {
  owned(req.params.id!, req.user!.id);
  getDb().prepare("DELETE FROM assets WHERE id = ?").run(req.params.id!);
  res.status(204).end();
}));

const brandSchema = z.object({
  name: z.string().max(160).default(""), slogan: z.string().max(200).default(""),
  logo: z.string().max(2000).default(""), address: z.string().max(300).default(""),
  website: z.string().max(200).default(""), contact: z.object({ landline: z.string().max(40).default(""), whatsapp: z.string().max(40).default("") }).default({}),
  social: z.object({ instagram: z.string().max(120).default(""), facebook: z.string().max(120).default("") }).default({}),
  cards: z.array(z.string().max(80)).max(20).default([]),
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(12).default(["#facc15", "#d22323"]),
});
mediaRouter.get(["/brandkits/me", "/brandkits/:id"], asyncHandler(async (req, res) => {
  if (req.params.id && req.params.id !== req.user!.id) throw ApiError.notFound();
  const row = getDb().prepare("SELECT payload FROM brandkits WHERE user_id = ?").get(req.user!.id) as { payload: string } | undefined;
  res.json({ success: true, brandKit: { ...brandSchema.parse(row ? JSON.parse(row.payload) : { name: req.user!.name }), _key: req.user!.id } });
}));
mediaRouter.put("/brandkits/:id", asyncHandler(async (req, res) => {
  if (req.params.id !== req.user!.id && req.params.id !== "me") throw ApiError.notFound();
  const { brandKit } = parseWith(z.object({ brandKit: brandSchema }), "body", req.body);
  getDb().prepare("INSERT INTO brandkits(user_id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at").run(req.user!.id, JSON.stringify(brandKit), nowIso());
  res.json({ success: true, brandKit: { ...brandKit, _key: req.user!.id } });
}));
