// test/feedback.test.js — Unit tests for local calibration and trust calculation
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { computeCalibration } = require("../lib/feedback/calibration");
const { createObservationRecord, OBSERVATION_SOURCES } = require("../lib/feedback/groundTruth");

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
});
