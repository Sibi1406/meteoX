// weather/aggregator.js — Weather Normalization & Multi-Provider Aggregator (Spec §12, §37)
const { getWeatherCondition } = require("./openMeteo");
const { resolveCluster } = require("../utils/geo");

/**
 * Normalizes raw Open-Meteo data into internal standardized weather schema (Spec §12).
 * Uses null for unavailable fields. Never invents values.
 */
function normalizeOpenMeteo(raw, lat, lng, lang = "en") {
  const current = raw.current || {};
  const daily = raw.daily || {};
  const cluster = resolveCluster(lat, lng);

  const times = daily.time || [];
  const rainSums = daily.precipitation_sum || [];
  const rainProbs = daily.precipitation_probability_max || [];
  const tempMaxs = daily.temperature_2m_max || [];
  const tempMins = daily.temperature_2m_min || [];
  const windMaxs = daily.wind_speed_10m_max || [];
  const codes = daily.weather_code || [];

  // Build daily forecast list
  const dailyForecasts = times.map((dateStr, idx) => ({
    date: dateStr,
    rainProbability: rainProbs[idx] != null ? Number(rainProbs[idx]) : null,
    rainfallMm: rainSums[idx] != null ? Number(rainSums[idx]) : 0,
    tempMaxC: tempMaxs[idx] != null ? Number(tempMaxs[idx]) : null,
    tempMinC: tempMins[idx] != null ? Number(tempMins[idx]) : null,
    windSpeedKmh: windMaxs[idx] != null ? Number(windMaxs[idx]) : null,
    weatherCondition: getWeatherCondition(codes[idx], lang),
    weatherCode: codes[idx],
  }));

  const todayForecast = dailyForecasts[0] || {};
  const tomorrowForecast = dailyForecasts[1] || {};

  const currentConditionCode = current.weather_code != null ? current.weather_code : (codes[0] || 0);

  return {
    location: {
      latitude: lat,
      longitude: lng,
      cluster,
    },
    timestamp: current.time || new Date().toISOString(),
    temperatureC: current.temperature_2m != null ? Number(current.temperature_2m) : (todayForecast.tempMaxC || null),
    rainfallMm: current.precipitation != null ? Number(current.precipitation) : (todayForecast.rainfallMm || 0),
    rainProbability: todayForecast.rainProbability != null ? Number(todayForecast.rainProbability) : (current.precipitation > 0 ? 90 : 10),
    humidityPercent: current.relative_humidity_2m != null ? Number(current.relative_humidity_2m) : null,
    windSpeedKmh: current.wind_speed_10m != null ? Number(current.wind_speed_10m) : (todayForecast.windSpeedKmh || null),
    windDirection: current.wind_direction_10m != null ? Number(current.wind_direction_10m) : null,
    weatherCondition: getWeatherCondition(currentConditionCode, lang),
    weatherCode: currentConditionCode,
    forecastPeriod: {
      start: times[0] || new Date().toISOString().split("T")[0],
      end: times[times.length - 1] || new Date().toISOString().split("T")[0],
    },
    sources: ["open-meteo"],
    today: todayForecast,
    tomorrow: tomorrowForecast,
    daily: dailyForecasts,
  };
}

// ---------------------------------------------------------------------------
// Future Weather Provider Adapters (Spec §37)
// Clean interfaces for IMD and GFS integrations.
// ---------------------------------------------------------------------------
class WeatherProviderAdapter {
  async fetch(lat, lng) {
    throw new Error("Not implemented");
  }
}

class ImdAdapter extends WeatherProviderAdapter {
  constructor(apiKey = null) {
    super();
    this.apiKey = apiKey || process.env.IMD_API_KEY;
  }
  async fetch(lat, lng) {
    if (!this.apiKey) {
      return { status: "NOT_CONFIGURED", message: "IMD credentials not supplied. Using Open-Meteo." };
    }
    // Phase 2 real IMD REST call here
    return { status: "NOT_IMPLEMENTED" };
  }
}

class GfsAdapter extends WeatherProviderAdapter {
  constructor(baseUrl = null) {
    super();
    this.baseUrl = baseUrl || process.env.GFS_BASE_URL;
  }
  async fetch(lat, lng) {
    if (!this.baseUrl) {
      return { status: "NOT_CONFIGURED", message: "GFS endpoint not configured. Using Open-Meteo." };
    }
    // Phase 2 GFS NOAA feed fetcher here
    return { status: "NOT_IMPLEMENTED" };
  }
}

module.exports = {
  normalizeOpenMeteo,
  ImdAdapter,
  GfsAdapter,
};
