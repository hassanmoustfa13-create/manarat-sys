import { useQuery } from "@tanstack/react-query";
import { SponsorHistory } from "@/components/SponsorHistory";
import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import {
  type Worker,
  daysUntil,
  formatDate,
  formatDateTime,
  formatDaysRemaining,
  formatMoney,
  profileNameMap,
  profilesQuery,
  requestsQuery,

  transfersQuery,
  workersQuery,
} from "@/lib/data";

function Row({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/5 py-1.5 text-[13px] last:border-b-0">
      <span className="text-ink/50">{label}</span>
      <span className={`font-medium ${ltr ? "tabular-nums" : ""}`} dir={ltr ? "ltr" : undefined}>
        {value ?? "—"}
      </span>
    </div>
  );
}

export function SponsorLink({ name, onClick }: { name: string | null | undefined; onClick: (n: string) => void }) {
  if (!name) return <span className="text-ink/30">—</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(name);
      }}
      className="text-brand underline-offset-2 hover:underline"
    >
      {name}
    </button>
  );
}

/* ---------------- Worker profile ---------------- */
export function WorkerProfileDialog({
  worker,
  onClose,
  onSponsorClick,
}: {
  worker: Worker | null;
  onClose: () => void;
  onSponsorClick: (name: string) => void;
}) {
  const { data: transfers = [] } = useQuery(transfersQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);
  const history = useMemo(
    () =>
      transfers
        .filter((t) => t.worker_id === worker?.id)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [transfers, worker?.id],
  );
  const days = daysUntil(worker?.arrival_date ?? null);

  /* Sponsor chain: every sponsor the worker was transferred to, in order,
     with transfer type and how long the worker stayed with each sponsor */
  const chain = useMemo(() => {
    const asc = [...history].reverse(); // oldest first
    const startOf = (t: (typeof asc)[number]) => t.period_start || t.transfer_date || null;
    const diffDays = (a: string, b: string) =>
      Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86_400_000);
    const today = new Date().toISOString().slice(0, 10);
    return asc.map((t, i) => {
      const start = startOf(t);
      const next = asc[i + 1];
      const nextStart = next ? startOf(next) : null;
      const isCurrent = i === asc.length - 1 && worker?.current_sponsor_name === t.new_sponsor_name;
      const end = nextStart ?? (isCurrent ? today : null);
      const duration = start && end ? diffDays(start, end) : null;
      return { t, start, end: nextStart, isCurrent, duration };
    });
  }, [history, worker?.current_sponsor_name]);

  return (
    <Dialog open={Boolean(worker)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl" onOpenAutoFocus={(e) => e.preventDefault()}>
        {worker && (
          <>
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="flex items-center gap-2">
                {worker.name}
                <StatusBadge value={worker.transfer_status} />
              </DialogTitle>
              <DialogDescription>ملف العامل/ـة الكامل وسجل نقل الكفالة</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="glass rounded-xl p-4">
                <h4 className="mb-2 text-[11px] font-semibold text-ink/50">البيانات الأساسية</h4>
                <Row label="رقم الجواز" value={worker.passport_number} ltr />
                <Row label="الجنسية" value={worker.nationality} />
                <Row label="المهنة" value={worker.profession || "—"} />
                <Row label="نوع التأشيرة" value={worker.visa_type || "—"} />
                <Row label="رقم التأشيرة" value={worker.visa_number || "—"} ltr />
                <Row label="الراتب الشهري" value={formatMoney(worker.monthly_salary)} ltr />
                <h4 className="mb-2 mt-4 text-[11px] font-semibold text-ink/50">بيانات الوصول</h4>
                <Row label="تاريخ دخول المكتب" value={formatDate(worker.arrival_date)} ltr />
                <Row label="تاريخ دخولها السعودية" value={formatDate(worker.entry_date)} ltr />
                <Row label="الإقامة" value={worker.residency_status || "لا يوجد"} />
                {worker.residency_status === "يوجد" && (
                  <Row label="رقم الإقامة" value={worker.residency_number || "—"} ltr />
                )}
                <Row label="وقت الوصول" value={worker.arrival_time || "—"} ltr />
                <Row label="حالة الوصول" value={<StatusBadge value={worker.arrival_status} />} />
                <Row label="الموقع الحالي" value={<StatusBadge value={worker.current_location} />} />
                <Row label="الجواز لدى" value={worker.passport_holder || "—"} />
                <Row label="الوقت المتبقي للوصول" value={formatDaysRemaining(days)} />
              </section>

              <section className="glass rounded-xl p-4">
                <h4 className="mb-2 text-[11px] font-semibold text-ink/50">الكفيل الحالي</h4>
                <Row
                  label="الاسم"
                  value={<SponsorLink name={worker.current_sponsor_name} onClick={onSponsorClick} />}
                />
                <Row label="الهاتف" value={worker.current_sponsor_phone || "—"} ltr />
                <h4 className="mb-2 mt-4 text-[11px] font-semibold text-ink/50">سجل التدقيق</h4>
                <Row label="تم الإضافة بواسطة" value={nameOf(worker.created_by)} />
                <Row label="تاريخ الإضافة" value={formatDateTime(worker.created_at)} ltr />
                <Row label="آخر تعديل بواسطة" value={nameOf(worker.updated_by)} />
                <Row label="تاريخ آخر تعديل" value={formatDateTime(worker.updated_at)} ltr />
              </section>
            </div>

            {worker.notes && (
              <p className="glass rounded-xl p-3 text-[13px] text-ink/70">{worker.notes}</p>
            )}

            {chain.length > 0 && (
              <section>
                <h4 className="mb-2 text-[11px] font-semibold text-ink/50">
                  سلسلة الكفلاء ({chain.length})
                </h4>
                <ol className="space-y-1.5">
                  {chain.map(({ t, start, end, isCurrent, duration }, i) => (
                    <li
                      key={t.id}
                      className="glass flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-[13px]"
                    >
                      <span className="pill pill-neutral">{i + 1}</span>
                      <SponsorLink name={t.new_sponsor_name} onClick={onSponsorClick} />
                      <span className="flex items-center gap-1 text-[11px]">
                        <span className="text-ink/45">نوع النقل:</span>
                        <StatusBadge value={t.transfer_type} />
                      </span>
                      <span className="text-[11px] tabular-nums text-ink/50" dir="ltr">
                        {formatDate(start)} {end ? `← ${formatDate(end)}` : isCurrent ? "← حتى الآن" : ""}
                      </span>
                      <span className="ms-auto text-[12px] font-medium text-teal">
                        {duration === null
                          ? "—"
                          : isCurrent
                            ? `${duration} يوم (ما زالت عنده)`
                            : `${duration} يوم`}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section>
              <h4 className="mb-2 text-[11px] font-semibold text-ink/50">
                سجل نقل الكفالة ({history.length})
              </h4>
              {history.length === 0 ? (
                <p className="glass rounded-xl p-4 text-center text-[13px] text-ink/45">
                  لا توجد عمليات نقل كفالة لهذا العامل/ـة
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((t, idx) => (
                    <div key={t.id} className="glass rounded-xl p-3 text-[13px]">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="pill pill-neutral">#{history.length - idx}</span>
                        <span className="text-ink/45">{formatDate(t.transfer_date)}</span>
                        <span className="ms-auto flex gap-1">
                          <StatusBadge value={t.payment_status} />
                        </span>
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <div className="rounded-lg bg-black/[0.03] p-2">
                          <p className="text-[10px] text-ink/45">الكفيل القديم</p>
                          <SponsorLink name={t.old_sponsor_name} onClick={onSponsorClick} />
                          <p className="text-[11px] text-ink/50" dir="ltr">
                            {t.old_sponsor_phone}
                          </p>
                        </div>
                        <span className="text-teal">←</span>
                        <div className="rounded-lg bg-teal/10 p-2">
                          <p className="text-[10px] text-ink/45">الكفيل الجديد</p>
                          <SponsorLink name={t.new_sponsor_name} onClick={onSponsorClick} />
                          <p className="text-[11px] text-ink/50" dir="ltr">
                            {t.new_sponsor_phone}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                        <Row label="المستحقات" value={formatMoney(t.old_sponsor_dues)} ltr />
                        <Row label="العربون" value={formatMoney(t.down_payment)} ltr />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-ink/45">نوع النقل:</span> <StatusBadge value={t.transfer_type} />
                        <span className="text-ink/45">المرحلة:</span> <StatusBadge value={t.transfer_stage} />
                        <span className="text-ink/45">موقع العاملة:</span>{" "}
                        <StatusBadge value={t.worker_location} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-ink/45">فحص طبي:</span> <StatusBadge value={t.medical_exam} />
                        <span className="text-ink/45">إقامة:</span> <StatusBadge value={t.residency_status} />
                        <span className="text-ink/45">مستحقات رواتب:</span>{" "}
                        <StatusBadge value={t.salary_dues_status} />
                        <span className="tabular-nums text-ink/60" dir="ltr">
                          {formatMoney(t.salary_dues_amount)}
                        </span>
                      </div>
                      {t.worker_condition && (
                        <p className="mt-2 text-[12px] text-ink/60">{t.worker_condition}</p>
                      )}

                      <p className="mt-2 text-[11px] text-ink/45">
                        أضافها {nameOf(t.created_by)} · آخر تعديل {nameOf(t.updated_by)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Sponsor profile ---------------- */
export function SponsorProfileDialog({
  sponsor,
  onClose,
  onWorkerClick,
}: {
  sponsor: string | null;
  onClose: () => void;
  onWorkerClick: (w: Worker) => void;
}) {
  const { data: workers = [] } = useQuery(workersQuery);
  const { data: transfers = [] } = useQuery(transfersQuery);
  const { data: requests = [] } = useQuery(requestsQuery);

  const info = useMemo(() => {
    if (!sponsor) return null;
    const current = workers.filter((w) => w.current_sponsor_name === sponsor);
    const related = transfers.filter(
      (t) => t.old_sponsor_name === sponsor || t.new_sponsor_name === sponsor,
    );
    const customerRequests = requests.filter((r) => r.customer_name === sponsor);
    const phone =
      current.find((w) => w.current_sponsor_phone)?.current_sponsor_phone ||
      customerRequests.find((r) => r.phone)?.phone ||
      related.find((t) => t.new_sponsor_name === sponsor && t.new_sponsor_phone)?.new_sponsor_phone ||
      related.find((t) => t.old_sponsor_name === sponsor && t.old_sponsor_phone)?.old_sponsor_phone ||
      "—";
    const pastIds = new Set(
      related.filter((t) => t.old_sponsor_name === sponsor).map((t) => t.worker_id),
    );
    const incomingIds = new Set(
      related.filter((t) => t.new_sponsor_name === sponsor).map((t) => t.worker_id),
    );
    const currentIds = new Set(current.map((w) => w.id));
    const past = workers.filter((w) => pastIds.has(w.id) && !currentIds.has(w.id));
    const incoming = workers.filter((w) => incomingIds.has(w.id) && !currentIds.has(w.id));
    const allIds = new Set([
      ...current.map((w) => w.id),
      ...past.map((w) => w.id),
      ...incoming.map((w) => w.id),
    ]);
    return {
      current,
      past,
      incoming,
      totalWorkers: allIds.size,
      phone,
      transfers: related.length,
      requests: customerRequests,
    };
  }, [sponsor, workers, transfers, requests]);


  const List = ({ title, items, tone }: { title: string; items: Worker[]; tone: string }) => (
    <section>
      <h4 className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-ink/50">
        {title} <span className={tone}>{items.length}</span>
      </h4>
      {items.length === 0 ? (
        <p className="text-[12px] text-ink/40">لا يوجد</p>
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-xl ring-1 ring-black/6">
          {items.map((w) => (
            <li key={w.id} className="flex items-center gap-3 bg-white/50 px-3 py-2 text-[13px]">
              <button
                type="button"
                onClick={() => onWorkerClick(w)}
                className="font-medium text-brand hover:underline"
              >
                {w.name || "بدون اسم"}
              </button>
              <span className="text-ink/45">{w.nationality}</span>
              <button
                type="button"
                onClick={() => onWorkerClick(w)}
                className="text-ink/45 tabular-nums hover:text-brand hover:underline"
                dir="ltr"
              >
                {w.passport_number || "بدون رقم جواز"}
              </button>
              <span className="ms-auto">
                <StatusBadge value={w.transfer_status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <Dialog open={Boolean(sponsor)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl" onOpenAutoFocus={(e) => e.preventDefault()}>
        {sponsor && info && (
          <>
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle>{sponsor}</DialogTitle>
              <DialogDescription>ملف العميل/الكفيل: طلباته وجميع العمالة المرتبطة به</DialogDescription>
            </DialogHeader>
            <div className="glass grid grid-cols-4 gap-3 rounded-xl p-3 text-center text-[12px]">
              <div>
                <p className="text-ink/45">الهاتف</p>
                <p className="font-semibold tabular-nums" dir="ltr">
                  {info.phone}
                </p>
              </div>
              <div>
                <p className="text-ink/45">إجمالي العمالة</p>
                <p className="text-lg font-semibold text-brand">{info.totalWorkers}</p>
              </div>
              <div>
                <p className="text-ink/45">عمليات نقل</p>
                <p className="text-lg font-semibold text-teal">{info.transfers}</p>
              </div>
            </div>
            <div className="space-y-4">
              <List title="العمالة الحالية" items={info.current} tone="pill pill-brand" />
              <List title="قيد النقل إليه" items={info.incoming} tone="pill pill-teal" />
              <List title="عمالة سابقة" items={info.past} tone="pill pill-neutral" />
            </div>

          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
