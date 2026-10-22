import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

loadEnv();

/** Raiz do monorepo (dois niveis acima de server/src ou server/dist). */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction,
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? "0.0.0.0",
  /** Origem do frontend permitido em CORS e usado para montar links absolutos. */
  appOrigin: process.env.APP_ORIGIN ?? "http://localhost:5173",
  jwtSecret: required("JWT_SECRET", isProduction ? undefined : "encarte-facil-dev-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  /** Caminho do arquivo SQLite. Use ":memory:" nos testes. */
  databaseFile: process.env.DATABASE_FILE ?? path.resolve(process.cwd(), "data/encarte-facil.sqlite"),
  /** Origem usada para montar links publicos de encartes compartilhados. */
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:5173",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  /** Build do frontend servido pelo proprio servidor em producao. */
  staticDir: process.env.STATIC_DIR ?? path.join(projectRoot, "web/dist"),
  /** Semente usada no seed: email/senha do usuario de demonstracao. */
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "demo@encartefacil.com",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "demo12345",
  seedDemoPassword: process.env.SEED_DEMO_PASSWORD ?? "demo12345",
} as const;
