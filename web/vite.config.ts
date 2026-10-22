import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const API_TARGET = process.env.VITE_API_PROXY ?? "http://127.0.0.1:3001";

/**
 * O prefixo "/p" da API publica de encartes colide com rotas da SPA que
 * comecam com "/p" (ex.: /products, /p/:id). Navegacoes que aceitam HTML
 * sao devolvidas a SPA; apenas chamadas de API/XHR vao para o servidor.
 */
const publicProxy = {
  target: API_TARGET,
  changeOrigin: true,
  bypass(req: { headers: Record<string, string | string[] | undefined> }) {
    const accept = String(req.headers.accept ?? "");
    if (accept.includes("text/html")) return "/index.html";
    return undefined;
  },
};

const proxy = {
  "/api": { target: API_TARGET, changeOrigin: true },
  "/p": publicProxy,
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    port: 4173,
    proxy,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
