import { NextResponse } from "next/server";
import { fetchOshFacilities } from "@/lib/osh/client";
import { normalizeFeature } from "@/lib/osh/normalize";
import { computeSriScore } from "@/lib/sri/score";
import type { OshFeature } from "@/lib/osh/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const countries = searchParams.get("countries") ?? undefined;
  const sector = searchParams.get("sector") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Math.min(
    200,
    Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20),
  );

  const { data, source, status } = await fetchOshFacilities({
    q,
    countries,
    sector,
    page,
    pageSize,
    detail: false,
  });

  const normalized = data.features
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

  return NextResponse.json(
    {
      meta: {
        source,
        upstreamStatus: status,
        fetchedAt: new Date().toISOString(),
        page,
        pageSize,
        count: data.count ?? normalized.length,
      },
      facilities: normalized,
    },
    { status: 200 },
  );
}
