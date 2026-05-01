"use client";

import { useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

type Factor = { id: string; label: string; delta: number };

const tabs = ["Metrics", "Financials", "Logistics"] as const;

export function DossierTabs({
  factors,
  address,
  country,
  oshUrl,
}: {
  factors: Factor[];
  address: string;
  country?: string;
  oshUrl: string;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Metrics");

  return (
    <div className="hud-panel overflow-hidden">
      <div role="tablist" aria-label="Entity dossier sections" className="flex border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`flex-1 px-4 py-3 font-display text-[10px] tracking-[0.12em] transition-colors page-transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)] ${
              tab === t
                ? "bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-[var(--fg)]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="p-4" role="tabpanel">
        {tab === "Metrics" ? (
          <ul className="space-y-3">
            {factors.map((f) => (
              <li
                key={f.id}
                className="flex items-start justify-between gap-4 rounded border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-root)_35%,transparent)] px-3 py-2"
              >
                <div>
                  <div className="text-xs text-[var(--fg)]">{f.label}</div>
                  <div className="font-mono text-[11px] text-[var(--fg-muted)]">{f.id}</div>
                </div>
                <div
                  className={`flex items-center gap-1 font-mono text-sm tabular-nums ${
                    f.delta >= 0 ? "text-[var(--accent-warn)]" : "text-[var(--accent)]"
                  }`}
                >
                  {f.delta >= 0 ? (
                    <TrendingUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <TrendingDown className="h-4 w-4" aria-hidden />
                  )}
                  {f.delta >= 0 ? "+" : ""}
                  {f.delta}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "Financials" ? (
          <div className="space-y-2 text-sm text-[var(--fg-muted)]">
            <p>
              Open Supply Hub does not publish financial statements or credit metrics. This tab is
              reserved for future integrations (e.g., credit bureaus, filings) and remains
              explicitly non-OSH data.
            </p>
            <div className="rounded border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-root)_40%,transparent)] p-3 font-mono text-[11px] text-[var(--fg)]">
              STATUS: NO EXTERNAL FINANCIAL TELEMETRY CONFIGURED
            </div>
          </div>
        ) : null}

        {tab === "Logistics" ? (
          <div className="space-y-3 text-sm">
            <div className="font-mono text-xs text-[var(--fg-muted)]">
              {country ? `${country} · ` : null}
              {address}
            </div>
            <a
              className="inline-flex text-[var(--accent)] underline-offset-4 hover:underline"
              href={oshUrl}
              target="_blank"
              rel="noreferrer"
            >
              View on Open Supply Hub
            </a>
            <div className="rounded border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-root)_40%,transparent)] p-3 text-xs text-[var(--fg-muted)]">
              Map projection available on the Analytics screen for fleet-level coordinates.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
