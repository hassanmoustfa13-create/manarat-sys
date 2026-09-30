import {
  type ColumnDef,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const { data: allSettings } = useQuery(gridSettingsQuery);
  const saved = gridKey ? allSettings?.[gridKey] : undefined;
  const colSettings = useMemo(() => (gridKey ? resolveColumns(gridKey, saved) : []), [gridKey, saved]);
  const setById = useMemo(() => new Map(colSettings.map((c) => [c.id, c])), [colSettings]);
  const columnOrder = colSettings.map((c) => c.id);
  const columnVisibility = Object.fromEntries(colSettings.map((c) => [c.id, c.visible]));
  const fontCls = saved?.fontSize === "sm" ? "text-[13px]" : saved?.fontSize === "lg" ? "text-[17px]" : "text-[15px]";
  const padCls = saved?.density === "compact" ? "py-1.5" : saved?.density === "comfortable" ? "py-5" : "py-3";
  const auth = useAuth();
  const qc = useQueryClient();
  const inlineOn = !!gridKey && auth.isAdmin && saved?.inlineSelectEdit === true;
  const optionsFor = (colId: string, metaOpts?: readonly string[]) =>
    inlineOn ? (metaOpts ?? INLINE_OPTIONS[colId]) : undefined;
  const saveCell = async (rowId: string, colId: string, value: string) => {
    if (!gridKey) return;
    const { error } = await supabase
      .from(gridKey as "workers")
      .update({ [colId]: value } as never)
      .eq("id", rowId);
    if (error) toast.error(error.message);
    else {
      toast.success("تم الحفظ");
      qc.invalidateQueries();
    }
  };
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
    state: { sorting, globalFilter: search, ...(gridKey ? { columnOrder, columnVisibility } : {}) },
    onSortingChange: setSorting,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
    <div className="overflow-hidden rounded-[min(1vw,14px)] bg-white/60 ring-1 ring-black/8 backdrop-blur-xl">
      <div className="grid-scroll max-h-[calc(100vh-15rem)] overflow-auto">
        <table className={`w-full border-collapse ${fontCls}`} style={{ minWidth }}>
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="text-[13px] font-bold text-ink/70">
                <th className="w-12 border-b-2 border-black/10 bg-white/95 px-3 py-3.5 text-center font-bold backdrop-blur-xl">
                  م
                </th>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: widthOf(header.column.id, header.column.columnDef.meta?.width), minWidth: setById.get(header.column.id)?.width || undefined }}
                      className={`border-b-2 border-l border-black/10 bg-white/95 px-4 py-3.5 ${alignOf(header.column.id)} font-bold backdrop-blur-xl first:border-l-0`}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          disabled={!canSort}
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 leading-snug disabled:cursor-default"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
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
                  <th className="border-b-2 border-l border-black/10 bg-white/95 px-4 py-3.5 text-center font-bold backdrop-blur-xl">
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
                className={`border-b border-black/5 transition-colors hover:bg-brand/[0.06] ${onRowClick ? "cursor-pointer" : ""} ${i % 2 === 0 ? "bg-black/[0.015]" : ""}`}
              >
                <td className={`px-3 ${padCls} text-center text-[13px] font-semibold text-ink/40`}>{i + 1}</td>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta ?? {};
                  return (
                    <td
                      key={cell.id}
                      onClick={optionsFor(cell.column.id, meta.options) ? (e) => e.stopPropagation() : undefined}
                      dir={meta.ltr ? "ltr" : undefined}
                      className={`border-l border-black/5 px-3 ${padCls} align-middle break-words first:border-l-0 ${alignOf(
                        cell.column.id,
                        meta.ltr,
                      )} ${meta.className ?? ""}`}
                    >
                      {(() => {
                        const opts = optionsFor(cell.column.id, meta.options);
                        if (!opts) return flexRender(cell.column.columnDef.cell, cell.getContext());
                        const v = String(cell.getValue() ?? "");
                        const list = v && !opts.includes(v) ? [v, ...opts] : opts;
                        return (
                          <select
                            value={v}
                            onChange={(e) => saveCell(row.original.id, cell.column.id, e.target.value)}
                            className="w-full min-w-[90px] rounded-md bg-white/70 px-1.5 py-1 ring-1 ring-black/10 focus:ring-brand"
                          >
                            {!v && <option value="">—</option>}
                            {list.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
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
      <div className="flex items-center justify-between border-t border-black/5 px-4 py-2.5 text-[13px] text-ink/50">
        <span>
          عرض {rows.length} من {data.length} سجل
        </span>
        <span className="hidden sm:inline">لتعديل بيانات أي صف اضغط زر التعديل بجانبه</span>
      </div>
    </div>
  );
}
