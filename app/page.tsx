"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { withAuthRetrySafe } from "@/lib/supabase/auth-retry";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71C3.784 10.17 3.682 9.593 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

async function signInWithGoogle() {
  const supabase = createClient();
  await withAuthRetrySafe(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  });
}

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <span style={{ fontSize: 13, color: "var(--color-ink-3)" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px 80px",
      background: "var(--color-bg)",
    }}>
      {/* Logo mark */}
      <div style={{ fontSize: 56, marginBottom: 20 }}>✝</div>

      {/* Brand */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
        <span style={{
          fontFamily: "var(--font-instrument-serif, 'Instrument Serif', serif)",
          fontSize: 28,
          color: "var(--color-ink)",
        }}>
          morrisai
        </span>
        <span style={{
          fontFamily: "var(--font-instrument-serif, 'Instrument Serif', serif)",
          fontStyle: "italic",
          fontSize: 24,
          color: "var(--color-accent)",
        }}>
          .bible
        </span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: "var(--font-instrument-serif, serif)",
        fontSize: 40,
        fontWeight: 400,
        lineHeight: 1.1,
        textAlign: "center",
        marginBottom: 12,
        maxWidth: 440,
        color: "var(--color-ink)",
      }}>
        Read, study, and grow
        <br />
        <span style={{ fontStyle: "italic", color: "var(--color-accent)" }}>
          together in Scripture.
        </span>
      </h1>

      <p style={{
        fontSize: 15,
        color: "var(--color-ink-3)",
        textAlign: "center",
        maxWidth: 340,
        lineHeight: 1.6,
        marginBottom: 40,
      }}>
        Reading plans, verse notes, highlights, research chat, and family challenges — all in one place.
      </p>

      {/* Google Sign-In button */}
      <button
        onClick={signInWithGoogle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "13px 24px",
          borderRadius: 10,
          border: "1px solid var(--color-rule)",
          background: "var(--color-bg-card)",
          color: "var(--color-ink)",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
          minWidth: 240,
          boxShadow: "var(--shadow-card)",
          transition: "box-shadow 100ms",
        }}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p style={{ fontSize: 11, color: "var(--color-ink-4)", marginTop: 12 }}>
        Use the same Google account as your morrisai.family login
      </p>

      {/* Feature pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 48, maxWidth: 380 }}>
        {[
          "📖 Bible Reader",
          "📋 Reading Plans",
          "💬 Research Chat",
          "📝 Verse Notes",
          "🔖 Highlights",
          "🏆 Challenges",
          "▶ Read Aloud",
          "✨ AI Plans",
        ].map((label) => (
          <span
            key={label}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-rule-soft)",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--color-ink-3)",
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
