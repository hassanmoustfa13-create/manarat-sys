export async function logSecurityEvent(e: {
  event_type: string;
  success?: boolean;
  identifier?: string;
  target_user_id?: string | null;
  actor_user_id?: string | null;
  details?: string;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("security_events").insert({
      event_type: e.event_type,
      success: e.success ?? true,
      identifier: e.identifier ?? "",
      target_user_id: e.target_user_id ?? null,
      actor_user_id: e.actor_user_id ?? null,
      details: e.details ?? "",
    });
  } catch {
    // logging must never break the main action
  }
}
