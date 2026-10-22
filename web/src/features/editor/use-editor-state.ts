import * as React from "react";

export interface EditorSnapshot {
  elements: EditorElement[];
  products: EditorProduct[];
  backgroundColor: string;
  footer: { visible: boolean; elements: string[] };
}

export interface EditorElement {
  id: string;
  category: string;
  type: string;
  subtype?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  text?: string;
  backgroundColor?: string;
  image?: string;
  textStyle?: {
    fontFamily?: string;
    fontWeight?: number | string;
    fontSize?: number;
    color?: string;
    align?: "left" | "center" | "right";
    textDecoration?: string;
    fontStyle?: string;
  };
}

export interface EditorProduct {
  id: string;
  productId?: string;
  name?: string;
  image?: string;
  price?: number;
  salePrice?: number | null;
  unit?: string;
  notes?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isHighlighted: boolean;
  tagColor?: string;
  textColor?: string;
  backgroundColor?: string;
  tagShape?: "circle" | "pill" | "ticket" | "burst" | "square";
  tagStyle?: "solid" | "outline" | "gradient" | "shadow";
}

const HISTORY_LIMIT = 50;

export interface EditorState {
  elements: EditorElement[];
  products: EditorProduct[];
  backgroundColor: string;
  footer: { visible: boolean; elements: string[] };
  selectedId: string | null;
  selectedKind: "element" | "product" | null;
  zoom: number;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  select: (id: string | null, kind?: "element" | "product") => void;
  setZoom: (zoom: number) => void;
  update: (patch: Partial<EditorSnapshot>, options?: { commit?: boolean }) => void;
  addElement: (element: Omit<EditorElement, "id" | "zIndex">) => void;
  addProduct: (product: Omit<EditorProduct, "id" | "x" | "y"> & { x?: number; y?: number }) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  moveLayer: (direction: "up" | "down" | "front" | "back") => void;
  undo: () => void;
  redo: () => void;
  reset: (snapshot: EditorSnapshot) => void;
  markSaved: () => void;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function useEditorState(initial: EditorSnapshot): EditorState {
  const [snapshot, setSnapshot] = React.useState<EditorSnapshot>(() => clone(initial));
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedKind, setSelectedKind] = React.useState<"element" | "product" | null>(null);
  const [zoom, setZoom] = React.useState(0.5);
  const [dirty, setDirty] = React.useState(false);

  const past = React.useRef<EditorSnapshot[]>([]);
  const future = React.useRef<EditorSnapshot[]>([]);
  const gestureStart = React.useRef<EditorSnapshot | null>(null);
  const [, forceRender] = React.useReducer((value: number) => value + 1, 0);

  const commit = React.useCallback((next: EditorSnapshot, record = true) => {
    if (record) {
      past.current = [...past.current.slice(-(HISTORY_LIMIT - 1)), clone(gestureStart.current ?? snapshot)];
      future.current = [];
    }
    gestureStart.current = null;
    setSnapshot(next);
    setDirty(true);
    forceRender();
  }, [snapshot]);

  const update = React.useCallback(
    (patch: Partial<EditorSnapshot>, options?: { commit?: boolean }) => {
      const next = { ...snapshot, ...patch };
      if (options?.commit === false) {
        gestureStart.current ??= clone(snapshot);
        setSnapshot(next);
        setDirty(true);
      } else {
        commit(next);
      }
    },
    [commit, snapshot],
  );

  const addElement = React.useCallback(
    (element: Omit<EditorElement, "id" | "zIndex">) => {
      const zIndex = snapshot.elements.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1;
      const id = `el_${Math.random().toString(36).slice(2, 9)}`;
      commit({ ...snapshot, elements: [...snapshot.elements, { ...element, id, zIndex }] });
      setSelectedId(id);
      setSelectedKind("element");
    },
    [commit, snapshot],
  );

  const addProduct = React.useCallback(
    (product: Omit<EditorProduct, "id" | "x" | "y"> & { x?: number; y?: number }) => {
      const id = `pr_${Math.random().toString(36).slice(2, 9)}`;
      const x = product.x ?? 40;
      const y = product.y ?? 40;
      commit({ ...snapshot, products: [...snapshot.products, { ...product, id, x, y }] });
      setSelectedId(id);
      setSelectedKind("product");
    },
    [commit, snapshot],
  );

  const removeSelected = React.useCallback(() => {
    if (!selectedId || !selectedKind) return;
    if (selectedKind === "element") {
      commit({ ...snapshot, elements: snapshot.elements.filter((item) => item.id !== selectedId) });
    } else {
      commit({ ...snapshot, products: snapshot.products.filter((item) => item.id !== selectedId) });
    }
    setSelectedId(null);
    setSelectedKind(null);
  }, [commit, selectedId, selectedKind, snapshot]);

  const duplicateSelected = React.useCallback(() => {
    if (!selectedId || !selectedKind) return;
    if (selectedKind === "element") {
      const source = snapshot.elements.find((item) => item.id === selectedId);
      if (!source) return;
      const id = `el_${Math.random().toString(36).slice(2, 9)}`;
      const zIndex = snapshot.elements.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1;
      commit({
        ...snapshot,
        elements: [...snapshot.elements, { ...clone(source), id, x: source.x + 20, y: source.y + 20, zIndex }],
      });
      setSelectedId(id);
    } else {
      const source = snapshot.products.find((item) => item.id === selectedId);
      if (!source) return;
      const id = `pr_${Math.random().toString(36).slice(2, 9)}`;
      commit({
        ...snapshot,
        products: [...snapshot.products, { ...clone(source), id, x: source.x + 20, y: source.y + 20 }],
      });
      setSelectedId(id);
    }
  }, [commit, selectedId, selectedKind, snapshot]);

  const moveLayer = React.useCallback(
    (direction: "up" | "down" | "front" | "back") => {
      if (!selectedId || selectedKind !== "element") return;
      const elements = snapshot.elements.map((item) => ({ ...item }));
      const index = elements.findIndex((item) => item.id === selectedId);
      if (index < 0) return;
      const target =
        direction === "up"
          ? Math.min(elements.length - 1, index + 1)
          : direction === "down"
            ? Math.max(0, index - 1)
            : direction === "front"
              ? elements.length - 1
              : 0;
      const [moved] = elements.splice(index, 1);
      elements.splice(target, 0, moved);
      commit({
        ...snapshot,
        elements: elements.map((item, position) => ({ ...item, zIndex: position + 1 })),
      });
    },
    [commit, selectedId, selectedKind, snapshot],
  );

  const undo = React.useCallback(() => {
    if (gestureStart.current) {
      future.current = [...future.current, clone(snapshot)];
      setSnapshot(gestureStart.current);
      gestureStart.current = null;
      setDirty(true);
      forceRender();
      return;
    }
    const previous = past.current.pop();
    if (!previous) return;
    future.current = [...future.current, clone(snapshot)];
    setSnapshot(previous);
    setDirty(true);
    forceRender();
  }, [snapshot]);

  const redo = React.useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current = [...past.current, clone(snapshot)];
    setSnapshot(next);
    setDirty(true);
    forceRender();
  }, [snapshot]);

  const reset = React.useCallback((next: EditorSnapshot) => {
    gestureStart.current = null;
    past.current = [];
    future.current = [];
    setSelectedId(null);
    setSelectedKind(null);
    setSnapshot(clone(next));
    setDirty(false);
    forceRender();
  }, []);

  const markSaved = React.useCallback(() => {
    setDirty(false);
  }, []);

  const select = React.useCallback((id: string | null, kind?: "element" | "product") => {
    setSelectedId(id);
    setSelectedKind(id ? (kind ?? null) : null);
  }, []);

  return {
    elements: snapshot.elements,
    products: snapshot.products,
    backgroundColor: snapshot.backgroundColor,
    footer: snapshot.footer,
    selectedId,
    selectedKind,
    zoom,
    dirty,
    canUndo: past.current.length > 0 || gestureStart.current !== null,
    canRedo: future.current.length > 0,
    select,
    setZoom,
    update,
    addElement,
    addProduct,
    removeSelected,
    duplicateSelected,
    moveLayer,
    undo,
    redo,
    reset,
    markSaved,
  };
}
