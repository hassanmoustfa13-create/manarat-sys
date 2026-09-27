// تعريفات حقول الاستيراد من Excel لكل جدول + مطابقة تلقائية وتحقق
import {
  ACTION_STATUSES,
  ARRIVAL_STATUSES,
  LOCATIONS,
  REQUEST_TYPES,
  TRANSFER_STAGES,
  TRANSFER_TYPES,
  VISA_TYPES,
  EXPERIENCE_OPTIONS,
  RELIGIONS,
} from "@/lib/data";

export type FieldType = "text" | "number" | "date" | "enum";

export interface ImportField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  synonyms: string[];
  options?: string[];
}

export interface ImportTarget {
  table: "workers" | "requests" | "transfers" | "office_visas";
  label: string;
  fields: ImportField[];
  /** مفاتيح التمييز لمنع التكرار */
  dedupeKeys: string[];
}

const VISA_STATUS_OPTIONS = ["تم عمل العقد", "لم يتم عمل العقد"];
const PAY_OPTIONS = ["تم الدفع", "لم يتم الدفع"];
const TRANSFER_PAY_OPTIONS = ["تم الدفع بالكامل", "متبقي مبلغ"];
const YESNO = ["يوجد", "لا يوجد"];

export const IMPORT_TARGETS: Record<string, ImportTarget> = {
  workers: {
    table: "workers",
    label: "العمالة",
    dedupeKeys: ["passport_number"],
    fields: [
      { key: "name", label: "اسم العاملة", type: "text", synonyms: ["الاسم", "اسم العامل", "الاسم الكامل", "اسم العاملة"] },
      { key: "passport_number", label: "رقم الجواز", type: "text", synonyms: ["الجواز", "رقم جواز السفر", "جواز السفر", "الباسبور"] },
      { key: "nationality", label: "الجنسية", type: "text", synonyms: ["جنسية", "الجنسيه"] },
      { key: "profession", label: "المهنة", type: "text", synonyms: ["مهنة", "الوظيفة"] },
      { key: "visa_type", label: "نوع التأشيرة", type: "text", synonyms: ["نوع التاشيرة", "التأشيرة", "التاشيرة"] },
      { key: "arrival_date", label: "تاريخ دخول المكتب", type: "date", synonyms: ["تاريخ الوصول", "تاريخ القدوم"] },
      { key: "entry_date", label: "تاريخ دخولها السعودية", type: "date", synonyms: ["تاريخ الدخول", "تاريخ دخول السعودية"] },
      { key: "arrival_status", label: "حالة الوصول", type: "enum", options: [...ARRIVAL_STATUSES], synonyms: ["وصول"] },
      { key: "current_location", label: "الموقع الحالي", type: "enum", options: [...LOCATIONS], synonyms: ["الموقع", "موقع العاملة"] },
      { key: "current_sponsor_name", label: "اسم الكفيل الحالي", type: "text", synonyms: ["الكفيل", "اسم الكفيل", "الكفيل الحالي"] },
      { key: "current_sponsor_phone", label: "هاتف الكفيل", type: "text", synonyms: ["رقم هاتف الكفيل", "جوال الكفيل", "هاتف الكفيل الحالي"] },
      { key: "residency_status", label: "الإقامة", type: "enum", options: YESNO, synonyms: ["حالة الإقامة", "الاقامة"] },
      { key: "residency_number", label: "رقم الإقامة", type: "text", synonyms: ["رقم الاقامة", "الإقامة رقم"] },
      { key: "notes", label: "ملاحظات", type: "text", synonyms: ["ملاحظة", "الملاحظات"] },
    ],
  },
  requests: {
    table: "requests",
    label: "طلبات الاستقدام",
    dedupeKeys: ["customer_name", "phone"],
    fields: [
      { key: "request_date", label: "تاريخ الطلب", type: "date", synonyms: ["التاريخ", "تاريخ"] },
      { key: "customer_name", label: "اسم العميل", type: "text", required: true, synonyms: ["العميل", "اسم صاحب الطلب", "الاسم"] },
      { key: "phone", label: "رقم الهاتف", type: "text", synonyms: ["الهاتف", "الجوال", "رقم الجوال", "جوال"] },
      { key: "profession", label: "المهنة", type: "text", synonyms: ["مهنة"] },
      { key: "nationality", label: "الجنسية", type: "text", synonyms: ["جنسية"] },
      { key: "request_type", label: "نوع الطلب", type: "enum", options: [...REQUEST_TYPES], synonyms: ["النوع"] },
      { key: "lead_source", label: "مصدر العميل", type: "text", synonyms: ["المصدر", "مصدر الطلب"] },
      { key: "action_status", label: "حالة الطلب", type: "enum", options: [...ACTION_STATUSES], synonyms: ["الحالة", "حالة الإجراء"] },
      { key: "pref_age", label: "العمر المفضل", type: "text", synonyms: ["العمر", "السن"] },
      { key: "pref_religion", label: "الديانة", type: "enum", options: [...RELIGIONS], synonyms: ["الدين", "ديانة"] },
      { key: "pref_experience", label: "الخبرة", type: "enum", options: [...EXPERIENCE_OPTIONS], synonyms: ["سنوات الخبرة"] },
      { key: "pref_driving_license", label: "رخصة القيادة", type: "text", synonyms: ["الرخصة", "قيادة"] },
      { key: "pref_languages", label: "اللغات", type: "text", synonyms: ["اللغة", "اللغات المتحدثة"] },
      { key: "notes", label: "ملاحظات", type: "text", synonyms: ["ملاحظة"] },
    ],
  },
  transfers: {
    table: "transfers",
    label: "نقل الكفالة",
    dedupeKeys: ["__worker", "new_sponsor_name", "transfer_date"],
    fields: [
      { key: "__worker", label: "اسم العاملة أو رقم الجواز", type: "text", required: true, synonyms: ["اسم العاملة", "العاملة", "رقم الجواز", "الجواز", "اسم العامل"] },
      { key: "old_sponsor_name", label: "الكفيل القديم", type: "text", synonyms: ["اسم الكفيل القديم", "الكفيل السابق"] },
      { key: "new_sponsor_name", label: "الكفيل الجديد", type: "text", required: true, synonyms: ["اسم الكفيل الجديد", "الكفيل"] },
      { key: "new_sponsor_phone", label: "هاتف الكفيل الجديد", type: "text", synonyms: ["رقم هاتف الكفيل", "جوال الكفيل"] },
      { key: "visa_type", label: "نوع التأشيرة", type: "enum", options: [...VISA_TYPES], synonyms: ["التأشيرة"] },
      { key: "transfer_type", label: "نوع النقل", type: "enum", options: [...TRANSFER_TYPES], synonyms: ["النوع"] },
      { key: "transfer_stage", label: "حالة النقل", type: "enum", options: [...TRANSFER_STAGES], synonyms: ["مرحلة النقل", "الحالة"] },
      { key: "transfer_date", label: "تاريخ النقل", type: "date", synonyms: ["التاريخ"] },
      { key: "period_start", label: "تاريخ بداية التجربة", type: "date", synonyms: ["بداية المدة", "بداية التجربة"] },
      { key: "period_end", label: "تاريخ انتهاء التجربة", type: "date", synonyms: ["نهاية المدة", "انتهاء التجربة", "نهاية التجربة"] },
      { key: "old_sponsor_dues", label: "مستحقات الكفيل القديم", type: "number", synonyms: ["المستحقات", "مستحقات"] },
      { key: "down_payment", label: "العربون", type: "number", synonyms: ["الدفعة الأولى", "دفعة أولى", "المقدم"] },
      { key: "salary_dues_amount", label: "مستحقات الرواتب", type: "number", synonyms: ["قيمة مستحقات الرواتب", "رواتب"] },
      { key: "payment_status", label: "حالة الدفع", type: "enum", options: TRANSFER_PAY_OPTIONS, synonyms: ["الدفع"] },
      { key: "medical_exam", label: "الفحص الطبي", type: "text", synonyms: ["فحص طبي"] },
      { key: "residency_status", label: "الإقامة", type: "text", synonyms: ["الاقامة"] },
      { key: "salary_dues_status", label: "حالة مستحقات الرواتب", type: "text", synonyms: ["مستحقات الرواتب حالة"] },
      { key: "worker_condition", label: "ملاحظات حالة العاملة", type: "text", synonyms: ["حالة العاملة", "ملاحظات"] },
      { key: "worker_location", label: "موقع العاملة", type: "enum", options: [...LOCATIONS], synonyms: ["الموقع الحالي", "الموقع"] },
    ],
  },
  office_visas: {
    table: "office_visas",
    label: "تأشيرات المكتب",
    dedupeKeys: ["visa_number"],
    fields: [
      { key: "holder_name", label: "اسم صاحب التأشيرة", type: "text", required: true, synonyms: ["صاحب التأشيرة", "صاحب التاشيرة", "الاسم"] },
      { key: "holder_phone", label: "هاتف صاحب التأشيرة", type: "text", synonyms: ["هاتف صاحب التاشيرة", "الهاتف", "الجوال"] },
      { key: "new_sponsor_name", label: "اسم الكفيل الجديد", type: "text", synonyms: ["الكفيل الجديد", "الكفيل"] },
      { key: "new_sponsor_phone", label: "هاتف الكفيل الجديد", type: "text", synonyms: ["جوال الكفيل"] },
      { key: "visa_status", label: "حالة التأشيرة", type: "enum", options: VISA_STATUS_OPTIONS, synonyms: ["حالة التاشيرة", "الحالة"] },
      { key: "visa_number", label: "رقم التأشيرة", type: "text", synonyms: ["رقم التاشيرة", "التأشيرة", "التاشيرة"] },
      { key: "payment_status", label: "حالة الدفع", type: "enum", options: PAY_OPTIONS, synonyms: ["الدفع"] },
    ],
  },
};

/** تطبيع نص عربي للمطابقة */
export function normalizeAr(s: string): string {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

/** مطابقة تلقائية لعمود Excel مع حقل */
export function autoMatchField(header: string, fields: ImportField[]): string {
  const h = normalizeAr(header);
  if (!h) return "";
  for (const f of fields) {
    if (normalizeAr(f.label) === h) return f.key;
    if (f.synonyms.some((s) => normalizeAr(s) === h)) return f.key;
  }
  for (const f of fields) {
    if (h.includes(normalizeAr(f.label)) || normalizeAr(f.label).includes(h)) return f.key;
    if (f.synonyms.some((s) => h.includes(normalizeAr(s)) || normalizeAr(s).includes(h))) return f.key;
  }
  return "";
}

/** تحويل قيمة Excel إلى تاريخ ISO (yyyy-mm-dd) */
export function parseExcelDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

export interface ValidatedRow {
  index: number;
  record: Record<string, unknown>;
  errors: string[];
  duplicate: boolean;
}

/** تحويل صف Excel إلى سجل حسب المطابقة + التحقق */
export function buildRecord(
  row: unknown[],
  mapping: Record<number, string>,
  target: ImportTarget,
  workerLookup?: Map<string, { id: string; category: string }>,
): { record: Record<string, unknown>; errors: string[] } {
  const record: Record<string, unknown> = {};
  const errors: string[] = [];
  const fieldsByKey = new Map(target.fields.map((f) => [f.key, f]));

  for (const [colStr, fieldKey] of Object.entries(mapping)) {
    if (!fieldKey) continue;
    const field = fieldsByKey.get(fieldKey);
    if (!field) continue;
    const raw = row[Number(colStr)];
    const colLabel = `عمود ${Number(colStr) + 1}`;

    if (field.type === "date") {
      const d = parseExcelDate(raw);
      if (raw != null && raw !== "" && !d) errors.push(`${field.label}: تاريخ غير صالح (${colLabel})`);
      else if (d) record[field.key] = d;
    } else if (field.type === "number") {
      if (raw == null || raw === "") continue;
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[^\d.-]/g, ""));
      if (isNaN(n)) errors.push(`${field.label}: رقم غير صالح (${colLabel})`);
      else record[field.key] = n;
    } else if (field.type === "enum") {
      if (raw == null || raw === "") continue;
      const v = String(raw).trim();
      const hit = field.options?.find((o) => normalizeAr(o) === normalizeAr(v));
      if (hit) record[field.key] = hit;
      else errors.push(`${field.label}: قيمة غير معروفة «${v}» — المتاح: ${field.options?.join("، ")}`);
    } else {
      if (raw == null || raw === "") continue;
      record[field.key] = raw instanceof Date ? String(parseExcelDate(raw) ?? "") : String(raw).trim();
    }
  }

  // الحقول المطلوبة
  for (const f of target.fields) {
    if (f.required && (record[f.key] == null || record[f.key] === "")) {
      errors.push(`${f.label}: حقل مطلوب`);
    }
  }

  // العمالة: اسم أو جواز على الأقل
  if (target.table === "workers" && !record["name"] && !record["passport_number"]) {
    errors.push("يجب كتابة اسم العاملة أو رقم الجواز على الأقل");
  }

  // نقل الكفالة: ربط العاملة
  if (target.table === "transfers" && workerLookup) {
    const w = String(record["__worker"] ?? "").trim();
    if (w) {
      const hit = workerLookup.get(normalizeAr(w));
      if (!hit) errors.push(`العاملة «${w}» غير موجودة في جدول العمالة — أضفها أولًا`);
      else {
        record["worker_id"] = hit.id;
        record["category"] = hit.category;
        if (!record["old_sponsor_name"]) record["old_sponsor_name"] = "الشركة";
      }
    }
    delete record["__worker"];
  }

  return { record, errors };
}

/** مفتاح التمييز لمنع التكرار */
export function dedupeKey(record: Record<string, unknown>, keys: string[]): string {
  return keys.map((k) => normalizeAr(String(record[k] ?? ""))).join("|");
}
