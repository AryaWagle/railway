import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeSriScore, fulfillmentProxyPercent } from "./score";

describe("computeSriScore", () => {
  it("is deterministic for same inputs", () => {
    const a = computeSriScore({
      osId: "US123",
      countryCode: "US",
      name: "Acme Assembly",
      sector: "Apparel",
      productTypes: ["Outerwear"],
      contributorCount: 1,
      facilityTypes: ["Assembly"],
    });
    const b = computeSriScore({
      osId: "US123",
      countryCode: "US",
      name: "Acme Assembly",
      sector: "Apparel",
      productTypes: ["Outerwear"],
      contributorCount: 1,
      facilityTypes: ["Assembly"],
    });
    assert.equal(a.score, b.score);
    assert.equal(a.tier, b.tier);
  });

  it("increases with elevated geography + contributors", () => {
    const low = computeSriScore({
      osId: "X1",
      countryCode: "US",
      name: "Low",
      contributorCount: 1,
    });
    const high = computeSriScore({
      osId: "X2",
      countryCode: "BD",
      name: "High",
      contributorCount: 4,
      productTypes: ["A", "B", "C"],
      facilityTypes: ["Cutting", "Sewing", "Packaging"],
    });
    assert.ok(high.score >= low.score);
  });
});

describe("fulfillmentProxyPercent", () => {
  it("is 0 for empty list", () => {
    assert.equal(fulfillmentProxyPercent([]), 0);
  });

  it("counts share with contributorCount >= 2", () => {
    const pct = fulfillmentProxyPercent([
      { contributorCount: 1 },
      { contributorCount: 2 },
      { contributorCount: 3 },
    ]);
    assert.equal(pct, 67);
  });
});
