import { SponsorHistory, setArchived } from "@/components/SponsorHistory";
import { Archive } from "lucide-react";
import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { DataGrid } from "@/components/DataGrid";
import { FilterChip, GridToolbar } from "@/components/GridToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DynamicFormDialog } from "@/components/DynamicForm";
import { type DetailStyle, activeFields, detailBlockOrder, detailGroups, detailSectionKey, DETAIL_ACTION, DETAIL_AUDIT, DETAIL_HISTORY, formsQuery, type FormDef, type FormField } from "@/lib/forms";
import { gridSettingsQuery } from "@/lib/gridSettings";
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
  VISA_TYPES,
  YES_NO_EXISTS,
  YES_NO_EXISTS_F,
  daysInSaudi,
  errorMessage,
  formatDate,
  formatDateTime,
  formatDaysInSaudi,
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
  const { data: gridSettings } = useQuery(gridSettingsQuery);
  const archiveConds =
    gridSettings?.manual_transfers?.archiveConditions ??
    (gridSettings?.manual_transfers?.archiveCondition
      ? [gridSettings.manual_transfers.archiveCondition]
      : []);
  // زر الأرشفة يظهر عند تحقق أي شرط من الشروط المحددة في إعدادات الجداول؛ بلا شروط: الافتراضي مرحلة النقل = «تم النقل»
  const canArchiveRow = (t: MT) => {
    if (archiveConds.length === 0) return t.transfer_stage === "تم النقل";
    return archiveConds.some((cond) => {
      if (!cond.column) return false;
      const col = cond.column;
      const raw = col.startsWith("extra_")
        ? (t.extra as Record<string, unknown> | null)?.[col.slice(6)]
        : (t as unknown as Record<string, unknown>)[col];
      return String(raw ?? "") === cond.value;
    });
  };
  const canImport = auth.can(permRes, "import");
  const qc = useQueryClient();
  const { data: all = [], isLoading } = useQuery(manualTransfersQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);
  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState<string | null>(null);
  const [natFilter, setNatFilter] = useState<string | null>(null);
  const [locFilter, setLocFilter] = useState<string | null>(null);

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
  // مواقع العاملة الموجودة فعليًا في السجلات، بنفس ترتيب القائمة المنسدلة مع «أخرى» في الآخر
  const locations = useMemo(
    () =>
      [...new Set(mine.map((t) => (t.worker_location ?? "").trim()).filter(Boolean))].sort((a, b) =>
        a === "أخرى" ? 1 : b === "أخرى" ? -1 : a.localeCompare(b, "ar"),
      ),
    [mine],
  );
  const rows = useMemo(
    () =>
      mine
        .filter((r) => (payFilter ? r.payment_status === payFilter : true))
        .filter((r) => (natFilter ? r.nationality.trim() === natFilter : true))
        .filter((r) => (locFilter ? (r.worker_location ?? "").trim() === locFilter : true)),
    [mine, payFilter, natFilter, locFilter],
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
      cell: ({ getValue }) => (getValue() as string) || "—",
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
      {
        id: "days_in_saudi",
        accessorFn: (r) => daysInSaudi(r.saudi_entry_date ?? null),
        header: "أيام العاملة في السعودية",
        meta: { ltr: true, className: "tabular-nums" },
        cell: ({ row }) => formatDaysInSaudi(daysInSaudi(row.original.saudi_entry_date ?? null)),
      },
      badge("worker_location", "موقع العاملة"),
      money("old_sponsor_dues", "مستحقات القديم"),
      money("down_payment", "العربون"),
      badge("payment_status", "حالة دفع القديم"),
      money("new_sponsor_dues", "مستحقات المكتب من الجديد"),
      money("new_sponsor_other_payments", "مدفوعات أخرى للجديد"),
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
        cell: ({ getValue }) => <FitCellText value={(getValue() as string) || "—"} />,
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
            <span className="mx-1 hidden h-4 w-px bg-black/10 sm:inline-block" />
            <select
              value={locFilter ?? ""}
              onChange={(e) => setLocFilter(e.target.value || null)}
              aria-label="فلترة حسب موقع العاملة"
              className="glass h-7 rounded-lg border-0 px-2 text-[12px] text-ink/70 outline-none ring-1 ring-black/8 focus:ring-2 focus:ring-brand/30"
            >
              <option value="">موقع العاملة: الكل</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </>

        }
      />
      {isLoading ? (
        <div className="glass h-64 animate-pulse rounded-2xl" />
      ) : (
        <DataGrid
          gridKey="manual_transfers"
          formKeys={[category === "مهنية" ? "manual_pro" : "manual_domestic"]}
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
              {canEdit && canArchiveRow(t) && (
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
        record={all.find((t) => t.id === viewing?.id) ?? viewing}
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

/** خلية ملاحظات حالة العاملة: النص يلتف على حتى 3 أسطر، ويُصغَّر الخط تلقائيًا فقط إذا احتاج أكثر من ذلك. */
function FitCellText({ value }: { value: string }) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontPx, setFontPx] = useState<number | null>(null);
  const MAX_LINES = 3;
  const MIN_FONT = 8;

  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const fit = () => {
      const cs = getComputedStyle(text);
      const base = parseFloat(cs.fontSize);
      const lineH = parseFloat(cs.lineHeight) || base * 1.4;
      const maxH = lineH * MAX_LINES;
      let size = base;
      text.style.fontSize = base + "px";
      while (text.scrollHeight > maxH && size > MIN_FONT) {
        size -= 0.5;
        text.style.fontSize = size + "px";
      }
      setFontPx(size);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [value]);

  return (
    <span
      ref={boxRef}
      className="block max-w-[220px] text-black"
      style={{ fontSize: fontPx ? `${fontPx}px` : undefined }}
    >
      <span ref={textRef} className="block">
        {value}
      </span>
    </span>
  );
}

const DetailStyleCtx = createContext<DetailStyle>({});
function DetailRow({ label, value, ltr }: { label: string; value: ReactNode; ltr?: boolean }) {
  const st = useContext(DetailStyleCtx);
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/5 py-1.5 text-[13px] last:border-b-0" style={{ fontSize: st.fontPx, borderColor: st.lineColor }}>
      <span className="text-ink/50" style={{ color: st.labelColor, fontWeight: st.labelBold ? 700 : undefined }}>{label}</span>
      <span className={`font-medium ${ltr ? "tabular-nums" : ""}`} dir={ltr ? "ltr" : undefined} style={{ color: st.valueColor, fontWeight: st.valueBold === undefined ? undefined : st.valueBold ? 700 : 400 }}>
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

/** القوائم الافتراضية لحقول نافذة التفاصيل (تُستبدل بخيارات نموذج الإضافة عند وجودها). */
const DETAIL_SELECT_OPTIONS: Record<string, readonly string[]> = {
  nationality: NATIONALITIES,
  visa_type: VISA_TYPES,
  transfer_type: TRANSFER_TYPES,
  transfer_stage: TRANSFER_STAGES,
  passport_holder: PASSPORT_HOLDERS,
  payment_status: PAYMENT_STATUSES,
  salary_dues_status: YES_NO_EXISTS_F,
  medical_exam: YES_NO_EXISTS,
  residency_status: YES_NO_EXISTS_F,
  worker_location: LOCATIONS,
};

/** تجميع حقول نموذج التفاصيل حسب القسم مع الحفاظ على الترتيب. */
function detailSections(form: FormDef): [string, FormField[]][] {
  const map = new Map<string, FormField[]>();
  for (const f of activeFields(form)) {
    const sec = f.section || "بيانات العملية";
    if (!map.has(sec)) map.set(sec, []);
    map.get(sec)?.push(f);
  }
  return [...map.entries()];
}

/** صف واحد في نافذة التفاصيل يُبنى من تعريف الحقل في «إدارة النماذج». */
function DetailFieldRow({
  field,
  record,
  onSaved,
}: {
  field: FormField;
  record: MT;
  onSaved: (field: keyof MT, value: string) => void;
}) {
  const key = field.column_name ?? field.field_key;
  const rec = record as unknown as Record<string, unknown>;
  const valueFromRecord = field.column_name
    ? rec[key]
    : (record.extra as Record<string, unknown> | null)?.[field.field_key];
  const c = field.conditions;
  if (c?.field) {
    const v = String(rec[c.field] ?? (record.extra as Record<string, unknown> | null)?.[c.field] ?? "");
    const ok = c.op === "eq" ? v === (c.value ?? "") : v !== (c.value ?? "");
    if (!ok) return null;
  }
   if (field.field_type === "select" && field.column_name) {
    return (
      <EditableSelectRow
        label={field.label}
        field={key as keyof MT}
         value={String(valueFromRecord ?? "")}
        options={DETAIL_SELECT_OPTIONS[key] ?? []}
        record={record}
        onSaved={onSaved}
      />
    );
  }
  let value: ReactNode;
  if (key === "days_in_saudi") value = formatDaysInSaudi(daysInSaudi((rec["saudi_entry_date"] as string | null) ?? null));
   else if (field.field_type === "date") value = formatDate(valueFromRecord as string | null);
   else if (field.field_type === "currency") value = formatMoney(Number(valueFromRecord ?? 0));
   else value = String(valueFromRecord ?? "") || "—";
  return <DetailRow label={field.label} value={value} ltr={field.settings?.ltr ?? false} />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const st = useContext(DetailStyleCtx);
  return (
    <section className="glass rounded-xl p-4" style={{ background: st.sectionBg, padding: st.padding, fontFamily: st.fontFamily || undefined }}>
      <h4 className="mb-2 text-[11px] font-semibold text-ink/50" style={{ color: st.titleColor, fontSize: st.titleSize }}>{title}</h4>
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
  const { data: forms, isPending: formsPending, isError: formsError, refetch: refetchForms } = useQuery(formsQuery);
  const detailForm = forms?.find((f) => f.form_key === "transfer_details" && f.is_active);
  const nameOf = profileNameMap(profiles);
  return (
    <Dialog open={Boolean(record)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`glass-strong max-h-[90vh] overflow-y-auto ${detailForm?.settings.cols === 3 ? "max-w-4xl" : "max-w-2xl"}`} dir="rtl" onOpenAutoFocus={(e) => e.preventDefault()}>
        {record && (
          <>
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle className="flex items-center gap-2">
                {record.worker_name || "—"}
                <StatusBadge value={record.transfer_stage} />
              </DialogTitle>
              <DialogDescription>تفاصيل عملية نقل الكفالة</DialogDescription>
            </DialogHeader>

            {detailForm ? (
              <DetailStyleCtx.Provider value={detailForm.settings.detailStyle ?? {}}>
              <div className={`grid gap-4 ${(detailForm.settings.detailStyle?.cols ?? detailForm.settings.cols) === 1 ? "" : (detailForm.settings.detailStyle?.cols ?? detailForm.settings.cols) === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`} style={{ gap: detailForm.settings.detailStyle?.gap }}>
                {detailBlockOrder(detailForm).map((block) => {
                  if (block === DETAIL_HISTORY) return (
                    <div key={block} className="col-span-full">
                      <SponsorHistory
                        transferId={record.id}
                        source="manual_transfers"
                        current={{ name: record.new_sponsor_name, phone: record.new_sponsor_phone, since: record.transfer_date, createdAt: record.created_at, salaryStatus: record.salary_dues_status, salaryAmount: Number(record.salary_dues_amount) }}
                      />
                    </div>
                  );
                  if (block === DETAIL_AUDIT) return (
                    <Section key={block} title="سجل التدقيق">
                      <DetailRow label="تم الإضافة بواسطة" value={nameOf(record.created_by) || "—"} />
                      <DetailRow label="تاريخ الإضافة" value={formatDateTime(record.created_at)} ltr />
                      <DetailRow label="آخر تعديل بواسطة" value={nameOf(record.updated_by) || "—"} />
                      <DetailRow label="تاريخ آخر تعديل" value={formatDateTime(record.updated_at)} ltr />
                    </Section>
                  );
                  if (block === DETAIL_ACTION) return (
                    <div key={block} className="flex items-end">
                      <Button type="button" onClick={() => onEdit(record)} className="w-full">تعديل البيانات</Button>
                    </div>
                  );
                  const entry = detailSections(detailForm).find(([sec]) => detailSectionKey(sec) === block);
                  if (!entry) return null;
                  const [sec, fields] = entry;
                  return (
                    <Section key={block} title={sec}>
                      {detailGroups(fields).map(([grp, run], gi) => (
                        <div key={`${grp || "x"}-${gi}`}>
                          {gi > 0 && <div className="my-2 border-t border-dashed border-black/15" />}
                          {grp && <h5 className="mb-1 text-[11px] font-semibold text-ink/45">{grp}</h5>}
                          <div className="grid gap-x-4" style={{ gridTemplateColumns: `repeat(${detailForm.settings.detailStyle?.fieldCols ?? 1}, minmax(0, 1fr))` }}>
                            {run.map((fld) => (
                              <div key={fld.id} style={fld.settings?.span === "full" ? { gridColumn: "1 / -1" } : undefined}>
                                <DetailFieldRow field={fld} record={record} onSaved={onSaved} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </Section>
                  );
                })}
              </div>
              </DetailStyleCtx.Provider>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                {formsPending ? "جارٍ تحميل تفاصيل العملية…" : formsError ? "تعذّر تحميل إعدادات تفاصيل العملية." : "نموذج تفاصيل العملية غير متاح."}
                {!formsPending && formsError && <Button variant="outline" className="ms-2" onClick={() => void refetchForms()}>إعادة المحاولة</Button>}
              </div>
            )}

          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
