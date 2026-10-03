import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatMoney } from "@/lib/data";

/** سجل الكفلاء الجدد السابقين لعملية نقل (الكفيل القديم ثابت، الجديد يتغير). */
export function SponsorHistory({
  transferId,
  source,
  current,
}: {
  transferId: string;
  source: "transfers" | "manual_transfers";
  current: { name: string; phone: string; since: string | null; createdAt: string; salaryStatus: string; salaryAmount: number };
}) {
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["sponsor_history", source, transferId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_history")
        .select("*")
        .eq("source", source)
        .eq("transfer_id", transferId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const lastEnd = data.at(-1)?.ended_on ?? current.since ?? current.createdAt.slice(0, 10);
  const rows = [
    ...data.map((h) => ({
      key: h.id,
      name: h.sponsor_name,
      phone: h.sponsor_phone,
      from: h.started_on,
      to: h.ended_on as string | null,
      salaryStatus: h.salary_dues_status,
      salaryAmount: Number(h.salary_dues_amount),
      isCurrent: false,
    })),
    ...(current.name
      ? [{ key: "current", name: current.name, phone: current.phone, from: lastEnd, to: null, salaryStatus: current.salaryStatus, salaryAmount: current.salaryAmount, isCurrent: true }]
      : []),
  ];

  return (
    <section className="glass rounded-xl p-4">
      <h4 className="mb-2 text-[11px] font-semibold text-ink/50">سجل الكفلاء الجدد</h4>
      {isLoading ? (
        <div className="h-10 animate-pulse rounded bg-black/5" />
      ) : isError ? (
        <p className="text-[13px] text-destructive">تعذر تحميل سجل الكفلاء. <button type="button" className="underline" onClick={() => void refetch()}>إعادة المحاولة</button></p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-ink/50">لا يوجد كفيل جديد بعد</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="ledger-rows w-full text-[12.5px]">
            <thead className="text-ink/50">
              <tr className="text-right">
                <th className="p-1.5 font-medium">#</th>
                <th className="p-1.5 font-medium">الكفيل</th>
                <th className="p-1.5 font-medium">ذهبت إليه</th>
                <th className="p-1.5 font-medium">رجعت منه</th>
                <th className="p-1.5 font-medium">مستحقات الرواتب</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.key} className="border-t border-black/5">
                  <td className="p-1.5 tabular-nums">{i + 1}</td>
                  <td className="p-1.5">
                    <div className="font-medium">{r.name || "—"}</div>
                    {r.phone && <div dir="ltr" className="text-right text-[11px] text-ink/50">{r.phone}</div>}
                  </td>
                  <td className="p-1.5 tabular-nums" dir="ltr">{formatDate(r.from)}</td>
                  <td className="p-1.5">{r.isCurrent ? <span className="text-success">الكفيل الحالي</span> : <span dir="ltr" className="tabular-nums">{formatDate(r.to)}</span>}</td>
                  <td className="p-1.5">
                    {r.salaryStatus === "توجد" ? (
                      <span className="text-terracotta">توجد — {formatMoney(r.salaryAmount)}</span>
                    ) : (
                      r.salaryStatus || "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export async function setArchived(table: "transfers" | "manual_transfers", id: string, archive: boolean) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from(table)
    .update(archive ? { archived_at: new Date().toISOString(), archived_by: u.user?.id ?? null } : { archived_at: null, archived_by: null })
    .eq("id", id);
  if (error) throw error;
}
