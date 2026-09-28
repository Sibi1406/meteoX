// ai/advisory.js — Grounded Advisory Generator with Auto-Regeneration (Spec §20, §21, §22)
const { generateAdvisoryText, isQuotaError, GEMINI_SYSTEM_PROMPT } = require("./gemini");
const { verifyGrounding } = require("./grounding");
const { MAX_REGENERATIONS } = require("../config");
const { evaluateRoleAdvisory } = require("../advisory/roleRules");
const { info, warn, error } = require("../utils/logger");

const RESPONSE_FRAMES = [
  "Lead with the practical effect on the user's plans.",
  "Lead with the relevant weather condition or measurement.",
  "Lead with the role-specific action or caution.",
];

/**
 * Builds user prompt containing the full RAG context and instructions to respond in English or Tamil.
 */
function buildPrompt(userQuery, context, feedbackNotes = null, variationIndex = Math.floor(Math.random() * RESPONSE_FRAMES.length)) {
  const isTamil = context.language === "ta";
  const responseFrame = RESPONSE_FRAMES[Math.abs(variationIndex) % RESPONSE_FRAMES.length];

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

RESPONSE FRAME FOR THIS REPLY: ${responseFrame} Do not copy this instruction into the response.

Match the user's actual question scope — do not add advice for conditions they didn't ask about unless directly relevant.
Phrase the windows in CONTEXT; do not invent windows or times.
Write action in plain spoken language, as if a knowledgeable local person is talking to them, not a formal report — avoid words like "initiate", "ensure", "verify", "broadcasting".
headline and action must NOT repeat each other or restate the facts array — each field has a distinct job.
Include 3-4 compact facts as label/value pairs, not full sentences. Include temperature as one fact, combining minimum and maximum into one range instead of separate temperature facts. Round temperatures to whole degrees, rainfall to the nearest 0.5 mm, and wind speed to whole km/h; avoid unnecessary decimal precision.

The sample wording and values in the JSON below are illustrative options, not a template. Replace every sample value with the matching fact from CONTEXT, and phrase each reply naturally for the user's question.
Vary your sentence openings, structure, and word choice across different questions and different times of day — do not default to the same phrasing pattern every time. Sound like a knowledgeable local person giving advice, not a form being filled in.
Respond ONLY with valid JSON matching EXACTLY this structure (no markdown fences, no extra text):
{
  "headline": "For example, rain could affect outdoor plans. Write a fresh, context-specific takeaway rather than copying this sentence.",
  "facts": [
    { "icon": "🌧", "label": "${isTamil ? 'மழை வாய்ப்பு' : 'Rain chance'}", "value": "[context-supported probability]" },
    { "icon": "🌡", "label": "${isTamil ? 'வெப்பநிலை' : 'Temperature'}", "value": "[context-supported temperature]" },
    { "icon": "💨", "label": "${isTamil ? 'காற்று' : 'Wind'}", "value": "[context-supported wind speed]" }
  ],
  "action": "For example, a farmer could wait until rain passes before spraying. Adapt the action to the role, question, and approved rules.",
  "localTrust": ${
    context.localTrust
      ? `{ "trustScore": "${Math.round((context.localTrust.trustScore || 0.8) * 100)}%", "sampleCount": ${context.localTrust.sampleCount || 0}, "note": "${isTamil ? 'உள்ளூர் நம்பகத்தன்மை' : 'Local reliability'}" }`
      : `null`
  }
}
`.trim();
}

/**
 * Generates an advisory via Gemini with grounding verification and regeneration loop.
 */
function buildFallbackHeadline({ query, context, targetForecast, isTamil, variationIndex = Math.floor(Math.random() * 3) }) {
  const lowerQuery = String(query || "").toLowerCase();
  const rainChance = targetForecast?.rainProbability ?? context.weather?.rainProbability ?? 0;
  const temp = targetForecast?.temperatureMaxC ?? context.weather?.temperatureC ?? 30;
  const wind = targetForecast?.windSpeedKmh ?? context.weather?.windSpeedKmh ?? 12;
  const choose = (english, tamil) => {
    const options = isTamil ? tamil : english;
    return options[Math.abs(variationIndex) % options.length];
  };

  if (lowerQuery.includes("rain") || lowerQuery.includes("மழை") || lowerQuery.includes("umbrella")) {
    return rainChance >= 60
      ? choose(
          ["Rain could affect outdoor plans.", "Keep possible rain in mind before planning outdoor work.", "Outdoor plans may need to account for rain."],
          ["மழை வெளிப்புறத் திட்டங்களைப் பாதிக்கலாம்.", "வெளிப்புறப் பணிகளைத் திட்டமிடும்போது மழையைக் கருத்தில் கொள்ளுங்கள்.", "மழைக்கு ஏற்ப வெளிப்புறத் திட்டங்களை மாற்ற வேண்டியிருக்கலாம்."]
        )
      : choose(
          ["Rain is unlikely to disrupt your plans.", "The forecast suggests little rain-related disruption.", "Outdoor plans look less likely to be interrupted by rain."],
          ["மழையால் உங்கள் திட்டங்கள் பாதிக்கப்பட வாய்ப்பு குறைவு.", "மழையால் பெரிய இடையூறு ஏற்படாது என முன்னறிவிப்பு காட்டுகிறது.", "மழை வெளிப்புறத் திட்டங்களைப் பாதிக்க வாய்ப்பு குறைவாக உள்ளது."]
        );
  }

  if (lowerQuery.includes("fertilizer") || lowerQuery.includes("உரம்") || lowerQuery.includes("spray") || lowerQuery.includes("pesticide")) {
    return rainChance >= 60
      ? choose(
          ["Rain could affect fieldwork.", "Plan field spraying around the expected rain.", "Upcoming rain may interrupt fieldwork."],
          ["மழை வயல் பணிகளைப் பாதிக்கலாம்.", "எதிர்பார்க்கப்படும் மழைக்கு ஏற்ப தெளிப்புப் பணிகளைத் திட்டமிடுங்கள்.", "வரவிருக்கும் மழை வயல் பணிகளுக்கு இடையூறாக இருக்கலாம்."]
        )
      : choose(
          ["Conditions look more suitable for fieldwork.", "Rain is less likely to interrupt fieldwork.", "Fieldwork is less likely to be disrupted by rain."],
          ["வயல் பணிகளுக்கு வானிலை சாதகமாகத் தெரிகிறது.", "மழை வயல் பணிகளுக்கு இடையூறாக இருக்க வாய்ப்பு குறைவு.", "மழையால் வயல் பணிகள் பாதிக்கப்பட வாய்ப்பு குறைவாக உள்ளது."]
        );
  }

  if (lowerQuery.includes("temperature") || lowerQuery.includes("hot") || lowerQuery.includes("cold") || lowerQuery.includes("வெப்ப") || lowerQuery.includes("குளிர்")) {
    return temp >= 37
      ? choose(
          ["Heat may affect your plans today.", "Take today's heat into account when planning work.", "Today's heat deserves extra attention."],
          ["இன்றைய வெப்பம் உங்கள் திட்டங்களைப் பாதிக்கலாம்.", "பணிகளைத் திட்டமிடும்போது இன்றைய வெப்பத்தைக் கருத்தில் கொள்ளுங்கள்.", "இன்றைய வெப்பநிலையில் கூடுதல் கவனம் தேவை."]
        )
      : choose(
          ["Temperatures look manageable today.", "The temperature is unlikely to disrupt plans.", "No major temperature concern appears in the forecast."],
          ["இன்றைய வெப்பநிலை சமாளிக்கக்கூடியதாகத் தெரிகிறது.", "வெப்பநிலையால் திட்டங்கள் பாதிக்கப்பட வாய்ப்பு குறைவு.", "முன்னறிவிப்பில் வெப்பநிலை குறித்த பெரிய கவலை இல்லை."]
        );
  }

  if (lowerQuery.includes("wind") || lowerQuery.includes("காற்று")) {
    return wind >= 25
      ? choose(
          ["Wind may affect outdoor work.", "Strong winds could disrupt outdoor plans.", "Take the wind into account before working outside."],
          ["காற்று வெளிப்புறப் பணிகளைப் பாதிக்கலாம்.", "பலத்த காற்று வெளிப்புறத் திட்டங்களுக்கு இடையூறாக இருக்கலாம்.", "வெளியில் பணிபுரியும் முன் காற்றின் வேகத்தைக் கருத்தில் கொள்ளுங்கள்."]
        )
      : choose(
          ["Wind is unlikely to disrupt outdoor plans.", "Current winds look manageable for outdoor activities.", "The wind should pose little disruption to outdoor work."],
          ["காற்றால் வெளிப்புறத் திட்டங்கள் பாதிக்கப்பட வாய்ப்பு குறைவு.", "வெளிப்புறப் பணிகளுக்கு தற்போதைய காற்று சமாளிக்கக்கூடியதாகத் தெரிகிறது.", "காற்று வெளிப்புறப் பணிகளுக்கு பெரிய இடையூறாக இருக்காது."]
        );
  }

  return choose(
    ["Keep the weather in mind as you plan today.", "Let the local conditions guide today's plans.", "Check the conditions before settling on outdoor plans."],
    ["இன்றைய திட்டங்களை வகுக்கும்போது வானிலையைக் கவனியுங்கள்.", "இன்றைய திட்டங்களுக்கு உள்ளூர் வானிலையை வழிகாட்டியாகக் கொள்ளுங்கள்.", "வெளிப்புறத் திட்டங்களை முடிவு செய்வதற்கு முன் வானிலையைப் பாருங்கள்."]
  );
}

async function generateAdvisoryWithGrounding({ query, context }) {
  let attempts = 0;
  let lastFailureReason = null;
  let quotaExhausted = false;

  while (attempts <= MAX_REGENERATIONS) {
    attempts++;
    info(`Generating advisory (attempt ${attempts}/${MAX_REGENERATIONS + 1})`);

    try {
      const prompt = buildPrompt(query, context, lastFailureReason);
      const rawText = (await generateAdvisoryText(prompt)).trim();

      const cleanedJson = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleanedJson);

      const check = verifyGrounding(parsed, context);
      if (check.passed) {
        return {
          ...parsed,
          confidence: "high",
          attempts,
        };
      }

      lastFailureReason = check.failures.join("; ");
      warn(`Grounding failed on attempt ${attempts}`, { failures: check.failures });
    } catch (err) {
      if (isQuotaError(err)) {
        quotaExhausted = true;
        warn("Gemini quota is exhausted. Skipping regeneration and using the grounded fallback.");
        break;
      }
      error(`Error generating or parsing Gemini advisory on attempt ${attempts}`, err);
      lastFailureReason = err.message;
    }
  }

  if (!quotaExhausted) {
    warn("Grounding verification exceeded maximum retries. Using safe deterministic fallback.");
  }
  const isTamil = context.language === "ta";
  const deterministicAdvisory = evaluateRoleAdvisory(context.role, context.weather, context.language);
  const targetForecast = context.weather?.targetForecast || context.weather?.today || {};

  return {
    headline: buildFallbackHeadline({ query, context, targetForecast, isTamil }),
    facts: [
      { icon: "🌧", label: isTamil ? "மழை வாய்ப்பு" : "Rain chance", value: `${targetForecast.rainProbability ?? context.weather?.rainProbability ?? 0}%` },
      { icon: "🌡", label: isTamil ? "வெப்பநிலை" : "Temperature", value: `${Math.round(targetForecast.temperatureMaxC ?? context.weather?.temperatureC ?? 30)}°C` },
      { icon: "💨", label: isTamil ? "காற்று" : "Wind", value: `${Math.round(targetForecast.windSpeedKmh ?? context.weather?.windSpeedKmh ?? 12)} km/h` },
    ],
    action: deterministicAdvisory,
    localTrust: context.localTrust
      ? {
          trustScore: `${Math.round((context.localTrust.trustScore || 0.8) * 100)}%`,
          sampleCount: context.localTrust.sampleCount,
        }
      : null,
    confidence: "medium",
    isFallback: true,
  };
}

module.exports = { generateAdvisoryWithGrounding, buildFallbackHeadline, buildPrompt };
