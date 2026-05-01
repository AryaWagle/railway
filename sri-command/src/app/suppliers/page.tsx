import Link from "next/link";
import { Suspense } from "react";
import { Sparkline } from "@/components/sparkline";
import { fetchOshFacilities } from "@/lib/osh/client";
import { normalizeFeature } from "@/lib/osh/normalize";
import type { OshFeature } from "@/lib/osh/types";
import { computeSriScore } from "@/lib/sri/score";
import { ScannerForm } from "./scanner-form";

type SearchParams = Record<string, string | string[] | undefined>;

async function SupplierResults({ sp }: { sp: SearchParams }) {
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const countries = typeof sp.countries === "string" ? sp.countries : undefined;
  const sector = typeof sp.sector === "string" ? sp.sector : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const { data, source } = await fetchOshFacilities({
    q,
    countries,
    sector,
    page,
    pageSize: 20,
    detail: false,
  });

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (countries) qs.set("countries", countries);
  if (sector) qs.set("sector", sector);
  const prevQs = new URLSearchParams(qs);
  prevQs.set("page", String(Math.max(1, page - 1)));
  const nextQs = new URLSearchParams(qs);
  nextQs.set("page", String(page + 1));
  const prevHref = `/suppliers?${prevQs.toString()}`;
  const nextHref = `/suppliers?${nextQs.toString()}`;

  const rows = data.features
    .map((f) => normalizeFeature(f as OshFeature))
    .filter(Boolean)
    .map((n) => ({
      ...n!,
      sri: computeSriScore({
        osId: n!.osId,
        countryCode: n!.countryCode,
        name: n!.name,
        sector: n!.sector,
        productTypes: n!.productTypes,
        facilityTypes: n!.facilityTypes,
        contributorCount: n!.contributorCount,
        publicContributorCount: n!.publicContributorCount,
      }),
    }));

  if (rows.length === 0) {
    return (
      <div className="hud-panel p-8 text-center text-sm text-[var(--fg-muted)]">
        SYSTEM NOMINAL — NO ACTIVE THREATS IN THIS QUERY WINDOW
      </div>
    );
  }

  return (
    <div className="hud-panel overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-3 font-mono text-[11px] text-[var(--fg-muted)]">
        STREAM · {source.toUpperCase()} · {rows.length} ROWS
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="font-display text-[10px] tracking-[0.12em] text-[var(--fg-muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3">TELEMETRY</th>
              <th className="px-4 py-3">ENTITY</th>
              <th className="px-4 py-3">REGION</th>
              <th className="px-4 py-3">SECTOR</th>
              <th className="px-4 py-3">SRI</th>
              <th className="px-4 py-3">TIER</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.osId}
                className="border-b border-[color-mix(in_oklab,var(--border)_55%,transparent)] hover:bg-[color-mix(in_oklab,var(--accent)_6%,transparent)]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkline seed={r.osId} />
                    <span className="font-mono text-[10px] text-[var(--fg-muted)]">
                      model
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    className="font-medium text-[var(--fg)] underline-offset-4 hover:underline"
                    href={`/suppliers/${encodeURIComponent(r.osId)}`}
                  >
                    {r.name}
                  </Link>
                  <div className="font-mono text-[11px] text-[var(--fg-muted)]">{r.osId}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.countryCode ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-[var(--fg-muted)]">{r.sector ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-sm tabular-nums text-[var(--accent)]">
                  {r.sri.score}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 font-display text-[10px] tracking-[0.1em] ${
                      r.sri.tier === "critical"
                        ? "bg-[color-mix(in_oklab,var(--accent-danger)_22%,transparent)] text-[var(--accent-danger)]"
                        : r.sri.tier === "elevated"
                          ? "bg-[color-mix(in_oklab,var(--accent-warn)_22%,transparent)] text-[var(--accent-warn)]"
                          : "bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--fg)]"
                    }`}
                  >
                    {r.sri.tier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--fg-muted)]">
        <span>
          Page <span className="font-mono text-[var(--fg)]">{page}</span>
        </span>
        <div className="flex gap-2">
          <Link
            className="rounded border border-[var(--border)] px-3 py-1 font-mono hover:text-[var(--fg)]"
            href={prevHref}
            aria-disabled={page <= 1}
          >
            PREV
          </Link>
          <Link className="rounded border border-[var(--border)] px-3 py-1 font-mono hover:text-[var(--fg)]" href={nextHref}>
            NEXT
          </Link>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return <div className="hud-panel h-64 skeleton" aria-busy />;
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-lg tracking-[0.12em] text-[var(--accent)]">
          THREAT DIRECTORY
        </h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Scanner queries Open Supply Hub facilities. Sparklines are hash-seeded telemetry visuals
          (not OSH time series).
        </p>
      </header>

      <ScannerForm
        initialQ={typeof sp.q === "string" ? sp.q : ""}
        countries={typeof sp.countries === "string" ? sp.countries : undefined}
        sector={typeof sp.sector === "string" ? sp.sector : undefined}
      />

      <Suspense fallback={<TableSkeleton />}>
        <SupplierResults sp={sp} />
      </Suspense>
    </div>
  );
}
