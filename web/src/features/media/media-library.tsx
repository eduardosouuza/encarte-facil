import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Asset { _key: string; name: string; imageUrl: string; width: number; height: number; processed: boolean; }
export async function uploadImage(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Use PNG, JPEG ou WebP.");
  if (file.size > 5_000_000) throw new Error("O limite por imagem é 5 MB.");
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
  return (await api.post<{ asset: Asset }>("/assets/upload", { image, name: file.name })).asset;
}
export function MediaLibrary({ onSelect }: { onSelect?: (asset: Asset) => void }) {
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["assets", term], queryFn: () => api.get<{ assets: Asset[]; total: number }>("/assets", { term, limit: 200 }) });
  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    try { await task(); await client.invalidateQueries({ queryKey: ["assets"] }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao atualizar imagens"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Importe fotos e logos em PNG, JPEG ou WebP. Até 5 MB por imagem.</p>
    <Input aria-label="Buscar imagens" placeholder="Buscar imagens..." value={term} onChange={e => setTerm(e.target.value)} />
    <Input aria-label="Enviar imagens" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={e => {
      const files = Array.from(e.target.files ?? []); e.target.value = "";
      void run(async () => { for (const file of files) await uploadImage(file); toast.success("Imagens importadas"); });
    }} />
    {busy && <p role="status">Processando imagens...</p>}
    {query.isError && <p role="alert">Não foi possível carregar a biblioteca.</p>}
    {query.isLoading && <p>Carregando...</p>}
    <div className="grid grid-cols-2 gap-3">
      {query.data?.assets.map(asset => <div key={asset._key} className="rounded-lg border bg-white p-2">
        <button type="button" disabled={!onSelect} className="w-full" onClick={() => onSelect?.(asset)} aria-label={`Inserir ${asset.name}`}>
          <img src={asset.imageUrl} alt={asset.name} className="h-28 w-full object-contain" />
          <span className="block truncate text-sm">{asset.name}</span>
        </button>
        <div className="mt-2 flex flex-wrap gap-1">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => {
            await api.post("/assets/remove-background", { imageUrl: asset.imageUrl }); toast.success("Cópia sem fundo criada");
          })}>Remover fundo</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => {
            const name = window.prompt("Nome da imagem", asset.name);
            if (name?.trim()) void run(() => api.put(`/assets/${asset._key}`, { name }));
          }}>Renomear</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => {
            if (window.confirm("Excluir esta imagem? Encartes que a utilizam precisarão de uma substituição.")) void run(() => api.delete(`/assets/${asset._key}`));
          }}>Excluir</Button>
        </div>
      </div>)}
    </div>
    {query.data?.total === 0 && <p className="text-sm text-muted-foreground">Nenhuma imagem encontrada.</p>}
    <p className="text-xs text-muted-foreground">A remoção de fundo funciona melhor em fotos com fundo uniforme.</p>
  </div>;
}

export function MediaPage() {
  return <div className="mx-auto max-w-4xl space-y-6"><h1 className="text-2xl font-semibold">Biblioteca de imagens</h1><MediaLibrary /></div>;
}
