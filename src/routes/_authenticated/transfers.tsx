import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DataGrid } from "@/components/DataGrid";
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
  type TransferUpdate,
  type Worker,
  errorMessage,
  formatDate,
  formatMoney,
  profileNameMap,
  profilesQuery,
  transfersQuery,
  workersQuery,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({
    meta: [
      { title: "جدول نقل الكفالة — هجرة" },
      { name: "description", content: "متابعة عمليات نقل الكفالة، المستحقات، العربون، والمتبقي في جدول تفاعلي" },
      { property: "og:title", content: "جدول نقل الكفالة — هجرة" },
      { property: "og:description", content: "متابعة عمليات نقل الكفالة والمدفوعات" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransfersPage,
});

type Row = Transfer & { worker_name: string; worker: Worker | null };

function TransfersPage() {
  const auth = useAuth();
  const admin = auth.isAdmin;
  const qc = useQueryClient();
  const { data: transfers = [], isLoading } = useQuery(transfersQuery);
  const { data: workers = [] } = useQuery(workersQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);

  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transfer | null>(null);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [sponsor, setSponsor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [completing, setCompleting] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const byId = new Map(workers.map((w) => [w.id, w]));
    return transfers
      .map((t) => {
        const worker = byId.get(t.worker_id) ?? null;
        return { ...t, worker, worker_name: worker?.name ?? "—" };
      })
      .filter((r) => (payFilter ? r.payment_status === payFilter : true));
  }, [transfers, workers, payFilter]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["transfers"] });
    qc.invalidateQueries({ queryKey: ["workers"] });
  };

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TransferUpdate }) => {
      const { error } = await supabase.from("transfers").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم الحفظ", { duration: 1500 });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transfers").delete().eq("id", id);
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
        id: "notes",
        accessorKey: "notes",
        header: "ملاحظات",
        meta: { editable: true, type: "textarea", width: 180 },
        cell: ({ getValue }) => (
          <span className="line-clamp-1 max-w-[200px] text-ink/70">{(getValue() as string) || "—"}</span>
        ),
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

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <GridToolbar
        title="جدول نقل الكفالة"
        count={transfers.length}
        search={search}
        onSearch={setSearch}
        addLabel="نقل كفالة جديد"
        onAdd={() => {
          setEditing(null);
          setFormOpen(true);
        }}
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
          </>
        }
      />

      {isLoading ? (
        <div className="glass h-64 animate-pulse rounded-2xl" />
      ) : (
        <DataGrid
          data={rows}
          columns={columns}
          search={search}
          minWidth={1900}
          emptyMessage="لا توجد عمليات نقل كفالة بعد"
          onCellSave={async (row, col, value) => {
            const patch: TransferUpdate =
              col === "old_sponsor_dues" || col === "down_payment"
                ? { [col]: Number(value || 0) }
                : col === "transfer_date"
                  ? { transfer_date: value || null }
                  : ({ [col]: value } as TransferUpdate);
            await update.mutateAsync({ id: row.id, patch });
          }}
          rowActions={(t) => (
            <>
              {t.worker?.transfer_status !== "تم النقل" && (
                <IconBtn title="إتمام النقل" onClick={() => setCompleting(t)}>
                  <CheckCircle2 className="size-3.5" />
                </IconBtn>
              )}
              <IconBtn
                title="تعديل"
                onClick={() => {
                  setEditing(t);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-3.5" />
              </IconBtn>
              {admin && (
                <IconBtn title="حذف" danger onClick={() => setDeleting(t)}>
                  <Trash2 className="size-3.5" />
                </IconBtn>
              )}
            </>
          )}
        />
      )}

      <TransferFormDialog open={formOpen} onOpenChange={setFormOpen} transfer={editing} isAdmin={admin} />
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
        onConfirm={() => completing && complete.mutate(completing.id)}
      />
    </main>
  );
}
