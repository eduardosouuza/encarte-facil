import { describe, expect, it } from "vitest";
import { normalizeRemoteDesign } from "../src/modules/original-designs.js";

describe("templates originais", () => {
  it("normaliza assets detalhados preservando a geometria", () => {
    const design = normalizeRemoteDesign({
      _key: "des_test", name: { "pt-br": "Modelo teste" }, category: "header", preview: "pre_test",
      themes: [{ title: "Ofertas" }], elements: [{ id: "asset-1", category: "background", asset: { urls: { high: "https://efacil-public.s3.sa-east-1.amazonaws.com/bg.png" } }, x: 10, y: 20, width: 1080, height: 400, rotation: 4, zIndex: 2 }],
    });
    expect(design).toMatchObject({ _key: "des_test", title: "Modelo teste", theme: "Ofertas", thumbnail: "https://efacil-public.s3.sa-east-1.amazonaws.com/pre_test" });
    expect(design.elements[0]!).toMatchObject({ type: "image", image: "https://efacil-public.s3.sa-east-1.amazonaws.com/bg.png", x: 10, y: 20, width: 1080, height: 400, rotation: 4, zIndex: 2 });
  });

  it("não aceita asset fora do bucket público permitido", () => {
    const design = normalizeRemoteDesign({ _key: "des_test", name: "Modelo", elements: [{ assetUrls: { high: "https://example.com/image.png" } }] });
    expect(design.elements[0]!.image).toBeUndefined();
    expect(design.elements[0]!.type).toBe("shape");
  });
});
