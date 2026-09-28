const { fetchOpenMeteo, fetchModelVotes } = require("./openMeteo");
const { normalizeOpenMeteo } = require("./aggregator");
const { validateWeather } = require("./validator");
const { getCachedWeather, setCachedWeather } = require("./cache");
const { computeModelAgreement } = require("./modelAgreement");
const { info, warn, error } = require("../utils/logger");

/**
 * Main weather retrieval entry point.
 * Follows exact flow:
 * 1. Check Firestore cache (requires schemaVersion >= 2 and hourly)
 * 2. If hit and fresh -> return
 * 3. If miss/expired -> call Open-Meteo + model votes in parallel (Promise.allSettled)
 * 4. Compute model agreement (degrade gracefully to null on failure)
 * 5. Normalize with schemaVersion: 2
 * 6. Validate ranges
 * 7. Store in Firestore cache
 * 8. Return normalized data
 */
async function getWeather(lat, lng, lang = "en") {
  // Step 1: Check cache
  const cached = await getCachedWeather(lat, lng);
  // Older cache records predate the hourly timeline or schemaVersion 2 and must be refreshed.
  if (
    cached &&
    cached.schemaVersion >= 2 &&
    Array.isArray(cached.hourly) &&
    cached.hourly.length > 0
  ) {
    return cached;
  }

  // Step 2: Fetch from Open-Meteo and model votes in parallel
  info("Fetching fresh weather from Open-Meteo and model votes", { lat, lng });
  const [openMeteoResult, modelVotesResult] = await Promise.allSettled([
    fetchOpenMeteo(lat, lng),
    fetchModelVotes(lat, lng),
  ]);

  if (openMeteoResult.status !== "fulfilled") {
    error("Open-Meteo fetch failed", openMeteoResult.reason, { lat, lng });
    throw new Error("I couldn't retrieve reliable weather data right now.");
  }

  const raw = openMeteoResult.value;

  let modelAgreement = null;
  if (modelVotesResult.status === "fulfilled") {
    try {
      modelAgreement = computeModelAgreement(modelVotesResult.value);
    } catch (err) {
      warn("Failed to compute model agreement", { error: err.message });
      modelAgreement = null;
    }
  } else {
    warn("Multi-model vote fetch failed, proceeding with single model", {
      reason: modelVotesResult.reason?.message,
    });
  }

  // Step 3: Normalize
  const normalized = normalizeOpenMeteo(raw, lat, lng, lang, modelAgreement);

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
