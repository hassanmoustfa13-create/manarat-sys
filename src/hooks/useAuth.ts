import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";

export interface AuthInfo {
  userId: string | null;
  email: string;
  fullName: string;
  role: AppRole;
  isAdmin: boolean;
}

async function fetchAuthInfo(): Promise<AuthInfo> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return { userId: null, email: "", fullName: "", role: "user", isAdmin: false };

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName:
      profile?.full_name ||
      (user.user_metadata?.["full_name"] as string | undefined) ||
      user.email?.split("@")[0] ||
      "مستخدم",
    role: isAdmin ? "admin" : "user",
    isAdmin,
  };
}

export const authQueryOptions = {
  queryKey: ["auth", "me"] as const,
  queryFn: fetchAuthInfo,
  staleTime: 60_000,
};

export function useAuth() {
  const query = useQuery(authQueryOptions);
  return {
    ...(query.data ?? { userId: null, email: "", fullName: "", role: "user" as AppRole, isAdmin: false }),
    loading: query.isLoading,
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
