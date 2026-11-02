export async function recordAIHealth(ok: boolean) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("system_health").upsert({ id: 1, ai_ok: ok, ai_checked_at: new Date().toISOString() });
  } catch { console.error("État IA non enregistré"); }
}