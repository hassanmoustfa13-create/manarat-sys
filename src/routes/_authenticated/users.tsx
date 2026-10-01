import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { createUser, deleteUser, listUsers, updateUser } from "@/lib/users.functions";
import { formatDate } from "@/lib/data";
import { Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { UserOverridesDialog } from "@/components/UserOverridesDialog";
import { ROLE_LABELS, type StaffRole } from "@/lib/permissions";
import { KeyRound } from "lucide-react";

function RoleSelect({ value, onChange, disabled }: { value: StaffRole; onChange: (r: StaffRole) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="text-ink/60">الدور</span>
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value as StaffRole)} className="glass h-9 flex-1 rounded-lg px-2 text-[13px]">
        {(Object.keys(ROLE_LABELS) as StaffRole[]).map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>
    </label>
  );
}

type Role = StaffRole;
type Editing = { id: string; fullName: string; username: string; email: string; password: string; role: Role };

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "إدارة المستخدمين — منارات هجر للاستقدام" },
      { name: "description", content: "إضافة موظفين ومديرين جدد إلى نظام منارات هجر للاستقدام" },
      { property: "og:title", content: "إدارة المستخدمين — منارات هجر للاستقدام" },
      { property: "og:description", content: "إضافة موظفين ومديرين جدد" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

const input = "glass h-10 w-full rounded-lg px-3 text-[13px] outline-none";

function UsersPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const canView = auth.isAdmin || auth.can("admin_users", "view");
  const canAdd = auth.isAdmin || auth.can("admin_users", "add");
  const canEdit = auth.isAdmin || auth.can("admin_users", "edit");
  const canDelete = auth.isAdmin || auth.can("admin_users", "delete");
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => list(), enabled: canView });
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "", role: "employee" as Role });

  const m = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => {
      toast.success("تمت إضافة المستخدم");
      setForm({ fullName: "", username: "", email: "", password: "", role: "employee" as Role });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useServerFn(updateUser);
  const remove = useServerFn(deleteUser);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [overrideFor, setOverrideFor] = useState<{ id: string; name: string; role: StaffRole } | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["profiles"] });
    qc.invalidateQueries({ queryKey: ["auth"] });
  };
  const editM = useMutation({
    mutationFn: () => update({ data: { ...editing!, password: editing!.password || undefined } }),
    onSuccess: () => {
      toast.success("تم حفظ التعديلات");
      setEditing(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: () => remove({ data: { id: deleting!.id } }),
    onSuccess: () => {
      toast.success("تم حذف المستخدم");
      setDeleting(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (auth.loading) return null;
  if (!canView)
    return <main className="p-10 text-center text-ink/50">هذه الصفحة غير متاحة لك</main>;

  return (
    <main className="mx-auto grid max-w-[1100px] gap-4 px-4 py-5 lg:grid-cols-[360px_1fr]">
      {canAdd && (
      <form
        className="glass h-fit space-y-3 rounded-2xl p-4"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <h1 className="text-[15px] font-semibold">إضافة مستخدم جديد</h1>
        <input required placeholder="الاسم" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={input} />
        <input required dir="ltr" placeholder="اسم المستخدم (يوزر)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={input} />
        <input required type="email" dir="ltr" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
        <input required dir="ltr" placeholder="كلمة المرور (6 أحرف على الأقل)" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
        <RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} />
        <button disabled={m.isPending} className="h-10 w-full rounded-lg bg-brand text-[13px] font-medium text-primary-foreground disabled:opacity-60">
          {m.isPending ? "جارٍ الإضافة…" : "إضافة"}
        </button>
      </form>
      )}
      <section className="glass rounded-2xl p-4">
        <h2 className="mb-3 text-[15px] font-semibold">المستخدمون ({users.length})</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-xl bg-white/55 px-3 py-2 text-[13px] ring-1 ring-black/5">
              <span className="flex-1 truncate font-medium">{u.full_name}</span>
              <span dir="ltr" className="truncate text-[12px] font-semibold text-brand">@{u.username}</span>
              <span dir="ltr" className="truncate text-ink/50">{u.email}</span>
              <span className="text-[11px] text-ink/40">{formatDate(u.created_at)}</span>
              <span className={u.isAdmin ? "pill pill-teal" : "pill pill-brand"}>{ROLE_LABELS[u.role]}</span>
              {!u.isAdmin && auth.isAdmin && (
                <button type="button" title="صلاحيات خاصة" onClick={() => setOverrideFor({ id: u.id, name: u.full_name, role: u.role })} className="grid size-7 place-items-center rounded-lg text-ink/50 hover:bg-black/5 hover:text-ink">
                  <KeyRound className="size-3.5" />
                </button>
              )}
              {canEdit && (
              <button type="button" title="تعديل" onClick={() => setEditing({ id: u.id, fullName: u.full_name, username: u.username ?? "", email: u.email, password: "", role: u.role })} className="grid size-7 place-items-center rounded-lg text-ink/50 hover:bg-black/5 hover:text-ink">
                <Pencil className="size-3.5" />
              </button>
              )}
              {canDelete && u.id !== auth.userId && (
                <button type="button" title="حذف" onClick={() => setDeleting({ id: u.id, name: u.full_name })} className="grid size-7 place-items-center rounded-lg text-terracotta/70 hover:bg-terracotta/10 hover:text-terracotta">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                editM.mutate();
              }}
            >
              <input required placeholder="الاسم" value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} className={input} />
              <input required dir="ltr" placeholder="اسم المستخدم (يوزر)" value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} className={input} />
              <input required type="email" dir="ltr" placeholder="البريد الإلكتروني" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className={input} />
              <input dir="ltr" minLength={6} placeholder="كلمة مرور جديدة (اتركها فارغة لعدم التغيير)" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} className={input} />
              <RoleSelect disabled={editing.id === auth.userId} value={editing.role} onChange={(role) => setEditing({ ...editing, role })} />
              <button disabled={editM.isPending} className="h-10 w-full rounded-lg bg-brand text-[13px] font-medium text-primary-foreground disabled:opacity-60">
                {editM.isPending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <UserOverridesDialog user={overrideFor} onClose={() => setOverrideFor(null)} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف المستخدم"
        description={`سيتم حذف حساب "${deleting?.name ?? ""}" نهائياً ولن يتمكن من الدخول. السجلات التي أضافها ستبقى.`}
        pending={delM.isPending}
        onConfirm={() => delM.mutate()}
      />
    </main>
  );
}
