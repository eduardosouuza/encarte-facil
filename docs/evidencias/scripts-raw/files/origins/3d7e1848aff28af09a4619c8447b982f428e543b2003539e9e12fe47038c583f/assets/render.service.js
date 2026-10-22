import sharp from "sharp";
import PDFDocument from "pdfkit";
import { getDb } from "../db/connection.js";
import { ApiError } from "../lib/http.js";
import { newId } from "../lib/ids.js";
import { nowIso } from "../lib/time.js";
import { renderFlyerToSvg } from "../lib/svg.js";
import { getFlyerRow, toFlyerDto } from "./flyer.service.js";
import { renderVideo } from "../lib/video.js";
export function renderDocument(userId, flyerId) {
    const row = getFlyerRow(userId, flyerId);
    if (!row)
        throw ApiError.notFound("Encarte não encontrado");
    const flyer = toFlyerDto(row);
    const size = getDb().prepare("SELECT width,height FROM formats WHERE id = ? OR code = ?").get(flyer.format, flyer.format);
    const width = size?.width ?? 1080, height = size?.height ?? 1350;
    const imageData = (url) => {
        if (!url)
            return undefined;
        if (typeof url !== "string")
            throw ApiError.badRequest("Imagem inválida");
        const match = /^\/api\/assets\/([^/]+)\/file$/.exec(url);
        if (match) {
            const asset = getDb().prepare("SELECT data,content_type FROM assets WHERE id = ? AND user_id = ?").get(match[1], userId);
            if (!asset)
                throw ApiError.badRequest("Uma imagem foi removida da biblioteca. Substitua-a antes de exportar.");
            return `data:${asset.content_type};base64,${Buffer.from(asset.data).toString("base64")}`;
        }
        if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url))
            return url;
        throw ApiError.badRequest("Importe as imagens externas na biblioteca antes de exportar.");
    };
    const elements = flyer.elements.map(e => ({ ...e, image: imageData(e.image || e.asset), asset: undefined }));
    const products = flyer.products.map(p => ({ ...p, image: imageData(p.image) }));
    const svg = renderFlyerToSvg({ ...flyer, width, height, elements, products });
    return { svg, width, height, flyer };
}
export async function createExport(userId, flyerId, format, existingId, duration = 6) {
    const db = getDb(), id = existingId ?? newId(), now = nowIso();
    if (!getFlyerRow(userId, flyerId))
        throw ApiError.notFound("Encarte não encontrado");
    if (existingId) {
        db.prepare("UPDATE exports SET status='processing',progress=0,error=NULL,updated_at=? WHERE id=? AND user_id=?").run(now, id, userId);
    }
    else {
        db.prepare("INSERT INTO exports(id,user_id,flyer_id,kind,format,status,progress,created_at,updated_at) VALUES(?,?,?,?,?,'processing',0,?,?)").run(id, userId, flyerId, format === "mp4" ? "video" : "image", format, now, now);
    }
    try {
        const { svg, width, height } = renderDocument(userId, flyerId);
        let bytes;
        const contentType = { svg: "image/svg+xml", png: "image/png", jpeg: "image/jpeg", pdf: "application/pdf", mp4: "video/mp4" }[format];
        if (format === "svg")
            bytes = Buffer.from(svg);
        else if (format === "mp4")
            bytes = await renderVideo(svg, duration);
        else {
            const raster = sharp(Buffer.from(svg), { limitInputPixels: 25_000_000 });
            if (format === "jpeg")
                bytes = await raster.flatten({ background: "#ffffff" }).jpeg({ quality: 95 }).toBuffer();
            else {
                const png = await raster.png().toBuffer();
                if (format === "png")
                    bytes = png;
                else
                    bytes = await new Promise((resolve, reject) => {
                        const doc = new PDFDocument({ size: [width * 0.75, height * 0.75], margin: 0 });
                        const chunks = [];
                        doc.on("data", b => chunks.push(b));
                        doc.on("end", () => resolve(Buffer.concat(chunks)));
                        doc.on("error", reject);
                        doc.image(png, 0, 0, { width: width * 0.75, height: height * 0.75 });
                        doc.end();
                    });
            }
        }
        const fileUrl = `/api/exports/${id}/file`;
        db.prepare("INSERT INTO export_files(export_id,content_type,data) VALUES(?,?,?) ON CONFLICT(export_id) DO UPDATE SET content_type=excluded.content_type,data=excluded.data").run(id, contentType, bytes);
        db.prepare("UPDATE exports SET status='completed', progress=100, file_url=?, updated_at=? WHERE id=?").run(fileUrl, nowIso(), id);
        return { id, status: "completed", format, fileUrl, svg };
    }
    catch (error) {
        db.prepare("UPDATE exports SET status='failed',error=?,updated_at=? WHERE id=?").run(error instanceof Error ? error.message : "Falha ao renderizar", nowIso(), id);
        throw error;
    }
}
