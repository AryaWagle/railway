import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveOshNextUrl } from "./pagination";

describe("resolveOshNextUrl", () => {
  it("returns null for empty input", () => {
    assert.equal(resolveOshNextUrl(null, "https://opensupplyhub.org/api/"), null);
    assert.equal(resolveOshNextUrl("", "https://opensupplyhub.org/api/"), null);
  });

  it("passes through absolute URLs", () => {
    const u = "https://opensupplyhub.org/api/facilities/?page=2";
    assert.equal(resolveOshNextUrl(u, "https://opensupplyhub.org/api/"), u);
  });

  it("resolves relative next against API base", () => {
    const out = resolveOshNextUrl("/api/facilities/?page=3", "https://opensupplyhub.org/api/");
    assert.match(out ?? "", /^https:\/\/opensupplyhub\.org\/api\/facilities\/\?page=3/);
  });
});
