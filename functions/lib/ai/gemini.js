// ai/gemini.js — Google Gemini API Client (Spec §19, §20)
const { GoogleGenerativeAI } = require("@google/generative-ai");

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please set the secret or environment variable."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

function getGeminiModel() {
  const genAI = getGeminiClient();
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1, // very low temperature for maximum factuality & grounding
    },
  });
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
  getGeminiClient,
  getGeminiModel,
  GEMINI_SYSTEM_PROMPT,
};
