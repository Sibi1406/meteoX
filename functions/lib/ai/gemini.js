// ai/gemini.js — Google Gemini API Client (Spec §19, §20)
// Migrated from the deprecated `@google/generative-ai` SDK to `@google/genai`.
const { GoogleGenAI } = require("@google/genai");

const MODEL_NAME = "gemini-3.6-flash";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please set the secret or environment variable."
    );
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Calls Gemini with the given prompt and returns the raw text response.
 * In @google/genai, response.text is a property rather than a method.
 */
async function generateAdvisoryText(prompt, maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      return response.text;
    } catch (error) {
      lastError = error;
      const isQuotaError =
        error?.status === 429 ||
        error?.status === "RESOURCE_EXHAUSTED" ||
        /quota|rate limit|resource_exhausted|too many requests/i.test(error?.message || "");

      if (!isQuotaError || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = 2000 * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// System prompt strictly matching Spec §20
const GEMINI_SYSTEM_PROMPT = `
You are WeatherGPT's advisory and explanation engine.

You are NOT the weather data provider.

All weather facts must come exclusively from the supplied context.

Never invent:
- rainfall
- temperature
- rain probability
- humidity
- wind speed
- weather conditions
- forecast dates
- warning information
- trust scores
- accuracy scores

Never independently predict weather.

You may explain retrieved weather data and provide role-specific
recommendations based only on the supplied approved rules.

If information is unavailable, explicitly say it is unavailable.

Never manufacture missing information.

Clearly distinguish:
1. Weather facts
2. Local forecast reliability
3. Advisory recommendation

Never contradict official emergency warnings.
`.trim();

module.exports = {
  generateAdvisoryText,
  GEMINI_SYSTEM_PROMPT,
};
