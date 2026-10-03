import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowLeftRight, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/data";
import { applyNavOrder, hiddenPagesQuery, navOrderQuery, saveHiddenPages, saveNavOrder } from "@/lib/pageVisibility";
import { NAV, type NavItem } from "@/components/AppShell";

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

const isTransferRoute = (to: string) => to.startsWith("/transfers") || to.startsWith("/manual");

type Row = { key: string; label: string; icon: LucideIcon; items: NavItem[] };

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

  // Build orderable rows: every direct page is a row; the 4 transfer pages collapse into one «نقل الكفالة» row.
  const rows: Row[] = [];
  for (const n of applyNavOrder(NAV.filter((x) => !x.admin), order)) {
    if (isTransferRoute(n.to)) {
      const g = rows.find((r) => r.key === "/transfers");
      if (g) g.items.push(n);
      else rows.push({ key: "/transfers", label: "نقل الكفالة", icon: ArrowLeftRight, items: [n] });
    } else {
      rows.push({ key: n.to, label: n.label, icon: n.icon, items: [n] });
    }
  }
  const currentOrder: string[] = rows.map((r) => r.key);

  const move = async (key: string, dir: -1 | 1) => {
    const i = currentOrder.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= currentOrder.length) return;
    const next = [...currentOrder];
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
    try {
      await saveNavOrder(next);
      qc.setQueryData(navOrderQuery.queryKey, next);
      toast.success("تم حفظ الترتيب");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const arrows = (key: string, i: number) => (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => move(key, -1)}
        disabled={i === 0}
        aria-label="تحريك لأعلى"
        className="grid size-5 place-items-center rounded text-ink/50 transition-colors hover:bg-black/5 hover:text-ink disabled:opacity-25"
      >
        <ArrowUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => move(key, 1)}
        disabled={i === rows.length - 1}
        aria-label="تحريك لأسفل"
        className="grid size-5 place-items-center rounded text-ink/50 transition-colors hover:bg-black/5 hover:text-ink disabled:opacity-25"
      >
        <ArrowDown className="size-3.5" />
      </button>
    </div>
  );

  const hideBtn = (to: string) => {
    const off = hidden.includes(to);
    return (
      <button
        type="button"
        onClick={() => toggle(to)}
        className={off ? "pill pill-brand gap-1 opacity-70" : "pill pill-teal gap-1"}
      >
        {off ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {off ? "مخفية" : "ظاهرة"}
      </button>
    );
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold">إظهار وإخفاء الصفحات</h1>
      <p className="mb-5 text-sm text-ink/55">
        الصفحة المخفية تختفي من القائمة للموظفين ولا يمكنهم فتحها. المدير يراها باهتة ويستطيع فتحها. البيانات لا تُحذف.
        استخدم الأسهم لتغيير ترتيب الصفحات في القائمة العلوية — يُطبَّق الترتيب على الجميع.
      </p>
      <div className="glass divide-y divide-black/5 rounded-2xl">
        {rows.map((row, i) => (
          <div key={row.key}>
            <div className="flex items-center gap-2 px-4 py-3">
              {arrows(row.key, i)}
              <row.icon className="size-4 text-ink/50" />
              <span className="flex-1 text-sm font-medium">{row.label}</span>
              {row.items.length === 1 ? hideBtn(row.items[0]!.to) : null}
            </div>
            {row.items.length > 1 && (
              <div className="divide-y divide-black/5 border-t border-black/5 bg-black/[0.02]">
                {row.items.map((n) => (
                  <div key={n.to} className="flex items-center gap-2 py-2 pe-4 ps-12">
                    <n.icon className="size-3.5 text-ink/40" />
                    <span className="flex-1 text-[13px] text-ink/70">{n.altLabel ?? n.label}</span>
                    {hideBtn(n.to)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
