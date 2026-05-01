import type { ReactNode } from "react";

type Props = {
  label: string;
  value: number;
  sub?: ReactNode;
  tone?: "default" | "warn" | "danger";
};

export function KpiCard({ label, value, sub, tone = "default" }: Props) {
  const toneClass =
    tone === "danger"
      ? "text-[var(--accent-danger)]"
      : tone === "warn"
        ? "text-[var(--accent-warn)]"
        : "text-[var(--accent)]";

  return (
    <article
      data-kpi-card
      className="hud-panel p-4 opacity-0"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="font-display text-[10px] tracking-[0.14em] text-[var(--fg-muted)]">
        {label}
      </div>
      <div className={`mt-2 font-mono text-3xl tabular-nums ${toneClass}`}>
        <span data-count-up data-target={value} suppressHydrationWarning>
          0
        </span>
      </div>
      {sub ? (
        <div className="mt-2 text-xs text-[var(--fg-muted)]">{sub}</div>
      ) : null}
    </article>
  );
}
