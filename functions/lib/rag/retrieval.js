// rag/retrieval.js — Structured Firestore & Weather Retrieval (Spec §16)
const { getWeather } = require("../weather/weather");
const { getLocalTrustScore } = require("./context");
const { getRoleRules } = require("../advisory/roleRules");

/**
 * Structured RAG retrieval:
 * Fetches:
 * 1. Real Weather data (cache or Open-Meteo)
 * 2. Local Trust data (from Firestore trust_scores)
 * 3. Role-specific advisory rules (from Firestore role_rules)
 */
async function retrieveStructuredData({ lat, lng, role, language = "en" }) {
  // 1. Weather
  const weather = await getWeather(lat, lng, language);

  // 2 & 3. Trust Score + Role Rules in parallel
  const [localTrust, roleRules] = await Promise.all([
    getLocalTrustScore(weather.location?.cluster, weather.geohash),
    getRoleRules(role),
  ]);

  return {
    weather,
    localTrust: localTrust?.isUsable ? localTrust : null,
    rawTrust: localTrust,
    roleRules,
  };
}

module.exports = { retrieveStructuredData };
