import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Worker = Tables<"workers">;
export type Transfer = Tables<"transfers">;
export type Profile = Tables<"profiles">;
export type Request = Tables<"requests">;
export type WorkerInsert = TablesInsert<"workers">;
export type WorkerUpdate = TablesUpdate<"workers">;
export type TransferInsert = TablesInsert<"transfers">;
export type TransferUpdate = TablesUpdate<"transfers">;
export type RequestInsert = TablesInsert<"requests">;
export type RequestUpdate = TablesUpdate<"requests">;

export const TRANSFER_STATUSES = ["بدون نقل", "قيد النقل", "تم النقل"] as const;
export const PAYMENT_STATUSES = ["تم الدفع بالكامل", "متبقي مبلغ"] as const;
export const YES_NO_EXISTS = ["يوجد", "لا يوجد"] as const;
export const YES_NO_EXISTS_F = ["توجد", "لا توجد"] as const;

/* --- Module 1: recruitment requests --- */
export const PROFESSIONS = [
  "عاملة منزلية",
  "عاملة مهنية",
  "مربية أطفال",
  "طباخة",
  "عامل مزرعة",
  "سائق",
  "عاملة صالون",
  "عاملة مساج",
  "عاملة اضافر",
  "عاملة مكياج",
  "عاملة شعر",
  "عامل منسق ورد",
  "مهني",
  "راعية كبار سن",
  "ممرضة منزلية",
  "أخرى",
] as const;
export type TransferCategory = "منزلية" | "مهنية";
/** Household professions go to the domestic-transfer page; every other profession is professional */
export const DOMESTIC_PROFESSIONS = ["عاملة منزلية", "مربية أطفال", "طباخة", "راعية كبار سن", "ممرضة منزلية"];
export const categoryOfProfession = (p?: string | null): TransferCategory =>
  !p || DOMESTIC_PROFESSIONS.includes(p) ? "منزلية" : "مهنية";
export const workerCategory = (w: { profession?: string | null } | null | undefined): TransferCategory =>
  categoryOfProfession(w?.profession);
export const REQUEST_TYPES = ["استقدام", "معينة"] as const;
export const ACTION_STATUSES = [
  "قيد المتابعة",
  "انتظار تأشيرة",
  "تم إرسال السيرة الذاتية",
  "تم عمل عقد",
  "العميل لا يرغب",
  "لم يتم الرد",
  "تم الإرسال وفي انتظار العميل",
  "العميل يرغب في خيارات أخرى",
  "خارج الشرقية",
] as const;
export const LANGUAGES = ["عربية", "إنجليزية", "عربية وإنجليزية", "لا يوجد"] as const;

/* --- Module 2: arrivals --- */
export const ARRIVAL_STATUSES = ["تم الوصول", "تم الإلغاء"] as const;
export const LOCATIONS = ["السكن", "المكتب", "الكفيل القديم", "الكفيل الجديد"] as const;
export const PASSPORT_HOLDERS = ["العاملة", "الكفيل", "المكتب"] as const;

/* --- Module 3: transfer operations --- */
export const VISA_TYPES = ["عادية", "تأهيل", "بديلة"] as const;
export const TRANSFER_TYPES = ["إيجار", "تجربة", "مؤقت", "أخرى"] as const;
/** Transfer types that require a start/end period */
export const TRANSFER_TYPE_OTHER = "أخرى";
export const RELIGIONS = ["مسلم", "مسيحي", "أخرى"] as const;
export const TRANSFER_STAGES = [
  "إجراءات رفع طلب النقل",
  "إجراءات البصمة في أبشر",
  "إجراءات الفحص الطبي",
  "تم النقل",
] as const;

export const NATIONALITIES = [
  "الفلبين",
  "بنجلاديش",
  "كينيا",
  "إثيوبيا",
  "أوغندا",
  "سريلانكا",
  "الهند",
  "باكستان",
  "أخرى",
];

export const requestsQuery = queryOptions({
  queryKey: ["requests"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});


export const workersQuery = queryOptions({
  queryKey: ["workers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const transfersQuery = queryOptions({
  queryKey: ["transfers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("staff_names");
    if (error) throw error;
    return (data ?? []).map((p) => ({ id: p.id, full_name: p.full_name, email: "", created_at: "" })) as Profile[];
  },
  staleTime: 5 * 60_000,
});

export function profileNameMap(profiles: Profile[] | undefined) {
  const map = new Map<string, string>();
  for (const p of profiles ?? []) map.set(p.id, p.full_name || p.email || "—");
  return (id: string | null | undefined) => (id ? (map.get(id) ?? "") : "");
}

/** Days remaining until arrival (negative = already arrived) */
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDaysRemaining(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "اليوم";
  if (days < 0) return `وصل منذ ${Math.abs(days)} يوم`;
  return `${days} يوم`;
}

/** Days the worker has been in Saudi Arabia since arrival (null if no date or not yet arrived) */
export function daysInSaudi(arrivalDate: string | null): number | null {
  const d = daysUntil(arrivalDate);
  if (d === null || d > 0) return null;
  return Math.abs(d);
}

export function formatDaysInSaudi(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "وصلت اليوم";
  return `${days} يوم`;
}

export function formatMoney(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n));
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  return `${formatDate(dt.toISOString())} ${dt.toTimeString().slice(0, 5)}`;
}

/* --- Contact directory (customers & sponsors already in the system) --- */
export type Contact = { name: string; phone: string };

/** Merge name/phone pairs, dedupe by name, keep the first non-empty phone found */
export function mergeContacts(...lists: (Contact[] | undefined)[]): Contact[] {
  const map = new Map<string, string>();
  for (const list of lists) {
    for (const c of list ?? []) {
      const name = (c.name ?? "").trim();
      if (!name) continue;
      const phone = (c.phone ?? "").trim();
      const existing = map.get(name);
      if (existing === undefined || (!existing && phone)) map.set(name, phone);
    }
  }
  return [...map.entries()]
    .map(([name, phone]) => ({ name, phone }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = String((e as { message: unknown }).message);
    if (msg.includes("transfers_one_active_per_worker"))
      return "لدى هذا العامل/ـة طلب نقل كفالة فعّال بالفعل — أكمل الطلب الحالي أو عدّله بدلاً من إنشاء طلب جديد";
    return msg;
  }
  return "حدث خطأ غير متوقع";
}
