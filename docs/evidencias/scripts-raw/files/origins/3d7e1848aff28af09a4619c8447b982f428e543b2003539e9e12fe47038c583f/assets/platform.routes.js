import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { asyncHandler, parseWith } from "../lib/http.js";
import { newId } from "../lib/ids.js";
import { nowIso } from "../lib/time.js";
export const platformRouter = Router();
/** Reproduz a deteccao de mercado observada em `GET /public/market`. */
platformRouter.get("/public/market", asyncHandler(async (req, res) => {
    const query = parseWith(z.object({ locale: z.string().trim().max(12).optional() }), "query", req.query);
    const locale = (query.locale ?? "pt-br").toLowerCase();
    const market = locale.startsWith("pt") ? "BR" : locale.startsWith("es") ? "ES" : locale.startsWith("en") ? "US" : "BR";
    res.json({
        success: true,
        ipCountry: market,
        prompt: {
            ask: false,
            reason: "signals_agree",
            guess: { market, locale },
        },
    });
}));
const TRANSLATIONS = {
    "pt-br": {
        "app.title": "Encartefacil",
        "nav.dashboard": "Painel",
        "nav.flyers": "Encartes",
        "nav.editor": "Editor",
        "nav.products": "Produtos",
        "nav.designs": "Modelos",
        "nav.exports": "Exportacoes",
        "nav.billing": "Plano e cobranca",
        "nav.settings": "Configuracoes",
        "auth.login.title": "Logar",
        "auth.login.submit": "Entrar",
        "auth.register.submit": "Criar conta",
        "auth.forgot": "Esqueci minha senha",
        "flyer.empty": "Nenhum encarte por aqui ainda",
        "flyer.create": "Novo encarte",
    },
    en: {
        "app.title": "Encartefacil",
        "nav.dashboard": "Dashboard",
        "nav.flyers": "Flyers",
        "nav.editor": "Editor",
        "nav.products": "Products",
        "nav.designs": "Templates",
        "nav.exports": "Exports",
        "nav.billing": "Plan & billing",
        "nav.settings": "Settings",
        "auth.login.title": "Sign in",
        "auth.login.submit": "Sign in",
        "auth.register.submit": "Create account",
        "auth.forgot": "Forgot my password",
        "flyer.empty": "No flyers here yet",
        "flyer.create": "New flyer",
    },
};
platformRouter.get("/translations/:locale", asyncHandler(async (req, res) => {
    const locale = req.params.locale.toLowerCase();
    res.json(TRANSLATIONS[locale] ?? TRANSLATIONS["en"]);
}));
platformRouter.post("/marketing/track", asyncHandler(async (req, res) => {
    const body = parseWith(z
        .object({
        eventType: z.string().trim().max(80),
        eventId: z.string().trim().max(120).optional(),
        eventData: z.record(z.string(), z.unknown()).optional(),
        visitorId: z.string().trim().max(120).optional(),
        sessionId: z.string().trim().max(120).optional(),
        pageUrl: z.string().trim().max(2000).optional(),
        referrer: z.string().trim().max(2000).optional(),
    })
        .passthrough(), "body", req.body ?? {});
    const db = getDb();
    db.prepare(`INSERT INTO marketing_events (id, user_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)`).run(newId(), null, body.eventType, JSON.stringify(body), nowIso());
    res.status(204).end();
}));
