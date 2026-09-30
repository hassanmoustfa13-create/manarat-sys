import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/FormFields";
import { errorMessage } from "@/lib/data";
import { formsQuery } from "@/lib/forms";

export const Route = createFileRoute("/_authenticated/forms")({
  head: () => ({
    meta: [
      { title: "إدارة النماذج — منارات هجر للاستقدام" },
      { name: "description", content: "التحكم في حقول نماذج الإضافة وخياراتها من لوحة الإدارة" },
      { property: "og:title", content: "إدارة النماذج — منارات هجر للاستقدام" },
      { property: "og:description", content: "التحكم في حقول نماذج الإضافة وخياراتها من لوحة الإدارة" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FormsLayout,
});

function FormsLayout() {
  const match = useMatchRoute();
  if (match({ to: "/forms/$formId", fuzzy: true })) return <Outlet />;
  return <FormsList />;
}

function FormsList() {
  const auth = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: forms = [], isLoading } = useQuery(formsQuery);
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("forms").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: formsQuery.queryKey }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("اكتب اسم النموذج");
      const key = `form_${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from("forms")
        .insert({
          form_key: key,
          name: name.trim(),
          route: `/f/${key}`,
          target_table: "form_entries",
          is_active: false,
          sort_order: 100 + forms.length,
          settings: { cols: 2 },
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: formsQuery.queryKey });
      setNewOpen(false);
      setName("");
      toast.success("تم إنشاء النموذج — أضف الحقول ثم فعّله");
      navigate({ to: "/forms/$formId", params: { formId: id } });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!auth.loading && !auth.isAdmin) {
    return <div className="p-10 text-center text-muted-foreground">هذه الصفحة للمدير فقط.</div>;
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">إدارة النماذج</h1>
          <p className="text-[13px] text-ink/55">تحكم في حقول نوافذ «إضافة» وخيارات القوائم بدون تعديل البرنامج.</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="size-4" /> نموذج جديد
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white/60 ring-1 ring-black/8">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-black/10 bg-white/90 text-[13px] text-ink/70">
              <th className="px-4 py-3 text-right">اسم النموذج</th>
              <th className="px-4 py-3 text-right">الصفحة</th>
              <th className="px-4 py-3 text-center">عدد الحقول</th>
              <th className="px-4 py-3 text-center">مفعّل</th>
              <th className="px-4 py-3 text-center">تعديل</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-ink/50">جارٍ التحميل…</td>
              </tr>
            )}
            {forms.map((f) => (
              <tr key={f.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">
                  {f.name}
                  {f.is_system && <span className="ms-2 rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-ink/50">أساسي</span>}
                </td>
                <td className="px-4 py-3 text-ink/60" dir="ltr">{f.route}</td>
                <td className="px-4 py-3 text-center tabular-nums">{f.form_fields.filter((x) => x.is_active).length} / {f.form_fields.length}</td>
                <td className="px-4 py-3 text-center">
                  <Switch checked={f.is_active} onCheckedChange={(v) => toggle.mutate({ id: f.id, is_active: v })} aria-label="تفعيل النموذج" />
                </td>
                <td className="px-4 py-3 text-center">
                  <Link to="/forms/$formId" params={{ formId: f.id }} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] text-brand hover:bg-brand/10">
                    <Pencil className="size-3.5" /> تعديل
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent dir="rtl" className="glass-strong max-w-md">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>نموذج جديد</DialogTitle>
            <DialogDescription>سيحصل على صفحة خاصة وجدول خاص به، ويظهر في القائمة بعد تفعيله.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="space-y-4"
          >
            <Field label="اسم النموذج">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <DialogFooter className="sm:justify-start">
              <Button type="submit" disabled={create.isPending}>إنشاء</Button>
              <Button type="button" variant="ghost" onClick={() => setNewOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
