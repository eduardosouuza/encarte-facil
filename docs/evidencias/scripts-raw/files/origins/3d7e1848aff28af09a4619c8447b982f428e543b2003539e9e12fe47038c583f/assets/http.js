import { ZodError } from "zod";
/** Erro de dominio com status HTTP e payload no formato da API original. */
export class ApiError extends Error {
    status;
    code;
    details;
    constructor(status, message, code = "error", details) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.details = details;
    }
    static badRequest(message, details) {
        return new ApiError(400, message, "bad_request", details);
    }
    static unauthorized(message = "Nao autenticado") {
        return new ApiError(401, message, "unauthorized");
    }
    static forbidden(message = "Acesso negado") {
        return new ApiError(403, message, "forbidden");
    }
    static notFound(message = "Recurso nao encontrado") {
        return new ApiError(404, message, "not_found");
    }
    static conflict(message) {
        return new ApiError(409, message, "conflict");
    }
}
export function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}
export function parseWith(schema, source, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw ApiError.badRequest("Dados invalidos", result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
        })));
    }
    return result.data;
}
export function notFoundHandler(req, res) {
    res.status(404).json({ success: false, error: `Rota nao encontrada: ${req.method} ${req.path}` });
}
export function errorHandler(err, _req, res, _next) {
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
