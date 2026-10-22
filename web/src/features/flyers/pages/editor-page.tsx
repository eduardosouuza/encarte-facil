import * as React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Download,
  Image as ImageIcon,
  LayoutTemplate,
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
import { FlyerCanvas } from "../../editor/flyer-canvas";
import { InspectorPanel } from "../../editor/inspector-panel";
import { useEditorState, type EditorElement, type EditorProduct } from "../../editor/use-editor-state";
import { layoutProductGrid, type ProductGridMode } from "../../editor/product-grid";
import { formatCurrency } from "@/lib/utils";
import type { Flyer, Product } from "@/lib/types";

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1350;

type EditorSection = "themes" | "products" | "elements" | "tags" | "formats" | "brand" | "flyers";

const EDITOR_SECTIONS = [
  { id: "themes", label: "Temas", icon: Palette },
  { id: "products", label: "Produtos", icon: Package },
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
  all: "Todos", text: "Textos", stickers: "Adesivos", decorative: "Decorativos", "3d": "Selos 3D",
  ribbons: "Fitas", splash: "Splash", tags: "Tags", frames: "Molduras", backgrounds: "Backgrounds",
  photos: "Fotos", icons: "Ícones", shapes: "Formas",
};

const THEME_GROUP_LABELS: Record<string, string> = {
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
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");
  const [columns, setColumns] = React.useState(3);
  const [gridMode, setGridMode] = React.useState<ProductGridMode>("featured");
  const [productSearch, setProductSearch] = React.useState("");
  const [elementSearch, setElementSearch] = React.useState("");
  const [elementCategory, setElementCategory] = React.useState("all");
  const [themeSearch, setThemeSearch] = React.useState("");
  const [tagTab, setTagTab] = React.useState<"shapes" | "style" | "colors">("shapes");
  const [productTab, setProductTab] = React.useState<"search" | "library" | "flyer">("search");
  const [bulkProductText, setBulkProductText] = React.useState("");
  const [bulkImporting, setBulkImporting] = React.useState(false);
  const [bulkProgress, setBulkProgress] = React.useState("");
  const [expandedThemeGroups, setExpandedThemeGroups] = React.useState<Set<string>>(() => new Set());
  const [findingImage, setFindingImage] = React.useState<string | null>(null);
  const [catalogElements, setCatalogElements] = React.useState<CatalogElement[]>([]);
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
    const controller = new AbortController();
    void api.get<{ elements: CatalogElement[] }>("/elements", { limit: 100 }, controller.signal)
      .then((result) => setCatalogElements(result.elements))
      .catch((error) => { if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : "Falha ao carregar elementos"); });
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    if (!flyer || hydrated) return;
    setName(flyer.name);
    setFormatCode(flyer.format ?? "");
    setContent(flyer.content ?? "flyer");
    setDesignCode(flyer.design ?? null);
    setColumns(Math.min(8, Math.max(1, Number(flyer.grid?.columns) || 3)));
    setGridMode(flyer.grid?.mode === "balanced" ? "balanced" : "featured");
    setStartAt(flyer.startAt?.slice(0, 10) ?? "");
    setEndAt(flyer.endAt?.slice(0, 10) ?? "");
    editor.reset({
      elements: (flyer.elements ?? []) as unknown as EditorElement[],
      products: (flyer.products ?? []) as unknown as EditorProduct[],
      backgroundColor: flyer.backgroundColor ?? "#ffffff",
      footer: {
        visible: flyer.footer?.visible ?? true,
        elements: flyer.footer?.elements ?? [],
      },
    });
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyer, hydrated]);

  const format = React.useMemo(() => {
    const list = formatsQuery.data ?? [];
    return list.find((item) => item.code === formatCode || item._key === formatCode);
  }, [formatsQuery.data, formatCode]);

  const canvasWidth = format?.width ?? DEFAULT_WIDTH;
  const canvasHeight = format?.height ?? DEFAULT_HEIGHT;

  const payload = {
    name: name.trim() || "Encarte sem nome",
    content, design: designCode, format: formatCode || null, startAt: startAt || null, endAt: endAt || null,
    grid: { columns, layout: "product-cards", mode: gridMode, auto: true },
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
      const data = await api.post<{ export: { fileUrl: string } }>(`/flyers/${id}/${formatName === "mp4" ? "render-video" : "render"}`, { format: formatName });
      await downloadFile(data.export.fileUrl, `${name || "encarte"}.${formatName}`);
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
    editor.update({ products: layoutProductGrid(editor.products, columns, canvasWidth, canvasHeight, content, gridMode) });
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
    editor.addElement({
      ...payload,
      x: payload.x ?? 100,
      y: payload.y ?? 120,
      rotation: payload.rotation ?? 0,
      opacity: payload.opacity ?? 1,
    });
  }
  async function addProduct(productId: string) {
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
    latestEditor.current.update({ products: layoutProductGrid([...latestEditor.current.products, added], columns, canvasWidth, canvasHeight, content, gridMode) });
    editor.select(added.id, "product");
  }

  async function findProductImage(productId: string) {
    setFindingImage(productId);
    try {
      const result = await api.post<{ product: { image: string }; asset: Asset }>(`/products/${productId}/find-image`, {});
      latestEditor.current.update({ products: latestEditor.current.products.map(product => product.productId === productId ? { ...product, image: result.product.image } : product) });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Foto encontrada e salva na biblioteca");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível buscar a foto"); }
    finally { setFindingImage(null); }
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
      latestEditor.current.update({ products: layoutProductGrid([...latestEditor.current.products, ...added], columns, canvasWidth, canvasHeight, content, gridMode) });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      setBulkProductText("");
      setProductTab("flyer");
      toast.success(`${added.length} produtos adicionados${result.ignored.length ? `; ${result.ignored.length} linhas sem preço foram ignoradas` : ""}`);
      const missingPhotos = withImages.filter(product => !product.image).length;
      if (missingPhotos) toast.info(`${missingPhotos} produto(s) sem foto. Use Buscar foto no catálogo ou envie uma imagem pela biblioteca.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao importar a lista"); }
    finally { setBulkImporting(false); setBulkProgress(""); }
  }

  function applyDesign(designId: string) {
    const design = designsQuery.data?.find(item => item._key === designId);
    if (!design) return;
    const sourceWidth = 1080;
    const sourceHeight = 1350;
    const scaleX = canvasWidth / sourceWidth;
    const scaleY = canvasHeight / sourceHeight;
    const elements = design.elements.map((item, index) => ({
      id: `theme_${Date.now()}_${index}`,
      category: item.category ?? "decorative",
      type: item.type ?? "shape",
      subtype: item.subtype,
      x: Math.round((item.x ?? 0) * scaleX),
      y: Math.round((item.y ?? 0) * scaleY),
      width: Math.round((item.width ?? 240) * scaleX),
      height: Math.round((item.height ?? 80) * scaleY),
      rotation: item.rotation ?? 0,
      opacity: item.opacity ?? 1,
      zIndex: item.zIndex ?? index,
      text: item.text,
      backgroundColor: item.backgroundColor,
      image: item.image,
      textStyle: item.textStyle ? { ...item.textStyle, fontSize: item.textStyle.fontSize ? Math.round(item.textStyle.fontSize * Math.min(scaleX, scaleY)) : undefined } : undefined,
    }));
    editor.update({ elements, products: layoutProductGrid(editor.products, columns, canvasWidth, canvasHeight, content, gridMode), backgroundColor: design.backgroundColor ?? editor.backgroundColor });
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

  function renderSectionPanel() {
    const title = EDITOR_SECTIONS.find(section => section.id === activeSection)?.label ?? "Editor";
    return <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
        <div><h2 className="text-lg font-semibold">{title}</h2><p className="text-xs text-muted-foreground">Edite o encarte sem sair da tela</p></div>
        <Button variant="ghost" size="icon" aria-label="Fechar painel" onClick={() => setPanelOpen(false)}><X className="h-4 w-4" /></Button>
      </div>
      <div className="space-y-4 p-4">
        {activeSection === "themes" && <>
          <p className="text-sm text-muted-foreground">Escolha o melhor tema para o seu encarte</p>
          <Input placeholder="Pesquisar modelo" aria-label="Buscar temas" value={themeSearch} onChange={event => setThemeSearch(event.target.value)} />
          <div className="space-y-6">
            {Array.from((designsQuery.data ?? []).reduce((groups, design) => {
              const term = themeSearch.toLocaleLowerCase("pt-BR");
              if (term && !`${design.title} ${THEME_GROUP_LABELS[design.theme] ?? design.theme}`.toLocaleLowerCase("pt-BR").includes(term)) return groups;
              const list = groups.get(design.theme) ?? [];
              list.push(design); groups.set(design.theme, list); return groups;
            }, new Map<string, NonNullable<typeof designsQuery.data>>() )).map(([theme, designs]) => {
              const expanded = expandedThemeGroups.has(theme);
              const visible = expanded ? designs : designs.slice(0, 2);
              return <section key={theme} className="space-y-2">
                <div className="flex items-center justify-between"><h3 className="font-semibold">{THEME_GROUP_LABELS[theme] ?? theme}</h3>{designs.length > 2 && <button type="button" className="text-xs font-medium text-primary" onClick={() => setExpandedThemeGroups(current => { const next = new Set(current); if (next.has(theme)) next.delete(theme); else next.add(theme); return next; })}>{expanded ? "Ver menos" : "Ver mais"}</button>}</div>
                <div className="grid grid-cols-2 gap-2">
                  {visible.map((design, index) => {
                    const accent = design.palette?.[1] ?? "#29d19c";
                    const contrast = design.palette?.[2] ?? "#172554";
                    const base = design.backgroundColor ?? "#ffffff";
                    return <button key={design._key} type="button" title={design.title} onClick={() => applyDesign(design._key)} className={`group overflow-hidden rounded-lg border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md ${designCode === design._key ? "ring-2 ring-primary" : ""}`}>
                      <span className="relative block aspect-[16/10] overflow-hidden" style={{ background: `linear-gradient(160deg, ${index % 2 ? contrast : accent} 0 48%, ${base} 48%)` }}>
                        <span className="absolute -left-4 top-1/2 h-7 w-28 -rotate-6 rounded" style={{ backgroundColor: design.palette?.[3] ?? `${accent}99` }} />
                        <span className="absolute left-2 right-2 top-3 rounded-sm px-1 py-1 text-center text-[9px] font-black leading-tight text-white" style={{ backgroundColor: `${contrast}dd` }}>{design.title.toUpperCase()}</span>
                        <span className="absolute bottom-2 left-2 h-8 w-8 rounded-full border-2 border-white text-center text-[8px] font-black leading-7 text-white" style={{ backgroundColor: accent }}>9,99</span>
                        <span className="absolute bottom-2 left-12 right-2 grid grid-cols-2 gap-1"><i className="h-7 rounded bg-white/90" /><i className="h-7 rounded bg-white/90" /></span>
                      </span>
                      <span className="block truncate px-2 py-1.5 text-xs font-medium">{design.title}</span>
                    </button>;
                  })}
                </div>
              </section>;
            })}
          </div>
          {!designsQuery.data?.length && <p className="text-sm text-muted-foreground">Carregando temas...</p>}
        </>}

        {activeSection === "products" && <>
          <div className="grid grid-cols-3 border-b"><button type="button" onClick={() => setProductTab("search")} className={`border-b-2 px-2 py-2 text-xs font-medium ${productTab === "search" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Buscar</button><button type="button" onClick={() => setProductTab("library")} className={`border-b-2 px-2 py-2 text-xs font-medium ${productTab === "library" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>Catálogo</button><button type="button" onClick={() => setProductTab("flyer")} className={`border-b-2 px-2 py-2 text-xs font-medium ${productTab === "flyer" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>No encarte ({editor.products.length})</button></div>
          {productTab === "search" && <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border bg-card focus-within:ring-2 focus-within:ring-primary/40">
              <Textarea className="min-h-44 resize-none border-0 text-sm shadow-none focus-visible:ring-0" aria-label="Lista de produtos" placeholder={"Cole sua lista de produtos aqui...\n\nExemplo:\nPão francês 9,90 kg\nPão de queijo 21,90 kg"} value={bulkProductText} onChange={event => setBulkProductText(event.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void importProductList(); } if (event.key === "Escape") setBulkProductText(""); }} />
              <div className="flex items-center justify-between border-t px-3 py-2"><span className="text-[11px] text-muted-foreground">Digite ou cole produtos</span><Button size="sm" disabled={bulkImporting || !bulkProductText.trim()} onClick={() => void importProductList()}>{bulkImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}{bulkImporting ? bulkProgress || "Buscando..." : "Buscar fotos"}</Button></div>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">Ctrl+Enter para buscar • Esc para limpar • até 50 produtos</p>
            <div className="rounded-lg bg-primary/10 p-3 text-xs text-primary">As fotos são buscadas automaticamente no catálogo conhecido do Encarte Fácil e no Open Food Facts. Cada imagem encontrada é salva na sua biblioteca.</div>
          </div>}
          {productTab !== "search" && <Input placeholder="Buscar produtos..." aria-label="Buscar produtos" value={productSearch} onChange={event => setProductSearch(event.target.value)} />}
          <div className="space-y-2 rounded-lg border p-3"><div className="flex items-center justify-between text-xs"><span className="font-medium">Organização do encarte</span><Button size="sm" variant="ghost" onClick={arrangeProducts}>Reorganizar</Button></div><div className="grid grid-cols-2 gap-2"><Button size="sm" variant={gridMode === "featured" ? "default" : "outline"} onClick={() => { setGridMode("featured"); editor.update({ products: layoutProductGrid(editor.products, columns, canvasWidth, canvasHeight, content, "featured") }); }}>Com destaque</Button><Button size="sm" variant={gridMode === "balanced" ? "default" : "outline"} onClick={() => { setGridMode("balanced"); editor.update({ products: layoutProductGrid(editor.products, columns, canvasWidth, canvasHeight, content, "balanced") }); }}>Uniforme</Button></div><label className="text-xs text-muted-foreground">Colunas<Input className="mt-1 h-8" type="number" min={1} max={8} value={columns} onChange={event => { const next = Math.min(8, Math.max(1, Number(event.target.value) || 1)); setColumns(next); if (editor.products.length) editor.update({ products: layoutProductGrid(editor.products, next, canvasWidth, canvasHeight, content, gridMode) }); }} /></label></div>
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{editor.products.length} no encarte</span><Link to="/products" className="text-primary">Gerenciar catálogo</Link></div>
          {productTab === "library" && <div className="space-y-2">{productsQuery.data?.products.filter(product => product.name.toLowerCase().includes(productSearch.toLowerCase())).map(product => <div key={product._key} className="flex w-full items-center gap-2 rounded-lg border p-2 text-sm hover:border-primary hover:bg-primary/5">
            <button type="button" disabled={findingImage === product._key} onClick={() => void addProduct(product._key)} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60">
              {product.image ? <img src={product.image} alt={product.name} className="h-14 w-14 rounded bg-white object-contain" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded bg-muted"><Package className="h-7 w-7 text-muted-foreground" /></span>}
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{product.name}</span><span className="text-primary">{formatCurrency(product.salePrice ?? product.price)}</span><span className="block text-[10px] text-muted-foreground">Clique para adicionar</span></span>
            </button>
            {!product.image && <Button size="sm" variant="outline" disabled={findingImage === product._key} onClick={() => void findProductImage(product._key)}>{findingImage === product._key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}Buscar foto</Button>}
          </div>)}</div>}
          {productTab === "flyer" && <div className="space-y-2">{editor.products.filter(product => (product.name ?? "").toLowerCase().includes(productSearch.toLowerCase())).map(product => <div key={product.id} className="flex items-center gap-2 rounded-lg border p-2"><button type="button" className="min-w-0 flex-1 text-left" onClick={() => editor.select(product.id, "product")}><span className="block truncate text-sm font-medium">{product.name}</span><span className="text-xs text-muted-foreground">{formatCurrency(product.salePrice ?? product.price ?? 0)}</span></button><Button size="sm" variant="ghost" onClick={() => editor.update({ products: editor.products.filter(item => item.id !== product.id) })}>Remover</Button></div>)}{!editor.products.length && <p className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">Nenhum produto no encarte.</p>}{editor.products.length > 0 && <Button variant="outline" className="w-full text-destructive" onClick={() => editor.update({ products: [] })}>Limpar todos</Button>}</div>}
        </>}

        {activeSection === "elements" && <>
          <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={addText}><Type className="h-4 w-4" />Texto</Button><Button variant="outline" onClick={addShape}><Square className="h-4 w-4" />Forma</Button></div>
          <Input placeholder="Buscar elementos..." aria-label="Buscar elementos" value={elementSearch} onChange={event => setElementSearch(event.target.value)} />
          <div className="flex gap-2 overflow-x-auto pb-1">{["all", ...Array.from(new Set(catalogElements.map(item => item.category)))].map(category => <Button key={category} size="sm" variant={elementCategory === category ? "default" : "outline"} onClick={() => setElementCategory(category)}>{ELEMENT_CATEGORY_LABELS[category] ?? category}</Button>)}</div>
          <div className="grid grid-cols-2 gap-2">{catalogElements.filter(item => (elementCategory === "all" || item.category === elementCategory) && item.title.toLocaleLowerCase("pt-BR").includes(elementSearch.toLocaleLowerCase("pt-BR"))).map(item => <button key={item._key} type="button" onClick={() => addCatalogElement(item)} className="min-h-24 rounded-lg border bg-muted/30 p-3 text-left text-xs hover:border-primary hover:bg-primary/5"><Shapes className="mb-3 h-6 w-6 text-primary" /><span className="block font-medium">{item.title}</span><span className="text-muted-foreground">{item.category}</span></button>)}</div>
          <Separator />
          <div><h3 className="mb-2 text-sm font-medium">Minhas imagens</h3><MediaLibrary onSelect={insertAsset} /></div>
        </>}

        {activeSection === "tags" && <>
          <p className="text-sm text-muted-foreground">Sem produto selecionado, a alteração é aplicada em todos. Selecione um produto no canvas para editar somente ele.</p>
          <div className="grid grid-cols-3 rounded-lg bg-muted p-1">{([['shapes','Formas'],['style','Estilo'],['colors','Cores']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTagTab(value)} className={`rounded-md px-2 py-2 text-xs font-medium ${tagTab === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>)}</div>
          {tagTab === "shapes" && <div className="grid grid-cols-2 gap-3">{TAG_SHAPES.map(([shape, label]) => <button key={shape} type="button" onClick={() => applyTagPatch({ tagShape: shape })} className="rounded-xl border p-3 hover:border-primary"><span className="mx-auto mb-3 grid h-20 w-24 place-items-center bg-primary font-black text-primary-foreground" style={{ borderRadius: shape === "circle" ? "50%" : shape === "pill" ? 999 : shape === "square" ? 3 : 10, clipPath: shape === "burst" ? "polygon(50% 0%,61% 18%,79% 7%,82% 29%,100% 35%,86% 50%,100% 65%,79% 71%,79% 93%,61% 82%,50% 100%,39% 82%,21% 93%,21% 71%,0 65%,14% 50%,0 35%,18% 29%,21% 7%,39% 18%)" : shape === "ticket" ? "polygon(0 0,100% 0,100% 35%,92% 50%,100% 65%,100% 100%,0 100%,0 65%,8% 50%,0 35%)" : undefined }}>9,99</span><span className="text-sm font-medium">{label}</span></button>)}</div>}
          {tagTab === "style" && <><p className="text-xs text-muted-foreground">Escolha um estilo pronto</p><div className="grid grid-cols-2 gap-3">{TAG_STYLES.map(([style, label]) => <button key={style} type="button" onClick={() => applyTagPatch({ tagStyle: style })} className="rounded-xl border p-3 hover:border-primary"><span className={`mx-auto mb-3 block rounded-full px-3 py-3 font-black ${style === "outline" ? "border-2 border-primary text-primary" : "bg-primary text-primary-foreground"}`} style={{ background: style === "gradient" ? "linear-gradient(135deg,#29d19c,#111827)" : undefined, boxShadow: style === "shadow" ? "0 5px 0 #166b50" : undefined }}>R$ 9,99</span><span className="text-sm font-medium">{label}</span></button>)}</div><Separator /><p className="text-sm font-medium">Presets completos</p><div className="grid grid-cols-2 gap-2">{TAG_PRESETS.map(preset => <Button key={preset.name} variant="outline" size="sm" onClick={() => applyTagPreset(preset)}>{preset.name}</Button>)}</div></>}
          {tagTab === "colors" && <><div className="rounded-xl border p-5 text-center"><span className="inline-block rounded-full bg-red-500 px-5 py-3 text-xl font-black text-white">R$ 9,99</span></div><div><label className="mb-2 block text-xs text-muted-foreground">Sugestões</label><div className="grid grid-cols-4 gap-2">{TAG_COLORS.map(([tag, text, label]) => <button key={tag} type="button" title={label} aria-label={label} onClick={() => applyTagPatch({ tagColor: tag, textColor: text })} className="aspect-square rounded-lg border-2 text-xs font-bold shadow-sm hover:scale-105" style={{ backgroundColor: tag, color: text }}>Aa</button>)}</div></div><div className="grid grid-cols-2 gap-2"><label className="text-xs">Cor da tag<Input type="color" className="h-12 p-1" defaultValue="#ef4444" onChange={event => applyTagPatch({ tagColor: event.target.value })} /></label><label className="text-xs">Cor do texto<Input type="color" className="h-12 p-1" defaultValue="#ffffff" onChange={event => applyTagPatch({ textColor: event.target.value })} /></label></div></>}
          {!editor.products.length && <p className="rounded-lg bg-muted p-3 text-sm">Adicione produtos para aplicar uma tag.</p>}
        </>}

        {activeSection === "formats" && <>
          <div><p className="mb-2 text-sm font-medium">Tipo de material</p><div className="grid grid-cols-2 gap-2">{([['flyer','Encarte'],['poster','Cartaz'],['shelf_label','Etiqueta'],['video','Vídeo']] as const).map(([value, label]) => <Button key={value} size="sm" variant={content === value ? "default" : "outline"} onClick={() => { setContent(value); if (editor.products.length) editor.update({ products: layoutProductGrid(editor.products, columns, canvasWidth, canvasHeight, value, gridMode) }); }}>{label}</Button>)}</div></div>
          {content === "shelf_label" && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Cada produto vira uma etiqueta, uma por página. No download, elas são organizadas automaticamente em folhas A4.</p>}
          {content === "poster" && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Cartaz de oferta com um produto em destaque, pronto para impressão.</p>}
          {content === "video" && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Crie uma peça animada para TV, Reels ou Story e exporte em MP4.</p>}
          <div><p className="mb-2 text-sm font-medium">Formato</p><div className="grid grid-cols-2 gap-2">{formatsQuery.data?.map(item => <button key={item._key} type="button" onClick={() => { setFormatCode(item.code); if (editor.products.length) editor.update({ products: layoutProductGrid(editor.products, columns, item.width, item.height, content, gridMode) }); }} className={`rounded-xl border p-3 text-left ${formatCode === item.code ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary"}`}><span className="mb-2 block h-14 rounded border bg-muted" style={{ aspectRatio: `${item.width}/${item.height}`, maxWidth: 70 }} /><span className="block text-sm font-medium">{item.title}</span><span className="text-[11px] text-muted-foreground">{item.width} × {item.height} px</span></button>)}</div></div>
          <Button variant="outline" className="w-full" onClick={() => editor.setZoom(Math.min(1, 500 / canvasWidth, 650 / canvasHeight))}>Ajustar à tela</Button>
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

  return <div className="flex h-full min-h-[650px] flex-col">
    <div className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-2 dark:bg-slate-950">
      <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => { void persist(false).then(() => { window.location.assign("/flyers"); }).catch(() => {}); }}><ArrowLeft className="h-4 w-4" /></Button>
      <Input className="h-9 max-w-xs" value={name} maxLength={160} onChange={e => setName(e.target.value)} aria-label="Nome do encarte" />
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="icon" onClick={editor.undo} disabled={!editor.canUndo} aria-label="Desfazer"><Undo2 className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" onClick={editor.redo} disabled={!editor.canRedo} aria-label="Refazer"><Redo2 className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => editor.setZoom(Math.max(.1, editor.zoom - .1))} aria-label="Reduzir zoom"><ZoomOut className="h-4 w-4" /></Button>
      <span className="w-12 text-center text-xs">{Math.round(editor.zoom * 100)}%</span>
      <Button variant="ghost" size="icon" onClick={() => editor.setZoom(Math.min(2, editor.zoom + .1))} aria-label="Aumentar zoom"><ZoomIn className="h-4 w-4" /></Button>
      <Button variant="outline" disabled={saving} onClick={() => void persist().catch(() => {})}><Save className="h-4 w-4" />Salvar</Button>
      <Button variant="outline" onClick={() => void handleShare()}>Copiar link público</Button>
      {flyer.public && <Button variant="ghost" onClick={() => void updateFlyer.mutateAsync({ id: id!, payload: { public: false } }).then(() => toast.success("Link público desativado")).catch(e => toast.error(String(e)))}>Desativar link</Button>}
      <DropdownMenu><DropdownMenuTrigger asChild><Button disabled={exporting}>{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Exportar</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">{(["png", "jpeg", "pdf", "svg", "mp4"] as const).map(f => <DropdownMenuItem key={f} onSelect={() => void handleExport(f)}>{f === "mp4" ? "Vídeo MP4 (6 segundos)" : f.toUpperCase()}</DropdownMenuItem>)}</DropdownMenuContent>
      </DropdownMenu>
      <span role="status" className={`ml-auto text-xs ${saveError ? "text-red-600" : "text-muted-foreground"}`}>{saveError || (saving ? "Salvando..." : signature !== savedSignature.current ? "Alterações não salvas" : "Salvo")}</span>
    </div>
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/30 pb-12 lg:pb-0">
      <nav aria-label="Seções do editor" className="hidden w-16 shrink-0 flex-col border-r bg-background lg:flex">
        {EDITOR_SECTIONS.map(section => { const Icon = section.icon; const selected = activeSection === section.id && panelOpen; return <button key={section.id} type="button" onClick={() => openSection(section.id)} aria-pressed={selected} className={`flex h-16 flex-col items-center justify-center gap-1 border-b text-[10px] transition ${selected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-5 w-5" /><span>{section.label}</span></button>; })}
      </nav>
      {panelOpen && <aside className="fixed inset-x-0 bottom-12 z-30 max-h-[65vh] overflow-y-auto rounded-t-2xl border-t bg-background shadow-2xl lg:static lg:z-auto lg:max-h-none lg:w-[396px] lg:shrink-0 lg:rounded-none lg:border-r lg:border-t-0 lg:shadow-none">{renderSectionPanel()}</aside>}
      <section className="min-h-0 min-w-[320px] flex-1 overflow-hidden"><FlyerCanvas width={canvasWidth} height={canvasHeight} zoom={editor.zoom} backgroundColor={editor.backgroundColor}
        elements={editor.elements} products={editor.products} footer={editor.footer} selectedId={editor.selectedId} selectedKind={editor.selectedKind}
        onSelect={editor.select} onChangeElement={handleChangeElement} onChangeProduct={handleChangeProduct} /></section>
      <aside className="hidden min-h-0 w-[280px] shrink-0 overflow-y-auto border-l bg-background xl:block">
        <InspectorPanel element={selectedElement} product={selectedProduct}
          onChangeElement={(patch, final) => selectedElement && handleChangeElement(selectedElement.id, patch, final)}
          onChangeProduct={(patch, final) => selectedProduct && handleChangeProduct(selectedProduct.id, patch, final)}
          onDelete={editor.removeSelected} onDuplicate={editor.duplicateSelected} onMoveLayer={editor.moveLayer} />
      </aside>
      <nav aria-label="Seções do editor" className="fixed inset-x-0 bottom-0 z-40 flex h-12 overflow-x-auto border-t bg-background lg:hidden">
        {EDITOR_SECTIONS.map(section => { const Icon = section.icon; const selected = activeSection === section.id && panelOpen; return <button key={section.id} type="button" onClick={() => openSection(section.id)} aria-pressed={selected} className={`flex min-w-[68px] flex-1 flex-col items-center justify-center gap-0.5 text-[9px] ${selected ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}><Icon className="h-4 w-4" /><span>{section.label}</span></button>; })}
      </nav>
    </div>
  </div>;
}
