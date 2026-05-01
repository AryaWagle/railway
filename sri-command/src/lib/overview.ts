import { fetchOshFacilitiesAggregated } from "@/lib/osh/client";
import { getEnv } from "@/lib/env";
import { normalizeFeature } from "@/lib/osh/normalize";
import type { OshFeature } from "@/lib/osh/types";
import {
  computeSriScore,
  fulfillmentProxyPercent,
  type SriScoreResult,
} from "@/lib/sri/score";

export type EnrichedFacility = {
  osId: string;
  name: string;
  address: string;
  countryCode?: string;
  sector?: string;
  lng?: number;
  lat?: number;
  oshUrl: string;
  contributorCount: number;
  sri: SriScoreResult;
};

export async function loadEnrichedFacilities(): Promise<{
  facilities: EnrichedFacility[];
  source: "osh" | "demo";
  fetchedAt: string;
}> {
  const env = getEnv();
  const hasToken = Boolean(env.OSH_API_TOKEN);
  const pageSize = env.OSH_PAGE_SIZE ?? (hasToken ? 100 : 50);
  const maxPages = hasToken ? (env.OSH_MAX_PAGES ?? 25) : 1;
  const featureCap = env.OSH_FEATURE_CAP ?? 5000;

  const { data, source } = await fetchOshFacilitiesAggregated({
    pageSize,
    maxPages,
    detail: false,
  });

  const cappedFeatures = data.features.slice(0, featureCap);

  const facilities: EnrichedFacility[] = cappedFeatures
    .map((f) => normalizeFeature(f as OshFeature))
    .filter(Boolean)
    .map((n) => {
      const sri = computeSriScore({
        osId: n!.osId,
        countryCode: n!.countryCode,
        name: n!.name,
        sector: n!.sector,
        productTypes: n!.productTypes,
        facilityTypes: n!.facilityTypes,
        contributorCount: n!.contributorCount,
        publicContributorCount: n!.publicContributorCount,
      });
      return {
        osId: n!.osId,
        name: n!.name,
        address: n!.address,
        countryCode: n!.countryCode,
        sector: n!.sector,
        lng: n!.lng,
        lat: n!.lat,
        oshUrl: n!.oshUrl,
        contributorCount: n!.contributorCount,
        sri,
      };
    });

  return {
    facilities,
    source,
    fetchedAt: new Date().toISOString(),
  };
}

export function aggregateOverview(facilities: EnrichedFacility[]) {
  const active = facilities.length;
  const critical = facilities.filter((f) => f.sri.tier === "critical").length;
  const avg =
    active === 0
      ? 0
      : Math.round(
          facilities.reduce((s, f) => s + f.sri.score, 0) / active,
        );
  const fulfillment = fulfillmentProxyPercent(facilities);

  return { active, critical, avg, fulfillment };
}

export function syntheticHistogramBins(facilities: EnrichedFacility[]) {
  const bins = Array.from({ length: 10 }, (_, i) => ({ label: `W${i + 1}`, value: 0 }));
  for (const f of facilities) {
    let h = 0;
    for (let i = 0; i < f.osId.length; i++) h = (h + f.osId.charCodeAt(i) * (i + 1)) % 997;
    const idx = h % bins.length;
    bins[idx].value += 1;
  }
  if (facilities.length === 0) {
    return bins.map((b, i) => ({ label: String(i + 1), value: 0 }));
  }
  return bins.map((b, i) => ({ label: `D-${(10 - i) * 3}`, value: b.value }));
}
