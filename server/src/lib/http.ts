import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";

/** Erro de dominio com status HTTP e payload no formato da API original. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = "error", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, "bad_request", details);
  }

  static unauthorized(message = "Nao autenticado"): ApiError {
    return new ApiError(401, message, "unauthorized");
  }

  static forbidden(message = "Acesso negado"): ApiError {
    return new ApiError(403, message, "forbidden");
  }

  static notFound(message = "Recurso nao encontrado"): ApiError {
    return new ApiError(404, message, "not_found");
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message, "conflict");
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

type Source = "body" | "query" | "params";

export function parseWith<T extends ZodTypeAny>(schema: T, source: Source, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw ApiError.badRequest(
      "Dados invalidos",
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Rota nao encontrada: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Dados invalidos",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Erro interno do servidor";
  // eslint-disable-next-line no-console
  console.error("[erro nao tratado]", err);
  res.status(500).json({ success: false, error: message });
}
