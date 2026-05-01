/**
 * Deterministic proxy for Python training labels (`generate_data._label_from_features`),
 * without per-row noise — same features → same score. Use when the sklearn model is not available in Node.
 */
export type SupplierFeatureRow = {
  tier: number;
  on_time_delivery_rate: number;
  avg_delivery_delay_days: number;
  defect_rate: number;
  fulfillment_rate: number;
  payment_delay_days: number;
  credit_score: number;
  debt_to_equity: number;
  current_ratio: number;
  revenue_growth_pct: number;
  cash_runway_months: number;
  complaints_last_90d: number;
  quality_audit_score: number;
};

export function proxyDistressProbability(row: SupplierFeatureRow): number {
  const z =
    4.0 * row.defect_rate +
    0.06 * row.payment_delay_days +
    0.15 * row.complaints_last_90d +
    0.6 * row.debt_to_equity +
    1.5 * (1 - row.on_time_delivery_rate) +
    1.0 * (1 - row.fulfillment_rate) -
    0.18 * row.cash_runway_months -
    0.012 * (row.credit_score - 600) -
    0.04 * row.quality_audit_score -
    0.02 * row.revenue_growth_pct -
    0.6 * row.current_ratio +
    0.3 * (row.tier - 1) -
    0.2;
  return 1 / (1 + Math.exp(-z));
}

export function proxyRiskScore(row: SupplierFeatureRow): number {
  return Math.round(proxyDistressProbability(row) * 10000) / 100;
}

export function proxyRiskTier(score: number): "Low" | "Moderate" | "High" | "Critical" {
  if (score < 25) return "Low";
  if (score < 50) return "Moderate";
  if (score < 75) return "High";
  return "Critical";
}
