import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GridKey = "workers" | "requests" | "transfers" | "manual_transfers";
export type ColAlign = "right" | "center" | "left";

export interface ColumnSetting {
  id: string;
  visible: boolean;
  width?: number | null | undefined;
  align?: ColAlign | undefined;
}

export interface GridSettings {
  fontSize?: "sm" | "md" | "lg" | undefined;
  density?: "compact" | "normal" | "comfortable" | undefined;
  columns?: ColumnSetting[] | undefined;
}

export const GRID_LABELS: Record<GridKey, string> = {
  workers: "جدول العمالة",
  requests: "جدول طلبات الاستقدام",
  transfers: "جدول نقل الكفالة",
  manual_transfers: "جدول نقل الكفالة (يدوي)",
};

const AUDIT: [string, string][] = [
  ["created_by", "تم الإضافة بواسطة"],
  ["updated_by", "آخر تعديل بواسطة"],
];

export const GRID_COLUMNS: Record<GridKey, [string, string][]> = {
  workers: [
    ["name", "اسم العامل/ـة"],
    ["passport_number", "رقم الجواز"],
    ["nationality", "الجنسية"],
    ["profession", "المهنة"],
    ["visa_type", "نوع التأشيرة"],
    ["visa_number", "رقم التأشيرة"],
    ["arrival_date", "تاريخ دخول المكتب"],
    ["entry_date", "تاريخ دخولها السعودية"],
    ["residency_number", "رقم الإقامة"],
    ["arrival_status", "حالة الوصول"],
    ["current_location", "الموقع الحالي"],
    ["days_remaining", "المتبقي للوصول"],
    ["current_sponsor_name", "الكفيل الحالي"],
    ["current_sponsor_phone", "هاتف الكفيل"],
    ["transfer_status", "حالة النقل"],
    ["notes", "ملاحظات"],
    ["passport_holder", "الجواز لدى"],
    ...AUDIT,
  ],
  requests: [
    ["request_date", "تاريخ الطلب"],
    ["customer_name", "اسم العميل"],
    ["phone", "رقم الهاتف"],
    ["profession", "المهنة"],
    ["nationality", "الجنسية"],
    ["request_type", "نوع الطلب"],
    ["lead_source", "مصدر العميل"],
    ["action_status", "الإجراء على الطلب"],
    ["pref_age", "السن"],
    ["pref_religion", "الديانة"],
    ["pref_experience", "الخبرة"],
    ["pref_driving_license", "رخصة قيادة"],
    ["pref_languages", "اللغات"],
    ["notes", "تفاصيل وملاحظات"],
    ...AUDIT,
  ],
  transfers: [
    ["worker_name", "اسم العاملة"],
    ["passport_number", "رقم الجواز"],
    ["days_in_saudi", "أيام العاملة في السعودية"],
    ["old_sponsor_name", "الكفيل القديم"],
    ["new_sponsor_name", "الكفيل الجديد"],
    ["new_sponsor_phone", "هاتف الجديد"],
    ["visa_type", "نوع التأشيرة"],
    ["visa_number", "رقم التأشيرة"],
    ["transfer_type", "نوع النقل"],
    ["transfer_date", "تاريخ النقل"],
    ["transfer_stage", "حالة النقل"],
    ["worker_condition", "ملاحظات حالة العاملة"],
    ["worker_location", "موقع العاملة"],
    ["old_sponsor_dues", "مستحقات القديم"],
    ["down_payment", "العربون"],
    ["remaining_amount", "المتبقي"],
    ["payment_status", "حالة الدفع"],
    ["medical_exam", "الفحص الطبي"],
    ["residency_status", "الإقامة"],
    ["salary_dues_status", "مستحقات الرواتب"],
    ["salary_dues_amount", "قيمة مستحقات الرواتب"],
    ...AUDIT,
  ],
  manual_transfers: [
    ["worker_name", "اسم العاملة"], ["passport_number", "رقم الجواز"], ["nationality", "الجنسية"],
    ["old_sponsor_name", "الكفيل القديم"], ["new_sponsor_name", "الكفيل الجديد"], ["visa_type", "نوع التأشيرة"],
    ["visa_number", "رقم التأشيرة"], ["transfer_type", "نوع النقل"], ["transfer_date", "تاريخ النقل"],
    ["transfer_stage", "حالة النقل"], ["return_to_office_date", "تاريخ رجوعها المكتب"], ["worker_location", "موقع العاملة"],
    ["old_sponsor_dues", "مستحقات القديم"], ["down_payment", "العربون"], ["remaining_amount", "المتبقي"],
    ["payment_status", "حالة الدفع"], ["medical_exam", "الفحص الطبي"], ["residency_status", "الإقامة"],
    ["residency_number", "رقم الإقامة"], ["salary_dues_status", "مستحقات الرواتب"], ["salary_dues_amount", "قيمة مستحقات الرواتب"],
    ["passport_holder", "الجواز لدى"], ["worker_condition", "ملاحظات حالة العاملة"],
    ...AUDIT,
  ],
};

/** Default compact widths (~1.5 words) so the table stays narrow; text wraps nicely. */
const DEFAULT_WIDTHS: Record<GridKey, Record<string, number>> = {
  manual_transfers: {},
  workers: {
    name: 130,
    passport_number: 110,
    nationality: 90,
    profession: 100,
    visa_type: 90,
    arrival_date: 100,
    entry_date: 110,
    residency_number: 100,
    arrival_status: 90,
    current_location: 100,
    days_remaining: 90,
    current_sponsor_name: 130,
    current_sponsor_phone: 110,
    transfer_status: 100,
    notes: 160,
    passport_holder: 90,
    created_by: 110,
    updated_by: 110,
  },
  requests: {
    request_date: 100,
    customer_name: 130,
    phone: 110,
    profession: 100,
    nationality: 90,
    request_type: 90,
    lead_source: 100,
    action_status: 130,
    pref_age: 70,
    pref_religion: 80,
    pref_experience: 90,
    pref_driving_license: 90,
    pref_languages: 90,
    notes: 160,
    created_by: 110,
    updated_by: 110,
  },
  transfers: {
    worker_name: 130,
    passport_number: 100,
    days_in_saudi: 110,
    old_sponsor_name: 120,
    new_sponsor_name: 120,
    new_sponsor_phone: 110,
    visa_type: 90,
    transfer_type: 90,
    transfer_date: 100,
    transfer_stage: 130,
    worker_condition: 160,
    worker_location: 100,
    old_sponsor_dues: 100,
    down_payment: 80,
    remaining_amount: 80,
    payment_status: 110,
    medical_exam: 90,
    residency_status: 80,
    salary_dues_status: 110,
    salary_dues_amount: 110,
    created_by: 110,
    updated_by: 110,
  },
};

/** Merge saved settings with the known column list (new columns appended, unknown dropped). */
export function resolveColumns(key: GridKey, saved?: GridSettings | null): ColumnSetting[] {
  const known = GRID_COLUMNS[key].map(([id]) => id);
  const defaults = DEFAULT_WIDTHS[key];
  const savedCols = (saved?.columns ?? []).filter((c) => known.includes(c.id));
  const missing = known
    .filter((id) => !savedCols.some((c) => c.id === id))
    .map((id) => ({ id, visible: true, width: defaults[id] ?? 110 }) as ColumnSetting);
  return [...savedCols, ...missing];
}

export const gridSettingsQuery = queryOptions({
  queryKey: ["grid_settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("grid_settings").select("grid_key, settings");
    if (error) throw error;
    const map: Partial<Record<GridKey, GridSettings>> = {};
    for (const r of data ?? []) map[r.grid_key as GridKey] = (r.settings ?? {}) as GridSettings;
    return map;
  },
  staleTime: 60_000,
});

export async function saveGridSettings(key: GridKey, settings: GridSettings) {
  const { error } = await supabase
    .from("grid_settings")
    .upsert({ grid_key: key, settings: settings as never, updated_at: new Date().toISOString() });
  if (error) throw error;
}
