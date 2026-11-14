export function parsePrice(value: string): number | null {
  const raw = value.trim().replace(/^R\$\s*/, "");
  if (!raw || !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$|^\d+\.\d{1,2}$/.test(raw)) return null;
  const normalized = raw.includes(",") || /^\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 && price <= 1_000_000 ? price : null;
}
