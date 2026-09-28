// test/drift.test.js — Unit tests for forecast drift detection
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { computeDrift } = require("../lib/weather/drift");

describe("Forecast Drift Engine", () => {
  it("detects rise when delta >= 20 percentage points", () => {
    const history = [
      { issuedAt: "2026-09-28T06:00:00+05:30", rainProbability: 25 },
      { issuedAt: "2026-09-28T18:00:00+05:30", rainProbability: 70 },
    ];

    const result = computeDrift(history, new Date("2026-09-28T21:00:00+05:30"));
    assert.ok(result);
    assert.strictEqual(result.from, 25);
    assert.strictEqual(result.to, 70);
    assert.strictEqual(result.delta, 45);
    assert.strictEqual(result.direction, "rise");
    assert.strictEqual(result.sinceISO, "2026-09-28T06:00:00+05:30");
  });

  it("detects fall when delta <= -20 percentage points", () => {
    const history = [
      { issuedAt: "2026-09-28T06:00:00+05:30", rainProbability: 80 },
      { issuedAt: "2026-09-28T18:00:00+05:30", rainProbability: 40 },
    ];

    const result = computeDrift(history, new Date("2026-09-28T21:00:00+05:30"));
    assert.ok(result);
    assert.strictEqual(result.from, 80);
    assert.strictEqual(result.to, 40);
    assert.strictEqual(result.delta, -40);
    assert.strictEqual(result.direction, "fall");
  });

  it("returns null when delta is below threshold (< 20)", () => {
    const history = [
      { issuedAt: "2026-09-28T06:00:00+05:30", rainProbability: 50 },
      { issuedAt: "2026-09-28T18:00:00+05:30", rainProbability: 65 }, // +15 delta
    ];

    const result = computeDrift(history, new Date("2026-09-28T21:00:00+05:30"));
    assert.strictEqual(result, null);
  });

  it("returns null when fewer than 2 valid history entries", () => {
    assert.strictEqual(computeDrift([]), null);
    assert.strictEqual(computeDrift(null), null);
    assert.strictEqual(
      computeDrift([{ issuedAt: "2026-09-28T06:00:00+05:30", rainProbability: 50 }], new Date("2026-09-28T21:00:00+05:30")),
      null
    );
  });

  it("returns null when snapshots are more than 24 hours apart or issued in the future", () => {
    const now = new Date("2026-09-29T00:00:00+05:30");
    assert.strictEqual(computeDrift([
      { issuedAt: "2026-09-27T17:00:00+05:30", rainProbability: 25 },
      { issuedAt: "2026-09-28T18:00:00+05:30", rainProbability: 70 },
    ], now), null);
    assert.strictEqual(computeDrift([
      { issuedAt: "2026-09-28T06:00:00+05:30", rainProbability: 25 },
      { issuedAt: "2026-09-30T06:00:00+05:30", rainProbability: 70 },
    ], now), null);
  });
});
