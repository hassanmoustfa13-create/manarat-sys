import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ComboField, Field, SelectField, TextField } from "@/components/FormFields";
import {
  LOCATIONS,
  PAYMENT_STATUSES,
  TRANSFER_STAGES,
  TRANSFER_TYPES,
  TRANSFER_TYPE_OTHER,
  VISA_TYPES,
  YES_NO_EXISTS,
  YES_NO_EXISTS_F,
  type Transfer,
  type Worker,
  errorMessage,
  formatMoney,
  mergeContacts,
  requestsQuery,
  transfersQuery,
  workersQuery,
} from "@/lib/data";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Preselect a worker when launched from the workers grid */
  worker?: Worker | null;
  transfer?: Transfer | null;
  isAdmin: boolean;
}

const empty = {
  worker_id: "",
  new_sponsor_name: "",
  new_sponsor_phone: "",
  visa_type: VISA_TYPES[0] as string,
  transfer_type: TRANSFER_TYPES[0] as string,
  transfer_stage: TRANSFER_STAGES[0] as string,
  transfer_date: new Date().toISOString().slice(0, 10),
  period_start: new Date().toISOString().slice(0, 10),
  period_end: "",
  old_sponsor_dues: "0",
  down_payment: "0",
  payment_status: PAYMENT_STATUSES[1] as string,
  medical_exam: YES_NO_EXISTS[1] as string,
  residency_status: YES_NO_EXISTS_F[1] as string,
  salary_dues_status: YES_NO_EXISTS_F[1] as string,
  salary_dues_amount: "0",
  worker_condition: "",
  worker_location: LOCATIONS[0] as string,
  notes: "",
};


export function TransferFormDialog({ open, onOpenChange, worker, transfer, isAdmin }: Props) {
  const qc = useQueryClient();
  const { data: workers = [] } = useQuery(workersQuery);
  const [form, setForm] = useState(empty);
  const [workerOpen, setWorkerOpen] = useState(false);
  const [workerQuery, setWorkerQuery] = useState("");
  const editing = Boolean(transfer);

  useEffect(() => {
    if (!open) return;
    setForm(
      transfer
        ? {
            worker_id: transfer.worker_id,
            new_sponsor_name: transfer.new_sponsor_name,
            new_sponsor_phone: transfer.new_sponsor_phone,
            visa_type: transfer.visa_type,
            transfer_type: transfer.transfer_type ?? TRANSFER_TYPES[0],
            transfer_stage: transfer.transfer_stage ?? TRANSFER_STAGES[0],
            transfer_date: transfer.transfer_date ?? "",
            period_start: transfer.period_start ?? "",
            period_end: transfer.period_end ?? "",
            old_sponsor_dues: String(transfer.old_sponsor_dues),
            down_payment: String(transfer.down_payment),
            payment_status: transfer.payment_status,
            medical_exam: transfer.medical_exam,
            residency_status: transfer.residency_status,
            salary_dues_status: transfer.salary_dues_status,
            salary_dues_amount: String(transfer.salary_dues_amount ?? 0),
            worker_condition: transfer.worker_condition ?? "",
            worker_location: transfer.worker_location ?? LOCATIONS[0],
            notes: transfer.notes,

          }
        : { ...empty, worker_id: worker?.id ?? "" },
    );
  }, [open, worker, transfer]);

  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const selectedWorker = useMemo(
    () => workers.find((w) => w.id === form.worker_id) ?? null,
    [workers, form.worker_id],
  );

  /** Searchable by name or passport number (Arabic-Indic digits normalized to Latin) */
  const filteredWorkers = useMemo(() => {
    const q = workerQuery.trim().toLowerCase().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    if (!q) return workers;
    return workers.filter(
      (w) =>
        (w.name ?? "").toLowerCase().includes(q) ||
        String(w.passport_number ?? "").toLowerCase().includes(q),
    );
  }, [workers, workerQuery]);

  const { data: requests } = useQuery(requestsQuery);
  const sponsors = useMemo(
    () =>
      mergeContacts(
        transfers?.map((t) => ({ name: t.new_sponsor_name, phone: t.new_sponsor_phone })),
        workers.map((w) => ({ name: w.current_sponsor_name, phone: w.current_sponsor_phone })),
        requests?.map((r) => ({ name: r.customer_name, phone: r.phone })),
      ),
    [transfers, workers, requests],
  );

  const dues = Number(form.old_sponsor_dues || 0);
  const deposit = Number(form.down_payment || 0);
  const remaining = dues - deposit;
  const needsPeriod = form.transfer_type !== TRANSFER_TYPE_OTHER;

  /** Amounts drive the payment status automatically; it stays manually editable afterwards */
  const setAmount = (k: "old_sponsor_dues" | "down_payment") => (v: string) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      const left = Number(next.old_sponsor_dues || 0) - Number(next.down_payment || 0);
      return { ...next, payment_status: left > 0 ? PAYMENT_STATUSES[1] : PAYMENT_STATUSES[0] };
    });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.worker_id) throw new Error("اختر العامل/ـة أولاً");
      const common = {
        new_sponsor_name: form.new_sponsor_name.trim(),
        new_sponsor_phone: form.new_sponsor_phone.trim(),
        visa_type: form.visa_type,
        transfer_type: form.transfer_type,
        transfer_stage: form.transfer_stage,
        transfer_date: form.transfer_date || null,
        period_start: needsPeriod ? form.period_start || null : null,
        period_end: needsPeriod && form.period_start ? addDays(form.period_start, 10) : null,
        old_sponsor_dues: dues,
        down_payment: deposit,
        payment_status: form.payment_status,
        medical_exam: form.medical_exam,
        residency_status: form.residency_status,
        salary_dues_status: form.salary_dues_status,
        salary_dues_amount: Number(form.salary_dues_amount || 0),
        worker_condition: form.worker_condition.trim(),
        worker_location: form.worker_location,
        notes: form.notes.trim(),
      };

      if (transfer) {
        const body = isAdmin ? { ...common, worker_id: form.worker_id } : common;
        const { error } = await supabase.from("transfers").update(body).eq("id", transfer.id);
        if (error) throw error;
      } else {
        // old sponsor is auto-filled by the database from the worker's current sponsor
        const { error } = await supabase
          .from("transfers")
          .insert({ ...common, worker_id: form.worker_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "تم حفظ التعديلات" : "تم تسجيل طلب نقل الكفالة");
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["workers"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{editing ? "تعديل عملية نقل الكفالة" : "نقل كفالة جديد"}</DialogTitle>
          <DialogDescription>
            بيانات الكفيل القديم تُعبّأ تلقائياً من سجل العامل/ـة، والمبلغ المتبقي يُحسب تلقائياً.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <Field label="العامل/العاملة" className="sm:col-span-3">
            <select
              value={form.worker_id}
              onChange={(e) => set("worker_id")(e.target.value)}
              required
              disabled={editing && !isAdmin}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <option value="">— اختر —</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} · {w.passport_number}
                </option>
              ))}
            </select>
          </Field>

          <div className="glass sm:col-span-3 grid grid-cols-2 gap-3 rounded-xl p-3 text-[12px]">
            <div>
              <p className="text-ink/45">الكفيل القديم</p>
              <p className="font-medium">
                {transfer?.old_sponsor_name || selectedWorker?.current_sponsor_name || "—"}
              </p>
            </div>
            <div dir="ltr" className="text-right">
              <p className="text-ink/45" dir="rtl">
                هاتف الكفيل القديم
              </p>
              <p className="font-medium">
                {transfer?.old_sponsor_phone || selectedWorker?.current_sponsor_phone || "—"}
              </p>
            </div>
          </div>

          <ComboField
            label="اسم الكفيل الجديد"
            listId="new-sponsors-list"
            value={form.new_sponsor_name}
            onChange={set("new_sponsor_name")}
            options={sponsors}
            onPick={(c) =>
              setForm((f) => ({
                ...f,
                new_sponsor_name: c.name,
                new_sponsor_phone: c.phone || f.new_sponsor_phone,
              }))
            }
            required
          />
          <TextField label="هاتف الكفيل الجديد" ltr value={form.new_sponsor_phone} onChange={set("new_sponsor_phone")} />
          <SelectField label="نوع التأشيرة" value={form.visa_type} onChange={set("visa_type")} options={VISA_TYPES} />
          <SelectField label="نوع النقل" value={form.transfer_type} onChange={set("transfer_type")} options={TRANSFER_TYPES} />
          <TextField label="تاريخ النقل" type="date" ltr value={form.transfer_date} onChange={set("transfer_date")} />
          {needsPeriod && (
            <>
              <TextField
                label="تاريخ بداية المدة"
                type="date"
                ltr
                value={form.period_start}
                onChange={set("period_start")}
                required
              />
              <TextField label="تاريخ انتهاء المدة (تلقائي: 10 أيام)" type="date" ltr value={form.period_start ? addDays(form.period_start, 10) : ""} onChange={() => {}} disabled />
            </>
          )}
          <SelectField
            label="حالة النقل"
            value={form.transfer_stage}
            onChange={set("transfer_stage")}
            options={TRANSFER_STAGES}
          />
          <SelectField
            label="موقع العاملة"
            value={form.worker_location}
            onChange={set("worker_location")}
            options={LOCATIONS}
          />

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
          <SelectField label="مستحقات رواتب العاملة" value={form.salary_dues_status} onChange={set("salary_dues_status")} options={YES_NO_EXISTS_F} />
          <TextField
            label="قيمة مستحقات الرواتب"
            type="number"
            ltr
            value={form.salary_dues_amount}
            onChange={set("salary_dues_amount")}
          />
          <Field label="ملاحظات حالة العاملة" className="sm:col-span-3">
            <Textarea
              rows={2}
              value={form.worker_condition}
              onChange={(e) => set("worker_condition")(e.target.value)}
            />
          </Field>
          <DialogFooter className="sm:col-span-3 sm:justify-start">
            <Button type="submit" disabled={save.isPending}>
              {editing ? "حفظ" : "تسجيل النقل"}
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

function addDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
