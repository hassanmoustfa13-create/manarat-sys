import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PermissionMatrix } from "@/components/PermissionMatrix";
import { EDITABLE_ROLES, ROLE_LABELS, permKey } from "@/lib/permissions";
import { errorMessage } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/permissions")({
  head: () => ({
    meta: [
      { title: "الصلاحيات — منارات هجر للاستقدام" },
      { name: "description", content: "تحديد ما يستطيع المشرف والموظف فعله في كل قسم" },
      { property: "og:title", content: "الصلاحيات — منارات هجر للاستقدام" },
      { property: "og:description", content: "إدارة صلاحيات الأدوار" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PermissionsPage,
});

export const rolePermissionsQuery = {
  queryKey: ["role_permissions"],
  queryFn: async () => {
    const { data, error } = await supabase.from("role_permissions").select("role, resource, action, allowed");
    if (error) throw error;
    return data;
  },
};

function PermissionsPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [role, setRole] = useState<(typeof EDITABLE_ROLES)[number]>("supervisor");
  const { data = [] } = useQuery({ ...rolePermissionsQuery, enabled: auth.isAdmin });

  if (auth.loading) return null;
  if (!auth.isAdmin) return <main className="p-10 text-center text-ink/50">هذه الصفحة متاحة للمدير فقط</main>;

  const values: Record<string, boolean> = {};
  for (const p of data) if (p.role === role) values[permKey(p.resource, p.action)] = p.allowed;

  const change = async (key: string, v: boolean | null) => {
    const [resource, action] = key.split(":");
    const { error } = await supabase
      .from("role_permissions")
      .upsert({ role, resource: resource!, action: action!, allowed: Boolean(v) }, { onConflict: "role,resource,action" });
    if (error) { toast.error(errorMessage(error)); return; }
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["role_permissions"] });
    qc.invalidateQueries({ queryKey: ["auth"] });
  };

  return (
    <main className="mx-auto max-w-[1000px] space-y-4 px-4 py-5">
      <div>
        <h1 className="text-lg font-semibold">الصلاحيات</h1>
        <p className="text-[13px] text-ink/55">
          حدد ما يستطيع كل دور فعله. المدير له كل الصلاحيات دائمًا. لتخصيص موظف بعينه افتح «المستخدمون» واضغط «صلاحيات خاصة».
        </p>
      </div>
      <div className="flex gap-2">
        {EDITABLE_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-lg px-4 py-2 text-[13px] ${role === r ? "bg-brand text-primary-foreground" : "glass text-ink/70"}`}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
      <section className="glass rounded-2xl p-4">
        <PermissionMatrix values={values} onChange={change} />
      </section>
    </main>
  );
}
