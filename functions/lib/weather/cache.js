// weather/cache.js — Firestore Weather Cache with TTL (Spec §9, §10, §15)
const { db } = require("../../admin");
const { encode } = require("../utils/geo");
const { CACHE_TTL_MINUTES } = require("../config");
const { error, info } = require("../utils/logger");

/**
 * Checks Firestore cache for fresh weather data.
 */
async function getCachedWeather(lat, lng) {
  const hash = encode(lat, lng, 6);
  try {
    const docRef = db.collection("weather_cache").doc(hash);
    const snap = await docRef.get();

    if (!snap.exists) return null;

    const data = snap.data();
    const now = Date.now();
    const expiresAt = data.expiresAt ? data.expiresAt.toMillis() : 0;

    if (now < expiresAt) {
      info("Cache HIT for weather", { geohash: hash });
      return {
        ...data.payload,
        geohash: hash,
        fromCache: true,
        cacheFreshness: {
          cachedAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
          expiresAt: data.expiresAt ? data.expiresAt.toDate().toISOString() : null,
          ageMinutes: Math.round((now - data.createdAt.toMillis()) / 60000),
        },
      };
    }

    info("Cache EXPIRED for weather", { geohash: hash });
    return null;
  } catch (err) {
    error("Error reading weather cache", err, { geohash: hash });
    return null;
  }
}

/**
 * Saves normalized weather to Firestore cache with TTL.
 * Also stores a forecast record for future feedback & accuracy tracking (Spec §15).
 */
async function setCachedWeather(lat, lng, normalizedWeather) {
  const hash = encode(lat, lng, 6);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_MINUTES * 60 * 1000);

  try {
    // 1. Write to weather_cache
    await db.collection("weather_cache").doc(hash).set({
      payload: normalizedWeather,
      geohash: hash,
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt,
    });

    // 2. Automatically log forecast records (Spec §15) for tomorrow
    if (normalizedWeather.tomorrow) {
      const tomorrow = normalizedWeather.tomorrow;
      const forecastId = `${hash}_${tomorrow.date}`;
      await db.collection("forecast_records").doc(forecastId).set(
        {
          forecastId,
          location: { latitude: lat, longitude: lng },
          cluster: normalizedWeather.location.cluster,
          forecastDate: tomorrow.date,
          predictedRain: (tomorrow.rainProbability || 0) >= 50,
          predictedRainfallMm: tomorrow.rainfallMm || 0,
          rainProbability: tomorrow.rainProbability || 0,
          weatherCondition: tomorrow.weatherCondition,
          generatedAt: now,
          sources: normalizedWeather.sources,
        },
        { merge: true }
      );
    }
  } catch (err) {
    error("Failed to write to weather cache or forecast_records", err, { geohash: hash });
  }
}

module.exports = {
  getCachedWeather,
  setCachedWeather,
};
