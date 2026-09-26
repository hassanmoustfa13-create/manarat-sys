const STATUS_CLASS: Record<string, string> = {
  "قيد النقل": "pill pill-teal",
  "تم النقل": "pill pill-success",
  "بدون نقل": "pill pill-neutral",
  "تم الدفع بالكامل": "pill pill-success",
  "متبقي مبلغ": "pill pill-terracotta",
  يوجد: "pill pill-success",
  توجد: "pill pill-success",
  "لا يوجد": "pill pill-neutral",
  "لا توجد": "pill pill-neutral",
  "قيد المتابعة": "pill pill-teal",
  "انتظار تأشيرة": "pill pill-brand",
  "تم إرسال السيرة الذاتية": "pill pill-brand",
  "تم عمل عقد": "pill pill-success",
  "العميل لا يرغب": "pill pill-terracotta",
  "لم يتم الرد": "pill pill-neutral",
  "تم الإرسال وفي انتظار العميل": "pill pill-teal",
  "العميل يرغب في خيارات أخرى": "pill pill-neutral",
  "خارج الشرقية": "pill pill-neutral",
  "تم الوصول": "pill pill-success",
  "تم الإلغاء": "pill pill-terracotta",
  الشركة: "pill pill-brand",
  السكن: "pill pill-brand",
  "الكفيل القديم": "pill pill-neutral",
  "الكفيل الجديد": "pill pill-teal",
  "إجراءات رفع طلب النقل": "pill pill-brand",
  "إجراءات البصمة في أبشر": "pill pill-teal",
  "إجراءات الفحص الطبي": "pill pill-teal",
  إيجار: "pill pill-neutral",
  تجربة: "pill pill-brand",
  مؤقت: "pill pill-neutral",
};


export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-ink/30">—</span>;
  return <span className={STATUS_CLASS[value] ?? "pill pill-neutral"}>{value}</span>;
}
