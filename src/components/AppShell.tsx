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
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: "/requests" | "/workers" | "/transfers" | "/transfers-pro" | "/manual-transfers" | "/manual-transfers-pro" | "/visas" | "/flights" | "/departures" | "/reports" | "/archive" | "/users" | "/columns" | "/security" | "/pages" | "/forms" | "/permissions"; label: string; icon: LucideIcon; admin?: boolean; altLabel?: string };

export const NAV: NavItem[] = [
  { to: "/requests", label: "طلبات الاستقدام", icon: ClipboardList },
  { to: "/workers", label: "العمالة", icon: Users },
  { to: "/transfers", label: "نقل الكفالة (منزلية)", altLabel: "منزلية", icon: ArrowLeftRight },
  { to: "/transfers-pro", label: "نقل الكفالة المهنية", altLabel: "مهنية", icon: Briefcase },
  { to: "/manual-transfers", label: "نقل الكفالة (منزلية)", altLabel: "يدوي — منزلية", icon: ArrowLeftRight },
  { to: "/manual-transfers-pro", label: "نقل الكفالة المهنية", altLabel: "يدوي — مهنية", icon: Briefcase },
  { to: "/visas", label: "تأشيرات المكتب", icon: Stamp },
  { to: "/flights", label: "الرحلات", icon: Plane },
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

const linkCls =
  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] text-ink/60 transition-colors hover:bg-black/5 hover:text-ink";
const linkActiveCls =
  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium bg-brand/12 text-brand ring-1 ring-brand/20";

function useNavFiltering() {
  const { can } = useAuth();
  const { data: hidden = [] } = useQuery(hiddenPagesQuery);
  const { data: forms = [] } = useQuery(formsQuery);
  const visible = (to: string) => {
    const r = ROUTE_RESOURCE[to];
    return !r || can(r, "view");
  };
  const shown = (n: NavItem, isAdmin: boolean) =>
    isAdmin || (!hidden.includes(n.to) && (n.admin ? Boolean(ROUTE_RESOURCE[n.to]) && visible(n.to) : visible(n.to)));
  const custom = forms.filter((f) => !f.is_system && f.is_active);
  return { hidden, visible, shown, custom };
}

function HiddenLabel({ to, label }: { to: string; label: string }) {
  const { data: hidden = [] } = useQuery(hiddenPagesQuery);
  return (
    <span className={hidden.includes(to) ? "opacity-40 line-through" : ""}>{label}</span>
  );
}

function NavItemLink({ item, onNavigate, className, activeClassName }: { item: NavItem; onNavigate?: () => void; className: string; activeClassName: string }) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={className}
      activeProps={{ className: activeClassName }}
    >
      <item.icon className="size-4 shrink-0" />
      <HiddenLabel to={item.to} label={item.altLabel ?? item.label} />
    </Link>
  );
}

const menuLinkCls =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-ink/70 transition-colors hover:bg-black/5 hover:text-ink";
const menuLinkActiveCls =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium bg-brand/12 text-brand";

function NavDropdown({
  label,
  icon: Icon,
  items,
  activePaths,
}: {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  activePaths: (path: string) => boolean;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const anyActive = items.some((i) => activePaths(pathname));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={anyActive ? linkActiveCls : linkCls}>
          <Icon className="size-4 shrink-0" />
          {label}
          <ChevronDown className="size-3.5 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent dir="rtl" align="start" sideOffset={8} className="w-56">
        {items.map((item) => (
          <DropdownMenuItem asChild key={item.to} className="p-0">
            <Link
              to={item.to}
              className={pathname === item.to ? menuLinkActiveCls : menuLinkCls}
            >
              <item.icon className="size-4 shrink-0" />
              <HiddenLabel to={item.to} label={item.altLabel ?? item.label} />
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const auth = useAuth();
  const signOut = useSignOut();
  const [pwOpen, setPwOpen] = useState(false);
  return (
    <div className="flex items-center">
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} hideTrigger />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-white/70 py-1.5 pe-3 ps-2 ring-1 ring-black/8 transition-colors hover:bg-white"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/15 text-[12px] font-bold text-brand">
              {(auth.fullName || "؟").trim().charAt(0)}
            </span>
            <span className="hidden max-w-28 truncate text-[13px] font-medium sm:block">
              {auth.loading ? "…" : auth.fullName}
            </span>
            <span className={auth.isAdmin ? "pill pill-teal" : "pill pill-brand"}>
              {ROLE_LABELS[auth.role]}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent dir="rtl" align="end" sideOffset={8} className="w-56">
          <DropdownMenuLabel className="truncate text-[13px]">
            {auth.loading ? "…" : auth.fullName}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPwOpen(true)}>
            <KeyRound className="size-4" />
            تغيير كلمة المرور
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={signOut}>
            <LogOut className="size-4" />
            تسجيل الخروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TopNav({ isAdmin }: { isAdmin: boolean }) {
  const { shown, custom } = useNavFiltering();
  const direct = NAV.filter((n) => !n.admin && !n.to.startsWith("/transfers") && !n.to.startsWith("/manual")).filter((n) => shown(n, isAdmin));
  const transfers = NAV.filter((n) => n.to.startsWith("/transfers") || n.to.startsWith("/manual")).filter((n) => shown(n, isAdmin));
  const adminItems = NAV.filter((n) => n.admin).filter((n) => shown(n, isAdmin));
  const activePaths = (path: string) =>
    path.startsWith("/transfers") || path.startsWith("/manual-transfers");

  return (
    <nav className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      {direct.map((item) => (
        <NavItemLink
          key={item.to}
          item={item}
          className={linkCls}
          activeClassName={linkActiveCls}
        />
      ))}
      {transfers.length > 0 && (
        <NavDropdown label="نقل الكفالة" icon={ArrowLeftRight} items={transfers} activePaths={activePaths} />
      )}
      {adminItems.length > 0 && (
        <NavDropdown
          label="الإدارة"
          icon={Settings2}
          items={adminItems}
          activePaths={(path) => NAV.some((n) => n.admin && n.to === path)}
        />
      )}
      {custom.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={linkCls}>
              <FileText className="size-4 shrink-0" />
              نماذج إضافية
              <ChevronDown className="size-3.5 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent dir="rtl" align="start" sideOffset={8} className="w-56">
            {custom.map((f) => (
              <DropdownMenuItem asChild key={f.id} className="p-0">
                <Link
                  to="/f/$formKey"
                  params={{ formKey: f.form_key }}
                  className={menuLinkCls}
                  activeProps={{ className: menuLinkActiveCls }}
                >
                  <FileText className="size-4 shrink-0" />
                  {f.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  useRealtimeSync();
  const [menuOpen, setMenuOpen] = useState(false);
  const { shown, custom } = useNavFiltering();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const routeRes = ROUTE_RESOURCE[pathname] ?? (pathname.startsWith("/f/") ? formResource(decodeURIComponent(pathname.slice(3))) : undefined);
  const noAccess = !auth.loading && !auth.isAdmin && routeRes !== undefined && !auth.can(routeRes, "view");
  const { data: hidden = [] } = useQuery(hiddenPagesQuery);
  const blocked = noAccess || (!auth.loading && !auth.isAdmin && hidden.includes(pathname));

  return (
    <div className="min-h-screen">
      <SmartAlerts />
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-3 md:px-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <img src={logoAsset.url} alt="شعار منارات هجر للاستقدام" className="size-9 shrink-0 rounded-lg object-contain" />
            <div className="hidden min-w-0 sm:block">
              <div className="truncate text-[14px] font-semibold leading-tight">منارات هجر للاستقدام</div>
              <div className="truncate text-[10px] leading-tight text-ink/40">نظام إدارة الاستقدام</div>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden min-w-0 flex-1 md:block">
            <TopNav isAdmin={auth.isAdmin} />
          </div>

          {/* User menu */}
          <div className="ms-auto flex shrink-0 items-center gap-2 md:ms-0">
            <div className="hidden md:block">
              <UserMenu />
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="فتح القائمة"
              className="grid size-9 place-items-center rounded-lg text-ink/70 transition-colors hover:bg-black/5 md:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
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
              {NAV.filter((n) => shown(n, auth.isAdmin)).map((item) => (
                <NavItemLink
                  key={item.to}
                  item={item}
                  onNavigate={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink/60 transition-colors hover:bg-black/5"
                  activeClassName="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-brand/12 text-brand ring-1 ring-brand/20"
                />
              ))}
              {custom.length > 0 && (
                <div className="mt-2 border-t border-black/5 px-3 pb-1 pt-3 text-[11px] font-semibold text-ink/40">نماذج إضافية</div>
              )}
              {custom.map((f) => (
                <Link
                  key={f.id}
                  to="/f/$formKey"
                  params={{ formKey: f.form_key }}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink/60 transition-colors hover:bg-black/5"
                  activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-brand/12 text-brand ring-1 ring-brand/20" }}
                >
                  <FileText className="size-4 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </Link>
              ))}
            </nav>
            <UserBlock />
          </aside>
        </div>
      )}

      <main className="min-h-[calc(100vh-3.5rem)] pt-14">
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
