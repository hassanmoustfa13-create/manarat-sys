export const RESOURCES = [
  { key: "requests", label: "طلبات الاستقدام" },
  { key: "workers", label: "العمالة" },
  { key: "transfers", label: "نقل الكفالة (منزلية)" },
  { key: "transfers_pro", label: "نقل الكفالة المهنية" },
  { key: "manual_transfers", label: "النقل اليدوي" },
  { key: "visas", label: "تأشيرات المكتب" },
  { key: "flights", label: "الرحلات" },
  { key: "reports", label: "التقارير" },
  { key: "custom_forms", label: "النماذج الإضافية" },
] as const;
export type Resource = (typeof RESOURCES)[number]["key"];

export const ACTIONS = [
  { key: "view", label: "عرض" },
  { key: "add", label: "إضافة" },
  { key: "edit", label: "تعديل" },
  { key: "delete", label: "حذف" },
  { key: "import", label: "استيراد Excel" },
  { key: "export", label: "تصدير" },
] as const;
export type Action = (typeof ACTIONS)[number]["key"];

export type StaffRole = "admin" | "supervisor" | "employee";
export const ROLE_LABELS: Record<StaffRole, string> = { admin: "مدير", supervisor: "مشرف", employee: "موظف" };
export const EDITABLE_ROLES: Exclude<StaffRole, "admin">[] = ["supervisor", "employee"];

/** الصفحة → القسم الذي يحكم ظهورها */
export const ROUTE_RESOURCE: Record<string, Resource> = {
  "/requests": "requests",
  "/workers": "workers",
  "/transfers": "transfers",
  "/transfers-pro": "transfers_pro",
  "/manual-transfers": "manual_transfers",
  "/manual-transfers-pro": "manual_transfers",
  "/visas": "visas",
  "/flights": "flights",
  "/reports": "reports",
};

export const permKey = (r: string, a: string) => `${r}:${a}`;
