import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ identifier: z.string().trim().min(1).max(255), password: z.string().min(1).max(72) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let email = data.identifier;
    if (!email.includes("@")) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .ilike("username", data.identifier.toLowerCase())
        .maybeSingle();
      if (!p?.email) throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
      email = p.email;
    }
    const client = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: s, error } = await client.auth.signInWithPassword({ email, password: data.password });
    if (error || !s.session) throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
    return { access_token: s.session.access_token, refresh_token: s.session.refresh_token };
  });
