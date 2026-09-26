import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { workersQuery, transfersQuery, daysUntil, type Worker } from "@/lib/data";
import { WorkerProfileDialog, SponsorProfileDialog } from "@/components/ProfileDialogs";

const TRIAL_DAYS = 3; // تنبيه من 3 أيام قبل انتهاء مدة التجربة حتى يوم الانتهاء
const ARRIVAL_DAYS = 3; // تنبيه من 3 أيام قبل وصول العاملة حتى يوم الوصول

function dayText(d: number) {
  if (d === 0) return "اليوم";
  if (d === 1) return "غدًا";
  if (d === 2) return "بعد يومين";
  return `بعد ${d} أيام`;
}

export function SmartAlerts() {
  const { data: workers } = useQuery(workersQuery);
  const { data: transfers } = useQuery(transfersQuery);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [sponsor, setSponsor] = useState<string | null>(null);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || !workers || !transfers) return;
    shown.current = true;
    const byId = new Map(workers.map((w) => [w.id, w]));
    let i = 0;
    const push = (fn: () => void) => setTimeout(fn, 800 + i++ * 400);

    for (const t of transfers) {
      if (t.transfer_stage === "تم النقل" && t.transfer_type !== "تجربة") continue;
      if (t.transfer_type !== "تجربة") continue;
      const d = daysUntil(t.period_end);
      if (d === null || d < 0 || d > TRIAL_DAYS) continue;
      const w = byId.get(t.worker_id);
      if (!w) continue;
      push(() =>
        toast.warning(`مدة التجربة تنتهي ${dayText(d)}`, {
          description: `${w.name || w.passport_number} — لدى ${t.new_sponsor_name || "—"}`,
          duration: 10000,
          action: { label: "عرض", onClick: () => setWorker(w) },
        }),
      );
    }

    for (const w of workers) {
      if (w.arrival_status === "تم الإلغاء") continue;
      const d = daysUntil(w.arrival_date);
      if (d === null || d < 0 || d > ARRIVAL_DAYS) continue;
      push(() =>
        toast.info(`وصول عاملة ${dayText(d)}`, {
          description: `${w.name || w.passport_number}${w.current_sponsor_name ? ` — الكفيل: ${w.current_sponsor_name}` : ""}`,
          duration: 10000,
          action: { label: "عرض", onClick: () => setWorker(w) },
        }),
      );
    }
  }, [workers, transfers]);

  return (
    <>
      <WorkerProfileDialog
        worker={worker}
        onClose={() => setWorker(null)}
        onSponsorClick={(n) => {
          setWorker(null);
          setSponsor(n);
        }}
      />
      <SponsorProfileDialog
        sponsor={sponsor}
        onClose={() => setSponsor(null)}
        onWorkerClick={(w) => {
          setSponsor(null);
          setWorker(w);
        }}
      />
    </>
  );
}
