import { useEffect } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RowPalette = "soft" | "contrast" | "dark" | "light" | "custom";
export type RowMode = "rows" | "columns";

export interface RowColorSettings {
  palette: RowPalette;
  mode: RowMode;
  /** Custom palette colors (hex), used when palette === "custom". */
  colors: string[];
}

const KEY = "row-palette";
const GRID_KEY = "row_palette";
const PALETTES: RowPalette[] = ["soft", "contrast", "dark", "light", "custom"];
export const DEFAULT_CUSTOM_COLORS = ["#dbe7f5", "#f3ecd8", "#eadcf3", "#dcf0e2", "#f5dede", "#d8f0ef"];

function normalize(raw: unknown): RowColorSettings {
  const o = (raw ?? {}) as Partial<RowColorSettings> & { palette?: string };
  // Legacy cache stored the palette as a bare string.
  const paletteRaw = typeof raw === "string" ? raw : o.palette;
  const palette = PALETTES.includes(paletteRaw as RowPalette) ? (paletteRaw as RowPalette) : "soft";
  const colors = Array.isArray(o.colors) && o.colors.length > 0 ? o.colors.slice(0, 6) : DEFAULT_CUSTOM_COLORS;
  while (colors.length < 6) colors.push(DEFAULT_CUSTOM_COLORS[colors.length]!);
  return { palette, mode: o.mode === "columns" ? "columns" : "rows", colors };
}

/** Instant cached read (per device) to avoid a flash before the shared value loads. */
export function readRowPalette(): RowColorSettings {
  if (typeof window === "undefined") return normalize(null);
  try {
    return normalize(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return normalize(localStorage.getItem(KEY));
  }
}

export function applyRowPalette(s: RowColorSettings) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.setAttribute("data-row-palette", s.palette);
  el.setAttribute("data-row-mode", s.mode);
  if (s.palette === "custom") {
    s.colors.forEach((c, i) => el.style.setProperty(`--row-c${i + 1}`, c));
  } else {
    for (let i = 1; i <= 6; i++) el.style.removeProperty(`--row-c${i}`);
  }
}

export const rowPaletteQuery = queryOptions({
  queryKey: ["row_palette"],
  queryFn: async (): Promise<RowColorSettings> => {
    const { data, error } = await supabase
      .from("grid_settings")
      .select("settings")
      .eq("grid_key", GRID_KEY)
      .maybeSingle();
    if (error) throw error;
    return normalize(data?.settings);
  },
  staleTime: 60_000,
});

export async function saveRowPalette(s: RowColorSettings) {
  const { error } = await supabase
    .from("grid_settings")
    .upsert({ grid_key: GRID_KEY, settings: s as never, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Shared coloring settings for all users: reads from the database, applies them, and saves updates back. */
export function useRowPalette() {
  const qc = useQueryClient();
  const { data } = useQuery(rowPaletteQuery);
  const settings = data ?? readRowPalette();

  useEffect(() => {
    applyRowPalette(settings);
    if (data) localStorage.setItem(KEY, JSON.stringify(data));
  }, [settings, data]);

  const update = async (patch: Partial<RowColorSettings>) => {
    const next = normalize({ ...settings, ...patch });
    localStorage.setItem(KEY, JSON.stringify(next));
    applyRowPalette(next);
    qc.setQueryData(rowPaletteQuery.queryKey, next);
    await saveRowPalette(next);
  };
  return [settings, update] as const;
}
