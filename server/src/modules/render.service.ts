import sharp from "sharp";
import { exportArtworkOptions } from "../lib/export-fonts.js";
import PDFDocument from "pdfkit";
import { getDb } from "../db/connection.js";
import { ApiError } from "../lib/http.js";
import { newId } from "../lib/ids.js";
import { nowIso } from "../lib/time.js";
import { renderFlyerToSvg, type RenderElement, type RenderProduct } from "../lib/svg.js";
import { getFlyerRow, toFlyerDto } from "./flyer.service.js";
import { renderVideo } from "../lib/video.js";
import { allowedProductImageUrl } from "./original-product-images.js";

export type ExportFormat = "svg" | "png" | "jpeg" | "pdf" | "mp4";
export async function renderDocument(userId: string, flyerId: string) {
  const row = getFlyerRow(userId, flyerId);
  if (!row) throw ApiError.notFound("Encarte não encontrado");
  const flyer = toFlyerDto(row);
  const size = getDb().prepare("SELECT width,height FROM formats WHERE id = ? OR code = ?").get(flyer.format, flyer.format) as { width: number; height: number } | undefined;
  const width = size?.width ?? 1080, height = size?.height ?? 1350;
  const pendingImages = new Map<string, Promise<string>>();
  const imageData = async (url: unknown): Promise<string | undefined> => {
    if (!url) return undefined;
    if (typeof url !== "string") throw ApiError.badRequest("Imagem inválida");
    const match = /^\/api\/assets\/([^/]+)\/file$/.exec(url);
    if (match) {
      const asset = getDb().prepare("SELECT data,content_type FROM assets WHERE id = ? AND user_id = ?").get(match[1]!, userId) as { data: Uint8Array; content_type: string } | undefined;
      if (!asset) throw ApiError.badRequest("Uma imagem foi removida da biblioteca. Substitua-a antes de exportar.");
      return `data:${asset.content_type};base64,${Buffer.from(asset.data).toString("base64")}`;
    }
    if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url)) return url;
    if (allowedProductImageUrl(url)) {
      let pending = pendingImages.get(url);
      if (!pending) {
        pending = (async () => {
          const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8000) });
          if (!response.ok) throw new ApiError(502, "Não foi possível carregar uma imagem do catálogo.");
          if (Number(response.headers.get("content-length")) > 5_000_000) throw ApiError.badRequest("Imagem excede 5 MB.");
          const chunks: Uint8Array[] = [];
          let length = 0;
          if (!response.body) throw new ApiError(502, "Imagem do catálogo vazia.");
          for await (const chunk of response.body) {
            length += chunk.length;
            if (length > 5_000_000) throw ApiError.badRequest("Imagem excede 5 MB.");
            chunks.push(chunk);
          }
          const png = await sharp(Buffer.concat(chunks), { limitInputPixels: 25_000_000 }).png().toBuffer();
          return `data:image/png;base64,${png.toString("base64")}`;
        })();
        pendingImages.set(url, pending);
      }
      return pending;
    }
    throw ApiError.badRequest("Importe as imagens externas na biblioteca antes de exportar.");
  };
  const elements = await Promise.all((flyer.elements as RenderElement[]).map(async e => ({ ...e, image: await imageData(e.image || e.asset), asset: undefined })));
  const products = await Promise.all((flyer.products as RenderProduct[]).map(async p => ({ ...p, image: await imageData(p.image) })));
  const capacity = Math.max(1, Math.min(400, Math.floor(Number(flyer.grid?.productsPerPage) || products.length || 1)));
  const pages = Array.from({ length: Math.max(1, Math.ceil(products.length / capacity)) }, (_, index) =>
    renderFlyerToSvg({ ...flyer, width, height, elements, products: products.slice(index * capacity, (index + 1) * capacity) } as Parameters<typeof renderFlyerToSvg>[0], { ...exportArtworkOptions, idPrefix: `page-${index}-` }));
  const svg = pages.length === 1 ? pages[0]! : `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height * pages.length}" viewBox="0 0 ${width} ${height * pages.length}">${pages.map((page, index) => page.replace("<svg ", `<svg y="${index * height}" `)).join("")}</svg>`;
  return { svg, pages, width, height, flyer };
}

export async function createExport(userId: string, flyerId: string, format: ExportFormat, existingId?: string, duration = 6, pageIndex?: number): Promise<{ id: string; status: string; format: ExportFormat; fileUrl: string; files: string[]; svg: string }> {
  const db = getDb(), id = existingId ?? newId(), now = nowIso();
  if (!getFlyerRow(userId, flyerId)) throw ApiError.notFound("Encarte não encontrado");
  if (existingId) {
    db.prepare("UPDATE exports SET status='processing',progress=0,error=NULL,updated_at=? WHERE id=? AND user_id=?").run(now, id, userId);
  } else {
    db.prepare("INSERT INTO exports(id,user_id,flyer_id,kind,format,status,progress,created_at,updated_at) VALUES(?,?,?,?,?,'processing',0,?,?)").run(id, userId, flyerId, format === "mp4" ? "video" : "image", format, now, now);
  }
  try {
    const { pages, width, height } = await renderDocument(userId, flyerId);
    if (pageIndex !== undefined && (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pages.length)) throw ApiError.badRequest("Página inválida.");
    const selectedPages = pageIndex === undefined ? pages : [pages[pageIndex]!];
    const svg = selectedPages[0]!;
    const contentType = { svg: "image/svg+xml", png: "image/png", jpeg: "image/jpeg", pdf: "application/pdf", mp4: "video/mp4" }[format];
    const files: string[] = [];
    const storeFile = (exportId: string, bytes: Buffer) => {
      const url = `/api/exports/${exportId}/file`;
      db.prepare("INSERT INTO export_files(export_id,content_type,data) VALUES(?,?,?) ON CONFLICT(export_id) DO UPDATE SET content_type=excluded.content_type,data=excluded.data").run(exportId, contentType, bytes);
      db.prepare("UPDATE exports SET status='completed', progress=100, file_url=?, updated_at=? WHERE id=?").run(url, nowIso(), exportId);
      files.push(url);
    };
    if (format === "mp4") storeFile(id, await renderVideo(selectedPages, duration));
    else if (format === "pdf") {
      const images: Buffer[] = [];
      for (const page of selectedPages) images.push(await sharp(Buffer.from(page), { limitInputPixels: 25_000_000 }).png().toBuffer());
      const bytes = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ size: [width * .75, height * .75], margin: 0 });
        const chunks: Buffer[] = [];
        doc.on("data", chunk => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
        images.forEach((image, index) => {
          if (index > 0) doc.addPage();
          doc.image(image, 0, 0, { width: width * .75, height: height * .75 });
        });
        doc.end();
      });
      storeFile(id, bytes);
    } else {
      // Resolve images and snapshot the document once. All pages belong to the
      // same revision, even if another editor saves while this job is running.
      for (const [index, page] of selectedPages.entries()) {
        const bytes = format === "svg" ? Buffer.from(page) : format === "jpeg"
          ? await sharp(Buffer.from(page), { limitInputPixels: 25_000_000 }).flatten({ background: "#ffffff" }).jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer()
          : await sharp(Buffer.from(page), { limitInputPixels: 25_000_000 }).png().toBuffer();
        const exportId = index === 0 ? id : newId();
        if (index > 0) db.prepare("INSERT INTO exports(id,user_id,flyer_id,kind,format,status,progress,created_at,updated_at) VALUES(?,?,?,?,?,'processing',0,?,?)").run(exportId, userId, flyerId, "image", format, now, now);
        storeFile(exportId, bytes);
      }
    }
    const fileUrl = files[0]!;
    return { id, status: "completed", format, fileUrl, files, svg };
  } catch (error) {
    db.prepare("UPDATE exports SET status='failed',error=?,updated_at=? WHERE id=?").run(error instanceof Error ? error.message : "Falha ao renderizar", nowIso(), id);
    throw error;
  }
}
