import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DataGrid } from "@/components/DataGrid";
import { Button } from "@/components/ui/button";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { FilterChip, GridToolbar } from "@/components/GridToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { TransferFormDialog } from "@/components/TransferFormDialog";
import { SponsorLink, SponsorProfileDialog, WorkerProfileDialog } from "@/components/ProfileDialogs";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { IconBtn } from "@/routes/_authenticated/workers";
import {
  LOCATIONS,
  PAYMENT_STATUSES,
  TRANSFER_STAGES,
  TRANSFER_TYPES,
  VISA_TYPES,
  YES_NO_EXISTS,
  YES_NO_EXISTS_F,

  type Transfer,
  type Worker,
  daysInSaudi,
  errorMessage,
  formatDate,
  formatDaysInSaudi,
  formatMoney,
  profileNameMap,
  profilesQuery,
  transfersQuery,
  workersQuery,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/transfers")({
  component: () => <TransfersView category="منزلية" />,
  head: () => ({
    meta: [
      { title: "جدول نقل الكفالة — منارات هجر للاستقدام" },
      { name: "description", content: "متابعة عمليات نقل الكفالة، المستحقات، العربون، والمتبقي في جدول تفاعلي" },
      { property: "og:title", content: "جدول نقل الكفالة — منارات هجر للاستقدام" },
      { property: "og:description", content: "متابعة عمليات نقل الكفالة والمدفوعات" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = Transfer & { worker_name: string; worker: Worker | null };

export function TransfersView({ category }: { category: "منزلية" | "مهنية" }) {
  const auth = useAuth();
  const admin = auth.isAdmin;
  const permRes = (category === "مهنية" ? "transfers_pro" : "transfers") as const;
  const canAdd = auth.can(permRes, "add");
  const canEdit = auth.can(permRes, "edit");
  const canDel = auth.can(permRes, "delete");
  const canImport = auth.can(permRes, "import");
  const qc = useQueryClient();
  const { data: transfers = [], isLoading } = useQuery(transfersQuery);
  const { data: workers = [] } = useQuery(workersQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);

  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState<string | null>(null);
  const [natFilter, setNatFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transfer | null>(null);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [sponsor, setSponsor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [completing, setCompleting] = useState<Row | null>(null);

  const nationalities = useMemo(() => {
    const byId = new Map(workers.map((w) => [w.id, w]));
    const set = new Set<string>();
    for (const t of transfers) {
      if (((t as any).category ?? "منزلية") !== category) continue;
      const nat = byId.get(t.worker_id)?.nationality;
      if (nat && nat.trim()) set.add(nat.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ar"));
  }, [transfers, workers, category]);

  const rows = useMemo<Row[]>(() => {
    const byId = new Map(workers.map((w) => [w.id, w]));
    return transfers
      .filter((t) => ((t as any).category ?? "منزلية") === category)
      .map((t) => {
        const worker = byId.get(t.worker_id) ?? null;
        return { ...t, worker, worker_name: worker?.name ?? "—" };
      })
      .filter((r) => (payFilter ? r.payment_status === payFilter : true))
      .filter((r) =>
        natFilter ? (r.worker?.nationality ?? "").trim() === natFilter : true,
      );
  }, [transfers, workers, payFilter, natFilter]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["transfers"] });
    qc.invalidateQueries({ queryKey: ["workers"] });
  };


  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transfers").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف عملية النقل");
      setDeleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("complete_transfer", { _transfer_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم إتمام النقل وتحديث الكفيل الحالي");
      setCompleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        id: "worker_name",
        accessorKey: "worker_name",
        header: "اسم العاملة",
        meta: { width: 160 },
        cell: ({ row }) =>
          row.original.worker ? (
            <button
              type="button"
              onClick={() => setProfileWorker(row.original.worker)}
              className="font-medium text-brand underline-offset-2 hover:underline"
            >
              {row.original.worker_name}
            </button>
          ) : (
            "—"
          ),
      },
      {
        id: "passport_number",
        accessorFn: (r) => r.worker?.passport_number ?? "",
        header: "رقم الجواز",
        meta: { width: 130 },
        cell: ({ row }) =>
          row.original.worker ? (
            <button
              type="button"
              onClick={() => setProfileWorker(row.original.worker)}
              className="font-medium tabular-nums text-brand underline-offset-2 hover:underline"
              dir="ltr"
            >
              {row.original.worker.passport_number || "—"}
            </button>
          ) : (
            "—"
          ),
      },
      {
        id: "days_in_saudi",
        accessorFn: (r) => daysInSaudi(r.worker?.entry_date ?? r.worker?.arrival_date ?? null),
        header: "أيام العاملة في السعودية",
        meta: { width: 150 },
        cell: ({ row }) => {
          const d = daysInSaudi(row.original.worker?.entry_date ?? row.original.worker?.arrival_date ?? null);
          return (
            <span className="font-semibold tabular-nums text-brand">{formatDaysInSaudi(d)}</span>
          );
        },
      },
      {
        id: "old_sponsor_name",
        accessorKey: "old_sponsor_name",
        header: "الكفيل القديم",
        meta: { editable: admin },
        cell: ({ row }) => (
          <div className="leading-tight">
            <SponsorLink name={row.original.old_sponsor_name} onClick={setSponsor} />
            <div className="text-[11px] text-ink/45 tabular-nums" dir="ltr">
              {row.original.old_sponsor_phone}
            </div>
          </div>
        ),
      },
      {
        id: "new_sponsor_name",
        accessorKey: "new_sponsor_name",
        header: "الكفيل الجديد",
        meta: { editable: true },
        cell: ({ row }) => <SponsorLink name={row.original.new_sponsor_name} onClick={setSponsor} />,
      },
      {
        id: "new_sponsor_phone",
        accessorKey: "new_sponsor_phone",
        header: "هاتف الجديد",
        meta: { editable: true, ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => (getValue() as string) || "—",
      },
      {
        id: "visa_type",
        accessorKey: "visa_type",
        header: "نوع التأشيرة",
        meta: { editable: true, type: "select", options: VISA_TYPES },
      },
      {
        id: "visa_number",
        accessorFn: (r) => r.worker?.visa_number ?? "",
        header: "رقم التأشيرة",
        meta: { ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => (getValue() as string) || "—",
      },
      {
        id: "transfer_type",
        accessorKey: "transfer_type",
        header: "نوع النقل",
        meta: { editable: true, type: "select", options: TRANSFER_TYPES },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "transfer_date",
        accessorKey: "transfer_date",
        header: "تاريخ النقل",
        meta: { editable: true, type: "date", ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
      {
        id: "transfer_stage",
        accessorKey: "transfer_stage",
        header: "حالة النقل",
        meta: { editable: true, type: "select", options: TRANSFER_STAGES, width: 190 },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "worker_condition",
        accessorKey: "worker_condition",
        header: "ملاحظات حالة العاملة",
        meta: { editable: true, type: "textarea", width: 200 },
        cell: ({ getValue }) => (
          <span className="line-clamp-1 max-w-[220px] text-ink/70">{(getValue() as string) || "—"}</span>
        ),
      },
      {
        id: "worker_location",
        accessorKey: "worker_location",
        header: "موقع العاملة",
        meta: { editable: true, type: "select", options: LOCATIONS },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },

      {
        id: "old_sponsor_dues",
        accessorKey: "old_sponsor_dues",
        header: "مستحقات القديم",
        meta: { editable: true, type: "number", ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: "down_payment",
        accessorKey: "down_payment",
        header: "العربون",
        meta: { editable: true, type: "number", ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: "other_payments",
        accessorKey: "other_payments",
        header: "مدفوعات أخرى",
        meta: { editable: true, type: "number", ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },
      {
        id: "remaining_amount",
        accessorKey: "remaining_amount",
        header: "المتبقي",
        meta: { ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => {
          const v = Number(getValue() ?? 0);
          return (
            <span className={`font-semibold ${v > 0 ? "text-terracotta" : "text-success"}`}>{formatMoney(v)}</span>
          );
        },
      },
      {
        id: "payment_status",
        accessorKey: "payment_status",
        header: "حالة الدفع",
        meta: { editable: true, type: "select", options: PAYMENT_STATUSES },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "medical_exam",
        accessorKey: "medical_exam",
        header: "الفحص الطبي",
        meta: { editable: true, type: "select", options: YES_NO_EXISTS },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "residency_status",
        accessorKey: "residency_status",
        header: "الإقامة",
        meta: { editable: true, type: "select", options: YES_NO_EXISTS_F },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "salary_dues_status",
        accessorKey: "salary_dues_status",
        header: "مستحقات الرواتب",
        meta: { editable: true, type: "select", options: YES_NO_EXISTS_F },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "salary_dues_amount",
        accessorKey: "salary_dues_amount",
        header: "قيمة مستحقات الرواتب",
        meta: { editable: true, type: "number", ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => formatMoney(getValue() as number),
      },

      {
        id: "created_by",
        accessorFn: (r) => nameOf(r.created_by),
        header: "تم الإضافة بواسطة",
        cell: ({ getValue }) => <span className="text-[12px] text-ink/55">{getValue() as string}</span>,
      },
      {
        id: "updated_by",
        accessorFn: (r) => nameOf(r.updated_by),
        header: "آخر تعديل بواسطة",
        cell: ({ getValue }) => <span className="text-[12px] text-ink/55">{getValue() as string}</span>,
      },
    ],
    [admin, nameOf],
  );

  const [importOpen, setImportOpen] = useState(false);

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <GridToolbar
        title={category === "مهنية" ? "نقل الكفالة المهنية" : "نقل كفالة العمالة المنزلية"}
        count={rows.length}
        search={search}
        onSearch={setSearch}
        addLabel="نقل كفالة جديد"
        onAdd={canAdd ? () => {
          setEditing(null);
          setFormOpen(true);
        } : undefined}
        extra={
          canImport ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="size-4" /> استيراد من Excel
            </Button>
          ) : undefined
        }
        filters={
          <>
            <FilterChip active={payFilter === null} onClick={() => setPayFilter(null)}>
              الكل
            </FilterChip>
            {PAYMENT_STATUSES.map((s) => (
              <FilterChip key={s} active={payFilter === s} onClick={() => setPayFilter(s)}>
                {s}
              </FilterChip>
            ))}
            <span className="mx-1 hidden h-4 w-px bg-black/10 sm:inline-block" />
            <FilterChip active={natFilter === null} onClick={() => setNatFilter(null)}>
              كل الجنسيات
            </FilterChip>
            {nationalities.map((n) => (
              <FilterChip key={n} active={natFilter === n} onClick={() => setNatFilter(natFilter === n ? null : n)}>
                {n}
              </FilterChip>
            ))}
          </>
        }
      />

      {isLoading ? (
        <div className="glass h-64 animate-pulse rounded-2xl" />
      ) : (
        <DataGrid
          gridKey="transfers"
          data={rows}
          columns={columns}
          search={search}
          emptyMessage="لا توجد عمليات نقل كفالة بعد"

          rowActions={(t) => (
            <>
              {t.worker?.transfer_status !== "تم النقل" && (
                <IconBtn title="إتمام النقل" onClick={() => setCompleting(t)}>
                  <CheckCircle2 className="size-3.5" />
                </IconBtn>
              )}
              {canEdit && (<IconBtn
                title="تعديل"
                onClick={() => {
                  setEditing(t);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-3.5" />
              </IconBtn>)}
              {canDel && (
                <IconBtn title="حذف" danger onClick={() => setDeleting(t)}>
                  <Trash2 className="size-3.5" />
                </IconBtn>
              )}
            </>
          )}
        />
      )}

      <TransferFormDialog open={formOpen} onOpenChange={setFormOpen} transfer={editing} isAdmin={admin} category={category} />
      <ExcelImportDialog targetKey="transfers" tableLabel={category === "مهنية" ? "نقل الكفالة المهنية" : "نقل كفالة العمالة المنزلية"} open={importOpen} onOpenChange={setImportOpen} onImported={() => qc.invalidateQueries()} />
      <WorkerProfileDialog
        worker={profileWorker}
        onClose={() => setProfileWorker(null)}
        onSponsorClick={(n) => {
          setProfileWorker(null);
          setSponsor(n);
        }}
      />
      <SponsorProfileDialog
        sponsor={sponsor}
        onClose={() => setSponsor(null)}
        onWorkerClick={(w) => {
          setSponsor(null);
          setProfileWorker(w);
        }}
      />
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف عملية النقل؟"
        description={`سيتم حذف عملية نقل كفالة "${deleting?.worker_name ?? ""}" نهائياً.`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
      <ConfirmDelete
        open={Boolean(completing)}
        onOpenChange={(o) => !o && setCompleting(null)}
        title="إتمام نقل الكفالة؟"
        description={`سيصبح "${completing?.new_sponsor_name ?? ""}" هو الكفيل الحالي لـ "${completing?.worker_name ?? ""}" وتتحول الحالة إلى "تم النقل".`}
        pending={complete.isPending}
        confirmLabel="نعم، تم النقل"
        onConfirm={() => completing && complete.mutate(completing.id)}
      />
    </main>
  );
}
