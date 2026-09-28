// test/trackRecord.test.js — Unit tests for Self-Grading Forecasts and Track Record
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { derivePredictedRain, verifyForecastDoc, computeTrackRecord, rebuildTrackRecord, updateFarmerVoteOnTrack } = require("../lib/feedback/trackRecord");
const { getISTDateString } = require("../lib/feedback/schedulerJobs");
const { RAIN_DAY_MM } = require("../lib/config");

describe("Self-Grading Forecasts & Track Record Engine", () => {
  const targetDate = "2026-09-28";
  const deadlineIso = "2026-09-28T00:00:00+05:30";

  it("derives the stored rain prediction without accepting a client-provided value", () => {
    const stored = {
      final: { predictedRain: false },
      history: [{ issuedAt: "2026-09-27T18:00:00+05:30", predictedRain: true }],
    };
    assert.strictEqual(derivePredictedRain(stored, targetDate), false);
    assert.strictEqual(derivePredictedRain(null, targetDate), null);
  });

  it("verifyForecastDoc computes a hit when predicted rain matches observed rain", () => {
    const trackDoc = {
      targetDate,
      history: [
        {
          issuedAt: "2026-09-27T12:00:00+05:30",
          rainProbability: 75,
          predictedRain: true,
        },
      ],
      farmer: { yes: 0, no: 0 },
    };

    const result = verifyForecastDoc(trackDoc, 3.5); // observed 3.5 mm >= RAIN_DAY_MM
    assert.ok(result);
    assert.strictEqual(result.verification.status, "verified");
    assert.strictEqual(result.verification.rained, true);
    assert.strictEqual(result.verification.hit, true);
    assert.strictEqual(result.verification.source, "model-analysis");
    assert.strictEqual(result.final.predictedRain, true);
  });

  it("verifyForecastDoc computes a miss when predicted rain does not match observed dry", () => {
    const trackDoc = {
      targetDate,
      history: [
        {
          issuedAt: "2026-09-27T12:00:00+05:30",
          rainProbability: 80,
          predictedRain: true,
        },
      ],
      farmer: { yes: 0, no: 0 },
    };

    const result = verifyForecastDoc(trackDoc, 0.0); // observed 0.0 mm < RAIN_DAY_MM
    assert.ok(result);
    assert.strictEqual(result.verification.status, "verified");
    assert.strictEqual(result.verification.rained, false);
    assert.strictEqual(result.verification.hit, false);
    assert.strictEqual(result.verification.source, "model-analysis");
  });

  it("verifyForecastDoc sets status: no_forecast when no history before target date 00:00 IST", () => {
    const trackDoc = {
      targetDate,
      history: [
        {
          // Issued AFTER targetDate 00:00 IST
          issuedAt: "2026-09-28T06:00:00+05:30",
          rainProbability: 70,
        },
      ],
      farmer: { yes: 0, no: 0 },
    };

    const result = verifyForecastDoc(trackDoc, 2.0);
    assert.ok(result);
    assert.strictEqual(result.verification.status, "no_forecast");
    assert.strictEqual(result.final, null);
  });

  it("verifyForecastDoc lets farmer votes override model-derived check", () => {
    const trackDoc = {
      targetDate,
      history: [
        {
          issuedAt: "2026-09-27T18:00:00+05:30",
          rainProbability: 60,
          predictedRain: true,
        },
      ],
      // Model says 0mm (dry), but 3 farmers say it rained
      farmer: { yes: 3, no: 0 },
    };

    const result = verifyForecastDoc(trackDoc, 0.0);
    assert.ok(result);
    assert.strictEqual(result.verification.status, "verified");
    assert.strictEqual(result.verification.source, "farmer");
    assert.strictEqual(result.verification.rained, true); // Overridden by farmer votes
    assert.strictEqual(result.verification.hit, true); // final.predictedRain was true, farmer confirmed true
  });

  it("verifyForecastDoc falls back to model-analysis on farmer vote tie", () => {
    const trackDoc = {
      targetDate,
      history: [
        {
          issuedAt: "2026-09-27T18:00:00+05:30",
          rainProbability: 20,
          predictedRain: false,
        },
      ],
      // Tie in farmer votes
      farmer: { yes: 1, no: 1 },
    };

    const result = verifyForecastDoc(trackDoc, 0.0); // Model says dry
    assert.ok(result);
    assert.strictEqual(result.verification.status, "verified");
    assert.strictEqual(result.verification.source, "model-analysis"); // Tied, so fallback to model
    assert.strictEqual(result.verification.rained, false);
    assert.strictEqual(result.verification.hit, true);
  });

  it("computeTrackRecord filters out unverified days and truncates to 30 days", () => {
    const rawDays = [];
    // Generate 40 days of history, 5 unverified
    for (let i = 1; i <= 40; i++) {
      const dayStr = `2026-08-${String(i).padStart(2, "0")}`;
      if (i % 8 === 0) {
        // Unverified / pending
        rawDays.push({
          targetDate: dayStr,
          final: { predictedRain: true },
          verification: { status: "pending" },
        });
      } else {
        rawDays.push({
          targetDate: dayStr,
          final: { predictedRain: i % 2 === 0 },
          verification: {
            status: "verified",
            rained: i % 2 === 0,
            hit: true,
            source: i % 3 === 0 ? "farmer" : "model-analysis",
          },
        });
      }
    }

    const trackRecord = computeTrackRecord(rawDays, false);
    assert.ok(trackRecord);
    assert.strictEqual(trackRecord.windowDays, 30);
    // Verified days in 40 days: 40 - 5 = 35. Capped to last 30!
    assert.strictEqual(trackRecord.days.length, 30);
    assert.strictEqual(trackRecord.total, 30);
    // Ensure all days included are verified
    assert.ok(trackRecord.days.every((d) => d.hit !== undefined && d.rained !== undefined));
    assert.strictEqual(trackRecord.isDemo, false);
  });

  it("rebuildTrackRecord reads only verified days in its 30-day window and merges trust data", async () => {
    const documents = new Map();
    const dbMock = {
      collection(collectionName) {
        return {
          doc(documentId) {
            const key = `${collectionName}/${documentId}`;
            return {
              async get() {
                const value = documents.get(key);
                return { exists: Boolean(value), data: () => value };
              },
              async set(value, options = {}) {
                const previous = documents.get(key) || {};
                documents.set(key, options.merge ? { ...previous, ...value } : value);
              },
              key,
            };
          },
        };
      },
    };

    for (let offset = 1; offset <= 40; offset++) {
      const date = getISTDateString(-offset);
      const verified = offset % 7 !== 0;
      documents.set(`forecast_tracks/tirunelveli_${date}`, {
        targetDate: date,
        isDemo: offset === 1,
        final: { predictedRain: offset % 2 === 0 },
        verification: verified
          ? { status: "verified", rained: offset % 2 === 0, hit: true, source: "model-analysis" }
          : { status: "pending" },
      });
    }
    documents.set("trust_scores/tirunelveli", { accuracyScore: 0.84, clusterId: "tirunelveli" });

    const result = await rebuildTrackRecord("tirunelveli", dbMock);
    const savedTrust = documents.get("trust_scores/tirunelveli");

    assert.strictEqual(result.windowDays, 30);
    assert.strictEqual(result.days.length, 26);
    assert.ok(result.days.every((day) => day.source === "model-analysis"));
    assert.strictEqual(savedTrust.accuracyScore, 0.84);
    assert.strictEqual(savedTrust.trackRecord.total, 26);
    assert.strictEqual(savedTrust.trackRecord.isDemo, true);
  });

  it("increments farmer vote counts inside the Firestore transaction", async () => {
    const documents = new Map([[
      "forecast_tracks/tirunelveli_2026-09-27",
      { farmer: { yes: 1, no: 0 }, verification: { status: "pending" } },
    ]]);
    let transactionUsed = false;
    const dbMock = {
      collection(name) {
        return {
          doc(id) {
            const key = `${name}/${id}`;
            return {
              async get() {
                const value = documents.get(key);
                return { exists: Boolean(value), data: () => value };
              },
              async set(value, options = {}) {
                const previous = documents.get(key) || {};
                documents.set(key, options.merge ? { ...previous, ...value } : value);
              },
              key,
            };
          },
        };
      },
      async runTransaction(callback) {
        transactionUsed = true;
        return callback({
          async get(ref) {
            const value = documents.get(ref.key);
            return { exists: Boolean(value), data: () => value };
          },
          set(ref, value, options = {}) {
            const previous = documents.get(ref.key) || {};
            documents.set(ref.key, options.merge ? { ...previous, ...value } : value);
          },
        });
      },
    };

    await updateFarmerVoteOnTrack({
      clusterId: "tirunelveli",
      targetDate: "2026-09-27",
      answer: "yes",
    }, dbMock);

    assert.strictEqual(transactionUsed, true);
    assert.deepStrictEqual(documents.get("forecast_tracks/tirunelveli_2026-09-27").farmer, { yes: 2, no: 0 });
  });
});
