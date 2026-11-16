import * as React from "react";
import { cn } from "@/lib/utils";
import { elementArtwork, productArtwork, footerArtwork, type ArtworkOptions } from "../../../../server/src/lib/artwork";
import { useArtworkFonts } from "./use-artwork-fonts";
import type { EditorElement, EditorProduct } from "./use-editor-state";

interface CanvasProps {
  preview?: boolean;
  width: number;
  height: number;
  zoom: number;
  onZoomChange?: (zoom: number) => void;
  onViewportResize?: (size: { width: number; height: number }) => void;
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

type DragMode = "move" | "resize" | "image-resize";

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
  imageScale?: number;
  cornerX?: number;
  cornerY?: number;
  rotation?: number;
}

export function FlyerCanvas({
  preview = false,
  width,
  height,
  zoom,
  onZoomChange,
  onViewportResize,
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
  const artworkOptions: ArtworkOptions = useArtworkFonts();
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  React.useEffect(() => { setSelectedImage(current => selectedKind === "product" && current === selectedId ? current : null); }, [selectedId, selectedKind]);
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !onViewportResize) return;
    const observer = new ResizeObserver(() => onViewportResize?.({ width: viewport.clientWidth, height: viewport.clientHeight }));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [onViewportResize]);
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !onZoomChange) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onZoomChange(Math.max(.1, Math.min(3, zoom * Math.exp(-event.deltaY * .002))));
    };
    viewport.addEventListener("wheel", wheel, { passive: false });
    return () => viewport.removeEventListener("wheel", wheel);
  }, [zoom, onZoomChange]);

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

    if (drag.mode === "image-resize") {
      const angle = (drag.rotation ?? 0) * Math.PI / 180;
      const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
      const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
      const change = (localX * drag.cornerX! * drag.originWidth + localY * drag.cornerY! * drag.originHeight) * 2 / (drag.originWidth ** 2 + drag.originHeight ** 2);
      onChangeProduct(drag.id, { imageScale: Math.max(.1, Math.min(3, drag.imageScale! + change)) }, false);
    } else if (drag.mode === "move") {
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
    <div ref={viewportRef} data-testid={preview ? undefined : "canvas-viewport"} className={preview ? "pointer-events-none overflow-hidden" : "flex min-h-0 w-full flex-1 items-start overflow-auto bg-muted p-6 scrollbar-thin"}>
      <div
        ref={surfaceRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerDown={() => { setSelectedImage(null); onSelect(null); }}
        style={{
          width: width * zoom,
          height: height * zoom,
          position: "relative",
          flexShrink: 0,
          marginInline: "auto",
          touchAction: "none",
          backgroundColor,
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.25)",
        }}
        data-testid={preview ? undefined : "flyer-canvas"}
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
                data-testid={preview ? undefined : `element-${element.id}`}
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

                }}
              >
                <svg width={element.width} height={element.height} overflow="visible" className="pointer-events-none absolute inset-0" dangerouslySetInnerHTML={{ __html: elementArtwork(element, `${preview ? "preview" : "editor"}-${element.id}`, artworkOptions) }} />

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
            const imageSelected = isSelected && selectedImage === product.id;
            const border = product.backgroundVisible === false ? 0 : product.borderWidth ?? 1;
            const imageWidth = Math.max(1, product.width - border * 2 - 8);
            const imageHeight = Math.max(1, (product.height - border * 2) * .58 - 8);
            const imageScale = product.imageScale ?? 1;

            return (
              <div
                key={product.id}
                data-testid={preview ? undefined : `product-${product.id}`}
                onPointerDown={(event) => {
                  setSelectedImage(null);
                  onSelect(product.id, "product");
                  startDrag(event, "move", "product", product.id, product);
                }}
                className={cn(
                  "absolute cursor-move select-none",
                  isSelected && !imageSelected && "outline outline-2 outline-primary",
                )}
                style={{
                  left: product.x,
                  top: product.y,
                  width: product.width,
                  height: product.height,
                  zIndex: 500 + products.indexOf(product),
                  touchAction: "none",
                  transform: product.rotation ? `rotate(${product.rotation}deg)` : undefined,

                }}
              >
                <svg width={product.width} height={product.height} overflow="visible" className="pointer-events-none absolute inset-0" dangerouslySetInnerHTML={{ __html: productArtwork(product, `${preview ? "preview" : "editor"}-${product.id}`, artworkOptions) }} />
                {!preview && product.image && <div
                  role="button" tabIndex={0} aria-label={`Selecionar imagem de ${product.name ?? "produto"}`}
                  onPointerDown={event => { event.stopPropagation(); onSelect(product.id, "product"); setSelectedImage(product.id); }}
                  onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(product.id, "product"); setSelectedImage(product.id); } }}
                  className={cn("absolute cursor-pointer", imageSelected && "outline outline-2 outline-blue-500")}
                  style={{ left: (product.width - imageWidth * imageScale) / 2, top: border + 4 + imageHeight * (1 - imageScale) / 2, width: imageWidth * imageScale, height: imageHeight * imageScale, touchAction: "none" }}
                >
                  {imageSelected && ([-1, 1] as const).flatMap(cx => ([-1, 1] as const).map(cy => <span
                    key={`${cx}-${cy}`} role="button" aria-label={`Redimensionar imagem ${cx === -1 ? "esquerda" : "direita"} ${cy === -1 ? "superior" : "inferior"}`}
                    onPointerDown={event => {
                      startDrag(event, "image-resize", "product", product.id, { ...product, width: imageWidth, height: imageHeight });
                      Object.assign(dragRef.current!, { imageScale, cornerX: cx, cornerY: cy, rotation: product.rotation });
                    }}
                    className="absolute rounded-sm border-2 border-blue-500 bg-white"
                    style={{ width: 16 / zoom, height: 16 / zoom, left: cx === -1 ? -8 / zoom : imageWidth * imageScale - 8 / zoom, top: cy === -1 ? -8 / zoom : imageHeight * imageScale - 8 / zoom, cursor: cx === cy ? "nwse-resize" : "nesw-resize", touchAction: "none" }}
                  />))}
                </div>}

                {isSelected && !imageSelected ? (
                  <span
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      startDrag(event, "resize", "product", product.id, product);
                    }}
                    role="button"
                    aria-label="Redimensionar produto"
                    title="Arraste para redimensionar o produto"
                    style={{ width: 16 / zoom, height: 16 / zoom, right: -8 / zoom, bottom: -8 / zoom, touchAction: "none" }}
                    className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-sm border border-primary bg-white"
                  />
                ) : null}
              </div>
            );
          })}
          {footer?.visible && footer.elements.length > 0 && <svg width={width} height={height} className="pointer-events-none absolute inset-0" style={{ zIndex: 1000 }} dangerouslySetInnerHTML={{ __html: footerArtwork(footer, width, height, artworkOptions) }} />}
        </div>
      </div>
    </div>
  );
}
