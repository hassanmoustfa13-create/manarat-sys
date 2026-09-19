import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Worker = Tables<"workers">;
export type Transfer = Tables<"transfers">;
export type Profile = Tables<"profiles">;
export type WorkerInsert = TablesInsert<"workers">;
export type WorkerUpdate = TablesUpdate<"workers">;
export type TransferInsert = TablesInsert<"transfers">;
export type TransferUpdate = TablesUpdate<"transfers">;

export const TRANSFER_STATUSES = ["بدون نقل", "قيد النقل", "تم النقل"] as const;
export const PAYMENT_STATUSES = ["تم الدفع بالكامل", "متبقي مبلغ"] as const;
export const YES_NO_EXISTS = ["يوجد", "لا يوجد"] as const;
export const YES_NO_EXISTS_F = ["توجد", "لا توجد"] as const;
export const NATIONALITIES = [
  "إثيوبيا",
  "الفلبين",
  "كينيا",
  "أوغندا",
  "بنغلاديش",
  "سريلانكا",
  "الهند",
  "إندونيسيا",
  "نيبال",
  "مصر",
];

export const workersQuery = queryOptions({
  queryKey: ["workers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
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
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
});

export function profileNameMap(profiles: Profile[] | undefined) {
  const map = new Map<string, string>();
  for (const p of profiles ?? []) map.set(p.id, p.full_name || p.email || "—");
  return (id: string | null | undefined) => (id ? (map.get(id) ?? "—") : "—");
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

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "حدث خطأ غير متوقع";
}
