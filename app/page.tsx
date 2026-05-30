import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  // Landing / sign-in page
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg)",
    }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✝</div>
        <h1 style={{
          fontFamily: "var(--font-instrument-serif, serif)",
          fontSize: 36,
          fontWeight: 400,
          margin: "0 0 8px",
          color: "var(--color-ink)",
        }}>
          morrisai<span style={{ fontStyle: "italic", color: "var(--color-ink-3)" }}>.bible</span>
        </h1>
        <p style={{ color: "var(--color-ink-3)", fontSize: 14, marginBottom: 32 }}>
          Read, study, and track your journey through Scripture.
        </p>
        <a
          href="https://morrisai.family"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "var(--color-accent)",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Sign in via morrisai.family
        </a>
      </div>
    </div>
  );
}
