import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import logoAsset from "@/assets/manarat-logo.png.asset.json";
import { useAuth, useSignOut } from "@/hooks/useAuth";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const signOut = useSignOut();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img
              src={logoAsset.url}
              alt="شعار منارات هجر للاستقدام"
              className="size-9 rounded-lg object-contain"
            />
            <span className="text-[15px] font-semibold">منارات هجر للاستقدام</span>
            <span className="hidden border-r border-black/10 pr-2 text-[11px] text-ink/40 sm:block">
              نظام إدارة الاستقدام
            </span>
          </div>
          <nav className="ms-2 flex items-center gap-1">
            <Link
              to="/requests"
              className="rounded-lg px-3 py-1.5 text-sm text-ink/55 transition-colors hover:bg-black/5"
              activeProps={{
                className:
                  "rounded-lg px-3 py-1.5 text-sm font-medium bg-brand/12 text-brand ring-1 ring-brand/20",
              }}
            >
              طلبات الاستقدام
            </Link>
            <Link

              to="/workers"
              className="rounded-lg px-3 py-1.5 text-sm text-ink/55 transition-colors hover:bg-black/5"
              activeProps={{
                className:
                  "rounded-lg px-3 py-1.5 text-sm font-medium bg-brand/12 text-brand ring-1 ring-brand/20",
              }}
            >
              العمالة
            </Link>
            <Link
              to="/transfers"
              className="rounded-lg px-3 py-1.5 text-sm text-ink/55 transition-colors hover:bg-black/5"
              activeProps={{
                className:
                  "rounded-lg px-3 py-1.5 text-sm font-medium bg-brand/12 text-brand ring-1 ring-brand/20",
              }}
            >
              نقل الكفالة
            </Link>
            <Link
              to="/reports"
              className="rounded-lg px-3 py-1.5 text-sm text-ink/55 transition-colors hover:bg-black/5"
              activeProps={{
                className:
                  "rounded-lg px-3 py-1.5 text-sm font-medium bg-brand/12 text-brand ring-1 ring-brand/20",
              }}
            >
              التقارير
            </Link>
            {auth.isAdmin && (
              <Link
                to="/users"
                className="rounded-lg px-3 py-1.5 text-sm text-ink/55 transition-colors hover:bg-black/5"
                activeProps={{
                  className:
                    "rounded-lg px-3 py-1.5 text-sm font-medium bg-brand/12 text-brand ring-1 ring-brand/20",
                }}
              >
                المستخدمون
              </Link>
            )}
            {auth.isAdmin && (
              <Link
                to="/columns"
                className="rounded-lg px-3 py-1.5 text-sm text-ink/55 transition-colors hover:bg-black/5"
                activeProps={{
                  className:
                    "rounded-lg px-3 py-1.5 text-sm font-medium bg-brand/12 text-brand ring-1 ring-brand/20",
                }}
              >
                إعدادات الجداول
              </Link>
            )}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-black/8 backdrop-blur-md">
              <span className="hidden text-[11px] text-ink/40 sm:inline">مرحبا</span>
              <span className="max-w-[140px] truncate text-[13px] font-medium">
                {auth.loading ? "…" : auth.fullName}
              </span>
              <span className={auth.isAdmin ? "pill pill-teal" : "pill pill-brand"}>
                {auth.isAdmin ? "مدير" : "موظف"}
              </span>
            </div>
            <ChangePasswordDialog />
            <button
              type="button"
              onClick={signOut}
              title="تسجيل الخروج"
              className="grid size-8 place-items-center rounded-full text-ink/50 transition-colors hover:bg-black/5 hover:text-ink"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
