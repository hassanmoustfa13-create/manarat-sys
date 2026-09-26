import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { setUserPassword } from "@/lib/users.functions";

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const save = useServerFn(setUserPassword);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setBusy(true);
    try {
      await save({ data: { currentPassword: current, password: pw } });
      toast.success("تم تغيير كلمة المرور");
      setPw("");
      setCurrent("");
      setConfirm("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر تغيير كلمة المرور");
    } finally {
      setBusy(false);
    }
  }

  const cls = "glass h-10 w-full rounded-lg px-3 text-[13px] outline-none";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" title="تغيير كلمة المرور" className="grid size-8 place-items-center rounded-full text-ink/50 transition-colors hover:bg-black/5 hover:text-ink">
          <KeyRound className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>تغيير كلمة المرور</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input required dir="ltr" type="password" placeholder="كلمة المرور الحالية" value={current} onChange={(e) => setCurrent(e.target.value)} className={cls} />
          <input required dir="ltr" type="password" placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} className={cls} />
          <input required dir="ltr" type="password" placeholder="تأكيد كلمة المرور" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={cls} />
          <button disabled={busy} className="h-10 w-full rounded-lg bg-brand text-[13px] font-medium text-primary-foreground disabled:opacity-60">
            {busy ? "جارٍ الحفظ…" : "حفظ"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
