import type { Flyer } from "@/lib/types";
import type { EditorProduct } from "./use-editor-state";

export type ProductGridMode = "balanced" | "featured" | "featured-center" | "featured-right" | "wide-left" | "wide-center" | "wide-right";

export function gridSlots(count: number, columns: number, mode: ProductGridMode) {
  const spanWidth = mode === "balanced" ? 1 : Math.min(2, columns);
  const spanHeight = mode.startsWith("featured") && count > 1 ? 2 : 1;
  const startColumn = mode.endsWith("right") ? columns - spanWidth : mode.endsWith("center") ? Math.floor((columns - spanWidth) / 2) : 0;
  const slots = [{ column: startColumn, row: 0, columns: spanWidth, rows: spanHeight }];
  for (let cell = 0; slots.length < count; cell++) {
    const column = cell % columns, row = Math.floor(cell / columns);
    if (row < spanHeight && column >= startColumn && column < startColumn + spanWidth) continue;
    slots.push({ column, row, columns: 1, rows: 1 });
  }
  return slots;
}

export function layoutProductGrid(
  products: EditorProduct[],
  requestedColumns: number,
  canvasWidth: number,
  canvasHeight: number,
  content: Flyer["content"],
  mode: ProductGridMode = "featured",
  productsPerPage?: number,
): EditorProduct[] {
  if (!products.length) return products;
  if (productsPerPage) {
    const capacity = Math.max(1, Math.min(48, Math.floor(productsPerPage)));
    const slots = layoutProductGrid(Array.from({ length: capacity }, (_, index) => ({
      ...products[0]!, id: String(index),
    })), requestedColumns, canvasWidth, canvasHeight, content, mode);
    return products.map((product, index) => {
      const slot = slots[index % capacity]!;
      return { ...product, x: slot.x, y: slot.y, width: slot.width, height: slot.height };
    });
  }
  const margin = Math.round(canvasWidth * .04);
  const gap = Math.round(Math.min(canvasWidth, canvasHeight) * .012);
  const topRatio = content === "poster" ? .18 : content === "shelf_label" ? .06 : content === "video" ? .22 : .29;
  const top = Math.round(canvasHeight * topRatio);
  const bottom = Math.round(canvasHeight * .08);
  const columns = Math.max(1, Math.min(requestedColumns, products.length));

  const slots = gridSlots(products.length, columns, mode);
  const rows = Math.max(...slots.map(slot => slot.row + slot.rows));
  const cellWidth = (canvasWidth - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (canvasHeight - top - bottom - gap * (rows - 1)) / rows;
  return products.map((product, index) => {
    const slot = slots[index]!;
    return {
      ...product,
      width: Math.floor(cellWidth * slot.columns + gap * (slot.columns - 1)),
      height: Math.floor(cellHeight * slot.rows + gap * (slot.rows - 1)),
      x: Math.round(margin + slot.column * (cellWidth + gap)),
      y: Math.round(top + slot.row * (cellHeight + gap)),
    };
  });
}
