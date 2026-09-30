import { useMemo } from "react";
import { DynamicFormDialog } from "@/components/DynamicForm";

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

const _empty = {
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
  const contacts = useMemo(
    () => [
      ...visas.map((v) => ({ name: v.holder_name, phone: v.holder_phone })),
      ...visas.map((v) => ({ name: v.new_sponsor_name, phone: v.new_sponsor_phone })),
    ],
    [visas],
  );
  return (
    <DynamicFormDialog
      formKey="office_visas"
      open={open}
      onOpenChange={onOpenChange}
      record={visa as unknown as (Record<string, unknown> & { id: string }) | null}
      title={visa ? "تعديل التأشيرة" : "تأشيرة جديدة"}
      queryKey={["office_visas"]}
      contacts={contacts}
      successText="تمت إضافة التأشيرة"
    />
  );
}
