import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlatformMenu from "@/components/PlatformMenu";
import NavBar from "@/components/NavBar";
import BibleChat from "./BibleChat";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const menuUser = { email: user.email, name: user.user_metadata?.full_name ?? user.email, avatarUrl: user.user_metadata?.avatar_url ?? null };
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", paddingBottom: 80 }}>
      <PlatformMenu currentApp="bible" user={menuUser} />
      <BibleChat />
      <NavBar />
    </div>
  );
}
