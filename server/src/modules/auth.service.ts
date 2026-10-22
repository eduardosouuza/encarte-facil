import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { getDb } from "../db/connection.js";
import { config } from "../config.js";
import { newId, newPrefixedId } from "../lib/ids.js";
import { isoIn, nowIso } from "../lib/time.js";
import { ApiError } from "../lib/http.js";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  document: string | null;
  market: string;
  locale: string;
  role: string;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  _key: string;
  _id: string;
  email: string;
  name: string;
  phone: string | null;
  document: string | null;
  market: string;
  locale: string;
  role: string;
  credits: number;
  createdAt: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    _key: row.id,
    _id: `users/${row.id}`,
    email: row.email,
    name: row.name,
    phone: row.phone,
    document: row.document,
    market: row.market,
    locale: row.locale,
    role: row.role,
    credits: row.credits,
    createdAt: row.created_at,
  };
}

export function findUserByEmail(email: string): UserRow | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.trim().toLowerCase()) as unknown as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as unknown as UserRow | undefined;
}

export function createUser(input: {
  email: string;
  password: string;
  name: string;
  phone?: string | null;
  market?: string;
  locale?: string;
  role?: string;
  credits?: number;
}): UserRow {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  if (findUserByEmail(email)) {
    throw ApiError.conflict("Ja existe uma conta com este e-mail");
  }
  const now = nowIso();
  const id = newPrefixedId("usr");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, phone, document, market, locale, role, credits, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    email,
    bcrypt.hashSync(input.password, config.bcryptRounds),
    input.name.trim(),
    input.phone ?? null,
    null,
    input.market ?? "BR",
    input.locale ?? "pt-br",
    input.role ?? "customer",
    input.credits ?? 0,
    now,
    now,
  );
  const created = findUserById(id);
  if (!created) throw new ApiError(500, "Falha ao criar usuario");
  return created;
}

export function signToken(user: Pick<UserRow, "id" | "email" | "role">): string {
  const payload: TokenPayload = { sub: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch {
    throw new ApiError(401, "Token invalido ou expirado", "token_invalid");
  }
}

export function registerSession(user: Pick<UserRow, "id" | "email" | "role">, meta: { userAgent?: string; ip?: string }): string {
  const db = getDb();
  const token = signToken(user);
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, user_agent, ip, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(newPrefixedId("ses"), user.id, hash, meta.userAgent ?? null, meta.ip ?? null, isoIn(7), nowIso());
  return token;
}

export function revokeSession(token: string): void {
  const db = getDb();
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hash);
}

export function revokeAllSessions(userId: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

/** Confere se o token ainda corresponde a uma sessao ativa (nao revogada). */
export function isSessionActive(token: string): boolean {
  const db = getDb();
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const row = db.prepare(`SELECT expires_at FROM sessions WHERE token_hash = ?`).get(hash) as
    | { expires_at: string }
    | undefined;
  if (!row) return false;
  return new Date(row.expires_at).getTime() > Date.now();
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, config.bcryptRounds);
}

export function createPasswordReset(userId: string): { token: string; expiresAt: string } {
  const db = getDb();
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = isoIn(1);
  db.prepare(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at, created_at)
     VALUES (?, ?, ?, ?, NULL, ?)`,
  ).run(newPrefixedId("prs"), userId, crypto.createHash("sha256").update(token).digest("hex"), expiresAt, nowIso());
  return { token, expiresAt };
}

export function consumePasswordReset(token: string, email: string): UserRow {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM password_resets WHERE token_hash = ?`)
    .get(crypto.createHash("sha256").update(token).digest("hex")) as
    | { id: string; user_id: string; expires_at: string; used_at: string | null }
    | undefined;
  if (!row || row.used_at) {
    throw ApiError.badRequest("Token de redefinicao invalido");
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw ApiError.badRequest("Token de redefinicao expirado");
  }
  const user = findUserByEmail(email);
  if (!user || user.id !== row.user_id) {
    throw ApiError.badRequest("Token de redefinicao invalido");
  }
  db.prepare(`UPDATE password_resets SET used_at = ? WHERE id = ?`).run(nowIso(), row.id);
  return user;
}

export function updateUserPassword(user: UserRow, password: string): void {
  const db = getDb();
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(hashPassword(password), nowIso(), user.id);
  revokeAllSessions(user.id);
}

export function newUserAgentId(): string {
  return newId(16);
}
