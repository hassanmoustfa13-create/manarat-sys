import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { Field, SelectField, TextField } from "@/components/FormFields";
import {
  ARRIVAL_STATUSES,
  LOCATIONS,
  NATIONALITIES,
  PROFESSIONS,
  TRANSFER_STATUSES,
  VISA_TYPES,
  type Worker,
  errorMessage,
} from "@/lib/data";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  worker?: Worker | null;
  isAdmin: boolean;
}

const empty = {
  name: "",
  passport_number: "",
  nationality: NATIONALITIES[0]!,
  profession: PROFESSIONS[0] as string,
  visa_type: VISA_TYPES[0] as string,
  monthly_salary: "",
  arrival_date: "",
  arrival_time: "",
  flight_group: "",
  arrival_status: ARRIVAL_STATUSES[0] as string,
  current_location: LOCATIONS[0] as string,
  current_sponsor_name: "",
  current_sponsor_phone: "",
  transfer_status: TRANSFER_STATUSES[0] as string,
  notes: "",
};


export function WorkerFormDialog({ open, onOpenChange, worker, isAdmin }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const editing = Boolean(worker);
  const coreLocked = editing && !isAdmin;

  useEffect(() => {
    if (!open) return;
    setForm(
      worker
        ? {
            name: worker.name,
            passport_number: worker.passport_number,
            nationality: worker.nationality,
            monthly_salary: worker.monthly_salary?.toString() ?? "",
            arrival_date: worker.arrival_date ?? "",
            current_sponsor_name: worker.current_sponsor_name ?? "",
            current_sponsor_phone: worker.current_sponsor_phone ?? "",
            transfer_status: worker.transfer_status,
            notes: worker.notes ?? "",
          }
        : empty,
    );
  }, [open, worker]);

  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        passport_number: form.passport_number.trim(),
        nationality: form.nationality,
        monthly_salary: form.monthly_salary ? Number(form.monthly_salary) : 0,
        arrival_date: form.arrival_date || null,
        current_sponsor_name: form.current_sponsor_name.trim(),
        current_sponsor_phone: form.current_sponsor_phone.trim(),
        transfer_status: form.transfer_status,
        notes: form.notes.trim(),
      };
      if (worker) {
        // Regular users must not send core fields (trigger would reject changes)
        const { name, passport_number, nationality, arrival_date, ...allowed } = payload;
        const body = isAdmin ? payload : allowed;
        void name; void passport_number; void nationality; void arrival_date;
        const { error } = await supabase.from("workers").update(body).eq("id", worker.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(worker ? "تم حفظ التعديلات" : "تمت إضافة العامل/ـة");
      qc.invalidateQueries({ queryKey: ["workers"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{editing ? "تعديل بيانات العامل/ـة" : "إضافة عامل/ـة جديد"}</DialogTitle>
          <DialogDescription>
            {coreLocked
              ? "البيانات الأساسية (الاسم، الجواز، الجنسية، تاريخ الوصول) للقراءة فقط — يمكن للمدير فقط تعديلها."
              : "أدخل البيانات الأساسية وبيانات الكفيل الحالي."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <TextField label="اسم العامل/العاملة" value={form.name} onChange={set("name")} required disabled={coreLocked} />
          <TextField
            label="رقم الجواز"
            value={form.passport_number}
            onChange={set("passport_number")}
            required
            ltr
            disabled={coreLocked}
            hint="يجب أن يكون فريداً"
          />
          <Field label="الجنسية">
            <input
              list="nationalities"
              value={form.nationality}
              onChange={(e) => set("nationality")(e.target.value)}
              required
              disabled={coreLocked}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            />
            <datalist id="nationalities">
              {NATIONALITIES.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <TextField label="الراتب الشهري" type="number" ltr value={form.monthly_salary} onChange={set("monthly_salary")} />
          <TextField
            label="تاريخ الوصول"
            type="date"
            ltr
            value={form.arrival_date}
            onChange={set("arrival_date")}
            disabled={coreLocked}
          />
          <SelectField
            label="حالة نقل الكفالة"
            value={form.transfer_status}
            onChange={set("transfer_status")}
            options={TRANSFER_STATUSES}
          />
          <TextField label="اسم الكفيل الحالي" value={form.current_sponsor_name} onChange={set("current_sponsor_name")} />
          <TextField label="هاتف الكفيل الحالي" ltr value={form.current_sponsor_phone} onChange={set("current_sponsor_phone")} />
          <Field label="ملاحظات" className="sm:col-span-2">
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
          </Field>
          <DialogFooter className="sm:col-span-2 sm:justify-start">
            <Button type="submit" disabled={save.isPending}>
              {editing ? "حفظ" : "إضافة"}
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
