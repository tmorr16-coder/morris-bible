import { createClient, createServiceClient } from "./server";

export async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAdmin() {
  const db = createServiceClient();
  const userId = await getCurrentUserId();
  const { data: profile } = await (db as any)
    .schema("hub")
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return { db, id: userId };
}
