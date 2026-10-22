import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBillingOverview, usePrices } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export function BillingPage() {
  const overviewQuery = useBillingOverview();
  const pricesQuery = usePrices();
  const prices = pricesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Plano e creditos</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os creditos usados para exportacoes de encartes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Plano</p>
            <p className="font-display text-2xl font-semibold">{overviewQuery.data?.plan ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Creditos</p>
            <p className="font-display text-2xl font-semibold">{overviewQuery.data?.credits ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground">Exportacoes</p>
            <p className="font-display text-2xl font-semibold">{overviewQuery.data?.exports?.total ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prices.map((price) => (
          <Card key={price.id}>
            <CardHeader>
              <CardTitle>{price.credits} creditos</CardTitle>
              <CardDescription>{formatCurrency(price.amount / 100)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {price.credits} exportacoes por {formatCurrency(price.amount / 100)}. O valor e enviado pelo
                servidor em centavos, como no contrato original.
              </p>
              <Button className="w-full" variant="outline">
                <Check className="h-4 w-4" /> Contratar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
