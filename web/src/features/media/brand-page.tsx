import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImage } from "./media-library";

export interface BrandKit {
  _key: string; name: string; slogan: string; logo: string; address: string; website: string;
  contact: { landline: string; whatsapp: string }; social: { instagram: string; facebook: string };
  colors: string[]; cards: string[];
}
export function useBrandKit() {
  return useQuery({ queryKey: ["brandkit"], queryFn: async () => (await api.get<{ brandKit: BrandKit }>("/brandkits/me")).brandKit });
}
export function BrandPage({ compact = false }: { compact?: boolean } = {}) {
  const query = useBrandKit(), client = useQueryClient();
  const [brand, setBrand] = useState<BrandKit>();
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (query.data) setBrand(query.data); }, [query.data]);
  if (query.isError) return <p role="alert">Não foi possível carregar a identidade visual.</p>;
  if (!brand) return <p>Carregando...</p>;
  async function save() {
    setBusy(true);
    try { await api.put("/brandkits/me", { brandKit: brand }); await client.invalidateQueries({ queryKey: ["brandkit"] }); toast.success("Identidade visual salva"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao salvar"); }
    finally { setBusy(false); }
  }
  return <form className={compact ? "space-y-4" : "mx-auto max-w-2xl space-y-5"} onSubmit={e => { e.preventDefault(); void save(); }}>
    {!compact && <><h1 className="text-2xl font-semibold">Identidade visual da loja</h1><p className="text-muted-foreground">Use sua logo, cores e contatos nos encartes.</p></>}
    {(["name", "slogan", "address", "website"] as const).map((key, i) => <label className="block space-y-1" key={key}>
      <span>{["Nome da loja", "Slogan", "Endereço", "Site"][i]}</span>
      <Input value={brand[key]} maxLength={key === "address" ? 300 : 160} onChange={e => setBrand({ ...brand, [key]: e.target.value })} />
    </label>)}
    <label className="block">Logo<Input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => {
      const file = e.target.files?.[0]; e.target.value = "";
      if (file) { setBusy(true); void uploadImage(file).then(asset => setBrand(b => b ? { ...b, logo: asset.imageUrl } : b)).catch(err => toast.error(String(err))).finally(() => setBusy(false)); }
    }} /></label>
    {brand.logo && <img src={brand.logo} alt="Logo da loja" className="h-24 object-contain" />}
    <div className="grid grid-cols-2 gap-4">{(["landline", "whatsapp"] as const).map(key => <label key={key}>{key === "whatsapp" ? "WhatsApp" : "Telefone"}<Input value={brand.contact[key]} onChange={e => setBrand({ ...brand, contact: { ...brand.contact, [key]: e.target.value } })} /></label>)}</div>
    <div className="grid grid-cols-2 gap-4">{(["instagram", "facebook"] as const).map(key => <label key={key}>{key}<Input value={brand.social[key]} onChange={e => setBrand({ ...brand, social: { ...brand.social, [key]: e.target.value } })} /></label>)}</div>
    <label className="block">Formas de pagamento (separadas por vírgula)<Input value={brand.cards.join(", ")} onChange={e => setBrand({ ...brand, cards: e.target.value.split(",").map(s => s.trim()) })} /></label>
    <div><p>Cores da marca</p><div className="flex gap-2">{brand.colors.map((color, i) => <Input key={i} type="color" className="h-12 w-16 p-1" aria-label={`Cor ${i + 1}`} value={color} onChange={e => setBrand({ ...brand, colors: brand.colors.map((v, index) => index === i ? e.target.value : v) })} />)}
      <Button type="button" variant="outline" disabled={brand.colors.length >= 12} onClick={() => setBrand({ ...brand, colors: [...brand.colors, "#ffffff"] })}>Adicionar cor</Button></div></div>
    <Button disabled={busy}>{busy ? "Salvando..." : "Salvar identidade visual"}</Button>
  </form>;
}
