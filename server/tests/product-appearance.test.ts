import { describe, expect, it } from "vitest";
import { productArtwork } from "../src/lib/artwork.js";
import { flyerProductSchema } from "../src/modules/flyer.schema.js";

describe("aparência dos produtos", () => {
  const product = { width: 200, height: 260, image: "https://example.com/product.png", backgroundColor: "#123456" };
  it("preserva os controles ao validar o produto salvo", () => {
    expect(flyerProductSchema.parse({ ...product, imageScale: 1.5, backgroundVisible: false })).toMatchObject({ imageScale: 1.5, backgroundVisible: false });
  });
  it("aplica a cor também atrás da foto e remove fundo e sombra", () => {
    const colored = productArtwork(product, "color");
    expect(colored).toContain('fill="#123456"');
    const transparent = productArtwork({ ...product, backgroundVisible: false }, "clear");
    expect(transparent).not.toContain('fill="#123456"');
    expect(transparent).not.toContain('opacity=".12"');
    expect(transparent).toContain('stroke-width="0"');
  });
  it("amplia a foto mantendo o cartão e recorta a área da imagem", () => {
    const normal = productArtwork(product, "scale");
    const enlarged = productArtwork({ ...product, imageScale: 2 }, "scale");
    expect(normal).toContain('width="190"');
    expect(enlarged).toContain('width="380"');
    expect(enlarged).toContain('width="200" height="260"');
    expect(enlarged).toContain('overflow="hidden"');
  });
});
