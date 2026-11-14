import { afterEach, describe, expect, it, vi } from "vitest";
import { allowedProductImageUrl, parseImageEvents } from "../src/modules/original-product-images.js";

const imageUrl = "https://efacil-public.s3.sa-east-1.amazonaws.com/arroz.png";
const event = { type: "image", data: { productId: "rice", productName: 'Arroz {branco} "tipo 1"', imageUrl, source: "database" } };
const stream = (...events: unknown[]) => new Response(events.map(item => JSON.stringify(item)).join(""), { headers: { "content-type": "text/event-stream" } });

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

async function configuredSearch() {
  vi.stubEnv("ORIGINAL_CATALOG_EMAIL", "catalog@example.com");
  vi.stubEnv("ORIGINAL_CATALOG_PASSWORD", "test-password");
  return (await import("../src/modules/original-product-images.js")).searchOriginalProductImages;
}

describe("catálogo original", () => {
  it("interpreta objetos concatenados, SSE, escapes e acentos sem dividir o nome", () => {
    const text = `data: ${JSON.stringify(event)}\n\ndata: {"type":"end"}\n\n`;
    expect(parseImageEvents(text)).toEqual([event, { type: "end" }]);
    expect(() => parseImageEvents('{"type":"image"')).toThrow("Incomplete");
  });

  it("consulta a API original e preserva ordem, fotos e miniaturas", async () => {
    const search = await configuredSearch();
    const thumbnailUrl = "https://encrypted-tbn0.gstatic.com/images?q=rice";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "private-token" })))
      .mockResolvedValueOnce(stream(event, event, { type: "image", data: { imageUrl: "https://shop.example.com/rice.jpg", thumbnailUrl, source: "serp" } }, { type: "end" }));
    const result = await search("Arroz");
    expect(result).toHaveLength(2);
    expect(result?.[0]).toMatchObject({ imageUrl, title: event.data.productName });
    expect(result?.[1]).toMatchObject({ imageUrl: thumbnailUrl, source: "Internet — Encarte Fácil" });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api-v2.encartefacil.com/products/search-images");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ body: JSON.stringify({ term: "Arroz" }), headers: { authorization: "Bearer private-token" } });
    expect(JSON.stringify(result)).not.toContain("private-token");
  });

  it("renova a sessão expirada e repete a busca uma vez", async () => {
    const search = await configuredSearch();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "expired" })))
      .mockResolvedValueOnce(new Response("expired", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "renewed" })))
      .mockResolvedValueOnce(stream(event, { type: "end" }));
    expect(await search("Arroz")).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("reutiliza autenticação e diferencia resultado vazio de falha", async () => {
    const search = await configuredSearch();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "valid" })))
      .mockResolvedValueOnce(stream({ type: "end", total: 0 }))
      .mockResolvedValueOnce(stream({ type: "error", message: "unavailable" }));
    expect(await search("Nada")).toEqual([]);
    await expect(search("Erro")).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("não usa credenciais locais nos testes sem configuração explícita", async () => {
    vi.stubEnv("ORIGINAL_CATALOG_EMAIL", ""); vi.stubEnv("ORIGINAL_CATALOG_PASSWORD", "");
    const search = (await import("../src/modules/original-product-images.js")).searchOriginalProductImages;
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(await search("Arroz")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita hosts locais, credenciais, portas e redirecionadores arbitrários", () => {
    for (const url of ["http://127.0.0.1/image", "https://localhost/image", "https://cdn.encartefacil.com.evil.test/image", "https://user:password@cdn.encartefacil.com/image", "https://cdn.encartefacil.com:8080/image"]) expect(allowedProductImageUrl(url)).toBe(false);
    expect(allowedProductImageUrl(imageUrl)).toBe(true);
  });
});
