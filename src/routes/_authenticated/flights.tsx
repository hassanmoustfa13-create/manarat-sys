import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DataGrid } from "@/components/DataGrid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, SelectField, TextField } from "@/components/FormFields";
import { FilterChip, GridToolbar } from "@/components/GridToolbar";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DynamicFormDialog } from "@/components/DynamicForm";
import { IconBtn } from "@/routes/_authenticated/workers";
import { errorMessage, formatDate, profileNameMap, profilesQuery } from "@/lib/data";

export const FLIGHT_STATUSES = ["—", "تم الوصول", "تم الإلغاء"];

type Flight = {
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

export function dayName(date: string | null) {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long" });
}

export const Route = createFileRoute("/_authenticated/flights")({
  head: () => ({
    meta: [
      { title: "الرحلات — منارات هجر للاستقدام" },
      { name: "description", content: "جدول رحلات وصول العاملات والمكاتب الخارجية والعملاء" },
      { property: "og:title", content: "الرحلات — منارات هجر للاستقدام" },
      { property: "og:description", content: "جدول رحلات وصول العاملات" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlightsPage,
});

function FlightsPage() {
  const auth = useAuth();
  const admin = auth.isAdmin;
  const permRes = "flights" as const;
  const canAdd = auth.can(permRes, "add");
  const canEdit = auth.can(permRes, "edit");
  const canDel = auth.can(permRes, "delete");
  const canImport = auth.can(permRes, "import");
  const qc = useQueryClient();
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);
  const { data: flights = [], isLoading } = useQuery({
    queryKey: ["flights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flights")
        .select("*")
        .order("flight_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Flight[];
    },
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Flight | null>(null);
  const [deleting, setDeleting] = useState<Flight | null>(null);

  const rows = useMemo(
    () =>
      (filter ? flights.filter((f) => f.status === filter) : flights).map((f) => ({
        ...f,
        day: dayName(f.flight_date),
        clients_text: f.clients.join("، "),
      })),
    [flights, filter],
  );

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flights"] });
      toast.success("تم حذف الرحلة");
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
            s === "تم الوصول"
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
        title="الرحلات"
        count={flights.length}
        search={search}
        onSearch={setSearch}
        addLabel="إضافة رحلة"
        onAdd={canAdd ? () => {
          setEditing(null);
          setFormOpen(true);
        } : undefined}
        filters={
          <>
            <FilterChip active={filter === null} onClick={() => setFilter(null)}>
              الكل
            </FilterChip>
            {FLIGHT_STATUSES.map((s) => (
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
          gridKey="flights"
          sortable
          emptyMessage="لا توجد رحلات بعد"
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
        formKey="flights"
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing as (Record<string, unknown> & { id: string }) | null}
        title={editing ? "تعديل الرحلة" : "رحلة جديدة"}
        queryKey={["flights"]}
        successText="تمت إضافة الرحلة"
      />
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف الرحلة؟"
        description="سيتم حذف الرحلة نهائياً."
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </main>
  );
}
