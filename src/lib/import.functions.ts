import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logSecurityEvent } from "@/lib/security-log.server";

/** تسجيل عملية استيراد Excel في سجل الأحداث (للمدير فقط) */
export const logImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        table: z.string().max(50),
        fileName: z.string().max(300),
        total: z.number().int().min(0),
        added: z.number().int().min(0),
        skipped: z.number().int().min(0),
        failed: z.number().int().min(0),
        errors: z.string().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("الاستيراد متاح للمدير فقط");
    await logSecurityEvent({
      event_type: "excel_import",
      success: data.failed === 0,
      identifier: data.fileName,
      actor_user_id: context.userId,
      details: `الجدول: ${data.table} | الإجمالي: ${data.total} | أُضيف: ${data.added} | تُخطي (مكرر): ${data.skipped} | فشل: ${data.failed}${data.errors ? ` | أخطاء: ${data.errors}` : ""}`,
    });
    return { ok: true };
  });
