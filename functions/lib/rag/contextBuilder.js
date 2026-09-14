// rag/contextBuilder.js — RAG Context Builder (Spec §16, §19)

/**
 * Builds the strictly-grounded context object passed to Gemini.
 * Formats retrieved weather, trust, and role rules clearly so the model
 * has explicit facts to cite.
 */
function buildRagContext({
  userQuery,
  role,
  language,
  location,
  weather,
  localTrust,
  roleRules,
  dateTime = "tomorrow",
}) {
  const targetForecast = dateTime === "today" ? weather.today : (weather.tomorrow || weather.today);
  const forecastDays = dateTime === "forecast_period" || dateTime === "next_week"
    ? (weather.daily || []).slice(0, dateTime === "next_week" ? 7 : 5)
    : [];

  return {
    userQuery,
    role,
    language,
    location: {
      latitude: location?.latitude || weather.location?.latitude,
      longitude: location?.longitude || weather.location?.longitude,
      cluster: weather.location?.cluster || { clusterType: "district", clusterId: "coimbatore" },
    },
    weather: {
      temperatureC: weather.temperatureC,
      rainfallMm: weather.rainfallMm,
      rainProbability: weather.rainProbability,
      humidityPercent: weather.humidityPercent,
      windSpeedKmh: weather.windSpeedKmh,
      windDirection: weather.windDirection,
      weatherCondition: weather.weatherCondition,
      forecastPeriod: weather.forecastPeriod,
      targetDate: targetForecast?.date || "tomorrow",
      targetForecast: {
        date: targetForecast?.date,
        temperatureMaxC: targetForecast?.tempMaxC,
        temperatureMinC: targetForecast?.tempMinC,
        rainfallMm: targetForecast?.rainfallMm,
        rainProbability: targetForecast?.rainProbability,
        windSpeedKmh: targetForecast?.windSpeedKmh,
        weatherCondition: targetForecast?.weatherCondition,
      },
      forecastDays,
      sources: weather.sources || ["open-meteo"],
      fromCache: weather.fromCache || false,
    },
    localTrust: localTrust
      ? {
          clusterType: localTrust.clusterType,
          clusterId: localTrust.clusterId,
          accuracyScore: localTrust.accuracyScore,
          regionalBias: localTrust.regionalBias,
          trustScore: localTrust.trustScore,
          sampleCount: localTrust.sampleCount,
        }
      : null,
    roleRules: roleRules
      ? {
          role: roleRules.role,
          title: roleRules.title,
          rules: (roleRules.rules || []).map((r) => ({
            condition: r.condition,
            advisory: r.advisory,
            tamilAdvisory: r.tamilAdvisory,
          })),
        }
      : null,
  };
}

module.exports = { buildRagContext };
