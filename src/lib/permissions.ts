export const ACTIONS = [
  { key: "view", label: "عرض", short: "عرض" },
  { key: "add", label: "إضافة", short: "إضافة" },
  { key: "edit", label: "تعديل", short: "تعديل" },
  { key: "delete", label: "حذف", short: "حذف" },
  { key: "import", label: "استيراد Excel", short: "استيراد" },
  { key: "export", label: "تصدير", short: "تصدير" },
  { key: "complete", label: "إتمام النقل", short: "إتمام" },
  { key: "quick_edit", label: "تعديل سريع بالتفاصيل", short: "تعديل سريع" },
] as const;
export type Action = (typeof ACTIONS)[number]["key"];

const DATA: Action[] = ["view", "add", "edit", "delete", "import", "export"];

export type ResourceDef = { key: string; label: string; actions: Action[]; group: string };

/** الأقسام الثابتة. النماذج الإضافية تُضاف تلقائيًا من «إدارة النماذج» (form:<key>). */
export const RESOURCES: ResourceDef[] = [
  { key: "requests", label: "طلبات الاستقدام", actions: DATA, group: "الجداول" },
  { key: "workers", label: "العمالة", actions: [...DATA, "complete"], group: "الجداول" },
  { key: "transfers", label: "نقل الكفالة (منزلية)", actions: [...DATA, "complete"], group: "الجداول" },
  { key: "transfers_pro", label: "نقل الكفالة المهنية", actions: [...DATA, "complete"], group: "الجداول" },
  { key: "manual_transfers", label: "النقل اليدوي (منزلية)", actions: [...DATA, "quick_edit"], group: "الجداول" },
  { key: "manual_transfers_pro", label: "النقل اليدوي (مهنية)", actions: [...DATA, "quick_edit"], group: "الجداول" },
  { key: "visas", label: "تأشيرات المكتب", actions: DATA, group: "الجداول" },
  { key: "flights", label: "الرحلات", actions: DATA, group: "الجداول" },
  { key: "archive", label: "الأرشيف", actions: ["view"], group: "الجداول" },
  { key: "reports", label: "التقارير", actions: ["view", "export"], group: "الجداول" },
  { key: "custom_forms", label: "قالب النماذج الجديدة (يُنسخ لكل نموذج يُنشأ لاحقًا)", actions: DATA, group: "النماذج الإضافية" },
  { key: "admin_columns", label: "إعدادات الجداول", actions: ["view"], group: "صفحات الإدارة" },
  { key: "admin_forms", label: "إدارة النماذج", actions: ["view"], group: "صفحات الإدارة" },
  { key: "admin_pages", label: "إظهار وإخفاء الصفحات", actions: ["view"], group: "صفحات الإدارة" },
  { key: "admin_security", label: "سجل الأمان", actions: ["view"], group: "صفحات الإدارة" },
];
export type Resource = string;

export const formResource = (formKey: string) => `form:${formKey}`;

export function allResources(forms: { form_key: string; name: string; is_system: boolean }[] = []): ResourceDef[] {
  const custom = forms
    .filter((f) => !f.is_system)
    .map((f) => ({ key: formResource(f.form_key), label: f.name, actions: DATA, group: "النماذج الإضافية" }));
  const i = RESOURCES.findIndex((r) => r.group === "صفحات الإدارة");
  return [...RESOURCES.slice(0, i), ...custom, ...RESOURCES.slice(i)];
}

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
  "/manual-transfers-pro": "manual_transfers_pro",
  "/visas": "visas",
  "/flights": "flights",
  "/reports": "reports",
  "/archive": "archive",
  "/columns": "admin_columns",
  "/forms": "admin_forms",
  "/pages": "admin_pages",
  "/security": "admin_security",
};

export const permKey = (r: string, a: string) => `${r}:${a}`;
