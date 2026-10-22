import { useNavigate } from "react-router-dom";
import { Loader2, Palette } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateFlyer, useDesigns } from "@/lib/queries";
import { api } from "@/lib/api";
import { useFlyers, useDuplicateFlyer, useUpdateFlyer, useDeleteFlyer } from "@/lib/queries";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function DesignsPage() {
  const navigate = useNavigate();
  const designsQuery = useDesigns();
  const createFlyer = useCreateFlyer();
  const templates = useFlyers({ template: "true", limit: 200 });
  const duplicate = useDuplicateFlyer(), update = useUpdateFlyer(), remove = useDeleteFlyer();
  const [term, setTerm] = useState("");
  const [theme, setTheme] = useState("");

  async function applyDesign(designId: string, title: string) {
    try {
      const data = await api.get<{ success: boolean; design: { elements: unknown[]; backgroundColor?: string; palette?: string[] } }>(
        `/designs/${designId}`,
      );
      const flyer = await createFlyer.mutateAsync({
        name: `${title} (copia)`,
        design: designId,
        format: "vertical",
        backgroundColor: data.design.backgroundColor ?? "#ffffff",
        palette: data.design.palette ?? [],
        elements: data.design.elements as never,
      });
      toast.success("Encarte criado a partir do modelo");
      navigate(`/editor/${flyer._key}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao aplicar o modelo");
    }
  }

  const designs = (designsQuery.data ?? []).filter(d => d.title.toLowerCase().includes(term.toLowerCase()) && (!theme || d.theme === theme));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Modelos</h2>
        <p className="text-sm text-muted-foreground">
          Modelos prontos que podem ser usados como base para um novo encarte.
        </p>
      </div>
      <div className="flex gap-3"><Input aria-label="Buscar modelos" placeholder="Buscar modelos..." value={term} onChange={e => setTerm(e.target.value)} />
        <select aria-label="Tema dos modelos" className="rounded border p-2" value={theme} onChange={e => setTheme(e.target.value)}><option value="">Todos os temas</option>{[...new Set(designsQuery.data?.map(d => d.theme))].map(t => <option key={t}>{t}</option>)}</select></div>
      {!!templates.data?.flyers.length && <section className="space-y-3"><h3 className="font-semibold">Meus modelos</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{templates.data.flyers.filter(t => t.name.toLowerCase().includes(term.toLowerCase())).map(t => <Card key={t._key}><CardContent className="space-y-3 p-4">
        <img src={t.preview} alt={t.name} className="h-36 w-full object-contain" /><p>{t.name}</p>
        <Button onClick={() => void duplicate.mutateAsync(t._key).then(copy => update.mutateAsync({ id: copy._key, payload: { template: false, public: false } })).then(copy => navigate(`/editor/${copy._key}`)).catch(e => toast.error(String(e)))}>Usar meu modelo</Button>
        <Button variant="ghost" onClick={() => void remove.mutateAsync(t._key).catch(e => toast.error(String(e)))}>Excluir modelo</Button>
      </CardContent></Card>)}</div></section>}

      {designsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : designs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Palette className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhum modelo disponivel</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => (
            <Card key={design._key}>
              <CardContent className="space-y-3 p-4">
                <div className="flex h-40 items-center justify-center overflow-hidden rounded-md" style={{ backgroundColor: design.backgroundColor ?? "#f1f5f9" }}>
                  {design.thumbnail ? (
                    <img src={design.thumbnail} alt={design.title} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="flex h-full w-full flex-col justify-between p-4" style={{ color: design.palette?.[2] ?? "#0f172a" }}><div className="rounded-md p-3 text-center font-bold" style={{ backgroundColor: design.palette?.[1] ?? "#29d19c" }}>{design.title.toUpperCase()}</div><div className="grid grid-cols-3 gap-2">{[1,2,3].map(item => <span key={item} className="aspect-[.8] rounded-md bg-white/90 shadow-sm" />)}</div></div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{design.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {design.category} · {design.theme}
                  </p>
                </div>
                {design.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{design.description}</p>
                ) : null}
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={createFlyer.isPending}
                  onClick={() => void applyDesign(design._key, design.title)}
                >
                  Usar modelo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
