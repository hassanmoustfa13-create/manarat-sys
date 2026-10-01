import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, SuggestField } from "@/components/FormFields";
import { errorMessage, formatMoney, mergeContacts, requestsQuery, transfersQuery, workersQuery } from "@/lib/data";
import {
  activeFields,
  addDays,
  buildPayload,
  clientLines,
  dayName,
  formsQuery,
  initialValues,
  isVisible,
  remainingOf,
  validate,
  type FormDef,
  type FormField,
  type Values,
} from "@/lib/forms";

type Contact = { name: string; phone: string };
const inputCls =
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

function useContacts(enabled: boolean, extra: Contact[]) {
  const { data: requests } = useQuery({ ...requestsQuery, enabled });
  const { data: workers } = useQuery({ ...workersQuery, enabled });
  const { data: transfers } = useQuery({ ...transfersQuery, enabled });
  return useMemo(
    () =>
      mergeContacts(
        requests?.map((r) => ({ name: r.customer_name, phone: r.phone })),
        workers?.map((w) => ({ name: w.current_sponsor_name, phone: w.current_sponsor_phone })),
        transfers?.map((t) => ({ name: t.new_sponsor_name, phone: t.new_sponsor_phone })),
        transfers?.map((t) => ({ name: t.old_sponsor_name, phone: t.old_sponsor_phone })),
        extra,
      ).filter((c) => c.name !== "الشركة"),
    [requests, workers, transfers, extra],
  );
}

function optionsOf(f: FormField, current: string) {
  const opts = f.form_field_options.filter((o) => o.is_active).map((o) => ({ value: o.value, label: o.label || o.value }));
  // keep a previously saved value selectable even if its option was removed
  if (current && !opts.some((o) => o.value === current)) opts.push({ value: current, label: current });
  return opts;
}

function FileInput({ value, onChange, formKey }: { value: string; onChange: (v: string) => void; formKey: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Input
        type="file"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          const path = `${formKey}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
          const { error } = await supabase.storage.from("form-files").upload(path, file);
          setBusy(false);
          if (error) {
            toast.error(errorMessage(error));
            return;
          }
          onChange(path);
          toast.success("تم رفع الملف");
        }}
      />
      {value && (
        <button
          type="button"
          className="shrink-0 text-[12px] text-brand underline"
          onClick={async () => {
            const { data } = await supabase.storage.from("form-files").createSignedUrl(value, 300);
            if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
          }}
        >
          عرض الملف
        </button>
      )}
    </div>
  );
}

/** Renders one form's fields from its database definition. */
export function DynamicFields({
  form,
  values,
  setValues,
  contacts = [],
}: {
  form: FormDef;
  values: Values;
  setValues: (fn: (v: Values) => Values) => void;
  contacts?: Contact[];
}) {
  const fields = activeFields(form);
  const needsContacts = fields.some((f) => f.settings?.source === "contacts");
  const allContacts = useContacts(needsContacts, contacts);
  const set = (k: string) => (v: string) => setValues((s) => ({ ...s, [k]: v }));
  const remaining = remainingOf(values);
  const full = form.settings.cols === 3 ? "sm:col-span-3" : form.settings.cols === 1 ? "" : "sm:col-span-2";

  return (
    <>
      {fields.map((f) => {
        if (!isVisible(f, values)) return null;
        const v = values[f.field_key] ?? "";
        const label = f.label + (f.required && !f.behavior ? " *" : "");
        const hint = f.helper_text || undefined;
        const cls = f.settings?.full || f.behavior === "clients_lines" ? full : undefined;
        const ltr = f.settings?.ltr || ["phone", "email", "number", "currency", "date", "time"].includes(f.field_type);

        // Built-in automatic fields
        if (f.behavior === "remaining" || f.behavior === "payment_auto") {
          const tone = remaining > 0 ? "border-terracotta/40 text-terracotta" : "border-success/40 text-success";
          return (
            <Field key={f.id} label={f.label} hint={hint}>
              <div className={`flex h-9 items-center rounded-md border border-dashed px-3 text-sm font-semibold tabular-nums ${tone}`} dir={f.behavior === "remaining" ? "ltr" : undefined}>
                {f.behavior === "remaining" ? formatMoney(remaining) : remaining > 0 ? "متبقي مبلغ" : "تم الدفع بالكامل"}
              </div>
            </Field>
          );
        }
        if (f.behavior === "period_end") {
          const start = values["period_start"] ?? "";
          return (
            <Field key={f.id} label={f.label} hint={hint}>
              <Input type="date" dir="ltr" className="text-left" value={start ? addDays(start, 10) : ""} disabled readOnly />
            </Field>
          );
        }
        if (f.behavior === "day_name") {
          return (
            <Field key={f.id} label={f.label} hint={hint}>
              <div className="glass flex h-9 items-center rounded-md px-3 text-sm">{dayName(values["flight_date"] ?? "") || "—"}</div>
            </Field>
          );
        }
        if (f.behavior === "clients_lines") {
          const names = clientLines(v);
          const vc = JSON.parse(values["__visa_clients"] || "[]") as string[];
          return (
            <div key={f.id} className={`space-y-4 ${cls ?? ""}`}>
              <Field label={label} hint={hint}>
                <textarea rows={4} value={v} placeholder={f.placeholder} onChange={(e) => set(f.field_key)(e.target.value)} className={inputCls} />
              </Field>
              {names.length > 0 && (
                <Field label="تابع لتأشيرات المكتب" hint="ضع علامة صح بجانب العميل التابع لتأشيرات المكتب">
                  <div className="flex flex-wrap gap-2">
                    {names.map((c) => {
                      const checked = vc.includes(c);
                      return (
                        <label key={c} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] ${checked ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border"}`}>
                          <input
                            type="checkbox"
                            className="accent-primary"
                            checked={checked}
                            onChange={(e) =>
                              setValues((s) => ({ ...s, __visa_clients: JSON.stringify(e.target.checked ? [...vc, c] : vc.filter((x) => x !== c)) }))
                            }
                          />
                          {c}
                        </label>
                      );
                    })}
                  </div>
                </Field>
              )}
            </div>
          );
        }

        switch (f.field_type) {
          case "textarea":
            return (
              <Field key={f.id} label={label} hint={hint} className={cls ?? full}>
                <textarea rows={3} value={v} placeholder={f.placeholder} onChange={(e) => set(f.field_key)(e.target.value)} className={inputCls} />
              </Field>
            );
          case "select": {
            const defined = optionsOf(f, "");
            const hasOther = defined.some((o) => o.value === "أخرى");
            const isCustom = v !== "" && !defined.some((o) => o.value === v);
            const showOtherInput = hasOther && (v === "أخرى" || isCustom);
            return (
              <Field key={f.id} label={label} hint={hint} className={cls}>
                <select
                  value={isCustom ? "أخرى" : v}
                  onChange={(e) => set(f.field_key)(e.target.value)}
                  className={`${inputCls} h-9 py-1`}
                >
                  {!f.required && <option value="">— اختر —</option>}
                  {f.required && !v && <option value="">— اختر —</option>}
                  {defined.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {showOtherInput && (
                  <Input
                    className="mt-2"
                    value={isCustom ? v : ""}
                    placeholder={`اكتب ${f.label}`}
                    onChange={(e) => set(f.field_key)(e.target.value || "أخرى")}
                  />
                )}
              </Field>
            );
          }
          case "radio":
            return (
              <Field key={f.id} label={label} hint={hint} className={cls}>
                <div className="flex flex-wrap gap-3 pt-1">
                  {optionsOf(f, v).map((o) => (
                    <label key={o.value} className="flex items-center gap-1.5 text-sm">
                      <input type="radio" className="accent-primary" name={f.id} checked={v === o.value} onChange={() => set(f.field_key)(o.value)} />
                      {o.label}
                    </label>
                  ))}
                </div>
              </Field>
            );
          case "checkbox":
            return (
              <Field key={f.id} label={label} hint={hint} className={cls}>
                <label className="flex h-9 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-primary" checked={v === "true"} onChange={(e) => set(f.field_key)(e.target.checked ? "true" : "false")} />
                  {f.placeholder || "نعم"}
                </label>
              </Field>
            );
          case "searchable": {
            const opts = f.settings?.source === "contacts" ? allContacts.map((c) => c.name) : optionsOf(f, "").map((o) => o.label);
            const q = v.trim();
            const filtered = q ? opts.filter((o) => o.includes(q)) : opts;
            return (
              <SuggestField
                key={f.id}
                label={label}
                value={v}
                options={filtered.slice(0, 200)}
                className={cls}
                hint={hint ?? "اكتب اسماً جديداً أو اختر من القائمة"}
                onChange={(nv) => {
                  const pf = f.settings?.phoneField;
                  const match = pf ? allContacts.find((c) => c.name === nv) : undefined;
                  setValues((s) => ({ ...s, [f.field_key]: nv, ...(pf && match?.phone ? { [pf]: match.phone } : {}) }));
                }}
              />
            );
          }
          case "file":
            return (
              <Field key={f.id} label={label} hint={hint} className={cls}>
                <FileInput value={v} onChange={set(f.field_key)} formKey={form.form_key} />
              </Field>
            );
          default: {
            const type =
              f.field_type === "currency" ? "number" : f.field_type === "phone" ? "tel" : f.field_type;
            return (
              <Field key={f.id} label={label} hint={hint} className={cls}>
                <Input
                  type={type}
                  dir={ltr ? "ltr" : undefined}
                  className={ltr ? "text-left" : ""}
                  value={v}
                  placeholder={f.placeholder}
                  min={f.min_value ?? undefined}
                  max={f.max_value ?? undefined}
                  step={f.field_type === "currency" ? "0.01" : undefined}
                  onChange={(e) => set(f.field_key)(e.target.value)}
                />
              </Field>
            );
          }
        }
      })}
    </>
  );
}

const gridCls = (form: FormDef) =>
  form.settings.cols === 3 ? "grid grid-cols-1 gap-4 sm:grid-cols-3" : form.settings.cols === 1 ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-4 sm:grid-cols-2";

/** Generic add/edit dialog driven by the form's database definition. */
export function DynamicFormDialog({
  formKey,
  formDef,
  open,
  onOpenChange,
  record,
  title,
  queryKey,
  contacts,
  successText,
}: {
  formKey?: string;
  formDef?: FormDef;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  record: (Record<string, unknown> & { id: string }) | null;
  title?: string;
  queryKey: string[];
  contacts?: Contact[];
  successText?: string;
}) {
  const qc = useQueryClient();
  const { data: forms } = useQuery(formsQuery);
  const form = formDef ?? forms?.find((f) => f.form_key === formKey);
  const [values, setValues] = useState<Values>({});

  const draftKey = form ? `draft:form:${form.form_key}` : null;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open && form) {
      let init = initialValues(form, record);
      if (!record && draftKey) {
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) init = { ...init, ...JSON.parse(raw) };
        } catch { /* ignore */ }
      }
      setValues(init);
      setLoaded(true);
    } else if (!open) setLoaded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record, form?.id]);

  useEffect(() => {
    if (!open || !loaded || record || !draftKey) return;
    try { localStorage.setItem(draftKey, JSON.stringify(values)); } catch { /* ignore */ }
  }, [values, open, loaded, record, draftKey]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("النموذج غير متاح");
      const existingExtra = ((record?.["extra"] ?? record?.["data"]) ?? {}) as Record<string, unknown>;
      const payload = buildPayload(form, values, existingExtra);
      const table = form.target_table;
      const { error } = record
        ? await supabase.from(table).update(payload as never).eq("id", record.id)
        : await supabase.from(table).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(record ? "تم حفظ التعديلات" : (successText ?? "تمت الإضافة"));
      if (!record && draftKey) localStorage.removeItem(draftKey);
      qc.invalidateQueries({ queryKey });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`glass-strong max-h-[90vh] overflow-y-auto ${form?.settings.cols === 3 ? "max-w-3xl" : "max-w-2xl"}`} dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{title ?? (record ? `تعديل — ${form?.name ?? ""}` : `إضافة — ${form?.name ?? ""}`)}</DialogTitle>
          {form?.settings.description && <DialogDescription>{form.settings.description}</DialogDescription>}
        </DialogHeader>
        {!form ? (
          <div className="glass h-40 animate-pulse rounded-xl" />
        ) : !form.is_active && !record ? (
          <p className="py-8 text-center text-ink/60">هذا النموذج معطّل حاليًا من قِبل المدير.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const err = validate(form, values);
              if (err) return void toast.error(err);
              save.mutate();
            }}
            className={gridCls(form)}
          >
            <DynamicFields form={form} values={values} setValues={setValues} contacts={contacts ?? []} />
            <DialogFooter className={`${form.settings.cols === 3 ? "sm:col-span-3" : "sm:col-span-2"} sm:justify-start`}>
              <Button type="submit" disabled={save.isPending}>{record ? "حفظ" : "إضافة"}</Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Read-only preview used by the admin editor. */
export function FormPreview({ form }: { form: FormDef }) {
  const [values, setValues] = useState<Values>(() => initialValues(form, null));
  useEffect(() => setValues(initialValues(form, null)), [form]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const err = validate(form, values);
        toast[err ? "error" : "success"](err ?? "المعاينة: البيانات صحيحة (لم يتم حفظ شيء)");
      }}
      className={gridCls(form)}
    >
      <DynamicFields form={form} values={values} setValues={setValues} />
      <div className={form.settings.cols === 3 ? "sm:col-span-3" : "sm:col-span-2"}>
        <Button type="submit" variant="outline">تجربة التحقق</Button>
      </div>
    </form>
  );
}
