import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { api } from "./api";
import type { BillingOverview, Design, ExportJob, Flyer, Format, Partner, Product } from "./types";

export interface FlyerListResponse {
  success: boolean;
  flyers: Flyer[];
  total: number;
  limit: number;
  offset: number;
}

export interface FlyerListParams {
  term?: string;
  status?: string;
  format?: string;
  template?: "true" | "false";
  limit?: number;
  offset?: number;
}

export function useFlyers(params: FlyerListParams = {}, options?: Partial<UseQueryOptions<FlyerListResponse>>) {
  return useQuery({
    queryKey: ["flyers", params],
    queryFn: () => api.get<FlyerListResponse>("/flyers", { ...params }),
    ...options,
  });
}

export function useFlyer(id: string | undefined) {
  return useQuery({
    queryKey: ["flyers", "detail", id],
    queryFn: async () => {
      const data = await api.get<{ success: boolean; flyer: Flyer }>(`/flyers/${id}`);
      return data.flyer;
    },
    enabled: Boolean(id),
  });
}

export function useFlyerSummary() {
  return useQuery({
    queryKey: ["flyers", "summary"],
    queryFn: async () => {
      const data = await api.get<{
        success: boolean;
        flyers: { _key: string; name: string; status: string; format: string | null; template: boolean; updatedAt: string }[];
      }>("/flyers/summary");
      return data.flyers;
    },
  });
}

export function useCreateFlyer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Flyer> & { name: string }) => {
      const data = await api.post<{ success: boolean; flyer: Flyer }>("/flyers", payload);
      return data.flyer;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["flyers"] });
    },
  });
}

export function useUpdateFlyer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Flyer> }) => {
      const data = await api.put<{ success: boolean; flyer: Flyer }>(`/flyers/${id}`, payload);
      return data.flyer;
    },
    onSuccess: (flyer) => {
      queryClient.setQueryData(["flyers", "detail", flyer._key], flyer);
      void queryClient.invalidateQueries({ queryKey: ["flyers"] });
    },
  });
}

export function useDeleteFlyer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/flyers/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["flyers"] });
    },
  });
}

export function useDuplicateFlyer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await api.post<{ success: boolean; flyer: Flyer }>(`/flyers/${id}/duplicate`);
      return data.flyer;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["flyers"] });
    },
  });
}

export function useFormats() {
  return useQuery({
    queryKey: ["formats"],
    queryFn: async () => {
      const data = await api.get<{ success: boolean; formats: Format[] }>("/formats");
      return data.formats;
    },
  });
}

export function useDesigns() {
  return useQuery({
    queryKey: ["designs"],
    queryFn: async () => {
      const data = await api.get<{ success: boolean; designs: Design[] }>("/designs");
      return data.designs;
    },
  });
}

export function useDesign(id: string | undefined) {
  return useQuery({
    queryKey: ["designs", id],
    queryFn: async () => {
      const data = await api.get<{ success: boolean; design: Design }>(`/designs/${id}`);
      return data.design;
    },
    enabled: Boolean(id),
  });
}

export interface ProductListResponse {
  success: boolean;
  products: Product[];
  total: number;
  limit: number;
  offset: number;
}

export function useProducts(term = "") {
  return useQuery({
    queryKey: ["products", term],
    queryFn: () => api.get<ProductListResponse>("/products", { term: term || undefined, limit: 100 }),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      price: number;
      salePrice?: number | null;
      image?: string | null;
      unit?: string | null;
      notes?: string | null;
      category?: string | null;
    }) => {
      const data = await api.post<{ success: boolean; product: Product }>("/products", payload);
      return data.product;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const data = await api.put<{ success: boolean; product: Product }>(`/products/${id}`, payload);
      return data.product;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export interface ExportListResponse {
  success: boolean;
  exports: ExportJob[];
  total: number;
}

export function useExports() {
  return useQuery({
    queryKey: ["exports"],
    queryFn: () => api.get<ExportListResponse>("/exports", { limit: 50 }),
  });
}

export function useBillingOverview() {
  return useQuery({
    queryKey: ["billing", "overview"],
    queryFn: async () => {
      const data = await api.get<{ success: boolean; data: BillingOverview }>("/billing/overview");
      return data.data;
    },
  });
}

export function usePrices() {
  return useQuery({
    queryKey: ["billing", "prices"],
    queryFn: async () => {
      const data = await api.get<{
        success: boolean;
        data: { id: string; name: string; credits: number; amount: number; currency: string }[];
      }>("/billing/prices");
      return data.data;
    },
  });
}

export function usePartner() {
  return useQuery({
    queryKey: ["partners", "current"],
    queryFn: async () => {
      const data = await api.get<{ success: boolean; partner: Partner }>("/partners/current");
      return data.partner;
    },
  });
}
