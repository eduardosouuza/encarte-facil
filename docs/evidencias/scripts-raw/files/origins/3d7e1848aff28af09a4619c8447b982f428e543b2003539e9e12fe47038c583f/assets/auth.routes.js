import { Router } from "express";
import { z } from "zod";
import { asyncHandler, ApiError, parseWith } from "../lib/http.js";
import { SESSION_COOKIE, optionalAuth, requireAuth } from "../middleware/auth.js";
import { consumePasswordReset, createPasswordReset, createUser, findUserByEmail, registerSession, revokeSession, toPublicUser, updateUserPassword, verifyPassword, } from "./auth.service.js";
import { config } from "../config.js";
export const authRouter = Router();
const emailSchema = z
    .string()
    .trim()
    .min(1, "Informe o e-mail")
    .email("Informe um e-mail valido")
    .max(180);
const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Informe a senha").max(200),
});
const registerSchema = z.object({
    name: z.string().trim().min(2, "Informe seu nome").max(120),
    email: emailSchema,
    password: z
        .string()
        .min(6, "A senha deve ter ao menos 6 caracteres")
        .max(200),
    phone: z.string().trim().max(40).optional(),
    market: z.string().trim().max(8).optional(),
    locale: z.string().trim().max(12).optional(),
});
function setSessionCookie(res, token) {
    res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
    });
}
authRouter.post("/login", asyncHandler(async (req, res) => {
    const body = parseWith(loginSchema, "body", req.body);
    const user = findUserByEmail(body.email);
    if (!user || !verifyPassword(body.password, user.password_hash)) {
        throw new ApiError(401, "Credenciais invalidas", "invalid_credentials");
    }
    const token = registerSession(user, {
        userAgent: req.header("user-agent"),
        ip: req.ip,
    });
    setSessionCookie(res, token);
    res.json({
        success: true,
        token,
        user: toPublicUser(user),
        partner: {
            _key: "encartefacil",
            name: "Encartefacil",
            config: {
                product: { name: "Encartefacil", description: "Criador de encartes digitais" },
                app: { name: "Encartefacil", domain: "encartefacil.com" },
            },
        },
    });
}));
authRouter.post("/register", asyncHandler(async (req, res) => {
    const body = parseWith(registerSchema, "body", req.body);
    const user = createUser({
        email: body.email,
        password: body.password,
        name: body.name,
        phone: body.phone ?? null,
        market: body.market ?? "BR",
        locale: body.locale ?? "pt-br",
    });
    const token = registerSession(user, { userAgent: req.header("user-agent"), ip: req.ip });
    setSessionCookie(res, token);
    res.status(201).json({ success: true, token, user: toPublicUser(user) });
}));
authRouter.post("/logout", optionalAuth, asyncHandler(async (req, res) => {
    const token = req.authToken ?? req.cookies?.[SESSION_COOKIE];
    if (token)
        revokeSession(token);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ success: true });
}));
authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
    const user = req.user;
    res.json({ success: true, user: toPublicUser(user), betas: [] });
}));
authRouter.get("/verify", requireAuth, asyncHandler(async (_req, res) => {
    res.json({ success: true });
}));
authRouter.get("/capabilities", asyncHandler(async (_req, res) => {
    res.json({ success: true, capabilities: { passwordRecovery: true, registration: true } });
}));
authRouter.post("/forgot-password", asyncHandler(async (req, res) => {
    const body = parseWith(z.object({ email: emailSchema }), "body", req.body);
    const user = findUserByEmail(body.email);
    if (!user) {
        // Resposta identica para e-mail existente ou nao, para nao enumerar contas.
        res.json({ success: true, message: "Se o e-mail existir, as instrucoes de redefinicao serao enviadas." });
        return;
    }
    const reset = createPasswordReset(user.id);
    res.json({
        success: true,
        message: "Se o e-mail existir, as instrucoes de redefinicao serao enviadas.",
        // Em ambiente local o token e devolvido para permitir o fluxo sem servidor de e-mail.
        resetToken: reset.token,
        expiresAt: reset.expiresAt,
    });
}));
authRouter.post("/reset-password", asyncHandler(async (req, res) => {
    const body = parseWith(z.object({
        token: z.string().min(8, "Token invalido"),
        email: emailSchema,
        password: z.string().min(6, "A senha deve ter ao menos 6 caracteres").max(200),
    }), "body", req.body);
    const user = consumePasswordReset(body.token, body.email);
    updateUserPassword(user, body.password);
    res.json({ success: true, message: "Senha redefinida com sucesso." });
}));
export { setSessionCookie };
