import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import PlatformMenu from "@/components/PlatformMenu";
import NavBar from "@/components/NavBar";
import Link from "next/link";
import PlanUploader from "./_components/PlanUploader";

const BUILT_IN_PLANS = [
  { id: "bible-in-a-year",   title: "Bible in a Year",         description: "Read the entire Bible in 365 days — Old and New Testament together.", duration_days: 365 },
  { id: "nt-in-90-days",     title: "New Testament in 90 Days",description: "Work through all 27 books of the New Testament.",                     duration_days: 90  },
  { id: "psalms-30-days",    title: "Psalms in 30 Days",       description: "Meditate on 5 Psalms each day for a month.",                          duration_days: 30  },
  { id: "gospels-40-days",   title: "The Four Gospels",        description: "Matthew, Mark, Luke, and John across 40 days.",                       duration_days: 40  },
  { id: "proverbs-31-days",  title: "Proverbs in 31 Days",    description: "One chapter of Proverbs per day.",                                    duration_days: 31  },
  { id: "sermon-on-mount",   title: "Sermon on the Mount",     description: "7-day deep dive into Matthew 5–7.",                                   duration_days: 7   },
];

export default async function PlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const db = createServiceClient() as any;

  const [{ data: userPlans }, { data: publicPlans }] = await Promise.all([
    db.schema("bible").from("user_plans").select("*, plan:reading_plans(*)").eq("user_id", user.id).order("started_at", { ascending: false }),
    db.schema("bible").from("reading_plans").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(20),
  ]);

  const menuUser = { email: user.email, name: user.user_metadata?.full_name ?? user.email, avatarUrl: user.user_metadata?.avatar_url ?? null };
  const enrolledIds = new Set((userPlans ?? []).map((up: any) => up.plan_id));

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", paddingBottom: 80 }}>
      <PlatformMenu currentApp="bible" user={menuUser} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontFamily: "var(--font-instrument-serif, serif)", fontSize: 26, fontWeight: 400, margin: 0 }}>Reading Plans</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <PlanUploader />
            <Link href="/plans/generate" style={{
              padding: "8px 16px", background: "var(--color-accent)", color: "#fff",
              borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 500,
            }}>
              ✨ Generate plan
            </Link>
          </div>
        </div>

        {/* My active plans */}
        {(userPlans ?? []).length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-2)", marginBottom: 12 }}>My plans</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(userPlans ?? []).map((up: any) => (
                <Link key={up.plan_id} href={`/plans/${up.plan_id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    background: "var(--color-bg-card)", border: "1px solid var(--color-rule)",
                    borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-card)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--color-ink)", fontSize: 15 }}>{up.plan?.title}</div>
                      <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 3 }}>{up.plan?.duration_days} days • Started {new Date(up.started_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ color: "var(--color-accent)", fontSize: 20 }}>›</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Built-in plans */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-2)", marginBottom: 12 }}>Curated plans</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {BUILT_IN_PLANS.map((plan) => (
              <div key={plan.id} style={{
                background: "var(--color-bg-card)", border: "1px solid var(--color-rule)",
                borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-card)",
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{plan.title}</div>
                <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginBottom: 12, lineHeight: 1.4 }}>{plan.description}</div>
                <div style={{ fontSize: 11, color: "var(--color-ink-4)", marginBottom: 12 }}>{plan.duration_days} days</div>
                <EnrollButton planId={plan.id} planTitle={plan.title} userId={user.id} />
              </div>
            ))}
          </div>
        </div>

        {/* Community plans */}
        {(publicPlans ?? []).length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-2)", marginBottom: 12 }}>Community plans</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(publicPlans ?? []).filter((p: any) => !enrolledIds.has(p.id)).map((plan: any) => (
                <div key={plan.id} style={{
                  background: "var(--color-bg-card)", border: "1px solid var(--color-rule)",
                  borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-card)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{plan.title}</div>
                    <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 2 }}>{plan.duration_days} days</div>
                  </div>
                  <Link href={`/plans/${plan.id}`} style={{
                    padding: "6px 14px", background: "var(--color-accent-soft)",
                    color: "var(--color-accent)", borderRadius: 8, textDecoration: "none",
                    fontSize: 12, fontWeight: 500,
                  }}>
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <NavBar />
    </div>
  );
}

// Server component button placeholder — enrollment happens via the plan detail page
function EnrollButton({ planId, planTitle, userId }: { planId: string; planTitle: string; userId: string }) {
  return (
    <Link href={`/plans/${planId}`} style={{
      display: "inline-block", padding: "6px 14px",
      background: "var(--color-accent)", color: "#fff",
      borderRadius: 8, textDecoration: "none", fontSize: 12, fontWeight: 500,
    }}>
      Start plan
    </Link>
  );
}
