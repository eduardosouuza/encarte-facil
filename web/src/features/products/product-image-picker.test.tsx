import { expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { api, apiRequest } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductImagePicker } from "./product-image-picker";

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn(), api: { post: vi.fn() } }));

it("busca alternativas ao abrir e salva a foto escolhida", async () => {
  const product = { _key: "p1", name: "Arroz 1kg", price: 5 } as Product;
  const saved = { ...product, image: "/api/assets/new/file" };
  vi.mocked(apiRequest).mockResolvedValue({ images: [{ id: "photo", title: "Arroz embalagem azul", imageUrl: "https://example.com/blue.png", source: "Catálogo" }] });
  vi.mocked(api.post).mockResolvedValue({ product: saved });
  const onSaved = vi.fn(), onClose = vi.fn();
  renderWithProviders(<ProductImagePicker product={product} onSaved={onSaved} onClose={onClose} />);
  const alternative = await screen.findByRole("button", { name: "Usar foto: Arroz embalagem azul" });
  expect(apiRequest).toHaveBeenCalledWith("/products/search-images", expect.objectContaining({ body: { term: "Arroz 1kg" } }));
  await userEvent.click(alternative);
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
  expect(onClose).toHaveBeenCalled();
});
