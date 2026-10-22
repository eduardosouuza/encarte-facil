import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app, bootstrap, registerUser } from "./helpers.js";

let headers: Record<string, string>;

beforeAll(async () => {
  bootstrap();
  headers = (await registerUser("catalogo@exemplo.com")).headers;
});

describe("catalogo de formatos e modelos", () => {
  it("lista a biblioteca de elementos, segmentos e temas observados no cliente original", async () => {
    const elements = await request(app).get("/api/elements?category=seal");
    expect(elements.status).toBe(200);
    expect(elements.body.elements.length).toBeGreaterThan(0);
    expect(elements.body.elements[0].payload).toHaveProperty("type");

    const industries = await request(app).get("/api/industries?title=mercado");
    expect(industries.status).toBe(200);
    expect(industries.body.industries[0].slug).toBe("supermercado");

    const themes = await request(app).get("/api/themes?term=black");
    expect(themes.status).toBe(200);
    expect(themes.body.themes[0]._key).toBe("black-friday");
    const count = await request(app).get("/api/themes/stats/count");
    expect(count.body.total).toBeGreaterThanOrEqual(6);
  });

  it("lista formatos com dimensoes", async () => {
    const response = await request(app).get("/api/formats");
    expect(response.status).toBe(200);
    expect(response.body.formats.length).toBeGreaterThan(0);
    const vertical = response.body.formats.find((f: { code: string }) => f.code === "vertical");
    expect(vertical.width).toBe(1080);
    expect(vertical.height).toBe(1350);
  });

  it("filtra formato por codigo", async () => {
    const response = await request(app).get("/api/formats?code=square");
    expect(response.body.formats).toHaveLength(1);
    expect(response.body.formats[0].code).toBe("square");
  });

  it("lista modelos agrupados por tema", async () => {
    const response = await request(app).get("/api/designs/by-theme");
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(13);
    expect(response.body.data.flatMap((group: { designs: unknown[] }) => group.designs).length).toBeGreaterThanOrEqual(26);
    expect(response.body.data[0].designs.length).toBeGreaterThan(0);
  });

  it("busca modelo pelo tema", async () => {
    const response = await request(app).get("/api/designs/operacao-promo");
    expect(response.status).toBe(200);
    expect(response.body.design.theme).toBe("operacao-promo");
    expect(Array.isArray(response.body.design.elements)).toBe(true);
  });
});

describe("produtos", () => {
  it("usa a busca alternativa quando o primeiro serviço falha", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ products: [{ code: "123", product_name: "Feijao", image_front_url: "https://images.openfoodfacts.org/test.jpg" }] })));
    try {
      const result = await request(app).post("/api/products/search-images").set(headers).send({ term: "Feijao" });
      expect(result.status).toBe(200);
      expect(result.body.images).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally { fetchMock.mockRestore(); }
  });

  it("busca por nome e peso no catálogo sem depender da API externa", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    try {
      const result = await request(app).post("/api/products/search-images").set(headers).send({ term: "Maca Fuji 1kg" });
      expect(result.status).toBe(200);
      expect(result.body.images[0].title).toBe("Maçã Fuji");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally { fetchMock.mockRestore(); }
  });

  it("tenta a próxima foto e reutiliza a imagem salva sem rede", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4z8DwH4QZYAwAR8oH+Xm0fdIAAAAASUVORK5CYII=", "base64");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ hits: [
        { code: "bad", product_name: "Biscoito teste", brands: ["Marca"], image_front_url: "https://images.openfoodfacts.org/bad.jpg" },
        { code: "good", product_name: "Biscoito teste", image_front_url: "https://images.openfoodfacts.org/good.jpg" },
      ] })))
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(new Response(png));
    try {
      const created = await request(app).post("/api/products").set(headers).send({ name: "Biscoito teste", price: 5 });
      const first = await request(app).post(`/api/products/${created.body.product._key}/find-image`).set(headers).send({});
      expect(first.status).toBe(200);
      expect(first.body.product.image).toMatch(/^\/api\/assets\//);
      expect(String(fetchMock.mock.calls[1]?.[0])).toContain("https://images.openfoodfacts.net/");
      fetchMock.mockClear();
      const duplicate = await request(app).post("/api/products").set(headers).send({ name: "Biscoito teste", price: 6 });
      const second = await request(app).post(`/api/products/${duplicate.body.product._key}/find-image`).set(headers).send({});
      expect(second.status).toBe(200);
      expect(second.body.product.image).toBe(first.body.product.image);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally { fetchMock.mockRestore(); }
  });

  it("informa indisponibilidade sem remover o produto", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    try {
      const created = await request(app).post("/api/products").set(headers).send({ name: "Produto indisponível", price: 7 });
      const result = await request(app).post(`/api/products/${created.body.product._key}/find-image`).set(headers).send({});
      expect(result.status).toBe(502);
      expect(result.body.error).toContain("indisponíveis");
      expect((await request(app).get(`/api/products/${created.body.product._key}`).set(headers)).status).toBe(200);
    } finally { fetchMock.mockRestore(); }
  });

  it("busca a foto do produto, salva na biblioteca e atualiza o cadastro", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4z8DwH4QZYAwAR8oH+Xm0fdIAAAAASUVORK5CYII=", "base64");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ products: [{ code: "1", product_name: "Arroz Premium", image_front_url: "https://images.openfoodfacts.org/images/products/001/front.jpg" }] }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(png, { status: 200, headers: { "content-type": "image/png", "content-length": String(png.length) } }));
    try {
      const created = await request(app).post("/api/products").set(headers).send({ name: "Arroz Premium", price: 12.9 });
      const result = await request(app).post(`/api/products/${created.body.product._key}/find-image`).set(headers).send({});
      expect(result.status).toBe(200);
      expect(result.body.product.image).toMatch(/^\/api\/assets\/.+\/file$/);
      expect(result.body.candidates[0].source).toBe("Open Food Facts");
      expect((await request(app).get(result.body.product.image).set(headers)).status).toBe(200);
    } finally { fetchMock.mockRestore(); }
  });

  it("remove o fundo da imagem do produto e preserva o asset original", async () => {
    const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4z8DwH4QZYAwAR8oH+Xm0fdIAAAAASUVORK5CYII=";
    const upload = await request(app).post("/api/assets/upload").set(headers).send({ image, name: "produto.png" });
    const originalUrl = upload.body.asset.imageUrl as string;
    const created = await request(app).post("/api/products").set(headers).send({ name: "Produto com foto", price: 10, image: originalUrl });
    const result = await request(app).post(`/api/products/${created.body.product._key}/remove-background`).set(headers).send({});
    expect(result.status).toBe(200);
    expect(result.body.product.image).not.toBe(originalUrl);
    expect(result.body.asset.processed).toBe(true);
    expect((await request(app).get(originalUrl).set(headers)).status).toBe(200);
  });

  it("interpreta uma linha, pesquisa por categoria e registra novo preço", async () => {
    const parsed = await request(app).post("/api/products/parse-line").set(headers).send({ text: "Café Premium 500g R$ 24,90" });
    expect(parsed.status).toBe(200);
    expect(parsed.body.parsed.name).toContain("Café Premium");
    expect(parsed.body.parsed.price).toBe(24.9);

    const created = await request(app).post("/api/products").set(headers).send({ name: parsed.body.parsed.name, price: parsed.body.parsed.price, category: "Mercearia" });
    const id = created.body.product._key as string;
    const search = await request(app).get("/api/products/search?term=mercearia").set(headers);
    expect(search.body.products.some((product: { _key: string }) => product._key === id)).toBe(true);
    const price = await request(app).post(`/api/products/${id}/price`).set(headers).send({ price: 29.9, salePrice: 21.9 });
    expect(price.status).toBe(200);
    expect(price.body.product.salePrice).toBe(21.9);
  });

  it("importa uma lista de produtos e informa linhas sem preço", async () => {
    const response = await request(app).post("/api/products/import-list").set(headers).send({
      text: "Pão francês 9,90 kg\nPão de queijo 21,90 kg\nLinha sem valor",
    });
    expect(response.status).toBe(201);
    expect(response.body.products).toHaveLength(2);
    expect(response.body.products[0]).toMatchObject({ name: "Pão francês", price: 9.9, unit: "kg" });
    expect(response.body.ignored).toEqual([{ line: "Linha sem valor", reason: "Preço não identificado" }]);
  });

  it("prioriza uma imagem conhecida do catálogo público do original", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await request(app).post("/api/products/search-images").set(headers).send({ term: "Maçã Fuji" });
    expect(response.status).toBe(200);
    expect(response.body.images[0]).toMatchObject({ source: "Catálogo Encarte Fácil" });
    expect(response.body.images[0].imageUrl).toContain("efacil-public.s3.sa-east-1.amazonaws.com");
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
  it("cria, lista, atualiza e remove produto", async () => {
    const created = await request(app)
      .post("/api/products")
      .set(headers)
      .send({ name: "Leite 1L", price: 6.49, salePrice: 5.79, unit: "1L", category: "Laticinios" });
    expect(created.status).toBe(201);
    const id = created.body.product._key as string;

    const list = await request(app).get("/api/products?term=leite").set(headers);
    expect(list.status).toBe(200);
    expect(list.body.products.length).toBeGreaterThan(0);

    const updated = await request(app)
      .put(`/api/products/${id}`)
      .set(headers)
      .send({ name: "Leite Integral 1L", price: 7.1 });
    expect(updated.status).toBe(200);
    expect(updated.body.product.name).toBe("Leite Integral 1L");

    const removed = await request(app).delete(`/api/products/${id}`).set(headers);
    expect(removed.status).toBe(204);
  });

  it("rejeita preco negativo", async () => {
    const response = await request(app).post("/api/products").set(headers).send({ name: "X", price: -1 });
    expect(response.status).toBe(400);
  });

  it("rejeita url de imagem invalida", async () => {
    const response = await request(app)
      .post("/api/products")
      .set(headers)
      .send({ name: "X", price: 1, image: "nao-e-url" });
    expect(response.status).toBe(400);
  });

  it("isola produtos por usuario", async () => {
    const other = (await registerUser("outro-catalogo@exemplo.com")).headers;
    const list = await request(app).get("/api/products").set(other);
    expect(list.body.products).toHaveLength(0);
  });
});

describe("plano e cobranca", () => {
  it("devolve a visao geral de cobranca", async () => {
    const response = await request(app).get("/api/billing/overview").set(headers);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("credits");
    expect(response.body.data).toHaveProperty("flyers");
  });

  it("devolve a configuracao do parceiro no formato original", async () => {
    const response = await request(app).get("/api/partners/current");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.partner.products[0].prices[0].credits).toBe(10);
    expect(response.body.partner.config.app.domain).toBe("encartefacil.com");
  });
});

describe("rotas publicas", () => {
  it("detecta o mercado", async () => {
    const response = await request(app).get("/api/public/market?locale=pt-br");
    expect(response.status).toBe(200);
    expect(response.body.prompt.guess.market).toBe("BR");
  });

  it("devolve traducoes", async () => {
    const response = await request(app).get("/api/translations/pt-br");
    expect(response.status).toBe(200);
    expect(response.body["nav.flyers"]).toBe("Encartes");
  });

  it("registra evento de marketing com 204", async () => {
    const response = await request(app)
      .post("/api/marketing/track")
      .send({ eventType: "landing.viewed", eventData: { path: "/login" } });
    expect(response.status).toBe(204);
  });
});
