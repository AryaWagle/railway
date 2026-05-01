import { ArcReactor } from "@/components/arc-reactor";
import { Histogram30 } from "@/components/histogram";
import { KpiCard } from "@/components/kpi-card";
import {
  aggregateOverview,
  loadEnrichedFacilities,
  syntheticHistogramBins,
} from "@/lib/overview";
import { loadActiveSuppliersAny, riskHistogramBins } from "@/lib/supplier-dataset";

export default async function OverviewPage() {
  const { facilities, source, fetchedAt } = await loadEnrichedFacilities();
  const { active, critical, avg, fulfillment } = aggregateOverview(facilities);
  const oshBins = syntheticHistogramBins(facilities);

  const portfolio = await loadActiveSuppliersAny();
  const hasPortfolio = portfolio.length > 0;
  const portfolioAvg =
    hasPortfolio ? Math.round(portfolio.reduce((s, p) => s + p.risk_score, 0) / portfolio.length) : 0;
  const portfolioCritical = hasPortfolio
    ? portfolio.filter((p) => p.risk_tier === "Critical").length
    : 0;
  const portfolioFulfillment = hasPortfolio
    ? Math.round(
        portfolio.reduce((s, p) => s + p.fulfillment_rate, 0) / portfolio.length * 1000,
      ) / 10
    : 0;
  const riskBins = hasPortfolio ? riskHistogramBins(portfolio) : [];
  const topCategories = hasPortfolio
    ? Object.entries(
        portfolio.reduce<Record<string, number>>((acc, p) => {
          acc[p.category] = (acc[p.category] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
    : [];
  const topCountries = hasPortfolio
    ? Object.entries(
        portfolio.reduce<Record<string, number>>((acc, p) => {
          acc[p.country] = (acc[p.country] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-lg tracking-[0.12em] text-[var(--accent)]">
            GLOBAL COMMAND
          </h1>
          <p className="max-w-2xl text-sm text-[var(--fg-muted)]">
            Composite Supplier Risk Index (SRI) from{" "}
            <a
              className="text-[var(--accent)] underline-offset-4 hover:underline"
              href="https://opensupplyhub.org/"
              target="_blank"
              rel="noreferrer"
            >
              Open Supply Hub
            </a>{" "}
            metadata in the current API window, plus your full CSV portfolio when present in{" "}
            <span className="font-mono text-[var(--fg)]">public/data</span>. OSH dataset:{" "}
            <span className="font-mono text-[var(--fg)]">{source.toUpperCase()}</span> ·{" "}
            <span className="font-mono text-[11px]">{fetchedAt}</span>
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="ACTIVE FACILITIES (OSH)" value={active} sub="In current result window" />
        <KpiCard
          label="CRITICAL TIER (OSH)"
          value={critical}
          tone="danger"
          sub="SRI tier = critical"
        />
        <KpiCard label="AVG SRI (OSH)" value={avg} sub="Mean composite score" />
        <KpiCard
          label="FULFILLMENT PROXY (OSH)"
          value={fulfillment}
          tone="warn"
          sub="% with ≥2 contributors (proxy)"
        />
      </section>

      {hasPortfolio ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="PORTFOLIO SUPPLIERS (CSV)"
            value={portfolio.length}
            sub="active_suppliers.csv"
          />
          <KpiCard
            label="PORTFOLIO CRITICAL"
            value={portfolioCritical}
            tone="danger"
            sub="Proxy risk tier"
          />
          <KpiCard label="PORTFOLIO AVG RISK" value={portfolioAvg} sub="Deterministic proxy score" />
          <KpiCard
            label="AVG FULFILLMENT (CSV)"
            value={portfolioFulfillment}
            tone="warn"
            sub="Mean fulfillment_rate (%)"
          />
        </section>
      ) : (
        <p className="rounded border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-panel)_80%,transparent)] px-4 py-3 text-sm text-[var(--fg-muted)]">
          Add <span className="font-mono text-[var(--fg)]">public/data/active_suppliers.csv</span>{" "}
          (from your Python <span className="font-mono">backend/data</span>) to unlock portfolio KPIs
          and histograms driven by the same 5000-row ecosystem.
        </p>
      )}

      <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <Histogram30
            bins={oshBins}
            caption="Synthetic buckets from entity hash (OSH window — not time series)"
          />
          {hasPortfolio ? (
            <Histogram30
              bins={riskBins}
              caption="Portfolio risk score distribution (CSV · proxy model)"
            />
          ) : null}
        </div>
        <div className="hud-panel flex flex-col items-center justify-center p-6">
          <div className="font-display text-[10px] tracking-[0.14em] text-[var(--fg-muted)]">
            COMMAND CORE
          </div>
          <ArcReactor
            score={hasPortfolio ? portfolioAvg : avg}
            size={240}
            label={hasPortfolio ? "Portfolio avg proxy risk" : "Fleet average composite SRI"}
          />
        </div>
      </section>

      {hasPortfolio ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="hud-panel p-4">
            <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
              CATEGORY EXPOSURE (TOP 6)
            </h2>
            <div className="mt-3 space-y-2">
              {topCategories.map(([k, v]) => (
                <div key={k}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--fg-muted)]">{k}</span>
                    <span className="font-mono text-[var(--fg)]">{v}</span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-[color-mix(in_oklab,var(--fg)_10%,transparent)]">
                    <div
                      className="h-2 rounded bg-[var(--accent)] transition-all duration-500"
                      style={{
                        width: `${Math.max(4, (v / (topCategories[0]?.[1] ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hud-panel p-4">
            <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
              COUNTRY EXPOSURE (TOP 6)
            </h2>
            <div className="mt-3 space-y-2">
              {topCountries.map(([k, v]) => (
                <div key={k}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--fg-muted)]">{k}</span>
                    <span className="font-mono text-[var(--fg)]">{v}</span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-[color-mix(in_oklab,var(--fg)_10%,transparent)]">
                    <div
                      className="h-2 rounded bg-[var(--accent-warn)] transition-all duration-500"
                      style={{
                        width: `${Math.max(4, (v / (topCountries[0]?.[1] ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
