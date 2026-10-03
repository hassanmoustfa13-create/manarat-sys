import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/data";
import { applyNavOrder, hiddenPagesQuery, navOrderQuery, saveHiddenPages, saveNavOrder } from "@/lib/pageVisibility";
import { NAV } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/pages")({
  head: () => ({
    meta: [
      { title: "إظهار وإخفاء الصفحات — منارات هجر للاستقدام" },
      { name: "description", content: "تحكم المدير في الصفحات الظاهرة في القائمة وترتيبها" },
      { property: "og:title", content: "إظهار وإخفاء الصفحات — منارات هجر للاستقدام" },
      { property: "og:description", content: "تحكم المدير في الصفحات الظاهرة وترتيبها" },
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
  const { data: order = [] } = useQuery(navOrderQuery);
  if (!auth.can("admin_pages", "view")) return <main className="p-6 text-ink/60">هذه الصفحة للمدير فقط.</main>;

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

  const items = applyNavOrder(NAV.filter((n) => !n.admin), order);
  const currentOrder = items.map((n) => n.to);

  const move = async (to: string, dir: -1 | 1) => {
    const i = currentOrder.indexOf(to);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= currentOrder.length) return;
    const next = [...currentOrder];
    [next[i], next[j]] = [next[j], next[i]];
    try {
      await saveNavOrder(next);
      qc.setQueryData(navOrderQuery.queryKey, next);
      toast.success("تم حفظ الترتيب");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold">إظهار وإخفاء الصفحات</h1>
      <p className="mb-5 text-sm text-ink/55">
        الصفحة المخفية تختفي من القائمة للموظفين ولا يمكنهم فتحها. المدير يراها باهتة ويستطيع فتحها. البيانات لا تُحذف.
        استخدم الأسهم لتغيير ترتيب الصفحات في القائمة العلوية — يُطبَّق الترتيب على الجميع.
      </p>
      <div className="glass divide-y divide-black/5 rounded-2xl">
        {items.map(({ to, label, icon: Icon }, i) => {
          const off = hidden.includes(to);
          return (
            <div key={to} className="flex items-center gap-2 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => move(to, -1)}
                  disabled={i === 0}
                  aria-label="تحريك لأعلى"
                  className="grid size-5 place-items-center rounded text-ink/50 transition-colors hover:bg-black/5 hover:text-ink disabled:opacity-25"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(to, 1)}
                  disabled={i === items.length - 1}
                  aria-label="تحريك لأسفل"
                  className="grid size-5 place-items-center rounded text-ink/50 transition-colors hover:bg-black/5 hover:text-ink disabled:opacity-25"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
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
