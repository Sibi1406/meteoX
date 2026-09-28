const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildFallbackHeadline, buildPrompt } = require("../lib/ai/advisory");
const { isQuotaError } = require("../lib/ai/gemini");

describe("Gemini advisory resilience", () => {
  it("recognizes quota exhaustion without classifying unrelated errors", () => {
    assert.strictEqual(isQuotaError({ status: 429 }), true);
    assert.strictEqual(isQuotaError({ status: "RESOURCE_EXHAUSTED" }), true);
    assert.strictEqual(isQuotaError(new Error("Gemini rate limit exceeded")), true);
    assert.strictEqual(isQuotaError({ status: 503, message: "Service unavailable" }), false);
  });

  it("varies fallback headlines while keeping rain likelihood consistent", () => {
    const headlines = [0, 1, 2].map((variationIndex) => buildFallbackHeadline({
      query: "Will it rain tomorrow?",
      context: { weather: {} },
      targetForecast: { rainProbability: 80 },
      isTamil: false,
      variationIndex,
    }));

    assert.strictEqual(new Set(headlines).size, 3);
    assert.ok(headlines.every((headline) => /rain/i.test(headline)));
  });

  it("varies Tamil fallback headlines for dry forecasts", () => {
    const headlines = [0, 1, 2].map((variationIndex) => buildFallbackHeadline({
      query: "நாளைய மழை வாய்ப்பு என்ன?",
      context: { weather: {} },
      targetForecast: { rainProbability: 10 },
      isTamil: true,
      variationIndex,
    }));

    assert.strictEqual(new Set(headlines).size, 3);
  });

  it("rotates response frames in Gemini prompts", () => {
    const context = { language: "en", role: "farmer", weather: {} };
    const frames = [0, 1, 2].map((variationIndex) => {
      const prompt = buildPrompt("Will it rain?", context, null, variationIndex);
      return prompt.match(/RESPONSE FRAME FOR THIS REPLY: (.+?) Do not copy/)[1];
    });

    assert.strictEqual(new Set(frames).size, 3);
  });

  it("labels JSON examples as illustrative and asks for natural variation before the schema", () => {
    const prompt = buildPrompt("Will it rain tomorrow?", {
      language: "en",
      role: "farmer",
      weather: {},
    }, null, 0);
    const naturalVariation = "Vary your sentence openings, structure, and word choice across different questions and different times of day — do not default to the same phrasing pattern every time. Sound like a knowledgeable local person giving advice, not a form being filled in.";

    assert.ok(prompt.includes("illustrative options, not a template"));
    assert.ok(prompt.includes("[context-supported probability]"));
    assert.ok(prompt.includes(`${naturalVariation}\nRespond ONLY with valid JSON`));
  });
});