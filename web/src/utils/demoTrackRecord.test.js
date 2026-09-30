import test from "node:test";
import assert from "node:assert/strict";

import { buildDemoTrackRecord } from "./demoTrackRecord.js";

test("builds a marked 30-day track record with counts matching its days", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");
  const record = buildDemoTrackRecord(now);

  assert.equal(record.days.length, 30);
  assert.equal(record.windowDays, 30);
  assert.equal(record.isDemo, true);
  assert.equal(record.total, record.days.length);
  assert.equal(record.hits, record.days.filter((day) => day.hit).length);
  assert.equal(record.hitRate, Math.round((record.hits / record.total) * 100));
  assert.equal(record.days[0].date, "2026-08-31");
  assert.equal(record.days.at(-1).date, "2026-09-29");
  assert.ok(record.days.some((day) => day.source === "farmer"));
  assert.ok(record.days.some((day) => day.source === "model-analysis"));
});