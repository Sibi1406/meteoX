// weather/openMeteo.js — Open-Meteo API Client (Spec §11)
const axios = require("axios");

// WMO Weather Interpretation Codes (WW)
const WMO_CODE_MAP = {
  0: { en: "Clear sky", ta: "தெளிவான வானம்" },
  1: { en: "Mainly clear", ta: "பெரும்பாலும் தெளிவான வானம்" },
  2: { en: "Partly cloudy", ta: "பகுதி மேகமூட்டம்" },
  3: { en: "Overcast", ta: "முழு மேகமூட்டம்" },
  45: { en: "Foggy", ta: "பனிமூட்டம்" },
  48: { en: "Depositing rime fog", ta: "கடும் பனிமூட்டம்" },
  51: { en: "Light drizzle", ta: "லேசான தூறல்" },
  53: { en: "Moderate drizzle", ta: "மிதமான தூறல்" },
  55: { en: "Dense drizzle", ta: "அடர்ந்த தூறல்" },
  61: { en: "Slight rain", ta: "லேசான மழை" },
  63: { en: "Moderate rain", ta: "மிதமான மழை" },
  65: { en: "Heavy rain", ta: "கனமழை" },
  71: { en: "Slight snow fall", ta: "லேசான பனிப்பொழிவு" },
  80: { en: "Slight rain showers", ta: "லேசான மழைச்சாரல்" },
  81: { en: "Moderate rain showers", ta: "மிதமான மழைச்சாரல்" },
  82: { en: "Violent rain showers", ta: "கடும் மழைச்சாரல்" },
  95: { en: "Thunderstorm", ta: "இடியுடன் கூடிய மழை" },
  96: { en: "Thunderstorm with slight hail", ta: "ஆலங்கட்டி இடிமழை" },
  99: { en: "Thunderstorm with heavy hail", ta: "கடும் ஆலங்கட்டி இடிமழை" },
};

function getWeatherCondition(code, lang = "en") {
  const match = WMO_CODE_MAP[code] || { en: "Moderate weather", ta: "மிதமான வானிலை" };
  return lang === "ta" ? match.ta : match.en;
}

/**
 * Fetches real weather data from Open-Meteo.
 * Free, non-commercial, no API key required.
 */
async function fetchOpenMeteo(lat, lng) {
  const url = "https://api.open-meteo.com/v1/forecast";
  const params = {
    latitude: lat,
    longitude: lng,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "rain",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "weather_code",
    ].join(","),
    timezone: "auto",
  };

  const response = await axios.get(url, { params, timeout: 8000 });
  return response.data;
}

module.exports = {
  fetchOpenMeteo,
  getWeatherCondition,
  WMO_CODE_MAP,
};
