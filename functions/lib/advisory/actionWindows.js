// advisory/actionWindows.js — Role Action Windows Generator (Spec Section 4)
const { WINDOW_RULES } = require("../config");

/**
 * Computes deterministic role-specific time windows from hourly forecast data.
 * Thresholds are general starting points, not validated for Tamil Nadu crops or local fishing conditions.
 *
 * @param {Object} params
 * @param {Array} params.hourly - Standardized hourly forecast entries
 * @param {string} params.role - "farmer" | "fisherman" | "city_admin" | "general" | "researcher"
 * @param {Date|string} [params.now] - Current time reference
 * @param {number} [params.horizonHours] - Lookahead horizon in hours (default 36)
 * @returns {Array<{ id: string, type: string, startISO: string|null, endISO: string|null, severity: "info"|"caution"|"avoid", basis: Array<{ metric: string, value: number, unit: string }> }>}
 */
function computeActionWindows({ hourly = [], role = "general", now = new Date(), horizonHours = 36 }) {
  if (!Array.isArray(hourly) || hourly.length === 0) {
    return [];
  }

  const nowDate = new Date(now);
  const nowMs = nowDate.getTime();
  const horizonMs = nowMs + horizonHours * 3600 * 1000;

  // Filter hourly to items from current hour forward within horizon
  // An hour is within window if hour timestamp + 1h >= nowMs
  const eligibleHours = hourly.filter((h) => {
    if (!h || !h.time) return false;
    const hTime = new Date(h.time).getTime();
    return hTime + 3600 * 1000 >= nowMs && hTime <= horizonMs;
  });

  if (eligibleHours.length === 0) {
    return [];
  }

  const windows = [];

  // ==========================================
  // 1. FARMER: Spray Window
  // ==========================================
  if (role === "farmer") {
    const rules = WINDOW_RULES.SPRAY;

    // Determine safe hours
    const isSafeHour = (idx) => {
      const h = eligibleHours[idx];
      const prob = h.rainProbability;
      const wind = h.windKmh;
      const temp = h.temperatureC;
      if (![prob, wind, temp].every((value) => value != null && Number.isFinite(Number(value)))) return false;

      if (prob > rules.MAX_RAIN_PROB) return false;
      if (wind < rules.MIN_WIND_KMH || wind > rules.MAX_WIND_KMH) return false;
      if (temp > rules.MAX_TEMP_C) return false;

      // Check following 4 hours
      for (let j = 1; j <= rules.FOLLOWING_HOURS; j++) {
        const next = eligibleHours[idx + j];
        if (!next || next.rainProbability == null || !Number.isFinite(Number(next.rainProbability))) {
          return false;
        }
        const currentTime = new Date(h.time).getTime();
        const nextTime = new Date(next.time).getTime();
        if (nextTime - currentTime !== j * 3600 * 1000) return false;
        if (next.rainProbability >= rules.FOLLOWING_MAX_RAIN_PROB) {
          return false;
        }
      }
      return true;
    };

    // Find contiguous runs
    const runs = [];
    let currentRun = [];

    for (let i = 0; i < eligibleHours.length; i++) {
      if (isSafeHour(i)) {
        currentRun.push(eligibleHours[i]);
      } else {
        if (currentRun.length >= rules.MIN_CONTIGUOUS_HOURS) {
          runs.push(currentRun);
        }
        currentRun = [];
      }
    }
    if (currentRun.length >= rules.MIN_CONTIGUOUS_HOURS) {
      runs.push(currentRun);
    }

    if (runs.length > 0) {
      // Pick earliest, longest match
      runs.sort((a, b) => {
        const timeDiff = new Date(a[0].time).getTime() - new Date(b[0].time).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.length - a.length;
      });
      const best = runs[0];

      const maxProb = Math.max(...best.map((h) => h.rainProbability ?? 0));
      const maxWind = Math.max(...best.map((h) => h.windKmh ?? 0));
      const maxTemp = Math.max(...best.map((h) => h.temperatureC ?? 0));

      windows.push({
        id: "spray_window",
        type: "spray_window",
        startISO: best[0].time,
        endISO: best[best.length - 1].time,
        severity: "info",
        basis: [
          { metric: "rainProbability", value: maxProb, unit: "%" },
          { metric: "windSpeed", value: maxWind, unit: "km/h" },
          { metric: "temperature", value: maxTemp, unit: "°C" },
        ],
      });
    } else {
      // Explain blocking reason
      let blockingMetric = "forecastData";
      let blockingVal = null;
      let blockingUnit = "";

      for (const h of eligibleHours) {
        if (![h.rainProbability, h.windKmh, h.temperatureC].every((value) => value != null && Number.isFinite(Number(value)))) {
          blockingMetric = "forecastData";
          blockingVal = null;
          blockingUnit = "";
          break;
        }
        if (h.rainProbability > rules.MAX_RAIN_PROB) {
          blockingMetric = "rainProbability";
          blockingVal = h.rainProbability;
          blockingUnit = "%";
          break;
        }
        if ((h.windKmh ?? 0) > rules.MAX_WIND_KMH) {
          blockingMetric = "windSpeed";
          blockingVal = h.windKmh;
          blockingUnit = "km/h";
          break;
        }
        if ((h.temperatureC ?? 0) > rules.MAX_TEMP_C) {
          blockingMetric = "temperature";
          blockingVal = h.temperatureC;
          blockingUnit = "°C";
          break;
        }
      }

      windows.push({
        id: "no_spray_window",
        type: "no_spray_window",
        startISO: null,
        endISO: null,
        severity: "caution",
        basis: [{ metric: blockingMetric, value: blockingVal, unit: blockingUnit }],
      });
    }
  }

  // ==========================================
  // 2. FISHERMAN: Sea Window
  // ==========================================
  if (role === "fisherman") {
    const rules = WINDOW_RULES.SEA;

    let firstUnsafeIdx = -1;
    let missingAtStart = false;
    for (let i = 0; i < eligibleHours.length; i++) {
      const h = eligibleHours[i];
      const wind = h.windKmh;
      const gust = h.gustKmh;
      const rainProb = h.rainProbability;

      if ([wind, gust, rainProb].some((value) => value == null || !Number.isFinite(Number(value)))) {
        firstUnsafeIdx = i;
        missingAtStart = i === 0;
        break;
      }

      if (wind >= rules.MAX_WIND_KMH || gust >= rules.MAX_GUST_KMH || rainProb >= rules.MAX_RAIN_PROB) {
        firstUnsafeIdx = i;
        break;
      }
    }

    if (firstUnsafeIdx === 0 && missingAtStart) {
      return [];
    }

    if (firstUnsafeIdx === 0) {
      // Current conditions already unsafe
      const bad = eligibleHours[0];
      windows.push({
        id: "sea_window_unsafe",
        type: "sea_window",
        startISO: bad.time,
        endISO: bad.time,
        severity: "avoid",
        basis: [
          { metric: "windSpeed", value: bad.windKmh ?? 0, unit: "km/h" },
          { metric: "windGust", value: bad.gustKmh ?? 0, unit: "km/h" },
          { metric: "rainProbability", value: bad.rainProbability ?? 0, unit: "%" },
        ],
      });
    } else {
      const safeSubset = firstUnsafeIdx > 0
        ? eligibleHours.slice(0, firstUnsafeIdx)
        : eligibleHours;

      const maxWind = Math.max(...safeSubset.map((h) => h.windKmh));
      const maxGust = Math.max(...safeSubset.map((h) => h.gustKmh));
      const maxRainProb = Math.max(...safeSubset.map((h) => h.rainProbability));

      const hasCaution = safeSubset.some((h) => h.windKmh >= rules.CAUTION_WIND_KMH);

      windows.push({
        id: "sea_window",
        type: "sea_window",
        startISO: safeSubset[0].time,
        endISO: safeSubset[safeSubset.length - 1].time,
        severity: hasCaution ? "caution" : "info",
        basis: [
          { metric: "windSpeed", value: maxWind, unit: "km/h" },
          { metric: "windGust", value: maxGust, unit: "km/h" },
          { metric: "rainProbability", value: maxRainProb, unit: "%" },
        ],
      });
    }
  }

  // ==========================================
  // 3. GENERAL, RESEARCHER, CITY_ADMIN: Heat Avoid
  // ==========================================
  if (role === "general" || role === "researcher" || role === "city_admin") {
    const heatRule = WINDOW_RULES.HEAT;
    const heatHours = eligibleHours.filter((h) => h.apparentC != null && Number.isFinite(Number(h.apparentC)) && h.apparentC >= heatRule.MIN_APPARENT_C);

    if (heatHours.length > 0) {
      // Find contiguous clusters
      const clusters = [];
      let cur = [];
      for (const h of heatHours) {
        if (cur.length === 0) {
          cur.push(h);
        } else {
          const prevTime = new Date(cur[cur.length - 1].time).getTime();
          const curTime = new Date(h.time).getTime();
          if (curTime - prevTime <= 3600 * 1000 * 1.5) {
            cur.push(h);
          } else {
            clusters.push(cur);
            cur = [h];
          }
        }
      }
      if (cur.length > 0) clusters.push(cur);

      // Return primary heat avoid window
      const longest = clusters.sort((a, b) => b.length - a.length)[0];
      const maxApparent = Math.max(...longest.map((h) => h.apparentC));

      windows.push({
        id: "heat_avoid",
        type: "heat_avoid",
        startISO: longest[0].time,
        endISO: longest[longest.length - 1].time,
        severity: "avoid",
        basis: [{ metric: "apparentTemperature", value: maxApparent, unit: "°C" }],
      });
    }
  }

  // ==========================================
  // 4. CITY_ADMIN: Peak Rain
  // ==========================================
  if (role === "city_admin") {
    const rainRules = WINDOW_RULES.PEAK_RAIN;
    const heavyRainHours = eligibleHours.filter((h) => h.rainMm != null && Number.isFinite(Number(h.rainMm)) && h.rainMm >= rainRules.HEAVY_RAIN_MM);

    if (heavyRainHours.length > 0) {
      const maxMm = Math.max(...heavyRainHours.map((h) => h.rainMm));
      windows.push({
        id: "peak_rain",
        type: "peak_rain",
        startISO: heavyRainHours[0].time,
        endISO: heavyRainHours[heavyRainHours.length - 1].time,
        severity: maxMm >= rainRules.AVOID_MM ? "avoid" : "caution",
        basis: [{ metric: "rainfall", value: maxMm, unit: "mm" }],
      });
    } else {
      // Top 3 wettest hours if any rain > 0
      const wetHours = [...eligibleHours]
        .filter((h) => h.rainMm != null && Number.isFinite(Number(h.rainMm)) && h.rainMm > 0)
        .sort((a, b) => b.rainMm - a.rainMm)
        .slice(0, rainRules.TOP_HOURS_COUNT);

      if (wetHours.length > 0) {
        wetHours.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        const totalWet = wetHours.reduce((acc, h) => acc + h.rainMm, 0);
        windows.push({
          id: "peak_rain_moderate",
          type: "peak_rain",
          startISO: wetHours[0].time,
          endISO: wetHours[wetHours.length - 1].time,
          severity: "info",
          basis: [{ metric: "rainfall", value: Math.round(totalWet * 10) / 10, unit: "mm" }],
        });
      }
    }
  }

  return windows;
}

module.exports = { computeActionWindows };
