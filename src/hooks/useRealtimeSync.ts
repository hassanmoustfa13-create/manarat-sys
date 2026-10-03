import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// table -> query keys to refresh when it changes
const TABLES: Record<string, string[][]> = {
  workers: [["workers"], ["transfers"]],
  transfers: [["transfers"], ["workers"]],
  manual_transfers: [["manual_transfers"]],
  requests: [["requests"]],
  flights: [["flights"]],
  departures: [["departures"]],
  office_visas: [["office_visas"]],
  grid_settings: [["grid_settings"], ["hidden_pages"]],
  forms: [["forms"]],
  form_fields: [["forms"]],
  form_field_options: [["forms"]],
  form_entries: [["form_entries"]],
};

export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel("app-live-sync");
    for (const [table, keys] of Object.entries(TABLES)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      });
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
