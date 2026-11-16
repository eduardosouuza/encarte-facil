import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { xml, type ArtworkOptions, type TextStyle } from "./artwork.js";

interface Font {
  unitsPerEm: number;
  layout(text: string): {
    glyphs: { path: { toSVG(): string } }[];
    positions: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number }[];
  };
}
const require = createRequire(import.meta.url);
const { openSync } = require("fontkit") as { openSync(file: string): Font };
const fonts = new Map<string, Font>();
function getFont(style: TextStyle) {
  const weight = Math.max(300, Math.min(900, Math.round((Number(style.weight) || (style.weight === "bold" ? 700 : 400)) / 100) * 100));
  const family = style.family.toLowerCase();
  const system: Record<string, [string, string, string, string]> = {
    arial: ["arial", "arialbd", "ariali", "arialbi"],
    georgia: ["georgia", "georgiab", "georgiai", "georgiaz"],
    verdana: ["verdana", "verdanab", "verdanai", "verdanaz"],
    tahoma: ["tahoma", "tahomabd", "tahoma", "tahomabd"],
    "times new roman": ["times", "timesbd", "timesi", "timesbi"],
    "courier new": ["cour", "courbd", "couri", "courbi"],
  };
  const systemName = system[family]?.[(style.italic ? 2 : 0) + (weight >= 600 ? 1 : 0)];
  const systemPath = systemName ? path.join(process.env.WINDIR ?? "C:/Windows", "Fonts", `${systemName}.ttf`) : "";
  const bundled = family === "oswald" || family === "montserrat" ? family : "roboto";
  const file = systemPath && existsSync(systemPath) ? systemPath : require.resolve(`@fontsource/${bundled}/files/${bundled}-latin-${bundled === "oswald" ? Math.min(700, weight) : weight}-${style.italic && bundled !== "oswald" ? "italic" : "normal"}.woff`);
  let font = fonts.get(file);
  if (!font) { font = openSync(file); fonts.set(file, font); }
  return { font, syntheticItalic: !!style.italic && (family === "tahoma" || bundled === "oswald") };
}

// Convert glyphs to vector paths: installed fonts on the device opening the
// exported SVG/PDF/image can no longer change line breaks or price widths.
export const exportArtworkOptions: ArtworkOptions = {
  measure(value, style) {
    const { font } = getFont(style);
    return font.layout(value).positions.reduce((sum, position) => sum + position.xAdvance, 0) * style.size / font.unitsPerEm;
  },
  text(value, x, y, style) {
    const { font, syntheticItalic } = getFont(style), run = font.layout(value), scale = style.size / font.unitsPerEm;
    const width = run.positions.reduce((sum, position) => sum + position.xAdvance, 0) * scale;
    const left = style.align === "left" ? x : style.align === "right" ? x - width : x - width / 2;
    let cursor = 0;
    const paths = run.glyphs.map((glyph, index) => {
      const position = run.positions[index]!;
      const d = glyph.path.toSVG();
      const result = `<path transform="translate(${cursor + position.xOffset} ${position.yOffset})" d="${xml(d)}"/>`;
      cursor += position.xAdvance;
      return result;
    }).join("");
    const decoration = style.decoration === "underline" || style.decoration === "line-through"
      ? `<path d="M${left},${y + (style.decoration === "underline" ? style.size * .12 : -style.size * .3)}h${width}" fill="none" stroke="${xml(style.color)}" stroke-width="${Math.max(1, style.size / 16)}"/>` : "";
    return `<g fill="${xml(style.color)}" aria-label="${xml(value)}"><title>${xml(value)}</title><g transform="translate(${left} ${y}) scale(${scale} ${-scale})${syntheticItalic ? " skewX(12)" : ""}">${paths}</g>${decoration}</g>`;
  },
};
