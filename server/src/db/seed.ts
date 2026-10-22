import bcrypt from "bcryptjs";
import { getDb } from "./connection.js";
import { config } from "../config.js";
import { newId } from "../lib/ids.js";
import { nowIso } from "../lib/time.js";

export const FORMATS = [
  { code: "tv", title: "TV / Youtube", width: 1920, height: 1080, uses: ["flyer", "video"], premium: 0 },
  { code: "story", title: "Story / Reels", width: 1080, height: 1920, uses: ["flyer", "video"], premium: 0 },
  { code: "vertical", title: "Vertical / Feed", width: 1080, height: 1350, uses: ["flyer"], premium: 0 },
  { code: "square", title: "Quadrado", width: 1080, height: 1080, uses: ["flyer"], premium: 0 },
  { code: "a4_horizontal", title: "A4 Horizontal", width: 1414, height: 1000, uses: ["flyer", "print"], premium: 0 },
  { code: "a4_vertical", title: "A4 Vertical", width: 1000, height: 1414, uses: ["flyer", "print"], premium: 0 },
  { code: "a3_vertical", title: "A3 Vertical", width: 1414, height: 2000, uses: ["flyer", "print"], premium: 1 },
  { code: "header", title: "Header / Banner", width: 1200, height: 300, uses: ["header"], premium: 0 },
] as const;

export const THEMES = [
  { theme: "operacao-promo", title: "Super Ofertas", description: "Campanhas gerais de supermercado.", tokens: { base: "#fff7ed", baseSolid: "#ffffff", accent: "#ef312f", contrast: "#172554", surface: "#fed7aa", onSurface: "#ffffff" }, fonts: { display: "Oswald", body: "Roboto" } },
  { theme: "primavera", title: "Primavera", description: "Flores, cores leves e campanhas sazonais.", tokens: { base: "#f0fdf4", baseSolid: "#ffffff", accent: "#f472b6", contrast: "#14532d", surface: "#fce7f3", onSurface: "#ffffff" }, fonts: { display: "Montserrat", body: "Roboto" } },
  { theme: "outubro-rosa", title: "Outubro Rosa", description: "Campanha rosa com comunicação acolhedora.", tokens: { base: "#fff1f2", baseSolid: "#ffffff", accent: "#ec4899", contrast: "#831843", surface: "#fbcfe8", onSurface: "#ffffff" }, fonts: { display: "Montserrat", body: "Roboto" } },
  { theme: "halloween", title: "Dia das Bruxas", description: "Campanhas de Halloween em roxo e laranja.", tokens: { base: "#1f1235", baseSolid: "#2e1065", accent: "#f97316", contrast: "#ffffff", surface: "#581c87", onSurface: "#ffffff" }, fonts: { display: "Oswald", body: "Roboto" } },
  { theme: "outubro", title: "Outubro", description: "Ofertas especiais para o mês de outubro.", tokens: { base: "#fff7ed", baseSolid: "#ffffff", accent: "#f97316", contrast: "#7c2d12", surface: "#ffedd5", onSurface: "#ffffff" }, fonts: { display: "Oswald", body: "Roboto" } },
  { theme: "segunda-feira", title: "Segunda-Feira", description: "Ofertas para começar a semana.", tokens: { base: "#eff6ff", baseSolid: "#ffffff", accent: "#2563eb", contrast: "#172554", surface: "#dbeafe", onSurface: "#ffffff" }, fonts: { display: "Montserrat", body: "Roboto" } },
  { theme: "terca-feira", title: "Terça-Feira", description: "Feira e hortifruti de terça-feira.", tokens: { base: "#fffbeb", baseSolid: "#ffffff", accent: "#eab308", contrast: "#365314", surface: "#fef3c7", onSurface: "#365314" }, fonts: { display: "Oswald", body: "Roboto" } },
  { theme: "hortifruti-fresh", title: "Hortifruti", description: "Verde vivo, frutas e produtos frescos.", tokens: { base: "#f7fee7", baseSolid: "#ffffff", accent: "#22c55e", contrast: "#14532d", surface: "#dcfce7", onSurface: "#052e16" }, fonts: { display: "Oswald", body: "Roboto" } },
  { theme: "black-friday", title: "Black Friday", description: "Preto e amarelo para promoções de alto impacto.", tokens: { base: "#0b0b0f", baseSolid: "#18181b", accent: "#facc15", contrast: "#ffffff", surface: "#27272a", onSurface: "#09090b" }, fonts: { display: "Oswald", body: "Roboto" } },
  { theme: "natal", title: "Natal", description: "Vermelho, verde e dourado para o fim do ano.", tokens: { base: "#fef2f2", baseSolid: "#ffffff", accent: "#dc2626", contrast: "#14532d", surface: "#fee2e2", onSurface: "#ffffff" }, fonts: { display: "Montserrat", body: "Roboto" } },
  { theme: "fim-de-semana", title: "Fim de Semana", description: "Campanhas rápidas de sexta a domingo.", tokens: { base: "#fdf4ff", baseSolid: "#ffffff", accent: "#a855f7", contrast: "#3b0764", surface: "#fae8ff", onSurface: "#ffffff" }, fonts: { display: "Oswald", body: "Roboto" } },
  { theme: "atacado-azul", title: "Atacado", description: "Azul corporativo com preços em laranja.", tokens: { base: "#eff6ff", baseSolid: "#ffffff", accent: "#f97316", contrast: "#0c2d57", surface: "#dbeafe", onSurface: "#ffffff" }, fonts: { display: "Montserrat", body: "Roboto" } },
  { theme: "padaria-artesanal", title: "Padaria", description: "Creme e caramelo para pães e confeitaria.", tokens: { base: "#fffaf2", baseSolid: "#fffdf8", accent: "#b45309", contrast: "#451a03", surface: "#fdf1e0", onSurface: "#ffffff" }, fonts: { display: "Montserrat", body: "Roboto" } },
] as const;

const DESIGN_PRESETS = [
  ["operacao-promo", "Festival de Ofertas", "OFERTAS IMPERDÍVEIS"], ["operacao-promo", "Preço Baixo Todo Dia", "PREÇO BAIXO"],
  ["primavera", "Primavera Floral", "PRIMAVERA DE OFERTAS"], ["primavera", "Primavera Fresh", "FLORESÇA SUA ECONOMIA"],
  ["outubro-rosa", "Laço Rosa", "OUTUBRO ROSA"], ["outubro-rosa", "Rosa Premium", "CUIDAR É UM ATO DE AMOR"],
  ["halloween", "Noite de Ofertas", "OFERTAS DE ARREPIAR"], ["halloween", "Doces ou Descontos", "HALLOWEEN"],
  ["outubro", "Festival de Outubro", "OUTUBRO DE OFERTAS"], ["outubro", "Mês da Economia", "ECONOMIZE EM OUTUBRO"],
  ["segunda-feira", "Segunda da Economia", "SEGUNDA DE OFERTAS"], ["segunda-feira", "Segunda Azul", "COMECE ECONOMIZANDO"],
  ["terca-feira", "Terça Feira", "TERÇA FEIRA"], ["terca-feira", "Terça Hortifruti", "TERÇA VERDE"],
  ["hortifruti-fresh", "Feira Fresca", "DIRETO DA FEIRA"], ["hortifruti-fresh", "Direto da Horta", "FRESQUINHO TODO DIA"],
  ["black-friday", "Esquenta Black", "ESQUENTA BLACK"], ["black-friday", "Black Explosiva", "BLACK FRIDAY"],
  ["natal", "Natal Encantado", "NATAL DE OFERTAS"], ["natal", "Natal Vermelho", "ECONOMIA DE PRESENTE"],
  ["fim-de-semana", "Sextou com Ofertas", "SEXTOU"], ["fim-de-semana", "Fim de Semana", "OFERTAS DO FIM DE SEMANA"],
  ["atacado-azul", "Atacado Azul", "COMPRE MAIS, PAGUE MENOS"], ["atacado-azul", "Atacarejo", "OFERTA PARA LEVAR"],
  ["padaria-artesanal", "Padaria Artesanal", "SAINDO DO FORNO"], ["padaria-artesanal", "Café da Manhã", "SABOR E ECONOMIA"],
] as const;

function buildElements(theme: (typeof THEMES)[number], format: { width: number; height: number }, headline: string, variant: number) {
  const w = format.width;
  const h = format.height;
  return [
    { id: "background", category: "background", type: "shape", x: 0, y: 0, width: w, height: h, backgroundColor: theme.tokens.base, zIndex: 0 },
    {
      id: "header-block",
      category: "background",
      type: "shape",
      x: 0,
      y: 0,
      width: w,
      height: Math.round(h * 0.27),
      backgroundColor: variant % 2 ? theme.tokens.contrast : theme.tokens.accent,
      zIndex: 1,
    },
    { id: "diagonal-left", category: "decorative", type: "shape", x: Math.round(-w * .12), y: Math.round(h * .18), width: Math.round(w * .55), height: Math.round(h * .09), rotation: -7, backgroundColor: theme.tokens.surface, opacity: .9, zIndex: 1 },
    { id: "diagonal-right", category: "decorative", type: "shape", x: Math.round(w * .68), y: Math.round(h * .04), width: Math.round(w * .42), height: Math.round(h * .08), rotation: 12, backgroundColor: theme.tokens.surface, opacity: .55, zIndex: 1 },
    {
      id: "title",
      category: "decorative",
      type: "text",
      x: Math.round(w * 0.06),
      y: Math.round(h * 0.045),
      width: Math.round(w * 0.88),
      height: Math.round(h * 0.1),
      text: headline,
      textStyle: {
        fontFamily: theme.fonts.display,
        fontWeight: 700,
        fontSize: Math.round(h * (headline.length > 20 ? 0.052 : 0.066)),
        color: variant % 2 ? "#ffffff" : theme.tokens.onSurface,
        align: "center",
      },
      zIndex: 2,
    },
    {
      id: "subtitle",
      category: "decorative",
      type: "text",
      x: Math.round(w * 0.06),
      y: Math.round(h * 0.15),
      width: Math.round(w * 0.88),
      height: Math.round(h * 0.05),
      text: "Qualidade, variedade e preço baixo",
      textStyle: {
        fontFamily: theme.fonts.body,
        fontWeight: 500,
        fontSize: Math.round(h * 0.03),
        color: variant % 2 ? "#ffffff" : theme.tokens.onSurface,
        align: "center",
      },
      zIndex: 2,
    },
    { id: "offer-ribbon", category: "decorative", type: "text", x: Math.round(w * .35), y: Math.round(h * .225), width: Math.round(w * .3), height: Math.round(h * .045), text: "OFERTAS DA SEMANA", backgroundColor: theme.tokens.surface, textStyle: { fontFamily: theme.fonts.body, fontWeight: 700, fontSize: Math.round(h * .018), color: theme.tokens.contrast, align: "center" }, zIndex: 4 },
    {
      id: "footer",
      category: "decorative",
      type: "text",
      x: 0,
      y: h - Math.round(h * 0.06),
      width: w,
      height: Math.round(h * 0.06),
      text: "www.encartefacil.com",
      textStyle: {
        fontFamily: theme.fonts.body,
        fontWeight: 400,
        fontSize: Math.round(h * 0.022),
        color: theme.tokens.contrast,
        align: "center",
      },
      zIndex: 3,
    },
  ];
}

export function seedDatabase(): void {
  const db = getDb();
  const createdAt = nowIso();

  const insertFormat = db.prepare(
    `INSERT INTO formats (id, code, title, width, height, uses, premium, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const formatExists = db.prepare(`SELECT 1 FROM formats WHERE code = ?`);
  FORMATS.forEach((f, index) => {
    if (!formatExists.get(f.code)) {
      insertFormat.run(newId(), f.code, f.title, f.width, f.height, JSON.stringify(f.uses), f.premium, index);
    }
  });

  const insertDesign = db.prepare(
    `INSERT INTO designs (id, title, category, theme, status, thumbnail, description, elements, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const designExists = db.prepare(`SELECT id FROM designs WHERE theme = ? AND title = ?`);
  const updateDesign = db.prepare(`UPDATE designs SET description=?,elements=?,sort_order=? WHERE id=?`);
  const baseFormat = FORMATS[2]!;
  DESIGN_PRESETS.forEach(([themeCode, title, headline], index) => {
    const theme = THEMES.find(item => item.theme === themeCode)!;
    const elements = JSON.stringify(buildElements(theme, baseFormat, headline, index));
    const existing = designExists.get(theme.theme, title) as { id: string } | undefined;
    if (!existing) {
      insertDesign.run(
        newId(),
        title,
        "flyer",
        theme.theme,
        "approved",
        null,
        theme.description,
        elements,
        index,
        createdAt,
      );
    } else updateDesign.run(theme.description, elements, index, existing.id);
  });

  const userExists = db.prepare(`SELECT id FROM users WHERE email = ?`);
  const insertUser = db.prepare(
    `INSERT INTO users (id, email, password_hash, name, phone, document, market, locale, role, credits, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const demoId = "usr_demo_encartefacil";
  if (!userExists.get(config.seedAdminEmail)) {
    insertUser.run(
      demoId,
      config.seedAdminEmail,
      bcrypt.hashSync(config.seedAdminPassword, config.bcryptRounds),
      "Usuario Demonstracao",
      "+5511999999999",
      "123.456.789-00",
      "BR",
      "pt-br",
      "admin",
      100,
      createdAt,
      createdAt,
    );

    const insertProduct = db.prepare(
      `INSERT INTO products (id, user_id, name, image, price, sale_price, unit, notes, category, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const demoProducts = [
      ["Cafe Torrado Premium 500g", 29.9, 24.9, "500g", "Grao integral", "Cafe"],
      ["Leite Integral 1L", 6.49, 5.79, "1L", "Caixa com 12 unidades", "Laticinios"],
      ["Pao Frances kg", 18.0, null, "kg", "Producao diaria", "Padaria"],
      ["Oleo de Soja 900ml", 8.9, 7.5, "900ml", "Produto de primeira linha", "Mercearia"],
      ["Acucar Uniao 1kg", 5.2, null, "1kg", "", "Mercearia"],
    ] as const;
    for (const [name, price, salePrice, unit, notes, category] of demoProducts) {
      insertProduct.run(
        newId(),
        demoId,
        name,
        null,
        price,
        salePrice,
        unit,
        notes,
        category,
        createdAt,
        createdAt,
      );
    }

    const insertFlyer = db.prepare(
      `INSERT INTO flyers (id, user_id, name, content, status, format, design, palette, background_color, start_at, end_at,
        is_template, is_public, is_highlighted, grid, grid_highlights, settings, page_settings, elements, products, footer,
        created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const design = db.prepare(`SELECT id, elements, theme FROM designs WHERE theme = 'operacao-promo'`).get() as
      | { id: string; elements: string; theme: string }
      | undefined;
    const format = db.prepare(`SELECT id FROM formats WHERE code = 'vertical'`).get() as { id: string } | undefined;
    if (design && format) {
      insertFlyer.run(
        newId(),
        demoId,
        "Encarte semanal - Hortifruti",
        "flyer",
        "draft",
        format.id,
        design.id,
        JSON.stringify(["#ffffff", "#e11d48", "#0f172a"]),
        "#ffffff",
        null,
        null,
        0,
        0,
        0,
        JSON.stringify({ columns: 3, rows: 4 }),
        JSON.stringify({}),
        JSON.stringify({ colors: { background: "#ffffff", text: "#0f172a", accent: "#e11d48" } }),
        JSON.stringify({}),
        design.elements,
        JSON.stringify([]),
        JSON.stringify({ visible: true, elements: ["www.encartefacil.com"] }),
        createdAt,
        createdAt,
      );
    }
  }
}
