import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function log(e: Parameters<typeof import("./security-log.server").logSecurityEvent>[0]) {
  const { logSecurityEvent } = await import("./security-log.server");
  await logSecurityEvent(e);
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("غير مسموح: هذه العملية للمدير فقط");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, email, username, created_at").order("created_at"),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    return (profiles ?? []).map((p) => ({
      ...p,
      isAdmin: (roles ?? []).some((r) => r.user_id === p.id && r.role === "admin"),
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").max(72),
        fullName: z.string().trim().min(1).max(100),
        username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, "اسم المستخدم: 3-30 حرفاً إنجليزياً أو أرقام أو . _ -"),
        isAdmin: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    {
      const { data: dup } = await supabaseAdmin.from("profiles").select("id").ilike("username", data.username).maybeSingle();
      if (dup && dup.id !== (data as any).id) throw new Error("اسم المستخدم مستخدم بالفعل");
    }
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, username: data.username },
    });
    if (error) {
      await log({ event_type: "user_created", success: false, identifier: data.email, actor_user_id: context.userId, details: error.message });
      throw new Error(error.message);
    }
    await log({ event_type: "user_created", identifier: data.email, target_user_id: created.user?.id, actor_user_id: context.userId, details: data.isAdmin ? "بصلاحية مدير" : "موظف" });
    if (created.user) await supabaseAdmin.from("profiles").update({ username: data.username }).eq("id", created.user.id);
    if (data.isAdmin && created.user) {
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    }
    return { ok: true };
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { password: data.password });
    await log({ event_type: "password_changed_self", success: !error, target_user_id: context.userId, actor_user_id: context.userId, details: error?.message ?? "" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        email: z.string().trim().email().max(255),
        fullName: z.string().trim().min(1).max(100),
        username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, "اسم المستخدم: 3-30 حرفاً إنجليزياً أو أرقام أو . _ -"),
        password: z.string().max(72).optional(),
        isAdmin: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.password && data.password.length < 6) throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    if (data.id === context.userId && !data.isAdmin) throw new Error("لا يمكنك إزالة صلاحية المدير عن حسابك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    {
      const { data: dup } = await supabaseAdmin.from("profiles").select("id").ilike("username", data.username).maybeSingle();
      if (dup && dup.id !== (data as any).id) throw new Error("اسم المستخدم مستخدم بالفعل");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      email: data.email,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
      ...(data.password ? { password: data.password } : {}),
    });
    await log({ event_type: data.password ? "password_reset_by_admin" : "user_updated", success: !error, identifier: data.email, target_user_id: data.id, actor_user_id: context.userId, details: error?.message ?? (data.isAdmin ? "صلاحية مدير" : "صلاحية موظف") });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ full_name: data.fullName, email: data.email, username: data.username }).eq("id", data.id);
    if (data.isAdmin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.id, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id).eq("role", "admin");
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.id, role: "user" }, { onConflict: "user_id,role" });
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("لا يمكنك حذف حسابك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("email").eq("id", data.id).maybeSingle();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    await log({ event_type: "user_deleted", success: !error, identifier: prof?.email ?? "", target_user_id: data.id, actor_user_id: context.userId, details: error?.message ?? "" });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.id);
    return { ok: true };
  });

export const listSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, email");
    const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
    return (data ?? []).map((e) => ({
      ...e,
      target_name: e.target_user_id ? names.get(e.target_user_id) ?? "" : "",
      actor_name: e.actor_user_id ? names.get(e.actor_user_id) ?? "" : "",
    }));
  });
