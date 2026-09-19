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
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-ink/30">—</span>;
  return <span className={STATUS_CLASS[value] ?? "pill pill-neutral"}>{value}</span>;
}
