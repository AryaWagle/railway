import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { COUNTRY_CENTROIDS, jitterLngLat } from "@/lib/country-centroids";
import { getEnv } from "@/lib/env";
import {
  proxyRiskScore,
  proxyRiskTier,
  type SupplierFeatureRow,
} from "@/lib/supplier-risk-proxy";

export type EnrichedSupplier = {
  supplier_id: string;
  name: string;
  category: string;
  country: string;
  onboarded_date: string;
  risk_score: number;
  risk_tier: ReturnType<typeof proxyRiskTier>;
  lng: number;
  lat: number;
  years_in_business: number;
  tier: number;
  on_time_delivery_rate: number;
  avg_delivery_delay_days: number;
  defect_rate: number;
  order_volume_monthly: number;
  fulfillment_rate: number;
  return_rate: number;
  payment_delay_days: number;
  credit_score: number;
  debt_to_equity: number;
  current_ratio: number;
  revenue_growth_pct: number;
  cash_runway_months: number;
  complaints_last_90d: number;
  contract_renewal_rate: number;
  quality_audit_score: number;
};

export type HistoricalSupplier = EnrichedSupplier & { defaulted: 0 | 1 };

export type MonthlySnapshot = {
  month: string;
  category: string;
  fulfillment_rate: number;
  on_time_delivery_rate: number;
  avg_risk_score: number;
  defect_rate: number;
  order_volume: number;
};

function num(s: string | undefined, fallback = 0): number {
  if (s === undefined || s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function int(s: string | undefined, fallback = 0): number {
  return Math.round(num(s, fallback));
}

function rowToFeatures(r: Record<string, string>): SupplierFeatureRow {
  return {
    tier: int(r.tier, 2),
    on_time_delivery_rate: num(r.on_time_delivery_rate),
    avg_delivery_delay_days: num(r.avg_delivery_delay_days),
    defect_rate: num(r.defect_rate),
    fulfillment_rate: num(r.fulfillment_rate),
    payment_delay_days: num(r.payment_delay_days),
    credit_score: int(r.credit_score, 600),
    debt_to_equity: num(r.debt_to_equity),
    current_ratio: num(r.current_ratio),
    revenue_growth_pct: num(r.revenue_growth_pct),
    cash_runway_months: num(r.cash_runway_months),
    complaints_last_90d: int(r.complaints_last_90d),
    quality_audit_score: num(r.quality_audit_score),
  };
}

function enrichCommon(r: Record<string, string>): EnrichedSupplier {
  const features = rowToFeatures(r);
  const risk_score = proxyRiskScore(features);
  const risk_tier = proxyRiskTier(risk_score);
  const base = COUNTRY_CENTROIDS[r.country] ?? [0, 20];
  const [lng, lat] = jitterLngLat(r.supplier_id ?? r.name, base);

  return {
    supplier_id: r.supplier_id ?? "",
    name: r.name ?? "",
    category: r.category ?? "",
    country: r.country ?? "",
    onboarded_date: r.onboarded_date ?? "",
    risk_score,
    risk_tier,
    lng,
    lat,
    years_in_business: num(r.years_in_business),
    tier: int(r.tier),
    on_time_delivery_rate: num(r.on_time_delivery_rate),
    avg_delivery_delay_days: num(r.avg_delivery_delay_days),
    defect_rate: num(r.defect_rate),
    order_volume_monthly: int(r.order_volume_monthly),
    fulfillment_rate: num(r.fulfillment_rate),
    return_rate: num(r.return_rate),
    payment_delay_days: num(r.payment_delay_days),
    credit_score: int(r.credit_score),
    debt_to_equity: num(r.debt_to_equity),
    current_ratio: num(r.current_ratio),
    revenue_growth_pct: num(r.revenue_growth_pct),
    cash_runway_months: num(r.cash_runway_months),
    complaints_last_90d: int(r.complaints_last_90d),
    contract_renewal_rate: num(r.contract_renewal_rate),
    quality_audit_score: num(r.quality_audit_score),
  };
}

function readCsvAtPath(
  fullPath: string,
  rowOk: (row: Record<string, string>) => boolean = (row) => !!(row.supplier_id || row.name),
): Record<string, string>[] {
  if (!fs.existsSync(fullPath)) return [];
  const text = fs.readFileSync(fullPath, "utf8");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data.filter(rowOk);
}

function readLargestLocalCsv(
  file: string,
  rowOk: (row: Record<string, string>) => boolean = (row) => !!(row.supplier_id || row.name),
): Record<string, string>[] {
  const candidates = [
    path.join(process.cwd(), "public", "data", file),
    path.join(process.cwd(), "..", "supplier-risk-api", "backend", "data", file),
  ];
  let best: Record<string, string>[] = [];
  for (const p of candidates) {
    const rows = readCsvAtPath(p, rowOk);
    if (rows.length > best.length) best = rows;
  }
  return best;
}

export function loadActiveSuppliers(): EnrichedSupplier[] {
  return readLargestLocalCsv("active_suppliers.csv").map(enrichCommon);
}

export function loadHistoricalSuppliers(): HistoricalSupplier[] {
  return readLargestLocalCsv("historical_suppliers.csv").map((r) => ({
    ...enrichCommon(r),
    defaulted: int(r.defaulted) ? 1 : 0,
  }));
}

export function loadMonthlySnapshots(): MonthlySnapshot[] {
  return readLargestLocalCsv(
    "monthly_snapshots.csv",
    (row) => !!(row.month && row.category),
  ).map((r) => ({
    month: r.month ?? "",
    category: r.category ?? "",
    fulfillment_rate: num(r.fulfillment_rate),
    on_time_delivery_rate: num(r.on_time_delivery_rate),
    avg_risk_score: num(r.avg_risk_score),
    defect_rate: num(r.defect_rate),
    order_volume: int(r.order_volume),
  }));
}

type SupplierListPayload = {
  total: number;
  page: number;
  page_size: number;
  items: Array<Record<string, unknown>>;
};

type MetricsPayload = {
  n_train: number;
  positive_rate_train: number;
  confusion_matrix: number[][];
};

function riskApiBase(): string | null {
  const env = getEnv();
  return (env.RISK_API_URL ?? null)?.replace(/\/$/, "") ?? null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function supplierApiRowToEnriched(row: Record<string, unknown>): EnrichedSupplier {
  const supplier_id = String(row.supplier_id ?? "");
  const name = String(row.name ?? "");
  const category = String(row.category ?? "");
  const country = String(row.country ?? "");
  const onboarded_date = String(row.onboarded_date ?? "");

  const base = COUNTRY_CENTROIDS[country] ?? [0, 20];
  const [lng, lat] = jitterLngLat(supplier_id || name, base);

  const risk_score = Number(row.risk_score ?? 0);
  const risk_tier = proxyRiskTier(risk_score);

  return {
    supplier_id,
    name,
    category,
    country,
    onboarded_date,
    risk_score,
    risk_tier,
    lng,
    lat,
    years_in_business: Number(row.years_in_business ?? 0),
    tier: Number(row.tier ?? 0),
    on_time_delivery_rate: Number(row.on_time_delivery_rate ?? 0),
    avg_delivery_delay_days: Number(row.avg_delivery_delay_days ?? 0),
    defect_rate: Number(row.defect_rate ?? 0),
    order_volume_monthly: Number(row.order_volume_monthly ?? 0),
    fulfillment_rate: Number(row.fulfillment_rate ?? 0),
    return_rate: Number(row.return_rate ?? 0),
    payment_delay_days: Number(row.payment_delay_days ?? 0),
    credit_score: Number(row.credit_score ?? 0),
    debt_to_equity: Number(row.debt_to_equity ?? 0),
    current_ratio: Number(row.current_ratio ?? 0),
    revenue_growth_pct: Number(row.revenue_growth_pct ?? 0),
    cash_runway_months: Number(row.cash_runway_months ?? 0),
    complaints_last_90d: Number(row.complaints_last_90d ?? 0),
    contract_renewal_rate: Number(row.contract_renewal_rate ?? 0),
    quality_audit_score: Number(row.quality_audit_score ?? 0),
  };
}

async function fetchAllSuppliersFromApi(base: string, pageSize = 500): Promise<EnrichedSupplier[]> {
  const first = await fetchJson<SupplierListPayload>(
    `${base}/suppliers?page=1&page_size=${pageSize}`,
  );
  const total = Number(first.total ?? first.items.length);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const all = [...first.items];
  for (let p = 2; p <= pages; p++) {
    const chunk = await fetchJson<SupplierListPayload>(
      `${base}/suppliers?page=${p}&page_size=${pageSize}`,
    );
    all.push(...chunk.items);
  }
  return all.map((r) => supplierApiRowToEnriched(r));
}

export async function loadActiveSuppliersAny(): Promise<EnrichedSupplier[]> {
  const fromCsv = loadActiveSuppliers();
  const base = riskApiBase();
  if (!base) return fromCsv;
  try {
    const fromApi = await fetchAllSuppliersFromApi(base);
    return fromApi.length > fromCsv.length ? fromApi : fromCsv;
  } catch {
    return fromCsv;
  }
}

export async function loadMonthlySnapshotsAny(): Promise<MonthlySnapshot[]> {
  const fromCsv = loadMonthlySnapshots();
  const base = riskApiBase();
  if (!base) return fromCsv;
  try {
    const payload = await fetchJson<{ items: MonthlySnapshot[] }>(`${base}/snapshots`);
    const fromApi = payload.items ?? [];
    return fromApi.length > fromCsv.length ? fromApi : fromCsv;
  } catch {
    return fromCsv;
  }
}

export async function loadTrainingMetricsAny(): Promise<{
  historicalCount: number;
  historicalDistressRate: number;
  distressCounts: { ok: number; distressed: number };
}> {
  const historical = loadHistoricalSuppliers();
  if (historical.length > 0) {
    const historicalDistressRate =
      historical.reduce((a, h) => a + h.defaulted, 0) / historical.length;
    const distressCounts = {
      ok: historical.filter((h) => h.defaulted === 0).length,
      distressed: historical.filter((h) => h.defaulted === 1).length,
    };
    return {
      historicalCount: historical.length,
      historicalDistressRate,
      distressCounts,
    };
  }

  const base = riskApiBase();
  if (!base) {
    return { historicalCount: 0, historicalDistressRate: 0, distressCounts: { ok: 0, distressed: 0 } };
  }
  try {
    const m = await fetchJson<MetricsPayload>(`${base}/metrics`);
    const historicalCount = Number(m.n_train ?? 0);
    const historicalDistressRate = Number(m.positive_rate_train ?? 0);
    const cm = m.confusion_matrix ?? [[0, 0], [0, 0]];
    const ok = Number(cm?.[0]?.[0] ?? 0) + Number(cm?.[0]?.[1] ?? 0);
    const distressed = Number(cm?.[1]?.[0] ?? 0) + Number(cm?.[1]?.[1] ?? 0);
    return { historicalCount, historicalDistressRate, distressCounts: { ok, distressed } };
  } catch {
    return { historicalCount: 0, historicalDistressRate: 0, distressCounts: { ok: 0, distressed: 0 } };
  }
}

export function riskHistogramBins(suppliers: EnrichedSupplier[], bins = 10) {
  const edges = Array.from({ length: bins }, (_, i) => ({
    label: `${i * 10}–${i * 10 + 9}`,
    min: i * 10,
    max: i * 10 + 10,
    value: 0,
  }));
  for (const s of suppliers) {
    const idx = Math.min(bins - 1, Math.floor(s.risk_score / 10));
    edges[idx].value += 1;
  }
  return edges;
}
