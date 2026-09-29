import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { DataGrid } from "@/components/DataGrid";
import { FilterChip, GridToolbar } from "@/components/GridToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDelete } from "@/components/ConfirmDelete";
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
  payment_status: PAYMENT_STATUSES[1] as string,
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
      date("return_to_office_date", "تاريخ رجوعها المكتب"),
      badge("worker_location", "موقع العاملة"),
      money("old_sponsor_dues", "مستحقات القديم"),
      money("down_payment", "العربون"),
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
      <ManualTransferDialog open={formOpen} onOpenChange={setFormOpen} transfer={editing} category={category} />
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف عملية النقل؟"
        description={`سيتم حذف عملية نقل كفالة "${deleting?.worker_name ?? ""}".`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </main>
  );
}

function ManualTransferDialog({
  open, onOpenChange, transfer, category,
}: { open: boolean; onOpenChange: (o: boolean) => void; transfer: MT | null; category: Category }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(empty);

  useEffect(() => {
    if (!open) return;
    if (!transfer) return setForm(empty());
    const f = empty();
    const next = { ...f } as Record<string, string>;
    for (const k of Object.keys(f)) {
      const v = (transfer as Record<string, unknown>)[k];
      next[k] = v == null ? "" : String(v);
    }
    setForm(next as Form);
  }, [open, transfer]);

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setAmount = (k: "old_sponsor_dues" | "down_payment") => (v: string) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      const left = Number(next.old_sponsor_dues || 0) - Number(next.down_payment || 0);
      return { ...next, payment_status: left > 0 ? PAYMENT_STATUSES[1] : PAYMENT_STATUSES[0] };
    });

  const remaining = Number(form.old_sponsor_dues || 0) - Number(form.down_payment || 0);
  const needsPeriod = form.transfer_type !== TRANSFER_TYPE_OTHER;
  const hasResidency = form.residency_status !== YES_NO_EXISTS_F[1];

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        category,
        worker_name: form.worker_name.trim(),
        passport_number: form.passport_number.trim(),
        nationality: form.nationality.trim(),
        visa_number: form.visa_number.trim(),
        old_sponsor_name: form.old_sponsor_name.trim(),
        old_sponsor_phone: form.old_sponsor_phone.trim(),
        new_sponsor_name: form.new_sponsor_name.trim(),
        new_sponsor_phone: form.new_sponsor_phone.trim(),
        visa_type: form.visa_type,
        transfer_type: form.transfer_type,
        transfer_stage: form.transfer_stage,
        transfer_date: form.transfer_date || null,
        period_start: needsPeriod ? form.period_start || null : null,
        period_end: needsPeriod && form.period_start ? addDays(form.period_start, 10) : null,
        return_to_office_date: form.return_to_office_date || null,
        old_sponsor_dues: Number(form.old_sponsor_dues || 0),
        down_payment: Number(form.down_payment || 0),
        payment_status: form.payment_status,
        medical_exam: form.medical_exam,
        residency_status: form.residency_status,
        residency_number: hasResidency ? form.residency_number.trim() : "",
        salary_dues_status: form.salary_dues_status,
        salary_dues_amount: Number(form.salary_dues_amount || 0),
        worker_condition: form.worker_condition.trim(),
        worker_location: form.worker_location,
        passport_holder: form.passport_holder,
      };
      const { error } = transfer
        ? await supabase.from("manual_transfers").update(body).eq("id", transfer.id)
        : await supabase.from("manual_transfers").insert(body);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(transfer ? "تم حفظ التعديلات" : "تم تسجيل نقل الكفالة");
      qc.invalidateQueries({ queryKey: ["manual_transfers"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>
            {transfer ? "تعديل عملية نقل الكفالة" : "نقل كفالة جديد"} {category === "مهنية" ? "(مهنية)" : "(عمالة منزلية)"}
          </DialogTitle>
          <DialogDescription>كل الخانات اختيارية — اكتب المتوفر فقط. المتبقي يُحسب تلقائياً.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <TextField label="اسم العاملة" value={form.worker_name} onChange={set("worker_name")} />
          <TextField label="رقم الجواز" ltr value={form.passport_number} onChange={set("passport_number")} />
          <TextField label="الجنسية" value={form.nationality} onChange={set("nationality")} />
          <TextField label="اسم الكفيل القديم" value={form.old_sponsor_name} onChange={set("old_sponsor_name")} />
          <TextField label="هاتف الكفيل القديم" ltr value={form.old_sponsor_phone} onChange={set("old_sponsor_phone")} />
          <div className="hidden sm:block" />
          <TextField label="اسم الكفيل الجديد" value={form.new_sponsor_name} onChange={set("new_sponsor_name")} />
          <TextField label="هاتف الكفيل الجديد" ltr value={form.new_sponsor_phone} onChange={set("new_sponsor_phone")} />
          <div className="hidden sm:block" />
          <SelectField label="نوع التأشيرة" value={form.visa_type} onChange={set("visa_type")} options={VISA_TYPES} />
          <TextField label="رقم التأشيرة" ltr value={form.visa_number} onChange={set("visa_number")} />
          <SelectField label="نوع النقل" value={form.transfer_type} onChange={set("transfer_type")} options={TRANSFER_TYPES} />
          {needsPeriod && (
            <>
              <TextField label="تاريخ بداية التجربة" type="date" ltr value={form.period_start} onChange={set("period_start")} />
              <TextField label="تاريخ انتهاء التجربة (تلقائي: 10 أيام)" type="date" ltr value={form.period_start ? addDays(form.period_start, 10) : ""} onChange={() => {}} disabled />
            </>
          )}
          <SelectField label="حالة النقل" value={form.transfer_stage} onChange={set("transfer_stage")} options={TRANSFER_STAGES} />
          <TextField label="تاريخ النقل" type="date" ltr value={form.transfer_date} onChange={set("transfer_date")} />
          <TextField label="تاريخ رجوعها المكتب" type="date" ltr value={form.return_to_office_date} onChange={set("return_to_office_date")} />
          <SelectField label="موقع العاملة" value={form.worker_location} onChange={set("worker_location")} options={LOCATIONS} />
          <SelectField label="الجواز لدى" value={form.passport_holder} onChange={set("passport_holder")} options={PASSPORT_HOLDERS} />
          <TextField label="مستحقات الكفيل القديم" type="number" ltr value={form.old_sponsor_dues} onChange={setAmount("old_sponsor_dues")} />
          <TextField label="العربون" type="number" ltr value={form.down_payment} onChange={setAmount("down_payment")} />
          <Field label="المتبقي (تلقائي)">
            <div
              className={`flex h-9 items-center rounded-md border border-dashed px-3 text-sm font-semibold tabular-nums ${remaining > 0 ? "border-terracotta/40 text-terracotta" : "border-success/40 text-success"}`}
              dir="ltr"
            >
              {formatMoney(remaining)}
            </div>
          </Field>
          <SelectField label="حالة الدفع" value={form.payment_status} onChange={set("payment_status")} options={PAYMENT_STATUSES} />
          <SelectField label="الفحص الطبي" value={form.medical_exam} onChange={set("medical_exam")} options={YES_NO_EXISTS} />
          <SelectField label="الإقامة" value={form.residency_status} onChange={set("residency_status")} options={YES_NO_EXISTS_F} />
          {hasResidency && (
            <TextField label="رقم الإقامة (اختياري)" ltr value={form.residency_number} onChange={set("residency_number")} />
          )}
          <SelectField label="مستحقات رواتب العاملة" value={form.salary_dues_status} onChange={set("salary_dues_status")} options={YES_NO_EXISTS_F} />
          <TextField label="قيمة مستحقات الرواتب" type="number" ltr value={form.salary_dues_amount} onChange={set("salary_dues_amount")} />
          <Field label="ملاحظات حالة العاملة" className="sm:col-span-3">
            <Textarea rows={2} value={form.worker_condition} onChange={(e) => set("worker_condition")(e.target.value)} />
          </Field>
          <DialogFooter className="sm:col-span-3 sm:justify-start">
            <Button type="submit" disabled={save.isPending}>{transfer ? "حفظ" : "تسجيل النقل"}</Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
