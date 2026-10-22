import type { SQLInputValue } from "node:sqlite";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { asyncHandler, ApiError, parseWith } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { newId } from "../lib/ids.js";
import { nowIso } from "../lib/time.js";
import { removeAssetBackground, saveImage } from "./media.routes.js";

export const productRouter = Router();

productRouter.use(requireAuth);

interface ProductRow {
  id: string;
  user_id: string;
  name: string;
  image: string | null;
  price: number;
  sale_price: number | null;
  unit: string | null;
  notes: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

function productDto(row: ProductRow) {
  return {
    _key: row.id,
    _id: `products/${row.id}`,
    name: row.name,
    image: row.image,
    price: row.price,
    salePrice: row.sale_price,
    unit: row.unit,
    notes: row.notes,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const productSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto").max(160),
  image: z.string().trim().max(2000).refine(value => /^\/api\/assets\/[A-Za-z0-9_-]+\/file$/.test(value) || /^https:\/\//.test(value), "Informe uma imagem da biblioteca ou URL HTTPS válida").nullable().optional(),
  price: z.coerce.number().min(0, "Preco invalido").max(1_000_000),
  salePrice: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
});

productRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = parseWith(
      z.object({
        term: z.string().trim().max(120).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      }),
      "query",
      req.query,
    );
    const db = getDb();
    const where = ["user_id = ?"];
    const params: SQLInputValue[] = [req.user!.id];
    if (query.term) {
      where.push("LOWER(name) LIKE ?");
      params.push(`%${query.term.toLowerCase()}%`);
    }
    const clause = where.join(" AND ");
    const total = (db.prepare(`SELECT COUNT(*) AS total FROM products WHERE ${clause}`).get(...params) as { total: number }).total;
    const rows = db
      .prepare(`SELECT * FROM products WHERE ${clause} ORDER BY name LIMIT ? OFFSET ?`)
      .all(...params, query.limit, query.offset) as unknown as ProductRow[];
    res.json({ success: true, products: rows.map(productDto), total, limit: query.limit, offset: query.offset });
  }),
);

productRouter.get("/search", asyncHandler(async (req, res) => {
  const term = parseWith(z.object({ term: z.string().trim().min(1).max(120) }), "query", req.query).term;
  const rows = getDb().prepare("SELECT * FROM products WHERE user_id=? AND (LOWER(name) LIKE ? OR LOWER(COALESCE(category,'')) LIKE ?) ORDER BY name LIMIT 50")
    .all(req.user!.id, `%${term.toLowerCase()}%`, `%${term.toLowerCase()}%`) as unknown as ProductRow[];
  res.json({ success: true, products: rows.map(productDto) });
}));

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string | string[];
  image_front_url?: string;
  image_url?: string;
}

const ORIGINAL_PRODUCT_IMAGES = [
  ["Maçã Fuji", "https://efacil-public.s3.sa-east-1.amazonaws.com/RS2YPYLvSA8XW7yqKqtMr.png"],
  ["Mamão Formosa", "https://efacil-public.s3.sa-east-1.amazonaws.com/P1_rD6MGTgUjCxO7nm2wC.png"],
  ["Uva Sem Semente", "https://efacil-public.s3.sa-east-1.amazonaws.com/IYP6-QZgTBeZIwSOFn6qU.png"],
  ["Cenoura", "https://efacil-public.s3.sa-east-1.amazonaws.com/products/d9e695d6-7293-4d2c-9142-711fff3b65a7.png"],
  ["Batata Doce Branca", "https://efacil-public.s3.sa-east-1.amazonaws.com/Erh_DgsevcsIi8A2Dodjo.png"],
  ["Bergamota Montenegrina", "https://efacil-public.s3.sa-east-1.amazonaws.com/ycyQQcI0lLMQsbjS-_lPP.png"],
  ["Ovos Brancos 20un", "https://efacil-public.s3.sa-east-1.amazonaws.com/WZ1u-wpb923qloCXQBR1N.png"],
  ["Tomate Italiano", "https://efacil-public.s3.sa-east-1.amazonaws.com/products/a400e479-99de-4f33-9928-09fbf5d188fb.png"],
  ["Batata Branca", "https://efacil-public.s3.sa-east-1.amazonaws.com/products/13551654-4bbf-413c-8720-b7aa60ba3631.png"],
] as const;

function normalizedSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
}

function allowedProductImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && ["images.openfoodfacts.org", "images.openfoodfacts.net", "efacil-public.s3.sa-east-1.amazonaws.com", "cdn.encartefacil.com"].includes(url.hostname);
  } catch { return false; }
}

async function searchProductImages(term: string) {
  const normalizedTerm = normalizedSearch(term).replace(/\b\d+\s*(kg|g|mg|ml|l|un|und)\b/g, "").trim();
  const original = ORIGINAL_PRODUCT_IMAGES
    .filter(([title]) => {
      const normalizedTitle = normalizedSearch(title);
      return Boolean(normalizedTerm) && (normalizedTitle.includes(normalizedTerm) || normalizedTerm.includes(normalizedTitle));
    })
    .map(([title, imageUrl]) => ({ id: `original-${normalizedSearch(title).replace(/ /g, "-")}`, title, imageUrl, source: "Catálogo Encarte Fácil" }));
  if (original.length) return original;
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", term);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "12");
  url.searchParams.set("fields", "code,product_name,brands,image_front_url,image_url");
  const searchUrl = new URL("https://search.openfoodfacts.org/search");
  searchUrl.searchParams.set("q", normalizedTerm);
  searchUrl.searchParams.set("langs", "pt,en");
  searchUrl.searchParams.set("page_size", "24");
  searchUrl.searchParams.set("fields", "code,product_name,brands,image_front_url,image_url");
  let available = false;
  for (const endpoint of [searchUrl, url]) {
   try {
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "EncarteFacilReplica/1.0 (local product image search)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("search failed");
    const data = await response.json() as { products?: OpenFoodFactsProduct[]; hits?: OpenFoodFactsProduct[] };
    const products = data.hits ?? data.products;
    if (!Array.isArray(products)) throw new Error("Invalid search response");
    available = true;
    const external = products.map(product => ({
      id: product.code ?? "",
      title: [product.product_name, Array.isArray(product.brands) ? product.brands.join(", ") : product.brands].filter(Boolean).join(" — ") || term,
      imageUrl: product.image_front_url || product.image_url || "",
      source: "Open Food Facts",
    })).filter(candidate => allowedProductImageUrl(candidate.imageUrl))
      .sort((a, b) => Number(normalizedSearch(b.title).startsWith(normalizedTerm)) - Number(normalizedSearch(a.title).startsWith(normalizedTerm)));
    if (external.length) return external;
   } catch { /* Try the independent search provider before reporting an outage. */ }
  }
  if (available) return [];
  throw new ApiError(502, "Os catálogos de fotos estão indisponíveis. Tente novamente ou envie uma foto pela biblioteca.");
}

function parseProductLine(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const priceMatch = normalized.match(/(?:R\$\s*)?(\d{1,6}(?:[.,]\d{1,2}))\s*(kg|g|mg|l|ml|un|und|cx|pct|bd|bandeja|pacote|caixa)?\s*$/i);
  const price = priceMatch ? Number(priceMatch[1]!.replace(",", ".")) : null;
  const unit = priceMatch?.[2]?.toLocaleLowerCase("pt-BR") ?? null;
  const name = priceMatch ? normalized.slice(0, priceMatch.index).replace(/[-–—|]+$/g, "").trim() : normalized;
  return { name: name || normalized, price, unit };
}

async function persistProductImage(userId: string, productId: string, imageUrl: string) {
  if (!allowedProductImageUrl(imageUrl)) throw ApiError.badRequest("Selecione uma imagem válida do catálogo.");
  const row = getDb().prepare("SELECT * FROM products WHERE id=? AND user_id=?").get(productId, userId) as unknown as ProductRow | undefined;
  if (!row) throw ApiError.notFound("Produto nao encontrado");
  // The .org image host can time out while the public .net image CDN remains available.
  const downloadUrl = new URL(imageUrl);
  if (downloadUrl.hostname === "images.openfoodfacts.org") downloadUrl.hostname = "images.openfoodfacts.net";
  const response = await fetch(downloadUrl, { redirect: "error", headers: { "User-Agent": "EncarteFacilReplica/1.0" }, signal: AbortSignal.timeout(8_000) })
    .catch(() => { throw new ApiError(502, "Não foi possível baixar a foto do produto. Tente novamente."); });
  if (!response.ok) throw new ApiError(502, "Não foi possível baixar a foto do produto.");
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > 5_000_000) throw ApiError.badRequest("A imagem encontrada excede 5 MB.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 5_000_000) throw ApiError.badRequest("A imagem encontrada excede 5 MB.");
  const asset = await saveImage(userId, `${row.name} — produto`, bytes);
  getDb().prepare("UPDATE products SET image=?,updated_at=? WHERE id=? AND user_id=?").run(asset.imageUrl, nowIso(), row.id, userId);
  const updated = getDb().prepare("SELECT * FROM products WHERE id=?").get(row.id) as unknown as ProductRow;
  return { product: productDto(updated), asset };
}

productRouter.post("/search-images", asyncHandler(async (req, res) => {
  const { term } = parseWith(z.object({ term: z.string().trim().min(2).max(120) }), "body", req.body);
  res.json({ success: true, images: await searchProductImages(term) });
}));

productRouter.post("/search-images/persist", asyncHandler(async (req, res) => {
  const body = parseWith(z.object({ productId: z.string().min(1).max(120), imageUrl: z.string().url().max(2000) }), "body", req.body);
  res.json({ success: true, ...await persistProductImage(req.user!.id, body.productId, body.imageUrl) });
}));

productRouter.post("/import-list", asyncHandler(async (req, res) => {
  const { text } = parseWith(z.object({ text: z.string().trim().min(1).max(20_000) }), "body", req.body);
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 50);
  const parsed = lines.map((line, index) => ({ index, line, ...parseProductLine(line) }));
  const valid = parsed.filter(item => item.name && item.price !== null);
  if (!valid.length) throw ApiError.badRequest("Nenhuma linha com nome e preço foi encontrada.");
  const db = getDb();
  const insert = db.prepare(`INSERT INTO products (id, user_id, name, image, price, sale_price, unit, notes, category, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, NULL, ?, NULL, NULL, ?, ?)`);
  const rows: ProductRow[] = [];
  db.exec("BEGIN");
  try {
    for (const item of valid) {
      const id = newId();
      const now = nowIso();
      insert.run(id, req.user!.id, item.name, item.price!, item.unit, now, now);
      rows.push(db.prepare("SELECT * FROM products WHERE id=?").get(id) as unknown as ProductRow);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  res.status(201).json({
    success: true,
    products: rows.map(productDto),
    ignored: parsed.filter(item => item.price === null).map(item => ({ line: item.line, reason: "Preço não identificado" })),
  });
}));

productRouter.post("/:id/find-image", asyncHandler(async (req, res) => {
  const row = getDb().prepare("SELECT * FROM products WHERE id=? AND user_id=?").get(req.params.id!, req.user!.id) as unknown as ProductRow | undefined;
  if (!row) throw ApiError.notFound("Produto nao encontrado");
  const saved = getDb().prepare("SELECT p.image FROM products p JOIN assets a ON p.image='/api/assets/' || a.id || '/file' WHERE p.user_id=? AND a.user_id=? AND p.image IS NOT NULL AND LOWER(p.name)=LOWER(?) ORDER BY p.updated_at DESC LIMIT 1")
    .get(req.user!.id, req.user!.id, row.name) as { image: string } | undefined;
  if (saved) {
    getDb().prepare("UPDATE products SET image=?,updated_at=? WHERE id=? AND user_id=?").run(saved.image, nowIso(), row.id, req.user!.id);
    res.json({ success: true, candidates: [], product: productDto({ ...row, image: saved.image }) });
    return;
  }
  const candidates = await searchProductImages(row.name);
  if (!candidates[0]) throw ApiError.notFound("Nenhuma foto encontrada para este produto.");
  for (const candidate of candidates.slice(0, 3)) {
    try {
      const result = await persistProductImage(req.user!.id, row.id, candidate.imageUrl);
      res.json({ success: true, candidates, ...result });
      return;
    } catch { /* A broken image must not hide the remaining candidates. */ }
  }
  throw new ApiError(502, "As fotos encontradas não puderam ser baixadas. Envie uma foto pela biblioteca ou tente novamente.");
}));

productRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM products WHERE id = ? AND user_id = ?`).get(req.params.id!, req.user!.id) as
      | ProductRow
      | undefined;
    if (!row) throw ApiError.notFound("Produto nao encontrado");
    res.json({ success: true, product: productDto(row) });
  }),
);

productRouter.post("/parse-line", asyncHandler(async (req, res) => {
  const { text } = parseWith(z.object({ text: z.string().trim().min(1).max(500) }), "body", req.body);
  res.json({ success: true, parsed: parseProductLine(text) });
}));

productRouter.post("/:id/price", asyncHandler(async (req, res) => {
  const body = parseWith(z.object({ price: z.coerce.number().min(0).max(1_000_000), salePrice: z.coerce.number().min(0).max(1_000_000).nullable().optional() }), "body", req.body);
  const result = getDb().prepare("UPDATE products SET price=?,sale_price=?,updated_at=? WHERE id=? AND user_id=?").run(body.price, body.salePrice ?? null, nowIso(), req.params.id!, req.user!.id);
  if (!result.changes) throw ApiError.notFound("Produto nao encontrado");
  const row = getDb().prepare("SELECT * FROM products WHERE id=?").get(req.params.id!) as unknown as ProductRow;
  res.json({ success: true, product: productDto(row) });
}));

productRouter.post("/:id/remove-background", asyncHandler(async (req, res) => {
  const body = parseWith(z.object({ tolerance: z.number().min(0).max(255).default(30) }), "body", req.body ?? {});
  const row = getDb().prepare("SELECT * FROM products WHERE id=? AND user_id=?").get(req.params.id!, req.user!.id) as unknown as ProductRow | undefined;
  if (!row) throw ApiError.notFound("Produto nao encontrado");
  if (!row.image) throw ApiError.badRequest("O produto não possui imagem.");
  const asset = await removeAssetBackground(req.user!.id, row.image, body.tolerance);
  getDb().prepare("UPDATE products SET image=?,updated_at=? WHERE id=? AND user_id=?").run(asset.imageUrl, nowIso(), row.id, req.user!.id);
  const updated = getDb().prepare("SELECT * FROM products WHERE id=?").get(row.id) as unknown as ProductRow;
  res.json({ success: true, product: productDto(updated), asset });
}));

productRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = parseWith(productSchema, "body", req.body);
    const db = getDb();
    const id = newId();
    const now = nowIso();
    db.prepare(
      `INSERT INTO products (id, user_id, name, image, price, sale_price, unit, notes, category, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      req.user!.id,
      body.name,
      body.image ?? null,
      body.price,
      body.salePrice ?? null,
      body.unit ?? null,
      body.notes ?? null,
      body.category ?? null,
      now,
      now,
    );
    const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as unknown as ProductRow;
    res.status(201).json({ success: true, product: productDto(row) });
  }),
);

productRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = parseWith(productSchema, "body", req.body);
    const db = getDb();
    const existing = db.prepare(`SELECT * FROM products WHERE id = ? AND user_id = ?`).get(req.params.id!, req.user!.id) as
      | ProductRow
      | undefined;
    if (!existing) throw ApiError.notFound("Produto nao encontrado");
    db.prepare(
      `UPDATE products SET name = ?, image = ?, price = ?, sale_price = ?, unit = ?, notes = ?, category = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    ).run(
      body.name,
      body.image ?? null,
      body.price,
      body.salePrice ?? null,
      body.unit ?? null,
      body.notes ?? null,
      body.category ?? null,
      nowIso(),
      req.params.id!,
      req.user!.id,
    );
    const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id!) as unknown as ProductRow;
    res.json({ success: true, product: productDto(row) });
  }),
);

productRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const existing = db.prepare(`SELECT * FROM products WHERE id = ? AND user_id = ?`).get(req.params.id!, req.user!.id);
    if (!existing) throw ApiError.notFound("Produto nao encontrado");
    db.prepare(`DELETE FROM products WHERE id = ? AND user_id = ?`).run(req.params.id!, req.user!.id);
    res.status(204).end();
  }),
);
