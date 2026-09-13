// api.js - Firebase callable API client for MeteoX
import { httpsCallable } from "firebase/functions";
import { auth, functions, signInAnonymously } from "./firebase";

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
    await signInPromise;
  } finally {
    signInPromise = undefined;
  }
  if (!auth.currentUser) {
    throw new Error("unauthenticated: Firebase sign-in did not produce a user");
  }
}

function callableError(name, error) {
  const code = error?.code || "unknown";
  const message = error?.message || "Firebase callable request failed";
  const surfaced = new Error(`${code}: ${message}`);
  surfaced.code = code;
  console.error(`Firebase callable ${name} failed:`, surfaced);
  return surfaced;
}

async function fetchPublicWeather(lat = 8.7139, lng = 77.7567, languageCode = "en") {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lng);
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover");
  url.searchParams.set("hourly", "temperature_2m,precipitation_probability,weather_code");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code,uv_index_max");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const raw = await response.json();
  const current = raw.current || {};
  const hourly = raw.hourly || {};
  const daily = raw.daily || {};
  const isTamil = languageCode === "ta";
  const condition = interpretWeatherCode(current.weather_code ?? 0, isTamil);
  const dailyForecast = (daily.time || []).map((date, index) => {
    const dayCondition = interpretWeatherCode(daily.weather_code?.[index] ?? 0, isTamil);
    return {
      date,
      tempMaxC: daily.temperature_2m_max?.[index] ?? null,
      tempMinC: daily.temperature_2m_min?.[index] ?? null,
      rainfallMm: daily.precipitation_sum?.[index] ?? 0,
      rainProbability: daily.precipitation_probability_max?.[index] ?? 0,
      windSpeedKmh: daily.wind_speed_10m_max?.[index] ?? null,
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
      const result = await httpsCallable(functions, "handleQuery")(data);
      return result.data;
    } catch (error) {
      throw callableError("handleQuery", error);
    }
  },

  async getWeatherDashboard(data) {
    try {
      await ensureSignedIn();
      const result = await httpsCallable(functions, "getWeatherDashboard")(data);
      return result.data;
    } catch (error) {
      console.warn("Firebase dashboard unavailable; using public weather fallback.", error);
      const weather = await fetchPublicWeather(data?.lat, data?.lng, data?.languageCode);
      return {
        weather,
        cluster: data?.cluster || { displayName: data?.district || "Local area" },
        roleAdvisory: "Live weather data is available. Role-specific guidance will appear when the secure advisory service is connected.",
        trustScore: null,
        alerts: [],
      };
    }
  },

  async submitFeedback(data) {
    try {
      await ensureSignedIn();
      const result = await httpsCallable(functions, "submitFeedback")(data);
      return result.data;
    } catch (error) {
      throw callableError("submitFeedback", error);
    }
  },

  async createUserProfile(data) {
    try {
      await ensureSignedIn();
      const result = await httpsCallable(functions, "createUserProfile")(data);
      return result.data;
    } catch (error) {
      throw callableError("createUserProfile", error);
    }
  },

  async triggerDemoAlert(data) {
    try {
      await ensureSignedIn();
      const result = await httpsCallable(functions, "triggerDemoAlert")(data);
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
