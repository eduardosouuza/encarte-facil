import type { RenderElement, RenderFlyer, RenderProduct } from "./svg.js";

// Shared artwork for the editor, thumbnails and every export format.
export interface TextStyle {
  family: string; size: number; weight: number | string; italic?: boolean;
  color: string; align?: string; decoration?: string;
}
export interface ArtworkOptions {
  idPrefix?: string;
  measure?: (text: string, style: TextStyle) => number;
  text?: (text: string, x: number, baseline: number, style: TextStyle) => string;
}
export const xml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const n = (value: unknown, fallback = 0) => value == null || !Number.isFinite(Number(value)) ? fallback : Number(value);
const key = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_");
const currency = (value: unknown) => `R$ ${n(value).toFixed(2).replace(".", ",")}`;
const measure = (text: string, style: TextStyle, options: ArtworkOptions) => options.measure?.(text, style) ?? [...text].length * style.size * .54;
function text(text: string, x: number, y: number, style: TextStyle, options: ArtworkOptions): string {
  if (options.text) return options.text(text, x, y, style);
  return `<text xml:space="preserve" style="white-space:pre" x="${x}" y="${y}" fill="${xml(style.color)}" font-family="${xml(style.family)}" font-size="${style.size}" font-weight="${xml(style.weight)}" font-style="${style.italic ? "italic" : "normal"}" text-decoration="${xml(style.decoration ?? "none")}" text-anchor="${style.align === "left" ? "start" : style.align === "right" ? "end" : "middle"}"><tspan>${xml(text)}</tspan></text>`;
}
function wrap(value: string, width: number, style: TextStyle, options: ArtworkOptions): string[] {
  return value.split("\n").flatMap(paragraph => {
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.split(/(\s+)/)) {
      if (line && measure(line + word, style, options) > width) { lines.push(line.trimEnd()); line = word.trimStart(); }
      else line += word;
    }
    lines.push(line);
    return lines;
  });
}
function ellipsis(value: string, width: number, style: TextStyle, options: ArtworkOptions) {
  if (measure(value, style, options) <= width) return value;
  const chars = [...value];
  while (chars.length && measure(chars.join("") + "…", style, options) > width) chars.pop();
  return chars.join("") + "…";
}
export function svgRoot(width: number, height: number, body: string, name = "Encarte") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xml(name)}">${body}</svg>`;
}

export function elementArtwork(element: RenderElement, id: string, options: ArtworkOptions = {}): string {
  const w = Math.max(1, n(element.width)), h = Math.max(1, n(element.height));
  const clip = `image-${key(id)}`;
  const parts: string[] = element.text && options.text ? [`<title>${xml(element.text)}</title>`] : [];
  if (element.backgroundColor) {
    const fill = `fill="${xml(element.backgroundColor)}"`;
    if (element.type === "shape" && element.subtype === "circle") parts.push(`<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" ${fill}/>`);
    else if (element.type === "shape" && element.subtype === "star") parts.push(`<polygon points="${[[50,0],[61,35],[98,35],[68,57],[79,94],[50,72],[21,94],[32,57],[2,35],[39,35]].map(([x,y]) => `${x! * w / 100},${y! * h / 100}`).join(" ")}" ${fill}/>`);
    else parts.push(`<rect width="${w}" height="${h}" rx="${element.type === "shape" && element.subtype === "rounded" ? w * .08 : 0}" ry="${element.type === "shape" && element.subtype === "rounded" ? h * .08 : 0}" ${fill}/>`);
  }
  if (element.image) parts.push(`<defs><clipPath id="${clip}"><rect width="${w}" height="${h}"/></clipPath></defs><image href="${xml(element.image)}" width="${w}" height="${h}" preserveAspectRatio="${element.imageFit === "cover" ? "xMidYMid slice" : element.imageFit === "fill" ? "none" : "xMidYMid meet"}" clip-path="url(#${clip})"/>`);
  if (element.type === "text" || element.text) {
    const s = element.textStyle ?? {};
    const style: TextStyle = { family: s.fontFamily ?? "Roboto", size: Math.max(1, n(s.fontSize, 24)), weight: s.fontWeight ?? 700, color: s.color ?? "#111827", align: s.align ?? "center", italic: s.fontStyle === "italic", decoration: s.textDecoration };
    const lines = wrap(element.text ?? "", Math.max(1, w - 8), style, options);
    const lineHeight = style.size * 1.5;
    const baseline = (h - lines.length * lineHeight) / 2 + (lineHeight - style.size) / 2 + style.size * .8;
    const x = style.align === "left" ? 4 : style.align === "right" ? w - 4 : w / 2;
    lines.forEach((line, index) => parts.push(text(line, x, baseline + index * lineHeight, style, options)));
  }
  return parts.join("");
}

export function productArtwork(product: RenderProduct, id: string, options: ArtworkOptions = {}): string {
  const w = Math.max(1, n(product.width, 200)), h = Math.max(1, n(product.height, 260)), scale = Math.min(w, h);
  const backgroundVisible = product.backgroundVisible !== false;
  const border = backgroundVisible ? Math.max(0, n(product.borderWidth, 1)) : 0, radius = Math.max(0, n(product.borderRadius, 10));
  const innerW = Math.max(1, w - border * 2), innerH = Math.max(1, h - border * 2);
  const imageH = innerH * .58, padding = Math.min(8, h * .015);
  const uid = key(id), clip = `card-${uid}`, gradient = `gradient-${uid}`, shadow = `shadow-${uid}`;
  const tagColor = product.tagColor ?? "#e11d48", tagStyle = product.tagStyle ?? "solid", shape = product.tagShape ?? "pill";
  const priceStyle: TextStyle = { family: "Roboto", size: scale * .1, weight: 700, color: product.textColor ?? "#ffffff" };
  const nameStyle: TextStyle = { family: "Roboto", size: Math.min(28, scale * .075), weight: 600, color: "#111827" };
  const discount = typeof product.salePrice === "number" && typeof product.price === "number" && product.salePrice < product.price;
  const price = currency(discount ? product.salePrice : product.price);
  const tagPaddingX = Math.max(8, scale * .045), tagPaddingY = Math.max(3, scale * .018), tagBorder = tagStyle === "outline" ? 3 : 0;
  const tagW = measure(price, priceStyle, options) + 2 * (tagPaddingX + tagBorder);
  const tagH = priceStyle.size * 1.1 + 2 * (tagPaddingY + tagBorder);
  const nameTop = border + imageH + padding;
  const tagY = nameTop + nameStyle.size * 1.1 + (discount ? scale * .07 * 1.1 : 0), tagX = (w - tagW) / 2;
  const tagRadius = shape === "pill" || shape === "circle" ? tagH / 2 : shape === "square" ? 3 : 8;
  const polygon = shape === "burst" ? [[50,0],[61,18],[79,7],[82,29],[100,35],[86,50],[100,65],[79,71],[79,93],[61,82],[50,100],[39,82],[21,93],[21,71],[0,65],[14,50],[0,35],[18,29],[21,7],[39,18]] : shape === "ticket" ? [[0,0],[100,0],[100,35],[92,50],[100,65],[100,100],[0,100],[0,65],[8,50],[0,35]] : null;
  const tagClip = `tag-${uid}`;
  const tagGeometry = polygon ? `<polygon points="${polygon.map(([x,y]) => `${tagX + x! * tagW / 100},${tagY + y! * tagH / 100}`).join(" ")}"/>` : `<rect x="${tagX}" y="${tagY}" width="${tagW}" height="${tagH}" rx="${shape === "circle" ? tagW / 2 : tagRadius}" ry="${tagRadius}"/>`;
  const parts = [`<defs><clipPath id="${clip}"><rect width="${w}" height="${h}" rx="${radius}"/></clipPath><clipPath id="${tagClip}">${tagGeometry}</clipPath><linearGradient id="${gradient}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${xml(tagColor)}"/><stop offset="1" stop-color="#111827"/></linearGradient><filter id="${shadow}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter></defs>`];
  if (backgroundVisible && product.cardShadow !== false) parts.push(`<rect x="0" y="2" width="${w}" height="${h}" rx="${radius}" fill="#0f172a" opacity=".12" filter="url(#${shadow})"/>`);
  if (product.isHighlighted) parts.push(`<rect x="-2" y="-2" width="${w + 4}" height="${h + 4}" rx="${radius + 2}" fill="none" stroke="#29d19c" stroke-width="2"/>`);
  parts.push(`<g clip-path="url(#${clip})"><rect width="${w}" height="${h}" fill="${backgroundVisible ? xml(product.backgroundColor ?? "#ffffff") : "none"}"/>`);
  const imageScale = Math.max(.1, Math.min(3, n(product.imageScale, 1)));
  const imageW = Math.max(1, innerW - 8) * imageScale, scaledImageH = Math.max(1, imageH - 8) * imageScale;
  if (product.image) parts.push(`<svg x="${border}" y="${border}" width="${innerW}" height="${imageH}" overflow="hidden"><image href="${xml(product.image)}" x="${(innerW - imageW) / 2}" y="${(imageH - scaledImageH) / 2}" width="${imageW}" height="${scaledImageH}" preserveAspectRatio="xMidYMid meet"/></svg>`);
  else {
    const iconSize = Math.max(18, scale * .12);
    parts.push(`<g transform="translate(${(w - iconSize) / 2} ${border + (imageH - iconSize) / 2}) scale(${iconSize / 24})" fill="none" stroke="#cbd5e1" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8" cy="8" r="2"/><path d="M2 18L9 11L14 16L18 12L22 16"/></g>`);
  }
  parts.push(text(ellipsis(product.name ?? "Produto", innerW - padding * 2, nameStyle, options), w / 2, nameTop + nameStyle.size * .85, nameStyle, options));
  if (discount) parts.push(`<g opacity=".6">${text(currency(product.price), w / 2, nameTop + nameStyle.size * 1.1 + scale * .07 * .85, { ...nameStyle, size: scale * .07, weight: 400, decoration: "line-through" }, options)}</g>`);
  if (tagStyle === "shadow") parts.push(`<rect x="${tagX}" y="${tagY + 5}" width="${tagW}" height="${tagH}" rx="${tagRadius}" fill="${xml(tagColor)}"/><rect x="${tagX}" y="${tagY + 5}" width="${tagW}" height="${tagH}" rx="${tagRadius}" fill="#000000" opacity=".35"/>`);
  parts.push(`<g clip-path="url(#${tagClip})"><rect x="${tagX}" y="${tagY}" width="${tagW}" height="${tagH}" rx="${shape === "circle" ? tagW / 2 : tagRadius}" ry="${tagRadius}" fill="${tagStyle === "outline" ? "none" : tagStyle === "gradient" ? `url(#${gradient})` : xml(tagColor)}" stroke="${xml(tagColor)}" stroke-width="${tagBorder * 2}"/>${text(price, w / 2, tagY + tagBorder + tagPaddingY + priceStyle.size * .85, priceStyle, options)}</g>`);
  if (product.unit) parts.push(`<g opacity=".7">${text(product.unit, w / 2, tagY + tagH + scale * .06, { ...nameStyle, size: scale * .06, weight: 400 }, options)}</g>`);
  parts.push(`</g><rect x="${border / 2}" y="${border / 2}" width="${Math.max(0, w - border)}" height="${Math.max(0, h - border)}" rx="${Math.max(0, radius - border / 2)}" fill="none" stroke="${xml(product.borderColor ?? (product.isHighlighted ? "#29d19c" : "#e2e8f0"))}" stroke-width="${border}"/>`);
  return parts.join("");
}

export function footerArtwork(footer: RenderFlyer["footer"], width: number, height: number, options: ArtworkOptions = {}) {
  if (footer?.visible === false || !footer?.elements?.length) return "";
  const style: TextStyle = { family: "Roboto", size: Math.max(10, height * .018), weight: 400, color: "#0f172a" };
  const lines = wrap(footer.elements.join("  |  "), width - 24, style, options), lineHeight = style.size * 1.5;
  return lines.map((line, index) => text(line, width / 2, height - 12 - (lines.length - index - 1) * lineHeight - style.size * .3, style, options)).join("");
}

export function renderFlyerToSvg(flyer: RenderFlyer, options: ArtworkOptions = {}): string {
  const width = Math.max(1, Math.round(n(flyer.width, 1080))), height = Math.max(1, Math.round(n(flyer.height, 1350)));
  const layers = [
    ...flyer.elements.map((element, index) => ({ z: n(element.zIndex), order: index, item: element, body: elementArtwork(element, `${options.idPrefix ?? ""}e${index}`, options), opacity: Math.max(0, Math.min(1, n(element.opacity, 1))) })),
    ...flyer.products.map((product, index) => ({ z: 500 + index, order: flyer.elements.length + index, item: product, body: productArtwork(product, `${options.idPrefix ?? ""}p${index}`, options), opacity: 1 })),
    { z: 1000, order: flyer.elements.length + flyer.products.length, item: { width, height }, body: footerArtwork(flyer.footer, width, height, options), opacity: 1 },
  ].sort((a, b) => a.z - b.z || a.order - b.order);
  return svgRoot(width, height, `<rect width="${width}" height="${height}" fill="${xml(flyer.backgroundColor ?? flyer.settings?.colors?.background ?? "#ffffff")}"/>` + layers.map(({ item, body, opacity }) => {
    const e = item as RenderElement;
    return `<g transform="translate(${n(e.x)} ${n(e.y)}) rotate(${n(e.rotation)} ${n(e.width) / 2} ${n(e.height) / 2})" opacity="${opacity}">${body}</g>`;
  }).join(""), flyer.name);
}
