import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/data";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — هجرة" },
      { name: "description", content: "سجّل الدخول إلى نظام إدارة الاستقدام لإدارة العمالة ونقل الكفالة" },
      { property: "og:title", content: "تسجيل الدخول — هجرة" },
      { property: "og:description", content: "سجّل الدخول إلى نظام إدارة الاستقدام" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/workers", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/workers", replace: true });
        } else {
          toast.success("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب.");
          setMode("login");
        }
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(errorMessage(result.error));
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/workers", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass w-full max-w-sm rounded-2xl p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-brand/15 text-sm font-bold text-brand">
            هـ
          </span>
          <div>
            <p className="text-[15px] font-semibold leading-tight">هجرة</p>
            <p className="text-[11px] text-muted-foreground">نظام إدارة الاستقدام</p>
          </div>
        </div>

        <div className="mb-5 flex rounded-lg bg-black/5 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "login" ? "glass-strong font-medium text-brand" : "text-muted-foreground"}`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "signup" ? "glass-strong font-medium text-brand" : "text-muted-foreground"}`}
          >
            حساب جديد
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input
                id="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: خالد العتيبي"
              />
            </div>
          )}
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "login" ? "دخول" : "إنشاء الحساب"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          أو
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={google} disabled={busy}>
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
              fill="currentColor"
              d="M21.35 11.1H12v2.9h5.3c-.23 1.4-1.6 4.1-5.3 4.1a6.1 6.1 0 1 1 0-12.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5A9.9 9.9 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.7 0-.7-.1-1.2-.25-1.2Z"
            />
          </svg>
          المتابعة بحساب Google
        </Button>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          أول حساب يتم إنشاؤه يحصل على صلاحيات المدير تلقائياً.
        </p>
      </div>
    </div>
  );
}
