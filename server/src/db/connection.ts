import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

/**
 * `node:sqlite` e carregado via `createRequire` porque o resolvedor de modulos
 * do Vite/Vitest nao reconhece `node:sqlite` como builtin.
 */
const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire("node:sqlite") as typeof import("node:sqlite");

type Database = InstanceType<typeof DatabaseSync>;

let instance: Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, content_type TEXT NOT NULL, data BLOB NOT NULL,
  width INTEGER NOT NULL, height INTEGER NOT NULL, processed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS brandkits (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS export_files (
  export_id TEXT PRIMARY KEY REFERENCES exports(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, data BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT,
  document      TEXT,
  market        TEXT NOT NULL DEFAULT 'BR',
  locale        TEXT NOT NULL DEFAULT 'pt-br',
  role          TEXT NOT NULL DEFAULT 'customer',
  credits       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip         TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS formats (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  width       INTEGER NOT NULL,
  height      INTEGER NOT NULL,
  uses        TEXT NOT NULL DEFAULT '[]',
  premium     INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS designs (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'flyer',
  theme        TEXT NOT NULL DEFAULT 'operacao-promo',
  status       TEXT NOT NULL DEFAULT 'approved',
  thumbnail    TEXT,
  description  TEXT,
  elements     TEXT NOT NULL DEFAULT '[]',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS flyers (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  content          TEXT NOT NULL DEFAULT 'flyer',
  status           TEXT NOT NULL DEFAULT 'draft',
  format           TEXT,
  design           TEXT,
  palette          TEXT NOT NULL DEFAULT '[]',
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  start_at         TEXT,
  end_at           TEXT,
  is_template      INTEGER NOT NULL DEFAULT 0,
  is_public        INTEGER NOT NULL DEFAULT 0,
  is_highlighted    INTEGER NOT NULL DEFAULT 0,
  grid             TEXT,
  grid_highlights  TEXT,
  settings         TEXT NOT NULL DEFAULT '{}',
  page_settings    TEXT NOT NULL DEFAULT '{}',
  elements         TEXT NOT NULL DEFAULT '[]',
  products         TEXT NOT NULL DEFAULT '[]',
  footer           TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_flyers_user ON flyers(user_id);
CREATE INDEX IF NOT EXISTS idx_flyers_updated ON flyers(updated_at DESC);

CREATE TABLE IF NOT EXISTS products (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  image      TEXT,
  price      REAL NOT NULL DEFAULT 0,
  sale_price REAL,
  unit       TEXT,
  notes      TEXT,
  category   TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);

CREATE TABLE IF NOT EXISTS exports (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flyer_id   TEXT REFERENCES flyers(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'image',
  format     TEXT NOT NULL DEFAULT 'png',
  status     TEXT NOT NULL DEFAULT 'queued',
  progress   INTEGER NOT NULL DEFAULT 0,
  file_url   TEXT,
  error      TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exports_user ON exports(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS deliveries (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flyer_id   TEXT REFERENCES flyers(id) ON DELETE CASCADE,
  channel    TEXT NOT NULL,
  target     TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'queued',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketing_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  event_type TEXT NOT NULL,
  payload    TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
`;

export function getDb(): Database {
  if (instance) return instance;

  const file = config.databaseFile;
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  instance = db;
  return db;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

/** Reinicia o singleton — usado pelos testes para trocar de banco. */
export function resetDb(): void {
  closeDb();
}
