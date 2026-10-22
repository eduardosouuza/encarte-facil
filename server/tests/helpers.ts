import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";
import { seedDatabase } from "../src/db/seed.js";

export const app: Express = createApp();

export function bootstrap(): void {
  seedDatabase();
}

export const DEMO = {
  email: "demo@encartefacil.com",
  password: "demo12345",
};

export async function loginAsDemo(http = request(app)): Promise<{ token: string; headers: Record<string, string> }> {
  const response = await http.post("/api/auth/login").send({ email: DEMO.email, password: DEMO.password });
  if (response.status !== 200) {
    throw new Error(`Falha no login de teste: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return {
    token: response.body.token as string,
    headers: { Authorization: `Bearer ${response.body.token as string}` },
  };
}

export async function registerUser(
  email: string,
  password = "teste12345",
  name = "Usuario de Teste",
): Promise<{ token: string; headers: Record<string, string> }> {
  const response = await request(app).post("/api/auth/register").send({ email, password, name });
  if (response.status !== 201) {
    throw new Error(`Falha no cadastro de teste: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return {
    token: response.body.token as string,
    headers: { Authorization: `Bearer ${response.body.token as string}` },
  };
}
