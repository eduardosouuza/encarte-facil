import * as React from "react";
import { Loader2, Package, Pencil, Plus, Search, Trash2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { uploadImage } from "@/features/media/media-library";
import { api } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";

interface FormState {
  name: string;
  price: string;
  salePrice: string;
  unit: string;
  image: string;
  notes: string;
  category: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  price: "",
  salePrice: "",
  unit: "",
  image: "",
  notes: "",
  category: "",
};

export function ProductsPage() {
  const [term, setTerm] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = React.useState(false);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkText, setBulkText] = React.useState("");
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [findingPhoto, setFindingPhoto] = React.useState<string | null>(null);

  const productsQuery = useProducts(term);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      price: String(product.price),
      salePrice: product.salePrice === null ? "" : String(product.salePrice),
      unit: product.unit ?? "",
      image: product.image ?? "",
      notes: product.notes ?? "",
      category: product.category ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const price = Number(form.price.replace(",", "."));
    if (!form.name.trim()) {
      toast.error("Informe o nome do produto");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      toast.error("Informe um preco valido");
      return;
    }

    const salePriceRaw = form.salePrice.trim();
    const salePrice = salePriceRaw ? Number(salePriceRaw.replace(",", ".")) : null;

    const payload = {
      name: form.name.trim(),
      price,
      salePrice: salePrice === null || Number.isNaN(salePrice) ? null : salePrice,
      unit: form.unit.trim() || null,
      image: form.image.trim() || null,
      notes: form.notes.trim() || null,
      category: form.category.trim() || null,
    };

    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing._key, payload });
        toast.success("Produto atualizado");
      } else {
        await createProduct.mutateAsync(payload);
        toast.success("Produto cadastrado");
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar o produto");
    }
  }

  async function handleDelete(product: Product) {
    try {
      await deleteProduct.mutateAsync(product._key);
      toast.success("Produto excluido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir o produto");
    }
  }

  async function handleRemoveBackground(product: Product) {
    try {
      await api.post(`/products/${product._key}/remove-background`, {});
      await productsQuery.refetch();
      toast.success("Fundo removido; a imagem original foi preservada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover o fundo");
    }
  }

  async function handleFindPhoto(product: Product) {
    setFindingPhoto(product._key);
    try {
      await api.post(`/products/${product._key}/find-image`, {});
      await productsQuery.refetch();
      toast.success("Foto encontrada e salva na biblioteca");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao buscar foto");
    } finally { setFindingPhoto(null); }
  }

  async function handleBulkImport() {
    const lines = bulkText.split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 100);
    if (!lines.length) { toast.error("Cole ao menos um produto por linha"); return; }
    setBulkBusy(true);
    let created = 0, skipped = 0;
    try {
      for (const line of lines) {
        const { parsed } = await api.post<{ parsed: { name: string; price: number | null; unit: string | null } }>("/products/parse-line", { text: line });
        if (parsed.price === null) { skipped++; continue; }
        await createProduct.mutateAsync({ name: parsed.name, price: parsed.price, unit: parsed.unit });
        created++;
      }
      toast.success(`${created} produto(s) importado(s)${skipped ? `; ${skipped} sem preço foram ignorados` : ""}`);
      setBulkText(""); setBulkOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha na importação"); }
    finally { setBulkBusy(false); }
  }

  const products = productsQuery.data?.products ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Produtos</h2>
          <p className="text-sm text-muted-foreground">
            {productsQuery.data?.total ?? 0} produto(s) cadastrado(s).
          </p>
        </div>

        <div className="flex gap-2">
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4" />Importar lista</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Importar produtos em lista</DialogTitle><DialogDescription>Use uma linha por produto, incluindo o preço. Exemplo: Café 500g R$ 24,90.</DialogDescription></DialogHeader>
            <Textarea className="my-4 min-h-48" aria-label="Lista de produtos" value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder={"Café 500g R$ 24,90\nLeite 1L R$ 5,79"} />
            <DialogFooter><Button variant="outline" onClick={() => setBulkOpen(false)}>Cancelar</Button><Button disabled={bulkBusy} onClick={() => void handleBulkImport()}>{bulkBusy ? <Loader2 className="animate-spin" /> : null}Importar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Novo produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
                <DialogDescription>
                  Os produtos cadastrados ficam disponiveis para insericao nos encartes.
                </DialogDescription>
              </DialogHeader>

              <div className="my-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Nome</Label>
                  <Input
                    id="product-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="product-price">Preco (R$)</Label>
                    <Input
                      id="product-price"
                      inputMode="decimal"
                      value={form.price}
                      onChange={(event) => setForm({ ...form, price: event.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-sale-price">Preco promocional</Label>
                    <Input
                      id="product-sale-price"
                      inputMode="decimal"
                      value={form.salePrice}
                      onChange={(event) => setForm({ ...form, salePrice: event.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="product-unit">Unidade</Label>
                    <Input
                      id="product-unit"
                      placeholder="kg, un, cx"
                      value={form.unit}
                      onChange={(event) => setForm({ ...form, unit: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-category">Categoria</Label>
                    <Input
                      id="product-category"
                      value={form.category}
                      onChange={(event) => setForm({ ...form, category: event.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-image">URL da imagem</Label>
                  <Input
                    id="product-image"
                    value={form.image}
                    onChange={(event) => setForm({ ...form, image: event.target.value })}
                    placeholder="https://..."
                  />
                  <Input type="file" aria-label="Enviar foto do produto" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e => {
                    const file = e.target.files?.[0]; e.target.value = "";
                    if (!file) return;
                    setUploading(true);
                    void uploadImage(file).then(asset => setForm(current => ({ ...current, image: asset.imageUrl }))).catch(error => toast.error(String(error))).finally(() => setUploading(false));
                  }} />
                  {form.image && <img src={form.image} alt="Foto do produto" className="h-20 object-contain" />}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-notes">Observacoes</Label>
                  <Input
                    id="product-notes"
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading || createProduct.isPending || updateProduct.isPending}>
                  {createProduct.isPending || updateProduct.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar produto"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Buscar produtos"
            />
          </div>
        </CardContent>
      </Card>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Package className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhum produto cadastrado</p>
          <p className="text-sm text-muted-foreground">Cadastre produtos para usar nos encartes.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Preco</th>
                <th className="px-4 py-3">Promocional</th>
                <th className="px-4 py-3">Unidade</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._key} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        <img src={product.image} alt="" className="h-9 w-9 rounded object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded bg-muted">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        {product.category ? (
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-3">
                    {product.salePrice !== null ? (
                      <span className="font-medium text-emerald-700">
                        {formatCurrency(product.salePrice)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.unit ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {!product.image && <Button variant="outline" size="sm" disabled={findingPhoto !== null} onClick={() => void handleFindPhoto(product)} aria-label={`Buscar foto de ${product.name}`}>
                        {findingPhoto === product._key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Buscar foto
                      </Button>}
                      {product.image?.startsWith("/api/assets/") ? <Button variant="ghost" size="icon" onClick={() => void handleRemoveBackground(product)} aria-label="Remover fundo">
                        <WandSparkles className="h-4 w-4" />
                      </Button> : null}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDelete(product)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
