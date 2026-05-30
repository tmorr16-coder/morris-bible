import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlatformMenu from "@/components/PlatformMenu";
import NavBar from "@/components/NavBar";
import Link from "next/link";
import { BIBLE_BOOKS } from "@/lib/bible-api";

export default async function ReadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const menuUser = {
    email: user.email,
    name: user.user_metadata?.full_name ?? user.email,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
  };

  const otBooks = BIBLE_BOOKS.filter((b) => b.testament === "OT");
  const ntBooks = BIBLE_BOOKS.filter((b) => b.testament === "NT");

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", paddingBottom: 80 }}>
      <PlatformMenu currentApp="bible" user={menuUser} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
        <h1 style={{
          fontFamily: "var(--font-instrument-serif, serif)",
          fontSize: 26,
          fontWeight: 400,
          margin: "0 0 20px",
        }}>
          Select a book
        </h1>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-ink-3)", marginBottom: 12 }}>
            Old Testament
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
            {otBooks.map((book) => (
              <Link key={book.id} href={`/read/${book.id}/1`} style={{
                display: "block",
                padding: "10px 12px",
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-rule)",
                borderRadius: 8,
                textDecoration: "none",
                color: "var(--color-ink)",
                fontSize: 13,
                fontWeight: 500,
                boxShadow: "var(--shadow-card)",
              }}>
                <div>{book.name}</div>
                <div style={{ fontSize: 10, color: "var(--color-ink-4)", marginTop: 2 }}>{book.chapters} ch.</div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-ink-3)", marginBottom: 12 }}>
            New Testament
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
            {ntBooks.map((book) => (
              <Link key={book.id} href={`/read/${book.id}/1`} style={{
                display: "block",
                padding: "10px 12px",
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-rule)",
                borderRadius: 8,
                textDecoration: "none",
                color: "var(--color-ink)",
                fontSize: 13,
                fontWeight: 500,
                boxShadow: "var(--shadow-card)",
              }}>
                <div>{book.name}</div>
                <div style={{ fontSize: 10, color: "var(--color-ink-4)", marginTop: 2 }}>{book.chapters} ch.</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <NavBar />
    </div>
  );
}
