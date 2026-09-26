import { createFileRoute } from "@tanstack/react-router";
import { TransfersView } from "@/routes/_authenticated/transfers";

export const Route = createFileRoute("/_authenticated/transfers-pro")({
  head: () => ({
    meta: [
      { title: "نقل الكفالة المهنية — منارات هجر للاستقدام" },
      { name: "description", content: "متابعة عمليات نقل الكفالة للعمالة المهنية بشكل منفصل" },
      { property: "og:title", content: "نقل الكفالة المهنية — منارات هجر للاستقدام" },
      { property: "og:description", content: "جدول نقل الكفالة للعمالة المهنية" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <TransfersView category="مهنية" />,
});
