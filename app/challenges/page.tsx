import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import PlatformMenu from "@/components/PlatformMenu";
import NavBar from "@/components/NavBar";
import ChallengesClient from "./ChallengesClient";

export default async function ChallengesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const db = createServiceClient() as any;

  const [{ data: challenges }, { data: joined }] = await Promise.all([
    db.schema("bible").from("challenges").select("*, plan:reading_plans(title, duration_days), participants:challenge_participants(count)").eq("is_active", true).order("created_at", { ascending: false }),
    db.schema("bible").from("challenge_participants").select("challenge_id").eq("user_id", user.id),
  ]);

  const menuUser = { email: user.email, name: user.user_metadata?.full_name ?? user.email, avatarUrl: user.user_metadata?.avatar_url ?? null };
  const joinedIds = new Set((joined ?? []).map((j: any) => j.challenge_id));

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", paddingBottom: 80 }}>
      <PlatformMenu currentApp="bible" user={menuUser} />
      <ChallengesClient challenges={challenges ?? []} joinedIds={[...joinedIds]} userId={user.id} />
      <NavBar />
    </div>
  );
}
