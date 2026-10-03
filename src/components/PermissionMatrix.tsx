import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { ACTIONS, allResources, permKey } from "@/lib/permissions";
import { formsQuery } from "@/lib/forms";
import { Button } from "@/components/ui/button";

type Cell = boolean | null; // null = حسب الدور

/** جدول صلاحيات: الأقسام × الإجراءات. tri=true يضيف حالة «حسب الدور». */
export function PermissionMatrix({
  values,
  onChange,
  tri = false,
  inherited,
  disabled,
}: {
  values: Record<string, Cell>;
  onChange: (key: string, v: Cell) => void;
  tri?: boolean;
  inherited?: Record<string, boolean>;
  disabled?: boolean;
}) {
  const { data: forms = [] } = useQuery(formsQuery);
  const resources = allResources(forms);
  const scrollRef = useRef<HTMLDivElement>(null);
  const move = (left: number) => scrollRef.current?.scrollBy({ left, behavior: "smooth" });
  const moveY = (top: number) => scrollRef.current?.scrollBy({ top, behavior: "smooth" });
  let lastGroup = "";
  return (
    <div>
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <p className="min-w-0 text-[12px] text-ink/55">حرّك الجدول بالأسهم أو بالسحب لعرض باقي الصلاحيات</p>
        <div className="flex shrink-0 items-center gap-1" dir="ltr">
          <Button type="button" variant="outline" size="icon" aria-label="عرض الأعمدة السابقة" title="عرض الأعمدة السابقة" onClick={() => move(420)}>
            <ChevronRight />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="عرض الأعمدة التالية" title="عرض الأعمدة التالية" onClick={() => move(-420)}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="عرض الصفوف السابقة" title="عرض الصفوف السابقة" onClick={() => moveY(-320)}>
            <ChevronUp />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="عرض الصفوف التالية" title="عرض الصفوف التالية" onClick={() => moveY(320)}>
            <ChevronDown />
          </Button>
        </div>
      </div>
      <div ref={scrollRef} className="grid-scroll max-h-[55vh] overflow-auto overscroll-contain rounded-xl ring-1 ring-black/10">
        <table className="ledger-rows w-full min-w-[920px] text-[13px]">
          <thead className="sticky top-0 z-10 bg-white/95 shadow-[0_1px_0_0_rgba(0,0,0,0.08)] backdrop-blur-sm">
            <tr className="text-ink/50">
              <th className="w-[130px] p-1.5 text-right text-[12px] font-medium">القسم</th>
              {ACTIONS.map((a) => (
                <th
                  key={a.key}
                  title={a.label}
                  className="p-1.5 text-center text-[12px] font-medium leading-tight"
                >
                  {a.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.flatMap((r) => {
              const rows = [];
              if (r.group !== lastGroup) {
                lastGroup = r.group;
                rows.push(
                  <tr key={`g-${r.group}`}>
                    <td colSpan={ACTIONS.length + 1} className="bg-black/[0.03] p-1.5 text-[12px] font-semibold text-ink/50">
                      {r.group}
                      {r.group === "صفحات الإدارة" && " — «عرض» يعني فتح الصفحة واستخدامها بالكامل"}
                    </td>
                  </tr>,
                );
              }
              rows.push(
                <tr key={r.key} className="border-t border-black/5">
                  <td className="p-1.5 font-medium leading-snug">{r.label}</td>
                  {ACTIONS.map((a) => {
                    if (!r.actions.includes(a.key))
                      return <td key={a.key} className="p-1.5 text-center text-ink/20">—</td>;
                    const k = permKey(r.key, a.key);
                    const v = values[k] ?? null;
                    if (!tri)
                      return (
                        <td key={a.key} className="p-1.5 text-center">
                          <input
                            type="checkbox"
                            aria-label={`${r.label} - ${a.label}`}
                            disabled={disabled}
                            checked={Boolean(v)}
                            onChange={(e) => onChange(k, e.target.checked)}
                            className="size-4 accent-[var(--color-brand)]"
                          />
                        </td>
                      );
                    const inh = inherited?.[k] ?? false;
                    return (
                      <td key={a.key} className="p-1 text-center">
                        <select
                          aria-label={`${r.label} - ${a.label}`}
                          title={v === null ? (inh ? "حسب الدور — مسموح للدور" : "حسب الدور — ممنوع للدور") : undefined}
                          value={v === null ? "" : v ? "1" : "0"}
                          onChange={(e) => onChange(k, e.target.value === "" ? null : e.target.value === "1")}
                          className={`w-[74px] rounded-md px-0.5 py-1 text-[11.5px] ring-1 ring-black/10 ${
                            v === true ? "bg-brand/10 text-brand" : v === false ? "bg-terracotta/10 text-terracotta" : "bg-white/70 text-ink/60"
                          }`}
                        >
                          <option value="">حسب الدور</option>
                          <option value="1">سماح</option>
                          <option value="0">منع</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>,
              );
              return rows;
            })}
          </tbody>
        </table>
      </div>
      {tri && (
        <p className="mt-2 text-[11px] leading-relaxed text-ink/45">
          «حسب الدور» تعني أن الصلاحية تتبع إعدادات الدور (المشرف أو الموظف) المحددة في هذه الصفحة — ضع المؤشر على القائمة لترى ما يسمح به الدور.
        </p>
      )}
    </div>
  );
}
