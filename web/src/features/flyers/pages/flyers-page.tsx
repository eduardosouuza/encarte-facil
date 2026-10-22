import * as React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  FileStack,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateFlyer, useDuplicateFlyer, useDeleteFlyer, useFlyers, useFormats } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  draft: "secondary",
  approved: "success",
  published: "default",
  archived: "outline",
};

export function FlyersPage() {
  const queryClient = useQueryClient();
  const [term, setTerm] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [format, setFormat] = React.useState<string>("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [formatCode, setFormatCode] = React.useState("");

  const formatsQuery = useFormats();
  const flyersQuery = useFlyers({
    term: term || undefined,
    status: status === "all" ? undefined : status,
    format: format === "all" ? undefined : format,
    limit: 50,
  });

  const createFlyer = useCreateFlyer();
  const duplicateFlyer = useDuplicateFlyer();
  const deleteFlyer = useDeleteFlyer();

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do encarte");
      return;
    }
    try {
      const flyer = await createFlyer.mutateAsync({
        name: name.trim(),
        format: formatCode || null,
        design: null,
      });
      toast.success("Encarte criado");
      setDialogOpen(false);
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["flyers"] });
      window.location.assign(`/editor/${flyer._key}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar o encarte");
    }
  }

  async function handleDuplicate(id: string) {
    try {
      await duplicateFlyer.mutateAsync(id);
      toast.success("Encarte duplicado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao duplicar");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFlyer.mutateAsync(id);
      toast.success("Encarte excluido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir");
    }
  }

  async function handlePublicLink(id: string, isPublic: boolean) {
    try {
      await api.put(`/flyers/${id}`, { name: flyersQuery.data?.flyers.find((f) => f._key === id)?.name, public: isPublic });
      toast.success(isPublic ? "Encarte publicado" : "Encarte despublicado");
      void queryClient.invalidateQueries({ queryKey: ["flyers"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao alterar a publicacao");
    }
  }

  const flyers = flyersQuery.data?.flyers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Meus encartes</h2>
          <p className="text-sm text-muted-foreground">
            {flyersQuery.data?.total ?? 0} encarte(s) na sua conta.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Novo encarte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Novo encarte</DialogTitle>
                <DialogDescription>
                  Escolha um formato e o nome. Voce podera customize-lo no editor.
                </DialogDescription>
              </DialogHeader>

              <div className="my-5 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="flyer-name" className="text-sm font-medium">
                    Nome do encarte
                  </label>
                  <Input
                    id="flyer-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ofertas da Semana"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="flyer-format" className="text-sm font-medium">
                    Formato
                  </label>
                  <Select value={formatCode} onValueChange={setFormatCode}>
                    <SelectTrigger id="flyer-format">
                      <SelectValue placeholder="Selecione um formato" />
                    </SelectTrigger>
                    <SelectContent>
                      {(formatsQuery.data ?? []).map((item) => (
                        <SelectItem key={item._key} value={item.code}>
                          {item.title} ({item.width}x{item.height})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createFlyer.isPending}>
                  {createFlyer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Criar encarte
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Buscar encartes"
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Formato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os formatos</SelectItem>
              {(formatsQuery.data ?? []).map((item) => (
                <SelectItem key={item._key} value={item.code}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {flyersQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : flyers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileStack className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhum encarte encontrado</p>
          <p className="text-sm text-muted-foreground">Crie o primeiro encarte para comecar a editar.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {flyers.map((flyer) => (
            <Card key={flyer._key} className="overflow-hidden">
              <Link to={`/editor/${flyer._key}`} className="block">
                <div className="flex h-40 items-center justify-center bg-slate-100 p-3 dark:bg-slate-900">
                  {flyer.preview ? (
                    <img
                      src={flyer.preview}
                      alt={flyer.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <FileStack className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              </Link>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/editor/${flyer._key}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium hover:text-primary">{flyer.name}</p>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Acoes do encarte">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/editor/${flyer._key}`}>Editar</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void handleDuplicate(flyer._key)}>
                        <Copy className="h-4 w-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void handlePublicLink(flyer._key, !flyer.public)}>
                        {flyer.public ? "Despublicar" : "Publicar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => void handleDelete(flyer._key)}
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[flyer.status] ?? "secondary"}>{flyer.status}</Badge>
                  {flyer.template ? <Badge variant="outline">modelo</Badge> : null}
                </div>

                <p className="text-xs text-muted-foreground">
                  Atualizado em {formatDate(flyer.updatedAt)} · {flyer.elements.length} elemento(s) ·{" "}
                  {flyer.products.length} produto(s)
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
