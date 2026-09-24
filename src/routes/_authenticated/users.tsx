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

type Editing = { id: string; fullName: string; email: string; password: string; isAdmin: boolean };

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
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => list(), enabled: auth.isAdmin });
  const [form, setForm] = useState({ fullName: "", email: "", password: "", isAdmin: false });

  const m = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => {
      toast.success("تمت إضافة المستخدم");
      setForm({ fullName: "", email: "", password: "", isAdmin: false });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useServerFn(updateUser);
  const remove = useServerFn(deleteUser);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
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
  if (!auth.isAdmin)
    return <main className="p-10 text-center text-ink/50">هذه الصفحة متاحة للمدير فقط</main>;

  return (
    <main className="mx-auto grid max-w-[1100px] gap-4 px-4 py-5 lg:grid-cols-[360px_1fr]">
      <form
        className="glass h-fit space-y-3 rounded-2xl p-4"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <h1 className="text-[15px] font-semibold">إضافة مستخدم جديد</h1>
        <input required placeholder="الاسم" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={input} />
        <input required type="email" dir="ltr" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
        <input required dir="ltr" placeholder="كلمة المرور (6 أحرف على الأقل)" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
          صلاحية مدير
        </label>
        <button disabled={m.isPending} className="h-10 w-full rounded-lg bg-brand text-[13px] font-medium text-primary-foreground disabled:opacity-60">
          {m.isPending ? "جارٍ الإضافة…" : "إضافة"}
        </button>
      </form>
      <section className="glass rounded-2xl p-4">
        <h2 className="mb-3 text-[15px] font-semibold">المستخدمون ({users.length})</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-xl bg-white/55 px-3 py-2 text-[13px] ring-1 ring-black/5">
              <span className="flex-1 truncate font-medium">{u.full_name}</span>
              <span dir="ltr" className="truncate text-ink/50">{u.email}</span>
              <span className="text-[11px] text-ink/40">{formatDate(u.created_at)}</span>
              <span className={u.isAdmin ? "pill pill-teal" : "pill pill-brand"}>{u.isAdmin ? "مدير" : "موظف"}</span>
              <button type="button" title="تعديل" onClick={() => setEditing({ id: u.id, fullName: u.full_name, email: u.email, password: "", isAdmin: u.isAdmin })} className="grid size-7 place-items-center rounded-lg text-ink/50 hover:bg-black/5 hover:text-ink">
                <Pencil className="size-3.5" />
              </button>
              {u.id !== auth.userId && (
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
              <input required type="email" dir="ltr" placeholder="البريد الإلكتروني" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className={input} />
              <input dir="ltr" minLength={6} placeholder="كلمة مرور جديدة (اتركها فارغة لعدم التغيير)" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} className={input} />
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" disabled={editing.id === auth.userId} checked={editing.isAdmin} onChange={(e) => setEditing({ ...editing, isAdmin: e.target.checked })} />
                صلاحية مدير
              </label>
              <button disabled={editM.isPending} className="h-10 w-full rounded-lg bg-brand text-[13px] font-medium text-primary-foreground disabled:opacity-60">
                {editM.isPending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
