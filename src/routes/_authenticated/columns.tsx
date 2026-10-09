import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/data";
import { useRowPalette, type RowColorSettings, type RowMode, type RowPalette } from "@/lib/rowPalette";
import { formsQuery } from "@/lib/forms";
import {
  customColumnId,
  customFields,
  fieldColumnId,
  gridColumnList,
  gridFormFields,
  GRID_FORMS,
  optionalFieldIds,
  GRID_LABELS,
  gridSettingsQuery,
  resolveColumns,
  saveGridSettings,
  type ColAlign,
  type ColumnSetting,
  type GridKey,
  type GridSettings,
} from "@/lib/gridSettings";

export const Route = createFileRoute("/_authenticated/columns")({
  head: () => ({
    meta: [
      { title: "إعدادات الجداول — منارات هجر للاستقدام" },
      { name: "description", content: "التحكم في ترتيب وحجم وظهور أعمدة الجداول" },
      { property: "og:title", content: "إعدادات الجداول — منارات هجر للاستقدام" },
      { property: "og:description", content: "التحكم في ترتيب وحجم وظهور أعمدة الجداول" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ColumnsPage,
});

const KEYS: GridKey[] = ["requests", "workers", "transfers", "manual_transfers", "flights", "departures", "office_visas", "archive"];
const sel = "glass h-9 rounded-lg px-2 text-[13px] outline-none";

function ColumnsPage() {
  const auth = useAuth();
  const [paletteSettings, updatePalette] = useRowPalette();
  const savePalette = (patch: Partial<RowColorSettings>) =>
    updatePalette(patch)
      .then(() => toast.success("تم حفظ ألوان الجداول لجميع المستخدمين"))
      .catch((err) => toast.error(errorMessage(err)));
  const qc = useQueryClient();
  const { data: all } = useQuery({ ...gridSettingsQuery, enabled: auth.can("admin_columns", "view") });
  const [key, setKey] = useState<GridKey>("workers");
  const [draft, setDraft] = useState<GridSettings>({});
  // Always refetch so fields just added in form management are offered here.
  const { data: forms } = useQuery({ ...formsQuery, refetchOnMount: "always" });
  const extraIds = customFields(key, forms).map((f) => customColumnId(f.field_key));
  const optionalIds = optionalFieldIds(key, forms);
  const extraSig = [...extraIds, "|", ...optionalIds].join("|");

  useEffect(() => {
    const saved = all?.[key];
    setDraft({
      fontSize: saved?.fontSize ?? "md",
      density: saved?.density ?? "normal",
      fontPx: saved?.fontPx ?? null,
      headerFontPx: saved?.headerFontPx ?? null,
      fontWeight: saved?.fontWeight ?? "normal",
      headerWeight: saved?.headerWeight ?? "bold",
      fontFamily: saved?.fontFamily ?? "",
      headerBg: saved?.headerBg,
      headerText: saved?.headerText,
      textColor: saved?.textColor,
      lineColor: saved?.lineColor,
      columns: resolveColumns(key, saved, extraIds, optionalIds),
      inlineSelectEdit: saved?.inlineSelectEdit ?? false,
      archiveCondition: saved?.archiveCondition ?? null,
      archiveConditions:
        saved?.archiveConditions ??
        (saved?.archiveCondition ? [saved.archiveCondition] : []),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, key, extraSig]);

  const save = useMutation({
    mutationFn: async (s: GridSettings) => {
      await saveGridSettings(key, s);
      // The inline dropdown switch applies to every table at once.
      for (const k of KEYS) {
        if (k === key) continue;
        const other = all?.[k] ?? {};
        if ((other.inlineSelectEdit ?? false) !== (s.inlineSelectEdit ?? false))
          await saveGridSettings(k, { ...other, inlineSelectEdit: s.inlineSelectEdit ?? false });
      }
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الجدول");
      qc.invalidateQueries({ queryKey: gridSettingsQuery.queryKey });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!auth.loading && !auth.can("admin_columns", "view")) {
    return <div className="p-10 text-center text-muted-foreground">هذه الصفحة متاحة للمدير فقط</div>;
  }

  const cols = draft.columns ?? [];
  const labels = Object.fromEntries(gridColumnList(key, forms));
  const update = (i: number, patch: Partial<ColumnSetting>) =>
    setDraft((d) => ({ ...d, columns: cols.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  // Form fields of this table's forms that are not a visible column yet (newest form fields included).
  const formFieldIds = gridFormFields(key, forms).map(fieldColumnId);
  const formNameOf = (id: string) =>
    forms
      ?.filter((f) => (GRID_FORMS[key] ?? []).includes(f.form_key))
      .find((f) => f.form_fields.some((ff) => fieldColumnId(ff) === id))?.name;
  const isShown = (id: string) => cols.some((c) => c.id === id && c.visible);
  const addableFields = formFieldIds.filter((id) => !isShown(id));
  const addableHidden = cols.filter((c) => !c.visible && !formFieldIds.includes(c.id)).map((c) => c.id);
  const addable = [...addableFields, ...addableHidden];
  const addColumn = (id: string) => {
    if (!id) return;
    const i = cols.findIndex((c) => c.id === id);
    if (i >= 0) update(i, { visible: true });
    else setDraft((d) => ({ ...d, columns: [...cols, { id, visible: true, width: 130 }] }));
    toast.success(`أُضيف عمود «${labels[id] ?? id}» — اضغط «حفظ الإعدادات» لتطبيقه`);
  };
  const removeColumn = (i: number) => setDraft((d) => ({ ...d, columns: cols.filter((_, j) => j !== i) }));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cols.length) return;
    const next = [...cols];
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
    setDraft((d) => ({ ...d, columns: next }));
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-bold">إعدادات الجداول</h1>
        <p className="text-sm text-muted-foreground">
          تحكم في ترتيب الأعمدة وعرضها ومحاذاتها والأعمدة الظاهرة — تُطبّق على جميع المستخدمين.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="font-semibold">ألوان الجداول (لجميع المستخدمين):</span>
            <select
              className={sel}
              value={paletteSettings.palette}
              onChange={(e) => savePalette({ palette: e.target.value as RowPalette })}
            >
              <option value="soft">ألوان متنوعة هادئة</option>
              <option value="contrast">تباين عالٍ (أبيض / أزرق)</option>
              <option value="light">فاتح (أبيض / رمادي فاتح)</option>
              <option value="dark">غامق (كحلي / رمادي داكن، نص أبيض)</option>
              <option value="custom">مخصصة (أختار الألوان بنفسي)</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold">التلوين على:</span>
            <select
              className={sel}
              value={paletteSettings.mode}
              onChange={(e) => savePalette({ mode: e.target.value as RowMode })}
            >
              <option value="rows">الصفوف</option>
              <option value="columns">الأعمدة</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold">خلفية رؤوس الأعمدة:</span>
            <input
              type="color"
              value={paletteSettings.headerBg ?? "#ffffff"}
              onChange={(e) => savePalette({ headerBg: e.target.value })}
              className="h-9 w-11 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5"
              title="لون خلفية رؤوس الأعمدة"
            />
            {paletteSettings.headerBg && (
              <button
                onClick={() => savePalette({ headerBg: undefined })}
                className="text-[12px] text-ink/50 underline hover:text-ink"
              >
                افتراضي
              </button>
            )}
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold">لون خطوط الجدول:</span>
            <input
              type="color"
              value={paletteSettings.gridLine ?? "#c9cede"}
              onChange={(e) => savePalette({ gridLine: e.target.value })}
              className="h-9 w-11 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5"
              title="لون الخطوط الفاصلة بين الصفوف والأعمدة"
            />
            {paletteSettings.gridLine && (
              <button
                onClick={() => savePalette({ gridLine: undefined })}
                className="text-[12px] text-ink/50 underline hover:text-ink"
              >
                افتراضي
              </button>
            )}
          </label>
          {paletteSettings.palette === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">ألواني:</span>
              {paletteSettings.colors.map((c, i) => (
                <input
                  key={i}
                  type="color"
                  value={c}
                  onChange={(e) => {
                    const colors = [...paletteSettings.colors];
                    colors[i] = e.target.value;
                    savePalette({ colors });
                  }}
                  className="h-9 w-11 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5"
                  title={`اللون ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setKey(k)}
            className={`rounded-lg px-4 py-2 text-sm ring-1 ${
              k === key ? "bg-brand/12 font-medium text-brand ring-brand/20" : "bg-white/60 ring-black/8"
            }`}
          >
            {GRID_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="glass flex flex-wrap items-center gap-4 rounded-xl p-4">
        <label className="flex items-center gap-2 text-sm">
          حجم الخط
          <select
            className={sel}
            value={draft.fontSize}
            onChange={(e) => setDraft((d) => ({ ...d, fontSize: e.target.value as GridSettings["fontSize"] }))}
          >
            <option value="sm">صغير</option>
            <option value="md">متوسط</option>
            <option value="lg">كبير</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          حجم خط الخلايا (px)
          <input type="number" min={9} max={32} placeholder="تلقائي" className={`${sel} w-20`} value={draft.fontPx ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, fontPx: e.target.value ? Number(e.target.value) : null }))} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          وزن خط الخلايا
          <select className={sel} value={draft.fontWeight ?? "normal"} onChange={(e) => setDraft((d) => ({ ...d, fontWeight: e.target.value as "normal" | "bold" }))}>
            <option value="normal">عادي</option>
            <option value="bold">عريض Bold</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          حجم خط الرؤوس (px)
          <input type="number" min={9} max={32} placeholder="تلقائي" className={`${sel} w-20`} value={draft.headerFontPx ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, headerFontPx: e.target.value ? Number(e.target.value) : null }))} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          وزن خط الرؤوس
          <select className={sel} value={draft.headerWeight ?? "bold"} onChange={(e) => setDraft((d) => ({ ...d, headerWeight: e.target.value as "normal" | "bold" }))}>
            <option value="bold">عريض Bold</option>
            <option value="normal">عادي</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          نوع الخط
          <select className={sel} value={draft.fontFamily ?? ""} onChange={(e) => setDraft((d) => ({ ...d, fontFamily: e.target.value }))}>
            <option value="">افتراضي</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Tahoma, sans-serif">Tahoma</option>
            <option value="'Segoe UI', sans-serif">Segoe UI</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Cairo, sans-serif">Cairo</option>
          </select>
        </label>
        {([
          ["headerBg", "خلفية الرؤوس", "#ffffff"],
          ["headerText", "نص الرؤوس", "#000000"],
          ["textColor", "نص الخلايا", "#000000"],
          ["lineColor", "لون الخطوط", "#000000"],
        ] as const).map(([k, label, def]) => (
          <span key={k} className="flex items-center gap-1 text-sm">
            {label}
            <input type="color" aria-label={label} value={(draft[k] as string | undefined) ?? def}
              onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
              className="h-8 w-8 cursor-pointer rounded-md border border-black/10 bg-transparent p-0.5" />
            {draft[k] && (
              <button aria-label="إزالة" onClick={() => setDraft((d) => ({ ...d, [k]: undefined }))} className="rounded p-0.5 text-ink/50 hover:bg-black/5">✕</button>
            )}
          </span>
        ))}
        <button
          type="button"
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-primary-foreground"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              fontPx: 15, headerFontPx: 15, fontWeight: "bold", headerWeight: "bold", fontFamily: "Arial, sans-serif",
              headerBg: "#ffffff", headerText: "#000000", textColor: "#000000", lineColor: "#000000",
              columns: d.columns?.map((c) => {
                const id = c.id.toLowerCase();
                const color = /remain|balance/.test(id) ? "#bfbfbf"
                  : /deposit|arbo|down/.test(id) ? "#fff2cc"
                  : /payment/.test(id) ? "#e2efda"
                  : /date/.test(id) ? "#bdd7ee"
                  : /note/.test(id) ? "#c6e0b4"
                  : /visa/.test(id) ? "#f8cbad"
                  : "#ffffff";
                return { ...c, color, bold: true };
              }),
            }))
          }
        >
          تطبيق نمط جوجل شيت
        </button>
        <label className="flex items-center gap-2 text-sm">
          ارتفاع الصفوف
          <select
            className={sel}
            value={draft.density}
            onChange={(e) => setDraft((d) => ({ ...d, density: e.target.value as GridSettings["density"] }))}
          >
            <option value="compact">مضغوط</option>
            <option value="normal">عادي</option>
            <option value="comfortable">واسع</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.inlineSelectEdit === true}
            onChange={(e) => setDraft((d) => ({ ...d, inlineSelectEdit: e.target.checked }))}
          />
          تعديل القوائم المنسدلة مباشرة من الجدول في كل الجداول (للمدير فقط)
        </label>
      </div>

      {key === "manual_transfers" && (
        <div className="glass rounded-xl p-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">زر الأرشفة يظهر عند تحقق أي شرط مما يلي:</span>
            <button
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  archiveConditions: [...(d.archiveConditions ?? []), { column: "", value: "" }],
                }))
              }
              className="rounded-lg bg-brand/12 px-3 py-1.5 text-[13px] font-medium text-brand ring-1 ring-brand/20"
            >
              + إضافة شرط
            </button>
          </div>
          {(draft.archiveConditions ?? []).length === 0 && (
            <div className="mt-2 text-muted-foreground">
              لا شروط — يظهر الزر بالسلوك الافتراضي (مرحلة النقل = تم النقل)
            </div>
          )}
          {(draft.archiveConditions ?? []).map((cond, i) => (
            <div key={i} className="mt-2 flex flex-wrap items-center gap-2">
              <select
                className={sel}
                value={cond.column}
                onChange={(e) =>
                  setDraft((d) => {
                    const list = [...(d.archiveConditions ?? [])];
                    list[i] = { ...list[i]!, column: e.target.value };
                    return { ...d, archiveConditions: list, archiveCondition: null };
                  })
                }
              >
                <option value="">اختر العمود…</option>
                {cols.map((c) => (
                  <option key={c.id} value={c.id}>{labels[c.id] ?? c.id}</option>
                ))}
              </select>
              <span>تساوي</span>
              <input
                className={`${sel} min-w-40`}
                placeholder="اكتب القيمة المطلوبة…"
                value={cond.value}
                onChange={(e) =>
                  setDraft((d) => {
                    const list = [...(d.archiveConditions ?? [])];
                    list[i] = { ...list[i]!, value: e.target.value };
                    return { ...d, archiveConditions: list, archiveCondition: null };
                  })
                }
              />
              <button
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    archiveConditions: (d.archiveConditions ?? []).filter((_, j) => j !== i),
                  }))
                }
                className="text-[12px] text-red-600 underline hover:text-red-700"
              >
                حذف
              </button>
            </div>
          ))}
          <div className="mt-2 text-xs text-muted-foreground">ثم اضغط «حفظ الإعدادات»</div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/60 px-4 py-3 text-sm ring-1 ring-black/8">
        <Plus className="size-4 text-brand" />
        <span className="font-semibold">إضافة عمود من حقول النموذج:</span>
        <select
          aria-label="إضافة عمود"
          className={`${sel} min-w-56`}
          value=""
          disabled={addable.length === 0}
          onChange={(e) => addColumn(e.target.value)}
        >
          <option value="">{addable.length ? "اختر الحقل…" : "كل الحقول ظاهرة في الجدول"}</option>
          {addableFields.length > 0 && (
            <optgroup label="حقول النموذج">
              {addableFields.map((id) => (
                <option key={id} value={id}>
                  {labels[id] ?? id}
                  {formNameOf(id) ? ` — ${formNameOf(id)}` : ""}
                </option>
              ))}
            </optgroup>
          )}
          {addableHidden.length > 0 && (
            <optgroup label="أعمدة مخفية">
              {addableHidden.map((id) => (
                <option key={id} value={id}>
                  {labels[id] ?? id}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <span className="text-[12px] text-ink/50">
          {GRID_FORMS[key]
            ? "تظهر هنا حقول نموذج هذا الجدول (ومنها الحقول المضافة حديثًا) والأعمدة المخفية."
            : "هذا الجدول لا يُبنى من نموذج، لذا تظهر هنا أعمدته المخفية فقط."}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl bg-white/60 ring-1 ring-black/8">
        <div className="grid grid-cols-[60px_1fr_90px_70px_130px_130px_90px] gap-2 border-b border-black/10 px-4 py-3 text-[13px] font-bold text-ink/70">
          <span>الترتيب</span>
          <span>اسم العمود (اكتب اسمًا جديدًا)</span>
          <span>الظهور</span>
          <span>لون الخلايا</span>
          <span>العرض (بكسل)</span>
          <span>المحاذاة</span>
          <span>تحريك</span>
        </div>
        {cols.map((c, i) => (
          <div
            key={c.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("bg-brand/10");
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove("bg-brand/10")}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("bg-brand/10");
              const from = Number(e.dataTransfer.getData("text/plain"));
              if (Number.isNaN(from) || from === i) return;
              const next = [...cols];
              const [item] = next.splice(from, 1);
              next.splice(i, 0, item!);
              setDraft((d) => ({ ...d, columns: next }));
            }}
            className={`grid cursor-grab grid-cols-[60px_1fr_90px_70px_130px_130px_90px] items-center gap-2 border-b border-black/5 px-4 py-2 text-sm transition-colors active:cursor-grabbing ${
              c.visible ? "" : "opacity-50"
            }`}
          >
            <span className="flex items-center gap-1 font-semibold text-ink/40">
              <GripVertical className="size-4" />
              {i + 1}
            </span>
            <input
              aria-label="اسم العمود"
              value={c.label ?? ""}
              placeholder={labels[c.id]}
              title={`الاسم الأصلي: ${labels[c.id]}`}
              draggable={false}
              onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onChange={(e) => update(i, { label: e.target.value || undefined })}
              className="h-8 min-w-0 rounded-md bg-white/70 px-2 font-medium ring-1 ring-black/10 placeholder:text-ink/70 focus:ring-brand"
            />
            <button
              onClick={() => update(i, { visible: !c.visible })}
              className="inline-flex items-center gap-1 text-[13px]"
            >
              {c.visible ? <Eye className="size-4 text-brand" /> : <EyeOff className="size-4" />}
              {c.visible ? "ظاهر" : "مخفي"}
            </button>
            <span className="flex items-center gap-1">
              <input
                type="color"
                aria-label="لون العمود"
                title={c.color ? "لون خلايا العمود — اضغط ✕ للإزالة (رؤوس الأعمدة تبقى ثابتة)" : "اختر لونًا لخلايا العمود (رؤوس الأعمدة تبقى ثابتة)"}
                value={c.color ?? "#ffffff"}
                onChange={(e) => update(i, { color: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded-md border border-black/10 bg-transparent p-0.5"
              />
              <input
                type="color"
                aria-label="لون نص العمود"
                title="لون نص العمود"
                value={c.textColor ?? "#000000"}
                onChange={(e) => update(i, { textColor: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded-md border border-black/10 bg-transparent p-0.5"
              />
              <button
                type="button"
                title="خط عريض"
                onClick={() => update(i, { bold: !c.bold })}
                className={`h-8 w-8 rounded-md font-black ring-1 ring-black/10 ${c.bold ? "bg-brand text-primary-foreground" : "bg-white/70"}`}
              >
                B
              </button>
              {c.color && (
                <button
                  aria-label="إزالة اللون"
                  title="إزالة اللون"
                  onClick={() => update(i, { color: undefined })}
                  className="rounded p-0.5 text-ink/50 hover:bg-black/5 hover:text-ink"
                >
                  ✕
                </button>
              )}
            </span>
            <input
              type="number"
              min={60}
              max={600}
              placeholder="تلقائي"
              value={c.width ?? ""}
              onChange={(e) => update(i, { width: e.target.value ? Number(e.target.value) : null })}
              className={`${sel} w-full`}
            />
            <select
              value={c.align ?? ""}
              onChange={(e) => update(i, { align: (e.target.value || undefined) as ColAlign | undefined })}
              className={`${sel} w-full`}
            >
              <option value="">افتراضي</option>
              <option value="right">يمين</option>
              <option value="center">وسط</option>
              <option value="left">يسار</option>
            </select>
            <div className="flex gap-1">
              <button aria-label="أعلى" onClick={() => move(i, -1)} className="rounded p-1.5 hover:bg-black/5">
                <ArrowUp className="size-4" />
              </button>
              <button aria-label="أسفل" onClick={() => move(i, 1)} className="rounded p-1.5 hover:bg-black/5">
                <ArrowDown className="size-4" />
              </button>
              {optionalIds.includes(c.id) && (
                <button aria-label="إزالة العمود" title="إزالة العمود من الجدول" onClick={() => removeColumn(i)} className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => save.mutate(draft)}
          disabled={save.isPending}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {save.isPending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
        </button>
        <button
          onClick={() => save.mutate({ fontSize: "md", density: "normal", columns: resolveColumns(key, null, extraIds) })}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ring-1 ring-black/10"
        >
          <RotateCcw className="size-4" /> استعادة الافتراضي
        </button>
      </div>
    </div>
  );
}
