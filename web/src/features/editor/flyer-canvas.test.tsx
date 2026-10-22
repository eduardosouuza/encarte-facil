import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlyerCanvas } from "@/features/editor/flyer-canvas";
import type { EditorElement, EditorProduct } from "@/features/editor/use-editor-state";
import { renderWithProviders } from "@/test/render";

const ELEMENT: EditorElement = {
  id: "el_1",
  category: "text",
  type: "text",
  x: 40,
  y: 60,
  width: 200,
  height: 60,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
  text: "Ofertas da semana",
};

const PRODUCT: EditorProduct = {
  id: "pr_1",
  name: "Cafe torrado",
  price: 18.9,
  salePrice: 12.9,
  x: 40,
  y: 200,
  width: 120,
  height: 90,
  rotation: 0,
  isHighlighted: false,
};

describe("FlyerCanvas", () => {
  it("renderiza elementos e produtos", () => {
    renderWithProviders(
      <FlyerCanvas
        width={1080}
        height={1350}
        zoom={0.5}
        backgroundColor="#ffffff"
        elements={[ELEMENT]}
        products={[PRODUCT]}
        selectedId={null}
        selectedKind={null}
        onSelect={vi.fn()}
        onChangeElement={vi.fn()}
        onChangeProduct={vi.fn()}
      />,
    );

    expect(screen.getByTestId("element-el_1")).toBeInTheDocument();
    expect(screen.getByText("Ofertas da semana")).toBeInTheDocument();
    expect(screen.getByTestId("product-pr_1")).toBeInTheDocument();
    expect(screen.getByText("Cafe torrado")).toBeInTheDocument();
  });

  it("notifica a selecao ao clicar em um elemento", async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <FlyerCanvas
        width={1080}
        height={1350}
        zoom={0.5}
        backgroundColor="#ffffff"
        elements={[ELEMENT]}
        products={[]}
        selectedId={null}
        selectedKind={null}
        onSelect={onSelect}
        onChangeElement={vi.fn()}
        onChangeProduct={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByTestId("element-el_1"));
    expect(onSelect).toHaveBeenCalledWith("el_1", "element");
  });
});
