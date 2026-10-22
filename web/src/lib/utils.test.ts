import { describe, expect, it } from "vitest";
import { cn, formatCurrency, formatRelativeTime, initials } from "@/lib/utils";

describe("cn", () => {
  it("concatena classes", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("remove classes conflitantes do tailwind-merge", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatCurrency", () => {
  it("formata valores em BRL", () => {
    expect(formatCurrency(12.5)).toContain("12,50");
  });
});

describe("initials", () => {
  it("usa as duas primeiras palavras", () => {
    expect(initials("Maria Silva Santos")).toBe("MS");
  });

  it("lida com nome unico", () => {
    expect(initials("Maria")).toBe("M");
  });
});

describe("formatRelativeTime", () => {
  it("devolve 'agora' para datas recentes", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("agora");
  });

  it("devolve '-' para datas invalidas", () => {
    expect(formatRelativeTime("nao-e-data")).toBe("-");
    expect(formatRelativeTime(null)).toBe("-");
  });
});
