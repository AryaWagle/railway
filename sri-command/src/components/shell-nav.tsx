"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  FlaskConical,
  LayoutGrid,
  Menu,
  Map,
  Radar,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useTheme } from "./theme-provider";

const links = [
  { href: "/overview", label: "Overview", icon: LayoutGrid },
  { href: "/suppliers", label: "Suppliers", icon: Radar },
  { href: "/analytics", label: "Analytics", icon: Map },
  { href: "/what-if", label: "What-if", icon: SlidersHorizontal },
  { href: "/model-insights", label: "Model", icon: FlaskConical },
] as const;

export function ShellNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-panel)_90%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3">
        <Link href="/overview" className="group flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded border border-[var(--border)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] shadow-[var(--panel-glow)]">
            <Activity className="h-5 w-5 text-[var(--accent)]" aria-hidden />
          </span>
          <div>
            <div className="font-display text-xs tracking-[0.12em] text-[var(--accent)]">
              SRI COMMAND
            </div>
            <div className="text-[11px] text-[var(--fg-muted)]">
              Supplier Risk Intelligence
            </div>
          </div>
        </Link>

        <nav className="hidden flex-wrap items-center gap-1 md:flex" aria-label="Primary">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded px-3 py-2 text-xs font-medium tracking-wide transition-colors page-transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  active
                    ? "bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--fg)]"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="font-display tracking-[0.1em]">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded border border-[var(--border)] px-3 py-2 text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] md:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={toggle}
            className="rounded border border-[var(--border)] px-3 py-2 font-display text-[10px] tracking-[0.14em] text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            aria-label={`Switch theme, current ${theme}`}
          >
            {theme === "stark" ? "SOLAR OPS" : "STARK HUD"}
          </button>
        </div>
      </div>
      {mobileOpen ? (
        <nav
          className="border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-panel)_96%,transparent)] px-3 py-2 md:hidden"
          aria-label="Mobile primary"
        >
          <div className="grid grid-cols-2 gap-2">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded px-3 py-2 text-xs font-medium tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                    active
                      ? "bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--fg)]"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="font-display tracking-[0.08em]">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
