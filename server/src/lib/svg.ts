export interface RenderElement {
  id?: string;
  type?: string;
  category?: string;
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
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  cardShadow?: boolean;
  image?: string;
  imageFit?: "contain" | "cover" | "fill";
  asset?: string;
  textStyle?: {
    fontFamily?: string;
    fontWeight?: number | string;
    fontSize?: number;
    color?: string;
    align?: string;
    textDecoration?: string;
    fontStyle?: string;
  };
}

export interface RenderProduct {
  imageScale?: number;
  backgroundVisible?: boolean;
  id?: string;
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
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  cardShadow?: boolean;
  tagShape?: "circle" | "pill" | "ticket" | "burst" | "square";
  tagStyle?: "solid" | "outline" | "gradient" | "shadow";
}

export interface RenderFlyer {
  name?: string;
  width: number;
  height: number;
  backgroundColor?: string;
  elements: RenderElement[];
  products: RenderProduct[];
  footer?: { visible?: boolean; elements?: string[] };
  settings?: { colors?: { background?: string; text?: string; accent?: string } };
}

export { renderFlyerToSvg } from "./artwork.js";
