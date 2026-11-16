import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
async function compare(actual: Buffer, reference: Buffer, tolerance: number) {
  const a = await sharp(actual).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(reference).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  expect([a.info.width, a.info.height]).toEqual([b.info.width, b.info.height]);
  let total = 0, changed = 0;
  for (let index = 0; index < a.data.length; index += 3) {
    const error = Math.max(...[0, 1, 2].map(channel => Math.abs(a.data[index + channel]! - b.data[index + channel]!)));
    total += error;
    if (error > 32) changed++;
  }
  const result = { mean: total / (a.data.length / 3), changed: changed / (a.data.length / 3) };
  expect(result.mean).toBeLessThan(tolerance);
  expect(result.changed).toBeLessThan(.025);
  return result;
}

test("exporta a mesma arte em SVG, PNG, JPEG, PDF e todas as páginas do MP4", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 2048, height: 1800 });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL ?? "demo@encartefacil.com");
  await page.getByLabel("Senha").fill(process.env.E2E_PASSWORD ?? "demo12345");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/flyers");
  const token = await page.evaluate(() => localStorage.getItem("@encartefacil:token"));
  const headers = { Authorization: `Bearer ${token}` };
  const imageData = `data:image/png;base64,${(await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#22c55e"/><circle cx="80" cy="45" r="38" fill="#facc15"/><rect x="70" width="20" height="90" fill="#2563eb"/></svg>')).png().toBuffer()).toString("base64")}`;
  const upload = await page.request.post("/api/assets/upload", { headers, data: { image: imageData, name: "QA fidelidade" } });
  expect(upload.ok()).toBeTruthy();
  const { asset } = await upload.json();
  const image = asset.imageUrl;
  const shapes = ["pill", "burst", "ticket", "circle", "square"];
  const styles = ["solid", "gradient", "outline", "shadow", "solid"];
  const response = await page.request.post("/api/flyers", { headers, data: {
    name: "QA fidelidade exportação", format: "vertical", backgroundColor: "#fff7ed",
    grid: { productsPerPage: 5, columns: 3, mode: "balanced" },
    elements: [
      { id: "cover", type: "image", image, imageFit: "cover", x: 20, y: 20, width: 250, height: 180, zIndex: 1 },
      { id: "headline", type: "text", text: "Ofertas da semana\nPreço baixo e qualidade!", x: 300, y: 20, width: 750, height: 170, zIndex: 2, textStyle: { fontFamily: "Oswald", fontSize: 56, fontWeight: 700, color: "#14532d" } },
      { id: "above", type: "text", text: "ESPECIAL", x: 60, y: 270, width: 240, height: 65, zIndex: 800, rotation: -10, opacity: .8, backgroundColor: "#facc15", textStyle: { fontFamily: "Montserrat", fontSize: 28, fontWeight: 700, fontStyle: "italic", textDecoration: "underline" } },
      { id: "star", type: "shape", subtype: "star", x: 900, y: 1100, width: 130, height: 160, zIndex: 50, backgroundColor: "#f97316", rotation: 15 },
    ],
    products: Array.from({ length: 10 }, (_, i) => ({ id: `fidelity-${i}`, name: `Café especial ${i} com descrição longa para truncar`, image,
      price: 19.99, salePrice: i % 2 ? null : 9.99, unit: "500 g", x: 40 + (i % 5 % 3) * 335, y: i % 5 < 3 ? 240 : 720,
      width: 300, height: 420, tagShape: shapes[i % 5], tagStyle: styles[i % 5], tagColor: i < 5 ? "#dc2626" : "#2563eb", borderWidth: i % 3, borderRadius: 22,
      isHighlighted: i === 1, cardShadow: i !== 4, rotation: i === 3 ? 3 : 0 })),
    footer: { visible: true, elements: ["Ofertas válidas até domingo", "Mercado São João • Rua das Flores, 123"] },
  } });
  expect(response.ok(), await response.text()).toBeTruthy();
  const { flyer } = await response.json();
  const screenshots: Buffer[] = [], exports: Record<string, Buffer[]> = {}, metrics: Record<string, unknown> = {};
  try {
    await page.goto(`/editor/${flyer._key}`);
    await page.getByRole("button", { name: "Recolher painéis", exact: true }).click();
    await page.getByRole("button", { name: "Zoom 100%", exact: true }).click();
    for (let index = 0; index < 2; index++) {
      await page.getByRole("button", { name: `Visualizar página ${index + 1}`, exact: true }).click();
      await expect(page.getByText(`Folha ${index + 1} de 2`, { exact: true })).toBeVisible();
      await page.evaluate(async () => { await document.fonts.ready; });
      await expect(page.getByTestId(`product-fidelity-${index * 5}`)).toBeVisible();
      screenshots.push(await page.getByTestId("flyer-canvas").screenshot({ path: testInfo.outputPath(`editor-${index + 1}.png`) }));
    }
    for (const format of ["svg", "png", "jpeg", "pdf", "mp4"]) {
      const job = await page.request.post(`/api/flyers/${flyer._key}/${format === "mp4" ? "render-video" : "render"}`, { headers, data: { format, duration: 3 } });
      expect(job.ok(), await job.text()).toBeTruthy();
      const { export: result } = await job.json();
      expect(result.files).toHaveLength(format === "pdf" || format === "mp4" ? 1 : 2);
      exports[format] = [];
      for (const [index, url] of result.files.entries()) {
        const bytes = await (await page.request.get(url, { headers })).body();
        exports[format]!.push(bytes);
        await writeFile(testInfo.outputPath(`export-${index + 1}.${format}`), bytes);
        if (["svg", "png", "jpeg"].includes(format)) metrics[`${format}-${index}`] = await compare(bytes, screenshots[index]!, 3);
      }
    }
    // PDFKit embeds the page PNGs losslessly. Inspect those actual RGB streams,
    // along with the page geometry, rather than only checking the PDF signature.
    const pdf = exports.pdf![0]!, pdfText = pdf.toString("latin1");
    expect(pdfText.match(/\/Type \/Page\b/g)).toHaveLength(2);
    expect(pdfText.match(/\/MediaBox \[0 0 810 1012\.5\]/g)).toHaveLength(2);
    const pdfImages = new Map<number, Buffer>();
    for (const match of pdfText.matchAll(/(\d+) 0 obj\s*(<<(?:(?!endobj)[\s\S])*?>>)\s*stream\r?\n/g)) {
      const dict = match[2]!;
      if (!dict.includes("/Subtype /Image") || !dict.includes("/ColorSpace /DeviceRGB")) continue;
      const length = Number(/\/Length (\d+)/.exec(dict)![1]);
      const start = match.index! + match[0].length;
      const pixels = inflateSync(pdf.subarray(start, start + length));
      expect(pixels.length).toBe(1080 * 1350 * 3);
      const png = await sharp(pixels, { raw: { width: 1080, height: 1350, channels: 3 } }).png().toBuffer();
      pdfImages.set(Number(match[1]), png);
    }
    const references = [...pdfText.matchAll(/\/I(\d+) (\d+) 0 R/g)].sort((a, b) => Number(a[1]) - Number(b[1]));
    expect(references).toHaveLength(2);
    for (const [index, reference] of references.entries()) metrics[`pdf-${index}`] = await compare(pdfImages.get(Number(reference[2]))!, screenshots[index]!, 3);
    for (let index = 0; index < 2; index++) {
      const decoded = spawnSync(ffmpeg, ["-v", "error", "-ss", String(index * 3 + 1), "-i", testInfo.outputPath("export-1.mp4"), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "pipe:1"], { windowsHide: true, maxBuffer: 20_000_000 });
      expect(decoded.status, decoded.stderr.toString()).toBe(0);
      await writeFile(testInfo.outputPath(`video-page-${index + 1}.png`), decoded.stdout);
      // PNG already passed comparison with the editor. Compare codec loss to
      // that same raster so browser antialiasing is not counted twice.
      metrics[`mp4-${index}`] = await compare(decoded.stdout, exports.png![index]!, 4);
    }
    await writeFile(testInfo.outputPath("fidelity.json"), JSON.stringify(metrics, null, 2));
  } finally {
    await page.request.delete(`/api/flyers/${flyer._key}`, { headers });
    await page.request.delete(`/api/assets/${asset._key}`, { headers });
  }
});
