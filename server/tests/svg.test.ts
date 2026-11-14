import { describe, expect, it } from "vitest";
import { renderFlyerToSvg } from "../src/lib/svg.js";

describe("renderFlyerToSvg", () => {
  it("preserva círculos, estrelas e o fundo dos adesivos na exportação", () => {
    const svg = renderFlyerToSvg({ width: 500, height: 500, products: [], elements: [
      { type: "shape", subtype: "circle", width: 100, height: 80, backgroundColor: "#ff0000" },
      { type: "shape", subtype: "star", width: 100, height: 100, backgroundColor: "#ffff00" },
      { type: "text", width: 240, height: 72, text: "OFERTA", backgroundColor: "#e11d48" },
    ] });
    expect(svg).toContain('<ellipse cx="50" cy="40" rx="50" ry="40"');
    expect(svg).toContain('<polygon points="50,0 61,35');
    expect(svg.indexOf('fill="#e11d48"')).toBeLessThan(svg.indexOf('>OFERTA</tspan>'));
    expect(svg).toContain('fill="#e11d48"');
  });
  it("renderiza o cabecalho SVG com as dimensoes do formato", () => {
    const svg = renderFlyerToSvg({
      name: "Encarte",
      width: 1080,
      height: 1350,
      backgroundColor: "#ffffff",
      elements: [],
      products: [],
    });

    expect(svg).toContain('width="1080"');
    expect(svg).toContain('height="1350"');
    expect(svg).toContain('viewBox="0 0 1080 1350"');
    expect(svg).toContain("</svg>");
  });

  it("desenha elementos de texto com estilo e ancora", () => {
    const svg = renderFlyerToSvg({
      name: "Com texto",
      width: 1000,
      height: 1000,
      elements: [
        {
          type: "text",
          x: 100,
          y: 100,
          width: 400,
          height: 80,
          text: "Ofertaespecial",
          textStyle: { fontFamily: "Oswald", fontSize: 40, color: "#ff0000", align: "center" },
        },
      ],
      products: [],
    });

    expect(svg).toContain("Ofertaespecial");
    expect(svg).toContain('font-family="Oswald"');
    expect(svg).toContain('text-anchor="middle"');
    expect(svg).toContain('fill="#ff0000"');
  });

  it("escapa caracteres perigosos do texto", () => {
    const svg = renderFlyerToSvg({
      name: "XSS",
      width: 100,
      height: 100,
      elements: [{ type: "text", x: 0, y: 0, width: 10, height: 10, text: "<script>alert(1)</script>" }],
      products: [],
    });

    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("desenha produto com preco promocional riscado", () => {
    const svg = renderFlyerToSvg({
      name: "Com produto",
      width: 1000,
      height: 1000,
      elements: [],
      products: [
        {
          name: "Cafe",
          price: 30,
          salePrice: 25,
          unit: "500g",
          x: 10,
          y: 20,
          width: 200,
          height: 300,
        },
      ],
    });

    expect(svg).toContain("Cafe");
    expect(svg).toContain("500g");
    expect(svg).toContain("R$");
  });

  it("inclui o rodape quando visivel", () => {
    const svg = renderFlyerToSvg({
      name: "Rodape",
      width: 500,
      height: 500,
      elements: [],
      products: [],
      footer: { visible: true, elements: ["contato@exemplo.com"] },
    });

    expect(svg).toContain("contato@exemplo.com");
  });

  it("omite o rodape quando invisivel", () => {
    const svg = renderFlyerToSvg({
      name: "Sem rodape",
      width: 500,
      height: 500,
      elements: [],
      products: [],
      footer: { visible: false, elements: ["contato@exemplo.com"] },
    });

    expect(svg).not.toContain("contato@exemplo.com");
  });
});
