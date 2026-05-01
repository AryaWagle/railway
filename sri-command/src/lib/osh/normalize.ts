import type { NormalizedFacility, OshFeature } from "./types";

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function splitList(v: unknown): string[] {
  const s = asString(v);
  if (!s) return [];
  return s
    .split(/[|,]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Normalize OSH GeoJSON feature properties (handles common field variants).
 */
export function normalizeFeature(f: OshFeature): NormalizedFacility | null {
  const p = f.properties ?? {};
  const osId =
    asString(p.os_id) ||
    asString(p.osId) ||
    asString(p.id) ||
    asString(p.oar_id) ||
    "";

  if (!osId) return null;

  const name = asString(p.name) || "Unknown facility";
  const address = asString(p.address) || asString(p.street_address) || "";
  const countryCode = (asString(p.country_code) || asString(p.country) || "")
    .slice(0, 2)
    .toUpperCase() || undefined;

  const sector = asString(p.sector) || undefined;
  const productTypes = [
    ...splitList(p.product_type),
    ...splitList(p.product_types),
  ];

  const facilityTypes = [
    ...splitList(p.facility_type),
    ...splitList(p.facility_types),
  ];
  const processingTypes = [
    ...splitList(p.processing_type),
    ...splitList(p.processing_types),
  ];

  const contributorCount =
    asNumber(p.number_of_contributors) ??
    asNumber(p.contributors_count) ??
    (Array.isArray(p.contributors) ? p.contributors.length : 1);

  const publicContributorCount =
    asNumber(p.number_of_public_contributors) ?? undefined;

  let lng: number | undefined;
  let lat: number | undefined;
  if (
    f.geometry &&
    f.geometry.type === "Point" &&
    Array.isArray(f.geometry.coordinates)
  ) {
    const [lo, la] = f.geometry.coordinates;
    if (typeof lo === "number" && typeof la === "number") {
      lng = lo;
      lat = la;
    }
  }

  return {
    osId,
    name,
    address,
    countryCode,
    sector,
    productTypes,
    facilityTypes,
    processingTypes,
    contributorCount: Math.max(0, contributorCount ?? 1),
    publicContributorCount,
    lng,
    lat,
    oshUrl: `https://opensupplyhub.org/facilities/${osId}`,
  };
}
