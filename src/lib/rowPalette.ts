import { useEffect, useState } from "react";

export type RowPalette = "soft" | "contrast";
const KEY = "row-palette";

export function readRowPalette(): RowPalette {
  if (typeof window === "undefined") return "soft";
  return localStorage.getItem(KEY) === "contrast" ? "contrast" : "soft";
}

export function applyRowPalette(p: RowPalette) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.rowPalette = p;
}

export function useRowPalette() {
  const [palette, setPalette] = useState<RowPalette>("soft");
  useEffect(() => {
    const p = readRowPalette();
    setPalette(p);
    applyRowPalette(p);
  }, []);
  const update = (p: RowPalette) => {
    localStorage.setItem(KEY, p);
    applyRowPalette(p);
    setPalette(p);
  };
  return [palette, update] as const;
}
