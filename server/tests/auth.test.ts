import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, bootstrap, DEMO, loginAsDemo, registerUser } from "./helpers.js";

beforeAll(() => {
  bootstrap();
});

describe("POST /api/auth/register", () => {
  it("cria conta e devolve token", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "novo@exemplo.com", password: "senha12345", name: "Novo Usuario" });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.token).toBe("string");
    expect(response.body.user.email).toBe("novo@exemplo.com");
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  it("rejeita e-mail invalido", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "nao-e-email", password: "senha12345", name: "X" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeTruthy();
  });

  it("rejeita senha curta", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "curto@exemplo.com", password: "123", name: "X" });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.details)).toContain("6 caracteres");
  });

  it("rejeita e-mail duplicado", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@exemplo.com", password: "senha12345", name: "Usuario A" });
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@exemplo.com", password: "senha12345", name: "Usuario B" });

    expect(response.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  it("autentica com credenciais validas e devolve cookie de sessao", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: DEMO.email, password: DEMO.password });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.token).toBe("string");
    expect(response.headers["set-cookie"]?.[0]).toContain("ef_token=");
  });

  it("normaliza o e-mail para minusculas", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: DEMO.email.toUpperCase(), password: DEMO.password });

    expect(response.status).toBe(200);
  });

  it("rejeita senha incorreta com 401 e mensagem em portugues", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: DEMO.email, password: "errada" });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Credenciais invalidas");
  });

  it("nao autentica e-mail inexistente", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: "ninguem@exemplo.com", password: "x" });

    expect(response.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("exige autenticacao", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });

  it("devolve o usuario autenticado", async () => {
    const { headers } = await loginAsDemo();
    const response = await request(app).get("/api/auth/me").set(headers);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(DEMO.email);
    expect(response.body.betas).toEqual([]);
  });

  it("aceita o token via cookie httpOnly", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: DEMO.email, password: DEMO.password });
    const cookie = login.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
    const response = await request(app).get("/api/auth/me").set("Cookie", cookie);

    expect(response.status).toBe(200);
  });

  it("rejeita token invalido", async () => {
    const response = await request(app).get("/api/auth/me").set("Authorization", "Bearer token.invalido.aqui");
    expect(response.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("encerra a sessao e invalida o token", async () => {
    const { token, headers } = await registerUser("logout@exemplo.com");
    const before = await request(app).get("/api/auth/me").set(headers);
    expect(before.status).toBe(200);

    const logout = await request(app).post("/api/auth/logout").set(headers);
    expect(logout.status).toBe(200);

    const after = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(after.status).toBe(401);
  });
});

describe("recuperacao de senha", () => {
  it("gera token de redefinicao e permite trocar a senha", async () => {
    const email = "esqueci@exemplo.com";
    await request(app).post("/api/auth/register").send({ email, password: "antiga12345", name: "Esqueci" });

    const forgot = await request(app).post("/api/auth/forgot-password").send({ email });
    expect(forgot.status).toBe(200);
    expect(typeof forgot.body.resetToken).toBe("string");

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: forgot.body.resetToken, email, password: "nova123456" });
    expect(reset.status).toBe(200);

    const login = await request(app).post("/api/auth/login").send({ email, password: "nova123456" });
    expect(login.status).toBe(200);
  });

  it("nao revela se o e-mail existe", async () => {
    const response = await request(app).post("/api/auth/forgot-password").send({ email: "fantasma@exemplo.com" });
    expect(response.status).toBe(200);
    expect(response.body.resetToken).toBeUndefined();
  });

  it("rejeita token invalido", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "a".repeat(48), email: DEMO.email, password: "nova123456" });
    expect(response.status).toBe(400);
  });
});

describe("GET /api/auth/capabilities", () => {
  it("informa as capacidades publicas", async () => {
    const response = await request(app).get("/api/auth/capabilities");
    expect(response.status).toBe(200);
    expect(response.body.capabilities.passwordRecovery).toBe(true);
  });
});
