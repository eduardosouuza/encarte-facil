import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { asyncHandler, parseWith } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { toPublicUser } from "./auth.service.js";
import { nowIso } from "../lib/time.js";

export const customerRouter = Router();

customerRouter.use(requireAuth);

customerRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json({ success: true, customer: toPublicUser(req.user!) });
  }),
);

customerRouter.put(
  "/me",
  asyncHandler(async (req, res) => {
    const body = parseWith(
      z.object({
        name: z.string().trim().min(2, "Informe seu nome").max(120),
        phone: z.string().trim().max(40).nullable().optional(),
        document: z.string().trim().max(40).nullable().optional(),
        market: z.string().trim().max(8).optional(),
        locale: z.string().trim().max(12).optional(),
      }),
      "body",
      req.body,
    );
    const db = getDb();
    db.prepare(
      `UPDATE users SET name = ?, phone = ?, document = ?, market = ?, locale = ?, updated_at = ? WHERE id = ?`,
    ).run(
      body.name,
      body.phone ?? req.user!.phone,
      body.document ?? req.user!.document,
      body.market ?? req.user!.market,
      body.locale ?? req.user!.locale,
      nowIso(),
      req.user!.id,
    );
    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as unknown as Parameters<
      typeof toPublicUser
    >[0];
    res.json({ success: true, customer: toPublicUser(updated) });
  }),
);

export const partnerRouter = Router();

/**
 * Substituicao propria: o endpoint original (`GET /partners/current`) devolvia a
 * configuracao white-label do parceiro (produtos, precos em centavos, logo).
 * Aqui a mesma forma de resposta e mantida, com os dados reais do seed.
 */
partnerRouter.get(
  "/current",
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      partner: {
        _key: "encartefacil",
        _id: "partners/encartefacil",
        _rev: "seed",
        name: "Encartefacil",
        active: true,
        type: "standard",
        email: "suporte@encartefacil.com",
        feePercent: 0,
        referralRewardCredits: 15,
        defaultCountryCode: "BR",
        products: [
          {
            id: "plano_business",
            name: "Plano Business",
            description: "Crie encartes profissionais em poucos minutos.",
            prices: [
              { credits: 10, amount: 5900 },
              { credits: 30, amount: 8900 },
              { credits: 60, amount: 12900 },
              { credits: 100, amount: 15900 },
              { credits: 150, amount: 18900 },
              { credits: 200, amount: 23900 },
              { credits: 300, amount: 34900 },
            ],
          },
        ],
        config: {
          product: {
            name: "Encartefacil",
            description: "Criador de encartes digitais",
            logo: null,
          },
          app: {
            name: "Encartefacil",
            description: "Crie encartes e tabloides de ofertas em apenas alguns minutos.",
            domain: "encartefacil.com",
          },
          email: { sender: "suporte@encartefacil.com" },
        },
      },
    });
  }),
);

export const billingRouter = Router();

billingRouter.use(requireAuth);

billingRouter.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const counts = db
      .prepare(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published
         FROM flyers WHERE user_id = ?`,
      )
      .get(req.user!.id) as { total: number; published: number | null };
    const exports = db
      .prepare(`SELECT COUNT(*) AS total FROM exports WHERE user_id = ?`)
      .get(req.user!.id) as { total: number };

    res.json({
      success: true,
      data: {
        credits: req.user!.credits,
        plan: req.user!.credits >= 60 ? "Business" : req.user!.credits >= 10 ? "Starter" : "Free",
        flyers: { total: counts.total, published: counts.published ?? 0 },
        exports: { total: exports.total },
        renewsAt: null,
      },
    });
  }),
);

billingRouter.get(
  "/prices",
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      data: [
        { id: "credits_10", name: "Plano Business", credits: 10, amount: 5900, currency: "BRL" },
        { id: "credits_30", name: "Plano Business", credits: 30, amount: 8900, currency: "BRL" },
        { id: "credits_60", name: "Plano Business", credits: 60, amount: 12900, currency: "BRL" },
        { id: "credits_100", name: "Plano Business", credits: 100, amount: 15900, currency: "BRL" },
        { id: "credits_150", name: "Plano Business", credits: 150, amount: 18900, currency: "BRL" },
        { id: "credits_200", name: "Plano Business", credits: 200, amount: 23900, currency: "BRL" },
        { id: "credits_300", name: "Plano Business", credits: 300, amount: 34900, currency: "BRL" },
      ],
    });
  }),
);

billingRouter.get(
  "/subscriptions/me",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        status: req.user!.credits > 0 ? "active" : "inactive",
        plan: req.user!.credits >= 60 ? "Business" : req.user!.credits >= 10 ? "Starter" : "Free",
        credits: req.user!.credits,
        currentPeriodEnd: null,
      },
    });
  }),
);
