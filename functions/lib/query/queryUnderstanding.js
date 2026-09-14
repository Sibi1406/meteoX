// query/queryUnderstanding.js — Intent & entity extraction for English & Tamil (Spec §8)
const { INTENTS, INTENT_KEYWORDS, DATE_KEYWORDS } = require("./intent");
const { KNOWN_DISTRICTS } = require("../utils/geo");

// Check if string contains Tamil characters
function isTamilText(text) {
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * Resolves date/time period from query.
 */
function resolveDateTime(queryLower) {
  if (/\b(?:5|five)\s*-?\s*day\b/.test(queryLower) || queryLower.includes("outlook")) {
    return "forecast_period";
  }

  for (const [dateKey, mapping] of Object.entries(DATE_KEYWORDS)) {
    for (const phrase of mapping.ta) {
      if (queryLower.includes(phrase)) return dateKey;
    }
    for (const phrase of mapping.en) {
      if (queryLower.includes(phrase)) return dateKey;
    }
  }

  // Default to tomorrow if future tense detected or general query
  if (queryLower.includes("will") || queryLower.includes("பெய்யுமா") || queryLower.includes("போடலாமா")) {
    return "tomorrow";
  }

  return "today";
}

/**
 * Extracts intent from query text.
 */
function resolveIntent(queryLower, role = "general") {
  // First check role-specific keywords
  if (role === "farmer") {
    for (const word of [...INTENT_KEYWORDS[INTENTS.AGRICULTURAL_ADVISORY].en, ...INTENT_KEYWORDS[INTENTS.AGRICULTURAL_ADVISORY].ta]) {
      if (queryLower.includes(word)) return INTENTS.AGRICULTURAL_ADVISORY;
    }
  }

  if (role === "fisherman") {
    for (const word of [...INTENT_KEYWORDS[INTENTS.FISHING_ADVISORY].en, ...INTENT_KEYWORDS[INTENTS.FISHING_ADVISORY].ta]) {
      if (queryLower.includes(word)) return INTENTS.FISHING_ADVISORY;
    }
  }

  // Check all intents
  for (const [intent, mapping] of Object.entries(INTENT_KEYWORDS)) {
    for (const word of [...mapping.en, ...mapping.ta]) {
      if (queryLower.includes(word)) {
        return intent;
      }
    }
  }

  // If role is farmer and query mentions rain/weather, treat as agricultural advisory
  if (role === "farmer" && (queryLower.includes("fertilizer") || queryLower.includes("spray") || queryLower.includes("உரம்"))) {
    return INTENTS.AGRICULTURAL_ADVISORY;
  }

  return INTENTS.WEATHER_FORECAST;
}

/**
 * Looks for district mentions in query (e.g. "weather in Coimbatore", "மதுரையில் மழை வருமா")
 */
function resolveMentionedLocation(queryLower) {
  for (const [key, info] of Object.entries(KNOWN_DISTRICTS)) {
    if (queryLower.includes(key) || queryLower.includes(info.name.toLowerCase())) {
      return {
        name: info.name,
        lat: info.lat,
        lng: info.lng,
      };
    }
  }
  return null;
}

/**
 * Main query understanding function (Spec §8).
 */
function understandQuery(query, userProfile = {}) {
  const originalQuery = String(query || "").trim();
  const queryLower = originalQuery.toLowerCase();

  const isTamil = isTamilText(originalQuery);
  const language = isTamil ? "ta" : (userProfile.preferredLanguage || "en");

  const intent = resolveIntent(queryLower, userProfile.role);
  const dateTime = resolveDateTime(queryLower);
  const mentionedLocation = resolveMentionedLocation(queryLower);

  // Determine if this is a simple factual query where Gemini can be skipped (Spec §41)
  const isFactualOnly =
    (intent === INTENTS.TEMPERATURE || intent === INTENTS.RAINFALL || intent === INTENTS.WIND || intent === INTENTS.HUMIDITY) &&
    !queryLower.includes("why") &&
    !queryLower.includes("advice") &&
    !queryLower.includes("can i") &&
    !queryLower.includes("போடலாமா") &&
    !queryLower.includes("தெளிக்கலாமா") &&
    userProfile.role === "general";

  return {
    intent,
    dateTime,
    language,
    role: userProfile.role || "general",
    location: mentionedLocation,
    originalQuery,
    isFactualOnly,
  };
}

module.exports = {
  understandQuery,
  isTamilText,
  resolveDateTime,
  resolveIntent,
};
