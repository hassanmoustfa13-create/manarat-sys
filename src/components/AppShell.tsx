import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  LogOut,
  Settings2,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import logoAsset from "@/assets/manarat-logo.png.asset.json";
import { useAuth, useSignOut } from "@/hooks/useAuth";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

type NavItem = { to: "/requests" | "/workers" | "/transfers" | "/reports" | "/users" | "/columns"; label: string; icon: LucideIcon; admin?: boolean };

const NAV: NavItem[] = [
  { to: "/requests", label: "طلبات الاستقدام", icon: ClipboardList },
  { to: "/workers", label: "العمالة", icon: Users },
  { to: "/transfers", label: "نقل الكفالة", icon: ArrowLeftRight },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/users", label: "المستخدمون", icon: UserCog, admin: true },
  { to: "/columns", label: "إعدادات الجداول", icon: Settings2, admin: true },
];

const itemCls =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink/60 transition-colors hover:bg-black/5";
const activeCls =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-brand/12 text-brand ring-1 ring-brand/20";

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const signOut = useSignOut();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — first child in RTL flex = right side */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-l border-black/5 bg-white/70 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 border-b border-black/5 px-4 py-4">
          <img src={logoAsset.url} alt="شعار منارات هجر للاستقدام" className="size-10 shrink-0 rounded-lg object-contain" />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">منارات هجر للاستقدام</div>
            <div className="truncate text-[11px] text-ink/40">نظام إدارة الاستقدام</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.filter((n) => !n.admin || auth.isAdmin).map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={itemCls} activeProps={{ className: activeCls }}>
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="space-y-2 border-t border-black/5 p-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-black/8">
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {auth.loading ? "…" : auth.fullName}
            </span>
            <span className={auth.isAdmin ? "pill pill-teal" : "pill pill-brand"}>
              {auth.isAdmin ? "مدير" : "موظف"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <ChangePasswordDialog />
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] text-ink/60 transition-colors hover:bg-black/5 hover:text-ink"
            >
              <LogOut className="size-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
