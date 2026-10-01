import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formResource } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import { DataGrid } from "@/components/DataGrid";
import { GridToolbar } from "@/components/GridToolbar";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DynamicFormDialog } from "@/components/DynamicForm";
import { IconBtn } from "@/routes/_authenticated/workers";
import { errorMessage, formatDate, formatMoney, profileNameMap, profilesQuery } from "@/lib/data";
import { FIELD_TYPES, activeFields, formsQuery } from "@/lib/forms";

export const Route = createFileRoute("/_authenticated/f/$formKey")({
  head: () => ({
    meta: [
      { title: "نموذج — منارات هجر للاستقدام" },
      { name: "description", content: "سجلات نموذج مخصص أنشأه المدير" },
      { property: "og:title", content: "نموذج — منارات هجر للاستقدام" },
      { property: "og:description", content: "سجلات نموذج مخصص أنشأه المدير" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DynamicFormPage,
});

type Entry = { id: string; data: Record<string, unknown>; created_by: string | null; updated_by: string | null; created_at: string };

function DynamicFormPage() {
  const { formKey } = Route.useParams();
  const { isAdmin, can } = useAuth();
  const qc = useQueryClient();
  const { data: forms, isLoading: fl } = useQuery(formsQuery);
  const form = forms?.find((f) => f.form_key === formKey);
  const { data: profiles } = useQuery(profilesQuery);
  const nameOf = profileNameMap(profiles);
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["form_entries", form?.id],
    enabled: Boolean(form),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_entries")
        .select("*")
        .eq("form_id", form!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Entry[];
    },
  });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("form_entries").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحذف");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["form_entries"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = useMemo(
    () => entries.map((e) => ({ ...e, ...Object.fromEntries(Object.entries(e.data).map(([k, v]) => [`d_${k}`, v])) })),
    [entries],
  );

  const columns = useMemo<ColumnDef<(typeof rows)[number], unknown>[]>(() => {
    if (!form) return [];
    const cols: ColumnDef<(typeof rows)[number], unknown>[] = activeFields(form).map((f) => ({
      id: f.field_key,
      accessorKey: `d_${f.field_key}`,
      header: f.label,
      meta: { width: 140 },
      cell: ({ getValue }) => {
        const v = getValue();
        if (v == null || v === "") return "—";
        if (f.field_type === "date") return formatDate(String(v));
        if (f.field_type === "currency") return formatMoney(Number(v));
        if (f.field_type === "checkbox") return v === true || v === "true" ? "✓" : "—";
        if (f.field_type === "file") return "ملف مرفق";
        const opt = f.form_field_options.find((o) => o.value === String(v));
        return opt?.label ?? String(v);
      },
    }));
    cols.push(
      { id: "created_by", accessorFn: (r) => nameOf(r.created_by), header: "تم الإضافة بواسطة", meta: { width: 120 }, cell: ({ getValue }) => (getValue() as string) || "—" },
      { id: "updated_by", accessorFn: (r) => nameOf(r.updated_by), header: "آخر تعديل بواسطة", meta: { width: 120 }, cell: ({ getValue }) => (getValue() as string) || "—" },
    );
    return cols;
  }, [form, nameOf]);

  if (fl) return <div className="glass m-6 h-64 animate-pulse rounded-2xl" />;
  if (!form || (!form.is_active && !isAdmin))
    return <div className="p-10 text-center text-ink/60">هذا النموذج غير متاح.</div>;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <GridToolbar
        title={form.name}
        count={entries.length}
        search={search}
        onSearch={setSearch}
        addLabel="إضافة"
        onAdd={can(formResource(formKey), "add") ? () => {
          setEditing(null);
          setOpen(true);
        } : undefined}
      />
      {activeFields(form).length === 0 && (
        <p className="mb-3 text-[13px] text-ink/55">لا توجد حقول مفعّلة في هذا النموذج بعد ({Object.keys(FIELD_TYPES).length} نوع متاح في «إدارة النماذج»).</p>
      )}
      {isLoading ? (
        <div className="glass h-64 animate-pulse rounded-2xl" />
      ) : (
        <DataGrid
          data={rows}
          columns={columns}
          search={search}
          rowActions={(r) => (
            <>
              {can(formResource(formKey), "edit") && (
                <IconBtn
                  title="تعديل"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                </IconBtn>
              )}
              {can(formResource(formKey), "delete") && (
                <IconBtn title="حذف" danger onClick={() => setDeleting(r)}>
                  <Trash2 className="size-3.5" />
                </IconBtn>
              )}
            </>
          )}
        />
      )}
      <DynamicFormDialog
        formDef={form}
        open={open}
        onOpenChange={setOpen}
        record={editing as unknown as (Record<string, unknown> & { id: string }) | null}
        queryKey={["form_entries"]}
      />
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="حذف السجل؟"
        description="سيتم إخفاء السجل من الجدول."
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </main>
  );
}
