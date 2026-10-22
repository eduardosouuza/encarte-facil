import type { Flyer } from "@/lib/types";
import type { EditorProduct } from "./use-editor-state";

export type ProductGridMode = "featured" | "balanced";

export function layoutProductGrid(
  products: EditorProduct[],
  requestedColumns: number,
  canvasWidth: number,
  canvasHeight: number,
  content: Flyer["content"],
  mode: ProductGridMode = "featured",
) {
  if (!products.length) return products;
  const margin = Math.max(24, Math.round(canvasWidth * .04));
  const gap = Math.max(14, Math.round(canvasWidth * .018));
  const topRatio = content === "poster" ? .18 : content === "shelf_label" ? .06 : content === "video" ? .22 : .29;
  const top = Math.round(canvasHeight * topRatio);
  const bottom = Math.round(canvasHeight * .08);
  const columns = Math.max(1, Math.min(requestedColumns, products.length));

  // O layout observado no editor original usa o primeiro produto ocupando
  // duas colunas e duas linhas, seguido por dois cards menores à direita.
  if (mode === "featured" && columns === 3 && products.length >= 3) {
    const remainingRows = Math.ceil(Math.max(0, products.length - 3) / columns);
    const rows = 2 + remainingRows;
    const cellWidth = (canvasWidth - margin * 2 - gap * 2) / 3;
    const cellHeight = (canvasHeight - top - bottom - gap * (rows - 1)) / rows;
    return products.map((product, index) => {
      if (index === 0) return {
        ...product,
        x: margin,
        y: top,
        width: Math.round(cellWidth * 2 + gap),
        height: Math.round(cellHeight * 2 + gap),
      };
      if (index < 3) return {
        ...product,
        x: Math.round(margin + (cellWidth + gap) * 2),
        y: Math.round(top + (index - 1) * (cellHeight + gap)),
        width: Math.round(cellWidth),
        height: Math.round(cellHeight),
      };
      const offset = index - 3;
      const column = offset % columns;
      const row = 2 + Math.floor(offset / columns);
      return {
        ...product,
        x: Math.round(margin + column * (cellWidth + gap)),
        y: Math.round(top + row * (cellHeight + gap)),
        width: Math.round(cellWidth),
        height: Math.round(cellHeight),
      };
    });
  }

  const rows = Math.ceil(products.length / columns);
  const cellWidth = (canvasWidth - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (canvasHeight - top - bottom - gap * (rows - 1)) / rows;
  const cardWidth = Math.max(90, Math.min(cellWidth, cellHeight * .8));
  const cardHeight = Math.max(120, Math.min(cellHeight, cardWidth / .8));
  return products.map((product, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      ...product,
      width: Math.round(cardWidth),
      height: Math.round(cardHeight),
      x: Math.round(margin + column * (cellWidth + gap) + (cellWidth - cardWidth) / 2),
      y: Math.round(top + row * (cellHeight + gap) + (cellHeight - cardHeight) / 2),
    };
  });
}
