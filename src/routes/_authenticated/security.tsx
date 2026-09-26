import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listSecurityEvents } from "@/lib/users.functions";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "سجل الأمان — منارات هجر للاستقدام" },
      { name: "description", content: "سجل أحداث الأمان: محاولات الدخول وتغييرات كلمات المرور والمستخدمين." },
      { property: "og:title", content: "سجل الأمان — منارات هجر للاستقدام" },
      { property: "og:description", content: "سجل أحداث الأمان للمدير." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

const EVENT_LABELS: Record<string, string> = {
  login: "تسجيل دخول",
  password_changed_self: "تغيير كلمة المرور (بواسطة المستخدم)",
  password_reset_by_admin: "تغيير كلمة المرور (بواسطة المدير)",
  user_created: "إضافة مستخدم",
  user_updated: "تعديل بيانات مستخدم",
  user_deleted: "حذف مستخدم",
};

function SecurityPage() {
  const auth = useAuth();
  const fetchEvents = useServerFn(listSecurityEvents);
  const [type, setType] = useState("");
  const [result, setResult] = useState("");
  const [q, setQ] = useState("");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["security_events"],
    queryFn: () => fetchEvents(),
    enabled: auth.isAdmin,
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter(
      (e) =>
        (!type || e.event_type === type) &&
        (!result || String(e.success) === result) &&
        (!s || [e.identifier, e.target_name, e.actor_name, e.details].join(" ").toLowerCase().includes(s)),
    );
  }, [data, type, result, q]);

  if (auth.loading) return null;
  if (!auth.isAdmin) return <div className="p-8 text-center text-ink/60">هذه الصفحة متاحة للمدير فقط</div>;

  const sel = "h-10 rounded-lg border border-black/10 bg-white px-3 text-sm";
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">سجل أحداث الأمان</h1>
        <p className="text-sm text-ink/60">محاولات تسجيل الدخول وتغييرات كلمات المرور والمستخدمين (آخر 500 حدث)</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input className={sel + " min-w-56 flex-1"} placeholder="بحث بالمستخدم أو البريد…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={sel} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">كل الأحداث</option>
          {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={sel} value={result} onChange={(e) => setResult(e.target.value)}>
          <option value="">كل النتائج</option>
          <option value="true">ناجح</option>
          <option value="false">فاشل</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white/80 ring-1 ring-black/8">
        <table className="w-full min-w-[800px] text-[15px]">
          <thead className="border-b-2 border-black/10 text-[13px] font-bold text-ink/70">
            <tr>
              {["التاريخ", "الحدث", "المستخدم", "بواسطة", "النتيجة", "تفاصيل"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="py-12 text-center text-ink/50">جارٍ التحميل…</td></tr>}
            {error && <tr><td colSpan={6} className="py-12 text-center text-destructive">{(error as Error).message}</td></tr>}
            {!isLoading && !rows.length && <tr><td colSpan={6} className="py-12 text-center text-ink/50">لا توجد أحداث</td></tr>}
            {rows.map((e) => (
              <tr key={e.id} className="border-b border-black/5 hover:bg-brand/[0.06]">
                <td className="px-4 py-3 whitespace-nowrap" dir="ltr">{formatDateTime(e.created_at)}</td>
                <td className="px-4 py-3">{EVENT_LABELS[e.event_type] ?? e.event_type}</td>
                <td className="px-4 py-3">
                  <div>{e.target_name || "—"}</div>
                  {e.identifier && <div className="text-[12px] text-ink/50" dir="ltr">{e.identifier}</div>}
                </td>
                <td className="px-4 py-3">{e.actor_name || "—"}</td>
                <td className="px-4 py-3">
                  <span className={e.success ? "pill pill-teal" : "pill pill-rose"}>{e.success ? "ناجح" : "فاشل"}</span>
                </td>
                <td className="px-4 py-3 text-ink/70">{e.details || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
