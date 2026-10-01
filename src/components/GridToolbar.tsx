import { Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function GridToolbar({
  title,
  count,
  search,
  onSearch,
  filters,
  addLabel,
  onAdd,
  extra,
}: {
  title: string;
  count: number;
  search: string;
  onSearch: (v: string) => void;
  filters?: ReactNode;
  addLabel: string;
  onAdd?: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-semibold">{title}</h1>
        <span className="text-[12px] text-ink/45">{count} سجل</span>
      </div>
      <div className="relative w-full lg:ms-4 lg:w-80">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="بحث سريع… الاسم، الجواز، الكفيل، الهاتف"
          className="glass h-9 w-full rounded-lg pe-9 ps-3 text-sm outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-brand/30"
        />
      </div>
      {filters && <div className="flex flex-wrap items-center gap-1.5">{filters}</div>}
      <div className="flex items-center gap-2 lg:ms-auto">
        {extra}
        {onAdd && (
          <Button onClick={onAdd} className="gap-1.5">
            <Plus className="size-4" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
        active
          ? "bg-brand text-white shadow-sm"
          : "bg-white/60 text-ink/60 ring-1 ring-black/8 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}
