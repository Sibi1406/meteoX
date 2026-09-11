// weather/weather.js — Weather Service Orchestrator (Spec §9, §11, §12, §13)
const { fetchOpenMeteo } = require("./openMeteo");
const { normalizeOpenMeteo } = require("./aggregator");
const { validateWeather } = require("./validator");
const { getCachedWeather, setCachedWeather } = require("./cache");
const { info, error } = require("../utils/logger");

/**
 * Main weather retrieval entry point.
 * Follows exact flow:
 * 1. Check Firestore cache
 * 2. If hit and fresh -> return
 * 3. If miss/expired -> call Open-Meteo
 * 4. Normalize
 * 5. Validate ranges
 * 6. Store in Firestore cache
 * 7. Return normalized data
 */
async function getWeather(lat, lng, lang = "en") {
  // Step 1: Check cache
  const cached = await getCachedWeather(lat, lng);
  if (cached) {
    return cached;
  }

  // Step 2: Fetch from Open-Meteo
  info("Fetching fresh weather from Open-Meteo", { lat, lng });
  let raw;
  try {
    raw = await fetchOpenMeteo(lat, lng);
  } catch (err) {
    error("Open-Meteo fetch failed", err, { lat, lng });
    throw new Error("I couldn't retrieve reliable weather data right now.");
  }

  // Step 3: Normalize
  const normalized = normalizeOpenMeteo(raw, lat, lng, lang);

  // Step 4: Validate
  const validation = validateWeather(normalized);
  if (!validation.valid) {
    error("Weather validation failed", null, { reason: validation.reason });
    throw new Error("I couldn't retrieve reliable weather data right now.");
  }

  // Step 5: Cache in Firestore
  await setCachedWeather(lat, lng, normalized);

  return {
    ...normalized,
    fromCache: false,
    cacheFreshness: {
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      ageMinutes: 0,
    },
  };
}

module.exports = { getWeather };
