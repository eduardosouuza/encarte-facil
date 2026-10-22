import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { asyncHandler, ApiError, parseWith } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { flyerListQuerySchema, flyerPayloadSchema } from "./flyer.schema.js";
import {
  createFlyer,
  deleteFlyer,
  duplicateFlyer,
  getFlyerRow,
  getPublicFlyerRow,
  listFlyers,
  toFlyerDto,
  updateFlyer,
} from "./flyer.service.js";
import { createExport, renderDocument } from "./render.service.js";
import { newId } from "../lib/ids.js";
import { nowIso } from "../lib/time.js";

export const flyerRouter = Router();

flyerRouter.use(requireAuth);

flyerRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = parseWith(flyerListQuerySchema, "query", req.query);
    const result = listFlyers(req.user!.id, query);
    res.json({ success: true, ...result, limit: query.limit, offset: query.offset });
  }),
);

flyerRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const query = parseWith(flyerListQuerySchema, "query", req.query);
    const result = listFlyers(req.user!.id, { ...query, limit: 200, offset: 0 });
    res.json({
      success: true,
      flyers: result.flyers.map((flyer) => ({
        _key: flyer._key,
        name: flyer.name,
        status: flyer.status,
        format: flyer.format,
        template: flyer.template,
        updatedAt: flyer.updatedAt,
      })),
    });
  }),
);

flyerRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const row = getFlyerRow(req.user!.id, req.params.id!);
    if (!row) throw ApiError.notFound("Encarte nao encontrado");
    res.json({ success: true, flyer: toFlyerDto(row) });
  }),
);

flyerRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = parseWith(flyerPayloadSchema, "body", req.body);
    const flyer = createFlyer(req.user!.id, payload);
    res.status(201).json({ success: true, flyer });
  }),
);

flyerRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = getFlyerRow(req.user!.id, req.params.id!);
    if (!existing) throw ApiError.notFound("Encarte nao encontrado");
    const patch = parseWith(flyerPayloadSchema.partial(), "body", req.body);
    const payload = parseWith(flyerPayloadSchema, "body", { ...toFlyerDto(existing), ...patch });
    const flyer = updateFlyer(req.user!.id, req.params.id!, payload);
    res.json({ success: true, flyer });
  }),
);

flyerRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    deleteFlyer(req.user!.id, req.params.id!);
    res.status(204).end();
  }),
);

flyerRouter.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const flyer = duplicateFlyer(req.user!.id, req.params.id!);
    res.status(201).json({ success: true, flyer });
  }),
);

flyerRouter.get(
  "/:id/render.svg",
  asyncHandler(async (req, res) => {
    const row = getFlyerRow(req.user!.id, req.params.id!);
    if (!row) throw ApiError.notFound("Encarte nao encontrado");
    const { svg } = renderDocument(row.user_id, row.id);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(svg);
  }),
);

flyerRouter.post(
  "/:id/render",
  asyncHandler(async (req, res) => {
    const body = parseWith(
      z.object({ format: z.enum(["svg", "png", "jpeg", "pdf"]).default("svg") }),
      "body",
      { ...req.body, format: req.query.format ?? req.body?.format },
    );
    const job = await createExport(req.user!.id, req.params.id!, body.format);
    res.json({
      success: true, export: job, svg: job.svg,
      png: body.format === "png" ? job.fileUrl : null,
      jpeg: body.format === "jpeg" ? job.fileUrl : null,
      pdf: body.format === "pdf" ? job.fileUrl : null,
    });
  }),
);

flyerRouter.post(
  "/:id/whatsapp",
  asyncHandler(async (req, res) => {
    const body = parseWith(
      z.object({ phone: z.string().trim().min(8, "Informe um telefone valido").max(20) }),
      "body",
      req.body,
    );
    const row = getFlyerRow(req.user!.id, req.params.id!);
    if (!row) throw ApiError.notFound("Encarte nao encontrado");

    const db = getDb();
    db.prepare(
      `INSERT INTO deliveries (id, user_id, flyer_id, channel, target, status, created_at) VALUES (?, ?, ?, 'whatsapp', ?, 'queued', ?)`,
    ).run(newId(), req.user!.id, row.id, body.phone, nowIso());

    const digits = body.phone.replace(/\D/g, "");
    res.json({
      success: true,
      message: "Envio por WhatsApp registrado.",
      url: `https://wa.me/${digits}`,
    });
  }),
);

flyerRouter.post("/:id/render-video", asyncHandler(async (req, res) => {
  const { duration } = parseWith(z.object({ duration: z.number().int().min(3).max(30).default(6) }), "body", req.body ?? {});
  const job = await createExport(req.user!.id, req.params.id!, "mp4", undefined, duration);
  res.json({ success: true, mp4: job.fileUrl, export: { ...job, svg: undefined } });
}));

flyerRouter.post(
  "/:id/email",
  asyncHandler(async (req, res) => {
    const body = parseWith(
      z.object({ email: z.string().trim().email("Informe um e-mail valido").max(180) }),
      "body",
      req.body,
    );
    const row = getFlyerRow(req.user!.id, req.params.id!);
    if (!row) throw ApiError.notFound("Encarte nao encontrado");

    const db = getDb();
    db.prepare(
      `INSERT INTO deliveries (id, user_id, flyer_id, channel, target, status, created_at) VALUES (?, ?, ?, 'email', ?, 'queued', ?)`,
    ).run(newId(), req.user!.id, row.id, body.email, nowIso());

    res.json({ success: true, message: "Envio por e-mail registrado." });
  }),
);

export const publicFlyerRouter = Router();

publicFlyerRouter.get(
  "/:id",
  asyncHandler(async (req, res, next) => {
    if (req.baseUrl === "/p" && req.headers.accept?.includes("text/html")) { next(); return; }
    const row = getPublicFlyerRow(req.params.id!);
    if (!row) throw ApiError.notFound("Encarte nao encontrado");
    res.json({ success: true, flyer: toFlyerDto(row) });
  }),
);

publicFlyerRouter.get(
  "/:id/render.svg",
  asyncHandler(async (req, res) => {
    const row = getPublicFlyerRow(req.params.id!);
    if (!row) throw ApiError.notFound("Encarte nao encontrado");
    const { svg } = renderDocument(row.user_id, row.id);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.send(svg);
  }),
);
