import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, CalendarClock, ClipboardList, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { SponsorProfileDialog, WorkerProfileDialog } from "@/components/ProfileDialogs";
import {
  ACTION_STATUSES,
  TRANSFER_STAGES,
  type Worker,
  formatDate,
  formatMoney,
  mergeContacts,
  profileNameMap,
  profilesQuery,
  requestsQuery,
  transfersQuery,
  workersQuery,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "لوحة التقارير — هجرة" },
      {
        name: "description",
        content: "إحصاءات طلبات الاستقدام والعمالة ونقل الكفالة وحالات الدفع والفترات المنتهية مع فلاتر وتقارير العملاء",
      },
      { property: "og:title", content: "لوحة التقارير — هجرة" },
      { property: "og:description", content: "إحصاءات ومؤشرات الاستقدام ونقل الكفالة وتقارير العملاء" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function inRange(date: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true;
  if (!date) return false;
  const d = date.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function StatCard({
  icon,
  label,
  value,
  tone = "brand",
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone?: "brand" | "teal" | "terracotta" | "success";
  hint?: string;
}) {
  const toneClass = {
    brand: "bg-brand/12 text-brand",
    teal: "bg-teal/12 text-teal",
    terracotta: "bg-terracotta/12 text-terracotta",
    success: "bg-success/12 text-success",
  }[tone];
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9 place-items-center rounded-xl ${toneClass}`}>{icon}</span>
        <span className="text-[12px] text-ink/50">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-ink/40">{hint}</div>}
    </div>
  );
}

function Panel({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

function BreakdownList({ rows, total }: { rows: { label: string; count: number }[]; total: number }) {
  if (!rows.length) return <p className="py-6 text-center text-[13px] text-ink/40">لا توجد بيانات</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate text-[12.5px] text-ink/65">{r.label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
            <span
              className="block h-full rounded-full bg-brand/70"
              style={{ width: `${total ? Math.max(3, (r.count / total) * 100) : 0}%` }}
            />
          </span>
          <span className="w-10 shrink-0 text-end text-[12.5px] font-medium tabular-nums">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

function ReportsPage() {
  const { data: requests = [] } = useQuery(requestsQuery);
  const { data: workers = [] } = useQuery(workersQuery);
  const { data: transfers = [] } = useQuery(transfersQuery);
  const { data: profiles = [] } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [staff, setStaff] = useState("");
  const [status, setStatus] = useState("");
  const [sponsor, setSponsor] = useState<string | null>(null);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");

  const today = todayISO();

  const byStaff = (createdBy: string | null) => (!staff ? true : createdBy === staff);

  const fRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          inRange(r.request_date ?? r.created_at, from, to) &&
          byStaff(r.created_by) &&
          (!status || r.action_status === status),
      ),
    [requests, from, to, staff, status],
  );

  const fWorkers = useMemo(
    () => workers.filter((w) => inRange(w.arrival_date ?? w.created_at, from, to) && byStaff(w.created_by)),
    [workers, from, to, staff],
  );

  const fTransfers = useMemo(
    () =>
      transfers.filter(
        (t) =>
          inRange(t.transfer_date ?? t.created_at, from, to) &&
          byStaff(t.created_by) &&
          (!status || t.transfer_stage === status),
      ),
    [transfers, from, to, staff, status],
  );

  const dues = fTransfers.reduce((s, t) => s + Number(t.old_sponsor_dues || 0), 0);
  const paid = fTransfers.reduce((s, t) => s + Number(t.down_payment || 0), 0);
  const remaining = fTransfers.reduce((s, t) => s + Number(t.remaining_amount ?? 0), 0);
  const unpaidCount = fTransfers.filter((t) => t.payment_status === "متبقي مبلغ").length;

  const expired = useMemo(
    () => fTransfers.filter((t) => t.period_end && t.period_end < today),
    [fTransfers, today],
  );
  const endingSoon = useMemo(
    () =>
      fTransfers.filter((t) => {
        if (!t.period_end || t.period_end < today) return false;
        const days = Math.round((new Date(t.period_end + "T00:00:00").getTime() - Date.now()) / 86_400_000);
        return days <= 30;
      }),
    [fTransfers, today],
  );

  const requestBreakdown = ACTION_STATUSES.map((s) => ({
    label: s,
    count: fRequests.filter((r) => r.action_status === s).length,
  })).filter((r) => r.count > 0);

  const stageBreakdown = TRANSFER_STAGES.map((s) => ({
    label: s,
    count: fTransfers.filter((t) => t.transfer_stage === s).length,
  })).filter((r) => r.count > 0);

  const workerBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of fWorkers) map.set(w.transfer_status, (map.get(w.transfer_status) ?? 0) + 1);
    return [...map.entries()].map(([label, count]) => ({ label, count }));
  }, [fWorkers]);

  const customers = useMemo(() => {
    const base = mergeContacts(
      requests.map((r) => ({ name: r.customer_name, phone: r.phone })),
      workers.map((w) => ({ name: w.current_sponsor_name, phone: w.current_sponsor_phone })),
      transfers.map((t) => ({ name: t.new_sponsor_name, phone: t.new_sponsor_phone })),
    );
    const q = customerSearch.trim();
    return base
      .map((c) => ({
        ...c,
        requests: requests.filter((r) => r.customer_name === c.name).length,
        workers: workers.filter((w) => w.current_sponsor_name === c.name).length,
        transfers: transfers.filter((t) => t.new_sponsor_name === c.name || t.old_sponsor_name === c.name).length,
      }))
      .filter((c) => !q || c.name.includes(q) || c.phone.includes(q));
  }, [requests, workers, transfers, customerSearch]);

  const staffRows = useMemo(() => {
    const ids = new Set<string>();
    for (const r of requests) if (r.created_by) ids.add(r.created_by);
    for (const w of workers) if (w.created_by) ids.add(w.created_by);
    for (const t of transfers) if (t.created_by) ids.add(t.created_by);
    return [...ids];
  }, [requests, workers, transfers]);

  const statusOptions = [...ACTION_STATUSES, ...TRANSFER_STAGES];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-lg font-semibold">لوحة التقارير</h1>
          <p className="text-[12px] text-ink/45">إحصاءات الطلبات والعمالة ونقل الكفالة والمدفوعات</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ms-auto">
          <label className="glass flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] text-ink/55">
            من
            <input
              type="date"
              dir="ltr"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-transparent text-[12.5px] text-ink outline-none"
            />
          </label>
          <label className="glass flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] text-ink/55">
            إلى
            <input
              type="date"
              dir="ltr"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-transparent text-[12.5px] text-ink outline-none"
            />
          </label>
          <select
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            className="glass h-9 rounded-lg px-3 text-[12.5px] outline-none"
          >
            <option value="">كل الموظفين</option>
            {staffRows.map((id) => (
              <option key={id} value={id}>
                {nameOf(id)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="glass h-9 rounded-lg px-3 text-[12.5px] outline-none"
          >
            <option value="">كل الحالات</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {(from || to || staff || status) && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
                setStaff("");
                setStatus("");
              }}
              className="h-9 rounded-lg px-3 text-[12.5px] text-ink/55 hover:bg-black/5"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard icon={<ClipboardList className="size-4" />} label="طلبات الاستقدام" value={fRequests.length} />
        <StatCard icon={<Users className="size-4" />} label="العمالة" value={fWorkers.length} tone="teal" />
        <StatCard icon={<ArrowLeftRight className="size-4" />} label="عمليات النقل" value={fTransfers.length} tone="teal" />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="المبالغ المتبقية"
          value={formatMoney(remaining)}
          tone="terracotta"
          hint={`${unpaidCount} عملية غير مكتملة الدفع`}
        />
        <StatCard
          icon={<AlertTriangle className="size-4" />}
          label="فترات منتهية"
          value={expired.length}
          tone="terracotta"
        />
        <StatCard
          icon={<CalendarClock className="size-4" />}
          label="تنتهي خلال 30 يوم"
          value={endingSoon.length}
          tone="brand"
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel title="حالات الطلبات">
          <BreakdownList rows={requestBreakdown} total={fRequests.length} />
        </Panel>
        <Panel title="مراحل النقل">
          <BreakdownList rows={stageBreakdown} total={fTransfers.length} />
        </Panel>
        <Panel title="حالة العمالة">
          <BreakdownList rows={workerBreakdown} total={fWorkers.length} />
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="ملخص المدفوعات">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/60 p-3 ring-1 ring-black/5">
              <div className="text-[11px] text-ink/45">إجمالي المستحقات</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(dues)}</div>
            </div>
            <div className="rounded-xl bg-white/60 p-3 ring-1 ring-black/5">
              <div className="text-[11px] text-ink/45">المدفوع</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-success">{formatMoney(paid)}</div>
            </div>
            <div className="rounded-xl bg-white/60 p-3 ring-1 ring-black/5">
              <div className="text-[11px] text-ink/45">المتبقي</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-terracotta">{formatMoney(remaining)}</div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {fTransfers
              .filter((t) => Number(t.remaining_amount ?? 0) > 0)
              .slice(0, 6)
              .map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 text-[12.5px] ring-1 ring-black/5"
                >
                  <span className="flex-1 truncate">{t.new_sponsor_name || "—"}</span>
                  <StatusBadge value={t.payment_status} />
                  <span className="tabular-nums text-terracotta">{formatMoney(t.remaining_amount)}</span>
                </div>
              ))}
            {!fTransfers.some((t) => Number(t.remaining_amount ?? 0) > 0) && (
              <p className="py-4 text-center text-[13px] text-ink/40">لا توجد مبالغ متبقية</p>
            )}
          </div>
        </Panel>

        <Panel title="الفترات المنتهية والقريبة من الانتهاء">
          {expired.length + endingSoon.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink/40">لا توجد فترات منتهية</p>
          ) : (
            <div className="space-y-2">
              {[...expired, ...endingSoon].slice(0, 8).map((t) => {
                const isExpired = Boolean(t.period_end && t.period_end < today);
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-2 text-[12.5px] ring-1 ring-black/5"
                  >
                    <span className="flex-1 truncate">{t.new_sponsor_name || "—"}</span>
                    <span className="text-ink/45">{t.transfer_type}</span>
                    <span className="tabular-nums text-ink/60">{formatDate(t.period_end)}</span>
                    <span className={isExpired ? "pill pill-terracotta" : "pill pill-brand"}>
                      {isExpired ? "منتهية" : "قريبة"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-3">
        <Panel
          title={`العملاء (${customers.length})`}
          extra={
            <input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="بحث باسم العميل أو الهاتف"
              className="glass h-8 w-56 rounded-lg px-3 text-[12.5px] outline-none placeholder:text-ink/35"
            />
          }
        >
          {customers.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink/40">لا يوجد عملاء</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {customers.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSponsor(c.name)}
                  className="rounded-xl bg-white/55 p-3 text-start ring-1 ring-black/5 transition-colors hover:bg-white"
                >
                  <div className="truncate text-[13.5px] font-medium">{c.name}</div>
                  <div dir="ltr" className="mt-0.5 text-start text-[11.5px] tabular-nums text-ink/45">
                    {c.phone || "—"}
                  </div>
                  <div className="mt-2 flex gap-1.5 text-[11px]">
                    <span className="pill pill-brand">{c.requests} طلب</span>
                    <span className="pill pill-teal">{c.workers} عامل</span>
                    <span className="pill pill-neutral">{c.transfers} نقل</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <SponsorProfileDialog
        sponsor={sponsor}
        onClose={() => setSponsor(null)}
        onWorkerClick={(w) => {
          setSponsor(null);
          setProfileWorker(w);
        }}
      />
      <WorkerProfileDialog worker={profileWorker} onClose={() => setProfileWorker(null)} onSponsorClick={setSponsor} />
    </main>
  );
}
