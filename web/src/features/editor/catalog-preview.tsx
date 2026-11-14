import type { EditorElement } from "./use-editor-state";

export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

export function ShapeArtwork({ subtype, color }: { subtype?: string; color: string }) {
  return <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" fill={color}>
    {subtype === "circle" ? <ellipse cx="50" cy="50" rx="50" ry="50" /> : subtype === "star" ? <polygon points="50,0 61,35 98,35 68,57 79,94 50,72 21,94 32,57 2,35 39,35" /> : <rect width="100" height="100" rx={subtype === "rounded" ? 8 : 0} />}
  </svg>;
}

type PreviewElement = Partial<EditorElement>;
export function CatalogPreview({ elements, width = 1080, height = 1350, background = "#f1f5f9" }: { elements: PreviewElement[]; width?: number; height?: number; background?: string }) {
  return <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} className="block h-full w-full" style={{ background }}>
    {[...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)).map((item, index) => {
      const x = item.x ?? 0, y = item.y ?? 0, w = item.width ?? width, h = item.height ?? height;
      return <g key={index} opacity={item.opacity ?? 1} transform={`rotate(${item.rotation ?? 0} ${x + w / 2} ${y + h / 2})`}>
        {item.backgroundColor && (item.subtype === "circle" ? <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={item.backgroundColor} /> : item.subtype === "star" ? <polygon transform={`translate(${x} ${y}) scale(${w / 100} ${h / 100})`} points="50,0 61,35 98,35 68,57 79,94 50,72 21,94 32,57 2,35 39,35" fill={item.backgroundColor} /> : <rect x={x} y={y} width={w} height={h} rx={item.subtype === "rounded" ? Math.min(w, h) * .08 : 0} fill={item.backgroundColor} />)}
        {item.image && <image href={item.image} x={x} y={y} width={w} height={h} preserveAspectRatio={item.imageFit === "cover" ? "xMidYMid slice" : item.imageFit === "fill" ? "none" : "xMidYMid meet"} />}
        {item.text && <text x={x + w / 2} y={y + h / 2} dominantBaseline="middle" textAnchor="middle" fill={item.textStyle?.color ?? "#111827"} fontFamily={item.textStyle?.fontFamily ?? "Arial"} fontWeight={item.textStyle?.fontWeight ?? 700} fontSize={item.textStyle?.fontSize ?? 24}>{item.text}</text>}
      </g>;
    })}
  </svg>;
}
