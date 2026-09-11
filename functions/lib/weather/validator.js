// weather/validator.js — Weather data validation (Spec §13)

/**
 * Validates normalized weather measurements.
 * Rejects malformed values and impossible physical readings.
 */
function validateWeather(data) {
  if (!data) return { valid: false, reason: "Weather data is null or undefined" };

  const {
    humidityPercent,
    rainProbability,
    rainfallMm,
    windSpeedKmh,
    temperatureC,
  } = data;

  if (humidityPercent != null && (humidityPercent < 0 || humidityPercent > 100)) {
    return { valid: false, reason: `Invalid humidity: ${humidityPercent} (must be 0–100%)` };
  }

  if (rainProbability != null && (rainProbability < 0 || rainProbability > 100)) {
    return { valid: false, reason: `Invalid rainProbability: ${rainProbability} (must be 0–100%)` };
  }

  if (rainfallMm != null && rainfallMm < 0) {
    return { valid: false, reason: `Invalid rainfall: ${rainfallMm} (must be >= 0 mm)` };
  }

  if (windSpeedKmh != null && windSpeedKmh < 0) {
    return { valid: false, reason: `Invalid windSpeed: ${windSpeedKmh} (must be >= 0 km/h)` };
  }

  if (temperatureC != null && (temperatureC < -80 || temperatureC > 65)) {
    return { valid: false, reason: `Extreme impossible temperature: ${temperatureC}°C` };
  }

  return { valid: true };
}

module.exports = { validateWeather };
