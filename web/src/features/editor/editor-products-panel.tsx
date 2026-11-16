import * as React from "react";
import { Search, History, Heart, Package, MoreVertical, GripVertical, Trash2, Sparkles, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { uploadImage } from "@/features/media/media-library";
import { normalizeSearch } from "./catalog-preview";
import { parsePrice } from "@/features/products/price";
import { toast } from "sonner";
import type { EditorProduct } from "./use-editor-state";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type Props = {
  products: EditorProduct[]; catalog: Product[]; selectedId: string | null;
  text: string; onText: (text: string) => void; busy: boolean; progress: string; onImport: () => void;
  onUpdate: (products: EditorProduct[]) => void; onSelect: (id: string) => void;
  onAdd: (id: string) => void; onPhoto: (product: EditorProduct) => void;
};
const units = [["un", "Unidade (Un)"], ["kg", "Quilograma (kg)"], ["g", "Grama (g)"], ["L", "Litro (L)"], ["ml", "Mililitro (ml)"], ["pct", "Pacote (pct)"], ["cx", "Caixa (cx)"]];
export function EditorProductsPanel(props: Props) {
  const [tab, setTab] = React.useState("search");
  const [search, setSearch] = React.useState("");
  const [favorites, setFavorites] = React.useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("encarte:favorite-products") ?? "[]"); } catch { return []; } });
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const selectedCard = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => { selectedCard.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }); }, [props.selectedId]);
  const dragged = React.useRef<string | null>(null);
  function favorite(key: string) {
    const next = favorites.includes(key) ? favorites.filter(id => id !== key) : [...favorites, key];
    setFavorites(next); localStorage.setItem("encarte:favorite-products", JSON.stringify(next));
  }
  function patch(id: string, changes: Partial<EditorProduct>) { props.onUpdate(props.products.map(product => product.id === id ? { ...product, ...changes } : product)); }
  function move(id: string, target: string) {
    const list = [...props.products], from = list.findIndex(product => product.id === id), to = list.findIndex(product => product.id === target);
    if (from < 0 || to < 0 || from === to) return;
    list.splice(to, 0, list.splice(from, 1)[0]); props.onUpdate(list);
  }
  async function upload(file: File) {
    setUploading(true);
    try {
      const asset = await uploadImage(file);
      props.onUpdate([...props.products, { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ""), image: asset.imageUrl, price: 0, salePrice: null, unit: "un", x: 0, y: 0, width: 240, height: 300, rotation: 0, isHighlighted: false }]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao enviar imagem"); }
    finally { setUploading(false); }
  }
  return <div className="-mx-2 space-y-4" data-testid="editor-products-panel">
    <div role="tablist" aria-label="Biblioteca de produtos" className="-mt-4 grid grid-cols-3 border-b">
      {[["search", "Buscar", Search], ["history", "Histórico", History], ["favorites", "Favoritos", Heart]].map(([key, label, Icon]) => {
        const TabIcon = Icon as typeof Search;
        return <button key={String(key)} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(String(key))} className={`flex items-center justify-center gap-2 border-b-2 py-3 text-xs font-medium ${tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:bg-muted"}`}><TabIcon className="h-3.5 w-3.5" />{String(label)}</button>;
      })}
    </div>
    {tab === "search" ? <>
      <div className="overflow-hidden rounded-xl border-2 bg-card focus-within:border-primary/50">
        <Textarea aria-label="Lista de produtos" value={props.text} onChange={event => props.onText(event.target.value)} placeholder={"Cole sua lista de produtos aqui...\n\nExemplo:\nPão francês 9,90 kg\nPão de queijo 21,90 kg"} className="h-32 min-h-32 resize-none rounded-xl border-0 bg-transparent px-4 py-4 text-[13px] leading-5 shadow-none focus-visible:ring-0" onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); props.onImport(); } if (event.key === "Escape") props.onText(""); }} />
        <div className="flex items-center justify-between gap-1 border-t bg-muted/30 px-3 py-2">
          <button type="button" disabled={props.busy || !props.text.trim()} onClick={props.onImport} className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground hover:text-primary disabled:opacity-60" aria-label="Buscar fotos da lista">{props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{props.busy ? props.progress || "Buscando..." : "Digite ou cole produtos"}</button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={uploading} onClick={() => fileRef.current?.click()} title="Adicionar produto com uma foto">{uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}Imagem</Button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Imagem do produto" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
        </div>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">Ctrl+Enter para buscar · Esc para limpar</p>
    </> : <div className="space-y-2">
      <Input aria-label="Buscar produtos" placeholder="Buscar produtos..." value={search} onChange={event => setSearch(event.target.value)} />
      {props.catalog.filter(product => (tab !== "favorites" || favorites.includes(product._key)) && normalizeSearch(product.name).includes(normalizeSearch(search))).map(product => <div key={product._key} className="flex items-center gap-2 rounded-xl border p-2">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => props.onAdd(product._key)}>{product.image ? <img src={product.image} alt="" className="h-12 w-12 rounded-lg object-contain" /> : <Package className="h-10 w-10 text-muted-foreground" />}<span className="min-w-0"><span className="block truncate text-xs font-semibold">{product.name}</span><span className="text-xs text-primary">{formatCurrency(product.salePrice ?? product.price)} · Adicionar</span></span></button>
        <Button size="icon" variant="ghost" aria-label={`Favoritar ${product.name}`} aria-pressed={favorites.includes(product._key)} onClick={() => favorite(product._key)}><Heart className={`h-4 w-4 ${favorites.includes(product._key) ? "fill-primary text-primary" : ""}`} /></Button>
      </div>)}
      {!props.catalog.some(product => (tab !== "favorites" || favorites.includes(product._key)) && normalizeSearch(product.name).includes(normalizeSearch(search))) && <p className="py-4 text-center text-xs text-muted-foreground">{tab === "favorites" ? "Favorite produtos no menu de cada cartão." : "Os produtos cadastrados aparecem aqui."}</p>}
    </div>}
    <div className="flex items-center gap-2 pt-1 text-xs"><Package className="h-4 w-4" /><h3 className="font-semibold">Produtos no encarte</h3><span className="ml-auto rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">{props.products.length}</span><button type="button" disabled={!props.products.length} onClick={() => props.onUpdate([])} className="ml-2 flex items-center gap-1 text-muted-foreground hover:text-destructive disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Limpar</button></div>
    <div className="space-y-2">{props.products.map((product, index) => <div key={product.id} ref={props.selectedId === product.id ? selectedCard : undefined} aria-current={props.selectedId === product.id ? "true" : undefined} data-testid={`product-card-${product.id}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (dragged.current) move(dragged.current, product.id); dragged.current = null; }} className={`flex min-h-[104px] items-center gap-2 rounded-xl border bg-card px-2 py-3 ${props.selectedId === product.id ? "border-primary ring-1 ring-primary/20" : "hover:border-primary/40"}`}>
      <button type="button" draggable onDragStart={() => { dragged.current = product.id; }} onDragEnd={() => { dragged.current = null; }} onKeyDown={event => { const target = props.products[index + (event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0)]; if (target && target.id !== product.id) { event.preventDefault(); move(product.id, target.id); } }} aria-label={`Reordenar ${product.name}`} title="Arraste ou use as setas para reordenar" className="cursor-grab text-muted-foreground"><GripVertical className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={() => props.onSelect(product.id)} aria-label={`Selecionar ${product.name}`} className="h-12 w-12 shrink-0 rounded-lg bg-muted/60">{product.image ? <img src={product.image} alt="" className="h-full w-full rounded-lg object-contain" /> : <Package className="m-auto h-7 w-7 text-muted-foreground" />}</button>
      <div className="min-w-0 flex-1 space-y-2">
        <button type="button" className="block w-full truncate text-left text-[13px] font-semibold" onClick={() => props.onSelect(product.id)}>{product.name}</button>
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <span className="text-primary">R$</span><input key={`${product.id}-${product.salePrice ?? product.price}`} aria-label={`Preço de ${product.name}`} defaultValue={(product.salePrice ?? product.price ?? 0).toFixed(2).replace(".", ",")} className="w-12 rounded bg-transparent font-semibold text-primary focus:bg-muted" inputMode="decimal" onBlur={event => { const price = parsePrice(event.target.value); if (price === null) { event.target.value = (product.salePrice ?? product.price ?? 0).toFixed(2); toast.error("Informe um preço válido"); } else patch(product.id, product.salePrice != null ? { salePrice: price } : { price }); }} />
          <span className="text-muted-foreground">·</span><select aria-label={`Tipo de preço de ${product.name}`} className="min-w-0 max-w-[112px] bg-card text-muted-foreground" value={product.salePrice != null ? "sale" : "single"} onChange={event => patch(product.id, { salePrice: event.target.value === "sale" ? product.price ?? 0 : null })}><option value="single">Preço único</option><option value="sale">Promocional</option></select>
        </div>
        <select aria-label={`Unidade de ${product.name}`} className="max-w-full bg-card text-[11px] text-muted-foreground" value={product.unit ?? "un"} onChange={event => patch(product.id, { unit: event.target.value })}>{product.unit && !units.some(([value]) => value === product.unit) && <option>{product.unit}</option>}{units.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
      {props.selectedId === product.id && <Button variant="outline" size="sm" onClick={() => props.onPhoto(product)}>Trocar imagem</Button>}
      <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="self-start rounded p-1 text-muted-foreground hover:bg-muted" aria-label={`Ações de ${product.name}`}><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => props.onSelect(product.id)}>Editar no encarte</DropdownMenuItem>
        {product.productId && <DropdownMenuItem onSelect={() => favorite(product.productId!)}>{favorites.includes(product.productId) ? "Remover dos favoritos" : "Adicionar aos favoritos"}</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => props.onPhoto(product)}>Trocar imagem</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => props.onUpdate(props.products.filter(item => item.id !== product.id))} className="text-destructive">Remover produto</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
    </div>)}{!props.products.length && <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">Cole uma lista acima para adicionar seus produtos.</p>}</div>
  </div>;
}
