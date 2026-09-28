// test/grounding.test.js — Unit tests for grounding verification
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { verifyGrounding } = require("../lib/ai/grounding");

describe("Grounding Verification Engine", () => {
  const mockContext = {
    weather: {
      temperatureC: 29,
      rainfallMm: 12,
      rainProbability: 80,
      humidityPercent: 70,
      windSpeedKmh: 14,
      targetForecast: {
        temperatureMaxC: 30,
        rainProbability: 80,
        rainfallMm: 12,
      },
    },
    localTrust: {
      trustScore: 0.81,
      accuracyScore: 0.81,
      sampleCount: 42,
    },
  };

  it("passes when all claimed facts match retrieved context", () => {
    const validResponse = {
      headline: "Rain may shape outdoor plans.",
      facts: [
        { icon: "🌧", label: "Rain chance", value: "80%" },
        { icon: "🌡", label: "Temperature", value: "29°C" },
        { icon: "💧", label: "Rainfall", value: "12 mm" },
      ],
      action: "Wait before spraying fertilizer.",
      localTrust: {
        trustScore: "81%",
        sampleCount: 42,
      },
    };

    const check = verifyGrounding(validResponse, mockContext);
    assert.strictEqual(check.passed, true);
    assert.strictEqual(check.failures.length, 0);
  });

  it("FAILS when model hallucinates an unsupported percentage (e.g. 95% vs 80%)", () => {
    const hallucinatedResponse = {
      headline: "Severe rain is likely.",
      facts: [{ icon: "🌧", label: "Rain chance", value: "95%" }],
      action: "Stay indoors.",
    };

    const check = verifyGrounding(hallucinatedResponse, mockContext);
    assert.strictEqual(check.passed, false);
    assert.ok(check.failures.some((f) => f.includes("95%")));
  });

  it("FAILS when model hallucinates a trust score when context has none", () => {
    const contextWithoutTrust = {
      ...mockContext,
      localTrust: null,
    };

    const hallucinatedTrustResponse = {
      headline: "Rain may shape outdoor plans.",
      facts: [{ icon: "🌧", label: "Rain chance", value: "80%" }],
      action: "Wait before spraying.",
      localTrust: {
        trustScore: "95%",
        sampleCount: 100,
      },
    };

    const check = verifyGrounding(hallucinatedTrustResponse, contextWithoutTrust);
    assert.strictEqual(check.passed, false);
    assert.ok(check.failures.some((f) => f.includes("Hallucinated trust score")));
  });

  it("accepts sourced model counts, window times, and window basis numbers", () => {
    const contextWithEvidence = {
      ...mockContext,
      weather: {
        ...mockContext.weather,
        modelAgreement: { rainVotes: 2, of: 3, models: [] },
        actionWindows: [{
          type: "spray_window",
          startISO: "2026-09-28T06:00:00+05:30",
          endISO: "2026-09-28T08:00:00+05:30",
          basis: [{ metric: "windSpeed", value: 8, unit: "km/h" }],
        }],
      },
    };
    const response = {
      headline: "2 of 3 models point to rain.",
      facts: [],
      action: "The spray window runs from 6:00 AM to 8:00 AM, with wind at 8 km/h.",
    };

    assert.strictEqual(verifyGrounding(response, contextWithEvidence).passed, true);
  });

  it("rejects invented model counts and action-window times", () => {
    const contextWithEvidence = {
      weather: {
        modelAgreement: { rainVotes: 2, of: 3, models: [] },
        actionWindows: [{ startISO: "2026-09-28T06:00:00+05:30", endISO: "2026-09-28T08:00:00+05:30" }],
      },
    };
    const response = {
      headline: "3 of 3 models point to rain.",
      facts: [],
      action: "The window runs from 7:00 AM to 8:00 AM.",
    };

    const check = verifyGrounding(response, contextWithEvidence);
    assert.strictEqual(check.passed, false);
    assert.ok(check.failures.some((failure) => failure.includes("model-vote")));
    assert.ok(check.failures.some((failure) => failure.includes("action-window time")));
  });

  it("checks Tamil model-vote counts against the sourced agreement", () => {
    const contextWithAgreement = {
      weather: { modelAgreement: { rainVotes: 2, of: 3, models: [] } },
    };
    const response = {
      headline: "3 மாதிரிகளில் 2 மழை என்று கணிக்கின்றன.",
      facts: [],
      action: "",
    };
    assert.strictEqual(verifyGrounding(response, contextWithAgreement).passed, true);
    response.headline = "3 மாதிரிகளில் 3 மழை என்று கணிக்கின்றன.";
    assert.strictEqual(verifyGrounding(response, contextWithAgreement).passed, false);
  });
});
