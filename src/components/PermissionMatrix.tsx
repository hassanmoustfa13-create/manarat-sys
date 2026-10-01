import { ACTIONS, RESOURCES, permKey } from "@/lib/permissions";

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
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead>
          <tr className="text-ink/50">
            <th className="p-2 text-right font-medium">القسم</th>
            {ACTIONS.map((a) => (
              <th key={a.key} className="p-2 text-center font-medium">{a.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RESOURCES.map((r) => (
            <tr key={r.key} className="border-t border-black/5">
              <td className="p-2 font-medium">{r.label}</td>
              {ACTIONS.map((a) => {
                const k = permKey(r.key, a.key);
                const v = values[k] ?? null;
                if (!tri)
                  return (
                    <td key={a.key} className="p-2 text-center">
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
                  <td key={a.key} className="p-1.5 text-center">
                    <select
                      aria-label={`${r.label} - ${a.label}`}
                      value={v === null ? "" : v ? "1" : "0"}
                      onChange={(e) => onChange(k, e.target.value === "" ? null : e.target.value === "1")}
                      className={`rounded-md px-1 py-1 text-[12px] ring-1 ring-black/10 ${
                        v === true ? "bg-brand/10 text-brand" : v === false ? "bg-terracotta/10 text-terracotta" : "bg-white/70 text-ink/60"
                      }`}
                    >
                      <option value="">حسب الدور ({inh ? "✓" : "✗"})</option>
                      <option value="1">سماح</option>
                      <option value="0">منع</option>
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
