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
import { ComboField, Field, SelectField, SelectOrOtherField, TextField } from "@/components/FormFields";
import {
  LOCATIONS,
  PASSPORT_HOLDERS,
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
  mergeContacts,
  requestsQuery,
  transfersQuery,
  workersQuery,
  workerCategory,
  type TransferCategory,
} from "@/lib/data";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Preselect a worker when launched from the workers grid */
  worker?: Worker | null;
  transfer?: Transfer | null;
  isAdmin: boolean;
  category?: TransferCategory;
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
  new_sponsor_dues: "0",
  new_sponsor_payment_status: PAYMENT_STATUSES[1] as string,
  medical_exam: YES_NO_EXISTS[1] as string,
  residency_status: YES_NO_EXISTS_F[1] as string,
  salary_dues_status: YES_NO_EXISTS_F[1] as string,
  salary_dues_amount: "0",
  worker_condition: "",
  worker_location: LOCATIONS[0] as string,
  passport_holder: "المكتب" as string,
  notes: "",
};


export function TransferFormDialog({ open, onOpenChange, worker, transfer, isAdmin, category: categoryProp }: Props) {
  const qc = useQueryClient();
  const { data: allWorkers = [] } = useQuery(workersQuery);
  const category: TransferCategory =
    (transfer as any)?.category ?? categoryProp ?? (worker ? workerCategory(worker) : "منزلية");
  const workers = useMemo(() => allWorkers.filter((w) => workerCategory(w) === category), [allWorkers, category]);
  const [form, setForm] = useState(empty);
  const [workerOpen, setWorkerOpen] = useState(false);
  const [workerQuery, setWorkerQuery] = useState("");
  const editing = Boolean(transfer);
  const draftKey = `draft:transfer:${category}`;
  const [draftReady, setDraftReady] = useState(false);

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
            new_sponsor_dues: String((transfer as any).new_sponsor_dues ?? 0),
            new_sponsor_payment_status: (transfer as any).new_sponsor_payment_status ?? PAYMENT_STATUSES[1],
            medical_exam: transfer.medical_exam,
            residency_status: transfer.residency_status,
            salary_dues_status: transfer.salary_dues_status,
            salary_dues_amount: String(transfer.salary_dues_amount ?? 0),
            worker_condition: transfer.worker_condition ?? "",
            worker_location: transfer.worker_location ?? LOCATIONS[0],
            passport_holder: transfer.passport_holder ?? "المكتب",
            notes: transfer.notes,

          }
        : (() => {
            const base = { ...empty, worker_id: worker?.id ?? "", passport_holder: worker?.passport_holder ?? "المكتب" };
            try {
              const raw = localStorage.getItem(draftKey);
              if (raw) {
                const d = JSON.parse(raw);
                return { ...base, ...d, worker_id: worker?.id ?? d.worker_id ?? "" };
              }
            } catch { /* ignore */ }
            return base;
          })(),
    );
    setDraftReady(true);
  }, [open, worker, transfer]);

  useEffect(() => {
    if (!open) { setDraftReady(false); return; }
    if (!draftReady || editing) return;
    try { localStorage.setItem(draftKey, JSON.stringify(form)); } catch { /* ignore */ }
  }, [form, open, draftReady, editing, draftKey]);

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

  const { data: transfers } = useQuery(transfersQuery);
  const { data: requests } = useQuery(requestsQuery);
  const sponsors = useMemo(
    () => [
      { name: "الشركة", phone: "" },
      ...mergeContacts(
        transfers?.map((t) => ({ name: t.new_sponsor_name, phone: t.new_sponsor_phone })),
        workers.map((w) => ({ name: w.current_sponsor_name, phone: w.current_sponsor_phone })),
        requests?.map((r) => ({ name: r.customer_name, phone: r.phone })),
      ).filter((c) => c.name !== "الشركة"),
    ],
    [transfers, workers, requests],
  );

  const dues = Number(form.old_sponsor_dues || 0);
  const deposit = Number(form.down_payment || 0);
  const needsPeriod = form.transfer_type !== TRANSFER_TYPE_OTHER;

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
        new_sponsor_dues: Number(form.new_sponsor_dues || 0),
        new_sponsor_payment_status: form.new_sponsor_payment_status,
        medical_exam: form.medical_exam,
        residency_status: form.residency_status,
        salary_dues_status: form.salary_dues_status,
        salary_dues_amount: Number(form.salary_dues_amount || 0),
        worker_condition: form.worker_condition.trim(),
        worker_location: form.worker_location,
        passport_holder: form.passport_holder,
        notes: form.notes.trim(),
        category,
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
      // keep the worker's passport holder in sync with the transfer
      await supabase.from("workers").update({ passport_holder: form.passport_holder }).eq("id", form.worker_id);
    },
    onSuccess: () => {
      toast.success(editing ? "تم حفظ التعديلات" : "تم تسجيل طلب نقل الكفالة");
      if (!editing) localStorage.removeItem(draftKey);
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["workers"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{editing ? "تعديل عملية نقل الكفالة" : "نقل كفالة جديد"} {category === "مهنية" ? "(مهنية)" : "(عمالة منزلية)"}</DialogTitle>
          <DialogDescription>
            بيانات الكفيل القديم تُعبّأ تلقائياً من سجل العامل/ـة، وحالة الدفع تُحدد يدويًا.
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
            <div className="relative">
              <button
                type="button"
                disabled={editing && !isAdmin}
                onClick={() => {
                  setWorkerQuery("");
                  setWorkerOpen((o) => !o);
                }}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <span className={selectedWorker ? "" : "text-ink/50"}>
                  {selectedWorker
                    ? `${selectedWorker.name || "بدون اسم"} · ${selectedWorker.passport_number || "بدون جواز"}`
                    : "— اختر —"}
                </span>
                <ChevronDown className="size-4 shrink-0 text-ink/50" />
              </button>
              {workerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setWorkerOpen(false)} />
                  <div className="glass-strong absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-black/10 shadow-lg">
                    <input
                      autoFocus
                      value={workerQuery}
                      onChange={(e) => setWorkerQuery(e.target.value)}
                      placeholder="ابحث بالاسم أو رقم الجواز..."
                      className="w-full border-b border-black/10 px-3 py-2 text-sm outline-none"
                    />
                    <ul className="max-h-56 overflow-y-auto">
                      {filteredWorkers.length === 0 && (
                        <li className="px-3 py-2 text-sm text-ink/50">لا توجد نتائج مطابقة</li>
                      )}
                      {filteredWorkers.map((w) => (
                        <li key={w.id}>
                          <button
                            type="button"
                            onClick={() => {
                              set("worker_id")(w.id);
                              setWorkerOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-right text-sm hover:bg-brand/10 ${
                              w.id === form.worker_id ? "bg-brand/15 font-semibold" : ""
                            }`}
                          >
                            <span>{w.name || "بدون اسم"}</span>
                            <span dir="ltr" className="text-ink/60">
                              {" "}
                              · {w.passport_number || "—"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </Field>


          <div className="glass sm:col-span-3 grid grid-cols-2 gap-3 rounded-xl p-3 text-[12px]">
            <div>
              <p className="text-ink/45">الكفيل القديم</p>
              <p className="font-medium">
                {transfer?.old_sponsor_name || selectedWorker?.current_sponsor_name || (selectedWorker ? "الشركة" : "—")}
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

          <div>
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
            <button
              type="button"
              className="mt-1 text-[12px] font-semibold text-brand hover:underline"
              onClick={() => setForm((f) => ({ ...f, new_sponsor_name: "الشركة", new_sponsor_phone: "" }))}
            >
              النقل إلى الشركة (بدون كفيل)
            </button>
          </div>
          <TextField label="هاتف الكفيل الجديد" ltr value={form.new_sponsor_phone} onChange={set("new_sponsor_phone")} />
          <SelectField label="نوع التأشيرة" value={form.visa_type} onChange={set("visa_type")} options={VISA_TYPES} />
          <div className="text-[12px]">
            <p className="text-ink/45">رقم التأشيرة</p>
            <p className="font-medium" dir="ltr" style={{ textAlign: "right" }}>
              {selectedWorker?.visa_number || "—"}
            </p>
          </div>
          <SelectField label="نوع النقل" value={form.transfer_type} onChange={set("transfer_type")} options={TRANSFER_TYPES} />
          {needsPeriod && (
            <>
              <TextField
                label="تاريخ بداية التجربة"
                type="date"
                ltr
                value={form.period_start}
                onChange={set("period_start")}
                required
              />
              <TextField label="تاريخ انتهاء التجربة (تلقائي: 10 أيام)" type="date" ltr value={form.period_start ? addDays(form.period_start, 10) : ""} onChange={() => {}} disabled />
            </>
          )}
          {form.transfer_stage === "تم النقل" && (
            <TextField label="تاريخ النقل" type="date" ltr value={form.transfer_date} onChange={set("transfer_date")} />
          )}
          <SelectField
            label="حالة النقل"
            value={form.transfer_stage}
            onChange={set("transfer_stage")}
            options={TRANSFER_STAGES}
          />
          <SelectOrOtherField
            label="موقع العاملة"
            value={form.worker_location}
            onChange={set("worker_location")}
            options={LOCATIONS}
          />
          <SelectField
            label="الجواز لدى"
            value={form.passport_holder}
            onChange={set("passport_holder")}
            options={PASSPORT_HOLDERS}
          />

          <TextField label="مستحقات الكفيل القديم" type="number" ltr value={form.old_sponsor_dues} onChange={set("old_sponsor_dues")} />
          <SelectField label="حالة الدفع للكفيل القديم" value={form.payment_status} onChange={set("payment_status")} options={PAYMENT_STATUSES} />
          <TextField label="مستحقات المكتب من الكفيل الجديد" type="number" ltr value={form.new_sponsor_dues} onChange={set("new_sponsor_dues")} />
          <TextField label="العربون (من الكفيل الجديد)" type="number" ltr value={form.down_payment} onChange={set("down_payment")} />
          <SelectField label="حالة دفع الكفيل الجديد" value={form.new_sponsor_payment_status} onChange={set("new_sponsor_payment_status")} options={PAYMENT_STATUSES} />
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
