const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildFallbackHeadline, buildFallbackAction, buildPrompt } = require("../lib/ai/advisory");
const { getOrGenerateDashboardAdvisory } = require("../lib/ai/dashboardAdvisoryCache");
const { isQuotaError, isTimeoutError } = require("../lib/ai/gemini");

describe("Gemini advisory resilience", () => {
  it("reuses dashboard advisories for 15 minutes per cluster, role, and language", async () => {
    const documents = new Map();
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
              async set(value) {
                documents.set(key, value);
              },
            };
          },
        };
      },
    };
    let generationCount = 0;
    const request = {
      dbInstance: dbMock,
      clusterId: "tirunelveli",
      role: "farmer",
      language: "en",
      now: 1000000,
      generate: async () => ({ headline: `Outlook ${++generationCount}` }),
    };

    assert.deepStrictEqual(await getOrGenerateDashboardAdvisory(request), {
      advisory: { headline: "Outlook 1" },
      fromCache: false,
    });
    assert.deepStrictEqual(await getOrGenerateDashboardAdvisory({ ...request, now: 1000000 + 899999 }), {
      advisory: { headline: "Outlook 1" },
      fromCache: true,
    });
    assert.deepStrictEqual(await getOrGenerateDashboardAdvisory({ ...request, now: 1000000 + 900000 }), {
      advisory: { headline: "Outlook 2" },
      fromCache: false,
    });
  });

  it("recognizes quota exhaustion without classifying unrelated errors", () => {
    assert.strictEqual(isQuotaError({ status: 429 }), true);
    assert.strictEqual(isQuotaError({ status: "RESOURCE_EXHAUSTED" }), true);
    assert.strictEqual(isQuotaError(new Error("Gemini rate limit exceeded")), true);
    assert.strictEqual(isQuotaError({ status: 503, message: "Service unavailable" }), false);
  });

  it("recognizes Gemini request timeouts for immediate fallback", () => {
    assert.strictEqual(isTimeoutError(new Error("request timed out")), true);
    assert.strictEqual(isTimeoutError({ code: "ETIMEDOUT" }), true);
    assert.strictEqual(isTimeoutError({ status: 504, message: "Deadline expired before operation could complete." }), true);
    assert.strictEqual(isTimeoutError(new Error("invalid JSON")), false);
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

  it("keeps fertilizer fallback advice specific to application timing", () => {
    const context = {
      language: "en",
      role: "farmer",
      weather: { targetForecast: { rainProbability: 16, rainfallMm: 0, windSpeedKmh: 25 } },
    };
    const headline = buildFallbackHeadline({
      query: "Check fertilizer timing",
      context,
      targetForecast: context.weather.targetForecast,
      isTamil: false,
      variationIndex: 0,
    });
    const action = buildFallbackAction({
      query: "Check fertilizer timing",
      context,
      targetForecast: context.weather.targetForecast,
      isTamil: false,
      deterministicAdvisory: "Generic fieldwork advice.",
    });

    assert.match(headline, /fertilizer/i);
    assert.match(action, /16%/);
    assert.match(action, /fertilizer application/i);
    assert.doesNotMatch(action, /Generic fieldwork advice/);
  });

  it("recommends delaying fertilizer application when rain risk is high", () => {
    const context = { weather: { targetForecast: { rainProbability: 80, rainfallMm: 8 } } };
    const action = buildFallbackAction({
      query: "Can I apply fertilizer tomorrow?",
      context,
      targetForecast: context.weather.targetForecast,
      isTamil: false,
      deterministicAdvisory: "Generic fieldwork advice.",
    });

    assert.match(action, /postpone fertilizer application/i);
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

  it("instructs Gemini to answer fertilizer timing questions directly", () => {
    const prompt = buildPrompt("Check fertilizer timing", {
      language: "en",
      role: "farmer",
      weather: {},
    }, null, 0);

    assert.match(prompt, /specifically about applying fertilizer/i);
    assert.match(prompt, /do not substitute generic fieldwork advice/i);
  });
});