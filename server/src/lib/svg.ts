export interface RenderElement {
  id?: string;
  type?: string;
  category?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  text?: string;
  backgroundColor?: string;
  image?: string;
  asset?: string;
  textStyle?: {
    fontFamily?: string;
    fontWeight?: number | string;
    fontSize?: number;
    color?: string;
    align?: string;
    textDecoration?: string;
    fontStyle?: string;
  };
}

export interface RenderProduct {
  id?: string;
  name?: string;
  image?: string;
  price?: number;
  salePrice?: number | null;
  unit?: string;
  notes?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  isHighlighted?: boolean;
  tagColor?: string;
  textColor?: string;
  backgroundColor?: string;
  tagShape?: "circle" | "pill" | "ticket" | "burst" | "square";
  tagStyle?: "solid" | "outline" | "gradient" | "shadow";
}

export interface RenderFlyer {
  name?: string;
  width: number;
  height: number;
  backgroundColor?: string;
  elements: RenderElement[];
  products: RenderProduct[];
  footer?: { visible?: boolean; elements?: string[] };
  settings?: { colors?: { background?: string; text?: string; accent?: string } };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Renderiza o modelo do encarte em SVG.
 *
 * O SVG também é a entrada da rasterização PNG/JPEG e da composição PDF.
 */
export function renderFlyerToSvg(flyer: RenderFlyer): string {
  const width = Math.max(1, Math.round(num(flyer.width, 1080)));
  const height = Math.max(1, Math.round(num(flyer.height, 1350)));
  const colors = flyer.settings?.colors ?? {};
  const background = flyer.backgroundColor ?? colors.background ?? "#ffffff";
  const defaultText = colors.text ?? "#0f172a";
  const accent = colors.accent ?? "#e11d48";

  const elements = [...flyer.elements].sort((a, b) => num(a.zIndex) - num(b.zIndex));
  const products = [...flyer.products].sort((a, b) => num(a.y) - num(b.y));

  const body: string[] = [];

  for (const element of elements) {
    const x = num(element.x);
    const y = num(element.y);
    const w = num(element.width);
    const h = num(element.height);
    const transform =
      num(element.rotation) !== 0
        ? ` transform="rotate(${num(element.rotation)} ${x + w / 2} ${y + h / 2})"`
        : "";
    const opacity = element.opacity === undefined ? 1 : Math.max(0, Math.min(1, num(element.opacity, 1)));

    if (element.type === "text" && element.text) {
      const style = element.textStyle ?? {};
      const fontSize = num(style.fontSize, Math.max(12, Math.round(h * 0.6)));
      const anchor = style.align === "left" ? "start" : style.align === "right" ? "end" : "middle";
      const tx = style.align === "left" ? x : style.align === "right" ? x + w : x + w / 2;
      const lines = element.text.split("\n");
      const ty = y + (h - lines.length * fontSize * 1.2) / 2 + fontSize;
      body.push(
        `<text x="${tx}" y="${ty}" fill="${escapeXml(style.color ?? defaultText)}" ` +
          `font-family="${escapeXml(style.fontFamily ?? "Roboto, sans-serif")}" ` +
          `font-size="${fontSize}" font-weight="${escapeXml(String(style.fontWeight ?? 400))}" ` +
          `${style.textDecoration ? `text-decoration="${escapeXml(style.textDecoration)}"` : ""} ` +
          `${style.fontStyle ? `font-style="${escapeXml(style.fontStyle)}"` : ""} ` +
          `text-anchor="${anchor}" opacity="${opacity}"${transform}>${lines.map((line, i) => `<tspan x="${tx}" dy="${i === 0 ? 0 : fontSize * 1.2}">${escapeXml(line)}</tspan>`).join("")}</text>`,
      );
      continue;
    }

    if (element.image) {
      body.push(
        `<image href="${escapeXml(element.image)}" x="${x}" y="${y}" width="${w}" height="${h}" ` +
          `preserveAspectRatio="xMidYMid meet" opacity="${opacity}"${transform}/>`,
      );
      continue;
    }

    if (element.backgroundColor) {
      body.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${escapeXml(element.backgroundColor)}" ` +
          `rx="${Math.min(12, Math.round(h * 0.04))}" opacity="${opacity}"${transform}/>`,
      );
    }
  }

  for (const product of products) {
    const priceColor = product.tagColor ?? accent;
    const x = num(product.x);
    const y = num(product.y);
    const w = num(product.width, 200);
    const h = num(product.height, 260);
    const nameSize = Math.max(10, Math.round(w * 0.075));
    const priceSize = Math.max(12, Math.round(w * 0.1));
    const transform =
      num(product.rotation) !== 0
        ? ` transform="rotate(${num(product.rotation)} ${x + w / 2} ${y + h / 2})"`
        : "";

    body.push(
      `<g${transform}>`,
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${escapeXml(product.backgroundColor ?? "#ffffff")}" stroke="${escapeXml(product.isHighlighted ? accent : "#e2e8f0")}" stroke-width="${product.isHighlighted ? 4 : 1}"/>`,
    );

    if (product.image) {
      body.push(
        `<image href="${escapeXml(product.image)}" x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${Math.round(h * 0.5)}" preserveAspectRatio="xMidYMid meet"/>`,
      );
    } else {
      body.push(
        `<rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${Math.round(h * 0.5)}" fill="${escapeXml(accent)}" opacity="0.15"/>`,
      );
    }

    const nameY = y + Math.round(h * 0.5) + Math.round(nameSize * 1.4);
    body.push(
      `<text x="${x + w / 2}" y="${nameY}" fill="${escapeXml(defaultText)}" font-family="Roboto, sans-serif" ` +
        `font-size="${nameSize}" font-weight="500" text-anchor="middle">${escapeXml((product.name ?? "").slice(0, 42))}</text>`,
    );

    const priceY = nameY + Math.round(priceSize * 1.35);
    const currentPriceY = typeof product.salePrice === "number" && product.salePrice >= 0 && product.salePrice < num(product.price)
      ? priceY + Math.round(priceSize * 1.1) : priceY;
    const tagWidth = Math.round(w * (product.tagShape === "circle" ? .48 : .72));
    const tagHeight = Math.round(priceSize * 1.5);
    const tagX = x + (w - tagWidth) / 2;
    const tagY = currentPriceY - Math.round(priceSize * 1.05);
    const tagRadius = product.tagShape === "pill" || product.tagShape === "circle" ? Math.round(tagHeight / 2) : product.tagShape === "square" ? 3 : 9;
    if (product.tagStyle === "shadow") body.push(`<rect x="${tagX + 4}" y="${tagY + 5}" width="${tagWidth}" height="${tagHeight}" rx="${tagRadius}" fill="#000000" opacity="0.3"/>`);
    body.push(`<rect x="${tagX}" y="${tagY}" width="${tagWidth}" height="${tagHeight}" rx="${tagRadius}" fill="${product.tagStyle === "outline" ? "none" : escapeXml(priceColor)}" stroke="${escapeXml(priceColor)}" stroke-width="${product.tagStyle === "outline" ? 3 : 0}"/>`);
    if (typeof product.salePrice === "number" && product.salePrice >= 0 && product.salePrice < num(product.price)) {
      body.push(
        `<text x="${x + w / 2}" y="${priceY}" fill="${escapeXml(defaultText)}" opacity="0.55" ` +
          `font-family="Roboto, sans-serif" font-size="${Math.round(priceSize * 0.7)}" text-anchor="middle">${escapeXml(money(num(product.price)))}</text>`,
      );
      body.push(
        `<text x="${x + w / 2}" y="${priceY + Math.round(priceSize * 1.1)}" fill="${escapeXml(product.textColor ?? "#ffffff")}" ` +
          `font-family="Oswald, sans-serif" font-size="${priceSize}" font-weight="700" text-anchor="middle">${escapeXml(money(product.salePrice))}</text>`,
      );
    } else {
      body.push(
        `<text x="${x + w / 2}" y="${priceY}" fill="${escapeXml(product.textColor ?? "#ffffff")}" font-family="Oswald, sans-serif" ` +
          `font-size="${priceSize}" font-weight="700" text-anchor="middle">${escapeXml(money(num(product.price)))}</text>`,
      );
    }

    if (product.unit) {
      body.push(
        `<text x="${x + w / 2}" y="${priceY + Math.round(priceSize * 2.1)}" fill="${escapeXml(defaultText)}" opacity="0.75" ` +
          `font-family="Roboto, sans-serif" font-size="${Math.round(nameSize * 0.85)}" text-anchor="middle">${escapeXml(product.unit)}</text>`,
      );
    }

    body.push("</g>");
  }

  if (flyer.footer?.visible !== false && flyer.footer?.elements?.length) {
    const text = flyer.footer.elements.join("  |  ");
    body.push(
      `<text x="${width / 2}" y="${height - 16}" fill="${escapeXml(defaultText)}" opacity="0.8" ` +
        `font-family="Roboto, sans-serif" font-size="${Math.max(10, Math.round(height * 0.018))}" text-anchor="middle">${escapeXml(text)}</text>`,
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ` +
    `role="img" aria-label="${escapeXml(flyer.name ?? "Encarte")}">` +
    `<rect width="${width}" height="${height}" fill="${escapeXml(background)}"/>` +
    body.join("") +
    `</svg>`
  );
}
