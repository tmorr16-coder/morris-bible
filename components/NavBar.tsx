"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { href: "/dashboard",  label: "Home",    icon: "⛪" },
  { href: "/read",       label: "Read",    icon: "📖" },
  { href: "/search",     label: "Search",  icon: "🔍" },
  { href: "/plans",      label: "Plans",   icon: "📋" },
  { href: "/chat",       label: "Chat",    icon: "💬" },
  { href: "/notes",      label: "Notes",   icon: "📝" },
  { href: "/settings",   label: "Settings",icon: "⚙️" },
];

export default function NavBar({ active }: { active?: string } = {}) {
  const pathname = usePathname();
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: "rgba(255,253,248,0.95)",
      borderTop: "1px solid var(--color-rule)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {TABS.map((tab) => {
        const isActive = active ? active === tab.href.slice(1) : pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "10px 4px 8px",
              textDecoration: "none",
              color: isActive ? "var(--color-accent)" : "var(--color-ink-3)",
              fontSize: 10,
              fontWeight: isActive ? 600 : 500,
              fontFamily: "var(--font-geist, system-ui), sans-serif",
              gap: 3,
              transition: "color 100ms",
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
