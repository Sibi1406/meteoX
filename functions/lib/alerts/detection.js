// alerts/detection.js — Extreme Weather Alert Detection (Spec §33)
const { ALERT_THRESHOLDS } = require("../config");

/**
 * Detects whether upcoming weather crosses severe weather thresholds.
 * Strictly labels these as automated threshold alerts, separate from official IMD warnings.
 */
function detectSevereWeather(weather) {
  const alerts = [];
  const target = weather.tomorrow || weather.today || weather;

  const rainfall = target.rainfallMm || weather.rainfallMm || 0;
  const rainProb = target.rainProbability || weather.rainProbability || 0;
  const wind = target.windSpeedKmh || weather.windSpeedKmh || 0;
  const temp = target.tempMaxC || weather.temperatureC || 30;

  // 1. Heavy Rainfall Detection
  if (rainfall >= ALERT_THRESHOLDS.HEAVY_RAIN_MM || rainProb >= ALERT_THRESHOLDS.HIGH_RAIN_PROB) {
    alerts.push({
      type: "heavy_rain",
      severity: rainfall >= 35 ? "high" : "medium",
      title: "🌧 Heavy Rain Alert / கனமழை எச்சரிக்கை",
      description: `Heavy rainfall expected (${rainfall} mm, ${rainProb}% probability). Consider postponing outdoor field activities.`,
      tamilDescription: `கனமழை எதிர்பார்க்கப்படுகிறது (${rainfall} மி.மீ, ${rainProb}% வாய்ப்பு). வெளிப்புற களப்பணிகளை ஒத்திவைக்கவும்.`,
      metric: `${rainfall} mm (${rainProb}%)`,
      isOfficialWarning: false,
    });
  }

  // 2. High Wind Detection
  if (wind >= ALERT_THRESHOLDS.HIGH_WIND_KMH) {
    alerts.push({
      type: "high_wind",
      severity: wind >= 50 ? "high" : "medium",
      title: "💨 High Wind Alert / பலத்த காற்று எச்சரிக்கை",
      description: `Strong surface winds of ${wind} km/h detected. Avoid deep sea ventures, loose structures, and chemical spraying.`,
      tamilDescription: `மணிக்கு ${wind} கி.மீ வேகத்தில் பலத்த காற்று வீசக்கூடும். கடலுக்குச் செல்வதைத் தவிர்க்கவும்.`,
      metric: `${wind} km/h`,
      isOfficialWarning: false,
    });
  }

  // 3. Extreme Heat Detection
  if (temp >= ALERT_THRESHOLDS.EXTREME_HEAT_C) {
    alerts.push({
      type: "extreme_heat",
      severity: temp >= 41 ? "high" : "medium",
      title: "☀️ Extreme Heat Alert / தீவிர வெப்ப எச்சரிக்கை",
      description: `Elevated temperatures around ${temp}°C expected. Irrigate early, maintain hydration, and avoid midday exposure.`,
      tamilDescription: `சுமார் ${temp}°C வரை வெப்பம் அதிகரிக்கும். அதிகாலையிலேயே பயிர்களுக்கு நீர் பாய்ச்சவும்.`,
      metric: `${temp}°C`,
      isOfficialWarning: false,
    });
  }

  return alerts;
}

module.exports = { detectSevereWeather };
