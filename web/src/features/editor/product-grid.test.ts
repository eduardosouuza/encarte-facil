import { describe, expect, it } from "vitest";
import type { EditorProduct } from "./use-editor-state";
import { layoutProductGrid, type ProductGridMode } from "./product-grid";

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

it("repete os mesmos espacos nas folhas e preserva ordem e sobra", () => {
  const result = layoutProductGrid(products(14), 3, 1080, 1350, "flyer", "balanced", 6);
  expect(result.map(p => p.id)).toEqual(products(14).map(p => p.id));
  for (let index = 6; index < result.length; index++) {
    const { x, y, width, height } = result[index % 6]!;
    expect(result[index]).toMatchObject({ x, y, width, height });
  }
});

it.each<ProductGridMode>(["balanced", "featured", "featured-center", "featured-right", "wide-left", "wide-center", "wide-right"])("repete a grade %s sem sobrepor produtos", mode => {
  const result = layoutProductGrid(products(35), 4, 1080, 1350, "flyer", mode, 16);
  const first = result.slice(0, 16);
  for (const [index, card] of first.entries()) {
    expect(result[index + 16]).toMatchObject({ x: card.x, y: card.y, width: card.width, height: card.height });
    expect(card.x + card.width).toBeLessThanOrEqual(1080);
    expect(card.y + card.height).toBeLessThanOrEqual(1350);
    for (const other of first.filter(p => p.id !== card.id)) {
      expect(card.x + card.width <= other.x || other.x + other.width <= card.x ||
        card.y + card.height <= other.y || other.y + other.height <= card.y).toBe(true);
    }
  }
});
it("nao sobrepoe cards em formatos baixos e grades densas", () => {
  const result = layoutProductGrid(products(48), 8, 1080, 566, "flyer", "balanced", 48);
  for (const card of result) {
    expect(card.y + card.height).toBeLessThanOrEqual(566);
    expect(card.width).toBeGreaterThan(0);
    for (const other of result.filter(p => p.id !== card.id)) {
      expect(card.x + card.width <= other.x || other.x + other.width <= card.x ||
        card.y + card.height <= other.y || other.y + other.height <= card.y).toBe(true);
    }
  }
});
