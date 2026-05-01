import { getEnv, DEFAULT_OSH_BASE } from "@/lib/env";
import {
  oshFeatureCollectionSchema,
  type OshFeatureCollection,
  type OshFeature,
} from "@/lib/osh/types";
import { DEMO_FEATURE_COLLECTION } from "@/lib/osh/fixtures";
import { resolveOshNextUrl } from "@/lib/osh/pagination";

export type FetchFacilitiesParams = {
  q?: string;
  countries?: string;
  sector?: string;
  page?: number;
  pageSize?: number;
  detail?: boolean;
};

export type FetchAggregatedParams = Omit<FetchFacilitiesParams, "page"> & {
  /** When set, follow `next` links at most this many times (including first page). */
  maxPages?: number;
};

function buildSearchParams(p: FetchFacilitiesParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.countries) sp.set("countries", p.countries);
  if (p.sector) sp.set("sector", p.sector);
  if (p.page != null) sp.set("page", String(p.page));
  if (p.pageSize != null) sp.set("pageSize", String(p.pageSize));
  sp.set("detail", p.detail === true ? "true" : "false");
  return sp;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function oshFetchJsonWithRetry(url: string): Promise<{
  ok: boolean;
  status: number;
  json: unknown;
}> {
  const env = getEnv();
  if (!env.OSH_API_TOKEN) {
    return { ok: false, status: 401, json: null };
  }
  let attempt = 0;
  let lastStatus = 500;
  while (attempt < 3) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Token ${env.OSH_API_TOKEN}`,
        Accept: "application/json",
      },
      next: { revalidate: 900 },
    });
    lastStatus = res.status;
    if (res.ok) {
      return { ok: true, status: res.status, json: await res.json() };
    }
    if (res.status === 429 || res.status >= 500) {
      attempt += 1;
      await sleep(400 * 2 ** attempt);
      continue;
    }
    return { ok: false, status: res.status, json: null };
  }
  return { ok: false, status: lastStatus, json: null };
}

/**
 * Single-page fetch (suppliers list UI, API route). Uses demo fixtures when `OSH_API_TOKEN` is unset.
 */
export async function fetchOshFacilities(
  params: FetchFacilitiesParams,
): Promise<{ data: OshFeatureCollection; source: "osh" | "demo"; status: number }> {
  const env = getEnv();
  if (!env.OSH_API_TOKEN) {
    return { data: DEMO_FEATURE_COLLECTION, source: "demo", status: 200 };
  }

  const base = (env.OSH_BASE_URL ?? DEFAULT_OSH_BASE).replace(/\/$/, "");
  const url = `${base}/facilities/?${buildSearchParams(params).toString()}`;

  const { ok, status, json } = await oshFetchJsonWithRetry(url);
  if (!ok || json == null) {
    return { data: DEMO_FEATURE_COLLECTION, source: "demo", status: status || 500 };
  }
  const parsed = oshFeatureCollectionSchema.safeParse(json);
  if (!parsed.success) {
    return { data: DEMO_FEATURE_COLLECTION, source: "demo", status: 200 };
  }
  return { data: parsed.data, source: "osh", status: status };
}

/**
 * Follow OSH pagination (`next`) to build a merged FeatureCollection for dashboards.
 * Without an API token, returns the same demo slice as a one-page `fetchOshFacilities`.
 */
export async function fetchOshFacilitiesAggregated(
  params: FetchAggregatedParams,
): Promise<{ data: OshFeatureCollection; source: "osh" | "demo"; status: number }> {
  const env = getEnv();
  const pageSize = params.pageSize ?? 50;
  const maxPages = params.maxPages ?? 1;

  if (!env.OSH_API_TOKEN) {
    return fetchOshFacilities({
      ...params,
      page: 1,
      pageSize,
      detail: params.detail,
    });
  }

  const base = (env.OSH_BASE_URL ?? DEFAULT_OSH_BASE).replace(/\/$/, "");
  const firstUrl = `${base}/facilities/?${buildSearchParams({ ...params, page: 1, pageSize, detail: params.detail }).toString()}`;

  const merged: OshFeature[] = [];
  let url: string | null = firstUrl;
  let pages = 0;
  let totalCount: number | undefined;
  let lastStatus = 200;

  while (url && pages < maxPages) {
    const { ok, status, json } = await oshFetchJsonWithRetry(url);
    lastStatus = status;
    if (!ok || json == null) {
      if (pages === 0) {
        return { data: DEMO_FEATURE_COLLECTION, source: "demo", status: status || 500 };
      }
      break;
    }
    const parsed = oshFeatureCollectionSchema.safeParse(json);
    if (!parsed.success) {
      if (pages === 0) {
        return { data: DEMO_FEATURE_COLLECTION, source: "demo", status: 200 };
      }
      break;
    }
    const chunk = parsed.data;
    merged.push(...chunk.features);
    totalCount = chunk.count ?? totalCount ?? merged.length;
    pages += 1;
    if (chunk.features.length === 0) break;
    url = resolveOshNextUrl(chunk.next ?? null, `${base}/`);
    if (!url) break;
  }

  return {
    data: {
      type: "FeatureCollection",
      features: merged,
      count: totalCount ?? merged.length,
      next: null,
      previous: null,
    },
    source: "osh",
    status: lastStatus,
  };
}

export async function fetchOshFacilityById(osId: string): Promise<{
  data: OshFeatureCollection;
  source: "osh" | "demo";
  status: number;
}> {
  const env = getEnv();
  if (!env.OSH_API_TOKEN) {
    const hit = DEMO_FEATURE_COLLECTION.features.find(
      (f) => String(f.properties?.os_id ?? "") === osId,
    );
    return {
      data: {
        type: "FeatureCollection",
        count: hit ? 1 : 0,
        features: hit ? [hit] : [],
      },
      source: "demo",
      status: 200,
    };
  }

  const base = (env.OSH_BASE_URL ?? DEFAULT_OSH_BASE).replace(/\/$/, "");
  const url = `${base}/facilities/${encodeURIComponent(osId)}/?detail=true`;

  const { ok, status, json } = await oshFetchJsonWithRetry(url);
  if (!ok || json == null) {
    return fetchOshFacilityByIdDemoFallback(osId);
  }

  const asFc = oshFeatureCollectionSchema.safeParse(json);
  if (asFc.success) {
    return { data: asFc.data, source: "osh", status: status };
  }

  const asFeature = json as { type?: string };
  if (asFeature?.type === "Feature") {
    const wrapped: OshFeatureCollection = {
      type: "FeatureCollection",
      features: [json as OshFeature],
      count: 1,
    };
    return { data: wrapped, source: "osh", status: status };
  }

  return fetchOshFacilityByIdDemoFallback(osId);
}

function fetchOshFacilityByIdDemoFallback(osId: string) {
  const hit = DEMO_FEATURE_COLLECTION.features.find(
    (f) => String(f.properties?.os_id ?? "") === osId,
  );
  return {
    data: {
      type: "FeatureCollection" as const,
      count: hit ? 1 : 0,
      features: hit ? [hit] : [],
    },
    source: "demo" as const,
    status: 200,
  };
}
