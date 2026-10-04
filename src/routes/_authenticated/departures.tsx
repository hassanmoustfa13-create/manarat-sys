import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DataGrid } from "@/components/DataGrid";
import { FilterChip, GridToolbar } from "@/components/GridToolbar";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DynamicFormDialog } from "@/components/DynamicForm";
import { IconBtn } from "@/routes/_authenticated/workers";
import { errorMessage, formatDate, profileNameMap, profilesQuery } from "@/lib/data";
import { dayName } from "@/routes/_authenticated/flights";

export const DEPARTURE_STATUSES = ["—", "تم المغادرة", "تم الإلغاء"];

type Departure = {
  id: string;
  flight_date: string | null;
  flight_time: string;
  office_name: string;
  workers_count: number;
  clients: string[];
  visa_clients: string[];
  status: string;
  created_by: string | null;
  updated_by: string | null;
};

export const Route = createFileRoute("/_authenticated/departures")({
  head: () => ({
    meta: [
      { title: "المغادرة — منارات هجر للاستقدام" },
      { name: "description", content: "جدول مغادرة العاملات والمكاتب الخارجية والعملاء" },
      { property: "og:title", content: "المغادرة — منارات هجر للاستقدام" },
      { property: "og:description", content: "جدول مغادرة العاملات" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeparturesPage,
});

function DeparturesPage() {
  const auth = useAuth();
  const permRes = "departures" as const;
  const canAdd = auth.can(permRes, "add");
  const canEdit = auth.can(permRes, "edit");
  const canDel = auth.can(permRes, "delete");
  const qc = useQueryClient();
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);
  const { data: departures = [], isLoading } = useQuery({
    queryKey: ["departures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("*")
        .order("flight_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Departure[];
    },
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Departure | null>(null);
  const [deleting, setDeleting] = useState<Departure | null>(null);

  const rows = useMemo(
    () =>
      (filter ? departures.filter((f) => f.status === filter) : departures).map((f) => ({
        ...f,
        day: dayName(f.flight_date),
        clients_text: f.clients.join("، "),
      })),
    [departures, filter],
  );

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departures"] });
      toast.success("تم حذف المغادرة");
      setDeleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  type Row = (typeof rows)[number];
  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { id: "day", accessorKey: "day", header: "اليوم", meta: { width: 100 }, cell: ({ getValue }) => (getValue() as string) || "—" },
      {
        id: "flight_date",
        accessorKey: "flight_date",
        header: "التاريخ",
        meta: { width: 120, ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
      {
        id: "flight_time",
        accessorKey: "flight_time",
        header: "الوقت",
        meta: { width: 90, ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => (getValue() as string) || "—",
      },
      { id: "office_name", accessorKey: "office_name", header: "اسم المكتب الخارجي", meta: { width: 170 }, cell: ({ getValue }) => (getValue() as string) || "—" },
      { id: "workers_count", accessorKey: "workers_count", header: "عدد العاملات", meta: { width: 100, className: "tabular-nums" } },
      {
        id: "clients_text",
        accessorKey: "clients_text",
        header: "اسم العميل",
        meta: { width: 240 },
        cell: ({ row }) =>
          row.original.clients.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.clients.map((c, i) => (
                <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[12px]">
                  {c}
                  {row.original.visa_clients.includes(c) && <span className="mr-1 font-bold text-primary">✓</span>}
                </span>
              ))}
            </div>
          ) : (
            "—"
          ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "الحالة",
        meta: { width: 110 },
        cell: ({ getValue }) => {
          const s = getValue() as string;
          const cls =
            s === "تم المغادرة"
              ? "bg-primary/15 text-primary"
              : s === "تم الإلغاء"
                ? "bg-destructive/15 text-destructive"
                : "bg-muted text-muted-foreground";
          return (
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${cls}`}>
              {s}
            </span>
          );
        },
      },
      {
        id: "created_by",
        accessorFn: (r) => nameOf(r.created_by),
        header: "تم الإضافة بواسطة",
        cell: ({ getValue }) => <span className="text-[12px] text-ink/55">{(getValue() as string) || "—"}</span>,
      },
      {
        id: "updated_by",
        accessorFn: (r) => nameOf(r.updated_by),
        header: "آخر تعديل بواسطة",
        cell: ({ getValue }) => <span className="text-[12px] text-ink/55">{(getValue() as string) || "—"}</span>,
      },
    ],
    [nameOf],
  );

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <GridToolbar
        title="المغادرة"
        count={departures.length}
        search={search}
        onSearch={setSearch}
        addLabel="إضافة مغادرة"
        onAdd={canAdd ? () => {
          setEditing(null);
          setFormOpen(true);
        } : undefined}
        filters={
          <>
            <FilterChip active={filter === null} onClick={() => setFilter(null)}>
              الكل
            </FilterChip>
            {DEPARTURE_STATUSES.map((s) => (
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
          gridKey="departures"
          sortable
          emptyMessage="لا توجد مغادرة بعد"
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
      <DynamicFormDialog
        formKey="departures"
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing as (Record<string, unknown> & { id: string }) | null}
        title={editing ? "تعديل المغادرة" : "مغادرة جديدة"}
        queryKey={["departures"]}
        successText="تمت إضافة المغادرة"
      />
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف المغادرة؟"
        description="سيتم حذف المغادرة نهائياً."
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </main>
  );
}
