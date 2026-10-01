import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DataGrid } from "@/components/DataGrid";
import { Button } from "@/components/ui/button";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { FilterChip, GridToolbar } from "@/components/GridToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { RequestFormDialog } from "@/components/RequestFormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { SponsorLink, SponsorProfileDialog, WorkerProfileDialog } from "@/components/ProfileDialogs";
import { IconBtn } from "@/routes/_authenticated/workers";
import {
  ACTION_STATUSES,
  LANGUAGES,
  NATIONALITIES,
  PROFESSIONS,
  RELIGIONS,
  REQUEST_TYPES,
  YES_NO_EXISTS,
  type Request,
  type Worker,
  errorMessage,
  formatDate,
  profileNameMap,
  profilesQuery,
  requestsQuery,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { title: "طلبات الاستقدام — منارات هجر للاستقدام" },
      { name: "description", content: "إدارة طلبات العملاء، تفضيلات العمالة، وحالة الإجراء على كل طلب" },
      { property: "og:title", content: "طلبات الاستقدام — منارات هجر للاستقدام" },
      { property: "og:description", content: "إدارة طلبات العملاء وتفضيلات العمالة" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const auth = useAuth();
  const admin = auth.isAdmin;
  const permRes = "requests" as const;
  const canAdd = auth.can(permRes, "add");
  const canEdit = auth.can(permRes, "edit");
  const canDel = auth.can(permRes, "delete");
  const canImport = auth.can(permRes, "import");
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery(requestsQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Request | null>(null);
  const [deleting, setDeleting] = useState<Request | null>(null);
  const [sponsor, setSponsor] = useState<string | null>(null);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);

  const filtered = useMemo(
    () => (statusFilter ? requests.filter((r) => r.action_status === statusFilter) : requests),
    [requests, statusFilter],
  );


  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      toast.success("تم حذف الطلب");
      setDeleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns = useMemo<ColumnDef<Request, unknown>[]>(
    () => [
      {
        id: "request_date",
        accessorKey: "request_date",
        header: "تاريخ الطلب",
        meta: { editable: true, type: "date", ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
      {
        id: "customer_name",
        accessorKey: "customer_name",
        header: "اسم العميل",
        meta: { editable: admin, width: 160 },
        cell: ({ row }) => <SponsorLink name={row.original.customer_name} onClick={setSponsor} />,
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "رقم الهاتف",
        meta: { editable: admin, ltr: true, className: "tabular-nums" },
      },
      {
        id: "profession",
        accessorKey: "profession",
        header: "المهنة",
        meta: { editable: true, type: "select", options: PROFESSIONS },
      },
      {
        id: "nationality",
        accessorKey: "nationality",
        header: "الجنسية",
        meta: { editable: true, type: "select", options: NATIONALITIES },
      },
      {
        id: "request_type",
        accessorKey: "request_type",
        header: "نوع الطلب",
        meta: { editable: true, type: "select", options: REQUEST_TYPES },
      },
      { id: "lead_source", accessorKey: "lead_source", header: "مصدر العميل", meta: { editable: true } },
      {
        id: "action_status",
        accessorKey: "action_status",
        header: "الإجراء على الطلب",
        meta: { editable: true, type: "select", options: ACTION_STATUSES, width: 190 },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      { id: "pref_age", accessorKey: "pref_age", header: "السن", meta: { editable: true } },
      {
        id: "pref_religion",
        accessorKey: "pref_religion",
        header: "الديانة",
        meta: { editable: true, type: "select", options: RELIGIONS },
      },
      { id: "pref_experience", accessorKey: "pref_experience", header: "الخبرة", meta: { editable: true } },
      {
        id: "pref_driving_license",
        accessorKey: "pref_driving_license",
        header: "رخصة قيادة",
        meta: { editable: true, type: "select", options: YES_NO_EXISTS },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      {
        id: "pref_languages",
        accessorKey: "pref_languages",
        header: "اللغات",
        meta: { editable: true, type: "select", options: LANGUAGES },
      },
      {
        id: "notes",
        accessorKey: "notes",
        header: "تفاصيل وملاحظات",
        meta: { editable: true, type: "textarea", width: 220 },
        cell: ({ getValue }) => (
          <span className="line-clamp-1 max-w-[240px] text-ink/70">{(getValue() as string) || "—"}</span>
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

  const [importOpen, setImportOpen] = useState(false);

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <GridToolbar
        title="طلبات الاستقدام"
        count={requests.length}
        search={search}
        onSearch={setSearch}
        addLabel="طلب جديد"
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
            <FilterChip active={statusFilter === null} onClick={() => setStatusFilter(null)}>
              الكل
            </FilterChip>
            {ACTION_STATUSES.map((s) => (
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
          gridKey="requests"
          data={filtered}
          columns={columns}
          search={search}
          emptyMessage="لا توجد طلبات بعد"
          rowActions={(r) => (
            <>
              {canEdit && (<IconBtn
                title="تعديل"
                onClick={() => {
                  setEditing(r);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-3.5" />
              </IconBtn>)}
              {canDel && (
                <IconBtn title="حذف" danger onClick={() => setDeleting(r)}>
                  <Trash2 className="size-3.5" />
                </IconBtn>
              )}
            </>
          )}
        />
      )}

      <RequestFormDialog open={formOpen} onOpenChange={setFormOpen} request={editing} isAdmin={admin} />
      <ExcelImportDialog targetKey="requests" open={importOpen} onOpenChange={setImportOpen} onImported={() => qc.invalidateQueries()} />
      <SponsorProfileDialog
        sponsor={sponsor}
        onClose={() => setSponsor(null)}
        onWorkerClick={(w) => {
          setSponsor(null);
          setProfileWorker(w);
        }}
      />
      <WorkerProfileDialog worker={profileWorker} onClose={() => setProfileWorker(null)} onSponsorClick={setSponsor} />
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف الطلب؟"
        description={`سيتم حذف طلب "${deleting?.customer_name ?? ""}" نهائياً.`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </main>
  );
}
