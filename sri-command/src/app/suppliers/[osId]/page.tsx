import Link from "next/link";
import { notFound } from "next/navigation";
import { ArcReactor } from "@/components/arc-reactor";
import { fetchOshFacilityById } from "@/lib/osh/client";
import { normalizeFeature } from "@/lib/osh/normalize";
import type { OshFeature } from "@/lib/osh/types";
import { computeSriScore } from "@/lib/sri/score";
import { DossierTabs } from "./dossier-tabs";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ osId: string }>;
}) {
  const { osId: raw } = await params;
  const osId = decodeURIComponent(raw);
  const { data } = await fetchOshFacilityById(osId);
  const first = data.features[0] as OshFeature | undefined;
  const n = first ? normalizeFeature(first) : null;
  if (!n) notFound();

  const sri = computeSriScore({
    osId: n.osId,
    countryCode: n.countryCode,
    name: n.name,
    sector: n.sector,
    productTypes: n.productTypes,
    facilityTypes: n.facilityTypes,
    contributorCount: n.contributorCount,
    publicContributorCount: n.publicContributorCount,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--fg-muted)]">
        <Link href="/suppliers" className="font-mono hover:text-[var(--fg)]">
          ← BACK TO DIRECTORY
        </Link>
        <span className="font-mono">{n.osId}</span>
      </div>

      <header className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="font-display text-xl tracking-[0.1em] text-[var(--accent)]">
            ENTITY DOSSIER
          </h1>
          <p className="mt-2 text-lg text-[var(--fg)]">{n.name}</p>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">{n.address}</p>
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
            Composite SRI ({sri.modelVersion}) from disclosure metadata only — not financial fact.
          </p>
        </div>
        <div className="hud-panel flex flex-col items-center p-4">
          <ArcReactor score={sri.score} size={280} label={`Entity ${n.name} composite SRI`} />
          <div className="mt-3 font-display text-[10px] tracking-[0.14em] text-[var(--fg-muted)]">
            TIER ·{" "}
            <span
              className={
                sri.tier === "critical"
                  ? "text-[var(--accent-danger)]"
                  : sri.tier === "elevated"
                    ? "text-[var(--accent-warn)]"
                    : "text-[var(--accent)]"
              }
            >
              {sri.tier.toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <DossierTabs
        factors={sri.factors}
        address={n.address}
        country={n.countryCode}
        oshUrl={n.oshUrl}
      />
    </div>
  );
}
