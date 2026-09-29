import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "page_visibility";

/** Paths hidden from the menu (and blocked for non-admin staff). Stored in grid_settings. */
export const hiddenPagesQuery = queryOptions({
  queryKey: ["hidden_pages"],
  queryFn: async () => {
    const { data, error } = await supabase.from("grid_settings").select("settings").eq("grid_key", KEY).maybeSingle();
    if (error) throw error;
    const hidden = (data?.settings as { hidden?: string[] } | null)?.hidden;
    return Array.isArray(hidden) ? hidden : [];
  },
  staleTime: 30_000,
});

export async function saveHiddenPages(hidden: string[]) {
  const { error } = await supabase
    .from("grid_settings")
    .upsert({ grid_key: KEY, settings: { hidden } as never, updated_at: new Date().toISOString() });
  if (error) throw error;
}
