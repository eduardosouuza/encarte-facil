import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, apiRequest } from "@/lib/api";
import type { Product } from "@/lib/types";

interface Candidate { id: string; title: string; imageUrl: string; thumbnailUrl?: string; source: string }

export function ProductImagePicker({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved?: (product: Product) => void }) {
  const queryClient = useQueryClient();
  const [term, setTerm] = React.useState(product.name);
  const [images, setImages] = React.useState<Candidate[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [searched, setSearched] = React.useState(false);
  const controller = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => controller.current?.abort(), []);

  async function search() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true); setError(""); setImages([]); setSearched(true);
    try {
      const response = await apiRequest<{ images: Candidate[] }>("/products/search-images", { method: "POST", body: { term: term.trim() }, signal: current.signal });
      if (!current.signal.aborted) setImages(response.images);
    } catch (failure) {
      if (!current.signal.aborted) setError(failure instanceof Error ? failure.message : "Falha ao buscar fotos");
    } finally { if (!current.signal.aborted) setBusy(false); }
  }

  async function select(image: Candidate) {
    setSaving(image.imageUrl); setError("");
    try {
      const result = await api.post<{ product: Product }>("/products/search-images/persist", { productId: product._key, imageUrl: image.imageUrl });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      onSaved?.(result.product);
      toast.success("Foto salva na biblioteca");
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Falha ao salvar foto"); }
    finally { setSaving(null); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>Escolher foto do produto</DialogTitle><DialogDescription>Busque pelo nome e pela marca e escolha a embalagem correta.</DialogDescription></DialogHeader>
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void search(); }}>
        <Input aria-label="Nome ou marca para buscar foto" value={term} onChange={event => setTerm(event.target.value)} maxLength={120} />
        <Button type="submit" disabled={busy || saving !== null || term.trim().length < 2}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Buscar imagens</Button>
      </form>
      {busy && <p role="status">Buscando fotos no catálogo...</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {searched && !busy && !error && <p role="status" className="text-sm text-muted-foreground">{images.length ? `${images.length} fotos encontradas` : "Nenhuma foto encontrada. Tente outro nome ou marca."}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map(image => <button key={image.imageUrl} type="button" disabled={saving !== null} onClick={() => void select(image)} aria-label={`Usar foto: ${image.title}`} className="rounded-lg border p-3 text-left hover:border-primary disabled:opacity-50">
        <img src={image.thumbnailUrl || image.imageUrl} alt={image.title} loading="lazy" className="h-32 w-full bg-white object-contain" onError={event => { if (event.currentTarget.src !== image.imageUrl) event.currentTarget.src = image.imageUrl; }} />
        <span className="mt-2 block text-sm font-medium">{image.title}</span><span className="text-xs text-muted-foreground">{image.source}</span>
        {saving === image.imageUrl && <Loader2 className="h-4 w-4 animate-spin" />}
      </button>)}</div>
    </DialogContent>
  </Dialog>;
}
