import { z } from "zod";

export const SRI_MODEL_VERSION = "SRI-1.0.0-composite";

export const facilityFeaturesSchema = z.object({
  osId: z.string(),
  countryCode: z.string().length(2).optional(),
  name: z.string(),
  sector: z.string().optional(),
  productTypes: z.array(z.string()).default([]),
  contributorCount: z.number().int().nonnegative().optional(),
  publicContributorCount: z.number().int().nonnegative().optional(),
  facilityTypes: z.array(z.string()).default([]),
});

export type FacilityFeatures = z.infer<typeof facilityFeaturesSchema>;

export type RiskTier = "nominal" | "elevated" | "critical";

export type Factor = {
  id: string;
  label: string;
  delta: number;
};

export type SriScoreResult = {
  score: number;
  tier: RiskTier;
  factors: Factor[];
  modelVersion: typeof SRI_MODEL_VERSION;
};

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Higher-risk country buckets (illustrative composite only — not geopolitical fact). */
const elevatedCountryCodes = new Set([
  "BD",
  "VN",
  "IN",
  "PK",
  "TR",
  "CN",
  "MX",
  "ID",
]);

function tierFromScore(score: number): RiskTier {
  if (score >= 72) return "critical";
  if (score >= 44) return "elevated";
  return "nominal";
}

/**
 * Deterministic composite index from disclosure metadata only.
 * Not a financial or credit assessment.
 */
export function computeSriScore(raw: FacilityFeatures): SriScoreResult {
  const f = facilityFeaturesSchema.parse(raw);
  const factors: Factor[] = [];

  let score = 22;
  const cc = (f.countryCode ?? "ZZ").toUpperCase();
  const geo = elevatedCountryCodes.has(cc) ? 18 : 6;
  factors.push({
    id: "geo",
    label: "Regional exposure (composite)",
    delta: geo - 12,
  });
  score += geo;

  const contrib = f.contributorCount ?? f.publicContributorCount ?? 1;
  const contribTension = Math.min(28, Math.max(0, (contrib - 1) * 7));
  factors.push({
    id: "contributors",
    label: "Multi-source disclosure tension",
    delta: contribTension - 10,
  });
  score += contribTension;

  const sectorEntropy = Math.min(
    16,
    Math.floor((f.sector?.length ?? 0) / 6) + f.productTypes.length * 2,
  );
  factors.push({
    id: "taxonomy",
    label: "Sector / product cardinality",
    delta: sectorEntropy - 6,
  });
  score += sectorEntropy;

  const typeBreadth = Math.min(14, f.facilityTypes.length * 4);
  factors.push({
    id: "processing",
    label: "Facility / processing breadth",
    delta: typeBreadth - 4,
  });
  score += typeBreadth;

  const noise = (hashSeed(f.osId + f.name) % 9) - 4;
  factors.push({
    id: "entity_entropy",
    label: "Entity fingerprint (hash-stable)",
    delta: noise,
  });
  score += noise;

  score = Math.round(Math.min(100, Math.max(0, score)));

  return {
    score,
    tier: tierFromScore(score),
    factors,
    modelVersion: SRI_MODEL_VERSION,
  };
}

export function fulfillmentProxyPercent(facilities: { contributorCount?: number }[]): number {
  if (facilities.length === 0) return 0;
  const ok = facilities.filter((x) => (x.contributorCount ?? 0) >= 2).length;
  return Math.round((ok / facilities.length) * 100);
}
