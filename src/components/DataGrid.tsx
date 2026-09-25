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
import { useState, type ReactNode } from "react";

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
}

export function DataGrid<T extends { id: string }>({
  data,
  columns,
  search,
  rowActions,
  emptyMessage = "لا توجد سجلات بعد",
  minWidth = 1080,
}: DataGridProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: search },
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
        <table className="w-full border-collapse text-[15px]" style={{ minWidth }}>
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
                      style={{ width: header.column.columnDef.meta?.width }}
                      className="border-b-2 border-l border-black/10 bg-white/95 px-4 py-3.5 text-right font-bold backdrop-blur-xl first:border-l-0"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          disabled={!canSort}
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap disabled:cursor-default"
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
          <tbody className="text-[15px] text-ink/85">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1 + (rowActions ? 1 : 0)}
                  className="px-4 py-16 text-center text-base text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-black/5 transition-colors hover:bg-brand/[0.06] ${i % 2 === 0 ? "bg-black/[0.015]" : ""}`}
              >
                <td className="px-3 py-3 text-center text-[13px] font-semibold text-ink/40">{i + 1}</td>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta ?? {};
                  return (
                    <td
                      key={cell.id}
                      dir={meta.ltr ? "ltr" : undefined}
                      className={`border-l border-black/5 px-4 py-3 align-middle first:border-l-0 ${
                        meta.ltr ? "text-left" : "text-right"
                      } ${meta.className ?? ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
                {rowActions && (
                  <td className="border-l border-black/5 px-3 py-2 align-middle">
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
