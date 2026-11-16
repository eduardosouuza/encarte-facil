import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string | null;

export async function renderVideo(source: string | string[], duration = 6): Promise<Buffer> {
  if (!ffmpeg) throw new Error("FFmpeg não está disponível nesta plataforma.");
  const directory = await mkdtemp(path.join(os.tmpdir(), "encarte-video-"));
  const resolved = path.resolve(directory);
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith("encarte-video-")) {
    throw new Error("Diretório temporário inesperado");
  }
  try {
    const pages = Array.isArray(source) ? source : [source];
    if (!pages.length) throw new Error("O vídeo precisa de pelo menos uma página.");
    const output = path.join(directory, "video.mp4");
    for (const [index, svg] of pages.entries()) {
      const frame = await sharp(Buffer.from(svg), { limitInputPixels: 25_000_000 }).resize(3840, 3840, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).png().toBuffer();
      await writeFile(path.join(directory, `frame-${String(index).padStart(4, "0")}.png`), frame);
    }
    await new Promise<void>((resolve, reject) => {
      const child = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-framerate", `1/${duration}`, "-i", path.join(directory, "frame-%04d.png"),
        "-t", String(duration * pages.length), "-vf", "fps=24,pad=ceil(iw/2)*2:ceil(ih/2)*2:color=white",
        "-c:v", "libx264", "-threads", "2", "-preset", "fast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-y", output],
      { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      child.stderr.on("data", chunk => { stderr = (stderr + chunk.toString()).slice(-2000); });
      const timeout = setTimeout(() => { child.kill(); reject(new Error("Tempo limite da exportação em vídeo excedido.")); }, Math.max(120_000, pages.length * 30_000));
      child.on("error", error => { clearTimeout(timeout); reject(error); });
      child.on("close", code => { clearTimeout(timeout); if (code === 0) resolve(); else reject(new Error(`Falha ao gerar vídeo: ${stderr}`)); });
    });
    return await readFile(output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
