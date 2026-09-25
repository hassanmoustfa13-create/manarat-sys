import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/data";
import logoAsset from "@/assets/manarat-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — منارات هجر للاستقدام" },
      { name: "description", content: "سجّل الدخول إلى نظام إدارة الاستقدام لإدارة العمالة ونقل الكفالة" },
      { property: "og:title", content: "تسجيل الدخول — منارات هجر للاستقدام" },
      { property: "og:description", content: "سجّل الدخول إلى نظام إدارة الاستقدام" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/workers", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/workers", replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass w-full max-w-sm rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <img
            src={logoAsset.url}
            alt="شعار منارات هجر للاستقدام"
            className="size-11 rounded-xl object-contain"
          />
          <div>
            <p className="text-[15px] font-semibold leading-tight">منارات هجر للاستقدام</p>
            <p className="text-[11px] text-muted-foreground">نظام إدارة الاستقدام</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            دخول
          </Button>
        </form>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          إنشاء الحسابات الجديدة يتم من خلال الإدارة فقط.
        </p>
      </div>
    </div>
  );
}
