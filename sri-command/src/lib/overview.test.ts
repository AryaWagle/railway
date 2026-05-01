import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aggregateOverview, syntheticHistogramBins } from "./overview";
import type { EnrichedFacility } from "./overview";
import type { SriScoreResult } from "./sri/score";

function fac(over: Partial<EnrichedFacility> & Pick<EnrichedFacility, "osId">): EnrichedFacility {
  const sri: SriScoreResult = over.sri ?? {
    score: 50,
    tier: "elevated",
    factors: [],
    modelVersion: "SRI-1.0.0-composite",
  };
  return {
    name: "X",
    address: "",
    oshUrl: "https://opensupplyhub.org/facilities/x",
    contributorCount: 1,
    ...over,
    sri,
  };
}

describe("aggregateOverview", () => {
  it("computes mean score and counts critical tier", () => {
    const facilities = [
      fac({ osId: "a", sri: { score: 40, tier: "nominal", factors: [], modelVersion: "SRI-1.0.0-composite" } }),
      fac({ osId: "b", sri: { score: 80, tier: "critical", factors: [], modelVersion: "SRI-1.0.0-composite" } }),
    ];
    const agg = aggregateOverview(facilities);
    assert.equal(agg.active, 2);
    assert.equal(agg.critical, 1);
    assert.equal(agg.avg, 60);
  });

  it("returns zeros for empty input", () => {
    const agg = aggregateOverview([]);
    assert.equal(agg.active, 0);
    assert.equal(agg.avg, 0);
    assert.equal(agg.critical, 0);
    assert.equal(agg.fulfillment, 0);
  });
});

describe("syntheticHistogramBins", () => {
  it("places every facility in exactly one bin", () => {
    const facilities = [
      fac({ osId: "id1" }),
      fac({ osId: "id2" }),
      fac({ osId: "id3" }),
    ];
    const bins = syntheticHistogramBins(facilities);
    const sum = bins.reduce((s, b) => s + b.value, 0);
    assert.equal(sum, facilities.length);
  });
});
