import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { app, bootstrap, registerUser } from "./helpers.js";

let headers: Record<string, string>, other: Record<string, string>, image: string, assetId: string, imageUrl: string;
beforeAll(async () => {
  bootstrap();
  headers = (await registerUser("media-owner@test.com")).headers;
  other = (await registerUser("media-other@test.com")).headers;
  const bytes = await sharp({ create: { width: 32, height: 32, channels: 4, background: "#ffffff" } }).png().toBuffer();
  image = `data:image/png;base64,${bytes.toString("base64")}`;
});
describe("biblioteca e marca", () => {
  it("importa, lista e isola os arquivos por conta", async () => {
    const upload = await request(app).post("/api/assets/upload").set(headers).send({ image, name: "Logo" });
    expect(upload.status).toBe(201);
    assetId = upload.body.asset._key; imageUrl = upload.body.asset.imageUrl;
    expect(upload.body.asset.width).toBe(32);
    const file = await request(app).get(imageUrl).set(headers);
    expect(file.headers["content-type"]).toContain("image/png");
    expect((await request(app).get(imageUrl).set(other)).status).toBe(404);
    expect((await request(app).get("/api/assets").set(other)).body.total).toBe(0);
    expect((await request(app).get("/api/assets")).status).toBe(401);
  });
  it("rejeita URLs externas e payloads sem imagem", async () => {
    expect((await request(app).post("/api/assets/upload").set(headers).send({ image: "http://127.0.0.1/secret" })).status).toBe(400);
    expect((await request(app).post("/api/assets/remove-background").set(headers).send({ imageUrl: "http://127.0.0.1/secret" })).status).toBe(400);
  });
  it("remove o fundo em uma cópia, preservando o original", async () => {
    const result = await request(app).post("/api/assets/remove-background").set(headers).send({ imageUrl });
    expect(result.status).toBe(200); expect(result.body.assetId).not.toBe(assetId);
    const original = await request(app).get(imageUrl).set(headers);
    const processed = await request(app).get(result.body.imageUrl).set(headers);
    const pixels = await sharp(processed.body).ensureAlpha().raw().toBuffer();
    const originalPixels = await sharp(original.body).ensureAlpha().raw().toBuffer();
    expect(pixels[3]).toBe(0); expect(originalPixels[3]).toBe(255);
  });
  it("salva a marca e bloqueia alteração por outra conta", async () => {
    const result = await request(app).put("/api/brandkits/me").set(headers).send({ brandKit: { name: "Mercado", logo: imageUrl, colors: ["#112233"] } });
    expect(result.status).toBe(200);
    const brand = (await request(app).get("/api/brandkits/me").set(headers)).body.brandKit;
    expect(brand.name).toBe("Mercado");
    expect((await request(app).put(`/api/brandkits/${brand._key}`).set(other).send({ brandKit: { name: "Invadido" } })).status).toBe(404);
  });
});
describe("arquivos exportados", () => {
  let flyerId: string;
  it("preserva publicação e conteúdo em atualização parcial", async () => {
    const result = await request(app).post("/api/flyers").set(headers).send({ name: "Exportação", public: true, status: "published",
      elements: [{ type: "image", image: imageUrl, x: 0, y: 0, width: 100, height: 100 }] });
    flyerId = result.body.flyer._key;
    const update = await request(app).put(`/api/flyers/${flyerId}`).set(headers).send({ name: "Renomeado" });
    expect(update.status).toBe(200);
    expect(update.body.flyer.public).toBe(true);
    expect(update.body.flyer.status).toBe("published");
    expect(update.body.flyer.elements).toHaveLength(1);
  });
  it.each(["png", "jpeg", "pdf", "svg"] as const)("produz %s real e preserva o arquivo após editar o encarte", async format => {
    const result = await request(app).post(`/api/flyers/${flyerId}/render?format=${format}`).set(headers).send({});
    expect(result.status).toBe(200);
    const url = result.body.export.fileUrl;
    const file = await request(app).get(url).set(headers).buffer(true).parse((res, done) => {
      const chunks: Buffer[] = []; res.on("data", d => chunks.push(Buffer.from(d))); res.on("end", () => done(null, Buffer.concat(chunks)));
    });
    const bytes = file.body as Buffer;
    if (format === "pdf") expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    else if (format === "svg") expect(bytes.toString()).toContain("data:image/png;base64,");
    else expect((await sharp(bytes).metadata()).format).toBe(format);
    expect((await request(app).get(url).set(other)).status).toBe(404);
    await request(app).put(`/api/flyers/${flyerId}`).set(headers).send({ backgroundColor: "#ff0000" });
    const repeated = await request(app).get(url).set(headers).buffer(true).parse((res, done) => {
      const chunks: Buffer[] = []; res.on("data", d => chunks.push(Buffer.from(d))); res.on("end", () => done(null, Buffer.concat(chunks)));
    });
    expect(Buffer.compare(bytes, repeated.body)).toBe(0);
  });
  it("gera vídeo MP4 real", async () => {
    const result = await request(app).post(`/api/flyers/${flyerId}/render-video`).set(headers).send({ duration: 3 });
    expect(result.status).toBe(200);
    const file = await request(app).get(result.body.mp4).set(headers).buffer(true).parse((res, done) => {
      const chunks: Buffer[] = []; res.on("data", d => chunks.push(Buffer.from(d))); res.on("end", () => done(null, Buffer.concat(chunks)));
    });
    expect(file.headers["content-type"]).toContain("video/mp4");
    expect(file.body.subarray(4, 8).toString()).toBe("ftyp");
    expect(file.body.length).toBeGreaterThan(1000);
  }, 30_000);
});
