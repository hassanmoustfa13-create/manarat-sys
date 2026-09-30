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
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { SponsorLink, SponsorProfileDialog, WorkerProfileDialog } from "@/components/ProfileDialogs";
import { IconBtn } from "@/routes/_authenticated/workers";
import { VisaFormDialog, VISA_STATUSES, type OfficeVisa } from "@/components/VisaFormDialog";
import { type Worker, errorMessage } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/visas")({
  head: () => ({
    meta: [
      { title: "تأشيرات المكتب — منارات هجر للاستقدام" },
      { name: "description", content: "متابعة تأشيرات المكتب وحالة العقد والدفع" },
      { property: "og:title", content: "تأشيرات المكتب — منارات هجر للاستقدام" },
      { property: "og:description", content: "متابعة تأشيرات المكتب وحالة العقد والدفع" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VisasPage,
});

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
        ok ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
      }`}
    >
      {children}
    </span>
  );
}

function VisasPage() {
  const { isAdmin: admin } = useAuth();
  const qc = useQueryClient();
  const { data: visas = [], isLoading } = useQuery({
    queryKey: ["office_visas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("office_visas").select("*").order("seq", { ascending: true });
      if (error) throw error;
      return data as OfficeVisa[];
    },
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OfficeVisa | null>(null);
  const [deleting, setDeleting] = useState<OfficeVisa | null>(null);
  const [sponsor, setSponsor] = useState<string | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);

  const rows = useMemo(() => {
    const list = filter ? visas.filter((v) => v.visa_status === filter) : visas;
    return list.map((v, i) => ({ ...v, idx: i + 1 }));
  }, [visas, filter]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("office_visas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["office_visas"] });
      toast.success("تم حذف التأشيرة");
      setDeleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns = useMemo<ColumnDef<OfficeVisa & { idx: number }, unknown>[]>(
    () => [
      {
        id: "holder_name",
        accessorKey: "holder_name",
        header: "اسم صاحب التأشيرة",
        meta: { width: 170 },
        cell: ({ row }) => <SponsorLink name={row.original.holder_name} onClick={setSponsor} />,
      },
      {
        id: "new_sponsor_name",
        accessorKey: "new_sponsor_name",
        header: "اسم الكفيل الجديد",
        meta: { width: 170 },
        cell: ({ row }) =>
          row.original.new_sponsor_name ? (
            <SponsorLink name={row.original.new_sponsor_name} onClick={setSponsor} />
          ) : (
            "—"
          ),
      },
      {
        id: "visa_status",
        accessorKey: "visa_status",
        header: "حالة التأشيرة",
        meta: { width: 140 },
        cell: ({ getValue }) => <Pill ok={getValue() === "تم عمل العقد"}>{getValue() as string}</Pill>,
      },
      {
        id: "visa_number",
        accessorKey: "visa_number",
        header: "رقم التأشيرة",
        meta: { width: 130, ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => (getValue() as string) || "—",
      },
      {
        id: "payment_status",
        accessorKey: "payment_status",
        header: "حالة الدفع",
        meta: { width: 120 },
        cell: ({ getValue }) => <Pill ok={getValue() === "تم الدفع"}>{getValue() as string}</Pill>,
      },
    ],
    [],
  );

  const [importOpen, setImportOpen] = useState(false);

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <GridToolbar
        title="تأشيرات المكتب"
        count={visas.length}
        search={search}
        onSearch={setSearch}
        addLabel="إضافة تأشيرة جديدة"
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
            <FilterChip active={filter === null} onClick={() => setFilter(null)}>
              الكل
            </FilterChip>
            {VISA_STATUSES.map((s) => (
              <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
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
          gridKey="office_visas"
          emptyMessage="لا توجد تأشيرات بعد"
          rowActions={(r) => (
            <>
              <IconBtn
                title="تعديل"
                onClick={() => {
                  setEditing(r);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-3.5" />
              </IconBtn>
              {admin && (
                <IconBtn title="حذف" danger onClick={() => setDeleting(r)}>
                  <Trash2 className="size-3.5" />
                </IconBtn>
              )}
            </>
          )}
        />
      )}
      <VisaFormDialog open={formOpen} onOpenChange={setFormOpen} visa={editing} visas={visas} />
      <ExcelImportDialog targetKey="office_visas" open={importOpen} onOpenChange={setImportOpen} onImported={() => qc.invalidateQueries()} />
      <SponsorProfileDialog
        sponsor={sponsor}
        onClose={() => setSponsor(null)}
        onWorkerClick={(w) => {
          setSponsor(null);
          setWorker(w);
        }}
      />
      <WorkerProfileDialog worker={worker} onClose={() => setWorker(null)} onSponsorClick={setSponsor} />
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف التأشيرة؟"
        description={`سيتم حذف تأشيرة "${deleting?.holder_name ?? ""}" نهائياً.`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </main>
  );
}
