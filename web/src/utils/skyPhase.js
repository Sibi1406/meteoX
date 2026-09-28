const SKY_TIMES_STORAGE_KEY = "meteox-sky-times";

function istDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getSkyPhase(sunriseValue, sunsetValue, now = new Date()) {
  const sunrise = sunriseValue ? new Date(sunriseValue).getTime() : NaN;
  const sunset = sunsetValue ? new Date(sunsetValue).getTime() : NaN;
  if (!Number.isFinite(sunrise) || !Number.isFinite(sunset) || sunset <= sunrise) return "day";

  const current = now.getTime();
  if (current < sunrise - 30 * 60 * 1000 || current >= sunset) return "night";
  if (current < sunrise + 60 * 60 * 1000) return "dawn";
  if (current >= sunset - 60 * 60 * 1000) return "dusk";
  return "day";
}

export function storeSkyTimes(days) {
  try {
    const entries = days.filter(({ sunrise, sunset }) => {
      const rise = sunrise ? new Date(sunrise).getTime() : NaN;
      const set = sunset ? new Date(sunset).getTime() : NaN;
      return Number.isFinite(rise) && Number.isFinite(set) && set > rise;
    });
    if (entries.length) {
      localStorage.setItem(SKY_TIMES_STORAGE_KEY, JSON.stringify(entries));
    } else {
      localStorage.removeItem(SKY_TIMES_STORAGE_KEY);
    }
  } catch {
    // The Home view still sets the phase directly if storage is unavailable.
  }
}

export function applyStoredSkyPhase(now = new Date()) {
  try {
    const entries = JSON.parse(localStorage.getItem(SKY_TIMES_STORAGE_KEY) || "[]");
    const today = istDateKey(now);
    const sunTimes = entries.find(({ sunrise }) => istDateKey(sunrise) === today);
    document.body.dataset.sky = sunTimes
      ? getSkyPhase(sunTimes.sunrise, sunTimes.sunset, now)
      : "day";
  } catch {
    document.body.dataset.sky = "day";
  }
}