import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { ComboField, Field, SelectField, SelectOrOtherField, SuggestField, TextField } from "@/components/FormFields";
import {
  ARRIVAL_STATUSES,
  LOCATIONS,
  PASSPORT_HOLDERS,
  NATIONALITIES,
  PROFESSIONS,
  TRANSFER_STATUSES,
  VISA_TYPES,
  type Worker,
  errorMessage,
  mergeContacts,
  requestsQuery,
  transfersQuery,
  workersQuery,
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
  visa_number: "",
  arrival_date: "",
  entry_date: "",
  residency_status: "لا يوجد",
  residency_number: "",
  arrival_time: "",
  flight_group: "",
  arrival_status: ARRIVAL_STATUSES[0] as string,
  current_location: LOCATIONS[0] as string,
  passport_holder: "المكتب" as string,
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
  const { data: workers } = useQuery(workersQuery);
  const { data: transfers } = useQuery(transfersQuery);
  const { data: requests } = useQuery(requestsQuery);
  const sponsors = useMemo(
    () =>
      mergeContacts(
        workers?.map((w) => ({ name: w.current_sponsor_name, phone: w.current_sponsor_phone })),
        transfers?.map((t) => ({ name: t.new_sponsor_name, phone: t.new_sponsor_phone })),
        requests?.map((r) => ({ name: r.customer_name, phone: r.phone })),
      ),
    [workers, transfers, requests],
  );

  useEffect(() => {
    if (!open) return;
    setForm(
      worker
        ? {
            name: worker.name,
            passport_number: worker.passport_number,
            nationality: worker.nationality,
            profession: worker.profession ?? "",
            visa_type: worker.visa_type ?? "",
            visa_number: worker.visa_number ?? "",
            arrival_date: worker.arrival_date ?? "",
            entry_date: worker.entry_date ?? "",
            residency_status: worker.residency_status ?? "لا يوجد",
            residency_number: worker.residency_number ?? "",
            arrival_time: worker.arrival_time ?? "",
            flight_group: worker.flight_group ?? "",
            arrival_status: worker.arrival_status ?? ARRIVAL_STATUSES[0],
            current_location: worker.current_location ?? LOCATIONS[0],
            passport_holder: worker.passport_holder ?? "المكتب",
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
      if (!form.name.trim() && !form.passport_number.trim())
        throw new Error("أدخل اسم العامل/ـة أو رقم الجواز على الأقل");
      const payload = {
        name: form.name.trim(),
        passport_number: form.passport_number.trim(),
        nationality: form.nationality,
        profession: form.profession,
        visa_type: form.visa_type,
        visa_number: form.visa_number.trim(),
        arrival_date: form.arrival_date || null,
        entry_date: form.entry_date || null,
        residency_status: form.residency_status,
        residency_number: form.residency_status === "يوجد" ? form.residency_number.trim() : "",
        arrival_time: form.arrival_time.trim(),
        flight_group: form.flight_group.trim(),
        arrival_status: form.arrival_status,
        current_location: form.current_location,
        passport_holder: form.passport_holder,
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
        const sponsor = payload.current_sponsor_name;
        if (sponsor && sponsor !== "الشركة") {
          await supabase
            .from("requests")
            .update({ action_status: "تم عمل عقد" })
            .eq("customer_name", sponsor)
            .not("action_status", "in", '("تم عمل عقد","العميل لا يرغب")');
        }
      }
    },
    onSuccess: () => {
      toast.success(worker ? "تم حفظ التعديلات" : "تمت إضافة العامل/ـة");
      qc.invalidateQueries({ queryKey: ["workers"] });
      qc.invalidateQueries({ queryKey: ["requests"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{editing ? "تعديل بيانات العامل/ـة" : "إضافة عامل/ـة جديد"}</DialogTitle>
          <DialogDescription>
            {coreLocked
              ? "البيانات الأساسية (الاسم، الجواز، الجنسية، تاريخ دخول المكتب) للقراءة فقط — يمكن للمدير فقط تعديلها."
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
          <TextField
            label="اسم العامل/العاملة"
            value={form.name}
            onChange={set("name")}
            disabled={coreLocked}
            hint="يكفي إدخال الاسم أو رقم الجواز"
          />
          <TextField
            label="رقم الجواز"
            value={form.passport_number}
            onChange={set("passport_number")}
            ltr
            disabled={coreLocked}
            hint="اختياري إذا تم إدخال الاسم — ويجب أن يكون فريداً"
          />
          <SuggestField
            label="الجنسية"
            value={form.nationality}
            onChange={set("nationality")}
            options={NATIONALITIES}
            required
            disabled={coreLocked}
            hint="اكتب الجنسية أو اخترها من القائمة"
          />
          <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="تاريخ دخولها السعودية"
              type="date"
              ltr
              value={form.entry_date}
              onChange={set("entry_date")}
              disabled={coreLocked}
            />
            <TextField
              label="تاريخ دخول المكتب"
              type="date"
              ltr
              value={form.arrival_date}
              onChange={set("arrival_date")}
              disabled={coreLocked}
            />
          </div>
          <SelectField label="المهنة" value={form.profession} onChange={set("profession")} options={PROFESSIONS} />
          <SelectField
            label="الإقامة"
            value={form.residency_status}
            onChange={set("residency_status")}
            options={["يوجد", "لا يوجد"]}
          />
          {form.residency_status === "يوجد" && (
            <TextField
              label="رقم الإقامة"
              value={form.residency_number}
              onChange={set("residency_number")}
              ltr
            />
          )}
          <SelectField label="نوع التأشيرة" value={form.visa_type} onChange={set("visa_type")} options={VISA_TYPES} />
          <TextField label="رقم التأشيرة" value={form.visa_number} onChange={set("visa_number")} ltr />
          <SelectField
            label="حالة الوصول"
            value={form.arrival_status}
            onChange={set("arrival_status")}
            options={ARRIVAL_STATUSES}
          />
          <SelectOrOtherField
            label="الموقع الحالي"
            value={form.current_location}
            onChange={set("current_location")}
            options={LOCATIONS}
          />
          <SelectField
            label="الجواز لدى"
            value={form.passport_holder}
            onChange={set("passport_holder")}
            options={PASSPORT_HOLDERS}
          />

          <SelectField
            label="حالة نقل الكفالة"
            value={form.transfer_status}
            onChange={set("transfer_status")}
            options={TRANSFER_STATUSES}
          />
          <ComboField
            label="اسم الكفيل الحالي"
            listId="worker-sponsors-list"
            value={form.current_sponsor_name}
            onChange={set("current_sponsor_name")}
            options={sponsors}
            onPick={(c) =>
              setForm((f) => ({
                ...f,
                current_sponsor_name: c.name,
                current_sponsor_phone: c.phone || f.current_sponsor_phone,
              }))
            }
          />
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
