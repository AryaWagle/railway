import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  proxyDistressProbability,
  proxyRiskScore,
  proxyRiskTier,
  type SupplierFeatureRow,
} from "./supplier-risk-proxy";

const baseline: SupplierFeatureRow = {
  tier: 2,
  on_time_delivery_rate: 0.92,
  avg_delivery_delay_days: 3,
  defect_rate: 0.01,
  fulfillment_rate: 0.95,
  payment_delay_days: 5,
  credit_score: 700,
  debt_to_equity: 0.8,
  current_ratio: 1.5,
  revenue_growth_pct: 5,
  cash_runway_months: 12,
  complaints_last_90d: 1,
  quality_audit_score: 90,
};

describe("supplier-risk-proxy", () => {
  it("maps probability into (0,1) and score into [0,100]", () => {
    const p = proxyDistressProbability(baseline);
    assert.ok(p > 0 && p < 1, `p=${p}`);
    const s = proxyRiskScore(baseline);
    assert.ok(s >= 0 && s <= 100, `s=${s}`);
  });

  it("is deterministic for identical rows", () => {
    assert.equal(proxyRiskScore(baseline), proxyRiskScore({ ...baseline }));
  });

  it("raises score when defects and payment delays worsen", () => {
    const worse: SupplierFeatureRow = {
      ...baseline,
      defect_rate: 0.2,
      payment_delay_days: 60,
      on_time_delivery_rate: 0.5,
      fulfillment_rate: 0.6,
    };
    assert.ok(proxyRiskScore(worse) > proxyRiskScore(baseline));
  });

  it("classifies tiers on score thresholds", () => {
    assert.equal(proxyRiskTier(10), "Low");
    assert.equal(proxyRiskTier(30), "Moderate");
    assert.equal(proxyRiskTier(60), "High");
    assert.equal(proxyRiskTier(80), "Critical");
  });
});
