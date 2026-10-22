import * as React from "react";
import { cn } from "@/lib/utils";
import type { EditorElement, EditorProduct } from "./use-editor-state";

interface CanvasProps {
  width: number;
  height: number;
  zoom: number;
  backgroundColor: string;
  elements: EditorElement[];
  products: EditorProduct[];
  footer?: { visible: boolean; elements: string[] };
  selectedId: string | null;
  selectedKind: "element" | "product" | null;
  onSelect: (id: string | null, kind?: "element" | "product") => void;
  onChangeElement: (id: string, patch: Partial<EditorElement>, final: boolean) => void;
  onChangeProduct: (id: string, patch: Partial<EditorProduct>, final: boolean) => void;
}

type DragMode = "move" | "resize";

interface DragState {
  mode: DragMode;
  kind: "element" | "product";
  id: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originWidth: number;
  originHeight: number;
}

export function FlyerCanvas({
  width,
  height,
  zoom,
  backgroundColor,
  elements,
  products,
  footer,
  selectedId,
  selectedKind,
  onSelect,
  onChangeElement,
  onChangeProduct,
}: CanvasProps) {
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<DragState | null>(null);

  const sortedElements = React.useMemo(
    () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
    [elements],
  );

  function startDrag(
    event: React.PointerEvent,
    mode: DragMode,
    kind: "element" | "product",
    id: string,
    origin: { x: number; y: number; width: number; height: number },
  ) {
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    dragRef.current = {
      mode,
      kind,
      id,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      originWidth: origin.width,
      originHeight: origin.height,
    };
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / zoom;
    const dy = (event.clientY - drag.startY) / zoom;

    if (drag.mode === "move") {
      const patch = {
        x: Math.round(Math.max(0, Math.min(width - 40, drag.originX + dx))),
        y: Math.round(Math.max(0, Math.min(height - 40, drag.originY + dy))),
      };
      if (drag.kind === "element") onChangeElement(drag.id, patch, false);
      else onChangeProduct(drag.id, patch, false);
    } else {
      const patch = {
        width: Math.max(20, Math.round(drag.originWidth + dx)),
        height: Math.max(20, Math.round(drag.originHeight + dy)),
      };
      if (drag.kind === "element") onChangeElement(drag.id, patch, false);
      else onChangeProduct(drag.id, patch, false);
    }
  }

  function handlePointerUp() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (drag.kind === "element") onChangeElement(drag.id, {}, true);
    else onChangeProduct(drag.id, {}, true);
  }

  return (
    <div className="flex h-full w-full items-start justify-center overflow-auto bg-slate-100 p-6 scrollbar-thin dark:bg-slate-900">
      <div
        ref={surfaceRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerDown={() => onSelect(null)}
        style={{
          width: width * zoom,
          height: height * zoom,
          position: "relative",
          flexShrink: 0,
          touchAction: "none",
          backgroundColor,
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.25)",
        }}
        data-testid="flyer-canvas"
      >
        <div
          style={{
            width,
            height,
            position: "absolute",
            top: 0,
            left: 0,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            overflow: "hidden",
          }}
        >
          {sortedElements.map((element) => {
            const isSelected = selectedKind === "element" && selectedId === element.id;
            return (
              <div
                key={element.id}
                data-testid={`element-${element.id}`}
                onPointerDown={(event) => {
                  onSelect(element.id, "element");
                  startDrag(event, "move", "element", element.id, element);
                }}
                className={cn(
                  "absolute cursor-move select-none",
                  isSelected && "outline outline-2 outline-primary",
                )}
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                  zIndex: element.zIndex,
                  opacity: element.opacity,
                  transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                  backgroundColor: element.backgroundColor ?? "transparent",
                  ...(element.type === "image" && element.image
                    ? {
                        backgroundImage: `url(${element.image})`,
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                      }
                    : {}),
                }}
              >
                {element.type === "text" || element.text ? (
                  <div
                    className="flex h-full w-full items-center justify-center whitespace-pre-wrap p-1 text-center"
                    style={{
                      color: element.textStyle?.color ?? "#111827",
                      fontFamily: element.textStyle?.fontFamily ?? "Roboto",
                      fontWeight: element.textStyle?.fontWeight ?? 700,
                      fontSize: element.textStyle?.fontSize ?? 24,
                      textAlign: element.textStyle?.align ?? "center",
                      justifyContent: element.textStyle?.align === "left" ? "flex-start" : element.textStyle?.align === "right" ? "flex-end" : "center",
                      textDecoration: element.textStyle?.textDecoration,
                      fontStyle: element.textStyle?.fontStyle,
                    }}
                  >
                    {element.text ?? ""}
                  </div>
                ) : null}

                {isSelected ? (
                  <span
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      startDrag(event, "resize", "element", element.id, element);
                    }}
                    className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-sm border border-primary bg-white"
                  />
                ) : null}
              </div>
            );
          })}

          {products.map((product) => {
            const isSelected = selectedKind === "product" && selectedId === product.id;
            const hasDiscount =
              typeof product.salePrice === "number" &&
              typeof product.price === "number" &&
              product.salePrice < product.price;
            const tagColor = product.tagColor ?? "#e11d48";
            const tagShape = product.tagShape ?? "pill";
            const tagStyle = product.tagStyle ?? "solid";
            const tagVisualStyle: React.CSSProperties = {
              color: product.textColor ?? "#ffffff",
              fontSize: product.width * .1,
              padding: `${Math.max(3, product.width * .018)}px ${Math.max(8, product.width * .045)}px`,
              borderRadius: tagShape === "circle" ? "50%" : tagShape === "pill" ? "9999px" : tagShape === "square" ? "3px" : "8px",
              background: tagStyle === "gradient" ? `linear-gradient(135deg, ${tagColor}, #111827)` : tagStyle === "outline" ? "transparent" : tagColor,
              border: tagStyle === "outline" ? `3px solid ${tagColor}` : undefined,
              boxShadow: tagStyle === "shadow" ? `0 5px 0 color-mix(in srgb, ${tagColor}, black 35%)` : undefined,
              clipPath: tagShape === "burst" ? "polygon(50% 0%,61% 18%,79% 7%,82% 29%,100% 35%,86% 50%,100% 65%,79% 71%,79% 93%,61% 82%,50% 100%,39% 82%,21% 93%,21% 71%,0 65%,14% 50%,0 35%,18% 29%,21% 7%,39% 18%)" : tagShape === "ticket" ? "polygon(0 0,100% 0,100% 35%,92% 50%,100% 65%,100% 100%,0 100%,0 65%,8% 50%,0 35%)" : undefined,
            };

            return (
              <div
                key={product.id}
                data-testid={`product-${product.id}`}
                onPointerDown={(event) => {
                  onSelect(product.id, "product");
                  startDrag(event, "move", "product", product.id, product);
                }}
                className={cn(
                  "absolute cursor-move select-none overflow-hidden rounded-sm border bg-white shadow-sm",
                  product.isHighlighted && "ring-2 ring-primary",
                  isSelected && "outline outline-2 outline-primary",
                )}
                style={{
                  left: product.x,
                  top: product.y,
                  width: product.width,
                  height: product.height,
                  zIndex: 500 + products.indexOf(product),
                  transform: product.rotation ? `rotate(${product.rotation}deg)` : undefined,
                  backgroundColor: product.backgroundColor ?? "#ffffff",
                  color: "#111827",
                }}
              >
                {product.image ? (
                  <img src={product.image} alt={product.name ?? "Produto"} className="h-[58%] w-full bg-white object-contain p-1" />
                ) : <div className="grid h-[58%] place-items-center bg-slate-50 text-slate-300" style={{ fontSize: Math.max(18, product.width * .16) }}>▧</div>}
                <div className="p-2 text-center" style={{ fontSize: Math.max(10, Math.min(28, product.width * .075)) }}>
                  <p className="truncate font-semibold">{product.name ?? "Produto"}</p>
                  <div className="flex flex-col items-center gap-1">
                    {hasDiscount ? (
                      <>
                        <span className="line-through opacity-60" style={{ fontSize: product.width * .07 }}>
                          R$ {(product.price ?? 0).toFixed(2)}
                        </span>
                        <span className="font-bold" style={tagVisualStyle}>
                          R$ {(product.salePrice ?? 0).toFixed(2).replace(".", ",")}
                        </span>
                      </>
                    ) : (
                      <span className="font-bold" style={tagVisualStyle}>
                        R$ {(product.price ?? 0).toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </div>
                  {product.unit ? <span className="opacity-70" style={{ fontSize: product.width * .06 }}>{product.unit}</span> : null}
                </div>

                {isSelected ? (
                  <span
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      startDrag(event, "resize", "product", product.id, product);
                    }}
                    className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-sm border border-primary bg-white"
                  />
                ) : null}
              </div>
            );
          })}
          {footer?.visible && footer.elements.length > 0 && <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, zIndex: 1000, textAlign: "center", fontSize: Math.max(10, height * .018), pointerEvents: "none", color: "#0f172a" }}>{footer.elements.join("  |  ")}</div>}
        </div>
      </div>
    </div>
  );
}
