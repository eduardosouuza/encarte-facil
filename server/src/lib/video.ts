import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string | null;

export async function renderVideo(svg: string, duration = 6): Promise<Buffer> {
  if (!ffmpeg) throw new Error("FFmpeg não está disponível nesta plataforma.");
  const directory = await mkdtemp(path.join(os.tmpdir(), "encarte-video-"));
  const resolved = path.resolve(directory);
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith("encarte-video-")) {
    throw new Error("Diretório temporário inesperado");
  }
  try {
    const input = path.join(directory, "frame.png"), output = path.join(directory, "video.mp4");
    await writeFile(input, await sharp(Buffer.from(svg)).resize(1080, 1920, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).png().toBuffer());
    await new Promise<void>((resolve, reject) => {
      const child = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-loop", "1", "-i", input,
        "-t", String(duration), "-r", "24", "-vf", `pad=ceil(iw/2)*2:ceil(ih/2)*2,fade=t=in:st=0:d=0.4,fade=t=out:st=${duration - .4}:d=0.4`,
        "-c:v", "libx264", "-threads", "2", "-preset", "fast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-y", output],
      { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      child.stderr.on("data", chunk => { stderr = (stderr + chunk.toString()).slice(-2000); });
      const timeout = setTimeout(() => { child.kill(); reject(new Error("Tempo limite da exportação em vídeo excedido.")); }, 120_000);
      child.on("error", error => { clearTimeout(timeout); reject(error); });
      child.on("close", code => { clearTimeout(timeout); if (code === 0) resolve(); else reject(new Error(`Falha ao gerar vídeo: ${stderr}`)); });
    });
    return await readFile(output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
