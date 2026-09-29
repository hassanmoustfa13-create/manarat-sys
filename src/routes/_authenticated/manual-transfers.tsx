import { createFileRoute } from "@tanstack/react-router";
import { ManualTransfersView } from "@/components/ManualTransfersView";

export const Route = createFileRoute("/_authenticated/manual-transfers")({
  head: () => ({
    meta: [
      { title: "نقل الكفالة المنزلية (يدوي) — منارات هجر للاستقدام" },
      { name: "description", content: "تسجيل نقل كفالة العمالة المنزلية بكتابة البيانات يدوياً" },
      { property: "og:title", content: "نقل الكفالة المنزلية (يدوي) — منارات هجر للاستقدام" },
      { property: "og:description", content: "جدول نقل الكفالة المنزلية بإدخال يدوي" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ManualTransfersView category="منزلية" />,
});
