import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gridSlots, type ProductGridMode } from "./product-grid";

interface GridPickerProps {
  capacity: number;
  count: number;
  columns: number;
  mode: ProductGridMode;
  onCapacity: (value: number) => void;
  onLayout: (columns: number, mode: ProductGridMode) => void;
}

export function GridPicker({ capacity, count, columns, mode, onCapacity, onLayout }: GridPickerProps) {
  const maximum = Math.max(16, capacity);
  const square = Math.max(1, Math.ceil(Math.sqrt(capacity)));
  const regular = [...new Set([square, Math.min(2, capacity), Math.min(3, capacity)])];
  const featuredColumns = Math.max(2, square);
  const options: { columns: number; mode: ProductGridMode }[] = [
    ...["featured", "featured-center", "featured-right"].map(mode => ({ columns: featuredColumns, mode: mode as ProductGridMode })),
    ...["wide-left", "wide-right", "featured"].map(mode => ({ columns: Math.max(2, square - 1), mode: mode as ProductGridMode })),
  ];
  function preview(optionColumns: number, optionMode: ProductGridMode) {
    const slots = gridSlots(capacity, optionColumns, optionMode);
    const rows = Math.max(...slots.map(slot => slot.row + slot.rows));
    const selected = columns === optionColumns && mode === optionMode;
    const label = `${optionColumns} × ${rows}`;
    return <button key={`${optionColumns}-${optionMode}`} type="button"
      aria-label={`Grade ${label}${optionMode === "balanced" ? " regular" : ` destaque ${optionMode}`}`}
      aria-pressed={selected} onClick={() => onLayout(optionColumns, optionMode)}
      className={`relative flex min-w-0 flex-col items-center gap-2 rounded-xl p-2 transition hover:bg-muted ${selected ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
      <svg viewBox="0 0 76 96" className={`h-24 w-[76px] max-w-full rounded-xl border-2 p-1 ${selected ? "border-primary" : "border-border"}`} aria-hidden="true">
        {slots.map((slot, index) => <rect key={index}
          x={slot.column * 76 / optionColumns + 1} y={slot.row * 96 / rows + 1}
          width={slot.columns * 76 / optionColumns - 2} height={slot.rows * 96 / rows - 2} rx="2"
          fill={selected ? "hsl(var(--primary))" : optionMode !== "balanced" && index === 0 ? "#b88b16" : "currentColor"}
          opacity={selected || (optionMode !== "balanced" && index === 0) ? 1 : .45} />)}
      </svg>
      {selected && <span className="absolute right-1 top-0 rounded-full border-2 border-background bg-primary p-0.5 text-primary-foreground"><Check className="h-4 w-4" /></span>}
      <span className="text-xs font-bold">{label}{optionMode !== "balanced" ? " ★" : ""}</span>
    </button>;
  }
  return <div className="space-y-5 rounded-xl border bg-background p-4" data-testid="grid-picker">
    <div>
      <h3 className="font-semibold">Produtos por Página</h3>
      <p className="text-xs text-muted-foreground">Defina a quantidade máxima em cada página</p>
      <div className="my-3 flex items-center justify-between">
        <Button size="icon" variant="outline" aria-label="Diminuir produtos por página" disabled={capacity <= 1} onClick={() => onCapacity(capacity - 1)}><Minus className="h-4 w-4" /></Button>
        <input aria-label="Produtos por folha" type="number" min={1} max={maximum} value={capacity}
          onChange={event => onCapacity(Math.max(1, Math.min(maximum, Math.floor(Number(event.target.value)) || 1)))}
          className="w-20 bg-transparent text-center text-3xl font-bold text-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
        <Button size="icon" variant="outline" aria-label="Aumentar produtos por página" disabled={capacity >= maximum} onClick={() => onCapacity(capacity + 1)}><Plus className="h-4 w-4" /></Button>
      </div>
      <input aria-label="Quantidade máxima por página" className="h-2 w-full cursor-pointer accent-primary" type="range" min={1} max={maximum} value={capacity} onChange={event => onCapacity(Number(event.target.value))} />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>1</span><span>{maximum}</span></div>
    </div>
    <div className="border-t pt-4">
      <h3 className="font-semibold">Layout da Grade</h3>
      <p className="text-xs text-muted-foreground">{count} produtos nesta página</p>
      <div className={`mt-3 rounded-xl border p-2 ${mode === "balanced" ? "border-primary" : "border-transparent"}`}>
        <p className="mb-2 text-[11px] font-semibold text-muted-foreground">REGULAR</p>
        <div className="grid grid-cols-3 gap-1">{regular.map(value => preview(value, "balanced"))}</div>
      </div>
      {capacity > 1 && <div className={`mt-3 rounded-xl border p-2 ${mode !== "balanced" ? "border-primary" : "border-transparent"}`}>
        <p className="mb-2 text-[11px] font-semibold text-muted-foreground">COM DESTAQUE</p>
        <div className="grid grid-cols-3 gap-2">{options.filter((option, index) => options.findIndex(other => other.columns === option.columns && other.mode === option.mode) === index).map(option => preview(option.columns, option.mode))}</div>
      </div>}
      <p className="mt-3 text-xs text-muted-foreground">As próximas folhas repetem esta grade. A última mantém os espaços dos produtos restantes.</p>
    </div>
  </div>;
}
