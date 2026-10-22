// JavaScript · verify-product-images.mjs · local API · Windows/Node 24
// Uses a temporary in-memory database; does not touch user products.
import assert from "node:assert/strict";
import request from "supertest";
process.env.DATABASE_FILE = ":memory:";
process.env.BCRYPT_ROUNDS = "4";
const { createApp } = await import("../server/dist/app.js");
const { seedDatabase } = await import("../server/dist/db/seed.js");
seedDatabase();
const app = createApp();
const registration = await request(app).post("/api/auth/register").send({
  name: "Image verification", email: "image-verification@example.com", password: "test-images-12345",
});
assert.equal(registration.status, 201);
const headers = { Authorization: `Bearer ${registration.body.token}` };
for (const name of ["Maçã Fuji 1kg", "Arroz", "Leite"]) {
  const created = await request(app).post("/api/products").set(headers).send({ name, price: 9.9 });
  assert.equal(created.status, 201);
  const result = await request(app).post(`/api/products/${created.body.product._key}/find-image`).set(headers).send({});
  assert.equal(result.status, 200, `${name}: ${result.body.error}`);
  const image = await request(app).get(result.body.product.image).set(headers);
  assert.equal(image.status, 200);
  assert.match(image.headers["content-type"], /image\/png/);
  assert.ok(image.body.length > 100);
  console.log(JSON.stringify({ product: name, source: result.body.candidates[0]?.source, bytes: image.body.length, status: "OK" }));
}
