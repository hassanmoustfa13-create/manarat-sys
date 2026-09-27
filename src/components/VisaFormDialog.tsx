import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ComboField, SelectField, TextField } from "@/components/FormFields";
import { errorMessage, mergeContacts, requestsQuery, transfersQuery, workersQuery } from "@/lib/data";

export const VISA_STATUSES = ["تم عمل العقد", "لم يتم عمل العقد"];
export const VISA_PAYMENT = ["تم الدفع", "لم يتم الدفع"];

export type OfficeVisa = {
  id: string;
  seq: number;
  holder_name: string;
  holder_phone: string;
  new_sponsor_name: string;
  new_sponsor_phone: string;
  visa_status: string;
  visa_number: string;
  payment_status: string;
  created_by: string | null;
  updated_by: string | null;
};

const empty = {
  holder_name: "",
  holder_phone: "",
  new_sponsor_name: "",
  new_sponsor_phone: "",
  visa_status: VISA_STATUSES[1]!,
  visa_number: "",
  payment_status: VISA_PAYMENT[1]!,
};

export function VisaFormDialog({
  open,
  onOpenChange,
  visa,
  visas,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  visa: OfficeVisa | null;
  visas: OfficeVisa[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const { data: requests } = useQuery(requestsQuery);
  const { data: workers } = useQuery(workersQuery);
  const { data: transfers } = useQuery(transfersQuery);
  const sponsors = useMemo(
    () =>
      mergeContacts(
        requests?.map((r) => ({ name: r.customer_name, phone: r.phone })),
        workers?.map((w) => ({ name: w.current_sponsor_name, phone: w.current_sponsor_phone })),
        transfers?.map((t) => ({ name: t.new_sponsor_name, phone: t.new_sponsor_phone })),
        transfers?.map((t) => ({ name: t.old_sponsor_name, phone: t.old_sponsor_phone })),
        visas.map((v) => ({ name: v.holder_name, phone: v.holder_phone })),
        visas.map((v) => ({ name: v.new_sponsor_name, phone: v.new_sponsor_phone })),
      ).filter((c) => c.name !== "الشركة"),
    [requests, workers, transfers, visas],
  );

  useEffect(() => {
    if (!open) return;
    setForm(
      visa
        ? {
            holder_name: visa.holder_name,
            holder_phone: visa.holder_phone,
            new_sponsor_name: visa.new_sponsor_name,
            new_sponsor_phone: visa.new_sponsor_phone,
            visa_status: visa.visa_status,
            visa_number: visa.visa_number,
            payment_status: visa.payment_status,
          }
        : empty,
    );
  }, [open, visa]);

  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as typeof empty;
      if (!payload.holder_name) throw new Error("اكتب اسم صاحب التأشيرة");
      const q = visa
        ? supabase.from("office_visas").update(payload).eq("id", visa.id)
        : supabase.from("office_visas").insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(visa ? "تم حفظ التعديلات" : "تمت إضافة التأشيرة");
      qc.invalidateQueries({ queryKey: ["office_visas"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{visa ? "تعديل التأشيرة" : "تأشيرة جديدة"}</DialogTitle>
          <DialogDescription>اختر الكفيل من القائمة أو اكتب اسمًا جديدًا ليُضاف.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <ComboField
            label="اسم صاحب التأشيرة"
            listId="visa-holders"
            value={form.holder_name}
            onChange={set("holder_name")}
            options={sponsors}
            onPick={(c) => setForm((f) => ({ ...f, holder_name: c.name, holder_phone: c.phone || f.holder_phone }))}
            required
          />
          <TextField label="هاتف صاحب التأشيرة" ltr value={form.holder_phone} onChange={set("holder_phone")} />
          <ComboField
            label="اسم الكفيل الجديد"
            listId="visa-new-sponsors"
            value={form.new_sponsor_name}
            onChange={set("new_sponsor_name")}
            options={sponsors}
            onPick={(c) =>
              setForm((f) => ({ ...f, new_sponsor_name: c.name, new_sponsor_phone: c.phone || f.new_sponsor_phone }))
            }
          />
          <TextField label="هاتف الكفيل الجديد" ltr value={form.new_sponsor_phone} onChange={set("new_sponsor_phone")} />
          <TextField label="رقم التأشيرة" ltr value={form.visa_number} onChange={set("visa_number")} />
          <SelectField label="حالة التأشيرة" value={form.visa_status} onChange={set("visa_status")} options={VISA_STATUSES} />
          <SelectField label="حالة الدفع" value={form.payment_status} onChange={set("payment_status")} options={VISA_PAYMENT} />
          <DialogFooter className="sm:col-span-2 sm:justify-start">
            <Button type="submit" disabled={save.isPending}>
              {visa ? "حفظ" : "إضافة"}
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
