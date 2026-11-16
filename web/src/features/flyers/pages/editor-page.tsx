import { EditorProductsPanel } from "../../editor/editor-products-panel";
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Download,
  Image as ImageIcon,
  LayoutTemplate,
  Grid3X3,
  Layers3,
  Loader2,
  Newspaper,
  Package,
  Palette,
  Redo2,
  Save,
  Shapes,
  Square,
  Tags,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDesigns, useFlyer, useFlyerSummary, useFormats, useProducts, useUpdateFlyer } from "@/lib/queries";
import { api } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { MediaLibrary, type Asset } from "@/features/media/media-library";
import { BrandPage, useBrandKit } from "@/features/media/brand-page";
import { Textarea } from "@/components/ui/textarea";
import { CatalogPreview, normalizeSearch } from "../../editor/catalog-preview";
import { useQuery } from "@tanstack/react-query";
import { FlyerCanvas } from "../../editor/flyer-canvas";
import { InspectorPanel } from "../../editor/inspector-panel";
import { useEditorState, type EditorElement, type EditorProduct } from "../../editor/use-editor-state";
import { GridPicker } from "../../editor/grid-picker";
import { layoutProductGrid, type ProductGridMode } from "../../editor/product-grid";
import type { Flyer, Product } from "@/lib/types";
import { ProductImagePicker } from "@/features/products/product-image-picker";

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1350;

type EditorSection = "grid" | "themes" | "products" | "elements" | "tags" | "formats" | "brand" | "flyers" | "fonts" | "text" | "colors" | "proportions" | "dates";

const QUICK_TOOLS = [
  { id: "formats", label: "Formato", icon: LayoutTemplate },
  { id: "fonts", label: "Fontes", icon: Type },
  { id: "text", label: "Texto", icon: Square },
  { id: "colors", label: "Cores", icon: Palette },
  { id: "proportions", label: "Proporções", icon: Maximize2 },
  { id: "dates", label: "Validade", icon: Newspaper },
] as const;

const EDITOR_SECTIONS = [
  { id: "themes", label: "Temas", icon: Palette },
  { id: "products", label: "Produtos", icon: Package },
  { id: "grid", label: "Grade", icon: Grid3X3 },
  { id: "elements", label: "Elementos", icon: Shapes },
  { id: "tags", label: "Tags", icon: Tags },
  { id: "formats", label: "Formatos", icon: LayoutTemplate },
  { id: "brand", label: "Marca", icon: Building2 },
  { id: "flyers", label: "Encartes", icon: Newspaper },
] as const;

const TAG_PRESETS = [
  { name: "Clássica", tagColor: "#e11d48", textColor: "#ffffff", backgroundColor: "#ffffff", tagShape: "pill", tagStyle: "solid" },
  { name: "Oferta amarela", tagColor: "#facc15", textColor: "#111827", backgroundColor: "#ffffff", tagShape: "burst", tagStyle: "solid" },
  { name: "Atacado", tagColor: "#f97316", textColor: "#ffffff", backgroundColor: "#fff7ed", tagShape: "ticket", tagStyle: "shadow" },
  { name: "Fresh", tagColor: "#16a34a", textColor: "#ffffff", backgroundColor: "#f0fdf4", tagShape: "circle", tagStyle: "solid" },
  { name: "Black", tagColor: "#111827", textColor: "#facc15", backgroundColor: "#ffffff", tagShape: "square", tagStyle: "outline" },
  { name: "Azul", tagColor: "#2563eb", textColor: "#ffffff", backgroundColor: "#eff6ff", tagShape: "pill", tagStyle: "gradient" },
] as const;

const TAG_SHAPES = [["circle", "Círculo"], ["pill", "Pílula"], ["ticket", "Ingresso"], ["burst", "Explosão"], ["square", "Quadrada"]] as const;
const TAG_STYLES = [["solid", "Sólida"], ["outline", "Contorno"], ["gradient", "Gradiente"], ["shadow", "Sombra"]] as const;
const TAG_COLORS = [
  ["#ef4444", "#ffffff", "Vermelho"], ["#f97316", "#ffffff", "Laranja"], ["#eab308", "#000000", "Amarelo"], ["#22c55e", "#ffffff", "Verde"],
  ["#3b82f6", "#ffffff", "Azul"], ["#8b5cf6", "#ffffff", "Roxo"], ["#000000", "#ffffff", "Preto"], ["#ffffff", "#000000", "Branco"],
] as const;

const ELEMENT_CATEGORY_LABELS: Record<string, string> = {
  all: "Todos", text: "Textos", stickers: "Adesivos", decorative: "Decorativo", seal: "Selos", "3d": "Selos 3D",
  ribbons: "Fitas", splash: "Splash", tags: "Tags", frames: "Molduras", backgrounds: "Backgrounds",
  photos: "Fotos", icons: "Ícones", shapes: "Formas",
};

const THEME_GROUP_LABELS: Record<string, string> = {
  churrasco: "Churrasco", "pet-shop": "Pet Shop", beleza: "Beleza", verao: "Verão", pascoa: "Páscoa", premium: "Seleção Premium",
  "operacao-promo": "Super Ofertas", primavera: "Primavera", "outubro-rosa": "Outubro Rosa",
  halloween: "Dia das Bruxas", outubro: "Outubro", "segunda-feira": "Segunda-Feira",
  "terca-feira": "Terça-Feira", "hortifruti-fresh": "Hortifruti", "black-friday": "Black Friday",
  natal: "Natal", "fim-de-semana": "Fim de Semana", "atacado-azul": "Atacado",
  "padaria-artesanal": "Padaria", satisfacao: "Serviços",
};

interface CatalogElement {
  _key: string;
  title: string;
  category: string;
  payload: Omit<EditorElement, "id" | "zIndex" | "x" | "y" | "rotation" | "opacity"> & Partial<Pick<EditorElement, "x" | "y" | "rotation" | "opacity">>;
}

const BACKGROUND_CATEGORIES = new Set(["background", "backgrounds"]);
const isBackgroundCategory = (category?: string) => Boolean(category && BACKGROUND_CATEGORIES.has(category));

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const flyerQuery = useFlyer(id);
  const formatsQuery = useFormats();
  const designsQuery = useDesigns();
  const flyerSummaryQuery = useFlyerSummary();
  const productsQuery = useProducts();
  const updateFlyer = useUpdateFlyer();
  const brandQuery = useBrandKit();
  const queryClient = useQueryClient();
  const [formatCode, setFormatCode] = React.useState("");
  const [content, setContent] = React.useState<Flyer["content"]>("flyer");
  const [designCode, setDesignCode] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<EditorSection>("themes");
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [inspectorOpen, setInspectorOpen] = React.useState(true);
  const [fitView, setFitView] = React.useState(true);
  const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 });
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");
  const [columns, setColumns] = React.useState(4);
  const [productsPerPage, setProductsPerPage] = React.useState(16);
  const [activePage, setActivePage] = React.useState(0);
  const [gridMode, setGridMode] = React.useState<ProductGridMode>("balanced");
  const [elementSearch, setElementSearch] = React.useState("");
  const [elementCategory, setElementCategory] = React.useState("all");
  const [elementLibraryTab, setElementLibraryTab] = React.useState<"library" | "mine">("library");
  const [themeSearch, setThemeSearch] = React.useState("");
  const [tagTab, setTagTab] = React.useState<"shapes" | "style" | "colors">("shapes");
  const [bulkProductText, setBulkProductText] = React.useState("");
  const [bulkImporting, setBulkImporting] = React.useState(false);
  const [bulkProgress, setBulkProgress] = React.useState("");
  const [expandedThemeGroups, setExpandedThemeGroups] = React.useState<Set<string>>(() => new Set());
  const [findingImage, setFindingImage] = React.useState<string | null>(null);
  const [photoProduct, setPhotoProduct] = React.useState<Product | null>(null);
  const elementsQuery = useQuery({ queryKey: ["elements", elementCategory], queryFn: ({ signal }) => api.get<{ elements: CatalogElement[] }>("/elements", { limit: 100, category: elementCategory === "all" ? undefined : elementCategory }, signal) });
  const catalogElements = elementsQuery.data?.elements ?? [];
  const [saveError, setSaveError] = React.useState("");
  const savedSignature = React.useRef("");
  const currentSignature = React.useRef("");
  const saveQueue = React.useRef(Promise.resolve());
  const mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const [hydrated, setHydrated] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const editor = useEditorState({
    elements: [],
    products: [],
    backgroundColor: "#ffffff",
    footer: { visible: true, elements: [] },
  });
  const latestEditor = React.useRef(editor);
  latestEditor.current = editor;

  const flyer = flyerQuery.data;

  React.useEffect(() => {
    if (!flyer || hydrated || formatsQuery.isLoading) return;
    setName(flyer.name);
    setFormatCode(flyer.format ?? "");
    setContent(flyer.content ?? "flyer");
    setDesignCode(flyer.design ?? null);
    setColumns(Math.min(8, Math.max(1, Number(flyer.grid?.columns) || 4)));
    setProductsPerPage(Math.min(48, Math.max(1, Math.floor(Number(flyer.grid?.productsPerPage) || 16))));
    setGridMode((["balanced", "featured", "featured-center", "featured-right", "wide-left", "wide-center", "wide-right"].includes(String(flyer.grid?.mode)) ? flyer.grid?.mode : "balanced") as ProductGridMode);
    setStartAt(flyer.startAt?.slice(0, 10) ?? "");
    setEndAt(flyer.endAt?.slice(0, 10) ?? "");
    const savedElements = (flyer.elements ?? []) as unknown as EditorElement[];
    const savedFormat = (formatsQuery.data ?? []).find(item => item.code === (flyer.format ?? "") || item._key === (flyer.format ?? ""));
    const savedWidth = savedFormat?.width ?? DEFAULT_WIDTH;
    const savedHeight = savedFormat?.height ?? DEFAULT_HEIGHT;
    editor.reset({
      elements: savedElements.map(element => isBackgroundCategory(element.category) ? {
        ...element,
        category: "background",
        type: element.type === "shape" ? "shape" : "image",
        x: 0,
        y: 0,
        width: savedWidth,
        height: savedHeight,
        imageFit: element.type === "image" ? "cover" : element.imageFit,
        zIndex: Math.min(element.zIndex ?? -1000, -1000),
      } : element),
      products: (flyer.products ?? []) as unknown as EditorProduct[],
      backgroundColor: flyer.backgroundColor ?? "#ffffff",
      footer: {
        visible: flyer.footer?.visible ?? true,
        elements: flyer.footer?.elements ?? [],
      },
    });
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyer, hydrated, formatsQuery.data]);

  const format = React.useMemo(() => {
    const list = formatsQuery.data ?? [];
    return list.find((item) => item.code === formatCode || item._key === formatCode);
  }, [formatsQuery.data, formatCode]);

  const canvasWidth = format?.width ?? DEFAULT_WIDTH;
  const canvasHeight = format?.height ?? DEFAULT_HEIGHT;
  const changeZoom = React.useCallback((value: number) => {
    setFitView(false);
    latestEditor.current.setZoom(Math.max(.1, Math.min(3, value)));
  }, []);
  React.useEffect(() => {
    if (fitView && viewportSize.width > 48 && viewportSize.height > 48) {
      editor.setZoom(Math.max(.1, Math.min(1, (viewportSize.width - 48) / canvasWidth, (viewportSize.height - 48) / canvasHeight)));
    }
  }, [fitView, viewportSize, canvasWidth, canvasHeight, editor.setZoom]);

  const paginationInitialized = React.useRef(false);
  const productOrder = editor.products.map(product => product.id).join(",");
  React.useEffect(() => {
    if (!hydrated || !formatsQuery.data) return;
    if (!paginationInitialized.current) {
      paginationInitialized.current = true;
      if (Number(flyer?.grid?.productsPerPage) > 0) return;
    }
    const state = latestEditor.current;
    const arranged = layoutProductGrid(state.products, columns, canvasWidth, canvasHeight, content, gridMode, productsPerPage);
    if (JSON.stringify(arranged) !== JSON.stringify(state.products)) state.update({ products: arranged });
  }, [hydrated, Boolean(formatsQuery.data), productOrder, columns, canvasWidth, canvasHeight, content, gridMode, productsPerPage]);
  const pageCount = Math.max(1, Math.ceil(editor.products.length / productsPerPage));
  const visiblePage = Math.min(activePage, pageCount - 1);
  React.useEffect(() => {
    if (editor.selectedKind !== "product") return;
    const index = editor.products.findIndex(product => product.id === editor.selectedId);
    if (index >= 0) setActivePage(Math.floor(index / productsPerPage));
  }, [editor.selectedId, editor.selectedKind, productsPerPage, productOrder]);
  const payload = {
    name: name.trim() || "Encarte sem nome",
    content, design: designCode, format: formatCode || null, startAt: startAt || null, endAt: endAt || null,
    grid: { columns, layout: "product-cards", mode: gridMode, productsPerPage, auto: true },
    backgroundColor: editor.backgroundColor, elements: editor.elements,
    products: editor.products, footer: editor.footer,
  };
  const signature = JSON.stringify(payload);
  currentSignature.current = signature;
  const persist = React.useCallback(async (notify = true) => {
    if (!id || !hydrated) return;
    const captured = signature;
    const save = async () => {
      if (captured === savedSignature.current) return;
      if (mounted.current) { setSaving(true); setSaveError(""); }
      try {
        const p = JSON.parse(captured);
        if (p.startAt && p.endAt && p.endAt < p.startAt) throw new Error("A data final deve ser posterior à inicial.");
        await updateFlyer.mutateAsync({ id, payload: p });
        savedSignature.current = captured;
        if (mounted.current && currentSignature.current === captured) editor.markSaved();
        if (notify && mounted.current) toast.success("Alterações salvas");
      } catch (error) {
        if (mounted.current) setSaveError(error instanceof Error ? error.message : "Falha ao salvar");
        throw error;
      } finally { if (mounted.current) setSaving(false); }
    };
    const pending = saveQueue.current.then(save, save);
    saveQueue.current = pending.catch(() => {});
    return pending;
  }, [id, hydrated, signature, updateFlyer, editor]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!savedSignature.current) { savedSignature.current = signature; return; }
    if (signature === savedSignature.current) return;
    const timer = window.setTimeout(() => { void persist(false).catch(() => {}); }, 1500);
    return () => window.clearTimeout(timer);
    // Only document changes restart the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, hydrated]);

  React.useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (currentSignature.current !== savedSignature.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function handleExport(formatName: "svg" | "png" | "jpeg" | "pdf" | "mp4") {
    if (!id) return;
    setExporting(true);
    try {
      await persist(false);
      const data = await api.post<{ export: { fileUrl: string; files?: string[] } }>(`/flyers/${id}/${formatName === "mp4" ? "render-video" : "render"}`, { format: formatName });
      const files = data.export.files ?? [data.export.fileUrl];
      for (const [index, url] of files.entries()) {
        await downloadFile(url, `${name || "encarte"}${files.length > 1 ? `-folha-${index + 1}` : ""}.${formatName}`);
      }
      toast.success("Arquivo exportado");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha na exportação"); }
    finally { setExporting(false); }
  }

  async function handleShare() {
    if (!id) return;
    try {
      await persist(false);
      await updateFlyer.mutateAsync({ id, payload: { public: true } });
      const url = `${window.location.origin}/p/${id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado. Você pode enviá-lo por WhatsApp ou e-mail.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao compartilhar"); }
  }

  function insertAsset(asset: Asset) {
    editor.addElement({ category: "image", type: "image", image: asset.imageUrl, x: 40, y: 40,
      width: 300, height: Math.round(300 * asset.height / asset.width), rotation: 0, opacity: 1 });
  }
  function arrangeProducts() {
    if (!editor.products.length) return;
    editor.update({ products: layoutProductGrid(editor.products, columns, canvasWidth, canvasHeight, content, gridMode, productsPerPage) });
    toast.success("Produtos organizados no grid");
  }
  function applyBrand() {
    const b = brandQuery.data;
    if (!b) return;
    const footer = [b.name, b.slogan, b.address, b.contact.whatsapp, b.website, b.social.instagram, b.cards.filter(Boolean).join(", ")].filter(Boolean).map(v => v.slice(0, 200));
    editor.update({ backgroundColor: b.colors[0] ?? editor.backgroundColor, footer: { visible: true, elements: footer } });
  }
  async function saveTemplate() {
    try {
      await persist(false);
      await api.post("/flyers", { ...payload, name: `${name || "Encarte"} — modelo`.slice(0, 160), template: true, public: false });
      toast.success("Modelo salvo. Disponível na página Modelos.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao salvar modelo"); }
  }
  function exportProject() {
    const blob = new Blob([JSON.stringify({ version: 1, flyer: payload }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `${name || "encarte"}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importProject(file: File) {
    try {
      if (file.size > 2_000_000) throw new Error("O arquivo deve ter até 2 MB.");
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !data.flyer) throw new Error("Arquivo de projeto inválido.");
      await persist(false);
      const result = await api.post<{ flyer: Flyer }>("/flyers", { ...data.flyer, public: false, status: "draft" });
      window.location.assign(`/editor/${result.flyer._key}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao importar"); }
  }

  const selectedElement = editor.selectedKind === "element" ? editor.elements.find(e => e.id === editor.selectedId) : undefined;
  const selectedProduct = editor.selectedKind === "product" ? editor.products.find(e => e.id === editor.selectedId) : undefined;
  function handleChangeElement(key: string, patch: Partial<EditorElement>, final: boolean) {
    editor.update({ elements: editor.elements.map(e => e.id === key ? { ...e, ...patch } : e) }, { commit: final });
  }
  function handleChangeProduct(key: string, patch: Partial<EditorProduct>, final: boolean) {
    editor.update({ products: editor.products.map(e => e.id === key ? { ...e, ...patch } : e) }, { commit: final });
  }
  React.useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void persist().catch(() => {}); return; }
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) editor.redo(); else editor.undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); editor.duplicateSelected(); }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); editor.removeSelected(); }
      if (e.key === "Escape") editor.select(null);
      const deltas: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const d = deltas[e.key], item = selectedElement ?? selectedProduct;
      if (d && item) {
        e.preventDefault(); const step = e.shiftKey ? 10 : 1;
        const patch = { x: item.x + d[0] * step, y: item.y + d[1] * step };
        if (selectedElement) handleChangeElement(item.id, patch, true); else handleChangeProduct(item.id, patch, true);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });
  function addText() {
    editor.addElement({ category: "text", type: "text", x: 80, y: 60, width: 400, height: 80, rotation: 0, opacity: 1,
      text: "Texto em destaque", textStyle: { fontFamily: "Arial", fontWeight: 700, fontSize: 32, color: "#111827", align: "center" } });
  }
  function addShape() {
    editor.addElement({ category: "shape", type: "shape", x: 80, y: 200, width: 300, height: 120, rotation: 0, opacity: 1, backgroundColor: "#f97316" });
  }
  function addCatalogElement(item: CatalogElement) {
    const payload = JSON.parse(JSON.stringify(item.payload)) as CatalogElement["payload"];
    if (BACKGROUND_CATEGORIES.has(item.category)) {
      const id = `background_${Math.random().toString(36).slice(2, 10)}`;
      editor.update({
        elements: [
          ...editor.elements.filter(element => !BACKGROUND_CATEGORIES.has(element.category)),
          {
            ...payload,
            id,
            category: "background",
            type: "image",
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
            imageFit: "cover",
            rotation: 0,
            opacity: 1,
            zIndex: -1000,
          },
        ],
      });
      editor.select(id, "element");
      toast.success(`Fundo ${item.title} aplicado ao encarte`);
      return;
    }
    const scale = Math.min(1, canvasWidth * .85 / payload.width, canvasHeight * .85 / payload.height);
    editor.addElement({
      ...payload,
      width: Math.round(payload.width * scale), height: Math.round(payload.height * scale),
      textStyle: payload.textStyle ? { ...payload.textStyle, fontSize: (payload.textStyle.fontSize ?? 24) * scale } : undefined,
      x: Math.max(0, (canvasWidth - payload.width * scale) / 2),
      y: Math.max(0, (canvasHeight - payload.height * scale) / 2),
      rotation: payload.rotation ?? 0,
      opacity: payload.opacity ?? 1,
    });
  }
  async function addProduct(productId: string) {
    if (findingImage) return;
    const p = productsQuery.data?.products.find(p => p._key === productId);
    if (!p) return;
    let image = p.image ?? undefined;
    if (!image) {
      setFindingImage(productId);
      try {
        const result = await api.post<{ product: { image: string } }>(`/products/${productId}/find-image`, {});
        image = result.product.image;
        await queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("Foto encontrada automaticamente");
      } catch (error) { toast.error(error instanceof Error ? `${error.message} O produto foi adicionado sem foto.` : "Produto adicionado sem foto"); }
      finally { setFindingImage(null); }
    }
    const added: EditorProduct = { id: `product_${Math.random().toString(36).slice(2, 10)}`, productId: p._key, name: p.name, image, price: p.price,
      salePrice: p.salePrice, unit: p.unit ?? undefined, notes: p.notes ?? undefined, x: 0, y: 0, width: 240, height: 300, rotation: 0, isHighlighted: false };
    latestEditor.current.update({ products: layoutProductGrid([...latestEditor.current.products, added], columns, canvasWidth, canvasHeight, content, gridMode, productsPerPage) });
    editor.select(added.id, "product");
  }

  async function importProductList() {
    if (!bulkProductText.trim() || bulkImporting) return;
    setBulkImporting(true);
    setBulkProgress("Criando produtos...");
    try {
      const result = await api.post<{ products: Product[]; ignored: { line: string; reason: string }[] }>("/products/import-list", { text: bulkProductText });
      const withImages: Product[] = [...result.products];
      const queue = result.products.map((product, index) => ({ product, index }));
      let completed = 0;
      const worker = async () => {
        while (queue.length) {
          const { product, index } = queue.shift()!;
          let resolved = product;
          try {
            const found = await api.post<{ product: Product }>(`/products/${product._key}/find-image`, {});
            resolved = { ...product, ...found.product };
          } catch { /* O produto continua válido quando nenhuma foto é encontrada. */ }
          withImages[index] = resolved;
          completed += 1;
          setBulkProgress(`Buscando fotos ${completed}/${result.products.length}...`);
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
      const added: EditorProduct[] = withImages.map(product => ({
        id: `product_${Math.random().toString(36).slice(2, 10)}`, productId: product._key, name: product.name,
        image: product.image ?? undefined, price: product.price, salePrice: product.salePrice,
        unit: product.unit ?? undefined, notes: product.notes ?? undefined, x: 0, y: 0,
        width: 240, height: 300, rotation: 0, isHighlighted: false,
      }));
      latestEditor.current.update({ products: layoutProductGrid([...latestEditor.current.products, ...added], columns, canvasWidth, canvasHeight, content, gridMode, productsPerPage) });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      setBulkProductText("");
      toast.success(`${added.length} produtos adicionados${result.ignored.length ? `; ${result.ignored.length} linhas sem preço foram ignoradas` : ""}`);
      const missingPhotos = withImages.filter(product => !product.image).length;
      if (missingPhotos) toast.info(`${missingPhotos} produto(s) sem foto. Use Buscar foto no catálogo ou envie uma imagem pela biblioteca.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao importar a lista"); }
    finally { setBulkImporting(false); setBulkProgress(""); }
  }

  async function applyDesign(designId: string) {
    const listedDesign = designsQuery.data?.find(item => item._key === designId);
    if (!listedDesign) return;
    let design = listedDesign;
    try {
      const result = await api.get<{ success: boolean; design: typeof listedDesign }>(`/designs/${designId}`);
      design = result.design;
    } catch {
      // A listagem continua aplicável quando o detalhe remoto está indisponível.
    }
    const sourceWidth = 1080;
    const sourceHeight = 1350;
    const scaleX = canvasWidth / sourceWidth;
    const scaleY = canvasHeight / sourceHeight;
    const elements = design.elements.map((item, index) => {
      const background = isBackgroundCategory(item.category);
      return {
      id: `theme_${Date.now()}_${index}`,
      category: background ? "background" : item.category ?? "decorative",
      type: item.type ?? "shape",
      subtype: item.subtype,
      x: background ? 0 : Math.round((item.x ?? 0) * scaleX),
      y: background ? 0 : Math.round((item.y ?? 0) * scaleY),
      width: background ? canvasWidth : Math.round((item.width ?? 240) * scaleX),
      height: background ? canvasHeight : Math.round((item.height ?? 80) * scaleY),
      rotation: item.rotation ?? 0,
      opacity: item.opacity ?? 1,
      zIndex: item.zIndex ?? index,
      text: item.text,
      backgroundColor: item.backgroundColor,
      image: item.image,
      imageFit: background ? "cover" : item.imageFit,
      textStyle: item.textStyle ? { ...item.textStyle, fontSize: item.textStyle.fontSize ? Math.round(item.textStyle.fontSize * Math.min(scaleX, scaleY)) : undefined } : undefined,
      };
    });
    editor.update({ elements, products: layoutProductGrid(editor.products, columns, canvasWidth, canvasHeight, content, gridMode, productsPerPage), backgroundColor: design.backgroundColor ?? editor.backgroundColor });
    setDesignCode(design._key);
    toast.success(`Tema ${design.title} aplicado`);
  }

  function applyTagPreset(preset: (typeof TAG_PRESETS)[number], onlySelected = false) {
    const targetId = onlySelected && editor.selectedKind === "product" ? editor.selectedId : null;
    const products = editor.products.map(product => targetId && product.id !== targetId ? product : ({
      ...product,
      isHighlighted: true,
      tagColor: preset.tagColor,
      textColor: preset.textColor,
      backgroundColor: preset.backgroundColor,
      tagShape: preset.tagShape,
      tagStyle: preset.tagStyle,
    }));
    editor.update({ products });
    toast.success(targetId ? "Tag aplicada ao produto" : `Tag aplicada a ${products.length} produtos`);
  }

  function applyTagPatch(patch: Partial<EditorProduct>) {
    const targetId = editor.selectedKind === "product" ? editor.selectedId : null;
    editor.update({ products: editor.products.map(product => targetId && product.id !== targetId ? product : { ...product, ...patch, isHighlighted: true }) });
    toast.success(targetId ? "Tag aplicada ao produto selecionado" : `Tag aplicada a ${editor.products.length} produtos`);
  }

  function openSection(section: EditorSection) {
    if (activeSection === section && panelOpen) setPanelOpen(false);
    else { setActiveSection(section); setPanelOpen(true); }
  }

  async function changeProductPhoto(product: EditorProduct) {
    editor.select(product.id, "product");
    try {
      const result = product.productId
        ? await api.get<{ product: Product }>(`/products/${product.productId}`)
        : await api.post<{ product: Product }>("/products", { name: product.name || "Produto", price: product.price ?? 0, image: product.image });
      if (!product.productId) latestEditor.current.update({ products: latestEditor.current.products.map(item => item.id === product.id ? { ...item, productId: result.product._key } : item) });
      setPhotoProduct({ ...result.product, name: product.name || result.product.name });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao abrir fotos do produto"); }
  }

  function renderSectionPanel() {
    const title = QUICK_TOOLS.find(section => section.id === activeSection)?.label ?? EDITOR_SECTIONS.find(section => section.id === activeSection)?.label ?? "Editor";
    return <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
        <div className="flex items-center gap-2"><h2 className="text-base font-semibold">{title}</h2>{activeSection === "products" && <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{editor.products.length}</span>}</div>
        <Button variant="ghost" size="icon" aria-label="Fechar painel" onClick={() => setPanelOpen(false)}><X className="h-4 w-4" /></Button>
      </div>
      <div className="space-y-4 p-4">
        {(activeSection === "fonts" || activeSection === "text") && <>
          <Button className="w-full" onClick={addText}><Type className="h-4 w-4" />Adicionar texto</Button>
          <p className="text-xs text-muted-foreground">Selecione um texto para editar. Os textos do encarte aparecem em todas as páginas.</p>
          <div className="space-y-2">{editor.elements.filter(element => element.type === "text").map(element => <button key={element.id} type="button" onClick={() => editor.select(element.id, "element")} className={`block w-full truncate rounded-lg border p-3 text-left ${selectedElement?.id === element.id ? "border-primary bg-primary/10" : "hover:bg-muted"}`} style={{ fontFamily: element.textStyle?.fontFamily }}>{element.text || "Texto vazio"}</button>)}</div>
          {selectedElement?.type === "text" && <InspectorPanel element={selectedElement}
            onChangeElement={(patch, final) => handleChangeElement(selectedElement.id, patch, final)} onChangeProduct={() => {}}
            onDelete={editor.removeSelected} onDuplicate={editor.duplicateSelected} onMoveLayer={editor.moveLayer} />}
        </>}
        {activeSection === "colors" && <>
          <label className="block text-sm">Fundo da página<Input type="color" className="mt-2 h-12 p-1" value={editor.backgroundColor} onChange={event => editor.update({ backgroundColor: event.target.value }, { commit: false })} onBlur={() => editor.update({}, { commit: true })} /></label>
          <div className="grid grid-cols-4 gap-2">{TAG_COLORS.map(([color, , label]) => <button key={color} type="button" aria-label={`Fundo ${label}`} onClick={() => editor.update({ backgroundColor: color })} className="h-10 rounded-lg border" style={{ backgroundColor: color }} />)}</div>
          {selectedElement?.type === "text" && <label className="block text-sm">Cor do texto selecionado<Input type="color" value={selectedElement.textStyle?.color ?? "#111827"} onChange={event => handleChangeElement(selectedElement.id, { textStyle: { ...selectedElement.textStyle, color: event.target.value } }, false)} onBlur={() => handleChangeElement(selectedElement.id, {}, true)} /></label>}
          {selectedElement?.type === "shape" && <label className="block text-sm">Cor da forma selecionada<Input type="color" value={selectedElement.backgroundColor ?? "#f97316"} onChange={event => handleChangeElement(selectedElement.id, { backgroundColor: event.target.value }, false)} onBlur={() => handleChangeElement(selectedElement.id, {}, true)} /></label>}
          <Button variant="outline" onClick={() => openSection("tags")}>Editar cores das etiquetas de preço</Button>
        </>}
        {activeSection === "dates" && <>
          <label className="block text-sm">Início da validade<Input type="date" value={startAt} onChange={event => setStartAt(event.target.value)} /></label>
          <label className="block text-sm">Fim da validade<Input type="date" min={startAt} value={endAt} onChange={event => setEndAt(event.target.value)} /></label>
        </>}
        {activeSection === "grid" && <>
          <GridPicker capacity={productsPerPage} count={Math.min(productsPerPage, Math.max(0, editor.products.length - visiblePage * productsPerPage))}
            columns={columns} mode={gridMode}
            onCapacity={value => { setProductsPerPage(value); setColumns(Math.ceil(Math.sqrt(value))); setActivePage(0); editor.select(null); }}
            onLayout={(nextColumns, nextMode) => { setColumns(nextColumns); setGridMode(nextMode); }} />
          <Button variant="outline" className="w-full" onClick={arrangeProducts}>Reorganizar produtos</Button>
        </>}
        {activeSection === "themes" && <>
          <p className="text-sm text-muted-foreground">Escolha o melhor tema para o seu encarte</p>
          <Input placeholder="Pesquisar modelo" aria-label="Buscar temas" value={themeSearch} onChange={event => setThemeSearch(event.target.value)} />
          <div className="space-y-6">
            {Array.from((designsQuery.data ?? []).reduce((groups, design) => {
              const term = normalizeSearch(themeSearch);
              if (term && !normalizeSearch(`${design.title} ${THEME_GROUP_LABELS[design.theme] ?? design.theme}`).includes(term)) return groups;
              const list = groups.get(design.theme) ?? [];
              list.push(design); groups.set(design.theme, list); return groups;
            }, new Map<string, NonNullable<typeof designsQuery.data>>() )).map(([theme, designs]) => {
              const expanded = expandedThemeGroups.has(theme);
              const visible = expanded ? designs : designs.slice(0, 2);
              return <section key={theme} className="space-y-2">
                <div className="flex items-center justify-between"><h3 className="font-semibold">{THEME_GROUP_LABELS[theme] ?? theme}</h3>{designs.length > 2 && <button type="button" className="text-xs font-medium text-primary" onClick={() => setExpandedThemeGroups(current => { const next = new Set(current); if (next.has(theme)) next.delete(theme); else next.add(theme); return next; })}>{expanded ? "Ver menos" : "Ver mais"}</button>}</div>
                <div className="grid grid-cols-2 gap-2">
                  {visible.map((design) => {
                    return <button key={design._key} type="button" title={design.title} aria-pressed={designCode === design._key} onClick={() => void applyDesign(design._key)} className={`group overflow-hidden rounded-lg border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md ${designCode === design._key ? "ring-2 ring-primary" : ""}`}>
                      <span className="block aspect-[4/5] overflow-hidden">{design.thumbnail ? <img src={design.thumbnail} alt="" loading="lazy" className="h-full w-full bg-white object-contain" /> : <CatalogPreview elements={design.elements} background={design.backgroundColor} />}</span>
                      <span className="block truncate px-2 py-1.5 text-xs font-medium">{design.title}</span>
                    </button>;
                  })}
                </div>
              </section>;
            })}
          </div>
          {designsQuery.isLoading && <p role="status">Carregando temas...</p>}
          {designsQuery.isError && <Button variant="outline" onClick={() => void designsQuery.refetch()}>Tentar carregar temas novamente</Button>}
          {designsQuery.isSuccess && !designsQuery.data.some(d => normalizeSearch(`${d.title} ${THEME_GROUP_LABELS[d.theme] ?? d.theme}`).includes(normalizeSearch(themeSearch))) && <p className="rounded-lg bg-muted p-4 text-sm">Nenhum tema encontrado. Experimente outra palavra.</p>}
        </>}

        {activeSection === "products" && <>
          <EditorProductsPanel products={editor.products} catalog={productsQuery.data?.products ?? []} selectedId={editor.selectedId}
            text={bulkProductText} onText={setBulkProductText} busy={bulkImporting} progress={bulkProgress} onImport={() => void importProductList()}
            onUpdate={products => editor.update({ products })} onSelect={id => { editor.select(id, "product"); setInspectorOpen(true); }}
            onAdd={id => { if (!findingImage) void addProduct(id); }} onPhoto={product => void changeProductPhoto(product)} />
          {productsQuery.isError && <Button variant="outline" onClick={() => void productsQuery.refetch()}>Tentar carregar hist?rico novamente</Button>}
          {photoProduct && <ProductImagePicker key={photoProduct._key} product={photoProduct} onClose={() => setPhotoProduct(null)} onSaved={saved => latestEditor.current.update({ products: latestEditor.current.products.map(product => product.productId === saved._key ? { ...product, image: saved.image ?? undefined } : product) })} />}
        </>}

        {activeSection === "elements" && <>
          <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={addText}><Type className="h-4 w-4" />Texto</Button><Button variant="outline" onClick={addShape}><Square className="h-4 w-4" />Forma</Button></div>
          <div className="grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Biblioteca de elementos"><button type="button" role="tab" aria-selected={elementLibraryTab === "library"} onClick={() => setElementLibraryTab("library")} className={`rounded-md px-3 py-2 text-sm font-medium ${elementLibraryTab === "library" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>Biblioteca</button><button type="button" role="tab" aria-selected={elementLibraryTab === "mine"} onClick={() => setElementLibraryTab("mine")} className={`rounded-md px-3 py-2 text-sm font-medium ${elementLibraryTab === "mine" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>Meus</button></div>
          {elementLibraryTab === "library" && <div className="grid grid-cols-4 gap-1 border-b pb-2">{[["seal", "Selos"], ["photos", "Fotos"], ["decorative", "Decorativo"], ["backgrounds", "Fundos"]].map(([category, label]) => <button key={category} type="button" onClick={() => setElementCategory(category)} className={`border-b-2 px-1 py-2 text-xs font-medium ${elementCategory === category ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{label}</button>)}</div>}
          {elementsQuery.isLoading && <p role="status">Carregando elementos...</p>}
          {elementsQuery.isError && <Button variant="outline" onClick={() => void elementsQuery.refetch()}>Tentar carregar elementos novamente</Button>}
          {elementLibraryTab === "library" && <><Input placeholder="Buscar elementos..." aria-label="Buscar elementos" value={elementSearch} onChange={event => setElementSearch(event.target.value)} />
          {elementsQuery.isSuccess && !catalogElements.some(item => normalizeSearch(item.title).includes(normalizeSearch(elementSearch))) && <p className="rounded-lg bg-muted p-3 text-sm">Nenhum elemento encontrado.</p>}
          <div className="grid grid-cols-2 gap-2">{catalogElements.filter(item => normalizeSearch(item.title).includes(normalizeSearch(elementSearch))).map(item => <button key={item._key} type="button" onClick={() => addCatalogElement(item)} className="min-h-24 rounded-lg border bg-muted/30 p-3 text-left text-xs hover:border-primary hover:bg-primary/5"><span className="mb-3 block h-20 overflow-hidden rounded bg-slate-200"><CatalogPreview elements={[{ ...item.payload, x: 0, y: 0 }]} width={item.payload.width} height={item.payload.height} /></span><span className="block font-medium">{item.title}</span><span className="text-muted-foreground">{ELEMENT_CATEGORY_LABELS[item.category] ?? item.category}</span></button>)}</div></>}
          <Separator />
          {elementLibraryTab === "mine" && <div><h3 className="mb-2 text-sm font-medium">Minhas imagens</h3><MediaLibrary onSelect={insertAsset} /></div>}
        </>}

        {activeSection === "tags" && <>
          <p className="text-sm text-muted-foreground">Sem produto selecionado, a alteração é aplicada em todos. Selecione um produto no canvas para editar somente ele.</p>
          <div className="grid grid-cols-3 rounded-lg bg-muted p-1">{([['shapes','Formas'],['style','Estilo'],['colors','Cores']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTagTab(value)} className={`rounded-md px-2 py-2 text-xs font-medium ${tagTab === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>)}</div>
          {tagTab === "shapes" && <div className="grid grid-cols-2 gap-3">{TAG_SHAPES.map(([shape, label]) => <button key={shape} type="button" onClick={() => applyTagPatch({ tagShape: shape })} className="rounded-xl border p-3 hover:border-primary"><span className="mx-auto mb-3 grid h-20 w-24 place-items-center bg-primary font-black text-primary-foreground" style={{ borderRadius: shape === "circle" ? "50%" : shape === "pill" ? 999 : shape === "square" ? 3 : 10, clipPath: shape === "burst" ? "polygon(50% 0%,61% 18%,79% 7%,82% 29%,100% 35%,86% 50%,100% 65%,79% 71%,79% 93%,61% 82%,50% 100%,39% 82%,21% 93%,21% 71%,0 65%,14% 50%,0 35%,18% 29%,21% 7%,39% 18%)" : shape === "ticket" ? "polygon(0 0,100% 0,100% 35%,92% 50%,100% 65%,100% 100%,0 100%,0 65%,8% 50%,0 35%)" : undefined }}>9,99</span><span className="text-sm font-medium">{label}</span></button>)}</div>}
          {tagTab === "style" && <><p className="text-xs text-muted-foreground">Escolha um estilo pronto</p><div className="grid grid-cols-2 gap-3">{TAG_STYLES.map(([style, label]) => <button key={style} type="button" onClick={() => applyTagPatch({ tagStyle: style })} className="rounded-xl border p-3 hover:border-primary"><span className={`mx-auto mb-3 block rounded-full px-3 py-3 font-black ${style === "outline" ? "border-2 border-primary text-primary" : "bg-primary text-primary-foreground"}`} style={{ background: style === "gradient" ? "linear-gradient(135deg,#29d19c,#111827)" : undefined, boxShadow: style === "shadow" ? "0 5px 0 #166b50" : undefined }}>R$ 9,99</span><span className="text-sm font-medium">{label}</span></button>)}</div><Separator /><p className="text-sm font-medium">Presets completos</p><div className="grid grid-cols-2 gap-2">{TAG_PRESETS.map(preset => <Button key={preset.name} variant="outline" size="sm" onClick={() => applyTagPreset(preset)}>{preset.name}</Button>)}</div></>}
          {tagTab === "colors" && <><div className="rounded-xl border p-5 text-center"><span className="inline-block rounded-full bg-red-500 px-5 py-3 text-xl font-black text-white">R$ 9,99</span></div><div><label className="mb-2 block text-xs text-muted-foreground">Sugestões</label><div className="grid grid-cols-4 gap-2">{TAG_COLORS.map(([tag, text, label]) => <button key={tag} type="button" title={label} aria-label={label} onClick={() => applyTagPatch({ tagColor: tag, textColor: text })} className="aspect-square rounded-lg border-2 text-xs font-bold shadow-sm hover:scale-105" style={{ backgroundColor: tag, color: text }}>Aa</button>)}</div></div><div className="grid grid-cols-2 gap-2"><label className="text-xs">Cor da tag<Input type="color" className="h-12 p-1" defaultValue="#ef4444" onChange={event => applyTagPatch({ tagColor: event.target.value })} /></label><label className="text-xs">Cor do texto<Input type="color" className="h-12 p-1" defaultValue="#ffffff" onChange={event => applyTagPatch({ textColor: event.target.value })} /></label></div></>}
          {!editor.products.length && <p className="rounded-lg bg-muted p-3 text-sm">Adicione produtos para aplicar uma tag.</p>}
        </>}

        {(activeSection === "formats" || activeSection === "proportions") && <>
          <div><p className="mb-2 text-sm font-medium">Tipo de material</p><div className="grid grid-cols-2 gap-2">{([['flyer','Encarte'],['poster','Cartaz'],['shelf_label','Etiqueta'],['video','Vídeo']] as const).map(([value, label]) => <Button key={value} size="sm" variant={content === value ? "default" : "outline"} onClick={() => { setContent(value); if (editor.products.length) editor.update({ products: layoutProductGrid(editor.products, columns, canvasWidth, canvasHeight, value, gridMode, productsPerPage) }); }}>{label}</Button>)}</div></div>
          {content === "shelf_label" && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Cada produto vira uma etiqueta, uma por página. No download, elas são organizadas automaticamente em folhas A4.</p>}
          {content === "poster" && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Cartaz de oferta com um produto em destaque, pronto para impressão.</p>}
          {content === "video" && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Crie uma peça animada para TV, Reels ou Story e exporte em MP4.</p>}
          <div><p className="mb-2 text-sm font-medium">Formato</p><div className="grid grid-cols-2 gap-2">{formatsQuery.data?.map(item => <button key={item._key} type="button" onClick={() => { setFormatCode(item.code); if (editor.products.length) editor.update({ products: layoutProductGrid(editor.products, columns, item.width, item.height, content, gridMode, productsPerPage) }); }} className={`rounded-xl border p-3 text-left ${formatCode === item.code ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary"}`}><span className="mb-2 block h-14 rounded border bg-muted" style={{ aspectRatio: `${item.width}/${item.height}`, maxWidth: 70 }} /><span className="block text-sm font-medium">{item.title}</span><span className="text-[11px] text-muted-foreground">{item.width} × {item.height} px</span></button>)}</div></div>
          <Button variant="outline" className="w-full" onClick={() => setFitView(true)}>Ajustar à tela</Button>
        </>}

        {activeSection === "brand" && <>
          {brandQuery.data?.logo ? <img src={brandQuery.data.logo} alt="Logo da loja" className="h-24 w-full rounded-lg border bg-white object-contain p-2" /> : <div className="grid h-24 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">Nenhuma logo cadastrada</div>}
          <div><h3 className="font-medium">{brandQuery.data?.name || "Minha marca"}</h3><p className="text-sm text-muted-foreground">{brandQuery.data?.slogan || "Configure logo, cores e contatos"}</p></div>
          {!!brandQuery.data?.colors.length && <div className="flex flex-wrap gap-2">{brandQuery.data.colors.map((color, index) => <button key={`${color}-${index}`} type="button" aria-label={`Usar cor ${color}`} className="h-10 w-10 rounded-full border shadow-sm" style={{ backgroundColor: color }} onClick={() => editor.update({ backgroundColor: color })} />)}</div>}
          <Button className="w-full" onClick={applyBrand}>Aplicar minha marca</Button>
          {brandQuery.data?.logo && <Button variant="outline" className="w-full" onClick={() => editor.addElement({ type: "image", category: "image", image: brandQuery.data!.logo, x: 40, y: 30, width: 180, height: 100, opacity: 1, rotation: 0 })}><ImageIcon className="h-4 w-4" />Inserir logo</Button>}
          <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Editar dados da marca</summary><div className="mt-4"><BrandPage compact /></div></details>
        </>}

        {activeSection === "flyers" && <>
          <label className="block text-sm">Nome do encarte<Input value={name} maxLength={160} onChange={event => setName(event.target.value)} /></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-sm">Válido a partir de<Input type="date" value={startAt} onChange={event => setStartAt(event.target.value)} /></label><label className="text-sm">Válido até<Input type="date" value={endAt} min={startAt} onChange={event => setEndAt(event.target.value)} /></label></div>
          <label className="block text-sm">Cor de fundo<Input type="color" className="h-10 p-1" value={editor.backgroundColor} onChange={event => editor.update({ backgroundColor: event.target.value }, { commit: false })} onBlur={() => editor.update({}, { commit: true })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editor.footer.visible} onChange={event => editor.update({ footer: { ...editor.footer, visible: event.target.checked } })} />Exibir rodapé</label>
          <Textarea aria-label="Texto do rodapé" placeholder="Uma informação por linha" value={editor.footer.elements.join("\n")} onChange={event => editor.update({ footer: { ...editor.footer, elements: event.target.value.split("\n").slice(0, 20).map(value => value.slice(0, 200)) } })} />
          <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => void saveTemplate()}>Salvar modelo</Button><Button variant="outline" onClick={exportProject}>Baixar projeto</Button></div>
          <label className="block rounded-lg border border-dashed p-3 text-center text-sm">Importar projeto<Input className="mt-2" type="file" accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importProject(file); }} /></label>
          <Separator />
          <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-medium">Encartes recentes</h3><Link to="/flyers" className="text-xs text-primary">Ver todos</Link></div><div className="space-y-2">{flyerSummaryQuery.data?.map(item => <button key={item._key} type="button" onClick={() => { void persist(false).then(() => window.location.assign(`/editor/${item._key}`)); }} className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm hover:border-primary ${item._key === id ? "border-primary bg-primary/5" : ""}`}><span className="min-w-0 truncate">{item.name}</span><span className="ml-2 text-[10px] uppercase text-muted-foreground">{item.status}</span></button>)}</div></div>
          <Separator />
          <div><h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><Layers3 className="h-4 w-4" />Camadas</h3><div className="space-y-1">{[...editor.elements].sort((a, b) => b.zIndex - a.zIndex).map(element => <button key={element.id} type="button" onClick={() => editor.select(element.id, "element")} className={`block w-full truncate rounded p-2 text-left text-sm ${editor.selectedId === element.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>{element.text || element.category}</button>)}{editor.products.map(product => <button key={product.id} type="button" onClick={() => editor.select(product.id, "product")} className={`block w-full truncate rounded p-2 text-left text-sm ${editor.selectedId === product.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>{product.name}</button>)}</div></div>
        </>}
      </div>
    </>;
  }
  if (flyerQuery.isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!flyer || flyerQuery.isError) return <div className="p-8"><p>Encarte não encontrado</p><Link to="/flyers">Voltar para encartes</Link></div>;

  return <div className="flex h-full min-h-0 flex-col">
    <div className="flex flex-wrap items-center gap-2 border-b bg-card px-4 py-2">
      <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => { void persist(false).then(() => { window.location.assign("/flyers"); }).catch(() => {}); }}><ArrowLeft className="h-4 w-4" /></Button>
      <Input className="h-9 max-w-xs" value={name} maxLength={160} onChange={e => setName(e.target.value)} aria-label="Nome do encarte" />
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="icon" onClick={editor.undo} disabled={!editor.canUndo} aria-label="Desfazer"><Undo2 className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" onClick={editor.redo} disabled={!editor.canRedo} aria-label="Refazer"><Redo2 className="h-4 w-4" /></Button>
      <div className="flex items-center gap-1 rounded-lg border px-1" role="group" aria-label="Zoom do encarte">
        <Button variant="ghost" size="icon" disabled={editor.zoom <= .1} onClick={() => changeZoom(editor.zoom - .1)} aria-label="Reduzir zoom"><ZoomOut className="h-4 w-4" /></Button>
        <input type="range" min="10" max="300" step="5" value={Math.round(editor.zoom * 100)} onChange={event => changeZoom(Number(event.target.value) / 100)} aria-label="Nível de zoom" className="hidden w-24 accent-primary sm:block" />
        <button type="button" className="w-12 text-center text-xs tabular-nums" title="Restaurar zoom para 100%" onClick={() => changeZoom(1)} aria-label="Zoom 100%">{Math.round(editor.zoom * 100)}%</button>
        <Button variant="ghost" size="icon" disabled={editor.zoom >= 3} onClick={() => changeZoom(editor.zoom + .1)} aria-label="Aumentar zoom"><ZoomIn className="h-4 w-4" /></Button>
        <Button variant={fitView ? "secondary" : "ghost"} size="sm" onClick={() => setFitView(true)} title="Ajustar encarte ao espaço disponível"><Maximize2 className="h-4 w-4" />Ajustar</Button>
      </div>
      <Button variant="ghost" size="icon" aria-label={panelOpen ? "Recolher biblioteca" : "Abrir biblioteca"} title={panelOpen ? "Recolher biblioteca" : "Abrir biblioteca"} aria-expanded={panelOpen} onClick={() => setPanelOpen(value => !value)}>{panelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}</Button>
      <Button className="hidden xl:inline-flex" variant="ghost" size="icon" aria-label={inspectorOpen ? "Recolher propriedades" : "Abrir propriedades"} title={inspectorOpen ? "Recolher propriedades" : "Abrir propriedades"} aria-expanded={inspectorOpen} onClick={() => setInspectorOpen(value => !value)}>{inspectorOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}</Button>
      <Button variant="outline" size="sm" onClick={() => { const show = !panelOpen && !inspectorOpen; setPanelOpen(show); setInspectorOpen(show); }}>{!panelOpen && !inspectorOpen ? "Mostrar painéis" : "Recolher painéis"}</Button>
      <Button variant="outline" disabled={saving} onClick={() => void persist().catch(() => {})}><Save className="h-4 w-4" />Salvar</Button>
      <Button variant="outline" onClick={() => void handleShare()}>Copiar link público</Button>
      {flyer.public && <Button variant="ghost" onClick={() => void updateFlyer.mutateAsync({ id: id!, payload: { public: false } }).then(() => toast.success("Link público desativado")).catch(e => toast.error(String(e)))}>Desativar link</Button>}
      <DropdownMenu><DropdownMenuTrigger asChild><Button disabled={exporting}>{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Exportar</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">{(["png", "jpeg", "pdf", "svg", "mp4"] as const).map(f => <DropdownMenuItem key={f} onSelect={() => void handleExport(f)}>{f === "mp4" ? "Vídeo MP4 (6 segundos por página)" : f.toUpperCase()}</DropdownMenuItem>)}</DropdownMenuContent>
      </DropdownMenu>
      <span role="status" className={`ml-auto text-xs ${saveError ? "text-red-600" : "text-muted-foreground"}`}>{saveError || (saving ? "Salvando..." : signature !== savedSignature.current ? "Alterações não salvas" : "Salvo")}</span>
    </div>
    <div role="toolbar" aria-label="Ferramentas do encarte" className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-background px-3 py-2">
      {QUICK_TOOLS.map(tool => <Button key={tool.id} variant={activeSection === tool.id && panelOpen ? "secondary" : "ghost"} className="shrink-0" aria-pressed={activeSection === tool.id && panelOpen} onClick={() => openSection(tool.id)}><tool.icon className="h-4 w-4" />{tool.label}{tool.id === "dates" && startAt && <span className="text-xs text-primary">{startAt.split("-").reverse().join("/")}{endAt && ` – ${endAt.split("-").reverse().join("/")}`}</span>}</Button>)}
    </div>
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/30 pb-12 lg:pb-0">
      <nav aria-label="Seções do editor" className="hidden w-20 shrink-0 flex-col bg-card text-foreground lg:flex">
        {EDITOR_SECTIONS.map(section => { const Icon = section.icon; const selected = activeSection === section.id && panelOpen; return <button key={section.id} type="button" onClick={() => openSection(section.id)} aria-pressed={selected} className={`flex h-[72px] flex-col items-center justify-center gap-1 border-b border-border text-[10px] transition ${selected ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}><Icon className="h-5 w-5" /><span>{section.label}</span></button>; })}
      </nav>
      {panelOpen && <aside className="fixed inset-x-0 bottom-12 z-30 max-h-[65vh] overflow-y-auto rounded-t-2xl border-t bg-background shadow-2xl lg:static lg:z-auto lg:max-h-none lg:w-[396px] lg:shrink-0 lg:rounded-none lg:border-r lg:border-t-0 lg:shadow-none">{renderSectionPanel()}</aside>}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"><div className="flex shrink-0 items-center justify-center gap-3 border-b bg-background p-2"><Button size="sm" variant={activeSection === "grid" && panelOpen ? "default" : "outline"} aria-label="Configurar grade" onClick={() => openSection("grid")}><Grid3X3 className="h-4 w-4" />{productsPerPage}</Button><Button size="sm" variant="outline" disabled={visiblePage === 0} onClick={() => { editor.select(null); setActivePage(visiblePage - 1); }}>Anterior</Button><span aria-live="polite" className="text-sm">Folha {visiblePage + 1} de {pageCount}</span><Button size="sm" variant="outline" disabled={visiblePage + 1 >= pageCount} onClick={() => { editor.select(null); setActivePage(visiblePage + 1); }}>Pr&#243;xima</Button></div><FlyerCanvas width={canvasWidth} height={canvasHeight} zoom={editor.zoom} backgroundColor={editor.backgroundColor}
        elements={editor.elements} products={editor.products.slice(visiblePage * productsPerPage, (visiblePage + 1) * productsPerPage)} footer={editor.footer} selectedId={editor.selectedId} selectedKind={editor.selectedKind}
        onZoomChange={changeZoom} onViewportResize={setViewportSize}
        onSelect={(id, kind) => { editor.select(id, kind); if (id) { if (kind === "product") { setActiveSection("products"); setPanelOpen(true); } setInspectorOpen(true); } }} onChangeElement={handleChangeElement} onChangeProduct={handleChangeProduct} /></section>
      <aside aria-label="Páginas do encarte" className="flex w-[76px] shrink-0 flex-col gap-3 overflow-y-auto border-l bg-background p-2 sm:w-[116px]">
        <h2 className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Páginas</h2>
        {Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" aria-label={`Visualizar página ${index + 1}`} aria-current={visiblePage === index ? "page" : undefined} onClick={() => { editor.select(null); setActivePage(index); }} className={`shrink-0 overflow-hidden rounded-lg border-2 p-1 transition ${visiblePage === index ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-transparent hover:border-muted-foreground"}`}>
          <div aria-hidden="true" className="pointer-events-none overflow-hidden rounded" style={{ aspectRatio: `${canvasWidth}/${canvasHeight}` }}>
            <div className="origin-top-left scale-[0.5] sm:scale-100" style={{ width: 88 }}><FlyerCanvas preview width={canvasWidth} height={canvasHeight} zoom={88 / canvasWidth} backgroundColor={editor.backgroundColor} elements={editor.elements} products={editor.products.slice(index * productsPerPage, (index + 1) * productsPerPage)} footer={editor.footer} selectedId={null} selectedKind={null} onSelect={() => {}} onChangeElement={() => {}} onChangeProduct={() => {}} /></div>
          </div>
          <span className="mt-1 block text-[10px]">{index + 1}</span>
        </button>)}
      </aside>
      {inspectorOpen ? <aside aria-label="Propriedades do objeto" className={`fixed inset-x-0 bottom-12 z-40 max-h-[50vh] overflow-y-auto border-t bg-background shadow-xl xl:static xl:max-h-none xl:min-h-0 xl:w-[280px] xl:shrink-0 xl:border-l xl:border-t-0 xl:shadow-none ${selectedElement || selectedProduct ? "block" : "hidden xl:block"}`}>
        <div className="flex items-center justify-between border-b px-3 py-2"><span className="text-sm font-medium">Propriedades</span><Button variant="ghost" size="icon" aria-label="Fechar propriedades" onClick={() => setInspectorOpen(false)}><PanelRightClose className="h-4 w-4" /></Button></div>
        <InspectorPanel element={selectedElement} product={selectedProduct}
          onChangeElement={(patch, final) => selectedElement && handleChangeElement(selectedElement.id, patch, final)}
          onChangeProduct={(patch, final) => selectedProduct && handleChangeProduct(selectedProduct.id, patch, final)}
          onDelete={editor.removeSelected} onDuplicate={editor.duplicateSelected} onMoveLayer={editor.moveLayer} />
      </aside> : <div className="hidden w-10 shrink-0 border-l bg-background xl:block"><Button size="icon" variant="ghost" aria-label="Expandir propriedades" title="Expandir propriedades" onClick={() => setInspectorOpen(true)}><PanelRightOpen className="h-4 w-4" /></Button></div>}
      <nav aria-label="Seções do editor" className="fixed inset-x-0 bottom-0 z-40 flex h-12 overflow-x-auto border-t bg-background lg:hidden">
        {EDITOR_SECTIONS.map(section => { const Icon = section.icon; const selected = activeSection === section.id && panelOpen; return <button key={section.id} type="button" onClick={() => openSection(section.id)} aria-pressed={selected} className={`flex min-w-[68px] flex-1 flex-col items-center justify-center gap-0.5 text-[9px] ${selected ? "bg-accent text-accent-foreground" : "bg-card text-foreground"}`}><Icon className="h-4 w-4" /><span>{section.label}</span></button>; })}
      </nav>
    </div>
  </div>;
}
