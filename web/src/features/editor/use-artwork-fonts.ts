import "../../artwork-fonts.css";
import * as React from "react";
import type { ArtworkOptions, TextStyle } from "../../../../server/src/lib/artwork";

let context: CanvasRenderingContext2D | null | undefined;
function measure(text: string, style: TextStyle) {
  if (context === undefined) context = document.createElement("canvas").getContext("2d");
  if (!context) return text.length * style.size * .54;
  context.font = `${style.italic ? "italic " : ""}${style.weight} ${style.size}px "${style.family}"`;
  return context.measureText(text).width;
}
export function useArtworkFonts(): ArtworkOptions {
  const [revision, refresh] = React.useReducer((value: number) => value + 1, 0);
  React.useEffect(() => {
    let active = true;
    const changed = () => { if (active) refresh(); };
    void document.fonts?.ready.then(changed);
    document.fonts?.addEventListener("loadingdone", changed);
    return () => { active = false; document.fonts?.removeEventListener("loadingdone", changed); };
  }, []);
  return React.useMemo(() => ({ measure }), [revision]);
}
