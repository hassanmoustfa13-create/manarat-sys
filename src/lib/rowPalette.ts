import { useEffect } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RowPalette = "soft" | "contrast" | "dark" | "light";
const KEY = "row-palette";
const GRID_KEY = "row_palette";
const VALID: RowPalette[] = ["soft", "contrast", "dark", "light"];

function normalize(v: unknown): RowPalette {
  return VALID.includes(v as RowPalette) ? (v as RowPalette) : "soft";
}

/** Instant cached read (per device) to avoid a flash before the shared value loads. */
export function readRowPalette(): RowPalette {
  if (typeof window === "undefined") return "soft";
  return normalize(localStorage.getItem(KEY));
}

export function applyRowPalette(p: RowPalette) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-row-palette", p);
}

export const rowPaletteQuery = queryOptions({
  queryKey: ["row_palette"],
  queryFn: async (): Promise<RowPalette> => {
    const { data, error } = await supabase
      .from("grid_settings")
      .select("settings")
      .eq("grid_key", GRID_KEY)
      .maybeSingle();
    if (error) throw error;
    return normalize((data?.settings as { palette?: string } | null)?.palette);
  },
  staleTime: 60_000,
});

export async function saveRowPalette(p: RowPalette) {
  const { error } = await supabase
    .from("grid_settings")
    .upsert({ grid_key: GRID_KEY, settings: { palette: p } as never, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Shared palette for all users: reads from the database, applies it, and saves updates back. */
export function useRowPalette() {
  const qc = useQueryClient();
  const { data } = useQuery(rowPaletteQuery);
  const palette = data ?? readRowPalette();

  useEffect(() => {
    applyRowPalette(palette);
    if (data) localStorage.setItem(KEY, data);
  }, [palette, data]);

  const update = async (p: RowPalette) => {
    localStorage.setItem(KEY, p);
    applyRowPalette(p);
    qc.setQueryData(rowPaletteQuery.queryKey, p);
    await saveRowPalette(p);
  };
  return [palette, update] as const;
}
