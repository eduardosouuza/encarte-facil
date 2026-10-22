import { storage } from "./api";
export async function downloadFile(url: string, name: string) {
  if (!url.startsWith("/api/")) throw new Error("Arquivo inválido");
  const token = storage.getToken();
  const response = await fetch(url, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error("Não foi possível baixar o arquivo.");
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
