import { Link } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useExports } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function ExportsPage() {
  const exportsQuery = useExports();
  const exports = exportsQuery.data?.exports ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Exportacoes</h2>
        <p className="text-sm text-muted-foreground">
          Arquivos gerados a partir dos seus encartes.
        </p>
      </div>

      {exportsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : exports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Download className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhuma exportacao</p>
          <p className="text-sm text-muted-foreground">
            Exporte um encarte no editor para ver os arquivos aqui.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/flyers">Ir para encartes</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white dark:bg-slate-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Formato</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progresso</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right">Arquivo</th>
              </tr>
            </thead>
            <tbody>
              {exports.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium uppercase">{item.format}</td>
                  <td className="px-4 py-3">
                    <Badge variant={item.status === "completed" ? "success" : "secondary"}>{item.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{item.progress}%</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {item.fileUrl ? (
                      <button
                        onClick={() => void downloadFile(item.fileUrl!, `encarte-${item.id}.${item.format}`).catch(e => toast.error(String(e)))}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Baixar
                      </button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => void api.post(`/exports/${item.id}/retry`).then(() => exportsQuery.refetch()).catch(e => toast.error(String(e)))}>Tentar novamente</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          PNG, JPEG, PDF e SVG ficam salvos no histórico com o conteúdo do encarte no momento da exportação.
        </CardContent>
      </Card>
    </div>
  );
}
