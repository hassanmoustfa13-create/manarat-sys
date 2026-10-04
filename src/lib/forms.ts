import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Field types. Add a new entry here (and a renderer case in DynamicForm) to support a new type. */
export const FIELD_TYPES = {
  text: "نص",
  number: "رقم",
  phone: "هاتف",
  email: "بريد إلكتروني",
  date: "تاريخ",
  time: "وقت",
  textarea: "نص طويل",
  select: "قائمة منسدلة",
  radio: "اختيار واحد (Radio)",
  checkbox: "مربع اختيار",
  file: "رفع ملف",
  currency: "مبلغ",
  searchable: "قائمة قابلة للبحث",
} as const;
export type FieldType = keyof typeof FIELD_TYPES;
export const OPTION_TYPES: FieldType[] = ["select", "radio", "searchable"];
export const NUMERIC_TYPES: FieldType[] = ["number", "currency"];

/** Built-in automatic behaviours of the original forms (kept working, tied to the field). */
export const BEHAVIORS: Record<string, string> = {
  remaining: "حقل متوقف — لا يُستخدم في الحساب",
  payment_auto: "حالة الدفع (اختيار يدوي)",
  period_start: "بداية التجربة (تُحسب النهاية +10 أيام)",
  period_end: "نهاية التجربة (تلقائي)",
  day_name: "اسم اليوم من التاريخ (تلقائي)",
  clients_lines: "عملاء سطرًا بسطر + علامة تأشيرات المكتب",
};
export const COMPUTED_BEHAVIORS = ["remaining", "period_end", "day_name"];

export type FormOption = { id: string; field_id: string; value: string; label: string; sort_order: number; is_active: boolean };
export type Condition = { field?: string; op?: "eq" | "neq"; value?: string };
export type FieldSettings = { ltr?: boolean; full?: boolean; source?: "contacts"; phoneField?: string };
export type FormField = {
  id: string;
  form_id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  placeholder: string;
  default_value: string;
  helper_text: string;
  min_value: number | null;
  max_value: number | null;
  sort_order: number;
  is_active: boolean;
  column_name: string | null;
  is_system: boolean;
  behavior: string;
  section: string;
  validation: { pattern?: string; message?: string };
  conditions: Condition;
  settings: FieldSettings;
  form_field_options: FormOption[];
};
export const DETAIL_HISTORY = "__sponsor_history";
export const DETAIL_AUDIT = "__audit";
export const DETAIL_ACTION = "__edit_action";
export const DETAIL_EXTRAS = [DETAIL_AUDIT, DETAIL_ACTION, DETAIL_HISTORY] as const;
export const detailSectionKey = (section: string) => `section:${section}`;
export function detailBlockOrder(form: FormDef) {
  const sections = [...new Set(activeFields(form).map((f) => detailSectionKey(f.section || "بيانات العملية")))];
  const available = [...sections, ...DETAIL_EXTRAS];
  const saved = form.settings.detailOrder ?? [];
  const ordered = saved.filter((key) => available.includes(key));
  const newSections = sections.filter((key) => !ordered.includes(key));
  const firstExtra = ordered.findIndex((key) => DETAIL_EXTRAS.some((extra) => extra === key));
  ordered.splice(firstExtra < 0 ? ordered.length : firstExtra, 0, ...newSections);
  return [...ordered, ...DETAIL_EXTRAS.filter((key) => !ordered.includes(key))];
}

export type FormSettings = { category?: string; cols?: number; description?: string; title?: string; detailOrder?: string[] };
export type FormDef = {
  id: string;
  form_key: string;
  name: string;
  route: string;
  target_table: "manual_transfers" | "office_visas" | "flights" | "departures" | "form_entries";
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  settings: FormSettings;
  form_fields: FormField[];
};

export const formsQuery = queryOptions({
  queryKey: ["forms"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("forms")
      .select("*, form_fields(*, form_field_options(*))")
      .order("sort_order");
    if (error) throw error;
    const list = (data ?? []) as unknown as FormDef[];
    for (const f of list) {
      f.form_fields.sort((a, b) => a.sort_order - b.sort_order);
      for (const ff of f.form_fields) ff.form_field_options.sort((a, b) => a.sort_order - b.sort_order);
    }
    return list;
  },
  staleTime: 30_000,
});

export const today = () => new Date().toISOString().slice(0, 10);
export function addDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function dayName(date: string) {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long" });
}

export type Values = Record<string, string>;
export const activeFields = (f: FormDef) => f.form_fields.filter((x) => x.is_active);

export function isVisible(field: FormField, values: Values) {
  const c = field.conditions;
  if (!c?.field) return true;
  const v = values[c.field] ?? "";
  return c.op === "eq" ? v === (c.value ?? "") : v !== (c.value ?? "");
}

const defaultOf = (f: FormField) => (f.default_value === "today" ? today() : f.default_value);

/** Build initial string values from an existing record (or defaults for a new one). */
export function initialValues(form: FormDef, record: Record<string, unknown> | null): Values {
  const out: Values = {};
  const extra = (record?.["extra"] ?? record?.["data"] ?? {}) as Record<string, unknown>;
  for (const f of form.form_fields) {
    if (!record) {
      out[f.field_key] = defaultOf(f);
      continue;
    }
    const raw = f.column_name && form.target_table !== "form_entries" ? record[f.column_name] : extra[f.field_key];
    if (f.behavior === "clients_lines") {
      out[f.field_key] = Array.isArray(raw) ? (raw as string[]).join("\n") : "";
      out["__visa_clients"] = JSON.stringify(record["visa_clients"] ?? []);
    } else out[f.field_key] = raw == null ? "" : String(raw);
  }
  return out;
}

export const clientLines = (s: string) => [...new Set(s.split("\n").map((c) => c.trim()).filter(Boolean))];

/** Returns an error message, or null when valid. */
export function validate(form: FormDef, values: Values): string | null {
  for (const f of activeFields(form)) {
    if (COMPUTED_BEHAVIORS.includes(f.behavior) || !isVisible(f, values)) continue;
    const v = (values[f.field_key] ?? "").trim();
    const numeric = NUMERIC_TYPES.includes(f.field_type);
    if (f.required && (numeric ? !(Number(v) > 0) : !v || v === "false"))
      return `أدخل «${f.label}» — الحقل مطلوب`;
    if (!v) continue;
    if (numeric) {
      const n = Number(v);
      if (Number.isNaN(n)) return `«${f.label}» يجب أن يكون رقمًا`;
      if (f.min_value != null && n < f.min_value) return `«${f.label}» يجب ألا يقل عن ${f.min_value}`;
      if (f.max_value != null && f.max_value >= 0 && n > f.max_value) return `«${f.label}» يجب ألا يزيد عن ${f.max_value}`;
    } else if (f.field_type !== "date" && f.field_type !== "time" && f.field_type !== "file") {
      if (f.min_value != null && v.length < f.min_value) return `«${f.label}» قصير جدًا (الحد الأدنى ${f.min_value})`;
      if (f.max_value != null && f.max_value >= 0 && v.length > f.max_value) return `«${f.label}» طويل جدًا (الحد الأقصى ${f.max_value})`;
    }
    if (f.field_type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `«${f.label}» بريد غير صحيح`;
    if (f.field_type === "phone" && !/^[+\d\s-]{5,20}$/.test(v)) return `«${f.label}» رقم هاتف غير صحيح`;
    if (f.validation?.pattern) {
      try {
        if (!new RegExp(f.validation.pattern).test(v)) return f.validation.message || `«${f.label}» غير صحيح`;
      } catch {
        /* ignore invalid admin regex */
      }
    }
  }
  return null;
}

function coerce(f: FormField, v: string): unknown {
  if (NUMERIC_TYPES.includes(f.field_type)) {
    const n = Number(v);
    return v.trim() === "" || Number.isNaN(n) ? 0 : n;
  }
  if (f.field_type === "date") return v || null;
  if (f.field_type === "checkbox") return v === "true";
  return v.trim();
}

/** Build the row payload: bound fields go to their column, custom ones into `extra` (or `data`). */
export function buildPayload(form: FormDef, values: Values, existingExtra: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = {};
  const extra: Record<string, unknown> = { ...existingExtra };
  for (const f of form.form_fields) {
    const visible = f.is_active && isVisible(f, values);
    const raw = values[f.field_key] ?? "";
    let val: unknown = visible ? coerce(f, raw) : coerce(f, NUMERIC_TYPES.includes(f.field_type) ? "0" : "");
    if (f.behavior === "remaining" || f.behavior === "day_name") continue;
    if (f.behavior === "period_end") {
      const start = values["period_start"] ?? "";
      row["period_end"] = visible && start ? addDays(start, 10) : null;
      continue;
    }
    if (f.behavior === "clients_lines") {
      const names = clientLines(raw);
      const vc = JSON.parse(values["__visa_clients"] || "[]") as string[];
      row["clients"] = names;
      row["visa_clients"] = vc.filter((c) => names.includes(c));
      continue;
    }
    if (!f.is_active && !f.behavior && f.column_name) continue; // disabled bound field: keep stored value
    if (f.column_name && form.target_table !== "form_entries") row[f.column_name] = val;
    else if (f.is_active) extra[f.field_key] = val;
  }
  if (form.settings.category && form.target_table === "manual_transfers") row["category"] = form.settings.category;
  if (form.target_table === "form_entries") return { form_id: form.id, data: extra };
  row["extra"] = extra;
  return row;
}
