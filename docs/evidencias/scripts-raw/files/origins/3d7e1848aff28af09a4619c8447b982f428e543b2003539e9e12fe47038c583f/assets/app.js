import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./lib/http.js";
import { authRouter } from "./modules/auth.routes.js";
import { flyerRouter, publicFlyerRouter } from "./modules/flyer.routes.js";
import { catalogRouter, publicCatalogRouter } from "./modules/catalog.routes.js";
import { productRouter } from "./modules/product.routes.js";
import { exportRouter } from "./modules/export.routes.js";
import { billingRouter, customerRouter, partnerRouter } from "./modules/account.routes.js";
import { platformRouter } from "./modules/platform.routes.js";
import { mediaRouter } from "./modules/media.routes.js";
export function createApp() {
    const app = express();
    app.disable("x-powered-by");
    app.use(cors({
        origin: config.appOrigin === "*" ? true : config.appOrigin.split(",").map((o) => o.trim()),
        credentials: true,
    }));
    app.use(express.json({ limit: "8mb" }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    if (!config.isProduction) {
        app.use(morgan("dev"));
    }
    app.get("/api/health", (_req, res) => {
        res.json({ success: true, status: "ok", version: "1.0.0" });
    });
    app.use("/api/auth", authRouter);
    app.use("/api/customers", customerRouter);
    app.use("/api/partners", partnerRouter);
    app.use("/api/billing", billingRouter);
    app.get("/api/prices", (_req, res) => {
        res.redirect(307, "/api/billing/prices");
    });
    app.get("/api/subscriptions/me", (_req, res) => {
        res.redirect(307, "/api/billing/subscriptions/me");
    });
    app.use("/api/flyers", flyerRouter);
    app.use("/api/products", productRouter);
    app.use("/api/exports", exportRouter);
    app.use("/api", mediaRouter);
    app.use("/api", catalogRouter);
    app.use("/api", platformRouter);
    app.use("/p", publicFlyerRouter);
    // Alias sob /api para o cliente HTTP da SPA (que sempre prefixa /api).
    app.use("/api/p", publicFlyerRouter);
    app.use("/api/public", publicCatalogRouter);
    // Em producao o proprio servidor entrega o build do frontend (SPA fallback).
    if (config.isProduction && fs.existsSync(config.staticDir)) {
        app.use(express.static(config.staticDir));
        app.get("*", (req, res, next) => {
            if (req.path === "/api" || req.path.startsWith("/api/")) {
                next();
                return;
            }
            res.sendFile(path.join(config.staticDir, "index.html"));
        });
    }
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}
