"use client";

import { Button } from "@joacod/pixel-ui";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { EnrichedSupplier, MonthlySnapshot } from "@/lib/supplier-dataset";

type TabId = "exec" | "trends" | "quality" | "portfolio";

const CHART_COLORS = ["#00e5ff", "#ffb020", "#ff4d4f", "#51df21", "#f15bfe", "#3337fe", "#adb600", "#fe7269"];

function scoreColor(score: number) {
  if (score >= 75) return "#ff4d4f";
  if (score >= 50) return "#ffb020";
  if (score >= 25) return "#00e5ff";
  return "#7fff7f";
}

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = xs[i] - mx;
    const vy = ys[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx * dy);
  return den < 1e-9 ? 0 : num / den;
}

export function AnalyticsDashboard({
  active,
  snapshots,
  historicalCount,
  historicalDistressRate,
  distressCounts,
}: {
  active: EnrichedSupplier[];
  snapshots: MonthlySnapshot[];
  historicalCount: number;
  historicalDistressRate: number;
  distressCounts: { ok: number; distressed: number };
}) {
  const [tab, setTab] = useState<TabId>("exec");

  const byCategory = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const s of active) {
      const cur = m.get(s.category) ?? { sum: 0, n: 0 };
      cur.sum += s.risk_score;
      cur.n += 1;
      m.set(s.category, cur);
    }
    return [...m.entries()]
      .map(([category, v]) => ({
        category,
        avg_risk: Math.round((v.sum / v.n) * 100) / 100,
        n: v.n,
      }))
      .sort((a, b) => a.avg_risk - b.avg_risk);
  }, [active]);

  const byCountry = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const s of active) {
      const cur = m.get(s.country) ?? { sum: 0, n: 0 };
      cur.sum += s.risk_score;
      cur.n += 1;
      m.set(s.country, cur);
    }
    return [...m.entries()]
      .map(([country, v]) => ({
        country,
        avg_risk: Math.round((v.sum / v.n) * 100) / 100,
        n: v.n,
      }))
      .sort((a, b) => b.avg_risk - a.avg_risk)
      .slice(0, 12);
  }, [active]);

  const trendRows = useMemo(() => {
    const months = [...new Set(snapshots.map((s) => s.month))].sort();
    const cats = [...new Set(snapshots.map((s) => s.category))];
    return months.map((month) => {
      const row: Record<string, string | number> = { month: month.slice(0, 7) };
      for (const c of cats) {
        const hit = snapshots.find((s) => s.month === month && s.category === c);
        row[c] = hit ? hit.fulfillment_rate : NaN;
      }
      return row;
    });
  }, [snapshots]);

  const scatterPts = useMemo(
    () =>
      active.map((s) => ({
        id: s.supplier_id,
        x: Math.round(s.defect_rate * 10000) / 100,
        y: Math.round(s.on_time_delivery_rate * 1000) / 10,
        z: s.risk_score,
      })),
    [active],
  );

  const corr = useMemo(() => {
    const keys = [
      { key: "defect_rate" as const, label: "Defect" },
      { key: "on_time_delivery_rate" as const, label: "OTD" },
      { key: "fulfillment_rate" as const, label: "Fulfill" },
      { key: "payment_delay_days" as const, label: "Pay del." },
      { key: "credit_score" as const, label: "Credit" },
      { key: "quality_audit_score" as const, label: "Quality" },
    ];
    const n = active.length;
    const matrix: number[][] = keys.map(() => keys.map(() => 0));
    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < keys.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
          continue;
        }
        const xi = active.map((s) => s[keys[i].key]);
        const xj = active.map((s) => s[keys[j].key]);
        matrix[i][j] = n >= 3 ? pearson(xi, xj) : 0;
      }
    }
    return { keys, matrix };
  }, [active]);

  const trendCategories = useMemo(
    () => [...new Set(snapshots.map((s) => s.category))].sort(),
    [snapshots],
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: "exec", label: "Executive" },
    { id: "trends", label: "Trends" },
    { id: "quality", label: "Quality" },
    { id: "portfolio", label: "Portfolio (5k)" },
  ];

  const chartWrap = "mt-3 h-[min(360px,42vh)] w-full min-h-[260px] min-w-0";

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Analytics sections"
        className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3"
      >
        {tabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant={tab === t.id ? "primary" : "ghost"}
            size="sm"
            onClick={() => setTab(t.id)}
            aria-selected={tab === t.id}
            role="tab"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "exec" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="hud-panel p-4" aria-label="Average risk by category">
            <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
              AVG RISK BY CATEGORY · {active.length} ACTIVE SUPPLIERS
            </h2>
            <div className={chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid stroke="color-mix(in oklab, var(--border) 70%, transparent)" />
                  <XAxis type="number" domain={[0, "auto"]} stroke="var(--fg-muted)" fontSize={11} />
                  <YAxis type="category" dataKey="category" width={100} stroke="var(--fg-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-panel)",
                      border: "1px solid var(--border)",
                      color: "var(--fg)",
                    }}
                  />
                  <Bar dataKey="avg_risk" name="Avg risk" radius={[0, 4, 4, 0]}>
                    {byCategory.map((e) => (
                      <Cell key={e.category} fill={scoreColor(e.avg_risk)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="hud-panel p-4" aria-label="Average risk by country">
            <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
              AVG RISK BY COUNTRY (TOP 12)
            </h2>
            <div className={chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCountry} margin={{ bottom: 48 }}>
                  <CartesianGrid stroke="color-mix(in oklab, var(--border) 70%, transparent)" />
                  <XAxis dataKey="country" angle={-25} textAnchor="end" height={60} stroke="var(--fg-muted)" fontSize={11} />
                  <YAxis stroke="var(--fg-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-panel)",
                      border: "1px solid var(--border)",
                      color: "var(--fg)",
                    }}
                  />
                  <Bar dataKey="avg_risk" name="Avg risk">
                    {byCountry.map((e) => (
                      <Cell key={e.country} fill={scoreColor(e.avg_risk)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {tab === "trends" && (
        <section className="hud-panel p-4" aria-label="Monthly fulfillment by category">
          <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
            MONTHLY FULFILLMENT RATE BY CATEGORY · {snapshots.length} SNAPSHOT ROWS
          </h2>
          {trendRows.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--fg-muted)]">No snapshot data in public/data.</p>
          ) : (
            <div className={chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendRows} margin={{ left: 4, right: 8 }}>
                  <CartesianGrid stroke="color-mix(in oklab, var(--border) 70%, transparent)" />
                  <XAxis dataKey="month" stroke="var(--fg-muted)" fontSize={11} />
                  <YAxis domain={[0.7, 1]} stroke="var(--fg-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-panel)",
                      border: "1px solid var(--border)",
                      color: "var(--fg)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {trendCategories.map((c, i) => (
                    <Line
                      key={c}
                      type="monotone"
                      dataKey={c}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      dot={false}
                      strokeWidth={2}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {tab === "quality" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="hud-panel p-4" aria-label="Defect rate vs on-time delivery">
            <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
              DEFECT RATE (%) VS ON-TIME DELIVERY (%)
            </h2>
            <div className={chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 8 }}>
                  <CartesianGrid stroke="color-mix(in oklab, var(--border) 70%, transparent)" />
                  <XAxis type="number" dataKey="x" name="Defect %" stroke="var(--fg-muted)" fontSize={11} />
                  <YAxis type="number" dataKey="y" name="OTD %" domain={[0, 100]} stroke="var(--fg-muted)" fontSize={11} />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      background: "var(--bg-panel)",
                      border: "1px solid var(--border)",
                      color: "var(--fg)",
                    }}
                  />
                  <Scatter name="Suppliers" data={scatterPts} fill="#00e5ff" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="hud-panel p-4" aria-label="Feature correlation heatmap">
            <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
              FEATURE CORRELATION (PEARSON)
            </h2>
            <div className="mt-4 overflow-x-auto">
              <svg
                viewBox={`0 0 ${corr.keys.length * 52 + 40} ${corr.keys.length * 52 + 40}`}
                className="mx-auto max-h-[360px] w-full"
                role="img"
                aria-label="Correlation matrix"
              >
                <text x={8} y={18} className="fill-[var(--fg-muted)] text-[10px]">
                  −1
                </text>
                <text x={120} y={18} className="fill-[var(--fg-muted)] text-[10px]">
                  0
                </text>
                <text x={220} y={18} className="fill-[var(--fg-muted)] text-[10px]">
                  +1
                </text>
                {corr.matrix.map((row, i) =>
                  row.map((v, j) => {
                    const t = (v + 1) / 2;
                    const hue = 200 - t * 120;
                    return (
                      <rect
                        key={`${i}-${j}`}
                        x={32 + j * 52}
                        y={32 + i * 52}
                        width={48}
                        height={48}
                        rx={4}
                        fill={`hsla(${hue}, 70%, 45%, ${0.35 + Math.abs(v) * 0.45})`}
                        stroke="var(--border)"
                      >
                        <title>{`${corr.keys[i].label} × ${corr.keys[j].label}: ${v.toFixed(2)}`}</title>
                      </rect>
                    );
                  }),
                )}
                {corr.keys.map((k, i) => (
                  <text
                    key={k.label}
                    x={8}
                    y={56 + i * 52}
                    className="fill-[var(--fg-muted)] text-[9px]"
                    dominantBaseline="middle"
                  >
                    {k.label}
                  </text>
                ))}
                {corr.keys.map((k, j) => (
                  <text
                    key={`c-${k.label}`}
                    x={56 + j * 52}
                    y={24}
                    textAnchor="middle"
                    className="fill-[var(--fg-muted)] text-[9px]"
                  >
                    {k.label}
                  </text>
                ))}
              </svg>
            </div>
          </section>
        </div>
      )}

      {tab === "portfolio" && (
        <section className="hud-panel p-4" aria-label="Historical training portfolio">
          <h2 className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
            HISTORICAL LABELED PORTFOLIO (PYTHON GENERATOR)
          </h2>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            Mirrors <span className="font-mono text-[var(--fg)]">historical_suppliers.csv</span>:{" "}
            <span className="font-mono text-[var(--accent)]">{historicalCount}</span> rows · model distress
            rate <span className="font-mono text-[var(--accent)]">{(historicalDistressRate * 100).toFixed(1)}%</span>
          </p>
          <div className="mt-4 h-56 w-full max-w-md">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { label: "Performing", value: distressCounts.ok },
                  { label: "Distressed", value: distressCounts.distressed },
                ]}
                margin={{ left: 8 }}
              >
                <CartesianGrid stroke="color-mix(in oklab, var(--border) 70%, transparent)" />
                <XAxis dataKey="label" stroke="var(--fg-muted)" fontSize={11} />
                <YAxis stroke="var(--fg-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-panel)",
                    border: "1px solid var(--border)",
                    color: "var(--fg)",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <Cell fill="#00e5ff" />
                  <Cell fill="#ff4d4f" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
