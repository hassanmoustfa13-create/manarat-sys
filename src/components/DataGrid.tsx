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
import { useEffect, useRef, useState, type ReactNode } from "react";

export type CellType = "text" | "number" | "date" | "select" | "textarea";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Whether the current user may edit this cell inline */
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
  onCellSave?: (row: T, columnId: string, value: string) => Promise<void> | void;
  rowActions?: (row: T) => ReactNode;
  emptyMessage?: string;
  minWidth?: number;
}

export function DataGrid<T extends { id: string }>({
  data,
  columns,
  search,
  onCellSave,
  rowActions,
  emptyMessage = "لا توجد سجلات بعد",
  minWidth = 1080,
}: DataGridProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editing, setEditing] = useState<{ rowId: string; colId: string } | null>(null);

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
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="text-[11px] font-semibold text-ink/55">
                <th className="w-10 border-b border-black/10 bg-white/90 px-2 py-2.5 text-center font-medium backdrop-blur-xl">
                  م
                </th>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.column.columnDef.meta?.width }}
                      className="border-b border-l border-black/5 bg-white/90 px-3 py-2.5 text-right font-medium backdrop-blur-xl first:border-l-0"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          disabled={!canSort}
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 whitespace-nowrap disabled:cursor-default"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort &&
                            (sorted === "asc" ? (
                              <ArrowUp className="size-3 text-brand" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3 text-brand" />
                            ) : (
                              <ArrowUpDown className="size-3 opacity-30" />
                            ))}
                        </button>
                      )}
                    </th>
                  );
                })}
                {rowActions && (
                  <th className="border-b border-l border-black/5 bg-white/90 px-3 py-2.5 text-right font-medium backdrop-blur-xl">
                    إجراءات
                  </th>
                )}
              </tr>
            ))}
          </thead>
          <tbody className="text-[13px]">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1 + (rowActions ? 1 : 0)}
                  className="px-4 py-14 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-black/5 transition-colors hover:bg-brand/[0.04] ${i % 2 === 0 ? "bg-black/[0.015]" : ""}`}
              >
                <td className="px-2 py-1.5 text-center text-[11px] text-ink/35">{i + 1}</td>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta ?? {};
                  const isEditing =
                    editing?.rowId === row.id && editing.colId === cell.column.id;
                  const editable = Boolean(meta.editable && onCellSave);
                  return (
                    <td
                      key={cell.id}
                      dir={meta.ltr ? "ltr" : undefined}
                      onClick={() => {
                        if (editable && !isEditing)
                          setEditing({ rowId: row.id, colId: cell.column.id });
                      }}
                      title={editable ? "انقر للتعديل" : undefined}
                      className={`border-l border-black/5 px-3 py-1.5 align-middle first:border-l-0 ${
                        meta.ltr ? "text-left" : "text-right"
                      } ${editable ? "cursor-cell" : ""} ${isEditing ? "cell-focus p-0" : ""} ${meta.className ?? ""}`}
                    >
                      {isEditing ? (
                        <CellEditor
                          type={meta.type ?? "text"}
                          options={meta.options}
                          ltr={meta.ltr}
                          initial={String(cell.getValue() ?? "")}
                          onCancel={() => setEditing(null)}
                          onCommit={async (v) => {
                            setEditing(null);
                            if (v !== String(cell.getValue() ?? ""))
                              await onCellSave?.(row.original, cell.column.id, v);
                          }}
                        />
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </td>
                  );
                })}
                {rowActions && (
                  <td className="border-l border-black/5 px-2 py-1 align-middle">
                    <div className="flex items-center gap-1">{rowActions(row.original)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-black/5 px-4 py-2 text-[11px] text-ink/45">
        <span>
          عرض {rows.length} من {data.length} سجل
        </span>
        <span className="hidden sm:inline">انقر على الخلية للتعديل المباشر · Enter للحفظ · Esc للإلغاء</span>
      </div>
    </div>
  );
}

function CellEditor({
  type,
  options,
  ltr,
  initial,
  onCommit,
  onCancel,
}: {
  type: CellType;
  options?: readonly string[] | undefined;
  ltr?: boolean | undefined;
  initial: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    if (ref.current instanceof HTMLInputElement) ref.current.select();
  }, []);

  const common = {
    dir: ltr ? ("ltr" as const) : undefined,
    className:
      "w-full min-w-[80px] bg-transparent px-3 py-1.5 text-[13px] outline-none " + (ltr ? "text-left" : "text-right"),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && type !== "textarea") {
        e.preventDefault();
        onCommit(value);
      }
      if (e.key === "Escape") onCancel();
    },
    onBlur: () => onCommit(value),
  };

  if (type === "select") {
    return (
      <select
        ref={ref as React.RefObject<HTMLSelectElement>}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onCommit(e.target.value);
        }}
        {...common}
      >
        {options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (type === "textarea") {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        {...common}
      />
    );
  }
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
      step={type === "number" ? "0.01" : undefined}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      {...common}
    />
  );
}
