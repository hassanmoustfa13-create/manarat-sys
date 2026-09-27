import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Loader2, Upload, Download, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  IMPORT_TARGETS,
  autoMatchField,
  buildRecord,
  dedupeKey,
  normalizeAr,
  type ImportTarget,
  type ValidatedRow,
} from "@/lib/excelImport";
import { logImport } from "@/lib/import.functions";
import { errorMessage } from "@/lib/data";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface Report {
  total: number;
  added: number;
  skipped: number;
  failed: { index: number; reason: string }[];
  seconds: number;
}

export function ExcelImportDialog({
  targetKey,
  open,
  onOpenChange,
  onImported,
}: {
  targetKey: keyof typeof IMPORT_TARGETS;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}) {
  const target: ImportTarget = IMPORT_TARGETS[targetKey];
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [validated, setValidated] = useState<ValidatedRow[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep(1);
    setFileName("");
    setWorkbook(null);
    setSheetName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setValidated([]);
    setReport(null);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  // الخطوة 1: رفع الملف
  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      setWorkbook(wb);
      setFileName(file.name);
      if (wb.SheetNames.length === 1) {
        pickSheet(wb, wb.SheetNames[0]);
      } else {
        setStep(2);
      }
    } catch {
      toast.error("تعذر قراءة الملف — تأكد أنه ملف Excel صالح (.xlsx أو .xls)");
    } finally {
      setBusy(false);
    }
  };

  // الخطوة 2: اختيار الورقة
  const pickSheet = (wb: XLSX.WorkBook, name: string) => {
    const ws = wb.Sheets[name];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });
    const nonEmpty = grid.filter((r) => r.some((c) => c !== "" && c != null));
    if (nonEmpty.length < 2) {
      toast.error("الورقة فارغة أو لا تحتوي على بيانات");
      return;
    }
    const hdrs = (nonEmpty[0] as unknown[]).map((h, i) => (String(h ?? "").trim() || `عمود ${i + 1}`));
    setHeaders(hdrs);
    setRows(nonEmpty.slice(1));
    setSheetName(name);
    // مطابقة تلقائية
    const auto: Record<number, string> = {};
    const used = new Set<string>();
    hdrs.forEach((h, i) => {
      const key = autoMatchField(h, target.fields);
      if (key && !used.has(key)) {
        auto[i] = key;
        used.add(key);
      }
    });
    setMapping(auto);
    setStep(3);
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  // الخطوة 4: المعاينة والتحقق
  const buildPreview = async () => {
    if (mappedCount === 0) {
      toast.error("طابق عمودًا واحدًا على الأقل قبل المتابعة");
      return;
    }
    setBusy(true);
    try {
      // جلب البيانات الموجودة لمنع التكرار + ربط العمالة
      let workerLookup: Map<string, { id: string; category: string }> | undefined;
      const existing = new Set<string>();
      if (target.table === "workers") {
        const { data } = await supabase.from("workers").select("passport_number");
        for (const w of data ?? []) if (w.passport_number) existing.add(normalizeAr(w.passport_number));
      } else if (target.table === "requests") {
        const { data } = await supabase.from("requests").select("customer_name, phone");
        for (const r of data ?? []) existing.add(`${normalizeAr(r.customer_name)}|${normalizeAr(r.phone)}`);
      } else if (target.table === "office_visas") {
        const { data } = await supabase.from("office_visas").select("visa_number");
        for (const v of data ?? []) if (v.visa_number) existing.add(normalizeAr(v.visa_number));
      } else if (target.table === "transfers") {
        const { data: ws } = await supabase.from("workers").select("id, name, passport_number, profession");
        workerLookup = new Map();
        const PRO = ["عاملة مهنية", "مهني"];
        for (const w of ws ?? []) {
          const cat = PRO.includes(w.profession) ? "مهنية" : "منزلية";
          if (w.name) workerLookup.set(normalizeAr(w.name), { id: w.id, category: cat });
          if (w.passport_number) workerLookup.set(normalizeAr(w.passport_number), { id: w.id, category: cat });
        }
        const { data: trs } = await supabase.from("transfers").select("worker_id, new_sponsor_name, transfer_date");
        for (const t of trs ?? []) existing.add(`${normalizeAr(t.worker_id)}|${normalizeAr(t.new_sponsor_name)}|${normalizeAr(t.transfer_date ?? "")}`);
      }

      const seen = new Set<string>();
      const out: ValidatedRow[] = rows.map((row, i) => {
        const { record, errors } = buildRecord(row, mapping, target, workerLookup);
        let duplicate = false;
        if (errors.length === 0) {
          const key =
            target.table === "workers"
              ? normalizeAr(String(record.passport_number ?? ""))
              : target.table === "requests"
                ? `${normalizeAr(String(record.customer_name ?? ""))}|${normalizeAr(String(record.phone ?? ""))}`
                : target.table === "office_visas"
                  ? normalizeAr(String(record.visa_number ?? ""))
                  : dedupeKey(record, ["worker_id", "new_sponsor_name", "transfer_date"]);
          const emptyKey = key.replace(/\|/g, "") === "";
          if (!emptyKey && (existing.has(key) || seen.has(key))) duplicate = true;
          seen.add(key);
        }
        return { index: i + 2, record, errors, duplicate };
      });
      setValidated(out);
      setStep(4);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(() => {
    const valid = validated.filter((r) => r.errors.length === 0 && !r.duplicate);
    return {
      total: validated.length,
      valid: valid.length,
      errors: validated.filter((r) => r.errors.length > 0).length,
      dupes: validated.filter((r) => r.duplicate && r.errors.length === 0).length,
    };
  }, [validated]);

  // الخطوة 5: تنفيذ الاستيراد
  const doImport = async () => {
    const good = validated.filter((r) => r.errors.length === 0 && !r.duplicate);
    if (good.length === 0) {
      toast.error("لا توجد صفوف صالحة للاستيراد");
      return;
    }
    setStep(5);
    const started = Date.now();
    const failed: { index: number; reason: string }[] = [];
    let added = 0;
    // إدراج على دفعات، وعند فشل الدفعة نعيد صفًا صفًا لتحديد الأخطاء
    const CHUNK = 100;
    for (let i = 0; i < good.length; i += CHUNK) {
      const chunk = good.slice(i, i + CHUNK);
      const { error } = await supabase.from(target.table).insert(chunk.map((r) => r.record));
      if (!error) {
        added += chunk.length;
      } else {
        for (const r of chunk) {
          const { error: e2 } = await supabase.from(target.table).insert(r.record);
          if (e2) failed.push({ index: r.index, reason: e2.message });
          else added += 1;
        }
      }
    }
    const rep: Report = {
      total: validated.length,
      added,
      skipped: stats.dupes,
      failed: [...validated.filter((r) => r.errors.length > 0).map((r) => ({ index: r.index, reason: r.errors.join("؛ ") })), ...failed],
      seconds: Math.round((Date.now() - started) / 100) / 10,
    };
    setReport(rep);
    setStep(6);
    qc.invalidateQueries();
    onImported();
    toast.success(`تم الاستيراد: أُضيف ${added} سجل`);
    try {
      await logImport({
        data: {
          table: target.table,
          fileName,
          total: rep.total,
          added: rep.added,
          skipped: rep.skipped,
          failed: rep.failed.length,
          errors: rep.failed.slice(0, 10).map((f) => `صف ${f.index}: ${f.reason}`).join(" | "),
        },
      });
    } catch {
      // التسجيل لا يوقف العملية
    }
  };

  const downloadErrors = () => {
    if (!report || report.failed.length === 0) return;
    const csv = "﻿رقم الصف,سبب الفشل\n" + report.failed.map((f) => `${f.index},"${f.reason.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `اخطاء-الاستيراد-${target.table}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const stepTitles = ["رفع الملف", "اختيار الورقة", "مطابقة الأعمدة", "المعاينة والتحقق", "جارٍ الاستيراد", "التقرير"];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-brand" />
            استيراد من Excel — {target.label}
          </DialogTitle>
        </DialogHeader>

        {/* شريط الخطوات */}
        <div className="mb-4 flex flex-wrap items-center gap-1 text-[11px]">
          {stepTitles.map((t, i) => (
            <span key={t} className={`rounded-full px-2.5 py-1 ${step === i + 1 ? "bg-brand text-white" : step > i + 1 ? "bg-teal-100 text-teal-800" : "bg-black/5 text-ink/45"}`}>
              {i + 1}. {t}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Upload className="size-12 text-ink/25" />
            <p className="text-sm text-ink/60">اختر ملف Excel بصيغة .xlsx أو .xls — لن يتم إدراج أي بيانات قبل المعاينة والتأكيد</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              اختيار ملف
            </Button>
          </div>
        )}

        {step === 2 && workbook && (
          <div className="space-y-3">
            <p className="text-sm text-ink/60">الملف: <b>{fileName}</b> — اختر ورقة العمل المطلوب استيرادها:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {workbook.SheetNames.map((n) => (
                <button key={n} type="button" onClick={() => pickSheet(workbook, n)} className="glass rounded-lg px-4 py-3 text-right text-sm hover:ring-2 hover:ring-brand/30">
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-ink/60">
              الورقة: <b>{sheetName}</b> — {rows.length} صف. طابق أعمدة الملف مع حقول «{target.label}» (المطابقة التلقائية جاهزة ويمكن تعديلها):
            </p>
            <div className="overflow-x-auto rounded-lg ring-1 ring-black/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-black/4 text-[12px]">
                    <th className="px-3 py-2 text-right">عمود الملف</th>
                    <th className="px-3 py-2 text-right">مثال من البيانات</th>
                    <th className="px-3 py-2 text-right">الحقل في النظام</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h, i) => {
                    const matched = mapping[i] ?? "";
                    return (
                      <tr key={i} className="border-t border-black/5">
                        <td className="px-3 py-2 font-medium">{h}</td>
                        <td className="max-w-40 truncate px-3 py-2 text-[12px] text-ink/50">
                          {rows[0]?.[i] instanceof Date ? String(rows[0][i]) : String(rows[0]?.[i] ?? "—")}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={matched}
                            onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value }))}
                            className={`h-8 w-full rounded-md px-2 text-[13px] ring-1 ${matched ? "bg-teal-50 ring-teal-200" : "bg-amber-50 ring-amber-200"}`}
                          >
                            <option value="">— تجاهل هذا العمود —</option>
                            {target.fields.map((f) => (
                              <option key={f.key} value={f.key} disabled={Object.entries(mapping).some(([c, k]) => k === f.key && Number(c) !== i)}>
                                {f.label}{f.required ? " *" : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-ink/50">الأعمدة غير المطابقة (باللون الأصفر) سيتم تجاهلها ولن تُنشأ لها حقول جديدة.</p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(workbook && workbook.SheetNames.length > 1 ? 2 : 1)} className="gap-1">
                <ArrowRight className="size-4" /> رجوع
              </Button>
              <Button onClick={buildPreview} disabled={busy || mappedCount === 0} className="gap-1">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />} معاينة البيانات
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="صفوف الملف" value={stats.total} />
              <Stat label="صالحة للاستيراد" value={stats.valid} tone="ok" />
              <Stat label="بها أخطاء" value={stats.errors} tone="err" />
              <Stat label="مكررة (سيتم تخطيها)" value={stats.dupes} tone="warn" />
            </div>
            <div className="max-h-80 overflow-auto rounded-lg ring-1 ring-black/8">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-black/4">
                    <th className="px-2 py-1.5 text-right">الصف</th>
                    <th className="px-2 py-1.5 text-right">الحالة</th>
                    {Object.values(mapping).filter(Boolean).slice(0, 5).map((k) => (
                      <th key={k} className="px-2 py-1.5 text-right">{target.fields.find((f) => f.key === k)?.label}</th>
                    ))}
                    <th className="px-2 py-1.5 text-right">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {validated.slice(0, 200).map((r) => (
                    <tr key={r.index} className={`border-t border-black/5 ${r.errors.length ? "bg-red-50/60" : r.duplicate ? "bg-amber-50/60" : ""}`}>
                      <td className="px-2 py-1.5">{r.index}</td>
                      <td className="px-2 py-1.5">
                        {r.errors.length ? <span className="pill bg-red-100 text-red-700">خطأ</span> : r.duplicate ? <span className="pill bg-amber-100 text-amber-700">مكرر</span> : <span className="pill bg-teal-100 text-teal-700">صالح</span>}
                      </td>
                      {Object.values(mapping).filter(Boolean).slice(0, 5).map((k) => (
                        <td key={k} className="max-w-32 truncate px-2 py-1.5">{String(r.record[k] ?? "—")}</td>
                      ))}
                      <td className="max-w-56 truncate px-2 py-1.5 text-red-600">{r.errors.join("؛ ") || (r.duplicate ? "سجل مطابق موجود مسبقًا" : "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validated.length > 200 && <p className="px-3 py-2 text-[11px] text-ink/45">تُعرض أول 200 صف فقط في المعاينة — ستتم معالجة كل الصفوف عند الاستيراد.</p>}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-1">
                <ArrowRight className="size-4" /> تعديل المطابقة
              </Button>
              <Button onClick={doImport} disabled={stats.valid === 0} className="gap-1 bg-teal-600 hover:bg-teal-700">
                تأكيد الاستيراد ({stats.valid} سجل)
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-10 animate-spin text-brand" />
            <p className="text-sm text-ink/60">جارٍ استيراد البيانات… لا تغلق النافذة</p>
          </div>
        )}

        {step === 6 && report && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="صفوف الملف" value={report.total} />
              <Stat label="تمت إضافتها" value={report.added} tone="ok" />
              <Stat label="تُخطيت (مكررة)" value={report.skipped} tone="warn" />
              <Stat label="فشلت" value={report.failed.length} tone="err" />
            </div>
            <p className="text-[12px] text-ink/50">مدة التنفيذ: {report.seconds} ثانية — سُجلت العملية في سجل الأحداث.</p>
            {report.failed.length > 0 && (
              <>
                <div className="max-h-52 overflow-auto rounded-lg bg-red-50/60 p-3 text-[12px] ring-1 ring-red-100">
                  {report.failed.slice(0, 50).map((f) => (
                    <p key={f.index} className="py-0.5 text-red-700">صف {f.index}: {f.reason}</p>
                  ))}
                  {report.failed.length > 50 && <p className="text-ink/45">…و{report.failed.length - 50} خطأ آخر في التقرير المُنزّل</p>}
                </div>
                <Button variant="outline" onClick={downloadErrors} className="gap-1">
                  <Download className="size-4" /> تنزيل تقرير الأخطاء (CSV)
                </Button>
              </>
            )}
            <div className="flex justify-end">
              <Button onClick={() => close(false)}>إغلاق</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "err" | "warn" }) {
  const cls = tone === "ok" ? "bg-teal-50 ring-teal-200 text-teal-800" : tone === "err" ? "bg-red-50 ring-red-200 text-red-700" : tone === "warn" ? "bg-amber-50 ring-amber-200 text-amber-700" : "bg-black/4 ring-black/8";
  return (
    <div className={`rounded-lg px-3 py-2 text-center ring-1 ${cls}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px]">{label}</div>
    </div>
  );
}
