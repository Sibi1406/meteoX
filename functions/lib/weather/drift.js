// weather/drift.js — Forecast Drift Detection (Spec Section 3)
const { DRIFT_MIN_DELTA } = require("../config");

/**
 * Computes forecast drift between snapshots of the same target date.
 * Compares the latest history entry with the one closest to 12 hours earlier,
 * or the oldest within 24 hours.
 *
 * Returns { from, to, delta, sinceISO, direction } only if:
 * 1. There are at least 2 entries in history.
 * 2. Math.abs(delta) >= DRIFT_MIN_DELTA (20 percentage points).
 * Otherwise returns null.
 */
function computeDrift(history = [], now = new Date()) {
  if (!Array.isArray(history) || history.length < 2) {
    return null;
  }

  // Sort chronological by issuedAt
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) return null;

  const validEntries = history
    .filter((e) => e && e.issuedAt && e.rainProbability != null)
    .filter((e) => {
      const issuedAt = new Date(e.issuedAt).getTime();
      return Number.isFinite(issuedAt) && issuedAt <= nowMs;
    })
    .sort((a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime());

  if (validEntries.length < 2) {
    return null;
  }

  const latest = validEntries[validEntries.length - 1];
  const latestTime = new Date(latest.issuedAt).getTime();
  const candidates = validEntries.slice(0, validEntries.length - 1);

  const targetTime = latestTime - 12 * 60 * 60 * 1000; // 12h earlier
  const maxWindow = 24 * 60 * 60 * 1000; // 24h window

  // Filter candidates within 24h of latest
  const within24h = candidates.filter(
    (c) => latestTime - new Date(c.issuedAt).getTime() <= maxWindow
  );

  let baseline = null;

  if (within24h.length > 0) {
    // Find entry closest to 12 hours earlier
    let minDiff = Infinity;
    for (const c of within24h) {
      const diff = Math.abs(new Date(c.issuedAt).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        baseline = c;
      }
    }
  } else return null;

  if (!baseline) {
    return null;
  }

  const from = baseline.rainProbability;
  const to = latest.rainProbability;
  const delta = to - from;

  const minDelta = DRIFT_MIN_DELTA || 20;
  if (Math.abs(delta) < minDelta) {
    return null;
  }

  return {
    from,
    to,
    delta,
    sinceISO: baseline.issuedAt,
    direction: delta > 0 ? "rise" : "fall",
  };
}

module.exports = { computeDrift };
