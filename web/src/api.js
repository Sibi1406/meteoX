// api.js - Firebase callable API client for MeteoX
import { httpsCallable } from "firebase/functions";
import { auth, firebaseConfigMissing, functions, signInAnonymously } from "./firebase";
import weatherThresholds from "../../functions/lib/weatherThresholds.json";
import { buildDemoTrackRecord } from "./utils/demoTrackRecord";

/**
 * WMO Weather code interpreter for local display use.
 */
export function interpretWeatherCode(code, isTamil = false) {
  if (code === 0) {
    return { text: isTamil ? "தெளிவான வானம்" : "Clear Sky", icon: "☀️", condition: "clear" };
  }
  if (code >= 1 && code <= 3) {
    return { text: isTamil ? "பகுதி மேகமூட்டம்" : "Partly Cloudy", icon: "⛅", condition: "cloudy" };
  }
  if (code === 45 || code === 48) {
    return { text: isTamil ? "பனிமூட்டம்" : "Foggy", icon: "🌫️", condition: "fog" };
  }
  if (code >= 51 && code <= 55) {
    return { text: isTamil ? "தூறல் மழை" : "Drizzle", icon: "🌦️", condition: "drizzle" };
  }
  if (code >= 61 && code <= 67) {
    return { text: isTamil ? "மிதமான மழை" : "Rain", icon: "🌧️", condition: "rain" };
  }
  if (code >= 80 && code <= 82) {
    return { text: isTamil ? "மழைப்பொழிவு" : "Showers", icon: "🌧️", condition: "showers" };
  }
  if (code >= 95) {
    return { text: isTamil ? "இடிமின்னல் மழை" : "Thunderstorm", icon: "⛈️", condition: "storm" };
  }
  return { text: isTamil ? "மிதமான வானிலை" : "Fair", icon: "🌤️", condition: "fair" };
}

let signInPromise;

async function ensureSignedIn() {
  if (auth.currentUser) return;
  if (!signInPromise) signInPromise = signInAnonymously(auth);
  try {
    await Promise.race([
      signInPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase sign-in timed out")), 6000)),
    ]);
  } finally {
    signInPromise = undefined;
  }
  if (!auth.currentUser) {
    throw new Error("unauthenticated: Firebase sign-in did not produce a user");
  }
}

function withTimeout(promiseFactory, timeoutMs = 8000, fallbackMessage = "request timed out") {
  return Promise.race([
    promiseFactory(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(fallbackMessage)), timeoutMs);
    }),
  ]);
}

function callableError(name, error) {
  const code = error?.code || "unknown";
  const message = error?.message || "Firebase callable request failed";
  const surfaced = new Error(`${code}: ${message}`);
  surfaced.code = code;
  console.error(`Firebase callable ${name} failed:`, surfaced);
  return surfaced;
}

function normalizeLegacyFacts(weatherFacts = []) {
  return weatherFacts.map((fact) => {
    const text = String(fact || "").trim();
    const percent = text.match(/(\d+(?:\.\d+)?)\s*%/);
    const temperature = text.match(/(-?\d+(?:\.\d+)?)\s*°?C/i);
    const wind = text.match(/(\d+(?:\.\d+)?)\s*(?:km\/h|கிமீ\/மணி)/i);
    const rainfall = text.match(/(\d+(?:\.\d+)?)\s*(?:mm|மி\.?மீ)/i);

    if (percent) return { icon: "🌧", label: "Rain chance", value: `${percent[1]}%` };
    if (temperature) return { icon: "🌡", label: "Temperature", value: `${Math.round(Number(temperature[1]))}°C` };
    if (wind) return { icon: "💨", label: "Wind", value: `${Math.round(Number(wind[1]))} km/h` };
    if (rainfall) return { icon: "💧", label: "Rainfall", value: `${Math.round(Number(rainfall[1]) * 2) / 2} mm` };
    return { icon: "🌤", label: "Weather", value: text };
  }).filter((fact) => fact.value);
}

function normalizeQueryAdvisory(advisory) {
  if (!advisory || advisory.headline || advisory.action) {
    return advisory;
  }

  const legacyActions = Array.isArray(advisory.advisory) ? advisory.advisory : [advisory.advisory];
  return {
    headline: advisory.answer || legacyActions.find(Boolean) || "Weather outlook",
    facts: normalizeLegacyFacts(advisory.weatherFacts),
    action: legacyActions.filter(Boolean).join(" "),
    localTrust: advisory.localTrust || null,
    severity: "normal",
  };
}

function normalizeDashboardResult(result, request) {
  if (!result || result.advisory?.headline || !result.roleAdvisory) {
    return result;
  }

  const isTamil = request?.languageCode === "ta";
  const weather = result.weather || {};
  const forecast = weather.tomorrow || weather.today || {};
  const minimumTemperature = forecast.tempMinC;
  const maximumTemperature = forecast.tempMaxC ?? weather.temperatureC ?? 30;
  const temperatureValue = minimumTemperature != null
    ? `${Math.round(minimumTemperature)}–${Math.round(maximumTemperature)}°C`
    : `${Math.round(maximumTemperature)}°C`;
  const facts = [
    { icon: "🌧", label: isTamil ? "மழை வாய்ப்பு" : "Rain chance", value: `${forecast.rainProbability ?? weather.rainProbability ?? 0}%` },
    { icon: "🌡", label: isTamil ? "வெப்பநிலை" : "Temperature", value: temperatureValue },
    { icon: "💨", label: isTamil ? "காற்று" : "Wind", value: `${Math.round(forecast.windSpeedKmh ?? weather.windSpeedKmh ?? 12)} km/h` },
  ];
  if (forecast.rainfallMm != null) {
    facts.push({
      icon: "💧",
      label: isTamil ? "மழையளவு" : "Rainfall",
      value: `${Math.round(forecast.rainfallMm * 2) / 2} mm`,
    });
  }

  return {
    ...result,
    severity: "normal",
    advisory: {
      headline: isTamil ? "இதோ உங்கள் வானிலை முன்னறிவிப்பு." : "Here is your weather outlook.",
      facts,
      action: result.roleAdvisory,
      severity: "normal",
    },
  };
}

async function fetchPublicWeather(lat = 8.7139, lng = 77.7567, languageCode = "en") {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lng);
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover");
  url.searchParams.set("hourly", "temperature_2m,precipitation_probability,weather_code");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code,uv_index_max,sunrise,sunset");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const raw = await response.json();
  const current = raw.current || {};
  const hourly = raw.hourly || {};
  const daily = raw.daily || {};
  const isTamil = languageCode === "ta";
  const condition = interpretWeatherCode(current.weather_code ?? 0, isTamil);
  const offsetSeconds = Number(raw.utc_offset_seconds) || 0;
  const normalizeLocalTime = (value) => {
    if (!value) return null;
    const date = new Date(`${value}Z`);
    if (Number.isNaN(date.getTime())) return null;
    date.setTime(date.getTime() - offsetSeconds * 1000);
    return date.toISOString();
  };
  const dailyForecast = (daily.time || []).map((date, index) => {
    const dayCondition = interpretWeatherCode(daily.weather_code?.[index] ?? 0, isTamil);
    return {
      date,
      tempMaxC: daily.temperature_2m_max?.[index] ?? null,
      tempMinC: daily.temperature_2m_min?.[index] ?? null,
      rainfallMm: daily.precipitation_sum?.[index] ?? 0,
      rainProbability: daily.precipitation_probability_max?.[index] ?? 0,
      windSpeedKmh: daily.wind_speed_10m_max?.[index] ?? null,
      sunrise: daily.sunrise?.[index] ?? null,
      sunset: daily.sunset?.[index] ?? null,
      sunrise: normalizeLocalTime(daily.sunrise?.[index]),
      sunset: normalizeLocalTime(daily.sunset?.[index]),
      weatherCode: daily.weather_code?.[index] ?? 0,
      weatherCondition: dayCondition.text,
    };
  });

  return {
    temperatureC: current.temperature_2m,
    apparentTemperatureC: current.apparent_temperature,
    rainfallMm: current.precipitation ?? 0,
    rainProbability: dailyForecast[0]?.rainProbability ?? 0,
    humidityPercent: current.relative_humidity_2m,
    windSpeedKmh: current.wind_speed_10m,
    windDirectionDeg: current.wind_direction_10m,
    pressureHpa: current.pressure_msl,
    cloudCoverPercent: current.cloud_cover,
    uvIndex: daily.uv_index_max?.[0] ?? null,
    weatherCondition: condition.text,
    weatherCode: current.weather_code ?? 0,
    timestamp: current.time,
    today: dailyForecast[0],
    tomorrow: dailyForecast[1],
    daily: dailyForecast,
    hourly: (hourly.time || []).map((time, index) => ({
      time,
      temperatureC: hourly.temperature_2m?.[index] ?? null,
      rainProbability: hourly.precipitation_probability?.[index] ?? 0,
      weatherCode: hourly.weather_code?.[index] ?? 0,
    })),
    fromCache: false,
    sources: ["Open-Meteo"],
  };
}

export const api = {
  async handleQuery(data) {
    try {
      await ensureSignedIn();
      const result = await withTimeout(
        () => httpsCallable(functions, "handleQuery")(data),
        60000,
        "handleQuery timed out"
      );
      return {
        ...result.data,
        advisory: normalizeQueryAdvisory(result.data?.advisory),
      };
    } catch (error) {
      throw callableError("handleQuery", error);
    }
  },

  async getWeatherDashboard(data) {
    try {
      await ensureSignedIn();
      const result = await withTimeout(
        () => httpsCallable(functions, "getWeatherDashboard")(data),
        60000,
        "getWeatherDashboard timed out"
      );
      return normalizeDashboardResult(result.data, data);
    } catch (error) {
      console.warn("Firebase dashboard unavailable; using public weather fallback.", error);
      const weather = await fetchPublicWeather(data?.lat, data?.lng, data?.languageCode);
      const isTamil = data?.languageCode === "ta";
      const roleActions = {
        farmer: isTamil ? "மருந்து அல்லது உரம் இடுவதற்கு முன் வயல் நிலையைப் பாருங்கள்." : "Check field conditions before spraying or fertilizing.",
        fisherman: isTamil ? "கடலுக்குச் செல்வதற்கு முன் அதிகாரப்பூர்வ கடல் எச்சரிக்கைகளைப் பாருங்கள்." : "Check official marine notices before heading out.",
        city_admin: isTamil ? "மழை பெய்தால் வடிகால் பகுதிகளைக் கண்காணியுங்கள்." : "Watch drainage points if rain develops.",
        general: isTamil ? "வெளியில் செல்லும்போது வானிலை மாற்றங்களைக் கவனியுங்கள்." : "Keep an eye on changing conditions when outdoors.",
      };
      const forecast = weather.tomorrow || weather.today || {};
      const minimumTemperature = forecast.tempMinC;
      const maximumTemperature = forecast.tempMaxC ?? weather.temperatureC ?? 30;
      const temperatureValue = minimumTemperature != null
        ? `${Math.round(minimumTemperature)}–${Math.round(maximumTemperature)}°C`
        : `${Math.round(maximumTemperature)}°C`;
      return {
        weather,
        cluster: data?.cluster || { displayName: data?.district || "Local area" },
        rainDayMm: weatherThresholds.RAIN_DAY_MM,
        severity: "normal",
        advisory: {
          headline: isTamil ? "நேரலை வானிலைத் தரவு கிடைக்கிறது." : "Live weather data is available.",
          facts: [
            { icon: "🌧", label: isTamil ? "மழை வாய்ப்பு" : "Rain chance", value: `${forecast.rainProbability ?? weather.rainProbability ?? 0}%` },
            { icon: "🌡", label: isTamil ? "வெப்பநிலை" : "Temperature", value: temperatureValue },
            { icon: "💨", label: isTamil ? "காற்று" : "Wind", value: `${Math.round(forecast.windSpeedKmh ?? weather.windSpeedKmh ?? 12)} km/h` },
            ...(forecast.rainfallMm != null ? [{
              icon: "💧",
              label: isTamil ? "மழையளவு" : "Rainfall",
              value: `${Math.round(forecast.rainfallMm * 2) / 2} mm`,
            }] : []),
          ],
          action: roleActions[data?.role] || roleActions.general,
          severity: "normal",
        },
        trustScore: null,
        trackRecord: firebaseConfigMissing ? buildDemoTrackRecord() : null,
        drift: null,
        actionWindows: [],
        evidence: null,
        alerts: [],
      };
    }
  },

  async submitFeedback(data) {
    try {
      await ensureSignedIn();
      const result = await withTimeout(
        () => httpsCallable(functions, "submitFeedback")(data),
        10000,
        "submitFeedback timed out"
      );
      return result.data;
    } catch (error) {
      throw callableError("submitFeedback", error);
    }
  },

  async getPendingFeedbackPrompt(data = {}) {
    try {
      await ensureSignedIn();
      const result = await withTimeout(
        () => httpsCallable(functions, "getPendingFeedbackPrompt")(data),
        10000,
        "getPendingFeedbackPrompt timed out"
      );
      return result.data || null;
    } catch (error) {
      throw callableError("getPendingFeedbackPrompt", error);
    }
  },

  async createUserProfile(data) {
    try {
      await ensureSignedIn();
      const result = await withTimeout(
        () => httpsCallable(functions, "createUserProfile")(data),
        10000,
        "createUserProfile timed out"
      );
      return result.data;
    } catch (error) {
      throw callableError("createUserProfile", error);
    }
  },

  async triggerDemoAlert(data) {
    try {
      await ensureSignedIn();
      const result = await withTimeout(
        () => httpsCallable(functions, "triggerDemoAlert")(data),
        10000,
        "triggerDemoAlert timed out"
      );
      return result.data;
    } catch (error) {
      throw callableError("triggerDemoAlert", error);
    }
  },
};

// Compatibility adapter for the existing regional-station dashboard grid.
export async function fetchRealtimeWeather(lat, lng, isTamil = false) {
  const result = await api.getWeatherDashboard({
    lat,
    lng,
    role: "farmer",
    languageCode: isTamil ? "ta" : "en",
  });
  return result.weather;
}
