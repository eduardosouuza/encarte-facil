import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/http.js";
import { findUserById, isSessionActive, verifyToken, type UserRow } from "../modules/auth.service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRow;
      authToken?: string;
    }
  }
}

export const SESSION_COOKIE = "ef_token";

function extractToken(req: Request): string | undefined {
  const header = req.header("authorization");
  if (header && /^bearer\s+/i.test(header)) {
    return header.replace(/^bearer\s+/i, "").trim();
  }
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  if (cookie) return cookie;
  return undefined;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(ApiError.unauthorized());
    return;
  }
  try {
    const payload = verifyToken(token);
    if (!isSessionActive(token)) {
      next(ApiError.unauthorized("Token invalido ou expirado"));
      return;
    }
    const user = findUserById(payload.sub);
    if (!user) {
      next(ApiError.unauthorized("Token invalido ou expirado"));
      return;
    }
    req.user = user;
    req.authToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyToken(token);
    const user = findUserById(payload.sub);
    if (user) {
      req.user = user;
      req.authToken = token;
    }
  } catch {
    // Sessao expirada em rota publica: segue sem usuario.
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden());
      return;
    }
    next();
  };
}
