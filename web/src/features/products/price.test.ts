import { describe, expect, it } from "vitest";
import { parsePrice } from "./price";

describe("preços de produtos", () => {
  it.each([["1.234,56", 1234.56], ["24,90", 24.9], ["24.90", 24.9], ["R$ 5,79", 5.79], ["1.234", 1234], ["0", 0]])("interpreta %s", (input, expected) => expect(parsePrice(String(input))).toBe(expected));
  it.each(["", " ", "-1", "Infinity", "abc", "1,2,3", "1.234.56", "1000001", "2e3"])("rejeita %s sem converter para zero", input => expect(parsePrice(input)).toBeNull());
});
