import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { SponsorHistory, setArchived } from "@/components/SponsorHistory";
import { errorMessage, formatDate, formatDateTime, formatMoney, profileNameMap, profilesQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/archive")({
  head: () => ({
    meta: [
      { title: "الأرشيف — منارات هجر للاستقدام" },
      { name: "description", content: "عمليات نقل الكفالة المكتملة والمؤرشفة مع سجل الكفلاء" },
      { property: "og:title", content: "الأرشيف — منارات هجر للاستقدام" },
      { property: "og:description", content: "عمليات نقل الكفالة المؤرشفة" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArchivePage,
});

type Item = {
  id: string;
  table: "transfers" | "manual_transfers";
  kind: string;
  category: string;
  worker_name: string;
  passport_number: string;
  nationality: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r: any;
};

function ArchivePage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Item | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["archive"],
    queryFn: async (): Promise<Item[]> => {
      const [t, m] = await Promise.all([
        supabase.from("transfers").select("*, worker:workers(name, passport_number, nationality, visa_number)").eq("is_deleted", false).not("archived_at", "is", null),
        supabase.from("manual_transfers").select("*").eq("is_deleted", false).not("archived_at", "is", null),
      ]);
      if (t.error) throw t.error;
      if (m.error) throw m.error;
      const a: Item[] = (t.data ?? []).map((r: any) => ({
        id: r.id, table: "transfers", kind: "نقل عادي", category: r.category,
        worker_name: r.worker?.name ?? "—", passport_number: r.worker?.passport_number ?? "", nationality: r.worker?.nationality ?? "", r,
      }));
      const b: Item[] = (m.data ?? []).map((r: any) => ({
        id: r.id, table: "manual_transfers", kind: "نقل يدوي", category: r.category,
        worker_name: r.worker_name || "—", passport_number: r.passport_number, nationality: r.nationality, r,
      }));
      return [...a, ...b].sort((x, y) => String(y.r.archived_at).localeCompare(String(x.r.archived_at)));
    },
  });

  const rows = useMemo(() => {
    const q = search.trim();
    if (!q) return items;
    return items.filter((i) => [i.worker_name, i.passport_number, i.nationality, i.r.old_sponsor_name, i.r.new_sponsor_name].some((v) => String(v ?? "").includes(q)));
  }, [items, search]);

  const restore = useMutation({
    mutationFn: (i: Item) => setArchived(i.table, i.id, false),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("تم استرجاع العملية إلى جدول النقل");
      setViewing(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canRestore = (i: Item) => {
    const base = i.table === "transfers" ? "transfers" : "manual_transfers";
    return auth.can(i.category === "مهنية" ? `${base}_pro` : base, "edit");
  };

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">الأرشيف <span className="text-sm font-normal text-ink/50">({rows.length})</span></h1>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الجواز أو الكفيل" className="max-w-xs" />
      </div>
      {isLoading ? (
        <div className="glass h-64 animate-pulse rounded-2xl" />
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-ink/50">لا توجد عمليات مؤرشفة</div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="ledger-rows w-full text-[13px]">
            <thead className="text-ink/55">
              <tr className="text-right">
                {["العاملة", "الجواز", "النوع", "الفئة", "الكفيل القديم", "الكفيل الجديد", "حالة الدفع", "تاريخ الأرشفة", "أرشفها", ""].map((h) => (
                  <th key={h} className="p-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="cursor-pointer border-t border-black/5" onClick={() => setViewing(i)}>
                  <td className="p-2.5 font-medium">{i.worker_name}</td>
                  <td className="p-2.5" dir="ltr">{i.passport_number || "—"}</td>
                  <td className="p-2.5">{i.kind}</td>
                  <td className="p-2.5">{i.category}</td>
                  <td className="p-2.5">{i.r.old_sponsor_name || "—"}</td>
                  <td className="p-2.5">{i.r.new_sponsor_name || "—"}</td>
                  <td className="p-2.5"><StatusBadge value={i.r.payment_status} /></td>
                  <td className="p-2.5 tabular-nums" dir="ltr">{formatDateTime(i.r.archived_at)}</td>
                  <td className="p-2.5">{nameOf(i.r.archived_by) || "—"}</td>
                  <td className="p-2.5" onClick={(e) => e.stopPropagation()}>
                    {canRestore(i) && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => restore.mutate(i)} disabled={restore.isPending}>
                        <RotateCcw className="size-3.5" /> استرجاع
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(viewing)} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="glass-strong max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl" onOpenAutoFocus={(e) => e.preventDefault()}>
          {viewing && <Details item={viewing} nameOf={nameOf} onRestore={canRestore(viewing) ? () => restore.mutate(viewing) : undefined} pending={restore.isPending} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Row({ label, value, ltr }: { label: string; value: ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/5 py-1.5 text-[13px] last:border-0">
      <span className="text-ink/55">{label}</span>
      <span className="text-left font-medium" dir={ltr ? "ltr" : undefined}>{value || "—"}</span>
    </div>
  );
}
function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass rounded-xl p-4">
      <h4 className="mb-2 text-[11px] font-semibold text-ink/50">{title}</h4>
      {children}
    </section>
  );
}

function Details({ item, nameOf, onRestore, pending }: { item: Item; nameOf: (id: string | null | undefined) => string; onRestore?: (() => void) | undefined; pending: boolean }) {
  const r = item.r;
  return (
    <>
      <DialogHeader className="text-right sm:text-right">
        <DialogTitle className="flex items-center gap-2">{item.worker_name} <StatusBadge value={r.transfer_stage} /></DialogTitle>
        <DialogDescription>عملية مؤرشفة — {item.kind} ({item.category})</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Sec title="بيانات العملية">
          <Row label="اسم العاملة" value={item.worker_name} />
          <Row label="رقم الجواز" value={item.passport_number} ltr />
          <Row label="الجنسية" value={item.nationality} />
          <Row label="نوع التأشيرة" value={r.visa_type} />
          <Row label="رقم التأشيرة" value={r.visa_number ?? r.worker?.visa_number} ltr />
          <Row label="نوع النقل" value={r.transfer_type} />
          <Row label="تاريخ النقل" value={formatDate(r.transfer_date)} ltr />
          <Row label="بداية الفترة" value={formatDate(r.period_start)} ltr />
          <Row label="نهاية الفترة" value={formatDate(r.period_end)} ltr />
          {"return_to_office_date" in r && <Row label="تاريخ رجوع العاملة المكتب" value={formatDate(r.return_to_office_date)} ltr />}
          <Row label="الجواز لدى" value={r.passport_holder} />
        </Sec>
        <div className="space-y-4">
          <Sec title="الكفيل القديم">
            <Row label="الاسم" value={r.old_sponsor_name} />
            <Row label="الهاتف" value={r.old_sponsor_phone} ltr />
          </Sec>
          <Sec title="الكفيل الجديد">
            <Row label="الاسم" value={r.new_sponsor_name} />
            <Row label="الهاتف" value={r.new_sponsor_phone} ltr />
          </Sec>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Sec title="المالية">
          <Row label="مستحقات الكفيل القديم" value={formatMoney(r.old_sponsor_dues)} ltr />
          <Row label="حالة الدفع للكفيل القديم" value={<StatusBadge value={r.payment_status} />} />
          <Row label="مستحقات المكتب من الكفيل الجديد" value={formatMoney(r.new_sponsor_dues)} ltr />
          <Row label="العربون (من الكفيل الجديد)" value={formatMoney(r.down_payment)} ltr />
          <Row label="حالة دفع الكفيل الجديد" value={<StatusBadge value={r.new_sponsor_payment_status} />} />
          <Row label="مستحقات الرواتب" value={r.salary_dues_status} />
          {r.salary_dues_status === "توجد" && <Row label="قيمة مستحقات الرواتب" value={formatMoney(r.salary_dues_amount)} ltr />}
        </Sec>
        <Sec title="حالة العاملة">
          <Row label="الفحص الطبي" value={r.medical_exam} />
          <Row label="الإقامة" value={r.residency_status} />
          {r.residency_number && <Row label="رقم الإقامة" value={r.residency_number} ltr />}
          <Row label="موقع العاملة" value={r.worker_location} />
          <Row label="ملاحظات حالة العاملة" value={r.worker_condition} />
          {r.notes && <Row label="ملاحظات" value={r.notes} />}
        </Sec>
      </div>
      <SponsorHistory
        transferId={item.id}
        source={item.table}
        current={{ name: r.new_sponsor_name, phone: r.new_sponsor_phone, since: r.transfer_date, createdAt: r.created_at, salaryStatus: r.salary_dues_status, salaryAmount: Number(r.salary_dues_amount ?? 0) }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Sec title="سجل التدقيق">
          <Row label="تم الإضافة بواسطة" value={nameOf(r.created_by)} />
          <Row label="تاريخ الإضافة" value={formatDateTime(r.created_at)} ltr />
          <Row label="آخر تعديل بواسطة" value={nameOf(r.updated_by)} />
          <Row label="أرشفها" value={nameOf(r.archived_by)} />
          <Row label="تاريخ الأرشفة" value={formatDateTime(r.archived_at)} ltr />
        </Sec>
        {onRestore && (
          <div className="flex items-end">
            <Button className="w-full gap-1.5" variant="outline" onClick={onRestore} disabled={pending}>
              <RotateCcw className="size-4" /> استرجاع إلى جدول النقل
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
