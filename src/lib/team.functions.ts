import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { roleOf } = await import("./roles.server");
    return { role: await roleOf(context.supabase, context.userId), email: (context.claims as { email?: string }).email ?? null };
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireRole } = await import("./roles.server");
    await requireRole(context.supabase, context.userId, ["admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    return (users?.users ?? []).map((u) => {
      const r = (roles ?? []).filter((x) => x.user_id === u.id).map((x) => x.role);
      return { id: u.id, email: u.email ?? "", role: r.includes("admin") ? "admin" : r.includes("agent") ? "agent" : "lecteur", created_at: u.created_at, me: u.id === context.userId };
    });
  });

export const setTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), role: z.enum(["admin", "agent", "lecteur"]) }))
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("./roles.server");
    await requireRole(context.supabase, context.userId, ["admin"]);
    if (data.user_id === context.userId) throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    if (data.role !== "lecteur") {
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
      if (error) throw new Error("Impossible de changer le rôle.");
    }
    return { ok: true };
  });
