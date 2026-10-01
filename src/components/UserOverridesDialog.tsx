import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PermissionMatrix } from "@/components/PermissionMatrix";
import { rolePermissionsQuery } from "@/routes/_authenticated/permissions";
import { ROLE_LABELS, permKey, type StaffRole } from "@/lib/permissions";
import { errorMessage } from "@/lib/data";

export function UserOverridesDialog({
  user,
  onClose,
}: {
  user: { id: string; name: string; role: StaffRole } | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: rolePerms = [] } = useQuery({ ...rolePermissionsQuery, enabled: Boolean(user) });
  const { data: overrides = [] } = useQuery({
    queryKey: ["overrides", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permission_overrides")
        .select("resource, action, allowed")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const inherited: Record<string, boolean> = {};
  for (const p of rolePerms) if (p.role === user?.role) inherited[permKey(p.resource, p.action)] = p.allowed;
  const values: Record<string, boolean | null> = {};
  for (const o of overrides) values[permKey(o.resource, o.action)] = o.allowed;

  const change = async (key: string, v: boolean | null) => {
    if (!user) return;
    const [resource, action] = key.split(":") as [string, string];
    const q =
      v === null
        ? supabase.from("user_permission_overrides").delete().eq("user_id", user.id).eq("resource", resource).eq("action", action)
        : supabase
            .from("user_permission_overrides")
            .upsert({ user_id: user.id, resource, action, allowed: v }, { onConflict: "user_id,resource,action" });
    const { error } = await q;
    if (error) { toast.error(errorMessage(error)); return; }
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["overrides", user.id] });
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-4xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>صلاحيات خاصة — {user?.name}</DialogTitle>
          <DialogDescription>
            الدور: {user ? ROLE_LABELS[user.role] : ""}. «حسب الدور» يتبع صلاحيات الدور، و«سماح» أو «منع» يخص هذا المستخدم فقط.
          </DialogDescription>
        </DialogHeader>
        <PermissionMatrix tri values={values} inherited={inherited} onChange={change} />
      </DialogContent>
    </Dialog>
  );
}
