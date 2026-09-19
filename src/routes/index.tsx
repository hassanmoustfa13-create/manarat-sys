import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "هجرة — نظام إدارة الاستقدام" },
      { name: "description", content: "إدارة العمالة والكفلاء ونقل الكفالة في جدول تفاعلي سريع" },
      { property: "og:title", content: "هجرة — نظام إدارة الاستقدام" },
      { property: "og:description", content: "إدارة العمالة والكفلاء ونقل الكفالة في جدول تفاعلي سريع" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/workers" });
  },
  component: () => null,
});
