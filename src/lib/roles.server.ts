import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Role = "admin" | "agent";

/** Rôle effectif de l'utilisateur connecté (vérifié côté serveur). */
export async function roleOf(supabase: SupabaseClient<Database>, userId: string): Promise<Role | null> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  return roles.includes("admin") ? "admin" : roles.includes("agent") ? "agent" : null;
}

export async function requireRole(supabase: SupabaseClient<Database>, userId: string, allowed: Role[]) {
  const role = await roleOf(supabase, userId);
  if (!role || !allowed.includes(role)) throw new Error("Accès réservé à l'équipe autorisée.");
  return role;
}
