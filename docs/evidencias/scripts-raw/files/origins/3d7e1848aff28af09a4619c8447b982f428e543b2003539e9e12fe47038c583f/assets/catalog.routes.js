import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { asyncHandler, parseWith } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { THEMES } from "../db/seed.js";
import { ELEMENT_LIBRARY, INDUSTRIES } from "./editor-catalog.data.js";
export const catalogRouter = Router();
catalogRouter.get("/elements", (req, res) => {
    const term = String(req.query.term ?? "").trim().toLocaleLowerCase("pt-BR");
    const category = String(req.query.category ?? "").trim();
    const categories = category === "seal" ? ["3d", "tags"] : [category];
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const elements = ELEMENT_LIBRARY.filter((element) => (!term || element.title.toLocaleLowerCase("pt-BR").includes(term)) && (!category || categories.includes(element.category))).slice(offset, offset + limit);
    res.json({ success: true, elements });
});
catalogRouter.get("/elements/colored", (req, res) => {
    const id = String(req.query.url ?? "").replace(/^element:/, "");
    const color = /^#[0-9a-f]{6}$/i.test(String(req.query.color ?? "")) ? String(req.query.color) : "#e11d48";
    const element = ELEMENT_LIBRARY.find((item) => item._key === id);
    if (!element)
        return void res.status(404).json({ success: false, error: "Elemento não encontrado" });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="32" fill="${color}"/></svg>`;
    res.json({ success: true, svg });
});
catalogRouter.get("/elements/:id", (req, res) => {
    const element = ELEMENT_LIBRARY.find((item) => item._key === req.params.id);
    if (!element)
        return void res.status(404).json({ success: false, error: "Elemento não encontrado" });
    res.json({ success: true, element });
});
catalogRouter.get("/industries", (req, res) => {
    const title = String(req.query.title ?? "").trim().toLocaleLowerCase("pt-BR");
    const industries = INDUSTRIES.filter((item) => !title || item.title.toLocaleLowerCase("pt-BR").includes(title));
    res.json({ success: true, industries });
});
catalogRouter.get("/industries/:id", (req, res) => {
    const industry = INDUSTRIES.find((item) => item._key === req.params.id || item.slug === req.params.id);
    if (!industry)
        return void res.status(404).json({ success: false, error: "Segmento não encontrado" });
    res.json({ success: true, industry });
});
catalogRouter.get("/themes/stats/count", (_req, res) => res.json({ success: true, total: THEMES.length }));
catalogRouter.get("/themes", (req, res) => {
    const term = String(req.query.term ?? "").trim().toLocaleLowerCase("pt-BR");
    const themes = THEMES.filter((theme) => !term || theme.title.toLocaleLowerCase("pt-BR").includes(term)).map((theme, order) => ({
        _key: theme.theme, title: theme.title, description: theme.description, type: "days", days: [], featured: order < 3,
        order: THEMES.length - order, allowedLocales: ["pt-br"], tokens: theme.tokens, fonts: theme.fonts,
    }));
    res.json({ success: true, themes });
});
catalogRouter.get("/themes/:id", (req, res) => {
    const theme = THEMES.find((item) => item.theme === req.params.id);
    if (!theme)
        return void res.status(404).json({ success: false, error: "Tema não encontrado" });
    res.json({ success: true, theme: { _key: theme.theme, ...theme } });
});
function formatDto(row) {
    return {
        _key: row.id,
        _id: `formats/${row.id}`,
        code: row.code,
        title: row.title,
        width: row.width,
        height: row.height,
        uses: JSON.parse(row.uses),
        premium: row.premium === 1,
        customPaperSize: null,
    };
}
catalogRouter.get("/formats", asyncHandler(async (req, res) => {
    const query = parseWith(z.object({
        code: z.string().trim().max(60).optional(),
        title: z.string().trim().max(120).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(100),
        offset: z.coerce.number().int().min(0).default(0),
    }), "query", req.query);
    const db = getDb();
    const where = ["1 = 1"];
    const params = [];
    if (query.code) {
        where.push("code = ?");
        params.push(query.code);
    }
    if (query.title) {
        where.push("LOWER(title) LIKE ?");
        params.push(`%${query.title.toLowerCase()}%`);
    }
    const clause = where.join(" AND ");
    const rows = db
        .prepare(`SELECT * FROM formats WHERE ${clause} ORDER BY sort_order LIMIT ? OFFSET ?`)
        .all(...params, query.limit, query.offset);
    res.json({ success: true, formats: rows.map(formatDto) });
}));
catalogRouter.get("/formats/:id", asyncHandler(async (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM formats WHERE id = ? OR code = ?`).get(req.params.id, req.params.id);
    if (!row) {
        res.status(404).json({ success: false, error: "Formato nao encontrado" });
        return;
    }
    res.json({ success: true, format: formatDto(row) });
}));
function designDto(row) {
    const theme = THEMES.find(item => item.theme === row.theme);
    return {
        _key: row.id,
        _id: `designs/${row.id}`,
        title: row.title,
        category: row.category,
        theme: row.theme,
        status: row.status,
        archived: false,
        thumbnail: row.thumbnail,
        description: row.description,
        backgroundColor: theme?.tokens.base ?? "#ffffff",
        palette: theme ? [theme.tokens.base, theme.tokens.accent, theme.tokens.contrast, theme.tokens.surface] : [],
        elements: JSON.parse(row.elements),
        createdAt: row.created_at,
    };
}
catalogRouter.get("/designs", asyncHandler(async (req, res) => {
    const query = parseWith(z.object({
        term: z.string().trim().max(120).optional(),
        category: z.string().trim().max(40).optional(),
        theme: z.string().trim().max(60).optional(),
        status: z.string().trim().max(40).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
    }), "query", req.query);
    const db = getDb();
    const where = ["1 = 1"];
    const params = [];
    if (query.term) {
        where.push("LOWER(title) LIKE ?");
        params.push(`%${query.term.toLowerCase()}%`);
    }
    if (query.category) {
        where.push("category = ?");
        params.push(query.category);
    }
    if (query.theme) {
        where.push("theme = ?");
        params.push(query.theme);
    }
    if (query.status) {
        where.push("status = ?");
        params.push(query.status);
    }
    const clause = where.join(" AND ");
    const rows = db
        .prepare(`SELECT * FROM designs WHERE ${clause} ORDER BY sort_order, title LIMIT ? OFFSET ?`)
        .all(...params, query.limit, query.offset);
    res.json({ success: true, designs: rows.map(designDto) });
}));
catalogRouter.get("/designs/by-theme", asyncHandler(async (_req, res) => {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM designs ORDER BY sort_order, title`).all();
    const grouped = new Map();
    for (const row of rows) {
        const list = grouped.get(row.theme) ?? [];
        list.push(row);
        grouped.set(row.theme, list);
    }
    res.json({
        success: true,
        data: [...grouped.entries()].map(([theme, designs]) => ({ theme, designs: designs.map(designDto) })),
    });
}));
catalogRouter.get("/designs/:id", asyncHandler(async (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM designs WHERE id = ? OR theme = ?`).get(req.params.id, req.params.id);
    if (!row) {
        res.status(404).json({ success: false, error: "Modelo nao encontrado" });
        return;
    }
    res.json({ success: true, design: designDto(row) });
}));
export const publicCatalogRouter = Router();
publicCatalogRouter.get("/formats", asyncHandler(async (_req, res) => {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM formats ORDER BY sort_order`).all();
    res.json({ success: true, formats: rows.map(formatDto) });
}));
publicCatalogRouter.get("/designs", asyncHandler(async (_req, res) => {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM designs WHERE status = 'approved' ORDER BY sort_order, title`).all();
    res.json({ success: true, designs: rows.map(designDto) });
}));
export { requireAuth };
