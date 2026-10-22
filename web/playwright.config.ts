import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4173);
const API_PORT = Number(process.env.E2E_API_PORT ?? 3101);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "pt-BR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node server/dist/index.js",
      cwd: "..",
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(API_PORT),
        DATABASE_FILE: "./.e2e-data/encartefacil.db",
        APP_ORIGIN: "*",
        JWT_SECRET: "e2e-secret-local",
      },
      timeout: 60_000,
    },
    {
      command: `npx vite preview --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      cwd: ".",
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_PROXY: `http://127.0.0.1:${API_PORT}` },
      timeout: 60_000,
    },
  ],
});
