import { Link } from "react-router-dom";
import { ArrowRight, Download, FileStack, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBillingOverview, useExports, useFlyers, useProducts } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";

export function DashboardPage() {
  const flyersQuery = useFlyers({ limit: 6 });
  const productsQuery = useProducts();
  const exportsQuery = useExports();
  const billingQuery = useBillingOverview();

  const stats = [
    { label: "Encartes", value: flyersQuery.data?.total ?? 0, icon: FileStack, to: "/flyers" },
    { label: "Produtos", value: productsQuery.data?.total ?? 0, icon: Package, to: "/products" },
    { label: "Exportacoes", value: exportsQuery.data?.total ?? 0, icon: Download, to: "/exports" },
    { label: "Creditos", value: billingQuery.data?.credits ?? 0, icon: Plus, to: "/billing" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Visao geral</h2>
          <p className="text-sm text-muted-foreground">Acompanhe a producao de encartes da sua conta.</p>
        </div>
        <Button asChild>
          <Link to="/flyers">
            <Plus className="h-4 w-4" /> Novo encarte
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Encartes recentes</CardTitle>
            <CardDescription>Ultimos encartes atualizados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(flyersQuery.data?.flyers ?? []).map((flyer) => (
              <Link
                key={flyer._key}
                to={`/editor/${flyer._key}`}
                className="flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{flyer.name}</span>
                  <span className="block text-xs capitalize text-muted-foreground">{flyer.status}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {formatRelativeTime(flyer.updatedAt)}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
            {(flyersQuery.data?.flyers ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum encarte criado ate agora.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plano atual</CardTitle>
            <CardDescription>Resumo da assinatura.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-medium">{billingQuery.data?.plan ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Creditos</span>
              <span className="font-medium">{billingQuery.data?.credits ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Publicados</span>
              <span className="font-medium">{billingQuery.data?.flyers?.published ?? 0}</span>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/billing">Ver planos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
