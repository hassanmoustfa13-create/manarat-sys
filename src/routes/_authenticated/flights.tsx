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
  const { isAdmin: admin } = useAuth();
  const qc = useQueryClient();
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
    ],
    [],
  );

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <GridToolbar
        title="الرحلات"
        count={flights.length}
        search={search}
        onSearch={setSearch}
        addLabel="إضافة رحلة"
        onAdd={() => {
          setEditing(null);
          setFormOpen(true);
        }}
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
          emptyMessage="لا توجد رحلات بعد"
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
      <FlightDialog open={formOpen} onOpenChange={setFormOpen} flight={editing} />
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

function FlightDialog({ open, onOpenChange, flight }: { open: boolean; onOpenChange: (o: boolean) => void; flight: Flight | null }) {
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [office, setOffice] = useState("");
  const [count, setCount] = useState("0");
  const [clientsText, setClientsText] = useState("");
  const [visaClients, setVisaClients] = useState<string[]>([]);
  const [status, setStatus] = useState(FLIGHT_STATUSES[0]!);

  const clientNames = useMemo(
    () => [...new Set(clientsText.split("\n").map((c) => c.trim()).filter(Boolean))],
    [clientsText],
  );

  useEffect(() => {
    if (!open) return;
    setDate(flight?.flight_date ?? "");
    setTime(flight?.flight_time ?? "");
    setOffice(flight?.office_name ?? "");
    setCount(String(flight?.workers_count ?? 0));
    setClientsText((flight?.clients ?? []).join("\n"));
    setVisaClients(flight?.visa_clients ?? []);
    setStatus(flight?.status ?? FLIGHT_STATUSES[0]!);
  }, [open, flight]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        flight_date: date || null,
        flight_time: time.trim(),
        office_name: office.trim(),
        workers_count: Math.max(0, Math.floor(Number(count) || 0)),
        clients: clientNames,
        visa_clients: visaClients.filter((c) => clientNames.includes(c)),
        status,
      };
      const { error } = flight
        ? await supabase.from("flights").update(payload).eq("id", flight.id)
        : await supabase.from("flights").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(flight ? "تم حفظ التعديلات" : "تمت إضافة الرحلة");
      qc.invalidateQueries({ queryKey: ["flights"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{flight ? "تعديل الرحلة" : "رحلة جديدة"}</DialogTitle>
          <DialogDescription>اليوم يُحدَّد تلقائيًا من التاريخ، ويمكن إضافة أكثر من عميل.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <TextField label="التاريخ" type="date" ltr value={date} onChange={setDate} />
          <Field label="اليوم (تلقائي)">
            <div className="glass flex h-9 items-center rounded-md px-3 text-sm">{dayName(date) || "—"}</div>
          </Field>
          <TextField label="الوقت" type="time" ltr value={time} onChange={setTime} />
          <TextField label="اسم المكتب الخارجي" value={office} onChange={setOffice} />
          <TextField label="عدد العاملات" type="number" ltr value={count} onChange={setCount} />
          <SelectField label="الحالة" value={status} onChange={setStatus} options={FLIGHT_STATUSES} />
          <Field label="أسماء العملاء (كل اسم في سطر)" className="sm:col-span-2">
            <textarea
              value={clientsText}
              onChange={(e) => setClientsText(e.target.value)}
              rows={4}
              placeholder={"أحمد محمد\nسارة علي\n..."}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>
          {clientNames.length > 0 && (
            <Field label="تابع لتأشيرات المكتب" className="sm:col-span-2" hint="ضع علامة صح بجانب العميل التابع لتأشيرات المكتب">
              <div className="flex flex-wrap gap-2">
                {clientNames.map((c) => {
                  const checked = visaClients.includes(c);
                  return (
                    <label
                      key={c}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] ${
                        checked ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={checked}
                        onChange={(e) =>
                          setVisaClients((l) => (e.target.checked ? [...l, c] : l.filter((x) => x !== c)))
                        }
                      />
                      {c}
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
          <DialogFooter className="sm:col-span-2 sm:justify-start">
            <Button type="submit" disabled={save.isPending}>
              {flight ? "حفظ" : "إضافة"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
