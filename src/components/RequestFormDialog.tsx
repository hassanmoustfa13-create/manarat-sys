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
  ACTION_STATUSES,
  LANGUAGES,
  NATIONALITIES,
  PROFESSIONS,
  REQUEST_TYPES,
  YES_NO_EXISTS,
  type Request,
  errorMessage,
} from "@/lib/data";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request?: Request | null;
  isAdmin: boolean;
}

const empty = {
  request_date: new Date().toISOString().slice(0, 10),
  customer_name: "",
  phone: "",
  profession: PROFESSIONS[0] as string,
  nationality: NATIONALITIES[0]!,
  request_type: REQUEST_TYPES[0] as string,
  lead_source: "",
  action_status: ACTION_STATUSES[0] as string,
  pref_age: "",
  pref_religion: "",
  pref_experience: "",
  pref_driving_license: YES_NO_EXISTS[1] as string,
  pref_languages: LANGUAGES[0] as string,
  notes: "",
};

export function RequestFormDialog({ open, onOpenChange, request, isAdmin }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const editing = Boolean(request);
  const coreLocked = editing && !isAdmin;

  useEffect(() => {
    if (!open) return;
    setForm(
      request
        ? {
            request_date: request.request_date ?? "",
            customer_name: request.customer_name,
            phone: request.phone,
            profession: request.profession,
            nationality: request.nationality,
            request_type: request.request_type,
            lead_source: request.lead_source,
            action_status: request.action_status,
            pref_age: request.pref_age,
            pref_religion: request.pref_religion,
            pref_experience: request.pref_experience,
            pref_driving_license: request.pref_driving_license,
            pref_languages: request.pref_languages,
            notes: request.notes,
          }
        : empty,
    );
  }, [open, request]);

  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        request_date: form.request_date || null,
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        profession: form.profession,
        nationality: form.nationality,
        request_type: form.request_type,
        lead_source: form.lead_source.trim(),
        action_status: form.action_status,
        pref_age: form.pref_age.trim(),
        pref_religion: form.pref_religion.trim(),
        pref_experience: form.pref_experience.trim(),
        pref_driving_license: form.pref_driving_license,
        pref_languages: form.pref_languages,
        notes: form.notes.trim(),
      };
      if (request) {
        const { error } = await supabase.from("requests").update(payload).eq("id", request.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("requests").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "تم حفظ التعديلات" : "تمت إضافة الطلب");
      qc.invalidateQueries({ queryKey: ["requests"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{editing ? "تعديل طلب الاستقدام" : "طلب استقدام جديد"}</DialogTitle>
          <DialogDescription>بيانات العميل، نوع الطلب، وتفضيلات العامل/ـة المطلوبة.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <TextField label="تاريخ الطلب" type="date" ltr value={form.request_date} onChange={set("request_date")} />
          <TextField
            label="اسم العميل"
            value={form.customer_name}
            onChange={set("customer_name")}
            required
            disabled={coreLocked}
          />
          <TextField label="رقم الهاتف" ltr value={form.phone} onChange={set("phone")} disabled={coreLocked} />
          <SelectField label="المهنة" value={form.profession} onChange={set("profession")} options={PROFESSIONS} />
          <SelectField label="الجنسية" value={form.nationality} onChange={set("nationality")} options={NATIONALITIES} />
          <SelectField label="نوع الطلب" value={form.request_type} onChange={set("request_type")} options={REQUEST_TYPES} />
          <TextField label="مصدر العميل" value={form.lead_source} onChange={set("lead_source")} placeholder="إعلان، توصية…" />
          <SelectField
            label="الإجراء على الطلب"
            value={form.action_status}
            onChange={set("action_status")}
            options={ACTION_STATUSES}
            className="sm:col-span-2"
          />

          <p className="sm:col-span-3 -mb-1 text-[11px] font-semibold text-ink/50">تفضيلات العامل/ـة</p>
          <TextField label="السن" value={form.pref_age} onChange={set("pref_age")} placeholder="مثال: 25-35" />
          <TextField label="الديانة" value={form.pref_religion} onChange={set("pref_religion")} />
          <TextField label="الخبرة" value={form.pref_experience} onChange={set("pref_experience")} placeholder="مثال: سنتان" />
          <SelectField
            label="رخصة قيادة"
            value={form.pref_driving_license}
            onChange={set("pref_driving_license")}
            options={YES_NO_EXISTS}
          />
          <SelectField label="اللغات" value={form.pref_languages} onChange={set("pref_languages")} options={LANGUAGES} />

          <Field label="تفاصيل وملاحظات الطلب" className="sm:col-span-3">
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
          </Field>
          <DialogFooter className="sm:col-span-3 sm:justify-start">
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
