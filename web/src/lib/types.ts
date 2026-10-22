export interface User {
  _key: string;
  _id: string;
  email: string;
  name: string;
  phone: string | null;
  document: string | null;
  market: string;
  locale: string;
  role: string;
  credits: number;
  createdAt: string;
}

export interface FlyerElement {
  id?: string;
  elementId?: string;
  category?: string;
  type?: string;
  subtype?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  text?: string;
  backgroundColor?: string;
  image?: string;
  asset?: string;
  textStyle?: {
    fontFamily?: string;
    fontWeight?: number | string;
    fontSize?: number;
    color?: string;
    align?: "left" | "center" | "right";
    textDecoration?: string;
    fontStyle?: string;
  };
}

export interface FlyerProduct {
  id?: string;
  productId?: string;
  name?: string;
  image?: string;
  price?: number;
  salePrice?: number | null;
  unit?: string;
  notes?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  isHighlighted?: boolean;
  tagColor?: string;
  textColor?: string;
  backgroundColor?: string;
  tagShape?: "circle" | "pill" | "ticket" | "burst" | "square";
  tagStyle?: "solid" | "outline" | "gradient" | "shadow";
}

export interface Flyer {
  _key: string;
  _id: string;
  _rev: string;
  name: string;
  content: "flyer" | "poster" | "shelf_label" | "video";
  status: "draft" | "approved" | "published" | "archived";
  format: string | null;
  design: string | null;
  palette: string[];
  backgroundColor: string;
  startAt: string | null;
  endAt: string | null;
  template: boolean;
  public: boolean;
  highlighted: boolean;
  grid: Record<string, unknown> | null;
  gridHighlights: Record<string, unknown> | null;
  settings: Record<string, unknown>;
  pageSettings: Record<string, unknown>;
  elements: FlyerElement[];
  products: FlyerProduct[];
  footer: { visible?: boolean; elements?: string[] };
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface Format {
  _key: string;
  _id: string;
  code: string;
  title: string;
  width: number;
  height: number;
  uses: string[];
  premium: boolean;
  customPaperSize: { width: number; height: number } | null;
}

export interface Design {
  _key: string;
  _id: string;
  title: string;
  category: string;
  theme: string;
  status: string;
  archived: boolean;
  thumbnail: string | null;
  description: string | null;
  backgroundColor?: string;
  palette?: string[];
  elements: FlyerElement[];
  createdAt: string;
}

export interface Product {
  _key: string;
  _id: string;
  name: string;
  image: string | null;
  price: number;
  salePrice: number | null;
  unit: string | null;
  notes: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExportJob {
  id: string;
  kind: string;
  format: string;
  flyerId: string | null;
  status: string;
  progress: number;
  files: { url: string; format: string }[];
  fileUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Partner {
  _key: string;
  name: string;
  active: boolean;
  defaultCountryCode: string;
  products: {
    id: string;
    name: string;
    description: string;
    prices: { credits: number; amount: number }[];
  }[];
  config: {
    product: { name: string; description: string; logo: string | null };
    app: { name: string; description: string; domain: string };
    email: { sender: string };
  };
}

export interface BillingOverview {
  credits: number;
  plan: string;
  flyers: { total: number; published: number };
  exports: { total: number };
  renewsAt: string | null;
}
