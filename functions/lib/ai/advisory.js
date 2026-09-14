// ai/advisory.js — Grounded Advisory Generator with Auto-Regeneration (Spec §20, §21, §22)
const { generateAdvisoryText, GEMINI_SYSTEM_PROMPT } = require("./gemini");
const { verifyGrounding } = require("./grounding");
const { MAX_REGENERATIONS } = require("../config");
const { evaluateRoleAdvisory } = require("../advisory/roleRules");
const { info, warn, error } = require("../utils/logger");

/**
 * Builds user prompt containing the full RAG context and instructions to respond in English or Tamil.
 */
function buildPrompt(userQuery, context, feedbackNotes = null) {
  const isTamil = context.language === "ta";

  return `
${GEMINI_SYSTEM_PROMPT}

RAG CONTEXT (The ONLY source of truth. DO NOT INVENT OR PREDICT BEYOND THESE FACTS):
${JSON.stringify(context, null, 2)}

USER QUESTION: "${userQuery}"
USER ROLE: "${context.role}"
LANGUAGE: ${isTamil ? "Tamil (தமிழ்)" : "English"}

${
  feedbackNotes
    ? `IMPORTANT: Your previous attempt failed grounding verification because: ${feedbackNotes}. Fix these facts and use only numbers present in CONTEXT.`
    : ""
}

Respond ONLY with valid JSON matching EXACTLY this structure (no markdown fences, no extra text):
{
  "weatherFacts": [
    "Fact 1 (e.g. ${isTamil ? 'நாளை மழை பெய்ய 80% வாய்ப்புள்ளது' : 'There is about an 80% chance of rain tomorrow'})",
    "Fact 2 (e.g. ${isTamil ? 'வெப்பநிலை சுமார் 29°C ஆக இருக்கும்' : 'Temperatures should reach around 29°C'})",
    "Fact 3 (e.g. ${isTamil ? 'காற்று சுமார் 14 கிமீ/மணி வேகத்தில் வீசும்' : 'Winds picking up to about 14 km/h'})"
  ],
  "advisory": [
    "One specific recommendation for the ${context.role}, using only the approved rules in CONTEXT as your source of what to recommend — but phrase it as if directly answering the USER QUESTION above. Vary your wording naturally; do not repeat the rule text verbatim."
  ],
  "localTrust": ${
    context.localTrust
      ? `{ "trustScore": "${Math.round((context.localTrust.trustScore || 0.8) * 100)}%", "sampleCount": ${context.localTrust.sampleCount || 0}, "note": "${isTamil ? 'உள்ளூர் நம்பகத்தன்மை' : 'Local reliability'}" }`
      : `null`
  },
  "answer": "A warm, friendly, very simple answer in ${isTamil ? 'Tamil' : 'English'} for an ordinary person. Sound like a helpful local advisor, not a formal report. Use only 1 or 2 short sentences, maximum 25 words. Answer the user's question directly with everyday words, and do not repeat the weather facts or advisory section."
}
`.trim();
}

/**
 * Generates an advisory via Gemini with grounding verification and regeneration loop.
 */
async function generateAdvisoryWithGrounding({ query, context }) {
  let attempts = 0;
  let lastFailureReason = null;
  let lastAdvisory = null;

  while (attempts <= MAX_REGENERATIONS) {
    attempts++;
    info(`Generating advisory (attempt ${attempts}/${MAX_REGENERATIONS + 1})`);

    try {
      const prompt = buildPrompt(query, context, lastFailureReason);
      const rawText = (await generateAdvisoryText(prompt)).trim();

      // Clean markdown code fences if model accidentally wrapped in ```json
      const cleanedJson = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleanedJson);

      // Verify Grounding
      const check = verifyGrounding(parsed, context);
      if (check.passed) {
        return {
          ...parsed,
          confidence: "high",
          attempts,
        };
      }

      // Grounding failed -> log and regenerate
      lastFailureReason = check.failures.join("; ");
      lastAdvisory = parsed;
      warn(`Grounding failed on attempt ${attempts}`, { failures: check.failures });
    } catch (err) {
      error(`Error generating or parsing Gemini advisory on attempt ${attempts}`, err);
      lastFailureReason = err.message;
    }
  }

  // If still failing after MAX_REGENERATIONS, provide deterministic rule-based fallback
  warn("Grounding verification exceeded maximum retries. Using safe deterministic fallback.");
  const isTamil = context.language === "ta";
  const deterministicAdvisory = evaluateRoleAdvisory(context.role, context.weather, context.language);
  const targetForecast = context.weather?.targetForecast || context.weather?.today || {};

  return {
    weatherFacts: [
      isTamil
        ? `மழை வாய்ப்பு: ${targetForecast.rainProbability || 0}%`
        : `Rain probability: ${targetForecast.rainProbability || 0}%`,
      isTamil
        ? `வெப்பநிலை: ${targetForecast.temperatureMaxC || context.weather?.temperatureC || 30}°C`
        : `Temperature: ${targetForecast.temperatureMaxC || context.weather?.temperatureC || 30}°C`,
      isTamil
        ? `காற்றின் வேகம்: ${targetForecast.windSpeedKmh || context.weather?.windSpeedKmh || 12} km/h`
        : `Wind speed: ${targetForecast.windSpeedKmh || context.weather?.windSpeedKmh || 12} km/h`,
    ],
    advisory: [deterministicAdvisory],
    localTrust: context.localTrust
      ? {
          trustScore: `${Math.round((context.localTrust.trustScore || 0.8) * 100)}%`,
          sampleCount: context.localTrust.sampleCount,
        }
      : null,
    answer: isTamil
      ? "உங்கள் கேள்விக்கான பதிலை கீழே உள்ள வானிலை தகவல்களில் பார்க்கலாம்."
      : "Here is the simple answer based on the latest weather information.",
    confidence: "medium",
    isFallback: true,
  };
}

module.exports = { generateAdvisoryWithGrounding };
