import { AnalyticsSection } from "./analytics-section";
import {
  loadActiveSuppliersAny,
  loadMonthlySnapshotsAny,
  loadTrainingMetricsAny,
} from "@/lib/supplier-dataset";

export default async function AnalyticsPage() {
  const active = await loadActiveSuppliersAny();
  const snapshots = await loadMonthlySnapshotsAny();
  const { historicalCount, historicalDistressRate, distressCounts } =
    await loadTrainingMetricsAny();

  const dots = active.map((s) => ({
    id: s.supplier_id,
    lng: s.lng,
    lat: s.lat,
    label: s.name,
    score: s.risk_score,
    risk_tier: s.risk_tier,
  }));

  const dataReady = active.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-lg tracking-[0.12em] text-[var(--accent)]">
          ANALYTICS COMMAND
        </h1>
        <p className="max-w-3xl text-sm text-[var(--fg-muted)]">
          Full portfolio from your Python-generated CSVs in{" "}
          <span className="font-mono text-[var(--fg)]">public/data</span>
          {dataReady ? (
            <>
              :{" "}
              <span className="font-mono text-[var(--accent)]">{active.length}</span> active suppliers,{" "}
              <span className="font-mono text-[var(--accent)]">{historicalCount}</span> historical training
              rows, <span className="font-mono text-[var(--accent)]">{snapshots.length}</span> monthly snapshot
              points. Basemap: Natural Earth 110m. Pixel UI: tabs & map reset.
            </>
          ) : (
            <>
              . <strong className="text-[var(--accent-warn)]">No local data found.</strong> Add CSVs under{" "}
              <span className="font-mono">public/data</span> or set{" "}
              <span className="font-mono">RISK_API_URL</span> to a running FastAPI backend to stream live
              mock data.
            </>
          )}
        </p>
      </header>

      {dataReady ? (
        <AnalyticsSection
          dots={dots}
          active={active}
          snapshots={snapshots}
          historicalCount={historicalCount}
          historicalDistressRate={historicalDistressRate}
          distressCounts={distressCounts}
        />
      ) : null}
    </div>
  );
}
