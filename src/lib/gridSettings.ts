import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GridKey = "workers" | "requests" | "transfers";
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
    ["arrival_date", "تاريخ الوصول"],
    ["arrival_status", "حالة الوصول"],
    ["current_location", "الموقع الحالي"],
    ["days_remaining", "المتبقي للوصول"],
    ["current_sponsor_name", "الكفيل الحالي"],
    ["current_sponsor_phone", "هاتف الكفيل"],
    ["transfer_status", "حالة النقل"],
    ["notes", "ملاحظات"],
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
    ["days_in_saudi", "أيام العاملة في السعودية"],
    ["old_sponsor_name", "الكفيل القديم"],
    ["new_sponsor_name", "الكفيل الجديد"],
    ["new_sponsor_phone", "هاتف الجديد"],
    ["visa_type", "نوع التأشيرة"],
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
};

/** Merge saved settings with the known column list (new columns appended, unknown dropped). */
export function resolveColumns(key: GridKey, saved?: GridSettings | null): ColumnSetting[] {
  const known = GRID_COLUMNS[key].map(([id]) => id);
  const savedCols = (saved?.columns ?? []).filter((c) => known.includes(c.id));
  const missing = known
    .filter((id) => !savedCols.some((c) => c.id === id))
    .map((id) => ({ id, visible: true }) as ColumnSetting);
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
