import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { pageTextsQuery } from "@/lib/pageVisibility";
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
  onAdd?: (() => void) | undefined;
  extra?: ReactNode;
}) {
  const path = useRouterState({ select: (st) => st.location.pathname });
  const { data: texts } = useQuery(pageTextsQuery);
  const shownTitle = texts?.titles[path]?.trim() || title;
  return (
    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-semibold">{shownTitle}</h1>
        <span className="text-[12px] text-ink/45">{count} سجل</span>
      </div>
      <div className="relative w-full lg:ms-4 lg:w-52">
        <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink/35" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="بحث"
          className="glass h-7 w-full rounded-lg pe-8 ps-2.5 text-[13px] outline-none focus:ring-2 focus:ring-brand/30"
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
