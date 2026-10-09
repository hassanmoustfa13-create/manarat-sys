import {
  type ColumnDef,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { customColumnId, fieldColumnId, gridFormFields, gridSettingsQuery, resolveColumns, type GridKey } from "@/lib/gridSettings";
import { formsQuery, OPTION_TYPES, type FormField } from "@/lib/forms";
import { formatDate, formatMoney } from "@/lib/data";

// pageSize value that shows every row on one page — the grid's default view.
const ALL_ROWS = 1000000;



function customCell(f: FormField, v: unknown): ReactNode {
  if (v === null || v === undefined || v === "") return "—";
  if (f.field_type === "checkbox") return v === true || v === "true" ? "✓ نعم" : "لا";
  if (f.field_type === "currency" || f.field_type === "number") return formatMoney(v as number);
  if (f.field_type === "date") return formatDate(String(v));
  if (OPTION_TYPES.includes(f.field_type)) {
    const opt = f.form_field_options.find((o) => o.value === String(v));
    return opt?.label || String(v);
  }
  return String(v);
}

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
  /** Forms whose custom fields become columns (defaults to the grid's forms). */
  formKeys?: string[];
  onRowClick?: (row: T) => void;
  sortable?: boolean;
  selectedIds?: Set<string> | undefined;
  onSelectionChange?: ((ids: Set<string>) => void) | undefined;
}

export function DataGrid<T extends { id: string }>({
  data,
  columns,
  search,
  rowActions,
  emptyMessage = "لا توجد سجلات بعد",
  minWidth = 0,
  gridKey,
  formKeys,
  onRowClick,
  sortable = false,
  selectedIds,
  onSelectionChange,
}: DataGridProps<T>) {
  const selectable = Boolean(selectedIds && onSelectionChange);
  const toggleId = (id: string) => {
    if (!selectedIds || !onSelectionChange) return;
    const n = new Set(selectedIds);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    onSelectionChange(n);
  };
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: ALL_ROWS });
  const [sorting, setSorting] = useState<SortingState>([]);
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
  const { data: forms } = useQuery({ ...formsQuery, enabled: Boolean(gridKey), refetchOnMount: "always" });
  const saved = gridKey ? allSettings?.[gridKey] : undefined;
  const formKeysSig = formKeys?.join("|");
  const extraFields = useMemo(
    () => (gridKey ? gridFormFields(gridKey, forms, formKeys) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gridKey, forms, formKeysSig],
  );
  const allColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    const ids = new Set(columns.map((c) => c.id));
    const extraDefs: ColumnDef<T, unknown>[] = extraFields
      .filter((f) => !ids.has(fieldColumnId(f)))
      .map((f) => ({
        id: fieldColumnId(f),
        header: f.label,
        accessorFn: (r: T) => {
          const rec = r as Record<string, unknown>;
          return f.column_name ? rec[f.column_name] : (rec["extra"] as Record<string, unknown> | undefined)?.[f.field_key];
        },
        meta: { width: 130, ltr: Boolean(f.settings?.ltr) || f.field_type === "phone" },
        cell: ({ getValue }) => customCell(f, getValue()),
      }));
    return [...columns, ...extraDefs];
  }, [columns, extraFields]);
  const extraIds = useMemo(() => extraFields.filter((f) => !f.column_name).map((f) => customColumnId(f.field_key)), [extraFields]);
  const optionalIds = useMemo(() => extraFields.filter((f) => f.column_name).map(fieldColumnId), [extraFields]);
  const colSettings = useMemo(
    () => (gridKey ? resolveColumns(gridKey, saved, extraIds, optionalIds) : []),
    [gridKey, saved, extraIds, optionalIds],
  );
  const setById = useMemo(() => new Map(colSettings.map((c) => [c.id, c])), [colSettings]);
  const columnOrder = colSettings.map((c) => c.id);
  // Form-field columns the admin has not added yet stay hidden.
  const columnVisibility = {
    ...Object.fromEntries(optionalIds.map((id) => [id, false])),
    ...Object.fromEntries(colSettings.map((c) => [c.id, c.visible])),
  };
  const fontCls = saved?.fontSize === "sm" ? "text-[12.5px]" : saved?.fontSize === "lg" ? "text-[16px]" : "text-[13.5px]";
  const padCls = saved?.density === "compact" ? "py-1" : saved?.density === "comfortable" ? "py-4" : "py-2";
  const fontPx = saved?.fontPx || undefined;
  const lineColor = saved?.lineColor;
  const cellLine = lineColor || "var(--grid-line, rgba(15,23,42,0.10))";
  const headLine = lineColor || "var(--grid-line, rgba(15,23,42,0.16))";
  const headBg = saved?.headerBg || "var(--grid-header-bg, rgba(255,255,255,0.92))";
  const headStyle = {
    backgroundColor: headBg,
    borderColor: headLine,
    ...(saved?.headerText ? { color: saved.headerText } : {}),
    ...(saved?.headerFontPx ? { fontSize: saved.headerFontPx } : {}),
    fontWeight: saved?.headerWeight === "normal" ? 400 : 700,
  };
  const tableStyle = {
    ...(fontPx ? { fontSize: fontPx } : {}),
    ...(saved?.fontFamily ? { fontFamily: saved.fontFamily } : {}),
    ...(saved?.textColor ? { color: saved.textColor } : {}),
    ...(saved?.fontWeight === "bold" ? { fontWeight: 700 } : {}),
  };
  const widthOf = (id: string, fallback?: number | string) => setById.get(id)?.width || fallback;
  const colorOf = (id: string) => setById.get(id)?.color || undefined;
  const alignOf = (id: string, ltr?: boolean) => {
    const a = setById.get(id)?.align;
    if (a === "center") return "text-center";
    if (a === "left") return "text-left";
    if (a === "right") return "text-right";
    return ltr ? "text-left" : "text-right";
  };

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { globalFilter: search, pagination, columnVisibility, columnOrder, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    ...(sortable ? { getSortedRowModel: getSortedRowModel() } : {}),
    globalFilterFn: (row, _colId, filter: string) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return Object.values(row.original as Record<string, unknown>).some((v) =>
        (v && typeof v === "object" ? JSON.stringify(v) : String(v ?? ""))
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
        <table className={`ledger-rows w-full border-collapse ${fontCls}`} style={{ minWidth, ...tableStyle }}>
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="text-[12px] font-bold text-ink/90">
                <th
                  style={headStyle}
                  className="w-10 border-b-2 px-2 py-2.5 text-center font-bold backdrop-blur-xl"
                >
                  {selectable ? (
                    <input
                      type="checkbox"
                      aria-label="تحديد الكل"
                      className="size-4 cursor-pointer accent-[var(--color-brand,#0f766e)]"
                      checked={rows.length > 0 && rows.every((r) => selectedIds!.has(r.id))}
                      onChange={(e) => onSelectionChange!(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                    />
                  ) : (
                    "م"
                  )}
                </th>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{
                      width: widthOf(header.column.id, header.column.columnDef.meta?.width),
                      minWidth: setById.get(header.column.id)?.width || undefined,
                      ...headStyle,
                    }}
                    className={`border-b-2 border-l px-3 py-2.5 ${alignOf(header.column.id, header.column.columnDef.meta?.ltr)} font-bold backdrop-blur-xl first:border-l-0 ${sortable ? "cursor-pointer select-none hover:text-brand" : ""}`}
                    onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder ? null : (
                      <span className="inline-flex items-center gap-1">
                        {setById.get(header.column.id)?.label || flexRender(header.column.columnDef.header, header.getContext())}
                        {sortable &&
                          (header.column.getIsSorted() === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-30" />
                          ))}
                      </span>
                    )}
                  </th>
                ))}
                {rowActions && (
                  <th
                    style={headStyle}
                    className="border-b-2 border-l px-3 py-2.5 text-center font-bold backdrop-blur-xl"
                  >
                    إجراءات
                  </th>
                )}
              </tr>
            ))}
          </thead>
          <tbody className="text-ink/85" style={saved?.textColor ? { color: saved.textColor } : undefined}>
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
                onClick={onRowClick ? () => onRowClick(row.original) : selectable ? () => toggleId(row.id) : undefined}
                data-selected={selectable && selectedIds!.has(row.id) ? "true" : undefined}
                style={{ borderColor: cellLine }}
                className={`border-b transition-colors ${onRowClick || selectable ? "cursor-pointer" : ""} ${selectable && selectedIds!.has(row.id) ? "bg-primary/15" : ""}`}
              >
                <td
                  style={{ borderColor: cellLine }}
                  className={`px-2 ${padCls} text-center text-[12px] font-semibold text-ink/40`}
                  onClick={selectable ? (e) => e.stopPropagation() : undefined}
                >
                  {selectable ? (
                    <label className="flex cursor-pointer items-center justify-center gap-1">
                      <input
                        type="checkbox"
                        aria-label={`تحديد الصف ${i + 1}`}
                        className="size-4 cursor-pointer"
                        checked={selectedIds!.has(row.id)}
                        onChange={() => toggleId(row.id)}
                      />
                    </label>
                  ) : (
                    i + 1
                  )}
                </td>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta ?? {};
                  return (
                    <td
                      key={cell.id}
                      dir={meta.ltr ? "ltr" : undefined}
                      style={{
                        ...(colorOf(cell.column.id) ? { backgroundColor: colorOf(cell.column.id) } : {}),
                        ...(setById.get(cell.column.id)?.textColor ? { color: setById.get(cell.column.id)?.textColor } : {}),
                        ...(setById.get(cell.column.id)?.bold ? { fontWeight: 700 } : {}),
                        borderColor: cellLine,
                      }}
                      className={`border-l px-3 ${padCls} align-middle break-words first:border-l-0 ${alignOf(
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
                    style={{ borderColor: cellLine }}
                    className="border-l px-3 py-2 align-middle"
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
            <option value={ALL_ROWS}>كل الأسطر</option>
          </select>
        </div>
      </div>
    </div>
  );
}
