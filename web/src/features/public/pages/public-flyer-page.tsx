import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Flyer } from "@/lib/types";

export function PublicFlyerPage({ id }: { id: string }) {
  const flyerQuery = useQuery({
    queryKey: ["public-flyer", id],
    queryFn: async () => {
      const data = await api.get<{ success: boolean; flyer: Flyer }>(`/p/${id}`);
      return data.flyer;
    },
    retry: false,
  });

  if (flyerQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (flyerQuery.isError || !flyerQuery.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-xl font-semibold">Encarte nao disponivel</p>
        <p className="text-sm text-muted-foreground">O link pode ter expirado ou o encarte nao foi publicado.</p>
      </div>
    );
  }

  const flyer = flyerQuery.data;

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-100 py-8 dark:bg-slate-900">
      <h1 className="mb-4 font-display text-2xl font-semibold">{flyer.name}</h1>
      <img
        src={`/p/${flyer._key}/render.svg`}
        alt={flyer.name}
        className="max-h-[80vh] max-w-full rounded-lg bg-white shadow-xl"
      />
    </div>
  );
}
