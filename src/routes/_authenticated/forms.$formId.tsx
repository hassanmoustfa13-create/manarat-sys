import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowRight, ArrowUp, Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/FormFields";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { FormPreview } from "@/components/DynamicForm";
import { errorMessage } from "@/lib/data";
import {
  BEHAVIORS,
  FIELD_TYPES,
  OPTION_TYPES,
  detailBlockOrder,
  DETAIL_ACTION,
  DETAIL_AUDIT,
  DETAIL_HISTORY,
  formsQuery,
  type FieldType,
  type FormDef,
  type FormField,
} from "@/lib/forms";

export const Route = createFileRoute("/_authenticated/forms/$formId")({
  head: () => ({
    meta: [
      { title: "تعديل نموذج — منارات هجر للاستقدام" },
      { name: "description", content: "إدارة حقول النموذج وخيارات القوائم" },
      { property: "og:title", content: "تعديل نموذج — منارات هجر للاستقدام" },
      { property: "og:description", content: "إدارة حقول النموذج وخيارات القوائم" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FormEditor,
});

const sel = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none";

function FormEditor() {
  const { formId } = Route.useParams();
  const auth = useAuth();
  const qc = useQueryClient();
  const { data: forms, isLoading } = useQuery(formsQuery);
  const form = forms?.find((f) => f.id === formId);
  const [editing, setEditing] = useState<FormField | "new" | null>(null);
  const [deleting, setDeleting] = useState<FormField | null>(null);
  const [preview, setPreview] = useState(false);
  const [picking, setPicking] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: formsQuery.queryKey });

  const run = useMutation({
    mutationFn: async (fn: () => Promise<{ error: unknown }>) => {
      const { error } = await fn();
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!auth.loading && !auth.can("admin_forms", "view")) return <div className="p-10 text-center text-muted-foreground">هذه الصفحة للمدير فقط.</div>;
  if (isLoading || !form) return <div className="p-10 text-center text-ink/50">{isLoading ? "جارٍ التحميل…" : "النموذج غير موجود"}</div>;

  const fields = form.form_fields;
  const move = (i: number, d: -1 | 1) => {
    const a = fields[i];
    const b = fields[i + d];
    if (!a || !b) return;
    run.mutate(async () => {
      const r1 = await supabase.from("form_fields").update({ sort_order: b.sort_order }).eq("id", a.id);
      if (r1.error) return r1;
      return supabase.from("form_fields").update({ sort_order: a.sort_order }).eq("id", b.id);
    });
  };
  const duplicate = (f: FormField) =>
    run.mutate(async () => {
      let key = `${f.field_key}_copy`;
      let n = 2;
      while (fields.some((x) => x.field_key === key)) key = `${f.field_key}_copy${n++}`;
      const { data, error } = await supabase
        .from("form_fields")
        .insert({
          form_id: form.id,
          field_key: key,
          label: `${f.label} (نسخة)`,
          field_type: f.behavior ? "text" : f.field_type,
          required: f.required,
          placeholder: f.placeholder,
          default_value: f.default_value,
          helper_text: f.helper_text,
          min_value: f.min_value,
          max_value: f.max_value,
          sort_order: f.sort_order + 1,
          settings: { ...f.settings, source: undefined, phoneField: undefined } as never,
          validation: f.validation as never,
        })
        .select("id")
        .single();
      if (error) return { error };
      if (f.form_field_options.length)
        return supabase.from("form_field_options").insert(
          f.form_field_options.map((o) => ({ field_id: data.id, value: o.value, label: o.label, sort_order: o.sort_order, is_active: o.is_active })),
        );
      return { error: null };
    });

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6">
      <Link to="/forms" className="mb-3 inline-flex items-center gap-1 text-[13px] text-ink/60 hover:text-ink">
        <ArrowRight className="size-4" /> كل النماذج
      </Link>
      <FormSettingsCard form={form} onSaved={refresh} />
      {form.form_key === "transfer_details" && <DetailLayoutCard form={form} onSaved={refresh} />}

      <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">الحقول ({fields.length})</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreview(true)} className="gap-1.5">
            <Eye className="size-4" /> معاينة النموذج
          </Button>
          <Button onClick={() => (form.form_key === "transfer_details" ? setPicking(true) : setEditing("new"))} className="gap-1.5">
            <Plus className="size-4" /> إضافة حقل
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white/60 ring-1 ring-black/8">
        <table className="ledger-rows w-full text-[14px]">
          <thead>
            <tr className="border-b border-black/10 bg-white/90 text-[12px] text-ink/65">
              <th className="w-10 px-3 py-2.5">#</th>
              <th className="px-3 py-2.5 text-right">الاسم الظاهر</th>
              <th className="px-3 py-2.5 text-right">المفتاح</th>
              <th className="px-3 py-2.5 text-right">النوع</th>
              <th className="px-3 py-2.5 text-center">إلزامي</th>
              <th className="px-3 py-2.5 text-center">مفعّل</th>
              <th className="px-3 py-2.5 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink/50">لا توجد حقول بعد — اضغط «إضافة حقل».</td>
              </tr>
            )}
            {fields.map((f, i) => (
              <tr key={f.id} className={`border-b border-black/5 last:border-0 ${f.is_active ? "" : "opacity-50"}`}>
                <td className="px-3 py-2 text-center text-ink/45">{i + 1}</td>
                <td className="px-3 py-2 font-medium">
                  {f.label}
                  {f.behavior && <div className="text-[11px] font-normal text-teal">{BEHAVIORS[f.behavior]}</div>}
                  {f.conditions?.field && (
                    <div className="text-[11px] font-normal text-ink/45">
                      يظهر عند: {f.conditions.field} {f.conditions.op === "eq" ? "=" : "≠"} {f.conditions.value}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-[12px] text-ink/55" dir="ltr">{f.field_key}</td>
                <td className="px-3 py-2 text-[13px]">
                  {FIELD_TYPES[f.field_type] ?? f.field_type}
                  {OPTION_TYPES.includes(f.field_type) && <span className="text-ink/45"> · {f.form_field_options.length} خيار</span>}
                </td>
                <td className="px-3 py-2 text-center">{f.required ? "✓" : "—"}</td>
                <td className="px-3 py-2 text-center">
                  <Switch
                    checked={f.is_active}
                    onCheckedChange={(v) => run.mutate(async () => supabase.from("form_fields").update({ is_active: v }).eq("id", f.id))}
                    aria-label="تفعيل الحقل"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-0.5">
                    <IBtn title="أعلى" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-3.5" /></IBtn>
                    <IBtn title="أسفل" onClick={() => move(i, 1)} disabled={i === fields.length - 1}><ArrowDown className="size-3.5" /></IBtn>
                    <IBtn title="تعديل" onClick={() => setEditing(f)}><Pencil className="size-3.5" /></IBtn>
                    <IBtn title="نسخ" onClick={() => duplicate(f)}><Copy className="size-3.5" /></IBtn>
                    <IBtn
                      title={f.is_system ? "حقل أساسي — يمكن تعطيله فقط" : "حذف"}
                      danger
                      disabled={f.is_system}
                      onClick={() => setDeleting(f)}
                    >
                      <Trash2 className="size-3.5" />
                    </IBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-ink/45">
        الحقول «الأساسية» مرتبطة بأعمدة الجدول الحالية ولا تُحذف (يمكن تعطيلها أو تغيير اسمها وخياراتها). حذف أو تعطيل أي حقل لا يحذف البيانات المحفوظة سابقًا.
      </p>

      {picking && <PickManualField form={form} forms={forms ?? []} onClose={() => setPicking(false)} onSaved={() => { setPicking(false); refresh(); }} />}
      {editing && (
        <FieldEditor
          form={form}
          field={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف الحقل؟"
        description={`سيتم حذف إعداد الحقل «${deleting?.label ?? ""}» وخياراته من النموذج. البيانات المحفوظة سابقًا لن تُحذف.`}
        pending={run.isPending}
        onConfirm={() => {
          const d = deleting;
          if (!d) return;
          run.mutate(async () => supabase.from("form_fields").delete().eq("id", d.id), { onSuccess: () => setDeleting(null) });
        }}
      />
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent dir="rtl" className={`glass-strong max-h-[90vh] overflow-y-auto ${form.settings.cols === 3 ? "max-w-3xl" : "max-w-2xl"}`}>
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>معاينة: {form.name}</DialogTitle>
            <DialogDescription>هكذا سيظهر النموذج للموظف. لا يُحفظ شيء من هنا.</DialogDescription>
          </DialogHeader>
          <FormPreview form={form} />
        </DialogContent>
      </Dialog>
    </main>
  );
}

function IBtn({ title, onClick, children, danger, disabled }: { title: string; onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-7 place-items-center rounded-md transition-colors disabled:opacity-30 ${danger ? "text-destructive hover:bg-destructive/10" : "text-ink/60 hover:bg-black/5"}`}
    >
      {children}
    </button>
  );
}

const DEFAULT_SECTION = "بيانات العملية";

function DetailLayoutCard({ form, onSaved }: { form: FormDef; onSaved: () => void }) {
  const available = detailBlockOrder(form);
  const active = form.form_fields.filter((f) => f.is_active);
  const initAssign = () => Object.fromEntries(active.map((f) => [f.id, f.section || DEFAULT_SECTION])) as Record<string, string>;
  const [order, setOrder] = useState(available);
  const [assign, setAssign] = useState(initAssign);
  const [names, setNames] = useState<Record<string, string>>({});
  const [newSection, setNewSection] = useState("");
  useEffect(() => { setOrder(available); setAssign(initAssign()); setNames({}); }, [form]);

  const sectionsInOrder = order.filter((k) => k.startsWith("section:")).map((k) => k.slice(8));
  const fieldsOf = (sec: string) =>
    active.filter((f) => (assign[f.id] ?? DEFAULT_SECTION) === sec).sort((a, b) => a.sort_order - b.sort_order);
  const save = useMutation({
    mutationFn: async () => {
      const finalName = (s: string) => (names[s]?.trim() || s);
      const finalNames = sectionsInOrder.map(finalName);
      if (new Set(finalNames).size !== finalNames.length) throw new Error("يوجد جزآن بنفس الاسم");
      let sort = 10;
      for (const sec of sectionsInOrder) {
        for (const f of fieldsOf(sec)) {
          const target = finalName(sec);
          if (target !== (f.section || DEFAULT_SECTION) || sort !== f.sort_order) {
            const { error } = await supabase.from("form_fields").update({ section: target, sort_order: sort }).eq("id", f.id);
            if (error) throw error;
          }
          sort += 10;
        }
      }
      const used = new Set(active.map((f) => finalName(assign[f.id] ?? DEFAULT_SECTION)));
      const detailOrder = order
        .map((k) => (k.startsWith("section:") ? `section:${finalName(k.slice(8))}` : k))
        .filter((k) => !k.startsWith("section:") || used.has(k.slice(8)));
      const { error } = await supabase.from("forms").update({ settings: { ...form.settings, detailOrder } as never }).eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم حفظ أجزاء نافذة التفاصيل"); onSaved(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const move = (index: number, direction: -1 | 1) => {
    const next = [...order];
    const current = next[index];
    const other = next[index + direction];
    if (!current || !other) return;
    next[index + direction] = current;
    next[index] = other;
    setOrder(next);
  };
  const moveField = async (sec: string, fieldId: string, direction: -1 | 1) => {
    const fields = fieldsOf(sec);
    const i = fields.findIndex((f) => f.id === fieldId);
    const other = fields[i + direction];
    if (i < 0 || !other) return;
    const a = fields[i];
    const { error: e1 } = await supabase.from("form_fields").update({ sort_order: other.sort_order }).eq("id", a.id);
    const { error: e2 } = await supabase.from("form_fields").update({ sort_order: a.sort_order }).eq("id", other.id);
    if (e1 || e2) return void toast.error(errorMessage(e1 ?? e2));
    onSaved();
  };
  const addSection = () => {
    const n = newSection.trim();
    if (!n || sectionsInOrder.includes(n)) return;
    const firstExtra = order.findIndex((k) => !k.startsWith("section:"));
    const next = [...order];
    next.splice(firstExtra < 0 ? next.length : firstExtra, 0, `section:${n}`);
    setOrder(next);
    setNewSection("");
  };
  const label = (key: string) => key === DETAIL_HISTORY ? "سجل الكفلاء الجدد" : key === DETAIL_AUDIT ? "سجل التدقيق" : key === DETAIL_ACTION ? "زر تعديل البيانات" : key.slice(8);
  return (
    <section className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">أجزاء نافذة التفاصيل</h2>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>حفظ الأجزاء والترتيب</Button>
      </div>
      <p className="text-[12px] text-ink/50">غيّر اسم أي جزء، واختر لكل حقل الجزء الذي يظهر فيه، ورتّب الأجزاء بالأسهم.</p>
      <div className="space-y-2">
        {order.map((key, i) => {
          const isSection = key.startsWith("section:");
          const sec = key.slice(8);
          const fields = isSection ? active.filter((f) => (assign[f.id] ?? DEFAULT_SECTION) === sec) : [];
          return (
            <div key={key} className="rounded-lg border border-border p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                {isSection ? (
                  <Input className="h-8 max-w-xs font-semibold" value={names[sec] ?? sec} onChange={(e) => setNames({ ...names, [sec]: e.target.value })} aria-label="اسم الجزء" />
                ) : (
                  <span className="font-semibold">{label(key)}</span>
                )}
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" title="أعلى" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" title="أسفل" disabled={i === order.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
                </div>
              </div>
              {isSection && (
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {fields.length === 0 && <span className="text-[12px] text-ink/45">لا توجد حقول — انقل حقلًا إلى هذا الجزء (الجزء الفارغ لا يُحفظ).</span>}
                  {fields.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1">
                      <span className="truncate">{f.label}</span>
                      <select className="h-7 rounded border border-input bg-transparent px-1 text-xs" value={sec} onChange={(e) => setAssign({ ...assign, [f.id]: e.target.value })} aria-label={`جزء ${f.label}`}>
                        {sectionsInOrder.map((s) => <option key={s} value={s}>{names[s]?.trim() || s}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input className="h-9 max-w-xs" value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="اسم جزء جديد" />
        <Button variant="outline" onClick={addSection} className="gap-1.5"><Plus className="size-4" /> إضافة جزء</Button>
      </div>
    </section>
  );
}

function PickManualField({ form, forms, onClose, onSaved }: { form: FormDef; forms: FormDef[]; onClose: () => void; onSaved: () => void }) {
  const existing = new Set(form.form_fields.flatMap((f) => [f.field_key, f.column_name ? `col:${f.column_name}` : ""]));
  const seen = new Set<string>();
  const candidates = forms
    .filter((f) => f.form_key === "manual_domestic" || f.form_key === "manual_pro")
    .flatMap((f) => f.form_fields)
    .filter((f) => {
      if (existing.has(f.field_key) || (f.column_name && existing.has(`col:${f.column_name}`)) || seen.has(f.field_key)) return false;
      seen.add(f.field_key);
      return true;
    });
  const sections = [...new Set(form.form_fields.map((f) => f.section || DEFAULT_SECTION))];
  const [pick, setPick] = useState("");
  const [section, setSection] = useState(sections[0] ?? DEFAULT_SECTION);
  const save = useMutation({
    mutationFn: async () => {
      const f = candidates.find((c) => c.field_key === pick);
      if (!f) throw new Error("اختر حقلًا");
      const sort = Math.max(0, ...form.form_fields.map((x) => x.sort_order)) + 1;
      const { error } = await supabase.from("form_fields").insert({
        form_id: form.id, field_key: f.field_key, label: f.label, field_type: f.field_type, column_name: f.column_name,
        behavior: f.behavior, section, sort_order: sort, conditions: f.conditions as never, settings: f.settings as never,
        validation: f.validation as never, min_value: f.min_value, max_value: f.max_value,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تمت إضافة الحقل"); onSaved(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة حقل إلى نافذة التفاصيل</DialogTitle>
          <DialogDescription>اختر حقلًا من نموذج نقل الكفالة اليدوي.</DialogDescription>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-sm text-ink/60">كل حقول نقل الكفالة اليدوي موجودة بالفعل في نافذة التفاصيل.</p>
        ) : (
          <div className="space-y-3">
            <Field label="الحقل">
              <select className={sel} value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">— اختر —</option>
                {candidates.map((c) => <option key={c.field_key} value={c.field_key}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="الجزء">
              <select className={sel} value={section} onChange={(e) => setSection(e.target.value)}>
                {sections.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => save.mutate()} disabled={!pick || save.isPending}>إضافة</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormSettingsCard({ form, onSaved }: { form: FormDef; onSaved: () => void }) {
  const [name, setName] = useState(form.name);
  const [desc, setDesc] = useState(form.settings.description ?? "");
  const [cols, setCols] = useState(String(form.settings.cols ?? 2));
  useEffect(() => {
    setName(form.name);
    setDesc(form.settings.description ?? "");
    setCols(String(form.settings.cols ?? 2));
  }, [form]);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("forms")
        .update({ name: name.trim() || form.name, settings: { ...form.settings, description: desc, cols: Number(cols) } as never })
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات النموذج");
      onSaved();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-lg font-semibold">{form.name}</h1>
        <span className="text-[12px] text-ink/45" dir="ltr">{form.route}</span>
        <span className={`ms-auto rounded-full px-2.5 py-0.5 text-[12px] ${form.is_active ? "bg-success/15 text-success" : "bg-black/5 text-ink/50"}`}>
          {form.is_active ? "مفعّل" : "معطّل"}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_auto_auto] sm:items-end">
        <Field label="اسم النموذج">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="وصف يظهر أعلى النافذة">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <Field label="أعمدة النافذة">
          <select value={cols} onChange={(e) => setCols(e.target.value)} className={sel}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </Field>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>حفظ</Button>
      </div>
    </div>
  );
}

type Opt = { id?: string; value: string; label: string; is_active: boolean };

function FieldEditor({ form, field, onClose, onSaved }: { form: FormDef; field: FormField | null; onClose: () => void; onSaved: () => void }) {
  const locked = Boolean(field?.is_system);
  const [key, setKey] = useState(field?.field_key ?? "");
  const [label, setLabel] = useState(field?.label ?? "");
  const [type, setType] = useState<FieldType>(field?.field_type ?? "text");
  const [required, setRequired] = useState(field?.required ?? false);
  const [placeholder, setPlaceholder] = useState(field?.placeholder ?? "");
  const [def, setDef] = useState(field?.default_value ?? "");
  const [helper, setHelper] = useState(field?.helper_text ?? "");
  const [min, setMin] = useState(field?.min_value == null ? "" : String(field.min_value));
  const [max, setMax] = useState(field?.max_value == null ? "" : String(field.max_value));
  const [pattern, setPattern] = useState(field?.validation?.pattern ?? "");
  const [section, setSection] = useState(field?.section ?? "");
  const [full, setFull] = useState(Boolean(field?.settings?.full));
  const [opts, setOpts] = useState<Opt[]>(
    field?.form_field_options.map((o) => ({ id: o.id, value: o.value, label: o.label, is_active: o.is_active })) ?? [],
  );
  const [removeOpt, setRemoveOpt] = useState<number | null>(null);
  const [condField, setCondField] = useState(field?.conditions?.field ?? "");
  const [condOp, setCondOp] = useState<"eq" | "neq">(field?.conditions?.op === "neq" ? "neq" : "eq");
  const [condValue, setCondValue] = useState(field?.conditions?.value ?? "");
  const condOptions = form.form_fields.find((f) => f.field_key === condField)?.form_field_options ?? [];
  const hasOptions = OPTION_TYPES.includes(type) && !(field?.settings?.source === "contacts");

  const save = useMutation({
    mutationFn: async () => {
      const k = key.trim();
      if (!label.trim()) throw new Error("اكتب الاسم الظاهر للحقل");
      if (!/^[a-z][a-z0-9_]*$/.test(k)) throw new Error("المفتاح الداخلي: حروف إنجليزية صغيرة وأرقام و _ فقط، ويبدأ بحرف");
      if (form.form_fields.some((f) => f.field_key === k && f.id !== field?.id)) throw new Error("المفتاح مستخدم في حقل آخر");
      if (hasOptions && opts.some((o) => !o.value.trim())) throw new Error("كل خيار يحتاج قيمة داخلية");
      const body = {
        label: label.trim(),
        required,
        placeholder,
        default_value: def,
        helper_text: helper,
        min_value: min === "" ? null : Number(min),
        max_value: max === "" || Number(max) < 0 ? null : Number(max),
        validation: (pattern ? { ...field?.validation, pattern } : {}) as never,
        ...(form.form_key === "transfer_details" ? { section: section.trim() } : {}),
        conditions: (condField ? { field: condField, op: condOp, value: condValue } : {}) as never,
        settings: { ...field?.settings, full } as never,
        ...(locked ? {} : { field_key: k, field_type: type }),
      };
      let fieldId = field?.id;
      if (field) {
        const { error } = await supabase.from("form_fields").update(body).eq("id", field.id);
        if (error) throw error;
      } else {
        const sort = Math.max(0, ...form.form_fields.map((f) => f.sort_order)) + 1;
        const { data, error } = await supabase
          .from("form_fields")
          .insert({ ...body, form_id: form.id, field_key: k, field_type: type, sort_order: sort })
          .select("id")
          .single();
        if (error) throw error;
        fieldId = data.id;
      }
      if (!fieldId) return;
      if (hasOptions) {
        const keep = opts.filter((o) => o.id).map((o) => o.id!);
        const removed = (field?.form_field_options ?? []).filter((o) => !keep.includes(o.id)).map((o) => o.id);
        if (removed.length) {
          const { error } = await supabase.from("form_field_options").delete().in("id", removed);
          if (error) throw error;
        }
        for (const [i, o] of opts.entries()) {
          const row = { field_id: fieldId, value: o.value.trim(), label: o.label.trim() || o.value.trim(), is_active: o.is_active, sort_order: i + 1 };
          const { error } = o.id
            ? await supabase.from("form_field_options").update(row).eq("id", o.id)
            : await supabase.from("form_field_options").insert(row);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("تم حفظ الحقل");
      onSaved();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setOpt = (i: number, p: Partial<Opt>) => setOpts((l) => l.map((o, j) => (j === i ? { ...o, ...p } : o)));
  const moveOpt = (i: number, d: -1 | 1) =>
    setOpts((l) => {
      const n = [...l];
      const t = n[i + d];
      if (!t) return l;
      n[i + d] = n[i]!;
      n[i] = t;
      return n;
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="glass-strong max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{field ? `تعديل الحقل: ${field.label}` : "حقل جديد"}</DialogTitle>
          <DialogDescription>
            {locked ? "حقل أساسي مرتبط بعمود في الجدول — المفتاح والنوع ثابتان." : "الحقل الجديد يُحفظ مع السجل دون تغيير الجداول الحالية."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label="الاسم الظاهر للمستخدم *">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="المفتاح الداخلي (فريد)" hint="مثال: passport_expiry">
            <Input dir="ltr" className="text-left" value={key} disabled={locked} onChange={(e) => setKey(e.target.value)} />
          </Field>
          <Field label="نوع الحقل">
            <select value={type} disabled={locked} onChange={(e) => setType(e.target.value as FieldType)} className={sel}>
              {Object.entries(FIELD_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="القيمة الافتراضية" hint={type === "date" ? "اكتب today لتاريخ اليوم" : undefined}>
            <Input value={def} onChange={(e) => setDef(e.target.value)} />
          </Field>
          <Field label="النص التوضيحي (Placeholder)">
            <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
          </Field>
          <Field label="نص مساعد أسفل الحقل">
            <Input value={helper} onChange={(e) => setHelper(e.target.value)} />
          </Field>
          {form.form_key === "transfer_details" && (
            <Field label="القسم في نافذة التفاصيل">
              <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="بيانات العملية" />
            </Field>
          )}
          <div className="grid gap-2 rounded-lg border p-3 sm:col-span-2 sm:grid-cols-3">
            <span className="text-[13px] font-semibold sm:col-span-3">شرط الظهور (اختياري)</span>
            <Field label="يظهر عندما يكون الحقل">
              <select value={condField} onChange={(e) => { setCondField(e.target.value); setCondValue(""); }} className={sel}>
                <option value="">— يظهر دائمًا —</option>
                {form.form_fields.filter((f) => f.id !== field?.id && f.is_active).map((f) => (
                  <option key={f.id} value={f.field_key}>{f.label}</option>
                ))}
              </select>
            </Field>
            {condField && (
              <>
                <Field label="المقارنة">
                  <select value={condOp} onChange={(e) => setCondOp(e.target.value as "eq" | "neq")} className={sel}>
                    <option value="eq">يساوي</option>
                    <option value="neq">لا يساوي</option>
                  </select>
                </Field>
                <Field label="القيمة">
                  {condOptions.length ? (
                    <select value={condValue} onChange={(e) => setCondValue(e.target.value)} className={sel}>
                      <option value="">— اختر —</option>
                      {condOptions.map((o) => <option key={o.id} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <Input value={condValue} onChange={(e) => setCondValue(e.target.value)} />
                  )}
                </Field>
              </>
            )}
          </div>
          <Field label="الحد الأدنى" hint="للأرقام: أقل قيمة — للنص: أقل عدد أحرف">
            <Input type="number" dir="ltr" value={min} onChange={(e) => setMin(e.target.value)} />
          </Field>
          <Field label="الحد الأقصى" hint="اتركه فارغًا إذا لم ترد تحديد حد أقصى">
            <Input type="number" min="0" dir="ltr" value={max} onChange={(e) => setMax(e.target.value)} />
          </Field>
          <Field label="قاعدة تحقق (اختياري، نمط Regex)" className="sm:col-span-2">
            <Input dir="ltr" className="text-left" value={pattern} placeholder="^05\d{8}$" onChange={(e) => setPattern(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={required} onCheckedChange={setRequired} /> إلزامي
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={full} onCheckedChange={setFull} /> بعرض النافذة كاملة
          </label>

          {hasOptions && (
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">خيارات القائمة</span>
                <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setOpts((l) => [...l, { value: "", label: "", is_active: true }])}>
                  <Plus className="size-3.5" /> إضافة خيار
                </Button>
              </div>
              {opts.length === 0 && <p className="text-[12px] text-ink/45">لا توجد خيارات بعد.</p>}
              {opts.map((o, i) => (
                <div key={o.id ?? `n${i}`} className={`flex items-center gap-1.5 ${o.is_active ? "" : "opacity-50"}`}>
                  <Input placeholder="النص الظاهر" value={o.label} onChange={(e) => setOpt(i, { label: e.target.value, ...(o.id ? {} : { value: e.target.value }) })} />
                  <Input placeholder="القيمة الداخلية" value={o.value} onChange={(e) => setOpt(i, { value: e.target.value })} />
                  <IBtn title={o.is_active ? "تعطيل" : "تفعيل"} onClick={() => setOpt(i, { is_active: !o.is_active })}>
                    {o.is_active ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </IBtn>
                  <IBtn title="أعلى" disabled={i === 0} onClick={() => moveOpt(i, -1)}><ArrowUp className="size-3.5" /></IBtn>
                  <IBtn title="أسفل" disabled={i === opts.length - 1} onClick={() => moveOpt(i, 1)}><ArrowDown className="size-3.5" /></IBtn>
                  <IBtn title="حذف" danger onClick={() => setRemoveOpt(i)}><Trash2 className="size-3.5" /></IBtn>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="sm:col-span-2 sm:justify-start">
            <Button type="submit" disabled={save.isPending}>حفظ الحقل</Button>
            <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
          </DialogFooter>
        </form>
        <ConfirmDelete
          open={removeOpt !== null}
          onOpenChange={(o) => !o && setRemoveOpt(null)}
          title="حذف الخيار؟"
          description={`سيُحذف الخيار «${removeOpt !== null ? (opts[removeOpt]?.label ?? "") : ""}» عند حفظ الحقل. السجلات القديمة تحتفظ بقيمتها.`}
          pending={false}
          onConfirm={() => {
            const i = removeOpt;
            setOpts((l) => l.filter((_, j) => j !== i));
            setRemoveOpt(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
