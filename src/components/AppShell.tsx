import { Link } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeftRight, Briefcase,
  BarChart3,
  ClipboardList,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UserCog,
  KeyRound,
  Users,
  X,
  type LucideIcon,
  Stamp,
  Plane,
  PlaneTakeoff,
  EyeOff,
  FormInput,
  FileText,
} from "lucide-react";
import { formsQuery } from "@/lib/forms";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { hiddenPagesQuery } from "@/lib/pageVisibility";
import { ROLE_LABELS, ROUTE_RESOURCE, formResource } from "@/lib/permissions";
import { useState, type ReactNode } from "react";
import logoAsset from "@/assets/manarat-logo.png.asset.json";
import { useAuth, useSignOut } from "@/hooks/useAuth";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { SmartAlerts } from "@/components/SmartAlerts";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

type NavItem = { to: "/requests" | "/workers" | "/transfers" | "/transfers-pro" | "/manual-transfers" | "/manual-transfers-pro" | "/visas" | "/flights" | "/departures" | "/reports" | "/archive" | "/users" | "/columns" | "/security" | "/pages" | "/forms" | "/permissions"; label: string; icon: LucideIcon; admin?: boolean; section?: string };

export const NAV: NavItem[] = [
  { to: "/requests", label: "طلبات الاستقدام", icon: ClipboardList },
  { to: "/workers", label: "العمالة", icon: Users },
  { to: "/transfers", label: "نقل الكفالة (منزلية)", icon: ArrowLeftRight },
  { to: "/transfers-pro", label: "نقل الكفالة المهنية", icon: Briefcase },
  { to: "/manual-transfers", label: "نقل الكفالة (منزلية)", icon: ArrowLeftRight, section: "نقل يدوي" },
  { to: "/manual-transfers-pro", label: "نقل الكفالة المهنية", icon: Briefcase },
  { to: "/visas", label: "تأشيرات المكتب", icon: Stamp, section: "" },
  { to: "/flights", label: "الرحلات", icon: Plane, section: "" },
  { to: "/departures", label: "المغادرة", icon: PlaneTakeoff },
  { to: "/archive", label: "الأرشيف", icon: Archive },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/users", label: "المستخدمون", icon: UserCog, admin: true },
  { to: "/permissions", label: "الصلاحيات", icon: KeyRound, admin: true },
  { to: "/columns", label: "إعدادات الجداول", icon: Settings2, admin: true },
  { to: "/security", label: "سجل الأمان", icon: ShieldCheck, admin: true },
  { to: "/pages", label: "إظهار وإخفاء الصفحات", icon: EyeOff, admin: true },
  { to: "/forms", label: "إدارة النماذج", icon: FormInput, admin: true },
];

const itemCls =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink/60 transition-colors hover:bg-black/5";
const activeCls =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-brand/12 text-brand ring-1 ring-brand/20";

function NavLinks({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const { can } = useAuth();
  const { data: hidden = [] } = useQuery(hiddenPagesQuery);
  const { data: forms = [] } = useQuery(formsQuery);
  const custom = forms.filter((f) => !f.is_system && f.is_active && (isAdmin || can(formResource(f.form_key), "view")));
  const visible = (to: string) => {
    const r = ROUTE_RESOURCE[to];
    return !r || can(r, "view");
  };
  return (
    <>
      {NAV.filter((n) => isAdmin || (!hidden.includes(n.to) && (n.admin ? Boolean(ROUTE_RESOURCE[n.to]) && visible(n.to) : visible(n.to)))).map(({ to, label, icon: Icon, section }) => (
        <div key={to}>
          {section !== undefined && (
            <div className="mt-2 border-t border-black/5 px-3 pb-1 pt-3 text-[11px] font-semibold text-ink/40">
              {section}
            </div>
          )}
          <Link to={to} onClick={onNavigate} className={itemCls} activeProps={{ className: activeCls }}>
            <Icon className="size-4 shrink-0" />
            <span className={`truncate ${hidden.includes(to) ? "opacity-40 line-through" : ""}`}>{label}</span>
          </Link>
        </div>
      ))}
      {custom.length > 0 && (
        <div className="mt-2 border-t border-black/5 px-3 pb-1 pt-3 text-[11px] font-semibold text-ink/40">نماذج إضافية</div>
      )}
      {custom.map((f) => (
        <Link
          key={f.id}
          to="/f/$formKey"
          params={{ formKey: f.form_key }}
          onClick={onNavigate}
          className={itemCls}
          activeProps={{ className: activeCls }}
        >
          <FileText className="size-4 shrink-0" />
          <span className="truncate">{f.name}</span>
        </Link>
      ))}
    </>
  );
}

function UserBlock() {
  const auth = useAuth();
  const signOut = useSignOut();
  return (
    <div className="space-y-2 border-t border-black/5 p-3">
      <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-black/8">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {auth.loading ? "…" : auth.fullName}
        </span>
        <span className={auth.isAdmin ? "pill pill-teal" : "pill pill-brand"}>
          {ROLE_LABELS[auth.role]}
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
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  useRealtimeSync();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: hidden = [] } = useQuery(hiddenPagesQuery);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const routeRes = ROUTE_RESOURCE[pathname] ?? (pathname.startsWith("/f/") ? formResource(decodeURIComponent(pathname.slice(3))) : undefined);
  const noAccess = !auth.loading && !auth.isAdmin && routeRes !== undefined && !auth.can(routeRes, "view");
  const blocked = noAccess || (!auth.loading && !auth.isAdmin && hidden.includes(pathname));

  return (
    <div className="flex min-h-screen">
      <SmartAlerts />
      {/* Desktop sidebar — first child in RTL flex = right side */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-l border-black/5 bg-white/70 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-2.5 border-b border-black/5 px-4 py-4">
          <img src={logoAsset.url} alt="شعار منارات هجر للاستقدام" className="size-10 shrink-0 rounded-lg object-contain" />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">منارات هجر للاستقدام</div>
            <div className="truncate text-[11px] text-ink/40">نظام إدارة الاستقدام</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <NavLinks isAdmin={auth.isAdmin} />
        </nav>

        <UserBlock />
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center gap-2 border-b border-black/5 bg-white/80 px-3 py-2.5 backdrop-blur-xl md:hidden">
        <img src={logoAsset.url} alt="شعار منارات هجر للاستقدام" className="size-8 shrink-0 rounded-md object-contain" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">منارات هجر للاستقدام</div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="فتح القائمة"
          className="grid size-9 place-items-center rounded-lg text-ink/70 transition-colors hover:bg-black/5"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-64 flex-col bg-white shadow-2xl">
            <div className="flex items-center gap-2.5 border-b border-black/5 px-4 py-4">
              <img src={logoAsset.url} alt="شعار منارات هجر للاستقدام" className="size-9 shrink-0 rounded-lg object-contain" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">منارات هجر للاستقدام</div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="إغلاق القائمة"
                className="grid size-8 place-items-center rounded-lg text-ink/60 hover:bg-black/5"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              <NavLinks isAdmin={auth.isAdmin} onNavigate={() => setMenuOpen(false)} />
            </nav>
            <UserBlock />
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 pt-14 md:pt-0">
        {blocked ? (
          <div className="grid min-h-[60vh] place-items-center text-center text-ink/60">
            <div>
              <EyeOff className="mx-auto mb-3 size-8 text-ink/30" />
              <p>هذه الصفحة مخفية مؤقتًا من قِبل المدير.</p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
