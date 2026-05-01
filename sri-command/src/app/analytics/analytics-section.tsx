"use client";

import dynamic from "next/dynamic";
import { WorldMap } from "@/components/world-map";
import type { EnrichedSupplier, MonthlySnapshot } from "@/lib/supplier-dataset";
import type { MapDot } from "@/components/world-map";

const AnalyticsDashboard = dynamic(
  () => import("@/components/analytics-dashboard").then((m) => m.AnalyticsDashboard),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-[var(--fg-muted)]">Loading chart deck…</p>
    ),
  },
);

export function AnalyticsSection({
  dots,
  active,
  snapshots,
  historicalCount,
  historicalDistressRate,
  distressCounts,
}: {
  dots: MapDot[];
  active: EnrichedSupplier[];
  snapshots: MonthlySnapshot[];
  historicalCount: number;
  historicalDistressRate: number;
  distressCounts: { ok: number; distressed: number };
}) {
  return (
    <>
      <WorldMap dots={dots} />
      <AnalyticsDashboard
        active={active}
        snapshots={snapshots}
        historicalCount={historicalCount}
        historicalDistressRate={historicalDistressRate}
        distressCounts={distressCounts}
      />
    </>
  );
}
