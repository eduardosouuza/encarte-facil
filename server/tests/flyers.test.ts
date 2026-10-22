import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, bootstrap, registerUser } from "./helpers.js";

let headers: Record<string, string>;

beforeAll(async () => {
  bootstrap();
  const session = await registerUser("flyers@exemplo.com");
  headers = session.headers;
});

function flyerPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Encarte de teste",
    content: "flyer",
    status: "draft",
    format: null,
    design: null,
    palette: ["#ffffff", "#e11d48"],
    backgroundColor: "#ffffff",
    elements: [
      {
        id: "titulo",
        type: "text",
        x: 10,
        y: 20,
        width: 400,
        height: 80,
        text: "Promocao da semana",
        textStyle: { fontFamily: "Oswald", fontSize: 48, color: "#0f172a", align: "center" },
        zIndex: 1,
      },
    ],
    products: [
      {
        id: "p1",
        name: "Cafe Premium",
        price: 29.9,
        salePrice: 24.9,
        unit: "500g",
        x: 20,
        y: 200,
        width: 220,
        height: 280,
      },
    ],
    footer: { visible: true, elements: ["www.encartefacil.com"] },
    settings: { colors: { background: "#ffffff", text: "#0f172a", accent: "#e11d48" } },
    ...overrides,
  };
}

describe("CRUD de encartes", () => {
  it("cria, lê, atualiza e remove um encarte", async () => {
    const created = await request(app).post("/api/flyers").set(headers).send(flyerPayload());
    expect(created.status).toBe(201);
    expect(created.body.flyer._key).toBeTruthy();
    expect(created.body.flyer.name).toBe("Encarte de teste");
    expect(created.body.flyer.products).toHaveLength(1);

    const id = created.body.flyer._key as string;

    const read = await request(app).get(`/api/flyers/${id}`).set(headers);
    expect(read.status).toBe(200);
    expect(read.body.flyer.name).toBe("Encarte de teste");

    const updated = await request(app)
      .put(`/api/flyers/${id}`)
      .set(headers)
      .send(flyerPayload({ name: "Encarte renomeado", status: "published" }));
    expect(updated.status).toBe(200);
    expect(updated.body.flyer.name).toBe("Encarte renomeado");
    expect(updated.body.flyer.status).toBe("published");

    const removed = await request(app).delete(`/api/flyers/${id}`).set(headers);
    expect(removed.status).toBe(204);

    const gone = await request(app).get(`/api/flyers/${id}`).set(headers);
    expect(gone.status).toBe(404);
  });

  it("persiste o encarte entre requisicoes (leitura apos escrita)", async () => {
    const created = await request(app).post("/api/flyers").set(headers).send(flyerPayload({ name: "Persistente" }));
    const id = created.body.flyer._key as string;

    const first = await request(app).get(`/api/flyers/${id}`).set(headers);
    const second = await request(app).get(`/api/flyers/${id}`).set(headers);

    expect(first.body.flyer.name).toBe("Persistente");
    expect(second.body.flyer.elements).toHaveLength(1);
    expect(second.body.flyer.products[0].name).toBe("Cafe Premium");
  });

  it("persiste formato de video e estilo completo da tag", async () => {
    const products = [{ ...flyerPayload().products[0], tagColor: "#ef4444", textColor: "#ffffff", tagShape: "burst", tagStyle: "shadow" }];
    const created = await request(app).post("/api/flyers").set(headers).send(flyerPayload({ content: "video", format: "story", products }));
    expect(created.status).toBe(201);
    expect(created.body.flyer.content).toBe("video");
    expect(created.body.flyer.products[0]).toMatchObject({ tagShape: "burst", tagStyle: "shadow" });
  });

  it("duplica um encarte criando um novo registro", async () => {
    const created = await request(app).post("/api/flyers").set(headers).send(flyerPayload({ name: "Original" }));
    const id = created.body.flyer._key as string;

    const duplicated = await request(app).post(`/api/flyers/${id}/duplicate`).set(headers);
    expect(duplicated.status).toBe(201);
    expect(duplicated.body.flyer._key).not.toBe(id);
    expect(duplicated.body.flyer.name).toContain("Original");
    expect(duplicated.body.flyer.products).toHaveLength(1);
  });

  it("nao expoe encartes de outro usuario", async () => {
    const created = await request(app).post("/api/flyers").set(headers).send(flyerPayload());
    const other = await registerUser("outro@exemplo.com");

    const response = await request(app).get(`/api/flyers/${created.body.flyer._key}`).set(other.headers);
    expect(response.status).toBe(404);
  });

  it("exige autenticacao", async () => {
    const response = await request(app).get("/api/flyers");
    expect(response.status).toBe(401);
  });
});

describe("listagem e filtros", () => {
  it("filtra por termo de busca", async () => {
    await request(app).post("/api/flyers").set(headers).send(flyerPayload({ name: "Promocao de Cafe" }));
    await request(app).post("/api/flyers").set(headers).send(flyerPayload({ name: "Promocao de Pao" }));

    const response = await request(app).get("/api/flyers?term=cafe").set(headers);
    expect(response.status).toBe(200);
    expect(response.body.flyers.length).toBeGreaterThan(0);
    expect(response.body.flyers.every((f: { name: string }) => f.name.toLowerCase().includes("cafe"))).toBe(true);
  });

  it("filtra por status e pagina", async () => {
    await request(app).post("/api/flyers").set(headers).send(flyerPayload({ name: "Rascunho A", status: "draft" }));
    await request(app).post("/api/flyers").set(headers).send(flyerPayload({ name: "Publicado A", status: "published" }));

    const published = await request(app).get("/api/flyers?status=published").set(headers);
    expect(published.body.flyers.every((f: { status: string }) => f.status === "published")).toBe(true);

    const page = await request(app).get("/api/flyers?limit=1&offset=0").set(headers);
    expect(page.body.flyers).toHaveLength(1);
    expect(page.body.limit).toBe(1);
    expect(page.body.offset).toBe(0);
  });

  it("devolve resumo leve", async () => {
    const response = await request(app).get("/api/flyers/summary").set(headers);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.flyers)).toBe(true);
  });
});

describe("validacao do payload", () => {
  it("rejeita encarte sem nome", async () => {
    const response = await request(app).post("/api/flyers").set(headers).send(flyerPayload({ name: "" }));
    expect(response.status).toBe(400);
  });

  it("rejeita status desconhecido", async () => {
    const response = await request(app).post("/api/flyers").set(headers).send(flyerPayload({ status: "hackeado" }));
    expect(response.status).toBe(400);
  });

  it("rejeita payload que nao e objeto", async () => {
    const response = await request(app).post("/api/flyers").set(headers).send("nao-e-objeto");
    expect(response.status).toBe(400);
  });
});

describe("renderizacao", () => {
  it("devolve SVG com os elementos do encarte", async () => {
    const created = await request(app).post("/api/flyers").set(headers).send(flyerPayload({ name: "Renderizavel" }));
    const id = created.body.flyer._key as string;

    const response = await request(app).get(`/api/flyers/${id}/render.svg`).set(headers);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("image/svg+xml");
    const svg = typeof response.text === "string" ? response.text : String(response.body ?? "");
    expect(svg).toContain("<svg");
    expect(svg).toContain("Promocao da semana");
    expect(svg).toContain("Cafe Premium");
  });

  it("registra uma exportacao ao renderizar", async () => {
    const created = await request(app).post("/api/flyers").set(headers).send(flyerPayload());
    const id = created.body.flyer._key as string;

    const render = await request(app).post(`/api/flyers/${id}/render`).set(headers).send({ format: "png" });
    expect(render.status).toBe(200);
    expect(render.body.export.status).toBe("completed");
    expect(render.body.svg).toContain("<svg");

    const exports = await request(app).get("/api/exports").set(headers);
    expect(exports.body.exports.length).toBeGreaterThan(0);
  });
});

describe("encarte publico", () => {
  it("so expoe encartes marcados como publicos", async () => {
    const created = await request(app)
      .post("/api/flyers")
      .set(headers)
      .send(flyerPayload({ name: "Compartilhado", public: true }));
    const id = created.body.flyer._key as string;

    const response = await request(app).get(`/p/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.flyer.name).toBe("Compartilhado");

    const privateFlyer = await request(app).post("/api/flyers").set(headers).send(flyerPayload({ name: "Privado" }));
    const denied = await request(app).get(`/p/${privateFlyer.body.flyer._key}`);
    expect(denied.status).toBe(404);
  });
});
