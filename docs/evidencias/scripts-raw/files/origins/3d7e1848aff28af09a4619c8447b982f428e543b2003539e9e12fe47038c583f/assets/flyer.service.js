import { getDb } from "../db/connection.js";
import { newId } from "../lib/ids.js";
import { nowIso } from "../lib/time.js";
import { ApiError } from "../lib/http.js";
function parseJson(value, fallback) {
    if (!value)
        return fallback;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
export function toFlyerDto(row) {
    return {
        _key: row.id,
        _id: `flyers/${row.id}`,
        _rev: row.updated_at,
        name: row.name,
        content: row.content,
        status: row.status,
        format: row.format,
        design: row.design,
        palette: parseJson(row.palette, []),
        backgroundColor: row.background_color,
        startAt: row.start_at,
        endAt: row.end_at,
        template: row.is_template === 1,
        public: row.is_public === 1,
        highlighted: row.is_highlighted === 1,
        grid: parseJson(row.grid, null),
        gridHighlights: parseJson(row.grid_highlights, null),
        settings: parseJson(row.settings, {}),
        pageSettings: parseJson(row.page_settings, {}),
        elements: parseJson(row.elements, []),
        products: parseJson(row.products, []),
        footer: parseJson(row.footer, { visible: true, elements: [] }),
        preview: `/api/flyers/${row.id}/render.svg`,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
export function listFlyers(userId, query) {
    const db = getDb();
    const where = ["user_id = ?"];
    const params = [userId];
    if (query.term) {
        where.push("LOWER(name) LIKE ?");
        params.push(`%${query.term.toLowerCase()}%`);
    }
    if (query.format) {
        where.push("format = ?");
        params.push(query.format);
    }
    if (query.status) {
        where.push("status = ?");
        params.push(query.status);
    }
    if (query.template) {
        where.push("is_template = ?");
        params.push(query.template === "true" ? 1 : 0);
    }
    const clause = where.join(" AND ");
    const total = db.prepare(`SELECT COUNT(*) AS total FROM flyers WHERE ${clause}`).get(...params).total;
    const rows = db
        .prepare(`SELECT * FROM flyers WHERE ${clause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
        .all(...params, query.limit, query.offset);
    return { flyers: rows.map(toFlyerDto), total };
}
export function getFlyerRow(userId, id) {
    const db = getDb();
    return db.prepare(`SELECT * FROM flyers WHERE id = ? AND user_id = ?`).get(id, userId);
}
export function getPublicFlyerRow(id) {
    const db = getDb();
    return db.prepare(`SELECT * FROM flyers WHERE id = ? AND is_public = 1`).get(id);
}
export function createFlyer(userId, payload) {
    const db = getDb();
    const id = newId();
    const now = nowIso();
    db.prepare(`INSERT INTO flyers (id, user_id, name, content, status, format, design, palette, background_color, start_at, end_at,
      is_template, is_public, is_highlighted, grid, grid_highlights, settings, page_settings, elements, products, footer,
      created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, payload.name, payload.content, payload.status, payload.format ?? null, payload.design ?? null, JSON.stringify(payload.palette), payload.backgroundColor, payload.startAt ?? null, payload.endAt ?? null, payload.template ? 1 : 0, payload.public ? 1 : 0, payload.grid ? JSON.stringify(payload.grid) : null, payload.gridHighlights ? JSON.stringify(payload.gridHighlights) : null, JSON.stringify(payload.settings), JSON.stringify(payload.pageSettings), JSON.stringify(payload.elements), JSON.stringify(payload.products), JSON.stringify(payload.footer), now, now);
    const row = getFlyerRow(userId, id);
    if (!row)
        throw new ApiError(500, "Falha ao criar encarte");
    return toFlyerDto(row);
}
export function updateFlyer(userId, id, payload) {
    const db = getDb();
    const existing = getFlyerRow(userId, id);
    if (!existing)
        throw ApiError.notFound("Encarte nao encontrado");
    db.prepare(`UPDATE flyers SET name = ?, content = ?, status = ?, format = ?, design = ?, palette = ?, background_color = ?,
      start_at = ?, end_at = ?, is_template = ?, is_public = ?, grid = ?, grid_highlights = ?, settings = ?, page_settings = ?,
      elements = ?, products = ?, footer = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`).run(payload.name, payload.content, payload.status, payload.format ?? null, payload.design ?? null, JSON.stringify(payload.palette), payload.backgroundColor, payload.startAt ?? null, payload.endAt ?? null, payload.template ? 1 : 0, payload.public ? 1 : 0, payload.grid ? JSON.stringify(payload.grid) : null, payload.gridHighlights ? JSON.stringify(payload.gridHighlights) : null, JSON.stringify(payload.settings), JSON.stringify(payload.pageSettings), JSON.stringify(payload.elements), JSON.stringify(payload.products), JSON.stringify(payload.footer), nowIso(), id, userId);
    const row = getFlyerRow(userId, id);
    if (!row)
        throw ApiError.notFound("Encarte nao encontrado");
    return toFlyerDto(row);
}
export function deleteFlyer(userId, id) {
    const db = getDb();
    const existing = getFlyerRow(userId, id);
    if (!existing)
        throw ApiError.notFound("Encarte nao encontrado");
    db.prepare(`DELETE FROM flyers WHERE id = ? AND user_id = ?`).run(id, userId);
}
export function duplicateFlyer(userId, id) {
    const existing = getFlyerRow(userId, id);
    if (!existing)
        throw ApiError.notFound("Encarte nao encontrado");
    const db = getDb();
    const newIdValue = newId();
    const now = nowIso();
    db.prepare(`INSERT INTO flyers (id, user_id, name, content, status, format, design, palette, background_color, start_at, end_at,
      is_template, is_public, is_highlighted, grid, grid_highlights, settings, page_settings, elements, products, footer,
      created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(newIdValue, userId, `${existing.name} (copia)`, existing.content, "draft", existing.format, existing.design, existing.palette, existing.background_color, existing.start_at, existing.end_at, existing.is_template, existing.is_public, existing.is_highlighted, existing.grid, existing.grid_highlights, existing.settings, existing.page_settings, existing.elements, existing.products, existing.footer, now, now);
    const row = getFlyerRow(userId, newIdValue);
    if (!row)
        throw new ApiError(500, "Falha ao duplicar encarte");
    return toFlyerDto(row);
}
