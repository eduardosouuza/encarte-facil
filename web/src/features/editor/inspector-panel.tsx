import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from "lucide-react";
import type { EditorElement, EditorProduct } from "./use-editor-state";

interface InspectorProps {
  element?: EditorElement;
  product?: EditorProduct;
  onChangeElement: (patch: Partial<EditorElement>, final: boolean) => void;
  onChangeProduct: (patch: Partial<EditorProduct>, final: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveLayer: (direction: "up" | "down" | "front" | "back") => void;
}

export function InspectorPanel({
  element,
  product,
  onChangeElement,
  onChangeProduct,
  onDelete,
  onDuplicate,
  onMoveLayer,
}: InspectorProps) {
  if (!element && !product) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Selecione um elemento ou produto no encarte para editar suas propriedades.
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      {element ? (
        <>
          <div>
            <h3 className="font-display text-base font-semibold">Elemento</h3>
            <p className="text-xs capitalize text-muted-foreground">
              {element.category} · {element.type}
            </p>
          </div>

          {element.type === "text" ? (
            <div className="space-y-2">
              <Label htmlFor="element-text">Texto</Label>
              <textarea
                id="element-text"
                className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={element.text ?? ""}
                onChange={(event) => onChangeElement({ text: event.target.value }, false)}
                onBlur={() => onChangeElement({}, true)}
              />
            </div>
          ) : null}
          {element.type === "text" && <div className="space-y-3">
            <label className="block text-sm">Fonte<select aria-label="Fonte" className="w-full rounded border p-2" value={element.textStyle?.fontFamily ?? "Arial"} onChange={e => onChangeElement({ textStyle: { ...element.textStyle, fontFamily: e.target.value } }, true)}>
              {["Arial", "Georgia", "Verdana", "Tahoma", "Times New Roman", "Courier New", "Oswald", "Roboto", "Montserrat"].map(font => <option key={font}>{font}</option>)}
            </select></label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" aria-pressed={Number(element.textStyle?.fontWeight) >= 700} onClick={() => onChangeElement({ textStyle: { ...element.textStyle, fontWeight: Number(element.textStyle?.fontWeight) >= 700 ? 400 : 700 } }, true)}>Negrito</Button>
              <Button variant="outline" size="sm" aria-pressed={element.textStyle?.fontStyle === "italic"} onClick={() => onChangeElement({ textStyle: { ...element.textStyle, fontStyle: element.textStyle?.fontStyle === "italic" ? "normal" : "italic" } }, true)}>Itálico</Button>
              <Button variant="outline" size="sm" aria-pressed={element.textStyle?.textDecoration === "underline"} onClick={() => onChangeElement({ textStyle: { ...element.textStyle, textDecoration: element.textStyle?.textDecoration === "underline" ? "none" : "underline" } }, true)}>Sublinhar</Button>
              <Button variant="outline" size="sm" onClick={() => onChangeElement({ text: element.text?.toLocaleUpperCase("pt-BR") }, true)}>MAIÚSCULAS</Button>
            </div>
          </div>}
          {element.type === "shape" && <label className="block text-sm">Cor da forma<Input type="color" value={element.backgroundColor ?? "#f97316"} onChange={e => onChangeElement({ backgroundColor: e.target.value }, false)} onBlur={() => onChangeElement({}, true)} /></label>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="element-x">X</Label>
              <Input
                id="element-x"
                type="number"
                value={Math.round(element.x)}
                onChange={(event) => onChangeElement({ x: Number(event.target.value) }, false)}
                onBlur={() => onChangeElement({}, true)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="element-y">Y</Label>
              <Input
                id="element-y"
                type="number"
                value={Math.round(element.y)}
                onChange={(event) => onChangeElement({ y: Number(event.target.value) }, false)}
                onBlur={() => onChangeElement({}, true)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="element-width">Largura</Label>
              <Input
                id="element-width"
                type="number"
                value={Math.round(element.width)}
                onChange={(event) => onChangeElement({ width: Number(event.target.value) }, false)}
                onBlur={() => onChangeElement({}, true)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="element-height">Altura</Label>
              <Input
                id="element-height"
                type="number"
                value={Math.round(element.height)}
                onChange={(event) => onChangeElement({ height: Number(event.target.value) }, false)}
                onBlur={() => onChangeElement({}, true)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="element-font-size">Tamanho da fonte</Label>
            <Input
              id="element-font-size"
              type="number"
              min={6}
              max={160}
              value={element.textStyle?.fontSize ?? 24}
              onChange={(event) =>
                onChangeElement(
                  { textStyle: { ...element.textStyle, fontSize: Number(event.target.value) } },
                  false,
                )
              }
              onBlur={() => onChangeElement({}, true)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="element-color">Cor do texto</Label>
            <Input
              id="element-color"
              type="color"
              className="h-10 p-1"
              value={element.textStyle?.color ?? "#111827"}
              onChange={(event) =>
                onChangeElement(
                  { textStyle: { ...element.textStyle, color: event.target.value } },
                  false,
                )
              }
              onBlur={() => onChangeElement({}, true)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="element-align">Alinhamento</Label>
            <Select
              value={element.textStyle?.align ?? "center"}
              onValueChange={(value) =>
                onChangeElement(
                  { textStyle: { ...element.textStyle, align: value as "left" | "center" | "right" } },
                  true,
                )
              }
            >
              <SelectTrigger id="element-align">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="element-rotation">Rotacao (graus)</Label>
            <Input
              id="element-rotation"
              type="number"
              value={Math.round(element.rotation ?? 0)}
              onChange={(event) => onChangeElement({ rotation: Number(event.target.value) }, false)}
              onBlur={() => onChangeElement({}, true)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-2">
            <Label htmlFor="element-opacity">Opacidade</Label>
            <div className="flex items-center gap-2">
              <Input
                id="element-opacity"
                type="number"
                min={0}
                max={100}
                step={5}
                className="w-20"
                value={Math.round((element.opacity ?? 1) * 100)}
                onChange={(event) =>
                  onChangeElement({ opacity: Number(event.target.value) / 100 }, false)
                }
                onBlur={() => onChangeElement({}, true)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" /> Duplicar
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMoveLayer("up")}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMoveLayer("down")}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMoveLayer("front")}>
              <ChevronsUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMoveLayer("back")}>
              <ChevronsDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir elemento
          </Button>
        </>
      ) : null}

      {product ? (
        <>
          <div>
            <h3 className="font-display text-base font-semibold">Produto</h3>
            <p className="truncate text-xs text-muted-foreground">{product.name ?? "Produto"}</p>
          </div>
          <label className="block text-sm">Nome do produto<Input value={product.name ?? ""} maxLength={160} onChange={e => onChangeProduct({ name: e.target.value }, false)} onBlur={() => onChangeProduct({}, true)} /></label>
          <label className="block text-sm">Preço<Input type="number" min={0} step="0.01" value={product.price ?? 0} onChange={e => onChangeProduct({ price: Math.max(0, Number(e.target.value)) }, false)} onBlur={() => onChangeProduct({}, true)} /></label>
          <label className="block text-sm">Preço promocional<Input type="number" min={0} step="0.01" value={product.salePrice ?? ""} onChange={e => onChangeProduct({ salePrice: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) }, false)} onBlur={() => onChangeProduct({}, true)} /></label>
          <label className="block text-sm">Unidade<Input value={product.unit ?? ""} maxLength={40} onChange={e => onChangeProduct({ unit: e.target.value }, false)} onBlur={() => onChangeProduct({}, true)} /></label>
          {(["tagColor", "textColor", "backgroundColor"] as const).map((key, i) => <label key={key} className="block text-sm">{["Cor da tag", "Texto da tag", "Fundo do produto"][i]}<Input type="color" value={product[key] ?? ["#e11d48", "#ffffff", "#ffffff"][i]} onChange={e => onChangeProduct({ [key]: e.target.value }, false)} onBlur={() => onChangeProduct({}, true)} /></label>)}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">Forma<select className="mt-1 w-full rounded-md border bg-background p-2" value={product.tagShape ?? "pill"} onChange={event => onChangeProduct({ tagShape: event.target.value as EditorProduct["tagShape"] }, true)}><option value="circle">Círculo</option><option value="pill">Pílula</option><option value="ticket">Ingresso</option><option value="burst">Explosão</option><option value="square">Quadrada</option></select></label>
            <label className="text-sm">Estilo<select className="mt-1 w-full rounded-md border bg-background p-2" value={product.tagStyle ?? "solid"} onChange={event => onChangeProduct({ tagStyle: event.target.value as EditorProduct["tagStyle"] }, true)}><option value="solid">Sólida</option><option value="outline">Contorno</option><option value="gradient">Gradiente</option><option value="shadow">Sombra</option></select></label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="product-x">X</Label>
              <Input
                id="product-x"
                type="number"
                value={Math.round(product.x)}
                onChange={(event) => onChangeProduct({ x: Number(event.target.value) }, false)}
                onBlur={() => onChangeProduct({}, true)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-y">Y</Label>
              <Input
                id="product-y"
                type="number"
                value={Math.round(product.y)}
                onChange={(event) => onChangeProduct({ y: Number(event.target.value) }, false)}
                onBlur={() => onChangeProduct({}, true)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-width">Largura</Label>
              <Input
                id="product-width"
                type="number"
                value={Math.round(product.width)}
                onChange={(event) => onChangeProduct({ width: Number(event.target.value) }, false)}
                onBlur={() => onChangeProduct({}, true)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-height">Altura</Label>
              <Input
                id="product-height"
                type="number"
                value={Math.round(product.height)}
                onChange={(event) => onChangeProduct({ height: Number(event.target.value) }, false)}
                onBlur={() => onChangeProduct({}, true)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="product-highlight">Destaque (tag offer)</Label>
            <Switch
              id="product-highlight"
              checked={product.isHighlighted}
              onCheckedChange={(checked) => onChangeProduct({ isHighlighted: checked }, true)}
            />
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" /> Duplicar produto
          </Button>

          <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Remover do encarte
          </Button>
        </>
      ) : null}
    </div>
  );
}
