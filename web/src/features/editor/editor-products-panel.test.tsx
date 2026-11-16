import { expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { EditorProductsPanel } from "./editor-products-panel";

it("destaca o produto selecionado e permite trocar foto fora do catálogo carregado", async () => {
  const product = { id: "selected", name: "Arroz", x: 0, y: 0, width: 200, height: 260, rotation: 0, isHighlighted: false };
  const onPhoto = vi.fn();
  renderWithProviders(<EditorProductsPanel products={[product]} catalog={[]} selectedId={product.id} text="" onText={vi.fn()} busy={false} progress="" onImport={vi.fn()} onUpdate={vi.fn()} onSelect={vi.fn()} onAdd={vi.fn()} onPhoto={onPhoto} />);
  expect(screen.getByTestId("product-card-selected")).toHaveAttribute("aria-current", "true");
  await userEvent.click(screen.getByRole("button", { name: "Trocar imagem" }));
  expect(onPhoto).toHaveBeenCalledWith(product);
});
