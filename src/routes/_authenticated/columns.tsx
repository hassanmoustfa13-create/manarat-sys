import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/data";
import { useRowPalette, type RowPalette } from "@/lib/rowPalette";
import {
  GRID_COLUMNS,
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

const KEYS: GridKey[] = ["requests", "workers", "transfers", "manual_transfers", "flights", "departures", "office_visas"];
const sel = "glass h-9 rounded-lg px-2 text-[13px] outline-none";

function ColumnsPage() {
  const auth = useAuth();
  const [palette, setPalette] = useRowPalette();
  const qc = useQueryClient();
  const { data: all } = useQuery({ ...gridSettingsQuery, enabled: auth.can("admin_columns", "view") });
  const [key, setKey] = useState<GridKey>("workers");
  const [draft, setDraft] = useState<GridSettings>({});

  useEffect(() => {
    const saved = all?.[key];
    setDraft({
      fontSize: saved?.fontSize ?? "md",
      density: saved?.density ?? "normal",
      columns: resolveColumns(key, saved),
      inlineSelectEdit: saved?.inlineSelectEdit ?? false,
    });
  }, [all, key]);

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
  const labels = Object.fromEntries(GRID_COLUMNS[key]);
  const update = (i: number, patch: Partial<ColumnSetting>) =>
    setDraft((d) => ({ ...d, columns: cols.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
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
        <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">ألوان صفوف الجداول (على هذا الجهاز):</span>
          <select
            className={sel}
            value={palette}
            onChange={(e) => {
              const p = e.target.value as RowPalette;
              setPalette(p)
                .then(() => toast.success("تم حفظ ألوان الصفوف لجميع المستخدمين"))
                .catch((err) => toast.error(errorMessage(err)));
            }}
          >
            <option value="soft">ألوان متنوعة هادئة</option>
            <option value="contrast">تباين عالٍ (أبيض / أزرق، وتحديد داكن)</option>
            <option value="light">فاتح (أبيض / رمادي فاتح)</option>
            <option value="dark">غامق (كحلي / رمادي داكن، نص أبيض)</option>
          </select>
        </label>
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

      <div className="overflow-hidden rounded-xl bg-white/60 ring-1 ring-black/8">
        <div className="grid grid-cols-[60px_1fr_90px_130px_130px_90px] gap-2 border-b border-black/10 px-4 py-3 text-[13px] font-bold text-ink/70">
          <span>الترتيب</span>
          <span>اسم العمود (اكتب اسمًا جديدًا)</span>
          <span>الظهور</span>
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
            className={`grid cursor-grab grid-cols-[60px_1fr_90px_130px_130px_90px] items-center gap-2 border-b border-black/5 px-4 py-2 text-sm transition-colors active:cursor-grabbing ${
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
          onClick={() => save.mutate({ fontSize: "md", density: "normal", columns: resolveColumns(key, null) })}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ring-1 ring-black/10"
        >
          <RotateCcw className="size-4" /> استعادة الافتراضي
        </button>
      </div>
    </div>
  );
}
