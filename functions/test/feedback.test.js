// test/feedback.test.js — Unit tests for local calibration and trust calculation
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { computeCalibration } = require("../lib/feedback/calibration");
const { createObservationRecord, OBSERVATION_SOURCES } = require("../lib/feedback/groundTruth");
const { recordUserFeedback } = require("../lib/feedback/feedback");

function createMemoryDb() {
  const documents = new Map();
  const dbInstance = {
    collection(name) {
      return {
        doc(id) {
          const key = `${name}/${id}`;
          return {
            key,
            async set(data) {
              documents.set(key, data);
            },
          };
        },
      };
    },
    async runTransaction(callback) {
      return callback({
        async get(ref) {
          const data = documents.get(ref.key);
          return { exists: Boolean(data), data: () => data };
        },
        set(ref, data) {
          documents.set(ref.key, data);
        },
      });
    },
  };
  return { documents, dbInstance };
}

describe("Local Calibration & Trust Engine", () => {
  it("treats 0-5 samples as insufficient data", () => {
    const smallBatch = [
      { predictedRain: true, actualRain: true },
      { predictedRain: true, actualRain: false },
      { predictedRain: false, actualRain: false },
    ];

    const result = computeCalibration(smallBatch);
    assert.strictEqual(result.sampleCount, 3);
    assert.strictEqual(result.confidenceLevel, "insufficient");
    assert.strictEqual(result.trustScore, null);
  });

  it("calculates accuracy, bias, and usable confidence for 21+ samples", () => {
    const observations = [];
    // 34 correct predictions out of 42
    for (let i = 0; i < 34; i++) {
      observations.push({ predictedRain: true, actualRain: true });
    }
    for (let i = 0; i < 8; i++) {
      observations.push({ predictedRain: true, actualRain: false });
    }

    const result = computeCalibration(observations);
    assert.strictEqual(result.sampleCount, 42);
    assert.strictEqual(result.confidenceLevel, "usable");
    assert.strictEqual(result.accuracyScore, 0.81);
    assert.strictEqual(result.trustScore, 0.81);
    assert.ok(result.regionalBias > 0); // Model slightly over-predicted rain
  });

  it("marks observation source correctly for citizen feedback", () => {
    const record = createObservationRecord({
      userId: "user123",
      forecastId: "fc_1",
      cluster: { clusterId: "coimbatore" },
      location: { latitude: 11.0, longitude: 77.0 },
      forecastDate: "2026-09-12",
      predictedRain: true,
      actualRain: true,
      isOfficial: false,
    });

    assert.strictEqual(record.sourceType, OBSERVATION_SOURCES.USER_CROWDSOURCED);
    assert.strictEqual(record.weight, 0.75);
  });

  it("keeps a repeat vote on one district/date record and overwrites the answer", async () => {
    const { documents, dbInstance: dbMock } = createMemoryDb();
    const input = {
      userId: "user-1",
      forecastId: "tirunelveli_2026-09-27",
      forecastDate: "2026-09-27",
      predictedRain: false,
      answer: "yes",
      role: "farmer",
      clusterId: "tirunelveli",
      districtName: "Tirunelveli",
      dbInstance: dbMock,
      recalibrate: async () => null,
    };

    const first = await recordUserFeedback(input);
    const second = await recordUserFeedback({ ...input, answer: "no" });
    const savedVote = documents.get("feedback/user-1_tirunelveli_2026-09-27");

    assert.strictEqual(documents.size, 2);
    assert.strictEqual(first.isRepeatVote, false);
    assert.strictEqual(second.isRepeatVote, true);
    assert.strictEqual(second.previousAnswer, "YES");
    assert.strictEqual(savedVote.answer, "NO");
    assert.strictEqual(savedVote.cluster.clusterId, "tirunelveli");
  });

  it("derives observed rain correctly from forecast accuracy responses", async () => {
    const { documents, dbInstance } = createMemoryDb();
    let index = 0;

    for (const predictedRain of [false, true]) {
      for (const forecastAccurate of [false, true]) {
        const forecastDate = `2026-09-0${++index}`;
        const actualRain = predictedRain === forecastAccurate;
        await recordUserFeedback({
          userId: "accuracy-user",
          forecastId: `tirunelveli_${forecastDate}`,
          forecastDate,
          predictedRain,
          forecastAccurate,
          role: "farmer",
          clusterId: "tirunelveli",
          districtName: "Tirunelveli",
          dbInstance,
          recalibrate: async () => null,
        });

        const docId = `accuracy-user_tirunelveli_${forecastDate}`;
        const feedback = documents.get(`feedback/${docId}`);
        const observation = documents.get(`weather_observations/${docId}`);
        assert.strictEqual(feedback.actualRain, actualRain);
        assert.strictEqual(feedback.forecastAccurate, forecastAccurate);
        assert.strictEqual(feedback.answer, actualRain ? "YES" : "NO");
        assert.strictEqual(observation.actualRain, actualRain);
      }
    }
  });
});
