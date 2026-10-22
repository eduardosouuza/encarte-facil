import { describe, expect, it } from "vitest";
import type { EditorProduct } from "./use-editor-state";
import { layoutProductGrid } from "./product-grid";

function products(count: number): EditorProduct[] {
  return Array.from({ length: count }, (_, index) => ({ id: `p${index}`, x: 0, y: 0, width: 1, height: 1, rotation: 0, isHighlighted: false }));
}

describe("layoutProductGrid", () => {
  it("mantém os cards dentro da área útil sem sobrepor cabeçalho e rodapé", () => {
    const result = layoutProductGrid(products(6), 3, 1080, 1350, "flyer");
    expect(result).toHaveLength(6);
    expect(Math.min(...result.map(product => product.y))).toBeGreaterThanOrEqual(350);
    expect(Math.max(...result.map(product => product.x + product.width))).toBeLessThanOrEqual(1080);
    expect(Math.max(...result.map(product => product.y + product.height))).toBeLessThanOrEqual(1350 - 80);
    expect(new Set(result.map(product => `${product.x}:${product.y}`)).size).toBe(6);
  });

  it("recalcula o grid ao mudar de vertical para story", () => {
    const vertical = layoutProductGrid(products(4), 2, 1080, 1350, "flyer");
    const story = layoutProductGrid(products(4), 2, 1080, 1920, "video");
    expect(story[2]!.y).toBeGreaterThan(vertical[2]!.y);
    expect(story.every(product => product.width > 100 && product.height > 120)).toBe(true);
  });

  it("cria o mosaico com primeiro produto em destaque", () => {
    const result = layoutProductGrid(products(9), 3, 1080, 1350, "flyer", "featured");
    expect(result[0]!.width).toBeGreaterThan(result[1]!.width);
    expect(result[0]!.height).toBeGreaterThan(result[1]!.height);
    expect(result[1]!.x).toBeGreaterThan(result[0]!.x);
    expect(result[2]!.y).toBeGreaterThan(result[1]!.y);
    expect(result[3]!.y).toBeGreaterThanOrEqual(result[0]!.y + result[0]!.height);
  });

  it("mantém cards uniformes quando o usuário escolhe grade uniforme", () => {
    const result = layoutProductGrid(products(6), 3, 1080, 1350, "flyer", "balanced");
    expect(new Set(result.map(product => product.width))).toEqual(new Set([result[0]!.width]));
    expect(new Set(result.map(product => product.height))).toEqual(new Set([result[0]!.height]));
  });
});
