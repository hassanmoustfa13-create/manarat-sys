import { SponsorHistory, setArchived } from "@/components/SponsorHistory";
import { Archive } from "lucide-react";
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
import { formsQuery } from "@/lib/forms";
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
      .is("archived_at", null)
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
  const permRes = category === "مهنية" ? "manual_transfers_pro" : "manual_transfers";
  const canAdd = auth.can(permRes, "add");
  const canEdit = auth.can(permRes, "edit");
  const canDel = auth.can(permRes, "delete");
  const canImport = auth.can(permRes, "import");
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
  const [archiving, setArchiving] = useState<MT | null>(null);
  const archive = useMutation({
    mutationFn: (id: string) => setArchived("manual_transfers", id, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manual_transfers"] });
      qc.invalidateQueries({ queryKey: ["archive"] });
      toast.success("تمت أرشفة العملية");
      setArchiving(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

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
      badge("payment_status", "حالة دفع القديم"),
      money("new_sponsor_dues", "مستحقات المكتب من الجديد"),
      badge("new_sponsor_payment_status", "حالة دفع الجديد"),
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
        onAdd={canAdd ? () => {
          setEditing(null);
          setFormOpen(true);
        } : undefined}
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
              {canEdit && (<IconBtn title="تعديل" onClick={() => { setEditing(t); setFormOpen(true); }}>
                <Pencil className="size-3.5" />
              </IconBtn>)}
              {canEdit && t.transfer_stage === "تم النقل" && (
                <IconBtn title="أرشفة العملية" onClick={() => setArchiving(t)}>
                  <Archive className="size-3.5" />
                </IconBtn>
              )}
              {canDel && (
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
      <ConfirmDelete
        open={Boolean(archiving)}
        onOpenChange={(o) => !o && setArchiving(null)}
        title="أرشفة عملية النقل؟"
        description={`ستنتقل عملية "${archiving?.worker_name ?? ""}" إلى صفحة الأرشيف ويمكن استرجاعها لاحقًا.`}
        confirmLabel="نعم، أرشف"
        pending={archive.isPending}
        onConfirm={() => archiving && archive.mutate(archiving.id)}
      />
      <ManualTransferDetails
        record={viewing}
        onClose={() => setViewing(null)}
        onSaved={(f, v) => setViewing((cur) => (cur ? { ...cur, [f]: v } : cur))}
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

/** صف تفاصيل قابل للتعديل المباشر (للمدير فقط): قائمة منسدلة تُحفظ فور الاختيار. */
function EditableSelectRow({
  label,
  field,
  value,
  options,
  record,
  onSaved,
}: {
  label: string;
  field: keyof MT;
  value: string;
  options: readonly string[];
  record: MT;
  onSaved: (field: keyof MT, value: string) => void;
}) {
  const auth = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data: forms } = useQuery(formsQuery);
  // نفس خيارات نموذج الإضافة في «إدارة النماذج»، وإلا القائمة الافتراضية
  const formKey = record.category === "مهنية" ? "manual_pro" : "manual_domestic";
  const formField = forms
    ?.find((f) => f.form_key === formKey)
    ?.form_fields.find((x) => x.column_name === field || x.field_key === field);
  const dbOptions = formField?.form_field_options.filter((o) => o.is_active).map((o) => o.value) ?? [];
  const base: readonly string[] = dbOptions.length ? dbOptions : options;
  const res = record.category === "مهنية" ? "manual_transfers_pro" : "manual_transfers";
  if (!(auth.can(res, "quick_edit") && auth.can(res, "edit"))) return <DetailRow label={label} value={<StatusBadge value={value} />} />;
  const list = value && !base.includes(value) ? [value, ...base] : base;
  const save = async (v: string) => {
    if (v === value) return;
    setSaving(true);
    const { error } = await supabase
      .from("manual_transfers")
      .update({ [field]: v } as never)
      .eq("id", record.id);
    setSaving(false);
    if (error) toast.error(errorMessage(error));
    else {
      toast.success("تم الحفظ");
      onSaved(field, v);
      qc.invalidateQueries({ queryKey: ["manual_transfers"] });
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/5 py-1.5 text-[13px] last:border-b-0">
      <span className="text-ink/50">{label}</span>
      <select
        value={value}
        disabled={saving}
        onChange={(e) => void save(e.target.value)}
        className="max-w-[60%] rounded-md bg-white/70 px-1.5 py-1 text-[13px] font-medium ring-1 ring-black/10 focus:ring-brand disabled:opacity-50"
      >
        {!value && <option value="">—</option>}
        {list.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
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
  onSaved,
}: {
  record: MT | null;
  onClose: () => void;
  onEdit: (t: MT) => void;
  onSaved: (field: keyof MT, value: string) => void;
}) {
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);
  return (
    <Dialog open={Boolean(record)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                <EditableSelectRow label="الجنسية" field="nationality" value={record.nationality} options={NATIONALITIES} record={record} onSaved={onSaved} />
                <EditableSelectRow label="نوع التأشيرة" field="visa_type" value={record.visa_type} options={VISA_TYPES} record={record} onSaved={onSaved} />
                <DetailRow label="رقم التأشيرة" value={record.visa_number || "—"} ltr />
                <EditableSelectRow label="نوع النقل" field="transfer_type" value={record.transfer_type} options={TRANSFER_TYPES} record={record} onSaved={onSaved} />
                <EditableSelectRow label="حالة النقل" field="transfer_stage" value={record.transfer_stage} options={TRANSFER_STAGES} record={record} onSaved={onSaved} />
                <DetailRow label="تاريخ النقل" value={formatDate(record.transfer_date)} ltr />
                <DetailRow label="بداية الفترة" value={formatDate(record.period_start)} ltr />
                <DetailRow label="نهاية الفترة" value={formatDate(record.period_end)} ltr />
                <DetailRow label="تاريخ رجوع العاملة المكتب" value={formatDate(record.return_to_office_date)} ltr />
                <EditableSelectRow label="الجواز لدى" field="passport_holder" value={record.passport_holder} options={PASSPORT_HOLDERS} record={record} onSaved={onSaved} />
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
                <EditableSelectRow label="حالة الدفع للكفيل القديم" field="payment_status" value={record.payment_status} options={PAYMENT_STATUSES} record={record} onSaved={onSaved} />
                <DetailRow label="مستحقات المكتب من الكفيل الجديد" value={formatMoney((record as any).new_sponsor_dues)} ltr />
                <DetailRow label="العربون (من الكفيل الجديد)" value={formatMoney(record.down_payment)} ltr />
                <EditableSelectRow label="حالة دفع الكفيل الجديد" field={"new_sponsor_payment_status" as any} value={(record as any).new_sponsor_payment_status} options={PAYMENT_STATUSES} record={record} onSaved={onSaved} />
                <EditableSelectRow label="مستحقات الرواتب" field="salary_dues_status" value={record.salary_dues_status} options={YES_NO_EXISTS_F} record={record} onSaved={onSaved} />
                {record.salary_dues_status === "توجد" && (
                  <DetailRow label="قيمة مستحقات الرواتب" value={formatMoney(record.salary_dues_amount)} ltr />
                )}
              </Section>

              <Section title="حالة العاملة">
                <EditableSelectRow label="الفحص الطبي" field="medical_exam" value={record.medical_exam} options={YES_NO_EXISTS} record={record} onSaved={onSaved} />
                <EditableSelectRow label="الإقامة" field="residency_status" value={record.residency_status} options={YES_NO_EXISTS_F} record={record} onSaved={onSaved} />
                {record.residency_status === "توجد" && (
                  <DetailRow label="رقم الإقامة" value={record.residency_number || "—"} ltr />
                )}
                <EditableSelectRow label="موقع العاملة" field="worker_location" value={record.worker_location} options={LOCATIONS} record={record} onSaved={onSaved} />
                <DetailRow label="ملاحظات حالة العاملة" value={record.worker_condition || "—"} />
                {record.notes && <DetailRow label="ملاحظات" value={record.notes} />}
              </Section>
            </div>

            <SponsorHistory
              transferId={record.id}
              source="manual_transfers"
              current={{ name: record.new_sponsor_name, phone: record.new_sponsor_phone, since: record.transfer_date, createdAt: record.created_at, salaryStatus: record.salary_dues_status, salaryAmount: Number(record.salary_dues_amount) }}
            />

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
