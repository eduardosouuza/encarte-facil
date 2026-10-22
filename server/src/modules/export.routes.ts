import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { asyncHandler, ApiError, parseWith } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { createExport, type ExportFormat } from "./render.service.js";
import { nowIso } from "../lib/time.js";

export const exportRouter = Router();

exportRouter.use(requireAuth);

interface ExportRow {
  id: string;
  user_id: string;
  flyer_id: string | null;
  kind: string;
  format: string;
  status: string;
  progress: number;
  file_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function exportDto(row: ExportRow) {
  return {
    id: row.id,
    kind: row.kind,
    format: row.format,
    flyerId: row.flyer_id,
    status: row.status,
    progress: row.progress,
    files: row.file_url ? [{ url: row.file_url, format: row.format }] : [],
    fileUrl: row.file_url,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

exportRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = parseWith(
      z.object({
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      }),
      "query",
      req.query,
    );
    const db = getDb();
    const rows = db
      .prepare(`SELECT * FROM exports WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(req.user!.id, query.limit, query.offset) as unknown as ExportRow[];
    const total = (
      db.prepare(`SELECT COUNT(*) AS total FROM exports WHERE user_id = ?`).get(req.user!.id) as { total: number }
    ).total;
    res.json({ success: true, exports: rows.map(exportDto), total, limit: query.limit, offset: query.offset });
  }),
);

exportRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = parseWith(
      z.object({
        flyerId: z.string().trim().min(1).max(60),
        kind: z.enum(["image", "video"]).default("image"),
        format: z.enum(["svg", "png", "jpeg", "pdf", "mp4"]).default("png"),
      }),
      "body",
      req.body,
    );
    const db = getDb();
    const flyer = db.prepare(`SELECT id FROM flyers WHERE id = ? AND user_id = ?`).get(body.flyerId, req.user!.id);
    if (!flyer) throw ApiError.notFound("Encarte nao encontrado");

    const { id } = await createExport(req.user!.id, body.flyerId, body.format);
    const row = db.prepare(`SELECT * FROM exports WHERE id = ?`).get(id) as unknown as ExportRow;
    res.status(201).json({ success: true, export: exportDto(row) });
  }),
);

exportRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM exports WHERE id = ? AND user_id = ?`).get(req.params.id!, req.user!.id) as
      | ExportRow
      | undefined;
    if (!row) throw ApiError.notFound("Exportacao nao encontrada");
    if (row.status === "completed") {
      throw ApiError.badRequest("A exportacao ja foi concluida e nao pode ser cancelada.");
    }
    db.prepare(`UPDATE exports SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(nowIso(), req.params.id!);
    res.json({ success: true });
  }),
);

exportRouter.post(
  "/:id/retry",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM exports WHERE id = ? AND user_id = ?`).get(req.params.id!, req.user!.id) as
      | ExportRow
      | undefined;
    if (!row) throw ApiError.notFound("Exportacao nao encontrada");
    if (row.status === "processing") throw ApiError.conflict("Exportação em andamento");
    await createExport(req.user!.id, row.flyer_id!, row.format as ExportFormat, row.id);
    const updated = db.prepare(`SELECT * FROM exports WHERE id = ?`).get(req.params.id!) as unknown as ExportRow;
    res.json({ success: true, export: exportDto(updated) });
  }),
);

exportRouter.get("/:id/file", asyncHandler(async (req, res) => {
  const job = getDb().prepare("SELECT * FROM exports WHERE id=? AND user_id=?").get(req.params.id!, req.user!.id) as unknown as ExportRow | undefined;
  if (!job) throw ApiError.notFound("Exportação não encontrada");
  const file = getDb().prepare("SELECT * FROM export_files WHERE export_id=?").get(job.id) as { data: Uint8Array; content_type: string } | undefined;
  if (!file) throw ApiError.notFound("Arquivo indisponível. Gere a exportação novamente.");
  res.set({ "Content-Type": file.content_type, "Content-Disposition": `attachment; filename="encarte-${job.id}.${job.format}"`, "Cache-Control": "private, no-store" }).send(Buffer.from(file.data));
}));
exportRouter.get("/stream", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  const send = () => {
    const rows = getDb().prepare("SELECT * FROM exports WHERE user_id=? ORDER BY created_at DESC LIMIT 50").all(req.user!.id) as unknown as ExportRow[];
    res.write(`event: exports\ndata: ${JSON.stringify({ exports: rows.map(exportDto) })}\n\n`);
  };
  send();
  const timer = setInterval(send, 2000);
  req.on("close", () => clearInterval(timer));
});
