import { createFileRoute } from "@tanstack/react-router";
import { ManualTransfersView } from "@/components/ManualTransfersView";

export const Route = createFileRoute("/_authenticated/manual-transfers-pro")({
  head: () => ({
    meta: [
      { title: "نقل الكفالة المهنية (يدوي) — منارات هجر للاستقدام" },
      { name: "description", content: "تسجيل نقل كفالة العمالة المهنية بكتابة البيانات يدوياً" },
      { property: "og:title", content: "نقل الكفالة المهنية (يدوي) — منارات هجر للاستقدام" },
      { property: "og:description", content: "جدول نقل الكفالة المهنية بإدخال يدوي" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ManualTransfersView category="مهنية" />,
});
