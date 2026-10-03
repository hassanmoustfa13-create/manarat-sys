import { useEffect, useState } from "react";

export type RowPalette = "soft" | "contrast" | "dark" | "light";
const KEY = "row-palette";
const VALID: RowPalette[] = ["soft", "contrast", "dark", "light"];

export function readRowPalette(): RowPalette {
  if (typeof window === "undefined") return "soft";
  const v = localStorage.getItem(KEY) as RowPalette | null;
  return v && VALID.includes(v) ? v : "soft";
}

export function applyRowPalette(p: RowPalette) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-row-palette", p);
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
