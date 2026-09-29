import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/data";
import { hiddenPagesQuery, saveHiddenPages } from "@/lib/pageVisibility";
import { NAV } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/pages")({
  head: () => ({
    meta: [
      { title: "إظهار وإخفاء الصفحات — منارات هجر للاستقدام" },
      { name: "description", content: "تحكم المدير في الصفحات الظاهرة في القائمة" },
      { property: "og:title", content: "إظهار وإخفاء الصفحات — منارات هجر للاستقدام" },
      { property: "og:description", content: "تحكم المدير في الصفحات الظاهرة" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PagesSettings,
});

function PagesSettings() {
  const auth = useAuth();
  const qc = useQueryClient();
  const { data: hidden = [] } = useQuery(hiddenPagesQuery);
  if (!auth.isAdmin) return <main className="p-6 text-ink/60">هذه الصفحة للمدير فقط.</main>;

  const toggle = async (to: string) => {
    const next = hidden.includes(to) ? hidden.filter((h) => h !== to) : [...hidden, to];
    try {
      await saveHiddenPages(next);
      qc.setQueryData(hiddenPagesQuery.queryKey, next);
      toast.success(hidden.includes(to) ? "تم إظهار الصفحة" : "تم إخفاء الصفحة");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const items = NAV.filter((n) => !n.admin);
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold">إظهار وإخفاء الصفحات</h1>
      <p className="mb-5 text-sm text-ink/55">الصفحة المخفية تختفي من القائمة للموظفين ولا يمكنهم فتحها. المدير يراها باهتة ويستطيع فتحها. البيانات لا تُحذف.</p>
      <div className="glass divide-y divide-black/5 rounded-2xl">
        {items.map(({ to, label, icon: Icon }) => {
          const off = hidden.includes(to);
          return (
            <div key={to} className="flex items-center gap-3 px-4 py-3">
              <Icon className="size-4 text-ink/50" />
              <span className="flex-1 text-sm">
                {label}
                {to.startsWith("/manual") ? <span className="text-ink/40"> — نقل يدوي</span> : null}
              </span>
              <button
                type="button"
                onClick={() => toggle(to)}
                className={off ? "pill pill-brand gap-1 opacity-70" : "pill pill-teal gap-1"}
              >
                {off ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {off ? "مخفية" : "ظاهرة"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
