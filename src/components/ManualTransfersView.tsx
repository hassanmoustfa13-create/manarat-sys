import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { DataGrid } from "@/components/DataGrid";
import { FilterChip, GridToolbar } from "@/components/GridToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DynamicFormDialog } from "@/components/DynamicForm";
import { IconBtn } from "@/routes/_authenticated/workers";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectField, TextField } from "@/components/FormFields";
import {
  LOCATIONS,
  NATIONALITIES,
  PASSPORT_HOLDERS,
  PAYMENT_STATUSES,
  TRANSFER_STAGES,
  TRANSFER_TYPES,
  TRANSFER_TYPE_OTHER,
  VISA_TYPES,
  YES_NO_EXISTS,
  YES_NO_EXISTS_F,
  errorMessage,
  formatDate,
  formatDateTime,
  formatMoney,
  profileNameMap,
  profilesQuery,
} from "@/lib/data";

type MT = Tables<"manual_transfers">;
type Category = "منزلية" | "مهنية";

const manualTransfersQuery = queryOptions({
  queryKey: ["manual_transfers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("manual_transfers")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

const today = () => new Date().toISOString().slice(0, 10);
function addDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const empty = () => ({
  worker_name: "",
  passport_number: "",
  nationality: "",
  visa_number: "",
  old_sponsor_name: "",
  old_sponsor_phone: "",
  new_sponsor_name: "",
  new_sponsor_phone: "",
  visa_type: VISA_TYPES[0] as string,
  transfer_type: TRANSFER_TYPES[0] as string,
  transfer_stage: TRANSFER_STAGES[0] as string,
  transfer_date: "",
  period_start: today(),
  return_to_office_date: "",
  old_sponsor_dues: "0",
  down_payment: "0",
  other_payments: "0",
  payment_status: PAYMENT_STATUSES[0] as string,
  medical_exam: YES_NO_EXISTS[1] as string,
  residency_status: YES_NO_EXISTS_F[1] as string,
  residency_number: "",
  salary_dues_status: YES_NO_EXISTS_F[1] as string,
  salary_dues_amount: "0",
  worker_condition: "",
  worker_location: LOCATIONS[0] as string,
  passport_holder: "المكتب",
});
type Form = ReturnType<typeof empty>;

export function ManualTransfersView({ category }: { category: Category }) {
  const auth = useAuth();
  const admin = auth.isAdmin;
  const qc = useQueryClient();
  const { data: all = [], isLoading } = useQuery(manualTransfersQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);
  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState<string | null>(null);
  const [natFilter, setNatFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MT | null>(null);
  const [deleting, setDeleting] = useState<MT | null>(null);
  const [viewing, setViewing] = useState<MT | null>(null);

  const mine = useMemo(() => all.filter((t) => t.category === category), [all, category]);
  const nationalityOptions = useMemo(
    () => [...new Set([...NATIONALITIES, ...all.map((t) => t.nationality.trim()).filter(Boolean)])].sort((a, b) =>
      a === "أخرى" ? 1 : b === "أخرى" ? -1 : a.localeCompare(b, "ar"),
    ),
    [all],
  );
  const nationalities = useMemo(
    () => [...new Set(mine.map((t) => t.nationality.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar")),
    [mine],
  );
  const rows = useMemo(
    () =>
      mine
        .filter((r) => (payFilter ? r.payment_status === payFilter : true))
        .filter((r) => (natFilter ? r.nationality.trim() === natFilter : true)),
    [mine, payFilter, natFilter],
  );

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manual_transfers").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manual_transfers"] });
      toast.success("تم حذف عملية النقل");
      setDeleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns = useMemo<ColumnDef<MT, unknown>[]>(() => {
    const txt = (id: keyof MT, header: string, ltr = false): ColumnDef<MT, unknown> => ({
      id,
      accessorKey: id,
      header,
      meta: ltr ? { ltr: true, className: "tabular-nums" } : {},
      cell: ({ getValue }) => (getValue() as string) || "—",
    });
    const badge = (id: keyof MT, header: string): ColumnDef<MT, unknown> => ({
      id,
      accessorKey: id,
      header,
      cell: ({ getValue }) => ((getValue() as string) ? <StatusBadge value={getValue() as string} /> : "—"),
    });
    const date = (id: keyof MT, header: string): ColumnDef<MT, unknown> => ({
      id,
      accessorKey: id,
      header,
      meta: { ltr: true, className: "tabular-nums" },
      cell: ({ getValue }) => formatDate(getValue() as string | null),
    });
    const money = (id: keyof MT, header: string): ColumnDef<MT, unknown> => ({
      id,
      accessorKey: id,
      header,
      meta: { ltr: true, className: "tabular-nums" },
      cell: ({ getValue }) => formatMoney(Number(getValue() ?? 0)),
    });
    return [
      { ...txt("worker_name", "اسم العاملة"), meta: { width: 160 } },
      txt("passport_number", "رقم الجواز", true),
      txt("nationality", "الجنسية"),
      {
        id: "old_sponsor_name",
        accessorKey: "old_sponsor_name",
        header: "الكفيل القديم",
        cell: ({ row }) => (
          <div className="leading-tight">
            <div>{row.original.old_sponsor_name || "—"}</div>
            <div className="text-[11px] text-ink/45 tabular-nums" dir="ltr">{row.original.old_sponsor_phone}</div>
          </div>
        ),
      },
      {
        id: "new_sponsor_name",
        accessorKey: "new_sponsor_name",
        header: "الكفيل الجديد",
        cell: ({ row }) => (
          <div className="leading-tight">
            <div>{row.original.new_sponsor_name || "—"}</div>
            <div className="text-[11px] text-ink/45 tabular-nums" dir="ltr">{row.original.new_sponsor_phone}</div>
          </div>
        ),
      },
      txt("visa_type", "نوع التأشيرة"),
      txt("visa_number", "رقم التأشيرة", true),
      badge("transfer_type", "نوع النقل"),
      date("transfer_date", "تاريخ النقل"),
      badge("transfer_stage", "حالة النقل"),
      date("return_to_office_date", "تاريخ رجوع العاملة المكتب"),
      badge("worker_location", "موقع العاملة"),
      money("old_sponsor_dues", "مستحقات القديم"),
      money("down_payment", "العربون"),
      money("other_payments", "مدفوعات أخرى"),
      {
        id: "remaining_amount",
        accessorKey: "remaining_amount",
        header: "المتبقي",
        meta: { ltr: true, className: "tabular-nums" },
        cell: ({ getValue }) => {
          const v = Number(getValue() ?? 0);
          return <span className={`font-semibold ${v > 0 ? "text-terracotta" : "text-success"}`}>{formatMoney(v)}</span>;
        },
      },
      badge("payment_status", "حالة الدفع"),
      badge("medical_exam", "الفحص الطبي"),
      badge("residency_status", "الإقامة"),
      txt("residency_number", "رقم الإقامة", true),
      badge("salary_dues_status", "مستحقات الرواتب"),
      money("salary_dues_amount", "قيمة مستحقات الرواتب"),
      txt("passport_holder", "الجواز لدى"),
      {
        id: "worker_condition",
        accessorKey: "worker_condition",
        header: "ملاحظات حالة العاملة",
        cell: ({ getValue }) => <span className="line-clamp-1 max-w-[220px] text-ink/70">{(getValue() as string) || "—"}</span>,
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
    ];
  }, [nameOf]);

  const title = category === "مهنية" ? "نقل الكفالة المهنية" : "نقل كفالة العمالة المنزلية";

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <GridToolbar
        title={`${title} (إدخال يدوي)`}
        count={rows.length}
        search={search}
        onSearch={setSearch}
        addLabel="نقل كفالة جديد"
        onAdd={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        filters={
          <>
            <FilterChip active={payFilter === null} onClick={() => setPayFilter(null)}>الكل</FilterChip>
            {PAYMENT_STATUSES.map((s) => (
              <FilterChip key={s} active={payFilter === s} onClick={() => setPayFilter(s)}>{s}</FilterChip>
            ))}
            <span className="mx-1 hidden h-4 w-px bg-black/10 sm:inline-block" />
            <FilterChip active={natFilter === null} onClick={() => setNatFilter(null)}>كل الجنسيات</FilterChip>
            {nationalities.map((n) => (
              <FilterChip key={n} active={natFilter === n} onClick={() => setNatFilter(natFilter === n ? null : n)}>{n}</FilterChip>
            ))}
          </>
        }
      />
      {isLoading ? (
        <div className="glass h-64 animate-pulse rounded-2xl" />
      ) : (
        <DataGrid
          gridKey="manual_transfers"
          data={rows}
          columns={columns}
          search={search}
          emptyMessage="لا توجد عمليات نقل كفالة بعد"
          onRowClick={(t) => setViewing(t)}
          rowActions={(t) => (
            <>
              <IconBtn title="تعديل" onClick={() => { setEditing(t); setFormOpen(true); }}>
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
      <DynamicFormDialog
        formKey={category === "مهنية" ? "manual_pro" : "manual_domestic"}
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing as (Record<string, unknown> & { id: string }) | null}
        title={`${editing ? "تعديل عملية نقل الكفالة" : "نقل كفالة جديد"} ${category === "مهنية" ? "(مهنية)" : "(عمالة منزلية)"}`}
        queryKey={["manual_transfers"]}
        successText="تم تسجيل نقل الكفالة"
      />
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف عملية النقل؟"
        description={`سيتم حذف عملية نقل كفالة "${deleting?.worker_name ?? ""}".`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
      <ManualTransferDetails
        record={viewing}
        onClose={() => setViewing(null)}
        onEdit={(t) => {
          setViewing(null);
          setEditing(t);
          setFormOpen(true);
        }}
      />
    </main>
  );
}

function DetailRow({ label, value, ltr }: { label: string; value: ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/5 py-1.5 text-[13px] last:border-b-0">
      <span className="text-ink/50">{label}</span>
      <span className={`font-medium ${ltr ? "tabular-nums" : ""}`} dir={ltr ? "ltr" : undefined}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass rounded-xl p-4">
      <h4 className="mb-2 text-[11px] font-semibold text-ink/50">{title}</h4>
      {children}
    </section>
  );
}

function ManualTransferDetails({
  record,
  onClose,
  onEdit,
}: {
  record: MT | null;
  onClose: () => void;
  onEdit: (t: MT) => void;
}) {
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);
  const remaining = Number(record?.remaining_amount ?? 0);
  return (
    <Dialog open={Boolean(record)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        {record && (
          <>
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="flex items-center gap-2">
                {record.worker_name || "—"}
                <StatusBadge value={record.transfer_stage} />
              </DialogTitle>
              <DialogDescription>تفاصيل عملية نقل الكفالة</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <Section title="بيانات العملية">
                <DetailRow label="اسم العاملة" value={record.worker_name || "—"} />
                <DetailRow label="رقم الجواز" value={record.passport_number || "—"} ltr />
                <DetailRow label="الجنسية" value={record.nationality || "—"} />
                <DetailRow label="نوع التأشيرة" value={record.visa_type || "—"} />
                <DetailRow label="رقم التأشيرة" value={record.visa_number || "—"} ltr />
                <DetailRow label="نوع النقل" value={<StatusBadge value={record.transfer_type} />} />
                <DetailRow label="تاريخ النقل" value={formatDate(record.transfer_date)} ltr />
                <DetailRow label="بداية الفترة" value={formatDate(record.period_start)} ltr />
                <DetailRow label="نهاية الفترة" value={formatDate(record.period_end)} ltr />
                <DetailRow label="تاريخ رجوع العاملة المكتب" value={formatDate(record.return_to_office_date)} ltr />
                <DetailRow label="الجواز لدى" value={record.passport_holder || "—"} />
              </Section>

              <div className="space-y-4">
                <Section title="الكفيل القديم">
                  <DetailRow label="الاسم" value={record.old_sponsor_name || "—"} />
                  <DetailRow label="الهاتف" value={record.old_sponsor_phone || "—"} ltr />
                </Section>
                <Section title="الكفيل الجديد">
                  <DetailRow label="الاسم" value={record.new_sponsor_name || "—"} />
                  <DetailRow label="الهاتف" value={record.new_sponsor_phone || "—"} ltr />
                </Section>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Section title="المالية">
                <DetailRow label="مستحقات الكفيل القديم" value={formatMoney(record.old_sponsor_dues)} ltr />
                <DetailRow label="العربون" value={formatMoney(record.down_payment)} ltr />
                <DetailRow label="مدفوعات أخرى" value={formatMoney(record.other_payments)} ltr />
                <DetailRow
                  label="المتبقي"
                  value={
                    <span className={`font-semibold ${remaining > 0 ? "text-terracotta" : "text-success"}`}>
                      {formatMoney(remaining)}
                    </span>
                  }
                  ltr
                />
                <DetailRow label="حالة الدفع" value={<StatusBadge value={record.payment_status} />} />
                <DetailRow
                  label="مستحقات الرواتب"
                  value={
                    <span className="flex items-center gap-2">
                      <StatusBadge value={record.salary_dues_status} />
                      {record.salary_dues_status === "توجد" && (
                        <span className="tabular-nums" dir="ltr">{formatMoney(record.salary_dues_amount)}</span>
                      )}
                    </span>
                  }
                />
              </Section>

              <Section title="حالة العاملة">
                <DetailRow label="الفحص الطبي" value={<StatusBadge value={record.medical_exam} />} />
                <DetailRow label="الإقامة" value={<StatusBadge value={record.residency_status} />} />
                {record.residency_status === "توجد" && (
                  <DetailRow label="رقم الإقامة" value={record.residency_number || "—"} ltr />
                )}
                <DetailRow label="موقع العاملة" value={<StatusBadge value={record.worker_location} />} />
                <DetailRow label="ملاحظات حالة العاملة" value={record.worker_condition || "—"} />
                {record.notes && <DetailRow label="ملاحظات" value={record.notes} />}
              </Section>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Section title="سجل التدقيق">
                <DetailRow label="تم الإضافة بواسطة" value={nameOf(record.created_by) || "—"} />
                <DetailRow label="تاريخ الإضافة" value={formatDateTime(record.created_at)} ltr />
                <DetailRow label="آخر تعديل بواسطة" value={nameOf(record.updated_by) || "—"} />
                <DetailRow label="تاريخ آخر تعديل" value={formatDateTime(record.updated_at)} ltr />
              </Section>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={() => onEdit(record)}
                  className="w-full"
                >
                  تعديل البيانات
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
