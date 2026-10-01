import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { permKey, type Action, type Resource, type StaffRole } from "@/lib/permissions";

export type AppRole = StaffRole;

export interface AuthInfo {
  userId: string | null;
  email: string;
  fullName: string;
  role: AppRole;
  isAdmin: boolean;
  /** مفاتيح "قسم:إجراء" المسموحة */
  perms: string[];
}

const EMPTY: AuthInfo = { userId: null, email: "", fullName: "", role: "employee", isAdmin: false, perms: [] };

async function fetchAuthInfo(): Promise<AuthInfo> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return EMPTY;

  const [{ data: profile }, { data: roles }, { data: rolePerms }, { data: overrides }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("role_permissions").select("role, resource, action, allowed"),
    supabase.from("user_permission_overrides").select("resource, action, allowed").eq("user_id", user.id),
  ]);
  const roleList = (roles ?? []).map((r) => r.role as string);
  const isAdmin = roleList.includes("admin");
  const role: AppRole = isAdmin ? "admin" : roleList.includes("supervisor") ? "supervisor" : "employee";
  const set = new Set<string>();
  for (const p of rolePerms ?? []) if (p.allowed && roleList.includes(p.role)) set.add(permKey(p.resource, p.action));
  for (const o of overrides ?? []) {
    const k = permKey(o.resource, o.action);
    if (o.allowed) set.add(k);
    else set.delete(k);
  }
  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName:
      profile?.full_name ||
      (user.user_metadata?.["full_name"] as string | undefined) ||
      user.email?.split("@")[0] ||
      "مستخدم",
    role,
    isAdmin,
    perms: [...set],
  };
}

export const authQueryOptions = {
  queryKey: ["auth", "me"] as const,
  queryFn: fetchAuthInfo,
  staleTime: 60_000,
};

export function useAuth() {
  const query = useQuery(authQueryOptions);
  const info = query.data ?? EMPTY;
  return {
    ...info,
    loading: query.isLoading,
    can: (resource: Resource, action: Action) => info.isAdmin || info.perms.includes(permKey(resource, action)),
  };
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}
