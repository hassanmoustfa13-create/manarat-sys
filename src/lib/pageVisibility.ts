import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "page_visibility";

type PageSettings = { hidden?: string[]; order?: string[] };

async function readSettings(): Promise<PageSettings> {
  const { data, error } = await supabase.from("grid_settings").select("settings").eq("grid_key", KEY).maybeSingle();
  if (error) throw error;
  return (data?.settings as PageSettings | null) ?? {};
}

/** Paths hidden from the menu (and blocked for non-admin staff). Stored in grid_settings. */
export const hiddenPagesQuery = queryOptions({
  queryKey: ["hidden_pages"],
  queryFn: async () => {
    const s = await readSettings();
    return Array.isArray(s.hidden) ? s.hidden : [];
  },
  staleTime: 30_000,
});

/** Custom ordering of nav pages (array of paths). Pages not listed keep their default relative order. */
export const navOrderQuery = queryOptions({
  queryKey: ["nav_order"],
  queryFn: async () => {
    const s = await readSettings();
    return Array.isArray(s.order) ? s.order : [];
  },
  staleTime: 30_000,
});

async function writeSettings(patch: Partial<PageSettings>) {
  const current = await readSettings();
  const { error } = await supabase
    .from("grid_settings")
    .upsert({ grid_key: KEY, settings: { ...current, ...patch } as never, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function saveHiddenPages(hidden: string[]) {
  await writeSettings({ hidden });
}

export async function saveNavOrder(order: string[]) {
  await writeSettings({ order });
}

/** Sort nav items by the saved order; unlisted items keep their default order at the end. */
export function applyNavOrder<T extends { to: string }>(items: T[], order: string[]): T[] {
  if (!order.length) return items;
  const idx = new Map(order.map((p, i) => [p, i]));
  return [...items].sort((a, b) => {
    const ai = idx.has(a.to) ? idx.get(a.to)! : order.length + items.indexOf(a);
    const bi = idx.has(b.to) ? idx.get(b.to)! : order.length + items.indexOf(b);
    return ai - bi;
  });
}
