import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight, CheckCircle2, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DataGrid } from "@/components/DataGrid";
import { Button } from "@/components/ui/button";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { FilterChip, GridToolbar } from "@/components/GridToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkerFormDialog } from "@/components/WorkerFormDialog";
import { TransferFormDialog } from "@/components/TransferFormDialog";
import { SponsorLink, SponsorProfileDialog, WorkerProfileDialog } from "@/components/ProfileDialogs";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import {
  ARRIVAL_STATUSES,
  LOCATIONS,
  NATIONALITIES,
  PROFESSIONS,
  TRANSFER_STATUSES,
  VISA_TYPES,

  type Worker,
  daysUntil,
  errorMessage,
  formatDate,
  formatDaysRemaining,
  formatMoney,
  profileNameMap,
  profilesQuery,
  workersQuery,
  workerCategory,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/workers")({
  head: () => ({
    meta: [
      { title: "جدول العمالة — منارات هجر للاستقدام" },
      { name: "description", content: "إدارة بيانات العمالة، الكفلاء، وحالة نقل الكفالة في جدول تفاعلي" },
      { property: "og:title", content: "جدول العمالة — منارات هجر للاستقدام" },
      { property: "og:description", content: "إدارة بيانات العمالة والكفلاء في جدول تفاعلي" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkersPage,
});

function WorkersPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const { data: workers = [], isLoading } = useQuery(workersQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [natFilter, setNatFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [transferFor, setTransferFor] = useState<Worker | null>(null);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [sponsor, setSponsor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Worker | null>(null);
  const [completing, setCompleting] = useState<Worker | null>(null);

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workers").update({ transfer_status: "تم النقل" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
      qc.invalidateQueries({ queryKey: ["transfers"] });
      toast.success("تم إتمام النقل وإضافته إلى جدول نقل الكفالة");
      setCompleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const nationalities = useMemo(
    () => Array.from(new Set(workers.map((w) => w.nationality).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar")),
    [workers],
  );

  const filtered = useMemo(
    () =>
      workers
        .filter((w) => (statusFilter ? w.transfer_status === statusFilter : true))
        .filter((w) => (natFilter ? w.nationality === natFilter : true)),
    [workers, statusFilter, natFilter],
  );


  const remove = useMutation({
    mutationFn: async (id: string): Promise<"deleted" | "deactivated"> => {
      const { count, error: cErr } = await supabase
        .from("transfers")
        .select("id", { count: "exact", head: true })
        .eq("worker_id", id)
        .eq("is_deleted", false)
        .neq("transfer_stage", "تم النقل");
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        const { error } = await supabase.from("workers").update({ transfer_status: "غير نشط" }).eq("id", id);
        if (error) throw error;
        return "deactivated";
      }
      // soft delete: keep the row and its transfer history
      const { error } = await supabase.from("workers").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
      return "deleted";
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["workers"] });
      qc.invalidateQueries({ queryKey: ["transfers"] });
      if (result === "deactivated") {
        toast.info("لدى العامل/ـة عمليات نقل كفالة مرتبطة — تم تغيير الحالة إلى «غير نشط» بدلاً من الحذف");
      } else {
        toast.success("تم حذف السجل");
      }
      setDeleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const admin = auth.isAdmin;

  const columns = useMemo<ColumnDef<Worker, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "اسم العامل/ـة",
        meta: { editable: admin, width: 180 },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setProfileWorker(row.original);
            }}
            className="font-medium text-brand underline-offset-2 hover:underline"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        id: "passport_number",
        accessorKey: "passport_number",
        header: "رقم الجواز",
        meta: { editable: admin, ltr: true, className: "tabular-nums" },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setProfileWorker(row.original);
            }}
            className="font-medium text-brand underline-offset-2 hover:underline"
            dir="ltr"
          >
            {row.original.passport_number || "—"}
          </button>
        ),
      },
      {
        id: "nationality",
        accessorKey: "nationality",
        header: "الجنسية",
        meta: { editable: admin, type: "select", options: NATIONALITIES },
      },
      {
        id: "profession",
        accessorKey: "profession",
        header: "المهنة",
        meta: { editable: true, type: "select", options: PROFESSIONS },
      },
      {
        id: "visa_type",
        accessorKey: "visa_type",
        header: "نوع التأشيرة",
        meta: { editable: true, type: "select", options: VISA_TYPES },
      },
      {
        id: "visa_number",
        accessorKey: "visa_number",
        header: "رقم التأشيرة",
        meta: { ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => (getValue() as string) || "—",
      },
      {
        id: "arrival_date",
        accessorKey: "arrival_date",
        header: "تاريخ دخول المكتب",
        meta: { editable: admin, type: "date", ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
      {
        id: "entry_date",
        accessorKey: "entry_date",
        header: "تاريخ دخولها السعودية",
        meta: { editable: admin, type: "date", ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
      {
        id: "residency_number",
        accessorKey: "residency_number",
        header: "رقم الإقامة",
        meta: { editable: true, ltr: true, className: "tabular-nums" },
        cell: ({ row }) =>
          row.original.residency_status === "يوجد" ? row.original.residency_number || "—" : "—",
      },
      {
        id: "arrival_status",
        accessorKey: "arrival_status",
        header: "حالة الوصول",
        meta: { editable: true, type: "select", options: ARRIVAL_STATUSES },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "current_location",
        accessorKey: "current_location",
        header: "الموقع الحالي",
        meta: { editable: true, type: "select", options: LOCATIONS },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },

      {
        id: "days_remaining",
        accessorFn: (r) => daysUntil(r.arrival_date),
        header: "المتبقي للوصول",
        cell: ({ getValue }) => {
          const d = getValue() as number | null;
          if (d === null) return <span className="text-ink/30">—</span>;
          const cls = d < 0 ? "pill pill-neutral" : d <= 7 ? "pill pill-terracotta" : "pill pill-teal";
          return <span className={cls}>{formatDaysRemaining(d)}</span>;
        },
      },
      {
        id: "current_sponsor_name",
        accessorKey: "current_sponsor_name",
        header: "الكفيل الحالي",
        meta: { editable: true },
        cell: ({ row }) => <SponsorLink name={row.original.current_sponsor_name} onClick={setSponsor} />,
      },
      {
        id: "current_sponsor_phone",
        accessorKey: "current_sponsor_phone",
        header: "هاتف الكفيل",
        meta: { editable: true, ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => (getValue() as string) || <span className="text-ink/30">—</span>,
      },
      {
        id: "transfer_status",
        accessorKey: "transfer_status",
        header: "حالة النقل",
        meta: { editable: true, type: "select", options: TRANSFER_STATUSES },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "notes",
        accessorKey: "notes",
        header: "ملاحظات",
        meta: { editable: true, type: "textarea", width: 200 },
        cell: ({ getValue }) => (
          <span className="line-clamp-1 max-w-[220px] text-ink/70">{(getValue() as string) || "—"}</span>
        ),
      },
      {
        id: "passport_holder",
        accessorKey: "passport_holder",
        header: "الجواز لدى",
        cell: ({ getValue }) => <span className="pill pill-neutral">{(getValue() as string) || "—"}</span>,
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
        title="جدول العمالة"
        count={workers.length}
        search={search}
        onSearch={setSearch}
        addLabel="إضافة عامل/ـة"
        onAdd={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        extra={
          admin ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="size-4" /> استيراد من Excel
            </Button>
          ) : undefined
        }
        filters={
          <>
            <FilterChip active={statusFilter === null} onClick={() => setStatusFilter(null)}>
              الكل
            </FilterChip>
            {TRANSFER_STATUSES.map((s) => (
              <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
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
          gridKey="workers"
          data={filtered}
          columns={columns}
          search={search}
          rowActions={(w) => (
            <>
              {w.transfer_status !== "تم النقل" && w.current_sponsor_name && (
                <IconBtn title="إتمام النقل" onClick={() => setCompleting(w)}>
                  <CheckCircle2 className="size-3.5" />
                </IconBtn>
              )}
              <IconBtn title="نقل الكفالة" onClick={() => setTransferFor(w)}>
                <ArrowLeftRight className="size-3.5" />
              </IconBtn>
              <IconBtn
                title="تعديل"
                onClick={() => {
                  setEditing(w);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-3.5" />
              </IconBtn>
              {admin && (
                <IconBtn title="حذف" danger onClick={() => setDeleting(w)}>
                  <Trash2 className="size-3.5" />
                </IconBtn>
              )}
            </>
          )}
        />
      )}

      <WorkerFormDialog open={formOpen} onOpenChange={setFormOpen} worker={editing} isAdmin={admin} />
      <ExcelImportDialog targetKey="workers" open={importOpen} onOpenChange={setImportOpen} onImported={() => qc.invalidateQueries()} />
      <TransferFormDialog
        open={Boolean(transferFor)}
        onOpenChange={(o) => !o && setTransferFor(null)}
        worker={transferFor}
        isAdmin={admin}
      />
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
        title="حذف سجل العامل/ـة؟"
        description={`سيتم حذف "${deleting?.name ?? ""}" نهائياً. ملاحظة: إذا كان لديه عمليات نقل كفالة مرتبطة فلن يتم الحذف — احذف عمليات النقل أولاً من صفحة نقل الكفالة.`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
      <ConfirmDelete
        open={Boolean(completing)}
        onOpenChange={(o) => !o && setCompleting(null)}
        title="إتمام نقل الكفالة؟"
        description={`سيتم اعتبار "${completing?.name ?? ""}" منقولة إلى الكفيل "${completing?.current_sponsor_name ?? ""}" وإضافة العملية إلى جدول نقل الكفالة ${workerCategory(completing) === "مهنية" ? "المهنية" : "المنزلية"}.`}
        confirmLabel="نعم، تم النقل"
        pending={complete.isPending}
        onConfirm={() => completing && complete.mutate(completing.id)}
      />
    </main>
  );
}

export function IconBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`grid size-7 place-items-center rounded-md transition-colors ${
        danger ? "text-terracotta hover:bg-terracotta/10" : "text-ink/55 hover:bg-brand/10 hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}
