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
      weatherFacts: [
        "Rain probability: 80%",
        "Expected temperature: 29°C",
        "Rainfall: 12 mm",
      ],
      advisory: ["Postpone fertilizer spraying due to expected rain."],
      localTrust: {
        trustScore: "81%",
        sampleCount: 42,
      },
      answer: "Tomorrow there is an 80% chance of rain with 29°C temperature.",
    };

    const check = verifyGrounding(validResponse, mockContext);
    assert.strictEqual(check.passed, true);
    assert.strictEqual(check.failures.length, 0);
  });

  it("FAILS when model hallucinates an unsupported percentage (e.g. 95% vs 80%)", () => {
    const hallucinatedResponse = {
      weatherFacts: ["There is a 95% chance of rain tomorrow."],
      advisory: ["Stay indoors."],
      answer: "Severe storms with 95% rain chance.",
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
      weatherFacts: ["Rain probability: 80%"],
      advisory: ["Wait"],
      localTrust: {
        trustScore: "95%",
        sampleCount: 100,
      },
      answer: "Local trust is 95%.",
    };

    const check = verifyGrounding(hallucinatedTrustResponse, contextWithoutTrust);
    assert.strictEqual(check.passed, false);
    assert.ok(check.failures.some((f) => f.includes("Hallucinated trust score")));
  });
});
