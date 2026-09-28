// feedback/schedulerJobs.js — Scheduled Forecast Snapshots & Verifications (Spec Section 2)
const { db } = require("../../admin");
const { listDistricts } = require("../utils/geo");
const { fetchSnapshotForecast, fetchModelVotes } = require("../weather/openMeteo");
const { computeModelAgreement, computeAgreementForDay } = require("../weather/modelAgreement");
const { verifyForecastDoc, rebuildTrackRecord } = require("./trackRecord");
const { PREDICT_RAIN_PROB } = require("../config");
const { info, warn, error } = require("../utils/logger");
const axios = require("axios");

/**
 * Returns date string in YYYY-MM-DD for Asia/Kolkata timezone with day offset.
 * e.g. -1 for yesterday, 0 for today, 1 for tomorrow, 2 for day after tomorrow.
 */
function getISTDateString(daysOffset = 0) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayIST = formatter.format(now);
  const [y, m, d] = todayIST.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + daysOffset);
  return dt.toISOString().split("T")[0];
}

/**
 * Helper to execute an async task over an array with controlled concurrency.
 */
async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function withRetry(fn, attempts = 3, baseDelayMs = 300) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts - 1) break;
      const retryAfter = Number(err.response?.headers?.["retry-after"] || 0) * 1000;
      const delay = retryAfter || baseDelayMs * (2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Fetches yesterday's observed precipitation from Open-Meteo past_days API.
 */
async function fetchYesterdayPrecipitation(lat, lng, targetDate) {
  const url = "https://api.open-meteo.com/v1/forecast";
  const params = {
    latitude: lat,
    longitude: lng,
    past_days: 2,
    forecast_days: 1,
    daily: "precipitation_sum",
    timezone: "Asia/Kolkata",
  };
  const response = await axios.get(url, { params, timeout: 8000 });
  const daily = response.data?.daily || {};
  const times = daily.time || [];
  const sums = daily.precipitation_sum || [];
  const idx = times.indexOf(targetDate);
  if (idx !== -1 && sums[idx] != null) {
    return Number(sums[idx]);
  }
  return null;
}

/**
 * Runs snapshotForecasts:
 * For each district, fetches daily forecast (3 days) + model votes.
 * Appends history to forecast_tracks for tomorrow and the day after (never today).
 * Caps history at 16.
 */
async function runSnapshotForecasts(dbInstance = db) {
  const districts = listDistricts();
  info(`Starting snapshotForecasts for ${districts.length} districts`);

  const tomorrowStr = getISTDateString(1);
  const dayAfterStr = getISTDateString(2);
  const targetDates = [tomorrowStr, dayAfterStr];

  let successCount = 0;
  let failCount = 0;

  await mapConcurrent(districts, 5, async (district) => {
    try {
      // Fetch forecast and model votes in parallel
      const [forecastRes, modelVotesRes] = await Promise.allSettled([
        withRetry(() => fetchSnapshotForecast(district.lat, district.lng)),
        withRetry(() => fetchModelVotes(district.lat, district.lng)),
      ]);

      if (forecastRes.status !== "fulfilled") {
        warn(`Forecast fetch failed for district ${district.clusterId}`, { error: forecastRes.reason?.message });
        failCount++;
        return;
      }

      const raw = forecastRes.value;
      const daily = raw.daily || {};
      const times = daily.time || [];

      let modelAgreement = null;
      let rawModelVotes = null;
      if (modelVotesRes.status === "fulfilled") {
        try {
          rawModelVotes = modelVotesRes.value;
          modelAgreement = computeModelAgreement(rawModelVotes);
        } catch (e) {
          modelAgreement = null;
        }
      }

      const nowISO = new Date().toISOString();

      for (const targetDate of targetDates) {
        const timeIdx = times.indexOf(targetDate);
        if (timeIdx === -1) continue;

        const rainSum = daily.precipitation_sum?.[timeIdx] != null ? Number(daily.precipitation_sum[timeIdx]) : null;
        const rainProb = daily.precipitation_probability_max?.[timeIdx] != null ? Number(daily.precipitation_probability_max[timeIdx]) : null;
        if (rainProb == null || rainSum == null) {
          warn(`Skipping incomplete forecast snapshot for ${district.clusterId} on ${targetDate}`);
          continue;
        }
        const predictedRain = rainProb >= PREDICT_RAIN_PROB;

        const agreementForDay = rawModelVotes?.daily
          ? computeAgreementForDay(rawModelVotes.daily, timeIdx, targetDate)
          : null;

        const historyEntry = {
          issuedAt: nowISO,
          rainProbability: rainProb,
          rainfallMm: rainSum,
          predictedRain,
          modelAgreement: agreementForDay ? {
            rainVotes: agreementForDay.rainVotes,
            of: agreementForDay.of,
            level: agreementForDay.level,
            spreadMm: agreementForDay.spreadMm,
          } : null,
        };

        const docRef = dbInstance.collection("forecast_tracks").doc(`${district.clusterId}_${targetDate}`);

        await dbInstance.runTransaction(async (transaction) => {
          const snap = await transaction.get(docRef);
          let history = [];
          let farmer = { yes: 0, no: 0 };
          let verification = { status: "pending" };

          if (snap.exists) {
            const data = snap.data();
            history = Array.isArray(data.history) ? [...data.history] : [];
            if (data.farmer) farmer = data.farmer;
            if (data.verification) verification = data.verification;
          }

          history.push(historyEntry);
          // Cap history at 16 entries
          if (history.length > 16) {
            history = history.slice(-16);
          }

          transaction.set(docRef, {
            clusterId: district.clusterId,
            districtName: district.name,
            targetDate,
            history,
            farmer,
            verification,
            updatedAt: nowISO,
          }, { merge: true });
        });
      }

      successCount++;
    } catch (err) {
      error(`Error snapshotting forecast for district ${district.clusterId}`, err);
      failCount++;
    }
  });

  info("Completed snapshotForecasts run", { successCount, failCount });
  return { successCount, failCount };
}

/**
 * Runs verifyForecasts:
 * For each district, verifies yesterday in IST.
 * Calls Open-Meteo past_days to read observed precipitation.
 * Determines final forecast, computes verification status with farmer source precedence,
 * updates forecast_tracks, and calls rebuildTrackRecord.
 */
async function runVerifyForecasts(dbInstance = db) {
  const districts = listDistricts();
  const yesterdayStr = getISTDateString(-1);
  info(`Starting verifyForecasts for yesterday (${yesterdayStr}) across ${districts.length} districts`);

  let verifiedCount = 0;
  let skippedCount = 0;

  await mapConcurrent(districts, 5, async (district) => {
    try {
      const docRef = dbInstance.collection("forecast_tracks").doc(`${district.clusterId}_${yesterdayStr}`);
      const snap = await docRef.get();

      if (!snap.exists) {
        await docRef.set({
          clusterId: district.clusterId,
          districtName: district.name,
          targetDate: yesterdayStr,
          history: [],
          final: null,
          verification: {
            status: "no_forecast",
            observedRainMm: null,
            rained: null,
            hit: null,
            source: "model-analysis",
            verifiedAt: new Date().toISOString(),
          },
          farmer: { yes: 0, no: 0 },
        }, { merge: true });
        skippedCount++;
        return;
      }

      const trackData = snap.data();
      const hasEligibleForecast = (trackData.history || []).some((entry) =>
        entry?.issuedAt && new Date(entry.issuedAt).getTime() < new Date(`${yesterdayStr}T00:00:00+05:30`).getTime()
      );

      if (!hasEligibleForecast) {
        const noForecast = verifyForecastDoc(trackData, null);
        if (noForecast) {
          await docRef.set({ final: null, verification: noForecast.verification }, { merge: true });
        }
        skippedCount++;
        return;
      }

      // Fetch observed rain from Open-Meteo
      let observedRainMm = 0;
      try {
        observedRainMm = await withRetry(() => fetchYesterdayPrecipitation(district.lat, district.lng, yesterdayStr));
      } catch (e) {
        warn(`Could not fetch observed rain for ${district.clusterId}`, { error: e.message });
        skippedCount++;
        return;
      }

      if (observedRainMm == null || !Number.isFinite(observedRainMm)) {
        warn(`Observed rain is missing for ${district.clusterId} on ${yesterdayStr}`);
        skippedCount++;
        return;
      }

      const result = verifyForecastDoc(trackData, observedRainMm);
      if (!result) {
        skippedCount++;
        return;
      }

      await docRef.set({
        final: result.final,
        verification: result.verification,
      }, { merge: true });

      if (result.verification.status === "verified") {
        await rebuildTrackRecord(district.clusterId, dbInstance);
        verifiedCount++;
      } else {
        skippedCount++;
      }
    } catch (err) {
      error(`Error verifying forecast for ${district.clusterId}`, err);
      skippedCount++;
    }
  });

  info("Completed verifyForecasts run", { verifiedCount, skippedCount });
  return { verifiedCount, skippedCount };
}

module.exports = {
  getISTDateString,
  fetchYesterdayPrecipitation,
  mapConcurrent,
  withRetry,
  runSnapshotForecasts,
  runVerifyForecasts,
};
