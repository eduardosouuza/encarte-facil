import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useEditorState, type EditorSnapshot } from "@/features/editor/use-editor-state";

const INITIAL: EditorSnapshot = {
  elements: [],
  products: [],
  backgroundColor: "#ffffff",
  footer: { visible: true, elements: [] },
};

describe("useEditorState", () => {
  it("desfaz o gesto inteiro depois de várias atualizações intermediárias", () => {
    const { result } = renderHook(() => useEditorState(INITIAL));
    act(() => result.current.update({ backgroundColor: "#111111" }, { commit: false }));
    act(() => result.current.update({ backgroundColor: "#222222" }, { commit: false }));
    act(() => result.current.update({}, { commit: true }));
    act(() => result.current.undo());
    expect(result.current.backgroundColor).toBe("#ffffff");
    act(() => result.current.redo());
    expect(result.current.backgroundColor).toBe("#222222");
  });
  it("adiciona elementos com id e zIndex crescentes", () => {
    const { result } = renderHook(() => useEditorState(INITIAL));

    act(() => {
      result.current.addElement({
        category: "text",
        type: "text",
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        rotation: 0,
        opacity: 1,
        text: "Ola",
      });
    });

    expect(result.current.elements).toHaveLength(1);
    expect(result.current.elements[0].zIndex).toBe(1);
    expect(result.current.selectedKind).toBe("element");
  });

  it("move a selecao ao adicionar um produto", () => {
    const { result } = renderHook(() => useEditorState(INITIAL));

    act(() => {
      result.current.addProduct({ name: "Cafe", price: 10, width: 100, height: 60, rotation: 0, isHighlighted: false });
    });

    expect(result.current.products).toHaveLength(1);
    expect(result.current.selectedKind).toBe("product");
  });

  it("remove o item selecionado", () => {
    const { result } = renderHook(() => useEditorState(INITIAL));

    act(() => {
      result.current.addElement({
        category: "shape",
        type: "shape",
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 1,
      });
    });
    act(() => {
      result.current.removeSelected();
    });

    expect(result.current.elements).toHaveLength(0);
    expect(result.current.selectedId).toBeNull();
  });

  it("desfaz e refaz alteracoes", () => {
    const { result } = renderHook(() => useEditorState(INITIAL));

    act(() => {
      result.current.addElement({
        category: "shape",
        type: "shape",
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 1,
      });
    });
    expect(result.current.elements).toHaveLength(1);

    act(() => {
      result.current.undo();
    });
    expect(result.current.elements).toHaveLength(0);

    act(() => {
      result.current.redo();
    });
    expect(result.current.elements).toHaveLength(1);
  });

  it("atualiza o fundo do encarte", () => {
    const { result } = renderHook(() => useEditorState(INITIAL));

    act(() => {
      result.current.update({ backgroundColor: "#123456" });
    });

    expect(result.current.backgroundColor).toBe("#123456");
  });
});
