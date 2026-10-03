import {
  type ColumnDef,
  type RowData,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { gridSettingsQuery, resolveColumns, type GridKey } from "@/lib/gridSettings";

export type CellType = "text" | "number" | "date" | "select" | "textarea";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    editable?: boolean;
    type?: CellType;
    options?: readonly string[];
    ltr?: boolean;
    width?: number | string;
    className?: string;
  }
}

interface DataGridProps<T extends { id: string }> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  search: string;
  rowActions?: (row: T) => ReactNode;
  emptyMessage?: string;
  minWidth?: number;
  gridKey?: GridKey;
  onRowClick?: (row: T) => void;
}

export function DataGrid<T extends { id: string }>({
  data,
  columns,
  search,
  rowActions,
  emptyMessage = "لا توجد سجلات بعد",
  minWidth = 0,
  gridKey,
  onRowClick,
}: DataGridProps<T>) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const move = (left: number) => scrollRef.current?.scrollBy({ left, behavior: "smooth" });
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, data.length]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data, pagination.pageSize]);
  const { data: allSettings } = useQuery(gridSettingsQuery);
  const saved = gridKey ? allSettings?.[gridKey] : undefined;
  const colSettings = useMemo(() => (gridKey ? resolveColumns(gridKey, saved) : []), [gridKey, saved]);
  const setById = useMemo(() => new Map(colSettings.map((c) => [c.id, c])), [colSettings]);
  const columnOrder = colSettings.map((c) => c.id);
  const columnVisibility = Object.fromEntries(colSettings.map((c) => [c.id, c.visible]));
  const fontCls = saved?.fontSize === "sm" ? "text-[12.5px]" : saved?.fontSize === "lg" ? "text-[16px]" : "text-[13.5px]";
  const padCls = saved?.density === "compact" ? "py-1" : saved?.density === "comfortable" ? "py-4" : "py-2";
  const widthOf = (id: string, fallback?: number | string) => setById.get(id)?.width || fallback;
  const alignOf = (id: string, ltr?: boolean) => {
    const a = setById.get(id)?.align;
    if (a === "center") return "text-center";
    if (a === "left") return "text-left";
    if (a === "right") return "text-right";
    return ltr ? "text-left" : "text-right";
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: search, pagination, ...(gridKey ? { columnOrder, columnVisibility } : {}) },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _colId, filter: string) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return Object.values(row.original as Record<string, unknown>).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      );
    },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-xl border border-white/50 bg-white/60 shadow-xl backdrop-blur-xl">
      <div className="relative">
        {canScroll && (
          <div
            dir="ltr"
            className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-0.5"
          >
            <button
              type="button"
              aria-label="تمرير لعرض أعمدة إضافية"
              onClick={() => move(-420)}
              className="pointer-events-auto grid size-8 place-items-center rounded-full bg-white/95 text-ink/60 shadow-lg ring-1 ring-black/10 transition-colors hover:text-brand"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="العودة للأعمدة الأولى"
              onClick={() => move(420)}
              className="pointer-events-auto grid size-8 place-items-center rounded-full bg-white/95 text-ink/60 shadow-lg ring-1 ring-black/10 transition-colors hover:text-brand"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
        <div ref={scrollRef} className="grid-scroll max-h-[calc(100vh-15rem)] overflow-auto">
        <table className={`ledger-rows w-full border-collapse ${fontCls}`} style={{ minWidth }}>
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="text-[12px] font-bold text-ink/70">
                <th className="w-10 border-b-2 border-black/10 bg-white/90 px-2 py-2.5 text-center font-bold backdrop-blur-xl">
                  م
                </th>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: widthOf(header.column.id, header.column.columnDef.meta?.width), minWidth: setById.get(header.column.id)?.width || undefined }}
                      className={`border-b-2 border-l border-black/10 bg-white/90 px-3 py-2.5 ${alignOf(header.column.id)} font-bold backdrop-blur-xl first:border-l-0`}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          disabled={!canSort}
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 leading-snug disabled:cursor-default"
                        >
                          {setById.get(header.column.id)?.label || flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort &&
                            (sorted === "asc" ? (
                              <ArrowUp className="size-3.5 text-brand" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3.5 text-brand" />
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-30" />
                            ))}
                        </button>
                      )}
                    </th>
                  );
                })}
                {rowActions && (
                  <th className="border-b-2 border-l border-black/10 bg-white/90 px-3 py-2.5 text-center font-bold backdrop-blur-xl">
                    إجراءات
                  </th>
                )}
              </tr>
            ))}
          </thead>
          <tbody className="text-ink/85">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={table.getVisibleLeafColumns().length + 1 + (rowActions ? 1 : 0)}
                  className="px-4 py-16 text-center text-base text-muted-foreground"
                >
                  {search.trim() ? `لا توجد نتائج مطابقة لـ «${search.trim()}»` : emptyMessage}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={`border-b border-black/5 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
              >
                <td className={`px-2 ${padCls} text-center text-[12px] font-semibold text-ink/40`}>{i + 1}</td>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta ?? {};
                  return (
                    <td
                      key={cell.id}
                      dir={meta.ltr ? "ltr" : undefined}
                      className={`border-l border-black/5 px-3 ${padCls} align-middle break-words first:border-l-0 ${alignOf(
                        cell.column.id,
                        meta.ltr,
                      )} ${meta.className ?? ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
                {rowActions && (
                  <td
                    className="border-l border-black/5 px-3 py-2 align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-1.5">{rowActions(row.original)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/60 bg-white/40 px-4 py-2 text-xs text-ink/60">
        <span>
          عرض {rows.length} من {table.getFilteredRowModel().rows.length} سجل
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden sm:inline">لتعديل بيانات أي صف اضغط زر التعديل بجانبه</span>
          {table.getPageCount() > 1 && (
            <div className="flex items-center gap-1.5" dir="ltr">
              <button
                type="button"
                aria-label="الصفحة السابقة"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                className="grid size-7 place-items-center rounded-full bg-white/90 text-ink/60 ring-1 ring-black/10 transition-colors hover:text-brand disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
              <span className="text-[11.5px]">
                صفحة {pagination.pageIndex + 1} من {table.getPageCount()}
              </span>
              <button
                type="button"
                aria-label="الصفحة التالية"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                className="grid size-7 place-items-center rounded-full bg-white/90 text-ink/60 ring-1 ring-black/10 transition-colors hover:text-brand disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
          )}
          <select
            value={pagination.pageSize}
            onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
            aria-label="عدد الأسطر في الصفحة"
            className="rounded-lg border border-white/60 bg-white/50 px-2 py-1 text-[11.5px] text-ink/70 focus:outline-none"
          >
            <option value={10}>10 أسطر</option>
            <option value={25}>25 سطرًا</option>
            <option value={50}>50 سطرًا</option>
            <option value={1000000}>كل الأسطر</option>
          </select>
        </div>
      </div>
    </div>
  );
}
