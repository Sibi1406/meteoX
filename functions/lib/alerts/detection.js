// alerts/detection.js — Extreme Weather Alert Detection (Spec §33)
const { ALERT_THRESHOLDS } = require("../config");

/**
 * Returns only warnings supplied by an official warning provider such as IMD.
 * Forecast thresholds alone must not be presented as public alerts.
 */
function detectSevereWeather(weather) {
  return (weather?.officialWarnings || []).filter((warning) => warning?.isOfficialWarning === true);
}

function maxDefined(values) {
  const defined = values.filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
  return defined.length ? Math.max(...defined) : null;
}

function minDefined(values) {
  const defined = values.filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
  return defined.length ? Math.min(...defined) : null;
}

/** Classifies forecast conditions for presentation without creating public alerts. */
function calculateSeverity(weather = {}) {
  const forecast = weather.tomorrow || weather.today || {};
  const rainfallMm = maxDefined([weather.rainfallMm, weather.today?.rainfallMm, forecast.rainfallMm]);
  const rainProbability = maxDefined([weather.rainProbability, weather.today?.rainProbability, forecast.rainProbability]);
  const windSpeedKmh = maxDefined([weather.windSpeedKmh, weather.today?.windSpeedKmh, forecast.windSpeedKmh]);
  const temperatureMaxC = maxDefined([weather.temperatureC, weather.today?.tempMaxC, forecast.tempMaxC]);
  const temperatureMinC = minDefined([weather.today?.tempMinC, forecast.tempMinC]);

  if (
    (rainfallMm >= ALERT_THRESHOLDS.HEAVY_RAIN_MM && rainProbability >= ALERT_THRESHOLDS.HIGH_RAIN_PROB) ||
    windSpeedKmh >= ALERT_THRESHOLDS.HIGH_WIND_KMH ||
    temperatureMaxC >= ALERT_THRESHOLDS.EXTREME_HEAT_C ||
    (temperatureMinC != null && temperatureMinC <= ALERT_THRESHOLDS.EXTREME_COLD_C)
  ) {
    return "urgent";
  }

  if (
    rainfallMm >= 5 ||
    rainProbability >= 60 ||
    windSpeedKmh >= 25 ||
    temperatureMaxC >= 37
  ) {
    return "caution";
  }

  return "normal";
}

module.exports = { detectSevereWeather, calculateSeverity };
