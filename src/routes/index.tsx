import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "منارات هجر للاستقدام — نظام إدارة الاستقدام" },
      { name: "description", content: "إدارة العمالة والكفلاء ونقل الكفالة في جدول تفاعلي سريع" },
      { property: "og:title", content: "منارات هجر للاستقدام — نظام إدارة الاستقدام" },
      { property: "og:description", content: "إدارة العمالة والكفلاء ونقل الكفالة في جدول تفاعلي سريع" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/workers" : "/auth", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-lg font-semibold text-foreground">منارات هجر للاستقدام</p>
        <p className="mt-2 text-sm text-muted-foreground">جارٍ التحميل…</p>
      </div>
    </div>
  );
}
